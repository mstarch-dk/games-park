// Spilleparkens katalog – ét objekt pr. spil. Parken (index.html) læser denne liste.
// Det er en .js-fil (ikke JSON), så parken også virker når index.html åbnes med dobbeltklik.
//
// Felter:
//   id       mappenavn under games/ (kebab-case, unikt)
//   title    spillets navn
//   emoji    ét emoji der vises på skiltet
//   color    skiltets farve (hex)
//   tagline  én kort sætning til et barn
//   players  fx "1", "1–2"
//   keys     korte tast-forklaringer
//   added    dato (yyyy-mm-dd) spillet kom i parken
window.PARK_GAMES = [
  {
    id: 'abe-hop',
    title: 'Abe-Hop',
    emoji: '🐒',
    color: '#ff9f1c',
    tagline: 'Hop over tønder, saml bananer og flygt fra bomberne!',
    players: '1',
    keys: ['← → løb', '↑ / MELLEMRUM hop', 'P pause'],
    added: '2026-11-17'
  },
  {
    id: 'rum-duel',
    title: 'Rum-Duel',
    emoji: '🚀',
    color: '#7b5cff',
    tagline: 'Flyv rumskib med ægte rumfysik – alene eller mod en ven!',
    players: '1–2',
    keys: ['← → drej', '↑ speeder', 'MELLEMRUM skyd', '↓ special'],
    added: '2026-11-20'
  },
  {
    id: 'himmel-heltene',
    title: 'Himmel-Heltene',
    emoji: '✈️',
    color: '#2ec4f1',
    tagline: 'Flyv propelfly, skyd de gnavne fly ned og saml power-ups – alene eller med en ven!',
    players: '1–2',
    keys: ['← → ↑ ↓ flyv', 'MELLEMRUM skyd', 'B venne-fly', 'P pause'],
    added: '2026-11-21'
  }
];
