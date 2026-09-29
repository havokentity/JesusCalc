// Builds the compact dictionary bundled with the app and site, in public/data/dict/.
//
//   node build/build-dict.js <sources-dir>
//
// <sources-dir> holds words_alpha.txt (dwyl/english-words), wn_lemmas.txt (Open English
// WordNet lemmas, one per line) and gutenberg/pg*.txt (Project Gutenberg plain-text books).
//
// Output (each phrase stored once):
//   phrases.txt.gz  every phrase, alphabetical, newline-separated
//   totals.bin.gz   one Uint16 column per stored cipher, in phrase order, split into a
//                   low-byte plane and a high-byte plane (the high bytes compress very well)
//   meta.json       counts, stored ciphers and sources
// The dictionary worker (src/dict.worker.js) builds its lookup index from these on the device.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { totals } from '../src/ciphers.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2];
if (!src) { console.error('usage: node build/build-dict.js <sources-dir>'); process.exit(1); }

// Ciphers stored per phrase. English Gematria is Simple × 6 and Isopsephy needs Greek script,
// so the worker derives those instead of storing them.
const STORED = [0, 1, 2, 4, 5]; // Hebrew, Simple, Simple English, Latin, Greek

const phrases = new Map(); // lowercase key -> display form
const counts = {};
function add(raw, source) {
  const words = raw.replace(/[^A-Za-z ]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return;
  const key = words.join(' ').toLowerCase();
  if (key.length < 2 || phrases.has(key)) return;
  phrases.set(key, words.map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' '));
  counts[source] = (counts[source] || 0) + 1;
}

// 1. Dictionary words and WordNet lemmas (including multi-word terms like "kick the bucket").
for (const w of fs.readFileSync(path.join(src, 'words_alpha.txt'), 'utf8').split(/\r?\n/)) add(w, 'words');
for (const w of fs.readFileSync(path.join(src, 'wn_lemmas.txt'), 'utf8').split(/\r?\n/)) add(w.replace(/_/g, ' '), 'wordnet');

// 2. Short sentences and clauses from public-domain books.
const gdir = path.join(src, 'gutenberg');
for (const f of fs.readdirSync(gdir).filter(f => /^pg\d+\.txt$/.test(f)).sort()) {
  let text = fs.readFileSync(path.join(gdir, f), 'utf8');
  const start = text.search(/\*\*\* ?START OF TH[EI]S? PROJECT GUTENBERG[^\n]*\n/i);
  const end = text.search(/\*\*\* ?END OF TH[EI]S? PROJECT GUTENBERG/i);
  if (start >= 0) text = text.slice(start, end > start ? end : undefined).replace(/^[^\n]*\n/, '');
  text = text.replace(/\s+/g, ' ').replace(/['’‘]/g, '');
  for (const sentence of text.split(/[.!?]+/)) {
    const n = sentence.trim().split(/\s+/).length;
    if (n >= 2 && n <= 8) add(sentence, 'books');
    for (const clause of sentence.split(/[,;:"“”()\[\]—–]+|--/)) {
      const m = clause.trim().split(/\s+/).length;
      if (m >= 3 && m <= 7) add(clause, 'books');
    }
  }
}

// 3. Totals, dropping the rare phrase whose total doesn't fit in 16 bits.
const list = [...phrases.values()].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
const kept = [], cols = STORED.map(() => []);
for (const p of list) {
  const t = totals(p);
  if (STORED.some(c => t[c] > 0xffff)) continue;
  kept.push(p);
  STORED.forEach((c, i) => cols[i].push(t[c]));
}
const n = kept.length, bin = new Uint8Array(n * 2 * STORED.length);
cols.forEach((col, i) => col.forEach((v, j) => {
  bin[i * 2 * n + j] = v & 0xff;
  bin[i * 2 * n + n + j] = v >> 8;
}));

const out = path.join(root, 'public', 'data', 'dict');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const text = zlib.gzipSync(kept.join('\n'), { level: 9 });
const nums = zlib.gzipSync(bin, { level: 9 });
fs.writeFileSync(path.join(out, 'phrases.txt.gz'), text);
fs.writeFileSync(path.join(out, 'totals.bin.gz'), nums);
fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify({
  count: n, words: kept.filter(p => !p.includes(' ')).length, stored: STORED, sources: counts,
  built: new Date().toISOString().slice(0, 10),
}, null, 1));
console.log(`${n.toLocaleString()} phrases (${phrases.size - n} dropped for size), sources`, counts);
console.log(`phrases.txt.gz ${(text.length / 1e6).toFixed(1)} MB, totals.bin.gz ${(nums.length / 1e6).toFixed(1)} MB`);
