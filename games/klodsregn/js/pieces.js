// Klodserne: hver form er en lille kvadratisk tegning, der kan drejes.
// 'X' = klods, '.' = tom. Der er både små 3-klodser og 4-klodser (lettere for små hænder).
var SHAPES = [
  { name: 'stang',  color: '#4cc9f0', rows: ['....', 'XXXX', '....', '....'] },
  { name: 'kasse',  color: '#ffd166', rows: ['XX', 'XX'], noSpin: true },
  { name: 'top',    color: '#b5179e', rows: ['.X.', 'XXX', '...'] },
  { name: 'slange', color: '#06d6a0', rows: ['.XX', 'XX.', '...'] },
  { name: 'orm',    color: '#ef476f', rows: ['XX.', '.XX', '...'] },
  { name: 'støvle', color: '#ff9f1c', rows: ['..X', 'XXX', '...'] },
  { name: 'krog',   color: '#4361ee', rows: ['X..', 'XXX', '...'] },
  { name: 'pind',   color: '#90e0ef', rows: ['...', 'XXX', '...'] },
  { name: 'hjørne', color: '#a7c957', rows: ['X.', 'XX'] }
];

// Stjernebomben: én enkelt kugle der sprænger klodserne omkring sig væk.
var BOMB = { name: 'bombe', color: '#ffe066', rows: ['X'], noSpin: true, bomb: true };

(function () {
  SHAPES.concat([BOMB]).forEach(function (s) {
    s.m = s.rows.map(function (r) { return r.split('').map(function (ch) { return ch === 'X' ? 1 : 0; }); });
  });
})();

// Drej en kvadratisk matrix: dir = 1 med uret, -1 mod uret.
function rotateMatrix(m, dir) {
  var n = m.length, out = [];
  for (var y = 0; y < n; y++) {
    out.push([]);
    for (var x = 0; x < n; x++) out[y].push(dir > 0 ? m[n - 1 - x][y] : m[x][n - 1 - y]);
  }
  return out;
}

function topRow(m) {
  for (var y = 0; y < m.length; y++) if (m[y].indexOf(1) >= 0) return y;
  return 0;
}

// Den mindste firkant der dækker klodserne – bruges til at centrere "Næste"-billedet.
function bounds(m) {
  var x0 = 99, y0 = 99, x1 = -1, y1 = -1;
  for (var y = 0; y < m.length; y++) for (var x = 0; x < m.length; x++) if (m[y][x]) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function shuffle(a) {
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
