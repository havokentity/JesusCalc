// Background worker holding the big dictionary (public/data/dict/, built by build/build-dict.js).
// Loading, decompressing and indexing ~1.25M phrases happens here so the UI never stalls.
//
// Messages in:  {id, type: 'search', totals, min, words, phrases, limit}
// Messages out: {type: 'status', state, count?} and {id, rows, total}
import { gunzipSync } from 'fflate';

const C = 7;               // cipher count, matching CIPHERS in ciphers.js
const ENGLISH = 3, SIMPLE = 1, ISOPSEPHY = 6;

let ready = null;          // Promise of the loaded dictionary
let bytes, starts, n;      // phrase text as bytes + start offset of each phrase
let cols = [];             // cols[cipher] = Uint16Array of totals, for stored ciphers
const index = [];          // index[cipher] = {order, first} counting-sort index, built on demand
let seen;                  // scratch marks, one per phrase

async function fetchBytes(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  const buf = new Uint8Array(await r.arrayBuffer());
  // Some servers decompress .gz on the way; only gunzip when the gzip magic bytes are there.
  return buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf;
}

function load(base) {
  return ready ??= (async () => {
    postMessage({ type: 'status', state: 'loading' });
    const meta = await (await fetch(base + 'meta.json')).json();
    const [text, bin] = await Promise.all([fetchBytes(base + 'phrases.txt.gz'), fetchBytes(base + 'totals.bin.gz')]);
    bytes = text;
    n = meta.count;
    starts = new Uint32Array(n + 1);
    let k = 0;
    starts[k++] = 0;
    for (let i = 0; i < bytes.length; i++) if (bytes[i] === 10) starts[k++] = i + 1;
    starts[n] = bytes.length + 1;
    meta.stored.forEach((c, i) => {
      const lo = bin.subarray(i * 2 * n, i * 2 * n + n), hi = bin.subarray(i * 2 * n + n, (i + 1) * 2 * n);
      const col = new Uint16Array(n);
      for (let j = 0; j < n; j++) col[j] = lo[j] | hi[j] << 8;
      cols[c] = col;
    });
    seen = new Uint8Array(n);
    postMessage({ type: 'status', state: 'ready', count: n, words: meta.words });
    return meta;
  })();
}

// Total of phrase j in cipher c (English and Isopsephy are derived, not stored).
const totalOf = (j, c) => c === ENGLISH ? cols[SIMPLE][j] * 6 : c === ISOPSEPHY ? 0 : cols[c][j];

// Counting sort of phrase ids by total: ids with total v are order[first[v] .. first[v+1]).
function getIndex(c) {
  if (index[c]) return index[c];
  const col = cols[c];
  let max = 0;
  for (let j = 0; j < n; j++) if (col[j] > max) max = col[j];
  const first = new Uint32Array(max + 2);
  for (let j = 0; j < n; j++) first[col[j] + 1]++;
  for (let v = 1; v < first.length; v++) first[v] += first[v - 1];
  const fill = first.slice(), order = new Uint32Array(n);
  for (let j = 0; j < n; j++) order[fill[col[j]]++] = j;
  return index[c] = { order, first };
}

const decoder = new TextDecoder();
const phraseAt = j => decoder.decode(bytes.subarray(starts[j], starts[j + 1] - 1));
const isWord = j => bytes.subarray(starts[j], starts[j + 1] - 1).indexOf(32) < 0;

function search({ totals, min, words, phrases, limit }) {
  const cand = [];
  for (const c of Object.keys(cols).map(Number)) {
    const v = totals[c];
    if (!v) continue;
    const { order, first } = getIndex(c);
    if (v + 1 >= first.length) continue;
    for (let k = first[v]; k < first[v + 1]; k++) {
      const j = order[k];
      if (!seen[j]) { seen[j] = 1; cand.push(j); }
    }
  }
  const rows = [];
  for (const j of cand) {
    seen[j] = 0;
    const word = isWord(j);
    if (word ? !words : !phrases) continue;
    const hits = [];
    for (let c = 0; c < C; c++) if (totals[c] && totalOf(j, c) === totals[c]) hits.push(c);
    if (hits.length >= min) rows.push({ j, hits, word });
  }
  rows.sort((a, b) => b.hits.length - a.hits.length);
  return { total: rows.length, rows: rows.slice(0, limit).map(r => ({ p: phraseAt(r.j), hits: r.hits, word: r.word })) };
}

onmessage = async ({ data }) => {
  try {
    await load(data.base);
    if (data.type === 'search') postMessage({ id: data.id, ...search(data) });
  } catch (e) {
    postMessage({ type: 'status', state: 'error', error: String(e) });
    if (data.id) postMessage({ id: data.id, rows: [], total: 0 });
  }
};
