// Helte man kan vælge, og de tre griske herrer der har delt riget mellem sig.
// Alle personer er opdigtede – kun kong Christian II er historisk.
const HEROES = [
  { name: 'Hr. Niels Ravnsborg', short: 'Niels', home: 'fyn', lead: 3, lance: 1, sword: 2,
    arms: { field: '#b82830', charge: '#f8f4e8', pattern: 'cross' },
    about: 'En klog hærfører. Hans folk følger ham gennem ild og vand.' },
  { name: 'Fru Sigrid Skjoldmø', short: 'Sigrid', home: 'lolland', lead: 1, lance: 2, sword: 3,
    arms: { field: '#f0c838', charge: '#701018', pattern: 'chevron' },
    about: 'Rigets bedste fægter. Ingen vagt kan stoppe hende.' },
  { name: 'Hr. Ebbe Hjortlund', short: 'Ebbe', home: 'ribe', lead: 2, lance: 3, sword: 1,
    arms: { field: '#244a1c', charge: '#f0c838', pattern: 'pale' },
    about: 'Mester i turnering. Hans lanse rammer altid skjoldet.' },
  { name: 'Hr. Mogens Bredsværd', short: 'Mogens', home: 'sydsjaelland', lead: 2, lance: 2, sword: 2,
    arms: { field: '#2848a0', charge: '#f8f4e8', pattern: 'bend' },
    about: 'God til lidt af det hele. Et sikkert valg.' },
];

const LORDS = [
  { id: 'gunder', name: 'Grev Gunder Grimskæg', short: 'Gunder', home: 'holsten', color: '#2a2a2a', light: '#f0c838',
    lead: 2, lance: 2, sword: 2, greed: 0.9, arms: { field: '#f0c838', charge: '#1a1a1a', pattern: 'lions' } },
  { id: 'eske', name: 'Hr. Eske Ulvekrog', short: 'Eske', home: 'skaane', color: '#2848a0', light: '#a8c0f0',
    lead: 2, lance: 3, sword: 2, greed: 1.0, arms: { field: '#2848a0', charge: '#f0c838', pattern: 'stripes' } },
  { id: 'brun', name: 'Jarl Brun Bjørnestad', short: 'Brun', home: 'viborg', color: '#3c6c28', light: '#a0c858',
    lead: 3, lance: 1, sword: 2, greed: 1.1, arms: { field: '#3c6c28', charge: '#e0c890', pattern: 'quarters' } },
];

const NEUTRAL_COLOR = '#c4b088';
const PLAYER_COLOR = '#b82830';
const SEASONS = ['Forår', 'Sommer', 'Efterår', 'Vinter'];

// G: hele spillets tilstand – en ren data-struktur, så den kan gemmes.
let G = null;

function newGame(heroIdx) {
  const h = HEROES[heroIdx];
  G = {
    turn: 0,
    heroIdx,
    factions: {},
    regions: {},
    tourney: 2,
    princess: { state: 'free', holder: null, timer: 0, kidnapTurn: randi(4, 7) },
    acted: false,
    log: [],
    over: null,
  };
  G.factions.player = {
    id: 'player', name: h.name, short: h.short, arms: h.arms, color: PLAYER_COLOR, light: '#f8f4e8',
    gold: 30, lead: h.lead, lance: h.lance, sword: h.sword, home: h.home, ai: false, alive: true,
    army: { f: 12, k: 3, c: 0, at: h.home }, fame: 0, princess: false, captured: 0,
  };
  LORDS.forEach((l) => {
    G.factions[l.id] = {
      id: l.id, name: l.name, short: l.short, arms: l.arms, color: l.color, light: l.light,
      gold: 25, lead: l.lead, lance: l.lance, sword: l.sword, home: l.home, ai: true, alive: true, greed: l.greed,
      army: { f: 16, k: 4, c: 1, at: l.home }, princess: false,
    };
  });
  MapData.order.forEach((id) => {
    G.regions[id] = { owner: null, gar: { f: randi(4, 8), k: Math.random() < 0.4 ? 1 : 0 }, castle: Math.random() < 0.35 ? 1 : 0, farm: 0, market: 0 };
  });
  // Herrerne begynder med et par områder hver – det er de, der har splittet riget.
  const starts = { gunder: ['holsten', 'slesvig'], eske: ['skaane', 'halland', 'blekinge'], brun: ['viborg', 'thy', 'vendsyssel'] };
  Object.keys(starts).forEach((fid) => starts[fid].forEach((rid, i) => {
    const r = G.regions[rid];
    r.owner = fid;
    r.gar = { f: i === 0 ? 8 : 4, k: i === 0 ? 2 : 0 };
    r.castle = i === 0 ? 2 : Math.max(r.castle, 1);
  }));
  const home = G.regions[h.home];
  home.owner = 'player'; home.castle = 2; home.gar = { f: 6, k: 1 };
  return G;
}

function fac(id) { return id ? G.factions[id] : null; }
function ownerColor(id) { return id ? G.factions[id].color : NEUTRAL_COLOR; }
function ownerName(id) { return id ? G.factions[id].short : 'Ingen herre'; }
function regionsOf(fid) { return MapData.order.filter((id) => G.regions[id].owner === fid); }
function seasonName(turn) { return `${SEASONS[turn % 4]} ${1523 + Math.floor(turn / 4)}`; }
function stars(n) { return '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n)); }
