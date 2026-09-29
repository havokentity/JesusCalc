// In-memory index of the curated lists (~25k phrases), built once on first use.
import { totals } from './ciphers.js';
import { allEntries } from './lists.js';

// Hash-map index: for each cipher, total -> ids of phrases with that total.
let IDX = null;
export function getIndex() {
  if (IDX) return IDX;
  const byKey = new Map(), phrases = [], lists = [], opts = [];
  for (const [p, list, opt] of allEntries()) {
    const k = p.toLowerCase();
    let id = byKey.get(k);
    if (id === undefined) { id = phrases.length; byKey.set(k, id); phrases.push(p); lists.push(list); opts.push(new Set()); }
    opts[id].add(opt);
  }
  const maps = [];
  phrases.forEach((p, id) => totals(p).forEach((t, i) => {
    if (!t) return;
    const m = maps[i] ??= new Map();
    let a = m.get(t);
    if (!a) m.set(t, a = []);
    a.push(id);
  }));
  return IDX = { phrases, lists, opts, maps, keys: byKey };
}

// Phrases sharing at least `min` cipher totals with `qt`, as [{p, list, hits:[cipher index]}].
// `on` is the set of enabled list options; `custom` is the user's own list.
export function findMatches(qt, min, on, custom = []) {
  const idx = getIndex(), counts = new Map();
  qt.forEach((t, i) => {
    if (!t) return;
    for (const id of idx.maps[i]?.get(t) || []) {
      let c = counts.get(id);
      if (!c) counts.set(id, c = []);
      c.push(i);
    }
  });
  const rows = [];
  for (const [id, hits] of counts)
    if (hits.length >= min && [...idx.opts[id]].some(o => on.has(o))) rows.push({ p: idx.phrases[id], list: idx.lists[id], hits });
  for (const p of custom) {
    const hits = [];
    totals(p).forEach((t, i) => { if (t && t === qt[i]) hits.push(i); });
    if (hits.length >= min) rows.push({ p, list: 'my list', hits });
  }
  return rows;
}

// The option groups shown as checkboxes, in display order.
export function listGroups() {
  const idx = getIndex(), research = new Set();
  idx.opts.forEach(s => s.forEach(o => { if (o.startsWith('x:')) research.add(o.slice(2)); }));
  return {
    core: [
      ['holy', 'Holy names'], ['unholy', 'Unholy names'], ['nations', 'Nations'],
      ['names', 'Holy name + title'], ['unames', 'Unholy name + title'], ['combos', 'Title + nation'],
      ['judge', 'God judging the devil'], ['phrases', 'Your phrases'],
    ],
    research: [...research].sort().map(g => ['x:' + g, g]),
  };
}
