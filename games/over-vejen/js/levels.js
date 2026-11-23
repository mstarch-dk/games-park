// Banerne. Hver bane har 10 rækker oppefra og ned:
//   P = søen hvor mor and venter (målet)
//   G = græs, S = fortov (begge er sikre)
//   R = kørebane, B = cykelsti
// dir: 1 = kører mod højre, -1 = kører mod venstre (højrekørsel: den nederste bane kommer fra venstre).
// speed: felter pr. sekund. gap: [mindst, højst] felter mellem køretøjerne (udeladt = regnes ud fra farten).
// light: et fodgængerfelt med lys i kolonnen col (green/red = sekunder for bilerne).
const P = { t: 'P' };
const G = { t: 'G' };
const S = { t: 'S' };
function R(dir, speed, types = ['bil'], gap = null) { return { t: 'R', dir, speed, types, gap }; }
function B(dir, speed) { return { t: 'B', dir, speed, types: ['cykel'], gap: [1.8 + speed * 0.4, 5.5] }; }

const LEVELS = [
  {
    name: 'Den stille vej',
    tip: 'Kig efter bilerne – og hop over, når der er et stort hul!',
    rows: [P, G, G, S, R(-1, 1.1), R(1, 1.3), S, G, G, G],
  },
  {
    name: 'To veje',
    tip: 'Fortovet i midten er sikkert. Hvil dig der, før du går videre!',
    rows: [P, G, S, R(-1, 1.4), R(1, 1.2), S, S, R(-1, 1.2), R(1, 1.5), S],
  },
  {
    name: 'Bussen kommer',
    tip: 'Bussen er lang. Vent til HELE bussen er kørt forbi!',
    rows: [P, G, S, R(-1, 1.5, ['bil', 'bil', 'bus']), R(1, 1.7, ['bil', 'bus']), S, R(-1, 1.4, ['bus', 'bil']), R(1, 1.6), S, G],
  },
  {
    name: 'Fodgængerfeltet',
    tip: 'Ved de hvide striber er der lys. Når anden lyser GRØN, holder bilerne stille!',
    light: { col: 7, green: 6, red: 6 },
    rows: [P, G, G, S, R(-1, 2.1), R(-1, 1.8), R(1, 1.8), R(1, 2.1), S, G],
  },
  {
    name: 'Cykelstien',
    tip: 'Cyklerne kører på cykelstien. Kig også efter dem!',
    rows: [P, G, S, B(-1, 2.0), R(-1, 1.6, ['bil', 'traktor']), R(1, 1.8, ['bil', 'traktor']), B(1, 1.9), S, G, G],
  },
  {
    name: 'Myldretid',
    tip: 'To baner kører samme vej. Kig efter begge, før du hopper!',
    rows: [P, S, R(-1, 2.0), R(-1, 1.6), S, S, R(1, 1.6), R(1, 2.1), S, G],
  },
  {
    name: 'Lastbilerne',
    tip: 'Lastbilerne er lange og kører stærkt. Vent på et godt hul!',
    rows: [P, G, S, R(-1, 2.3, ['bil', 'lastbil']), R(1, 2.4, ['lastbil', 'bil']), S, R(-1, 2.0, ['bus', 'bil']), R(1, 2.2, ['bil', 'lastbil']), S, G],
  },
  {
    name: 'Det store lyskryds',
    tip: 'Mange baner! Gå over ved fodgængerfeltet, når anden lyser grøn.',
    light: { col: 4, green: 7, red: 7 },
    rows: [P, S, B(-1, 2.2), R(-1, 2.6, ['bil', 'bus']), R(-1, 2.2), R(1, 2.2), R(1, 2.6, ['bil', 'lastbil']), B(1, 2.2), S, G],
  },
  {
    name: 'Isbilen',
    tip: 'Isbilen og traktoren kører langsomt – så kommer bilerne bagved i kø!',
    rows: [P, S, R(-1, 2.4, ['bil', 'isbil', 'bus']), R(1, 2.6, ['bil', 'traktor', 'isbil']), S, R(-1, 2.8), R(1, 2.6, ['bil', 'lastbil']), S, G, G],
  },
  {
    name: 'Den store vej',
    tip: 'Den største vej af dem alle. Du kan godt! Tag én bane ad gangen.',
    rows: [P, S, R(-1, 2.8), R(-1, 2.4, ['bil', 'lastbil']), R(-1, 2.0, ['bil', 'bus']), S, R(1, 2.0, ['bil', 'bus']), R(1, 2.4, ['bil', 'lastbil']), R(1, 2.8), S],
  },
];
