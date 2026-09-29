# JesusCalc

Gematria calculator (Hebrew, Simple Gematria, English Gematria, Simple English Reduction, Latin, Greek, Isopsephy) in a single HTML file.

**Live:** https://havokentity.github.io/JesusCalc/

Or open `index.html` locally in a browser.

## Features
- Calculator with per-letter breakdown and history
- Compare two phrases, with a "How rare is this?" test against 20,000 random names
- Match Finder against ~10,700 phrases: holy/unholy names and titles, God-judging-the-devil phrases, and research lists (Ancient, Angels, Atomic, Bible, Greek, Hindu, Military, Near East, Occult, Power, Religions, Roman, UFO, World Myth) in `phrases.js`
- "Compare with random names" baseline for Match Finder results

- Big dictionary: about 1.25 million words, terms and short lines, searched on demand from `data/big/`

## Big dictionary
Built by `node build/build-index.js <sources-dir>` from:
- [dwyl/english-words](https://github.com/dwyl/english-words) `words_alpha.txt` (Unlicense)
- [Open English WordNet](https://github.com/globalwordnet/english-wordnet) 2025 lemmas (CC BY 4.0)
- Short sentences and clauses from about 70 public-domain books on [Project Gutenberg](https://www.gutenberg.org/), including the King James Bible, Shakespeare, Milton, Dante, Homer and Plato

Phrases are stored as gzipped files grouped by their Hebrew, Simple, Latin and Greek totals, so a search downloads only the few files it needs.

To run locally with the research lists, serve the folder (e.g. `python3 -m http.server`) since some browsers block loading `phrases.js` from `file://`.
