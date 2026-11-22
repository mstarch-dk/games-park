// Bygger spillets datafiler (js/data/*.js og flags/*.svg) ud fra åbne datakilder.
// Spillet selv bruger kun de færdige filer – dette script skal kun køres, hvis data skal laves om.
//
// Kræver Node 18+ med fuld ICU (danske landenavne) og en mappe med npm-pakkerne
//   world-atlas@2 (Natural Earth, public domain / ISC), world-countries (ODbL),
//   flag-icons (MIT) og topojson-client (ISC):
//     mkdir pkgs && cd pkgs && npm init -y && npm i world-atlas@2 world-countries flag-icons topojson-client
// Kør:
//   node tools/build-data.js <sti-til-pkgs> [mappe-med-fakta-filer]
// Uden fakta-mappe genbruges ledetråde og fakta fra den nuværende js/data/countries.js.
// Fakta-filerne er .js-filer med kald af formen FACT('DK', { capital, capLL, pop, tier, clues, facts, hello, food, animal }).
'use strict';
var fs = require('fs');
var path = require('path');

var PKGS = path.resolve(process.argv[2] || 'pkgs');
var FACTS_DIR = path.resolve(process.argv[3] || 'facts');
var OUT = path.resolve(__dirname, '..');
var req = function (p) { return require(path.join(PKGS, 'node_modules', p)); };

var topo = req('topojson-client');
var t50 = req('world-atlas/countries-50m.json');
var t10 = req('world-atlas/countries-10m.json');
var wc = req('world-countries/countries.json');

var EXTRA = ['VA', 'PS', 'XK', 'TW', 'GL', 'FO'];
var want = wc.filter(function (c) { return c.unMember || EXTRA.indexOf(c.cca2) >= 0; });
var byNum = {}, byCca3 = {};
wc.forEach(function (c) { byNum[c.ccn3] = c; byCca3[c.cca3] = c; });

// ---------- Geometri ----------
function polysOf(geom) {
  if (!geom) return [];
  if (geom.type === 'Polygon') return [geom.coordinates];
  if (geom.type === 'MultiPolygon') return geom.coordinates;
  return [];
}
var feats50 = topo.feature(t50, t50.objects.countries).features;
var feats10 = topo.feature(t10, t10.objects.countries).features;

// Hvilken landekode hører hvert kort-område til? (nogle har ikke nummer)
var MERGE_NAME = { 'Kosovo': 'XK', 'Somaliland': 'SO', 'N. Cyprus': 'CY' };
var shapes = {}; // cca2 -> [polygon...]
var other = [];  // land der ikke er et land i spillet (Antarktis, territorier ...)
feats50.forEach(function (f) {
  var c = byNum[f.id];
  var code = MERGE_NAME[f.properties.name] || (c && c.cca2);
  var ps = polysOf(f.geometry);
  if (code && want.some(function (w) { return w.cca2 === code; })) {
    shapes[code] = (shapes[code] || []).concat(ps);
  } else {
    other = other.concat(ps);
  }
});
// Tuvalu findes kun i det fineste kort.
want.forEach(function (c) {
  if (shapes[c.cca2]) return;
  var f = feats10.filter(function (x) { return x.id === c.ccn3; })[0];
  if (f) shapes[c.cca2] = polysOf(f.geometry);
  else console.warn('Ingen geometri for', c.cca2);
});

// Douglas–Peucker forenkling af en ring (grader).
function simplify(ring, tol) {
  if (ring.length <= 4) return ring;
  var keep = new Uint8Array(ring.length);
  keep[0] = keep[ring.length - 1] = 1;
  var stack = [[0, ring.length - 1]];
  while (stack.length) {
    var s = stack.pop(), a = s[0], b = s[1];
    var ax = ring[a][0], ay = ring[a][1], bx = ring[b][0], by = ring[b][1];
    var dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    var best = -1, bi = -1;
    for (var i = a + 1; i < b; i++) {
      var px = ring[i][0] - ax, py = ring[i][1] - ay, d;
      if (len2 === 0) d = px * px + py * py;
      else {
        var t = Math.max(0, Math.min(1, (px * dx + py * dy) / len2));
        var qx = px - t * dx, qy = py - t * dy;
        d = qx * qx + qy * qy;
      }
      if (d > best) { best = d; bi = i; }
    }
    if (best > tol * tol) { keep[bi] = 1; stack.push([a, bi], [bi, b]); }
  }
  var out = ring.filter(function (_, i) { return keep[i]; });
  return out.length >= 4 ? out : ring;
}

// Kodning: hver ring bliver et array af heltal (1/100 grad), delta-kodet: [x0,y0,dx1,dy1,...].
function encodeRing(ring) {
  var out = [], px = 0, py = 0;
  ring.forEach(function (p, i) {
    var x = Math.round(p[0] * 100), y = Math.round(p[1] * 100);
    if (i > 0 && x === px && y === py) return;
    out.push(x - px, y - py);
    px = x; py = y;
  });
  return out;
}
// Ringe der krydser datolinjen (fx det østligste Rusland) gøres sammenhængende: længder op til 360.
function unwrap(ring) {
  var jump = ring.some(function (p, i) { return i > 0 && Math.abs(p[0] - ring[i - 1][0]) > 180; });
  return jump ? ring.map(function (p) { return p[0] < 0 ? [p[0] + 360, p[1]] : p; }) : ring;
}
function encodePolys(polys, tol, noUnwrap) {
  // Kun ydre ring (huller som søer er ligegyldige her), forenklet.
  return polys.map(function (p) { return encodeRing(simplify(noUnwrap ? p[0] : unwrap(p[0]), tol)); })
    .filter(function (r) { return r.length >= 6; });
}

var shapeOut = {};
want.forEach(function (c) { if (shapes[c.cca2]) shapeOut[c.cca2] = encodePolys(shapes[c.cca2], 0.025); });
var otherOut = encodePolys(other, 0.05, true); // Antarktis skal gå hele vejen rundt

fs.writeFileSync(path.join(OUT, 'js/data/shapes.js'),
  '// Landenes omrids. Genereret af tools/build-data.js fra Natural Earth (public domain) via world-atlas.\n' +
  '// Format: kode -> liste af ringe; hver ring er [x0,y0,dx,dy,...] i 1/100 grad (x = længde, y = bredde).\n' +
  'window.SHAPES = ' + JSON.stringify(shapeOut) + ';\n' +
  'window.OTHER_LAND = ' + JSON.stringify(otherOut) + ';\n');

// ---------- Landedata ----------
var daRegion = new Intl.DisplayNames(['da'], { type: 'region' });
var daLang = new Intl.DisplayNames(['da'], { type: 'language' });
var daCur = new Intl.DisplayNames(['da'], { type: 'currency' });
var NAME_FIX = {
  PS: 'Palæstina', MM: 'Myanmar', CI: 'Elfenbenskysten', CD: 'DR Congo', CG: 'Republikken Congo',
  FM: 'Mikronesien', VA: 'Vatikanstaten', TL: 'Østtimor', SZ: 'Eswatini', MK: 'Nordmakedonien',
  CZ: 'Tjekkiet', GB: 'Storbritannien', US: 'USA', KR: 'Sydkorea', KP: 'Nordkorea'
};
function daName(cc) { return NAME_FIX[cc] || daRegion.of(cc); }
function continent(c) {
  if (c.region === 'Americas') return c.subregion === 'South America' ? 'Sydamerika' : 'Nordamerika';
  return { Europe: 'Europa', Africa: 'Afrika', Asia: 'Asien', Oceania: 'Oceanien' }[c.region] || c.region;
}
function lang(code) {
  try { var n = daLang.of(code); return n && n !== code ? n : null; } catch (e) { return null; }
}

var FACTS = {};
global.FACT = function (k, v) { FACTS[k] = v; };
// Fakta fra den nuværende countries.js bevares (så rettelser der ikke går tabt) ...
var oldFile = path.join(OUT, 'js/data/countries.js');
if (fs.existsSync(oldFile)) {
  var sandbox = {};
  new Function('window', fs.readFileSync(oldFile, 'utf8'))(sandbox);
  (sandbox.COUNTRIES || []).forEach(function (o) {
    if (!o.clues || !o.clues.length) return;
    FACTS[o.c] = { capital: o.cap, capLL: o.capLL, pop: o.pop, tier: o.tier, clues: o.clues, facts: o.facts, hello: o.hello, food: o.food, animal: o.animal };
  });
}
// ... men fakta-filer i FACTS_DIR vinder.
if (process.argv[3] && fs.existsSync(FACTS_DIR)) {
  fs.readdirSync(FACTS_DIR).filter(function (f) { return /\.js$/.test(f); }).forEach(function (f) {
    require(path.join(FACTS_DIR, f));
  });
}

var list = want.map(function (c) {
  var f = FACTS[c.cca2] || {};
  if (!FACTS[c.cca2]) console.warn('Mangler fakta for', c.cca2);
  return {
    c: c.cca2,
    n: daName(c.cca2),
    cont: c.cca2 === 'GL' ? 'Nordamerika' : continent(c),
    cap: f.capital || (c.capital || [])[0] || '',
    capLL: f.capLL || null,
    pop: f.pop || 0,
    area: c.area,
    langs: Object.keys(c.languages || {}).map(lang).filter(Boolean),
    cur: Object.keys(c.currencies || {}).map(function (k) { try { return daCur.of(k); } catch (e) { return k; } }),
    nb: (c.borders || []).map(function (b) { return byCca3[b]; })
      .filter(function (b) { return b && want.indexOf(b) >= 0; })
      .map(function (b) { return daName(b.cca2); }),
    ll: c.latlng,
    land: !!c.landlocked,
    tier: f.tier || 2,
    clues: f.clues || [],
    facts: f.facts || [],
    hello: f.hello || '',
    food: f.food || '',
    animal: f.animal || ''
  };
}).sort(function (a, b) { return a.n.localeCompare(b.n, 'da'); });

fs.writeFileSync(path.join(OUT, 'js/data/countries.js'),
  '// Alle lande i spillet. Genereret af tools/build-data.js (grunddata fra world-countries, ODbL;\n' +
  '// danske navne fra Unicode CLDR; ledetråde og fakta skrevet til spillet). Ret gerne direkte her.\n' +
  'window.COUNTRIES = [\n' + list.map(function (x) { return '  ' + JSON.stringify(x); }).join(',\n') + '\n];\n');

// ---------- Flag ----------
var flagDir = path.join(OUT, 'flags');
if (!fs.existsSync(flagDir)) fs.mkdirSync(flagDir);
want.forEach(function (c) {
  var cc = c.cca2.toLowerCase();
  fs.copyFileSync(path.join(PKGS, 'node_modules/flag-icons/flags/4x3', cc + '.svg'), path.join(flagDir, cc + '.svg'));
});

console.log('Lande:', list.length, ' fakta:', Object.keys(FACTS).length,
  ' shapes.js:', Math.round(fs.statSync(path.join(OUT, 'js/data/shapes.js')).size / 1024) + ' KB');
