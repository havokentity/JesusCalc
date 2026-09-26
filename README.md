# JesusCalc

Gematria calculator (Hebrew, Simple Gematria, English Gematria, Simple English Reduction, Latin, Greek, Isopsephy) in a single HTML file.

**Live:** https://havokentity.github.io/JesusCalc/

Or open `index.html` locally in a browser.

## Features
- Calculator with per-letter breakdown and history
- Compare two phrases, with a "How rare is this?" test against 20,000 random names
- Match Finder against ~10,700 phrases: holy/unholy names and titles, God-judging-the-devil phrases, and research lists (Ancient, Angels, Atomic, Bible, Greek, Hindu, Military, Near East, Occult, Power, Religions, Roman, UFO, World Myth) in `phrases.js`
- "Compare with random names" baseline for Match Finder results

To run locally with the research lists, serve the folder (e.g. `python3 -m http.server`) since some browsers block loading `phrases.js` from `file://`.
