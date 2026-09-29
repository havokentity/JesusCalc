import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/cinzel/600.css';
import './style.css';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { StatusBar, Style } from '@capacitor/status-bar';
import { CIPHERS, compute, totals, reduce } from './ciphers.js';
import { noteFor } from './lists.js';
import { getIndex, findMatches, listGroups } from './curated.js';
import { randomName } from './random.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const short = i => CIPHERS[i].name.split(' (')[0];
const store = {
  get(k, d) { try { const v = localStorage.getItem('lw:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('lw:' + k, JSON.stringify(v)); } catch {} },
};
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), 1800);
}

// ---------- Tabs ----------
const TABS = ['calc', 'compare', 'find', 'saved'];
function showTab(name, focus = true) {
  if (!TABS.includes(name)) name = 'calc';
  for (const t of TABS) $(t).hidden = t !== name;
  document.querySelectorAll('[data-tab]').forEach(b => { if (b.dataset.tab === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
  if (name === 'find') { loadDictionary(); renderMatches(); }
  if (name === 'saved') renderSaved();
  window.scrollTo(0, 0);
  if (focus && window.matchMedia('(pointer: fine)').matches) ({ calc: $('q'), compare: $('cA'), find: $('mf') })[name]?.focus();
}
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => showTab(b.dataset.tab));
window.addEventListener('hashchange', () => showTab(location.hash.slice(1), false));

document.querySelectorAll('[data-clear]').forEach(b => b.onclick = () => {
  const input = $(b.dataset.clear);
  input.value = ''; input.dispatchEvent(new Event('input')); input.focus();
});

// ---------- Calculate ----------
let expanded = -1;
function renderCalc() {
  const s = $('q').value, res = compute(s), note = noteFor(s);
  $('qNote').hidden = !note;
  $('qNote').textContent = note;
  $('results').innerHTML = s.trim() ? res.map((r, i) => `
    <li class="${r.total ? '' : 'zero'}">
      <button class="cipher-row" data-i="${i}" aria-expanded="${i === expanded}">
        <span class="name"><b>${esc(r.name.split(' (')[0])}</b><small>${esc(r.name.includes('(') ? r.name.slice(r.name.indexOf('(') + 1, -1) : '')}${r.p.length ? ' · ' + r.p.length + ' letters' : ''}</small></span>
        <span class="total">${r.total}</span>
        <span class="root">${r.total ? 'root ' + reduce(r.total) : ''}</span>
      </button>
      ${i === expanded ? `<div class="breakdown">${r.p.length ? r.p.map(([c, v]) => `<span class="chip"><b>${esc(c)}</b><small>${v}</small></span>`).join('') : '<span class="hint">No letters for this cipher.</span>'}</div>` : ''}
    </li>`).join('') : '';
  const saved = store.get('saved', []);
  $('saveBtn').textContent = saved.includes(s.trim()) ? '★ Saved' : '☆ Save';
  ['saveBtn', 'shareBtn', 'findBtn'].forEach(id => $(id).disabled = !s.trim());
}
$('q').addEventListener('input', () => { expanded = -1; renderCalc(); store.set('q', $('q').value); });
$('q').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
$('results').onclick = e => {
  const b = e.target.closest('.cipher-row');
  if (!b) return;
  expanded = expanded === +b.dataset.i ? -1 : +b.dataset.i;
  renderCalc();
};

// On-screen Hebrew / Greek letters
const KBD = { he: 'אבגדהוזחטיכךלמםנןסעפףצץקרשת', gr: 'αβγδεϛζηθικλμνξοπϙρσςτυφχψωϡ' };
let kbdShown = null;
document.querySelectorAll('[data-kbd]').forEach(b => b.onclick = () => {
  kbdShown = kbdShown === b.dataset.kbd ? null : b.dataset.kbd;
  document.querySelectorAll('[data-kbd]').forEach(x => x.setAttribute('aria-pressed', x.dataset.kbd === kbdShown));
  $('kbd').hidden = !kbdShown;
  if (kbdShown) $('kbd').innerHTML = [...KBD[kbdShown]].map(c => `<button>${c}</button>`).join('') + '<button aria-label="Space">␣</button><button aria-label="Delete">⌫</button>';
});
$('kbd').onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  const q = $('q');
  q.value = b.textContent === '⌫' ? [...q.value].slice(0, -1).join('') : q.value + (b.textContent === '␣' ? ' ' : b.textContent);
  q.dispatchEvent(new Event('input'));
};

$('saveBtn').onclick = () => {
  const s = $('q').value.trim();
  if (!s) return;
  let saved = store.get('saved', []);
  saved = saved.includes(s) ? saved.filter(x => x !== s) : [s, ...saved];
  store.set('saved', saved);
  toast(saved.includes(s) ? 'Saved' : 'Removed from saved');
  renderCalc();
};
$('shareBtn').onclick = async () => {
  const s = $('q').value.trim();
  const text = `${s}\n` + compute(s).filter(r => r.total).map(r => `${r.name.split(' (')[0]}: ${r.total}`).join('\n') + '\n— Letterweight';
  try {
    if (Capacitor.isNativePlatform()) await Share.share({ title: s, text });
    else if (navigator.share) await navigator.share({ title: s, text });
    else { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); }
  } catch {}
};
$('findBtn').onclick = () => { $('mf').value = $('q').value; showTab('find'); };

// ---------- Compare ----------
function renderCompare() {
  const a = $('cA').value.trim(), b = $('cB').value.trim(), ra = compute(a), rb = compute(b);
  store.set('cmp', [a, b]);
  if (!a || !b) { $('cmp').innerHTML = ''; $('cmpSummary').textContent = ''; return; }
  let equal = 0;
  $('cmp').innerHTML = ra.map((x, i) => {
    const y = rb[i], both = x.total && y.total, eq = both && x.total === y.total;
    const same = both && !eq && reduce(x.total) === reduce(y.total);
    if (eq) equal++;
    return `<li class="${eq ? 'eq' : ''}"><span class="cname">${esc(x.name)}</span>
      <span class="vals">${x.total} · ${y.total}</span>
      <span class="hint">${both && !eq ? 'Δ ' + Math.abs(x.total - y.total) : ''}</span>
      ${eq ? '<span class="badge">Equal</span>' : same ? `<span class="badge soft">Root ${reduce(x.total)}</span>` : '<span></span>'}</li>`;
  }).join('');
  $('cmpSummary').textContent = equal ? `Equal in ${equal} cipher${equal === 1 ? '' : 's'}` : 'No equal ciphers';
}
$('cA').addEventListener('input', renderCompare);
$('cB').addEventListener('input', renderCompare);
$('rareBtn').onclick = () => {
  const a = $('cA').value.trim(), b = $('cB').value.trim();
  if (!a || !b) { $('rareOut').innerHTML = '<p class="hint">Fill in both boxes first.</p>'; return; }
  const ta = totals(a), count = x => totals(x).filter((t, i) => t && t === ta[i]).length;
  const k = count(b), words = Math.max(2, b.split(/\s+/).length), N = 20000, hist = Array(CIPHERS.length + 1).fill(0);
  for (let i = 0; i < N; i++) hist[count(randomName(words))]++;
  const atLeast = hist.slice(k).reduce((x, y) => x + y, 0);
  const odds = atLeast ? `about 1 in ${Math.round(N / atLeast).toLocaleString()}` : `fewer than 1 in ${N.toLocaleString()}`;
  $('rareOut').innerHTML = `<p><b>${esc(b)}</b> matches <b>${esc(a)}</b> in <b>${k}</b> cipher${k === 1 ? '' : 's'}. Random ${words}-word names do that ${odds} (${atLeast.toLocaleString()} of ${N.toLocaleString()}).</p>
    <table class="hist"><tr><th>Ciphers</th>${hist.map((_, i) => `<th>${i}</th>`).join('')}</tr>
    <tr><th>Names</th>${hist.map((h, i) => `<td class="${i >= k ? 'hi' : ''}">${h.toLocaleString()}</td>`).join('')}</tr></table>
    <p class="hint">Simple and English Gematria always match together, so 2 can be a single coincidence.</p>`;
};

// ---------- Find ----------
const DEFAULT_OFF = new Set(['bigWords']);
const optState = store.get('opts', {});
const isOn = o => optState[o] ?? !DEFAULT_OFF.has(o);
function buildChecks() {
  const { core, research } = listGroups();
  const check = ([o, label]) => `<label><input type="checkbox" data-opt="${o}"> ${esc(label)}</label>`;
  $('coreChecks').innerHTML = core.map(check).join('');
  $('researchChecks').innerHTML = research.map(check).join('');
  document.querySelectorAll('[data-opt]').forEach(c => c.checked = isOn(c.dataset.opt));
  updateListsCount();
}
function updateListsCount() {
  const all = [...document.querySelectorAll('[data-opt]')];
  $('listsCount').textContent = `${all.filter(c => c.checked).length} of ${all.length} on`;
}
const enabled = () => new Set([...document.querySelectorAll('[data-opt]:checked')].map(c => c.dataset.opt));
$('listsPanel').addEventListener('change', e => {
  if (e.target.dataset.opt) { optState[e.target.dataset.opt] = e.target.checked; store.set('opts', optState); }
  updateListsCount(); renderMatches();
});
$('allOn').onclick = e => { e.preventDefault(); setAll(true); };
$('allOff').onclick = e => { e.preventDefault(); setAll(false); };
function setAll(v) {
  document.querySelectorAll('[data-opt]').forEach(c => { c.checked = v; optState[c.dataset.opt] = v; });
  store.set('opts', optState); updateListsCount(); renderMatches();
}
let minCiphers = store.get('min', 3);
function setMin(v) {
  minCiphers = v; store.set('min', v);
  $('mfMin').querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', +b.dataset.v === v));
}
$('mfMin').onclick = e => { const b = e.target.closest('button'); if (b) { setMin(+b.dataset.v); renderMatches(); } };
$('mfPromote').value = store.get('promote', '4');
$('mfPromote').onchange = () => { store.set('promote', $('mfPromote').value); renderMatches(); };
$('mfCustom').value = store.get('custom', '');
$('mfCustom').addEventListener('input', () => { store.set('custom', $('mfCustom').value); renderMatches(); });
const customList = () => enabled().has('custom') ? $('mfCustom').value.split('\n').map(s => s.trim()).filter(Boolean) : [];

// Big dictionary, searched in a background worker.
const worker = new Worker(new URL('./dict.worker.js', import.meta.url), { type: 'module' });
const dictBase = new URL('data/dict/', document.baseURI).href;
let dict = { state: 'idle' }, reqId = 0;
const pending = new Map();
worker.onmessage = ({ data }) => {
  if (data.type === 'status') { dict = data; renderStats(); if (data.state === 'ready') renderMatches(); return; }
  pending.get(data.id)?.(data); pending.delete(data.id);
};
function loadDictionary() { if (dict.state === 'idle') worker.postMessage({ type: 'load', base: dictBase }); }
function searchDictionary(qt, min, on) {
  const id = ++reqId;
  return new Promise(res => {
    pending.set(id, res);
    worker.postMessage({ id, type: 'search', base: dictBase, totals: qt, min, words: on.has('bigWords'), phrases: on.has('bigPhrases'), limit: 1500 });
  });
}

const PAGE = 200;
let shown = PAGE, lastRows = [], lastTotals = [], token = 0, stats = {};
function renderMatches() {
  const q = $('mf').value.trim(), t = ++token;
  store.set('mf', $('mf').value);
  shown = PAGE;
  if (!q) { lastRows = []; stats = {}; paint(); return; }
  const t0 = performance.now(), qt = totals(q), on = enabled();
  const curated = findMatches(qt, minCiphers, on, customList());
  lastTotals = qt;
  stats = { curated: curated.length, dict: null, ms: performance.now() - t0 };
  lastRows = sortRows(curated); paint();
  if (!(on.has('bigWords') || on.has('bigPhrases'))) return;
  clearTimeout(renderMatches.timer);
  renderMatches.timer = setTimeout(async () => {
    const res = await searchDictionary(qt, minCiphers, on);
    if (t !== token) return;
    const keys = getIndex().keys;
    const extra = res.rows.filter(r => !keys.has(r.p.toLowerCase())).map(r => ({ ...r, list: r.word ? 'dictionary word' : 'dictionary' }));
    stats.dict = res.total; stats.dictShown = extra.length;
    lastRows = sortRows(curated.concat(extra)); paint();
  }, 200);
}
// Rows with enough ciphers go to the top wherever they came from; dictionary single words
// otherwise sit at the bottom, below curated and dictionary phrases.
function sortRows(rows) {
  const promote = +$('mfPromote').value, tier = r => r.hits.length >= promote ? 0 : r.word ? 2 : 1;
  return rows.sort((a, b) => tier(a) - tier(b) || b.hits.length - a.hits.length);
}
function renderStats() {
  const q = $('mf').value.trim(), on = enabled(), usesDict = on.has('bigWords') || on.has('bigPhrases');
  const dictState = !usesDict ? '' : dict.state === 'loading' ? ' Loading the 1.25M dictionary…' : dict.state === 'error' ? ' Dictionary unavailable.' : '';
  if (!q) { $('mfStats').textContent = dictState.trim(); return; }
  const found = lastRows.length.toLocaleString();
  const more = stats.dict != null && stats.dict > stats.dictShown ? ` (dictionary: top ${stats.dictShown.toLocaleString()} of ${stats.dict.toLocaleString()})` : '';
  $('mfStats').textContent = `${found} match${lastRows.length === 1 ? '' : 'es'} in ${minCiphers}+ ciphers${more}.${dictState}`;
}
function paint() {
  renderStats();
  const promote = +$('mfPromote').value;
  $('mfOut').innerHTML = lastRows.slice(0, shown).map(r => {
    const note = noteFor(r.p);
    return `<li class="${r.hits.length >= promote ? 'strong' : ''}">
      <div class="match-top"><span class="phrase">${esc(r.p)}</span><span class="count">${r.hits.length}</span></div>
      <div class="match-meta"><span class="tag">${esc(r.list)}</span>${r.hits.map(i => `<span class="badge soft">${short(i)} ${lastTotals[i]}</span>`).join('')}</div>
      ${note ? `<div class="match-note">${esc(note)}</div>` : ''}</li>`;
  }).join('') || ($('mf').value.trim() ? '<li class="hint">No matches. Try fewer ciphers or more lists.</li>' : '');
  $('moreBtn').hidden = lastRows.length <= shown;
}
$('moreBtn').onclick = () => { shown += PAGE; paint(); };
$('mf').addEventListener('input', renderMatches);
$('mfRare').onclick = () => {
  const q = $('mf').value.trim();
  if (!q) return;
  const on = enabled(), custom = customList(), words = Math.max(2, q.split(/\s+/).length);
  const count = x => findMatches(totals(x), minCiphers, on, custom).length;
  const mine = count(q), N = 2000, rs = Array.from({ length: N }, () => count(randomName(words)));
  const avg = rs.reduce((a, b) => a + b, 0) / N, asMany = rs.filter(r => r >= mine).length;
  $('mfRareOut').innerHTML = `<b>${esc(q)}</b>: <b>${mine}</b> curated phrases with ${minCiphers}+ matching ciphers. Random ${words}-word names average <b>${avg.toFixed(1)}</b>; ${asMany.toLocaleString()} of ${N.toLocaleString()} got ${mine} or more.`;
};

// ---------- Saved ----------
function renderSaved() {
  const saved = store.get('saved', []);
  $('savedEmpty').hidden = saved.length > 0;
  $('savedList').innerHTML = saved.map((s, i) => `<li>
    <button class="saved-open" data-open="${i}"><b>${esc(s)}</b>
      <span class="saved-totals">${compute(s).filter(r => r.total).map(r => `<span>${esc(r.name.split(' (')[0])} <b>${r.total}</b></span>`).join('')}</span></button>
    <button class="del" data-del="${i}" aria-label="Remove">×</button></li>`).join('');
}
$('savedList').onclick = e => {
  const saved = store.get('saved', []);
  const del = e.target.closest('[data-del]'), open = e.target.closest('[data-open]');
  if (del) { saved.splice(+del.dataset.del, 1); store.set('saved', saved); renderSaved(); }
  else if (open) { $('q').value = saved[+open.dataset.open]; expanded = -1; renderCalc(); showTab('calc'); }
};

// ---------- Settings & theme ----------
function applyTheme(t) {
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  if (Capacitor.isNativePlatform()) {
    const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
  }
}
const theme = store.get('theme', 'system');
applyTheme(theme);
document.querySelectorAll('input[name="theme"]').forEach(r => {
  r.checked = r.value === theme;
  r.onchange = () => { store.set('theme', r.value); applyTheme(r.value); };
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(store.get('theme', 'system')));
$('openSettings').onclick = () => $('settings').showModal();
$('version').textContent = `Letterweight ${__APP_VERSION__} · ${getIndex().phrases.length.toLocaleString()} curated phrases + 1.25M dictionary entries`;

// ---------- Start ----------
$('q').value = store.get('q', '');
[$('cA').value, $('cB').value] = store.get('cmp', ['', '']);
$('mf').value = store.get('mf', '');
buildChecks();
setMin(minCiphers);
renderCalc();
renderCompare();
showTab(location.hash.slice(1) || 'calc', false);
