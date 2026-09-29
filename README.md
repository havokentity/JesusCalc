# Letterweight

Gematria calculator for Hebrew, English, Latin and Greek ciphers, with a match finder over about 25,000 curated phrases and a 1.25-million-entry dictionary. One codebase runs as a web app, an iOS app and an Android app.

**Web app:** https://havokentity.github.io/letterweight/

## Features
- **Calculate:** totals in 7 ciphers (Hebrew, Simple, Simple English, English, Latin, Greek, Isopsephy), tap a cipher for its letter breakdown, on-screen Hebrew and Greek letters, save and share
- **Compare:** two phrases side by side, plus a "how rare is this?" test against 20,000 random names
- **Find:** phrases sharing totals with yours across curated lists (holy and unholy names, deities, angels, history, philosophy and more) and the dictionary, with minimum-cipher and always-on-top filters
- **Saved:** your saved words with their totals
- Works offline; light and dark themes

## Development
```
npm install
npm run dev          # local dev server
npm run build        # web build into dist/
npm run sync         # build and copy into the iOS and Android projects
npx cap open ios     # open in Xcode
npx cap open android # open in Android Studio
```
Android builds need JDK 21 and the Android SDK (`android/local.properties` points at it).

## Layout
- `src/ciphers.js` cipher tables and totals, shared by the app, the worker and the build script
- `src/lists.js`, `src/research.js` curated phrase lists and notes
- `src/curated.js` in-memory index of the curated lists
- `src/dict.worker.js` background worker that loads and searches the dictionary
- `src/main.js`, `src/style.css`, `index.html` the app
- `public/data/dict/` the compact dictionary (built by `build/build-dict.js`)
- `ios/`, `android/` native Capacitor projects

## Dictionary
`npm run build:dict -- <sources-dir>` rebuilds `public/data/dict/` from:
- [dwyl/english-words](https://github.com/dwyl/english-words) `words_alpha.txt` (Unlicense)
- [Open English WordNet](https://github.com/globalwordnet/english-wordnet) 2025 lemmas (CC BY 4.0)
- Short sentences and clauses from about 70 public-domain books on [Project Gutenberg](https://www.gutenberg.org/), including the King James Bible, Shakespeare, Milton, Dante, Homer and Plato

Each phrase is stored once, alphabetically, with its cipher totals in a separate compact file (16.7 MB compressed in total). The files are gzipped but named `.dat`, because Android's build tools unzip `.gz` assets and drop the extension. The worker builds its lookup index on the device.
