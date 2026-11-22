// Gitteret: felter, skinnestykker og hvordan barnet bygger spor.
// Retninger: 0 = nord, 1 = øst, 2 = syd, 3 = vest.
var DX = [0, 1, 0, -1];
var DY = [-1, 0, 1, 0];
function opp(d) { return (d + 2) % 4; }

// Passager- og stationsfarver.
var PCOLORS = [
  { name: 'rød', fill: '#e63946', dark: '#a4161a' },
  { name: 'blå', fill: '#3a86ff', dark: '#1d4ed8' },
  { name: 'gul', fill: '#ffc300', dark: '#b88a00' },
  { name: 'lilla', fill: '#9b5de5', dark: '#6a32b8' }
];

// De seks almindelige skinner (lige og sving) – rækkefølgen man drejer igennem.
var SHAPES = [[1, 3], [0, 2], [0, 1], [1, 2], [2, 3], [3, 0]];
var SOL_CHARS = { '-': [1, 3], '|': [0, 2], a: [0, 1], b: [1, 2], c: [2, 3], d: [3, 0] };

function isStraight(a, b) { return a === opp(b); }
function track(a, b, extra) {
  var p = { kind: 'track', dirs: [a, b] };
  if (extra) for (var k in extra) p[k] = extra[k];
  return p;
}
function clonePiece(p) { return p ? JSON.parse(JSON.stringify(p)) : null; }

function pieceHas(p, d) {
  if (!p) return false;
  if (p.kind === 'track') return p.dirs[0] === d || p.dirs[1] === d;
  if (p.kind === 'cross') return true;
  if (p.kind === 'switch') return p.trunk === d || p.br[0] === d || p.br[1] === d;
  return false;
}

// Hvor kører toget ud, når det kommer ind fra siden `from`? -1 = det kan ikke.
function pieceExit(p, from) {
  if (!pieceHas(p, from)) return -1;
  if (p.kind === 'track') return p.dirs[0] === from ? p.dirs[1] : p.dirs[0];
  if (p.kind === 'cross') return opp(from);
  if (from === p.trunk) return p.br[p.active];
  return p.trunk; // ind fra en af grenene: sporskiftet fører altid tilbage til stammen
}

// Stykkets skinne-par til tegning: [[a, b, alpha], ...]
function piecePairs(p) {
  if (p.kind === 'track') return [[p.dirs[0], p.dirs[1], 1]];
  if (p.kind === 'cross') return [[0, 2, 1], [1, 3, 1]];
  return [[p.trunk, p.br[1 - p.active], 0.4], [p.trunk, p.br[p.active], 1]];
}

function newCell(t) { return { t: t || 'grass', piece: null, station: -1, pass: -1, cow: false, depot: -1 }; }

function makeBoard(w, h) {
  var b = { w: w, h: h, cells: [], depots: [], allowCross: false, allowSwitch: false, msg: null };
  for (var i = 0; i < w * h; i++) b.cells.push(newCell());
  return b;
}

function cellAt(b, x, y) {
  return x >= 0 && y >= 0 && x < b.w && y < b.h ? b.cells[y * b.w + x] : null;
}

function addDepot(b, x, y, dir) {
  var c = cellAt(b, x, y);
  b.depots.push({ x: x, y: y, dir: dir });
  c.t = 'grass';
  c.depot = b.depots.length - 1;
  c.piece = track(opp(dir), dir, { fixed: true });
}

function reindexDepots(b) {
  b.cells.forEach(function (c) { c.depot = -1; });
  b.depots.forEach(function (d, i) { cellAt(b, d.x, d.y).depot = i; });
}

var TERRAIN = { '.': 'grass', T: 'tree', K: 'rock', H: 'house', '~': 'water' };

function boardFromLevel(lv) {
  var h = lv.map.length, w = lv.map[0].length;
  var b = makeBoard(w, h);
  b.allowCross = !!lv.cross;
  b.allowSwitch = !!lv.switches;
  var depotChars = [];
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var ch = lv.map[y][x];
      var c = cellAt(b, x, y);
      if (TERRAIN[ch]) c.t = TERRAIN[ch];
      else if ('rbyp'.indexOf(ch) >= 0) c.pass = 'rbyp'.indexOf(ch);
      else if ('1234'.indexOf(ch) >= 0) c.station = '1234'.indexOf(ch);
      else if (ch === 'C') c.cow = true;
      else if (ch === 'A' || ch === 'B') depotChars.push({ ch: ch, x: x, y: y });
    }
  }
  depotChars.sort(function (a, z) { return a.ch < z.ch ? -1 : 1; });
  depotChars.forEach(function (d) { addDepot(b, d.x, d.y, lv.dirs[d.ch]); });
  (lv.fixed || []).forEach(function (f) {
    cellAt(b, f.x, f.y).piece = { kind: 'switch', trunk: f.trunk, br: f.br.slice(), active: f.active || 0, fixed: true };
  });
  return b;
}

// Løsningen fra banedata som en liste af {x, y, piece}.
function solutionPieces(lv) {
  var out = [];
  var sw = {};
  (lv.solSwitches || []).forEach(function (s) { sw[s.x + ',' + s.y] = s; });
  lv.sol.forEach(function (row, y) {
    for (var x = 0; x < row.length; x++) {
      var ch = row[x];
      var p = null;
      if (SOL_CHARS[ch]) p = track(SOL_CHARS[ch][0], SOL_CHARS[ch][1]);
      else if (ch === '+') p = { kind: 'cross' };
      else if (ch === 'S') { var s = sw[x + ',' + y]; p = { kind: 'switch', trunk: s.trunk, br: s.br.slice(), active: s.active || 0 }; }
      if (p) out.push({ x: x, y: y, piece: p });
    }
  });
  return out;
}

function buildable(c) { return !!c && (c.t === 'grass' || c.t === 'water'); }

function blockedMsg(c) {
  if (!c) return null;
  if (c.t === 'tree') return 'Her står et træ.';
  if (c.t === 'rock') return 'På en klippe kan man ikke bygge.';
  if (c.t === 'house') return 'Her bor der nogen!';
  return null;
}

function connects(b, x, y, d) {
  var n = cellAt(b, x + DX[d], y + DY[d]);
  return !!n && pieceHas(n.piece, opp(d));
}

// Fra hvilken side kommer et tog fra et depot først ind i feltet (x, y)? -1 = ingen.
function traceEntry(b, tx, ty) {
  for (var i = 0; i < b.depots.length; i++) {
    var dp = b.depots[i];
    var cx = dp.x, cy = dp.y, o = dp.dir;
    for (var n = 0; n < b.w * b.h * 4; n++) {
      var nx = cx + DX[o], ny = cy + DY[o];
      if (nx === tx && ny === ty) return opp(o);
      var c = cellAt(b, nx, ny);
      if (!c || !pieceHas(c.piece, opp(o))) break;
      o = pieceExit(c.piece, opp(o));
      cx = nx; cy = ny;
    }
  }
  return -1;
}

function makeSwitch(b, x, y, dirs, fresh, fallback) {
  var e = traceEntry(b, x, y);
  var trunk = dirs.indexOf(e) >= 0 ? e : fallback;
  var br = dirs.filter(function (k) { return k !== trunk; });
  var active = br.indexOf(fresh);
  return { kind: 'switch', trunk: trunk, br: br, active: active < 0 ? 0 : active };
}

// Et felt hvor kun én side er kendt (starten eller slutningen af et træk).
function applyOne(b, x, y, snap, d) {
  var c = cellAt(b, x, y);
  var water = c.t === 'water';
  if (snap && snap.fixed) { c.piece = clonePiece(snap); return; }
  if (!snap) {
    var other = -1;
    if (!water) {
      var tries = [opp(d), (d + 1) % 4, (d + 3) % 4];
      for (var i = 0; i < 3; i++) if (connects(b, x, y, tries[i])) { other = tries[i]; break; }
    }
    c.piece = other < 0 ? track(d, opp(d), { soft: true }) : track(d, other);
    return;
  }
  if (pieceHas(snap, d)) { c.piece = clonePiece(snap); return; }
  if (snap.kind === 'track') {
    var conn = snap.dirs.filter(function (k) { return connects(b, x, y, k); });
    if (b.allowSwitch && !water && conn.length === 2) {
      c.piece = makeSwitch(b, x, y, [snap.dirs[0], snap.dirs[1], d], d, snap.dirs[0]);
      return;
    }
    if (water) { c.piece = track(d, opp(d)); return; }
    var keep = conn.length ? conn[0] : (snap.soft ? -1 : snap.dirs[1]);
    c.piece = keep >= 0 && keep !== d ? track(keep, d) : track(d, opp(d), { soft: true });
    return;
  }
  c.piece = track(d, opp(d), { soft: true });
}

// Et felt man er trukket igennem: ind fra e, ud mod o.
function applyPair(b, x, y, snap, e, o) {
  if (e === o) return;
  var c = cellAt(b, x, y);
  var water = c.t === 'water';
  if (snap && snap.fixed) {
    var f = clonePiece(snap);
    if (f.kind === 'switch') {
      if (e === f.trunk && f.br.indexOf(o) >= 0) f.active = f.br.indexOf(o);
      else if (o === f.trunk && f.br.indexOf(e) >= 0) f.active = f.br.indexOf(e);
    }
    c.piece = f;
    return;
  }
  if (water && !isStraight(e, o)) {
    c.piece = clonePiece(snap);
    b.msg = { text: 'Over vandet kan broen kun gå lige.', x: x, y: y };
    return;
  }
  if (!snap || snap.soft) { c.piece = track(e, o); return; }
  if (snap.kind === 'track') {
    var a = snap.dirs[0], z = snap.dirs[1];
    if ((a === e && z === o) || (a === o && z === e)) { c.piece = clonePiece(snap); return; }
    if (b.allowCross && !water && isStraight(a, z) && isStraight(e, o)) { c.piece = { kind: 'cross' }; return; }
    var set = [a, z, e, o].filter(function (k, i, arr) { return arr.indexOf(k) === i; });
    if (b.allowSwitch && !water && set.length === 3) {
      var shared = (a === e || a === o) ? a : z;
      var fresh = e === shared ? o : e;
      c.piece = makeSwitch(b, x, y, set, fresh, shared);
      return;
    }
    c.piece = track(e, o);
    return;
  }
  if (snap.kind === 'cross') {
    c.piece = isStraight(e, o) ? clonePiece(snap) : track(e, o);
    return;
  }
  var s = clonePiece(snap);
  if (e === s.trunk && s.br.indexOf(o) >= 0) { s.active = s.br.indexOf(o); c.piece = s; return; }
  if (o === s.trunk && s.br.indexOf(e) >= 0) { s.active = s.br.indexOf(e); c.piece = s; return; }
  c.piece = track(e, o);
}

// ---- Træk med musen/fingeren ----
function strokeBegin(b, x, y) {
  var c = cellAt(b, x, y);
  if (!buildable(c)) { if (c) b.msg = { text: blockedMsg(c), x: x, y: y }; return null; }
  return { cells: [{ x: x, y: y, snap: clonePiece(c.piece), entry: -1 }], moved: false };
}

function dirBetween(ax, ay, bx, by) {
  for (var d = 0; d < 4; d++) if (ax + DX[d] === bx && ay + DY[d] === by) return d;
  return -1;
}

// Tag ét skridt til nabofeltet (nx, ny). Returnerer true hvis sporet blev forlænget.
function strokeStep(b, st, nx, ny) {
  var L = st.cells[st.cells.length - 1];
  var d = dirBetween(L.x, L.y, nx, ny);
  if (d < 0) return false;
  var prev = st.cells[st.cells.length - 2];
  if (prev && prev.x === nx && prev.y === ny) {
    // Tilbage igen: fortryd det sidste felt.
    cellAt(b, L.x, L.y).piece = clonePiece(L.snap);
    st.cells.pop();
    var pc = cellAt(b, prev.x, prev.y);
    pc.piece = clonePiece(prev.snap);
    if (prev.entry >= 0) applyOne(b, prev.x, prev.y, prev.snap, prev.entry);
    return true;
  }
  var nc = cellAt(b, nx, ny);
  if (!buildable(nc)) { if (nc) b.msg = { text: blockedMsg(nc), x: nx, y: ny }; return false; }
  st.moved = true;
  var lc = cellAt(b, L.x, L.y);
  lc.piece = clonePiece(L.snap);
  if (L.entry >= 0) applyPair(b, L.x, L.y, L.snap, L.entry, d);
  else applyOne(b, L.x, L.y, L.snap, d);
  var N = { x: nx, y: ny, snap: clonePiece(nc.piece), entry: opp(d) };
  st.cells.push(N);
  applyOne(b, nx, ny, N.snap, N.entry);
  return true;
}

// Træk hen mod (tx, ty) felt for felt. Returnerer antal skridt.
function strokeTo(b, st, tx, ty) {
  var n = 0;
  for (var guard = 0; guard < 40; guard++) {
    var L = st.cells[st.cells.length - 1];
    if (L.x === tx && L.y === ty) break;
    var ddx = tx - L.x, ddy = ty - L.y;
    var nx = L.x, ny = L.y;
    if (Math.abs(ddx) >= Math.abs(ddy)) nx += Math.sign(ddx); else ny += Math.sign(ddy);
    if (!strokeStep(b, st, nx, ny)) break;
    n++;
  }
  return n;
}

// Et enkelt tryk: læg en skinne, drej den, eller skift sporskiftet.
// Returnerer 'place', 'rotate', 'switch' eller null.
function tapAt(b, x, y) {
  var c = cellAt(b, x, y);
  if (!buildable(c)) { if (c) b.msg = { text: blockedMsg(c), x: x, y: y }; return null; }
  var p = c.piece;
  if (p && p.kind === 'switch') { p.active = 1 - p.active; return 'switch'; }
  if (p && p.fixed) return null;
  var water = c.t === 'water';
  if (p && p.kind === 'track') {
    var idx = -1;
    for (var i = 0; i < SHAPES.length; i++) {
      var s = SHAPES[i];
      if ((s[0] === p.dirs[0] && s[1] === p.dirs[1]) || (s[0] === p.dirs[1] && s[1] === p.dirs[0])) idx = i;
    }
    var n = water ? 2 : SHAPES.length;
    var next = SHAPES[(idx + 1) % n];
    c.piece = track(next[0], next[1]);
    return 'rotate';
  }
  if (p && p.kind === 'cross') { c.piece = track(1, 3); return 'rotate'; }
  // Tomt felt: gæt en skinne ud fra naboerne.
  var conn = [];
  for (var d = 0; d < 4; d++) if (connects(b, x, y, d)) conn.push(d);
  var pair = [1, 3];
  if (water) {
    if (conn.length && (conn[0] === 0 || conn[0] === 2)) pair = [0, 2];
  } else if (conn.length >= 2) {
    var straight = null;
    for (var i2 = 0; i2 < conn.length; i2++) for (var j = i2 + 1; j < conn.length; j++) if (isStraight(conn[i2], conn[j])) straight = [conn[i2], conn[j]];
    pair = straight || [conn[0], conn[1]];
  } else if (conn.length === 1) pair = [conn[0], opp(conn[0])];
  c.piece = track(pair[0], pair[1]);
  return 'place';
}

function eraseAt(b, x, y) {
  var c = cellAt(b, x, y);
  if (c && c.piece && !c.piece.fixed) { c.piece = null; return true; }
  return false;
}

function countPieces(b) {
  var n = 0;
  b.cells.forEach(function (c) { if (c.piece && !c.piece.fixed) n++; });
  return n;
}

function clearTrack(b) { b.cells.forEach(function (c) { if (c.piece && !c.piece.fixed) c.piece = null; }); }

function copyTrack(b) { return b.cells.map(function (c) { return c.piece && !c.piece.fixed ? clonePiece(c.piece) : null; }); }
function pasteTrack(b, list) { list.forEach(function (p, i) { if (p && !(b.cells[i].piece && b.cells[i].piece.fixed)) b.cells[i].piece = clonePiece(p); }); }
