// Cipher tables and compute(), shared by the app, the dictionary worker and build/build-dict.js.
export const HEB = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,'נ':50,'ן':50,'ס':60,'ע':70,'פ':80,'ף':80,'צ':90,'ץ':90,'ק':100,'ר':200,'ש':300,'ת':400};
export const JEWISH = {a:1,b:2,c:3,d:4,e:5,f:6,g:7,h:8,i:9,k:10,l:20,m:30,n:40,o:50,p:60,q:70,r:80,s:90,t:100,u:200,x:300,y:400,j:600,z:500,v:700,w:900};
export const LATIN = {a:1,b:2,c:3,d:4,e:5,f:6,g:7,h:8,i:9,k:10,l:20,m:30,n:40,o:50,p:60,q:70,r:80,s:90,t:100,v:200,x:300,y:400,z:500};
export const GREEK = {'α':1,'β':2,'γ':3,'δ':4,'ε':5,'ϛ':6,'ϝ':6,'ζ':7,'η':8,'θ':9,'ι':10,'κ':20,'λ':30,'μ':40,'ν':50,'ξ':60,'ο':70,'π':80,'ϙ':90,'ϟ':90,'ρ':100,'σ':200,'ς':200,'τ':300,'υ':400,'φ':500,'χ':600,'ψ':700,'ω':800,'ϡ':900};
export const TRANS = [['th','θ'],['ph','φ'],['ch','χ'],['ps','ψ'],['ks','ξ'],['a','α'],['b','β'],['c','κ'],['d','δ'],['e','ε'],['f','φ'],['g','γ'],['h','η'],['i','ι'],['j','ι'],['k','κ'],['l','λ'],['m','μ'],['n','ν'],['o','ο'],['p','π'],['q','κ'],['r','ρ'],['s','σ'],['t','τ'],['u','υ'],['v','β'],['w','ω'],['x','ξ'],['y','υ'],['z','ζ']];

export const eng = s => s.toLowerCase().replace(/[^a-z]/g,'');
export const heb = s => [...s].filter(c => HEB[c]);
export const grk = s => [...s.normalize('NFD').toLowerCase()].filter(c => GREEK[c]);
export const ordinal = c => c.charCodeAt(0) - 96;
export const reduce = n => { while (n > 9) n = [...String(n)].reduce((a,d)=>a+ +d,0); return n; };
export const pairs = (letters, fn) => letters.map(c => [c, fn(c)]);

export function translit(s){
  s = eng(s); const out = [];
  for (let i = 0; i < s.length;) {
    const [l, g] = TRANS.find(([l]) => s.startsWith(l, i));
    out.push([l.toUpperCase()+'→'+g, GREEK[g]]); i += l.length;
  }
  return out;
}

export const CIPHERS = [
  {name:'Hebrew (Mispar Hechrachi)', run:s => heb(s).length ? ['Hebrew', pairs(heb(s), c=>HEB[c])] : ['English→Jewish', pairs([...eng(s)], c=>JEWISH[c])]},
  {name:'Simple Gematria (English Ordinal)', run:s => ['English', pairs([...eng(s)], ordinal)]},
  {name:'Simple English (Reduction)', run:s => ['English', pairs([...eng(s)], c => reduce(ordinal(c)))]},
  {name:'English Gematria (Sumerian ×6)', run:s => ['English', pairs([...eng(s)], c => ordinal(c)*6)]},
  {name:'Latin (Agrippa)', run:s => ['English', [...eng(s)].map(c => [c, c==='w' ? 400 : LATIN[{j:'i',u:'v'}[c]||c]])]},
  {name:'Greek (English transliterated)', run:s => ['English→Greek', translit(s)]},
  {name:'Isopsephy (Greek script)', run:s => ['Greek', pairs(grk(s), c=>GREEK[c])]},
];

export const compute = s => CIPHERS.map(c => { const [script, p] = c.run(s); return {name:c.name, script, p, total:p.reduce((a,[,v])=>a+v,0)}; });

// Just the totals, for bulk work (index building, random-name tests).
export const totals = s => compute(s).map(r => r.total);
