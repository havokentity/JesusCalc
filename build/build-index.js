// Builds the "Big dictionary" index served from data/big/.
//
//   node build/build-index.js <sources-dir>
//
// <sources-dir> holds words_alpha.txt (dwyl/english-words), wn_lemmas.txt (Open English
// WordNet lemmas, one per line) and gutenberg/pg*.txt (Project Gutenberg plain-text books).
//
// Output: for each shard cipher, gzipped text files of phrases grouped by that cipher's
// total, so a search downloads one small file per cipher instead of the whole dictionary.
const fs = require('fs'), path = require('path'), zlib = require('zlib');

const root = path.join(__dirname, '..');
const { compute, CIPHERS } = new Function(fs.readFileSync(path.join(root, 'ciphers.js'), 'utf8') + '\nreturn { compute, CIPHERS };')();
const src = process.argv[2];
if (!src) { console.error('usage: node build/build-index.js <sources-dir>'); process.exit(1); }

// Ciphers that get their own shards. English Gematria is Simple × 6 and Isopsephy needs
// Greek script, so neither adds anything for English-letter phrases. Simple English
// (1–9 per letter) is left out too: its totals are so common that its files would be the
// biggest, and any phrase that also matches another cipher is still found through that one.
const SHARDS = [
  { cipher: 0, bucket: 25 },  // Hebrew
  { cipher: 1, bucket: 1 },   // Simple Gematria
  { cipher: 4, bucket: 25 },  // Latin
  { cipher: 5, bucket: 25 },  // Greek (transliterated)
];

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
console.log('phrases:', phrases.size, counts);

// 3. Shard by cipher total.
const out = path.join(root, 'data', 'big');
fs.rmSync(out, { recursive: true, force: true });
const shards = SHARDS.map(() => new Map());
for (const p of phrases.values()) {
  const totals = compute(p).map(r => r.total);
  SHARDS.forEach((s, i) => {
    const t = totals[s.cipher];
    if (!t) return;
    const b = Math.floor(t / s.bucket);
    let list = shards[i].get(b);
    if (!list) shards[i].set(b, list = []);
    list.push(p);
  });
}
let files = 0, bytes = 0;
SHARDS.forEach((s, i) => {
  const dir = path.join(out, 'c' + s.cipher);
  fs.mkdirSync(dir, { recursive: true });
  for (const [b, list] of shards[i]) {
    const gz = zlib.gzipSync(list.join('\n'), { level: 9 });
    fs.writeFileSync(path.join(dir, b + '.txt.gz'), gz);
    files++; bytes += gz.length;
  }
});
fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify({
  count: phrases.size, sources: counts, shards: SHARDS, built: new Date().toISOString().slice(0, 10),
}, null, 1));
console.log(`wrote ${files} files, ${(bytes / 1e6).toFixed(1)} MB gzipped`);
