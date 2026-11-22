// Klodsregn: skyen regner klodser ned – styr dem og lav hele rækker.
var W = 960, H = 640;
var COLS = 10, ROWS = 18, CELL = 32;
var BX = 320, BY = 56;
var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');

var Store = {
  get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ingen lagring */ } }
};

var CHEERS = ['', 'Godt!', 'Super!', 'Fantastisk!', 'KLODSREGN!!'];
var POINTS = [0, 100, 300, 500, 800];
var LINES_PER_LEVEL = 8;
var BOMB_EVERY = 13;

var Game = {
  state: 'title', t: 0, st: 0, mode: 'normal', menuSel: 0, paused: false,
  grid: null, piece: null, next: null, bag: [], count: 0,
  score: 0, lines: 0, level: 1, hearts: 3, best: 0, newBest: false,
  fall: 0, lockT: 0, lockMoves: 0, das: { dir: 0, t: 0 }, softT: 0,
  clearRows: [], sweepT: 0, shake: 0, mood: 'calm', moodT: 0, bombTip: false,
  parts: [], floaters: [], drops: [], demo: [], menuBoxes: [],

  init: function () {
    this.best = parseInt(Store.get('klodsregn-highscore'), 10) || 0;
    Sound.muted = Store.get('klodsregn-muted') === '1';
    Input.init();
    for (var i = 0; i < 50; i++) this.drops.push({ x: Math.random() * W, y: Math.random() * H, v: 120 + Math.random() * 120, l: 8 + Math.random() * 12 });
    for (var j = 0; j < 12; j++) this.demo.push(this.newDemo(Math.random() * H));
    this.grid = this.emptyGrid();
    var self = this;
    canvas.addEventListener('mousedown', function (e) { self.click(e); });
    var last = performance.now();
    var loop = function (now) {
      var dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      self.update(dt);
      self.draw();
      Input.endFrame();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  emptyGrid: function () {
    var g = [];
    for (var y = 0; y < ROWS; y++) g.push(this.emptyRow());
    return g;
  },
  emptyRow: function () { var r = []; for (var x = 0; x < COLS; x++) r.push(null); return r; },

  setState: function (s) { this.state = s; this.st = 0; },
  setMood: function (m, time) { this.mood = m; this.moodT = time; },

  // ---------- Start, klodser og bag ----------
  start: function (mode) {
    this.mode = mode;
    this.grid = this.emptyGrid();
    this.score = 0; this.lines = 0; this.level = 1; this.hearts = 3;
    this.bag = []; this.count = 0; this.newBest = false; this.bombTip = false;
    this.parts = []; this.floaters = [];
    this.paused = false;
    this.next = this.take();
    this.setState('playing');
    this.spawn();
    this.setMood('happy', 1);
    Sound.start();
  },

  // Alle former kommer i en pose og trækkes i tilfældig rækkefølge, så der aldrig går lang tid mellem stængerne.
  take: function () {
    this.count++;
    if (this.count % BOMB_EVERY === 0) return BOMB;
    if (!this.bag.length) this.bag = shuffle(SHAPES.slice());
    return this.bag.pop();
  },

  spawn: function () {
    var s = this.next;
    var m = s.m.map(function (r) { return r.slice(); });
    this.piece = { shape: s, m: m, x: Math.floor((COLS - m.length) / 2), y: -topRow(m) };
    this.next = this.take();
    this.fall = 0; this.lockT = 0; this.lockMoves = 0; this.softT = 0;
    if (this.collides(m, this.piece.x, this.piece.y)) { this.topOut(); return; }
    if (s.bomb && !this.bombTip) {
      this.bombTip = true;
      this.floater('Stjernebombe! Den sprænger klodser væk', BX + COLS * CELL / 2, BY + 120, '#ffe066', 22, 3);
    }
  },

  interval: function () {
    if (this.mode === 'calm') return 0.95;
    return Math.max(0.14, 0.85 * Math.pow(0.86, this.level - 1));
  },

  collides: function (m, px, py) {
    for (var r = 0; r < m.length; r++) for (var c = 0; c < m.length; c++) {
      if (!m[r][c]) continue;
      var gx = px + c, gy = py + r;
      if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
      if (gy >= 0 && this.grid[gy][gx]) return true;
    }
    return false;
  },

  dropY: function () {
    var p = this.piece, y = p.y;
    while (!this.collides(p.m, p.x, y + 1)) y++;
    return y;
  },

  moved: function () { this.lockT = 0; this.lockMoves++; },

  move: function (d) {
    var p = this.piece;
    if (this.collides(p.m, p.x + d, p.y)) return false;
    p.x += d;
    this.moved();
    Sound.move();
    return true;
  },

  rotate: function (dir) {
    var p = this.piece;
    if (p.shape.noSpin) return;
    var m2 = rotateMatrix(p.m, dir);
    var kicks = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1], [-1, -1], [1, -1]];
    for (var i = 0; i < kicks.length; i++) {
      if (!this.collides(m2, p.x + kicks[i][0], p.y + kicks[i][1])) {
        p.m = m2; p.x += kicks[i][0]; p.y += kicks[i][1];
        this.moved();
        Sound.rotate();
        return;
      }
    }
  },

  hardDrop: function () {
    var p = this.piece, y = this.dropY(), d = y - p.y;
    for (var r = 0; r < p.m.length; r++) for (var c = 0; c < p.m.length; c++) {
      if (!p.m[r][c]) continue;
      for (var k = 0; k < 3; k++) this.part(BX + (p.x + c + Math.random()) * CELL, BY + (p.y + r + Math.random() * d) * CELL, p.shape.color, 0.4, 30);
    }
    p.y = y;
    this.score += d * 2;
    this.shake = 0.12;
    Sound.drop();
    this.lock();
  },

  lock: function () {
    var p = this.piece, over = false, bx = p.x, by = Math.max(0, p.y);
    for (var r = 0; r < p.m.length; r++) for (var c = 0; c < p.m.length; c++) {
      if (!p.m[r][c]) continue;
      var gx = p.x + c, gy = p.y + r;
      if (gy < 0) { over = true; continue; }
      bx = gx; by = gy;
      if (!p.shape.bomb) this.grid[gy][gx] = { color: p.shape.color, seed: Math.random() * 10 };
    }
    this.piece = null;
    if (p.shape.bomb) this.explode(bx, by); else Sound.land();
    if (over && !p.shape.bomb) { this.topOut(); return; }

    var full = [];
    for (var y = 0; y < ROWS; y++) if (this.grid[y].every(Boolean)) full.push(y);
    if (!full.length) { this.spawn(); return; }

    var n = full.length;
    this.lines += n;
    this.score += POINTS[Math.min(n, 4)] * this.level;
    this.clearRows = full;
    this.setState('clearing');
    this.setMood('happy', 1.4);
    Sound.clear(n);
    var cy = BY + (full[0] + n / 2) * CELL;
    this.floater(CHEERS[Math.min(n, 4)], BX + COLS * CELL / 2, cy, n >= 3 ? '#ffe066' : '#ffffff', 26 + n * 6, 1.3);
    if (this.mode === 'normal') {
      var lv = 1 + Math.floor(this.lines / LINES_PER_LEVEL);
      if (lv > this.level) {
        this.level = lv;
        this.floater('Niveau ' + lv + '!', BX + COLS * CELL / 2, BY + 200, '#90e0ef', 40, 2);
        Sound.levelUp();
      }
    }
  },

  // Bomben fjerner klodser i et felt på 5 x 3 omkring sig.
  explode: function (cx, cy) {
    var removed = 0;
    for (var y = cy - 1; y <= cy + 1; y++) for (var x = cx - 2; x <= cx + 2; x++) {
      if (y < 0 || y >= ROWS || x < 0 || x >= COLS) continue;
      var cell = this.grid[y][x];
      if (cell) {
        removed++;
        for (var k = 0; k < 6; k++) this.part(BX + (x + 0.5) * CELL, BY + (y + 0.5) * CELL, cell.color, 0.8, 240);
        this.grid[y][x] = null;
      }
    }
    for (var i = 0; i < 24; i++) this.part(BX + (cx + 0.5) * CELL, BY + (cy + 0.5) * CELL, i % 2 ? '#ffe066' : '#ffffff', 0.9, 300, true);
    this.score += removed * 25;
    this.shake = 0.3;
    this.setMood('wow', 1.2);
    Sound.boom();
    if (removed) this.floater('BUM! +' + removed * 25, BX + (cx + 0.5) * CELL, BY + cy * CELL, '#ffe066', 28, 1.2);
  },

  // Når klodserne når helt op til skyen: et hjerte forsvinder, og en regnbue rydder pladen.
  topOut: function () {
    this.piece = null;
    this.setMood('sad', 2);
    Sound.oops();
    var mid = BX + COLS * CELL / 2;
    if (this.mode === 'normal') {
      this.hearts--;
      if (this.hearts <= 0) { this.gameOver(); return; }
      this.floater('Pyha! Et hjerte forsvandt', mid, BY + 160, '#ff8fa3', 26, 2.2);
    } else {
      this.floater('Regnbuen rydder op!', mid, BY + 160, '#ffffff', 28, 2.2);
    }
    this.sweepT = 0;
    this.setState('sweep');
    Sound.sweep();
  },

  gameOver: function () {
    if (this.score > this.best) {
      this.best = this.score;
      this.newBest = this.score > 0;
      Store.set('klodsregn-highscore', String(this.best));
    }
    this.setState('gameover');
    Sound.gameOver();
  },

  // ---------- Effekter ----------
  part: function (x, y, color, life, speed, star) {
    var a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random() * 0.7);
    this.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, life: life, max: life, color: color, star: star, s: 3 + Math.random() * 4 });
  },

  floater: function (text, x, y, color, size, life) {
    this.floaters.push({ text: text, x: x, y: y, color: color, size: size, life: life, max: life });
  },

  updateFx: function (dt) {
    this.parts = this.parts.filter(function (p) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt;
      return p.life > 0;
    });
    this.floaters = this.floaters.filter(function (f) { f.life -= dt; f.y -= 22 * dt; return f.life > 0; });
    this.drops.forEach(function (d) { d.y += d.v * dt; if (d.y > H) { d.y = -20; d.x = Math.random() * W; } });
    if (this.shake > 0) this.shake -= dt;
    if (this.moodT > 0) { this.moodT -= dt; if (this.moodT <= 0) this.mood = 'calm'; }
  },

  newDemo: function (y) {
    var s = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    var x = Math.random() < 0.5 ? 20 + Math.random() * 220 : 720 + Math.random() * 220;
    return { shape: s, x: x, y: y, v: 30 + Math.random() * 40, a: Math.random() * 6, spin: (Math.random() - 0.5) * 1.2, s: 18 + Math.random() * 12 };
  },

  // ---------- Opdatering ----------
  update: function (dt) {
    this.t += dt; this.st += dt;
    if (Input.hit('KeyM')) { Sound.muted = !Sound.muted; Store.set('klodsregn-muted', Sound.muted ? '1' : '0'); }
    this.updateFx(dt);
    if (this.state === 'title') this.updateTitle(dt);
    else if (this.state === 'playing') this.updatePlaying(dt);
    else if (this.state === 'clearing') this.updateClearing(dt);
    else if (this.state === 'sweep') this.updateSweep(dt);
    else if (this.state === 'gameover') this.updateGameOver(dt);
  },

  updateTitle: function (dt) {
    var self = this;
    this.demo.forEach(function (d, i) {
      d.y += d.v * dt; d.a += d.spin * dt;
      if (d.y > H + 60) self.demo[i] = self.newDemo(-60);
    });
    if (Input.hit('ArrowUp', 'ArrowDown', 'KeyW', 'KeyS')) { this.menuSel = 1 - this.menuSel; Sound.tick(); }
    if (Input.hit('Enter', 'Space')) this.start(this.menuSel === 0 ? 'normal' : 'calm');
  },

  click: function (e) {
    Sound.unlock();
    var r = canvas.getBoundingClientRect();
    var x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
    if (this.state === 'title') {
      for (var i = 0; i < this.menuBoxes.length; i++) {
        var b = this.menuBoxes[i];
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { this.menuSel = i; this.start(i === 0 ? 'normal' : 'calm'); }
      }
    } else if (this.state === 'gameover' && this.st > 0.8) {
      this.start(this.mode);
    }
  },

  updatePlaying: function (dt) {
    if (Input.hit('Escape')) { this.setState('title'); return; }
    if (Input.hit('KeyP')) { this.paused = !this.paused; Sound.tick(); }
    if (this.paused || !this.piece) return;
    var p = this.piece;

    if (Input.hit('ArrowUp', 'KeyW', 'KeyX')) this.rotate(1);
    if (Input.hit('KeyZ')) this.rotate(-1);

    // Venstre/højre: ét skridt pr. tryk, og bliver ved hvis man holder tasten nede.
    var dir = (Input.down('ArrowLeft', 'KeyA') ? -1 : 0) + (Input.down('ArrowRight', 'KeyD') ? 1 : 0);
    if (Input.hit('ArrowLeft', 'KeyA')) { this.das = { dir: -1, t: 0 }; this.move(-1); }
    else if (Input.hit('ArrowRight', 'KeyD')) { this.das = { dir: 1, t: 0 }; this.move(1); }
    else if (dir !== 0 && dir === this.das.dir) {
      this.das.t += dt;
      if (this.das.t > 0.22) { this.das.t = 0.15; this.move(dir); }
    } else this.das = { dir: dir, t: 0 };

    if (Input.hit('Space')) { this.hardDrop(); return; }

    var grounded = this.collides(p.m, p.x, p.y + 1);
    var soft = Input.down('ArrowDown', 'KeyS');
    if (soft && !grounded) {
      this.softT += dt;
      if (this.softT > 0.045) { this.softT = 0; p.y++; this.fall = 0; this.score += 1; }
      grounded = this.collides(p.m, p.x, p.y + 1);
    }

    if (grounded) {
      this.lockT += dt * (soft ? 2.5 : 1);
      if (this.lockT > 0.55 || this.lockMoves > 15) this.lock();
    } else {
      this.fall += dt;
      if (this.fall >= this.interval()) { this.fall = 0; p.y++; }
    }
  },

  updateClearing: function () {
    if (this.st < 0.45) return;
    var self = this;
    this.clearRows.forEach(function (y) {
      for (var x = 0; x < COLS; x++) {
        var c = self.grid[y][x];
        for (var k = 0; k < 3; k++) self.part(BX + (x + 0.5) * CELL, BY + (y + 0.5) * CELL, c.color, 0.8, 220, k === 0);
      }
    });
    this.clearRows.forEach(function (y) { self.grid.splice(y, 1); self.grid.unshift(self.emptyRow()); });
    this.clearRows = [];
    this.setState('playing');
    this.spawn();
  },

  updateSweep: function () {
    var row = ROWS - Math.floor(this.st / 1.2 * ROWS);
    for (var y = Math.max(0, row); y < ROWS; y++) for (var x = 0; x < COLS; x++) {
      var c = this.grid[y][x];
      if (c) {
        this.part(BX + (x + 0.5) * CELL, BY + (y + 0.5) * CELL, c.color, 0.7, 160, true);
        this.grid[y][x] = null;
      }
    }
    if (this.st > 1.35) {
      this.grid = this.emptyGrid();
      this.setState('playing');
      this.spawn();
    }
  },

  updateGameOver: function () {
    if (this.st < 0.8) return;
    if (Input.hit('Enter', 'Space')) this.start(this.mode);
    if (Input.hit('Escape')) this.setState('title');
  },

  // ---------- Tegning ----------
  draw: function () {
    this.drawSky();
    if (this.state === 'title') this.drawTitle();
    else this.drawGame();
    this.drawFx();
    if (Sound.muted) Draw.text('🔇', W - 24, 22, 20, '#fff');
  },

  drawSky: function () {
    var hue = this.state === 'title' ? 215 : 215 + (this.level - 1) * 28;
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'hsl(' + hue + ',55%,38%)');
    g.addColorStop(1, 'hsl(' + (hue + 35) + ',55%,18%)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(200,230,255,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    this.drops.forEach(function (d) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 2, d.y + d.l); });
    ctx.stroke();
  },

  drawTitle: function () {
    var self = this;
    this.demo.forEach(function (d) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.a);
      var n = d.shape.m.length;
      ctx.translate(-n * d.s / 2, -n * d.s / 2);
      Draw.matrix(d.shape, d.shape.m, 0, 0, d.s, { t: self.t, seed: d.x });
      ctx.restore();
    });

    Draw.cloud(W / 2, 70, 'happy', this.t);
    var title = 'Klodsregn', colors = ['#ef476f', '#ff9f1c', '#ffd166', '#06d6a0', '#4cc9f0', '#4361ee', '#b5179e', '#ef476f', '#ff9f1c'];
    ctx.font = 'bold 84px ' + FONT;
    var total = ctx.measureText(title).width, x = W / 2 - total / 2;
    for (var i = 0; i < title.length; i++) {
      var ch = title[i], w = ctx.measureText(ch).width;
      Draw.text(ch, x + w / 2, 172 + Math.sin(this.t * 3 + i * 0.6) * 6, 84, colors[i], 'center', '#1d1d2b');
      x += w;
    }
    Draw.text('Styr klodserne fra skyen og lav hele rækker!', W / 2, 238, 26, '#ffffff', 'center', '#1d1d2b');

    var opts = [
      { label: '▶  Spil', sub: 'Det går hurtigere og hurtigere. Du har 3 hjerter.' },
      { label: '☁  Rolig leg', sub: 'Klodserne falder langsomt, og du kan ikke tabe.' }
    ];
    this.menuBoxes = [];
    for (var j = 0; j < opts.length; j++) {
      var bx = W / 2 - 230, by = 280 + j * 92, sel = j === this.menuSel;
      this.menuBoxes.push({ x: bx, y: by, w: 460, h: 78 });
      Draw.rr(bx, by, 460, 78, 18);
      ctx.fillStyle = sel ? 'rgba(255,209,102,0.95)' : 'rgba(255,255,255,0.15)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = sel ? '#fff' : 'rgba(255,255,255,0.3)';
      ctx.stroke();
      Draw.text(opts[j].label, W / 2, by + 28, 32, sel ? '#1d1d2b' : '#ffffff');
      Draw.text(opts[j].sub, W / 2, by + 58, 17, sel ? '#3a3a50' : 'rgba(255,255,255,0.8)');
    }

    var keys = [['← →', 'flyt'], ['↑', 'drej'], ['↓', 'hurtigere'], ['MELLEMRUM', 'bum ned']];
    var kx = W / 2 - 330;
    keys.forEach(function (k, i) {
      var cx = kx + i * 220 + (i === 3 ? -20 : 0);
      Draw.text(k[0], cx, 492, 24, '#ffd166', 'center', '#1d1d2b');
      Draw.text(k[1], cx, 522, 20, '#ffffff', 'center', '#1d1d2b');
    });
    if (Math.sin(this.t * 4) > -0.3) Draw.text('↑ ↓ vælg · ENTER start', W / 2, 572, 24, '#ffffff', 'center', '#1d1d2b');
    if (this.best > 0) Draw.text('Bedste: ' + this.best + ' point', W / 2, 610, 20, '#90e0ef', 'center', '#1d1d2b');
  },

  drawGame: function () {
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * 10 * this.shake / 0.3, (Math.random() - 0.5) * 10 * this.shake / 0.3);
    this.drawBoard();
    ctx.restore();
    this.drawPanels();

    var mid = BX + COLS * CELL / 2;
    if (this.paused && this.state === 'playing') {
      ctx.fillStyle = 'rgba(10,15,40,0.75)';
      ctx.fillRect(BX, BY, COLS * CELL, ROWS * CELL);
      Draw.text('Pause', mid, BY + 250, 56, '#ffd166', 'center', '#1d1d2b');
      Draw.text('Tryk P for at spille videre', mid, BY + 310, 20, '#ffffff');
    }
    if (this.state === 'gameover') this.drawGameOver();
  },

  drawBoard: function () {
    var bw = COLS * CELL, bh = ROWS * CELL;
    Draw.rr(BX - 8, BY - 8, bw + 16, bh + 16, 14);
    ctx.fillStyle = 'rgba(10,15,40,0.78)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 1; x < COLS; x++) { ctx.moveTo(BX + x * CELL, BY); ctx.lineTo(BX + x * CELL, BY + bh); }
    for (var y = 1; y < ROWS; y++) { ctx.moveTo(BX, BY + y * CELL); ctx.lineTo(BX + bw, BY + y * CELL); }
    ctx.stroke();

    var scared = this.state === 'sweep' || this.stackHigh();
    for (y = 0; y < ROWS; y++) {
      var clearing = this.state === 'clearing' && this.clearRows.indexOf(y) >= 0;
      for (x = 0; x < COLS; x++) {
        var c = this.grid[y][x];
        if (!c) continue;
        var mood = clearing ? 'happy' : (scared ? 'scared' : (this.mood === 'happy' ? 'happy' : null));
        Draw.block(BX + x * CELL, BY + y * CELL, CELL, c.color, { seed: c.seed, t: this.t, mood: mood });
      }
      if (clearing) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.35 * Math.sin(this.st * 40)) + ')';
        ctx.fillRect(BX, BY + y * CELL, bw, CELL);
      }
    }

    var p = this.piece;
    if (p && this.state === 'playing') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(BX - 2, BY, bw + 4, bh);
      ctx.clip();
      var gy = this.dropY();
      if (gy !== p.y) Draw.matrix(p.shape, p.m, BX + p.x * CELL, BY + gy * CELL, CELL, { ghost: true });
      Draw.matrix(p.shape, p.m, BX + p.x * CELL, BY + p.y * CELL, CELL, { t: this.t, seed: 3 });
      ctx.restore();
    }

    if (this.state === 'sweep') {
      var ry = BY + bh - (this.st / 1.2) * bh;
      var bands = ['#ef476f', '#ff9f1c', '#ffd166', '#06d6a0', '#4cc9f0', '#7b5cff'];
      bands.forEach(function (col, i) {
        ctx.fillStyle = col;
        ctx.fillRect(BX, Math.max(BY, ry + i * 7), bw, 7);
      });
    }

    Draw.cloud(BX + bw / 2, 26, this.mood, this.t, 0.62);
  },

  stackHigh: function () {
    for (var y = 0; y < 4; y++) if (this.grid[y].some(Boolean)) return true;
    return false;
  },

  panel: function (x, y, w, h, title) {
    Draw.rr(x, y, w, h, 16);
    ctx.fillStyle = 'rgba(10,15,40,0.6)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.stroke();
    if (title) Draw.text(title, x + w / 2, y + 22, 20, '#90e0ef');
  },

  drawPanels: function () {
    var lx = 50, lw = 220;
    this.panel(lx, 70, lw, 96, 'Point');
    Draw.text(String(this.score), lx + lw / 2, 132, 40, '#ffd166', 'center', '#1d1d2b');
    this.panel(lx, 180, lw, 74, 'Bedste');
    Draw.text(String(Math.max(this.best, this.score)), lx + lw / 2, 232, 26, '#ffffff');
    this.panel(lx, 268, lw, 74, 'Rækker');
    Draw.text(String(this.lines), lx + lw / 2, 320, 26, '#ffffff');
    if (this.mode === 'normal') {
      this.panel(lx, 356, lw, 74, 'Niveau');
      Draw.text(String(this.level), lx + lw / 2, 408, 26, '#ffffff');
      this.panel(lx, 444, lw, 82, 'Hjerter');
      for (var i = 0; i < 3; i++) Draw.heart(lx + lw / 2 - 50 + i * 50, 494, 34, i < this.hearts);
    } else {
      this.panel(lx, 356, lw, 100, '☁ Rolig leg');
      Draw.text('Her kan du', lx + lw / 2, 400, 18, '#ffffff');
      Draw.text('ikke tabe 🙂', lx + lw / 2, 428, 18, '#ffffff');
    }

    var rx = 690, rw = 220;
    this.panel(rx, 70, rw, 170, 'Næste');
    if (this.next) {
      var m = this.next.m, b = bounds(m), s = this.next.bomb ? 64 : 34;
      var ox = rx + rw / 2 - (b.x + b.w / 2) * s, oy = 160 - (b.y + b.h / 2) * s;
      Draw.matrix(this.next, m, ox, oy, s, { t: this.t, seed: 7 });
    }
    this.panel(rx, 256, rw, 252, 'Taster');
    var keys = [['← →', 'flyt'], ['↑', 'drej'], ['↓', 'hurtigere'], ['MELLEMRUM', 'bum ned'], ['P', 'pause'], ['M', 'lyd'], ['ESC', 'menu']];
    keys.forEach(function (k, i) {
      Draw.text(k[0], rx + 122, 300 + i * 29, 15, '#ffd166', 'right');
      Draw.text(k[1], rx + 132, 300 + i * 29, 16, '#ffffff', 'left');
    });
  },

  drawGameOver: function () {
    var mid = BX + COLS * CELL / 2;
    ctx.fillStyle = 'rgba(10,15,40,0.6)';
    ctx.fillRect(0, 0, W, H);
    Draw.rr(mid - 240, 180, 480, 280, 24);
    ctx.fillStyle = '#2b2d6e';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffd166';
    ctx.stroke();
    Draw.text('Godt kæmpet!', mid, 230, 46, '#ffd166', 'center', '#1d1d2b');
    Draw.text('Du fik ' + this.score + ' point', mid, 292, 30, '#ffffff');
    Draw.text('og lavede ' + this.lines + (this.lines === 1 ? ' række' : ' rækker'), mid, 330, 24, '#ffffff');
    if (this.newBest) Draw.text('⭐ Ny rekord! ⭐', mid, 376, 30, '#ffe066', 'center', '#1d1d2b');
    if (this.st > 0.8) Draw.text('ENTER spil igen · ESC menu', mid, 428, 22, '#90e0ef');
  },

  drawFx: function () {
    this.parts.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      if (p.star) Draw.star(p.x, p.y, p.s + 2, p.color);
      else { ctx.fillStyle = p.color; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
    });
    ctx.globalAlpha = 1;
    this.floaters.forEach(function (f) {
      ctx.globalAlpha = Math.min(1, f.life / 0.4);
      var pop = 1 + Math.max(0, (f.life - f.max + 0.15) / 0.15) * 0.4;
      Draw.text(f.text, f.x, f.y, Math.round(f.size * pop), f.color, 'center', '#1d1d2b');
    });
    ctx.globalAlpha = 1;
  }
};

Game.init();
