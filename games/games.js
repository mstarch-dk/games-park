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
  },
  {
    id: 'kongens-ridder',
    title: 'Kongens Ridder',
    emoji: '🏰',
    color: '#b23a48',
    tagline: 'Saml Danmark land for land med hære, katapulter, turneringer og fægtning – så kongen kan vende hjem!',
    players: '1',
    keys: ['MUS / PILE vælg', 'ENTER bekræft', 'MELLEMRUM kast/stød', 'P pause'],
    added: '2026-11-21'
  },
  {
    id: 'togbanen',
    title: 'Togbanen',
    emoji: '🚂',
    color: '#2a9d8f',
    tagline: 'Læg skinner og kør passagererne hjem til stationen med deres farve!',
    players: '1',
    keys: ['MUS træk skinner', 'PILE + MELLEMRUM byg', 'ENTER kør', 'H dyt'],
    added: '2026-11-22'
  },
  {
    id: 'klodsregn',
    title: 'Klodsregn',
    emoji: '☁️',
    color: '#ef476f',
    tagline: 'Skyen regner klodser ned – drej dem og lav hele rækker!',
    players: '1',
    keys: ['← → flyt', '↑ drej', 'MELLEMRUM bum ned', 'P pause'],
    added: '2026-11-22'
  },
  {
    id: 'gaet-et-land',
    title: 'Gæt et Land',
    emoji: '🌍',
    color: '#3a86c8',
    tagline: 'Se omrids, flag og ledetråde – og find landet på verdenskortet!',
    players: '1',
    keys: ['MUS klik på kortet', 'TRÆK flyt · HJUL zoom', 'H ledetråd', 'F fakta'],
    added: '2026-11-22'
  },
  {
    id: 'havoernen',
    title: 'Havørnen',
    emoji: '⛵',
    color: '#c8862a',
    tagline: 'Sejl efter vinden, sigt med kanonerne og opbring skibe i de danske farvande!',
    players: '1',
    keys: ['← → ror', '↑ ↓ sejl', 'W S sigt · A D skyd', 'ENTER entr/havn'],
    added: '2026-11-22'
  },
  {
    id: 'over-vejen',
    title: 'Over Vejen',
    emoji: '🐥',
    color: '#8ac926',
    tagline: 'Hjælp ællingen over vejen og hjem til mor and – kig efter bilerne!',
    players: '1',
    keys: ['PILE hop', 'H kig-hjælp', 'P pause', 'M lyd'],
    added: '2026-11-23'
  },
  {
    id: 'guldtoget',
    title: 'Guldtoget',
    emoji: '🚆',
    color: '#e9b824',
    tagline: 'Skift spor i sidste øjeblik, når toget kommer brusende – og kør guldet hjem!',
    players: '1',
    keys: ['← → skift spor', '↑ ligeud', 'MELLEMRUM dyt', 'P pause'],
    added: '2026-11-24'
  }
];
