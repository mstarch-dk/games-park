// Selve spillet: skærme, knapper, byggeri og game loop.
var W = 1080, H = 680;
var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');
var AREA = { x: 14, y: 72, w: 800, h: 594 };
var PX = 830, PW = 236;
var TICK = 0.55;
var FREE_W = 12, FREE_H = 8;

var Store = {
  get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ingen lagring */ } }
};

var Game = {
  state: 'title', time: 0, stateTime: 0,
  mode: 'level', li: 0,
  board: null, L: null, ghost: null, ghostPath: [], showGhost: false,
  run: null, preview: null,
  tool: 'rail', stroke: null, erasing: false, painting: false, lastPaint: null,
  hover: null, hoverBtn: null, cursor: { x: 0, y: 0 }, cursorOn: false, kbStroke: null,
  msg: null, fast: false, paused: false,
  buttons: [], menuSel: 0, levelSel: 0,
  progress: { stars: [], unlocked: 1, intro: false },
  tracks: {}, smoke: [], floaters: [], pulse: {}, said: {},
  endAt: 0, result: null,

  init: function () {
    try {
      var p = JSON.parse(Store.get('togbanen-progress'));
      if (p && typeof p === 'object') {
        this.progress.stars = Array.isArray(p.stars) ? p.stars : [];
        this.progress.unlocked = Math.max(1, Math.min(LEVELS.length, p.unlocked | 0));
        this.progress.intro = !!p.intro;
      }
    } catch (e) { /* ny spiller */ }
    Sound.muted = Store.get('togbanen-muted') === '1';
    this.makeDemo();
    this.makeHowto();
    Input.init(canvas);
    var self = this, last = performance.now();
    var loop = function (now) {
      var dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      self.update(dt);
      self.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  saveProgress: function () { Store.set('togbanen-progress', JSON.stringify(this.progress)); },

  setState: function (s) { this.state = s; this.stateTime = 0; this.hoverBtn = null; },

  // ---------- Titel-demo og "sådan gør man" ----------
  makeDemo: function () {
    var b = makeBoard(10, 3);
    var put = function (x, y, ch) { var d = SOL_CHARS[ch]; cellAt(b, x, y).piece = track(d[0], d[1]); };
    put(0, 0, 'b'); for (var x = 1; x < 9; x++) { put(x, 0, '-'); put(x, 2, '-'); }
    put(9, 0, 'c'); put(9, 1, '|'); put(9, 2, 'd'); put(0, 2, 'a'); put(0, 1, '|');
    addDepot(b, 4, 0, 1);
    cellAt(b, 2, 1).t = 'house'; cellAt(b, 4, 1).t = 'tree'; cellAt(b, 5, 1).t = 'tree';
    cellAt(b, 7, 1).t = 'house'; cellAt(b, 6, 1).t = 'water';
    this.demo = { board: b, run: createRun(b, { wagons: 3, free: true }) };
  },

  makeHowto: function () {
    var a = makeBoard(5, 1);
    addDepot(a, 0, 0, 1);
    cellAt(a, 4, 0).station = 0;
    cellAt(a, 2, 0).pass = 0;
    var b = makeBoard(3, 1);
    var c = makeBoard(5, 1);
    for (var i = 1; i < 5; i++) cellAt(c, i, 0).piece = track(1, 3);
    addDepot(c, 0, 0, 1);
    var d = makeBoard(4, 2);
    var put = function (x, y, ch) { var s = SOL_CHARS[ch]; cellAt(d, x, y).piece = track(s[0], s[1]); };
    put(0, 0, 'b'); put(2, 0, '-'); put(3, 0, 'c'); put(3, 1, 'd'); put(2, 1, '-'); put(1, 1, '-'); put(0, 1, 'a');
    addDepot(d, 1, 0, 1);
    cellAt(d, 2, 1).station = 2;
    this.howto = { a: a, b: b, c: c, d: d, run: createRun(d, { wagons: 1, free: true }) };
  },

  // ---------- Baner ----------
  startLevel: function (i) {
    this.mode = 'level';
    this.li = i;
    var lv = LEVELS[i];
    this.board = boardFromLevel(lv);
    if (this.tracks[i]) pasteTrack(this.board, this.tracks[i]);
    this.ghost = solutionPieces(lv);
    this.ghostPath = this.tracePath(lv);
    this.showGhost = i < 2 && countPieces(this.board) === 0;
    this.L = Draw.layout(this.board, AREA);
    this.cursor = { x: this.board.depots[0].x, y: this.board.depots[0].y };
    this.tool = 'rail';
    this.run = null;
    this.msg = null;
    this.said = {};
    this.refreshPreview();
    if (!this.progress.intro) { this.afterHowto = 'build'; this.setState('howto'); return; }
    this.setState('build');
    this.say(lv.tip, null, null, 6);
  },

  tracePath: function (lv) {
    var b = boardFromLevel(lv);
    solutionPieces(lv).forEach(function (s) { cellAt(b, s.x, s.y).piece = s.piece; });
    var dp = b.depots[0], out = [];
    var cx = dp.x, cy = dp.y, o = dp.dir;
    for (var n = 0; n < 200; n++) {
      var nx = cx + DX[o], ny = cy + DY[o];
      var c = cellAt(b, nx, ny);
      if (!c || !pieceHas(c.piece, opp(o))) break;
      out.push({ x: nx, y: ny });
      o = pieceExit(c.piece, opp(o));
      cx = nx; cy = ny;
      if (out.length > 60) break;
    }
    return out;
  },

  startFree: function () {
    this.mode = 'free';
    this.board = this.loadFree() || this.defaultFree();
    this.board.allowCross = true;
    this.board.allowSwitch = true;
    this.ghost = null; this.showGhost = false;
    this.L = Draw.layout(this.board, AREA);
    this.tool = 'rail';
    this.run = null;
    this.said = {};
    this.cursor = { x: 1, y: 1 };
    this.refreshPreview();
    this.setState('build');
    this.say('Byg din helt egen bane! Vælg noget i kassen til højre og tryk på græsset.', null, null, 6);
  },

  defaultFree: function () {
    var b = makeBoard(FREE_W, FREE_H);
    addDepot(b, 1, 1, 1);
    [[5, 0], [6, 0], [10, 6], [11, 6], [0, 6]].forEach(function (p) { cellAt(b, p[0], p[1]).t = 'tree'; });
    [[8, 3], [8, 4]].forEach(function (p) { cellAt(b, p[0], p[1]).t = 'water'; });
    cellAt(b, 3, 5).t = 'house';
    cellAt(b, 5, 1).pass = 0;
    cellAt(b, 10, 2).station = 0;
    return b;
  },

  saveFree: function () {
    if (this.mode !== 'free') return;
    var b = this.board;
    var data = { w: b.w, h: b.h, depots: b.depots, cells: b.cells.map(function (c) { return [c.t, c.piece, c.station, c.pass, c.cow ? 1 : 0]; }) };
    Store.set('togbanen-fri', JSON.stringify(data));
  },

  loadFree: function () {
    try {
      var d = JSON.parse(Store.get('togbanen-fri'));
      if (!d || d.w !== FREE_W || d.h !== FREE_H || d.cells.length !== FREE_W * FREE_H) return null;
      var b = makeBoard(d.w, d.h);
      d.cells.forEach(function (c, i) {
        var n = b.cells[i];
        n.t = c[0]; n.piece = c[1]; n.station = c[2]; n.pass = c[3]; n.cow = !!c[4];
      });
      b.depots = d.depots.slice(0, 2);
      reindexDepots(b);
      return b;
    } catch (e) { return null; }
  },

  refreshPreview: function () {
    this.preview = createRun(this.board, { wagons: this.wagons(), free: this.mode === 'free' });
  },

  wagons: function () { return this.mode === 'free' ? 3 : LEVELS[this.li].wagons; },

  leaveBuild: function () {
    if (this.mode === 'level' && this.board) this.tracks[this.li] = copyTrack(this.board);
    if (this.mode === 'free') this.saveFree();
  },

  // ---------- Kør ----------
  startRun: function () {
    if (!this.board.depots.length) { this.say('Sæt et tog på banen først! Vælg 🚂 Tog i kassen.', null, null, 4); Sound.nope(); return; }
    this.stroke = null; this.kbStroke = null;
    this.leaveBuild();
    this.run = createRun(this.board, { wagons: this.wagons(), free: this.mode === 'free' });
    this.run.p = 0.5;
    this.paused = false;
    this.smoke = []; this.floaters = []; this.pulse = {}; this.said = {};
    this.msg = null;
    this.result = null;
    this.endAt = 0;
    this.setState('run');
    Sound.whistle();
  },

  stopRun: function () {
    this.run = null;
    this.paused = false;
    this.msg = null;
    this.refreshPreview();
    this.setState('build');
  },

  dyt: function () {
    Sound.horn();
    if (this.state !== 'run' || !this.run) return;
    var n = dyt(this.run, this.board);
    if (n) { this.msg = null; setTimeout(function () { Sound.moo(); }, 350); }
  },

  updateRun: function (dt) {
    var r = this.run;
    if (this.paused) return;
    var speed = this.fast ? 2.2 : 1;
    if (r.won || r.over) {
      r.p = Math.min(1, r.p + dt / TICK * speed);
      if (this.endAt && this.time > this.endAt) {
        this.endAt = 0;
        if (r.won) this.finish();
        else this.result = { fail: true };
      }
      return;
    }
    var before = r.p;
    r.p += dt / TICK * speed;
    var moving = r.trains.some(function (t) { return !t.halted && !t.waiting; });
    if (before < 0.5 && r.p >= 0.5 && moving) Sound.chuff();
    if (r.p >= 1) {
      var ev = stepRun(r, this.board);
      r.p = 0;
      if (r.trains.some(function (t) { return t.moved; })) Sound.chuff();
      this.handleEvents(ev);
    }
    // røg fra skorstenen
    var self = this;
    r.trains.forEach(function (t) {
      if (!t.chimney || t.halted) return;
      t.smokeT = (t.smokeT || 0) - dt;
      if (t.smokeT <= 0) {
        t.smokeT = t.waiting ? 0.35 : 0.09;
        self.smoke.push({ x: t.chimney.x, y: t.chimney.y, r: self.L.cs * 0.08, life: 1.3, max: 1.3, vx: (Math.random() - 0.5) * 12, vy: -8 - Math.random() * 8 });
      }
    });
  },

  handleEvents: function (ev) {
    var self = this, L = this.L;
    var cx = function (x) { return L.ox + x * L.cs + L.cs / 2; };
    var cy = function (y) { return L.oy + y * L.cs + L.cs / 2; };
    ev.forEach(function (e) {
      if (e.type === 'pickup') {
        Sound.pickup();
        self.floaters.push({ x: cx(e.x), y: cy(e.y), text: 'Op! 👋', life: 1.2 });
      } else if (e.type === 'deliver') {
        Sound.deliver();
        self.pulse[e.x + ',' + e.y] = self.time + 0.6;
        self.floaters.push({ x: cx(e.x), y: cy(e.y), text: 'Fremme! 🎉', life: 1.5 });
      } else if (e.type === 'full') {
        var k = 'full' + e.x + ',' + e.y;
        if (!self.said[k]) { self.said[k] = 1; Sound.full(); self.say('Toget er fuldt! Kom tilbage efter mig.', e.x, e.y, 3); }
      } else if (e.type === 'cow') {
        Sound.moo();
        self.say('Muuh! Tryk på DYT 📯, så går koen væk.', e.x, e.y, 30);
      } else if (e.type === 'halt') {
        var h = e.train.hist[0];
        if (e.why === 'bump') { Sound.bump(); self.say('Bump! Togene stødte ind i hinanden. Byg sporene, så de ikke mødes.', h.cx, h.cy, 30); }
        else if (e.why === 'wrong') { Sound.stop(); self.say('Hov! Skinnerne passer ikke sammen her.', h.cx + DX[h.o], h.cy + DY[h.o], 30); }
        else { Sound.stop(); self.say('Hov! Her slutter sporet.', h.cx, h.cy, 30); }
      } else if (e.type === 'loop') {
        Sound.stop();
        var h2 = self.run.trains[0].hist[0];
        self.say('Toget kører rundt og rundt, men nogen venter stadig. Prøv et andet spor!', h2.cx, h2.cy, 30);
      } else if (e.type === 'win') {
        self.msg = null;
        self.endAt = self.time + 1.1;
        setTimeout(function () { Sound.win(); }, 300);
      } else if (e.type === 'over') {
        self.endAt = self.time + 1.2;
      }
      if ((e.type === 'loop' || e.type === 'over') && !self.endAt) self.endAt = self.time + 1.2;
    });
  },

  finish: function () {
    var used = countPieces(this.board);
    if (this.mode === 'free') { this.result = { freeWin: true }; return; }
    var par = LEVELS[this.li].par;
    var stars = used <= par ? 3 : used <= par + 3 ? 2 : 1;
    var old = this.progress.stars[this.li] || 0;
    this.progress.stars[this.li] = Math.max(old, stars);
    this.progress.unlocked = Math.max(this.progress.unlocked, Math.min(LEVELS.length, this.li + 2));
    this.saveProgress();
    this.result = { stars: stars, used: used, par: par, best: stars > old && old > 0 };
    this.setState('win');
    for (var i = 0; i < stars; i++) (function (k) { setTimeout(function () { Sound.star(k); }, 500 + k * 350); })(i);
  },

  say: function (text, x, y, dur) {
    if (!text) return;
    var px = AREA.x + AREA.w / 2, py = Math.max(AREA.y + 90, this.L ? this.L.oy - 4 : 0), anchored = false;
    if (x !== null && x !== undefined && this.L) {
      px = this.L.ox + x * this.L.cs + this.L.cs / 2;
      py = this.L.oy + y * this.L.cs + this.L.cs * 0.2;
      anchored = true;
    }
    this.msg = { text: text, x: px, y: py, until: this.time + (dur || 3), anchored: anchored };
  },

  checkBoardMsg: function () {
    var b = this.board;
    if (b && b.msg) {
      if (b.msg.text) { this.say(b.msg.text, b.msg.x, b.msg.y, 2.5); Sound.nope(); }
      b.msg = null;
    }
  },

  edited: function () {
    this.refreshPreview();
    this.checkBoardMsg();
    if (this.mode === 'level' && this.li < 2 && countPieces(this.board) > 0 && this.showGhost === true) this.showGhost = 'soft';
  },

  // ---------- Fri leg: læg ting ----------
  placeItem: function (x, y, tool, drag) {
    var b = this.board, c = cellAt(b, x, y);
    if (!c) return false;
    var removeDepot = function () {
      if (c.depot >= 0) { b.depots.splice(c.depot, 1); c.piece = null; reindexDepots(b); }
    };
    var plain = function () { c.station = -1; c.pass = -1; c.cow = false; };
    if (tool === 'tree' || tool === 'rock' || tool === 'house') {
      if (c.t === tool) return false;
      removeDepot(); plain(); c.piece = null; c.t = tool; return true;
    }
    if (tool === 'water') {
      if (c.t === 'water') return false;
      removeDepot(); plain();
      if (c.piece && !(c.piece.kind === 'track' && isStraight(c.piece.dirs[0], c.piece.dirs[1]))) c.piece = null;
      c.t = 'water'; return true;
    }
    if (drag) return false;
    if (tool === 'cow') {
      if (c.depot >= 0) return false;
      if (c.t !== 'grass') c.t = 'grass';
      c.cow = !c.cow; c.station = -1; c.pass = -1; return true;
    }
    if (tool.indexOf('st') === 0 || tool.indexOf('pa') === 0) {
      var k = +tool.slice(2);
      if (c.depot >= 0) return false;
      if (c.t !== 'grass') { c.t = 'grass'; }
      c.cow = false;
      if (tool[0] === 's') { c.station = c.station === k ? -1 : k; c.pass = -1; }
      else { c.pass = c.pass === k ? -1 : k; c.station = -1; }
      return true;
    }
    if (tool === 'train') {
      if (c.depot >= 0) { this.rotateDepot(c.depot); return true; }
      if (b.depots.length >= 2) { var d0 = b.depots[0]; cellAt(b, d0.x, d0.y).piece = null; b.depots.shift(); reindexDepots(b); }
      var dir = 1;
      if (c.piece && c.piece.kind === 'track' && isStraight(c.piece.dirs[0], c.piece.dirs[1])) dir = c.piece.dirs[1];
      plain();
      addDepot(b, x, y, dir);
      return true;
    }
    return false;
  },

  rotateDepot: function (i) {
    var d = this.board.depots[i];
    d.dir = (d.dir + 1) % 4;
    cellAt(this.board, d.x, d.y).piece = track(opp(d.dir), d.dir, { fixed: true });
  },

  freeErase: function (x, y) {
    var b = this.board, c = cellAt(b, x, y);
    if (!c) return false;
    if (eraseAt(b, x, y)) return true;
    if (c.depot >= 0) { b.depots.splice(c.depot, 1); c.piece = null; reindexDepots(b); return true; }
    if (c.station >= 0 || c.pass >= 0 || c.cow) { c.station = -1; c.pass = -1; c.cow = false; return true; }
    if (c.t !== 'grass') { c.t = 'grass'; return true; }
    return false;
  },

  // ---------- Mus og touch ----------
  cellFrom: function (px, py) {
    if (!this.L || !this.board) return null;
    var x = Math.floor((px - this.L.ox) / this.L.cs), y = Math.floor((py - this.L.oy) / this.L.cs);
    return cellAt(this.board, x, y) ? { x: x, y: y } : null;
  },

  buttonAt: function (px, py) {
    for (var i = this.buttons.length - 1; i >= 0; i--) {
      var b = this.buttons[i];
      if (!b.disabled && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b;
    }
    return null;
  },

  pointerDown: function (px, py, button) {
    var bt = this.buttonAt(px, py);
    if (bt) { Sound.click(); bt.onClick(); return; }
    if (this.state === 'howto') { this.closeHowto(); return; }
    var cell = this.cellFrom(px, py);
    if (!cell) return;
    this.cursorOn = false;
    if (this.state === 'run' && this.run) {
      var c = cellAt(this.board, cell.x, cell.y);
      if (c.piece && c.piece.kind === 'switch') { c.piece.active = 1 - c.piece.active; Sound.flip(); return; }
      if (cowAt(this.run, cell.x, cell.y)) this.dyt();
      return;
    }
    if (this.state !== 'build') return;
    var tool = this.tool;
    if (button === 2 || tool === 'erase') {
      this.erasing = true;
      if (this.mode === 'free' ? this.freeErase(cell.x, cell.y) : eraseAt(this.board, cell.x, cell.y)) { Sound.erase(); this.edited(); }
      return;
    }
    if (tool === 'rail') {
      this.stroke = strokeBegin(this.board, cell.x, cell.y);
      this.checkBoardMsg();
      return;
    }
    // fri leg: ting
    this.painting = true;
    this.lastPaint = cell;
    if (this.placeItem(cell.x, cell.y, tool, false)) { Sound.place(); this.edited(); }
  },

  pointerMove: function (px, py, buttons) {
    this.hoverBtn = this.buttonAt(px, py);
    var cell = this.cellFrom(px, py);
    this.hover = (this.state === 'build' || this.state === 'run') ? cell : null;
    if (!cell || this.state !== 'build') return;
    if (this.stroke) {
      if (buttons === 0) { this.pointerUp(px, py); return; }
      var n = strokeTo(this.board, this.stroke, cell.x, cell.y);
      if (n) { Sound.place(); this.edited(); }
      this.checkBoardMsg();
    } else if (this.erasing) {
      if (buttons === 0) { this.erasing = false; return; }
      if (this.mode === 'free' ? this.freeErase(cell.x, cell.y) : eraseAt(this.board, cell.x, cell.y)) { Sound.erase(); this.edited(); }
    } else if (this.painting) {
      if (buttons === 0) { this.painting = false; return; }
      if (this.lastPaint && this.lastPaint.x === cell.x && this.lastPaint.y === cell.y) return;
      this.lastPaint = cell;
      if (this.placeItem(cell.x, cell.y, this.tool, true)) { Sound.place(); this.edited(); }
    }
  },

  pointerUp: function () {
    if (this.stroke) {
      var st = this.stroke;
      this.stroke = null;
      if (!st.moved) {
        var c0 = st.cells[0];
        var cd = cellAt(this.board, c0.x, c0.y);
        var r = this.mode === 'free' && cd.depot >= 0 ? (this.rotateDepot(cd.depot), 'rotate') : tapAt(this.board, c0.x, c0.y);
        if (r === 'switch') Sound.flip(); else if (r === 'rotate') Sound.rotate(); else if (r === 'place') Sound.place();
      }
      this.edited();
      if (this.mode === 'free') this.saveFree();
    }
    if (this.erasing || this.painting) { this.erasing = false; this.painting = false; if (this.mode === 'free') this.saveFree(); }
  },

  // ---------- Tastatur ----------
  key: function (e) {
    var k = e.code;
    if (k === 'KeyM') { this.toggleMute(); return; }
    var st = this.state;
    if (st === 'title') {
      if (k === 'ArrowUp') this.menuSel = (this.menuSel + 2) % 3;
      else if (k === 'ArrowDown') this.menuSel = (this.menuSel + 1) % 3;
      else if (k === 'Enter' || k === 'Space') this.titleChoice(this.menuSel);
      return;
    }
    if (st === 'howto') { if (k === 'Enter' || k === 'Space' || k === 'Escape') this.closeHowto(); return; }
    if (st === 'levels') {
      var n = LEVELS.length;
      if (k === 'ArrowLeft') this.levelSel = Math.max(0, this.levelSel - 1);
      else if (k === 'ArrowRight') this.levelSel = Math.min(n - 1, this.levelSel + 1);
      else if (k === 'ArrowUp') this.levelSel = Math.max(0, this.levelSel - 5);
      else if (k === 'ArrowDown') this.levelSel = Math.min(n - 1, this.levelSel + 5);
      else if (k === 'Enter' || k === 'Space') { if (this.levelSel < this.progress.unlocked) this.startLevel(this.levelSel); else Sound.nope(); }
      else if (k === 'Escape') this.setState('title');
      return;
    }
    if (st === 'win') {
      if (k === 'Enter' || k === 'Space') this.nextLevel();
      else if (k === 'Escape') this.toLevels();
      else if (k === 'KeyR') this.stopRun();
      return;
    }
    var arrows = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
    if (k in arrows) {
      var d = arrows[k];
      var nx = this.cursor.x + DX[d], ny = this.cursor.y + DY[d];
      if (!this.cursorOn) { this.cursorOn = true; return; }
      if (!cellAt(this.board, nx, ny)) return;
      if (e.shiftKey && st === 'build' && (this.tool === 'rail')) {
        if (!this.kbStroke) this.kbStroke = strokeBegin(this.board, this.cursor.x, this.cursor.y);
        if (this.kbStroke && strokeStep(this.board, this.kbStroke, nx, ny)) Sound.place();
        this.edited();
        if (this.mode === 'free') this.saveFree();
      }
      this.cursor = { x: nx, y: ny };
      return;
    }
    if (k === 'KeyH') { this.dyt(); return; }
    if (st === 'build') {
      if (k === 'Space') {
        this.cursorOn = true;
        var x = this.cursor.x, y = this.cursor.y;
        if (this.mode === 'free' && this.tool !== 'rail' && this.tool !== 'erase') { if (this.placeItem(x, y, this.tool, false)) Sound.place(); }
        else if (this.tool === 'erase') { if (this.mode === 'free' ? this.freeErase(x, y) : eraseAt(this.board, x, y)) Sound.erase(); }
        else {
          var c = cellAt(this.board, x, y);
          if (this.mode === 'free' && c.depot >= 0) { this.rotateDepot(c.depot); Sound.rotate(); }
          else { var r = tapAt(this.board, x, y); if (r === 'switch') Sound.flip(); else if (r) Sound.place(); }
        }
        this.edited();
        if (this.mode === 'free') this.saveFree();
      } else if (k === 'Delete' || k === 'Backspace' || k === 'KeyX') {
        if (this.mode === 'free' ? this.freeErase(this.cursor.x, this.cursor.y) : eraseAt(this.board, this.cursor.x, this.cursor.y)) { Sound.erase(); this.edited(); }
      } else if (k === 'Enter') this.startRun();
      else if (k === 'Escape') this.back();
      else if (k === 'KeyV') this.tool = this.tool === 'erase' ? 'rail' : 'erase';
      return;
    }
    if (st === 'run') {
      if (this.result && (k === 'Enter' || k === 'Escape' || k === 'Space')) { this.stopRun(); return; }
      if (k === 'KeyP') this.paused = !this.paused;
      else if (k === 'Enter' || k === 'Escape') this.stopRun();
      else if (k === 'KeyF') this.fast = !this.fast;
      else if (k === 'Space') {
        var c3 = cellAt(this.board, this.cursor.x, this.cursor.y);
        if (c3 && c3.piece && c3.piece.kind === 'switch') { c3.piece.active = 1 - c3.piece.active; Sound.flip(); }
      }
    }
  },

  toggleMute: function () {
    Sound.muted = !Sound.muted;
    Store.set('togbanen-muted', Sound.muted ? '1' : '0');
  },

  titleChoice: function (i) {
    if (i === 0) this.toLevels();
    else if (i === 1) this.startFree();
    else { this.afterHowto = 'title'; this.setState('howto'); }
  },

  closeHowto: function () {
    this.progress.intro = true;
    this.saveProgress();
    if (this.afterHowto === 'build') {
      this.setState('build');
      this.say(LEVELS[this.li].tip, null, null, 6);
    } else this.setState('title');
  },

  toLevels: function () {
    if (this.state === 'build' || this.state === 'run' || this.state === 'win') this.leaveBuild();
    this.run = null;
    this.levelSel = Math.min(this.progress.unlocked - 1, this.mode === 'level' && this.board ? this.li : this.progress.unlocked - 1);
    this.setState('levels');
  },

  back: function () {
    this.leaveBuild();
    if (this.mode === 'free') this.setState('title'); else this.toLevels();
  },

  nextLevel: function () {
    this.leaveBuild();
    if (this.mode === 'level' && this.li + 1 < LEVELS.length) this.startLevel(this.li + 1);
    else this.toLevels();
  },

  // ---------- Opdatering ----------
  update: function (dt) {
    this.time += dt;
    this.stateTime += dt;
    if (this.state === 'title') {
      var d = this.demo.run;
      d.p += dt / 0.45;
      if (d.p >= 1) { stepRun(d, this.demo.board); d.p = 0; }
    }
    if (this.state === 'howto') {
      var hr = this.howto.run;
      hr.p += dt / 0.5;
      if (hr.p >= 1) { stepRun(hr, this.howto.d); hr.p = 0; }
    }
    if ((this.state === 'run' || this.state === 'win') && this.run) this.updateRun(dt);
    if (this.msg && this.time > this.msg.until) this.msg = null;
    this.smoke = this.smoke.filter(function (s) {
      s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += dt * 9;
      return s.life > 0;
    });
    this.floaters = this.floaters.filter(function (f) { f.life -= dt; f.y -= dt * 30; return f.life > 0; });
  }
};

Game.init();
