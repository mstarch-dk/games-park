// Skærmene og knapperne. Game.draw() kalder Screens.draw(Game).
var FONT = '"Trebuchet MS", "Comic Sans MS", sans-serif';

var Screens = {
  draw: function (g) {
    g.buttons = [];
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#bde0fe');
    sky.addColorStop(1, '#e9f5db');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    if (g.state === 'title') this.title(g);
    else if (g.state === 'levels') this.levels(g);
    else if (g.state === 'howto') this.howto(g);
    else this.play(g);
    this.drawButtons(g);
  },

  text: function (s, x, y, size, color, align, bold) {
    ctx.font = (bold === false ? '' : 'bold ') + size + 'px ' + FONT;
    ctx.fillStyle = color || '#3d2c1e';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  },

  btn: function (g, o) {
    // o: { x, y, w, h, label, onClick, color, active, disabled, size, icon, sel }
    g.buttons.push(o);
  },

  drawButtons: function (g) {
    var self = this;
    g.buttons.forEach(function (b) {
      var hov = g.hoverBtn === b || (g.hoverBtn && g.hoverBtn.id && g.hoverBtn.id === b.id);
      var col = b.color || '#ffffff';
      var lift = hov && !b.disabled ? -2 : 0;
      ctx.globalAlpha = b.disabled ? 0.4 : 1;
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      Draw.rr(ctx, b.x + 2, b.y + 4, b.w, b.h, 14); ctx.fill();
      ctx.fillStyle = col;
      Draw.rr(ctx, b.x, b.y + lift, b.w, b.h, 14); ctx.fill();
      if (b.active || b.sel) {
        ctx.strokeStyle = b.sel ? '#ffd60a' : '#3d2c1e';
        ctx.lineWidth = 4;
        Draw.rr(ctx, b.x + 2, b.y + lift + 2, b.w - 4, b.h - 4, 12); ctx.stroke();
      }
      var dark = b.color && b.color !== '#ffffff' && !b.lightText;
      if (b.icon) b.icon(ctx, b.x + b.w / 2, b.y + lift + b.h / 2 - (b.label ? 8 : 0), Math.min(b.w, b.h));
      if (b.label) {
        var size = b.size || 20;
        var ty = b.y + lift + b.h / 2 + (b.icon ? b.h * 0.28 : 0);
        self.text(b.label, b.x + b.w / 2, ty, b.icon ? 13 : size, dark ? '#fff' : '#3d2c1e', 'center');
      }
      ctx.globalAlpha = 1;
    });
  },

  // ---------- Titel ----------
  title: function (g) {
    var t = g.time;
    // bakker
    ctx.fillStyle = '#95d5b2';
    ctx.beginPath(); ctx.moveTo(0, 470);
    for (var x = 0; x <= W; x += 20) ctx.lineTo(x, 440 + Math.sin(x / 140) * 30);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    // skyer
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    [[120, 80], [460, 50], [860, 100]].forEach(function (c, i) {
      var cx = (c[0] + t * (8 + i * 3)) % (W + 200) - 100;
      ctx.beginPath(); ctx.arc(cx, c[1], 30, 0, 7); ctx.arc(cx + 34, c[1] - 12, 36, 0, 7); ctx.arc(cx + 72, c[1], 28, 0, 7); ctx.fill();
    });
    this.text('🚂 Togbanen', W / 2 + 3, 113, 76, 'rgba(0,0,0,0.18)', 'center');
    this.text('🚂 Togbanen', W / 2, 110, 76, '#d62828', 'center');
    this.text('Læg skinner og kør passagererne hjem!', W / 2, 172, 26, '#3d2c1e', 'center');
    // demotog
    var db = g.demo.board;
    var L = Draw.layout(db, { x: 170, y: 200, w: 740, h: 230 });
    Draw.board(ctx, db, L, { run: g.demo.run, time: t });
    this.smokeFrom(g, g.demo.run, L, 0.016);
    var labels = ['▶  Spil', '🎨  Fri leg', '❓  Sådan gør man'];
    var acts = [0, 1, 2];
    var self = this;
    labels.forEach(function (l, i) {
      self.btn(g, {
        id: 'title' + i, x: W / 2 - 170, y: 455 + i * 70, w: 340, h: 58, label: l, size: 28,
        color: i === 0 ? '#2a9d8f' : '#ffffff', sel: g.menuSel === i,
        onClick: function () { g.menuSel = i; g.titleChoice(acts[i]); }
      });
    });
    this.muteButton(g, W - 80, H - 76);
  },

  smokeFrom: function (g, run, L) {
    run.trains.forEach(function (tr) {
      if (!tr.chimney) return;
      tr.smokeT = (tr.smokeT || 0) - 0.016;
      if (tr.smokeT <= 0) {
        tr.smokeT = 0.1;
        g.smoke.push({ x: tr.chimney.x, y: tr.chimney.y, r: L.cs * 0.08, life: 1.2, max: 1.2, vx: (Math.random() - 0.5) * 10, vy: -10 });
      }
    });
    this.drawSmoke(g);
  },

  drawSmoke: function (g) {
    g.smoke.forEach(function (s) {
      ctx.globalAlpha = Math.max(0, s.life / s.max) * 0.7;
      ctx.fillStyle = '#f8f9fa';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  },

  muteButton: function (g, x, y) {
    this.btn(g, {
      id: 'mute', x: x, y: y, w: 60, h: 56, label: Sound.muted ? '🔇' : '🔊', size: 28,
      onClick: function () { g.toggleMute(); }
    });
  },

  // ---------- Banevalg ----------
  levels: function (g) {
    this.text('Vælg en bane', W / 2, 50, 44, '#3d2c1e', 'center');
    var total = 0;
    g.progress.stars.forEach(function (s) { total += s || 0; });
    this.text('⭐ ' + total + ' / ' + LEVELS.length * 3, W - 40, 50, 26, '#3d2c1e', 'right');
    var cw = 186, ch = 118, gap = 18, cols = 5;
    var x0 = (W - (cols * cw + (cols - 1) * gap)) / 2, y0 = 96;
    var self = this;
    LEVELS.forEach(function (lv, i) {
      var x = x0 + (i % cols) * (cw + gap), y = y0 + Math.floor(i / cols) * (ch + gap);
      var locked = i >= g.progress.unlocked;
      var stars = g.progress.stars[i] || 0;
      self.btn(g, {
        id: 'lv' + i, x: x, y: y, w: cw, h: ch, color: locked ? '#ced4da' : (stars ? '#fff3c4' : '#ffffff'),
        sel: g.levelSel === i,
        onClick: function () {
          g.levelSel = i;
          if (locked) { Sound.nope(); return; }
          g.startLevel(i);
        },
        icon: function (c, cx, cy) {
          self.text(locked ? '🔒' : String(i + 1), cx, y + 34, 34, locked ? '#6c757d' : '#d62828', 'center');
          self.text(lv.name, cx, y + 72, 17, '#3d2c1e', 'center');
          var st = '';
          for (var k = 0; k < 3; k++) st += k < stars ? '★' : '☆';
          self.text(st, cx, y + 98, 22, stars ? '#f4a300' : '#adb5bd', 'center');
        }
      });
    });
    this.btn(g, { id: 'back', x: 30, y: H - 76, w: 170, h: 56, label: '⬅ Tilbage', size: 22, onClick: function () { g.setState('title'); } });
    this.btn(g, { id: 'free', x: W / 2 - 110, y: H - 76, w: 220, h: 56, label: '🎨 Fri leg', size: 22, onClick: function () { g.startFree(); } });
    this.muteButton(g, W - 90, H - 76);
  },

  // ---------- Sådan gør man ----------
  howto: function (g) {
    var t = g.time, h = g.howto, self = this;
    this.text('Sådan lægger du skinner', W / 2, 44, 40, '#3d2c1e', 'center');
    var panels = [
      { x: 40, y: 80, txt: 'Træk med musen eller fingeren fra toget. Så kommer der skinner.' },
      { x: 560, y: 80, txt: 'Tryk på en skinne for at dreje den. Tryk på et gult sporskifte for at skifte vej.' },
      { x: 40, y: 340, txt: 'Viskelæderet 🧽 eller højreklik fjerner en skinne igen.' },
      { x: 560, y: 340, txt: 'Tryk på Kør! og se toget køre. Hver passager skal hen til stationen med sin farve.' }
    ];
    panels.forEach(function (p, i) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      Draw.rr(ctx, p.x, p.y, 480, 240, 20); ctx.fill();
      self.text(String(i + 1), p.x + 30, p.y + 32, 30, '#d62828', 'center');
      ctx.font = 'bold 20px ' + FONT;
      var lines = wrapText(ctx, p.txt, 400);
      lines.forEach(function (l, k) { self.text(l, p.x + 60, p.y + 172 + k * 26, 20, '#3d2c1e'); });
    });
    // 1: skinner kommer frem
    var a = h.a, n = Math.floor((t * 2.2) % 7);
    for (var x = 1; x < 5; x++) cellAt(a, x, 0).piece = x <= n ? track(1, 3) : null;
    var La = Draw.layout(a, { x: 80, y: 90, w: 420, h: 80 });
    Draw.board(ctx, a, La, { run: createRun(a, { wagons: 1 }), time: t });
    this.hand(La.ox + Math.min(Math.max(n, 0.4), 4.4) * La.cs + La.cs * 0.4, La.oy + La.cs * 0.7, La.cs);
    // 2: drej
    var b = h.b, shape = SHAPES[Math.floor(t / 0.9) % SHAPES.length];
    cellAt(b, 1, 0).piece = track(shape[0], shape[1]);
    var Lb = Draw.layout(b, { x: 640, y: 90, w: 320, h: 80 });
    Draw.board(ctx, b, Lb, { time: t });
    this.hand(Lb.ox + Lb.cs * 1.6, Lb.oy + Lb.cs * 0.75 + Math.abs(Math.sin(t * 3.5)) * -8, Lb.cs);
    // 3: viskelæder
    var c = h.c;
    cellAt(c, 3, 0).piece = Math.sin(t * 3) > 0 ? track(1, 3) : null;
    var Lc = Draw.layout(c, { x: 80, y: 350, w: 420, h: 80 });
    Draw.board(ctx, c, Lc, { run: createRun(c, { wagons: 1 }), time: t });
    this.text('🧽', Lc.ox + Lc.cs * 3.5 + Math.sin(t * 6) * 8, Lc.oy + Lc.cs * 0.45, Lc.cs * 0.55, '#000', 'center');
    // 4: toget kører
    var Ld = Draw.layout(h.d, { x: 680, y: 345, w: 240, h: 130 });
    Draw.board(ctx, h.d, Ld, { run: h.run, time: t });
    this.btn(g, { id: 'ok', x: W / 2 - 130, y: H - 72, w: 260, h: 56, label: 'Forstået! 👍', size: 26, color: '#2a9d8f', onClick: function () { g.closeHowto(); } });
  },

  hand: function (x, y, s) {
    this.text('👆', x, y + s * 0.2, s * 0.6, '#000', 'center');
  },

  // ---------- Bygge / køre ----------
  play: function (g) {
    var t = g.time, b = g.board, L = g.L, self = this;
    var free = g.mode === 'free';
    // topbjælke
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    Draw.rr(ctx, 64, 8, PX - 64 - 16, 56, 14); ctx.fill();
    var title = free ? '🎨 Fri leg' : 'Bane ' + (g.li + 1) + ': ' + LEVELS[g.li].name;
    this.text(title, 84, 36, 26, '#3d2c1e');
    if (!free) {
      var lv = LEVELS[g.li];
      var info = lv.wagons === 1 ? '1 vogn' : lv.wagons + ' vogne';
      if (b.depots.length > 1) info = '2 tog · ' + info + ' hver';
      this.text('🚃 ' + info, PX - 32, 36, 20, '#6c584c', 'right');
    }
    // banen
    var run = g.state === 'build' ? g.preview : g.run;
    var ghost = g.state === 'build' && g.showGhost ? g.ghost : null;
    Draw.board(ctx, b, L, {
      run: run, time: t, ghost: ghost,
      hover: g.state === 'build' && !g.cursorOn ? g.hover : null,
      cursor: g.cursorOn ? g.cursor : null,
      pulseStation: this.pulseMap(g)
    });
    if (ghost && g.ghostPath.length && g.showGhost === true) {
      var path = g.ghostPath, k = (t * 2.5) % (path.length + 3);
      var i = Math.min(path.length - 1, Math.floor(k));
      this.hand(L.ox + path[i].x * L.cs + L.cs * 0.55, L.oy + path[i].y * L.cs + L.cs * 0.55, L.cs);
    }
    this.drawSmoke(g);
    g.floaters.forEach(function (f) {
      ctx.globalAlpha = Math.min(1, f.life * 2);
      self.text(f.text, f.x + 1, f.y + 2, 22, 'rgba(0,0,0,0.3)', 'center');
      self.text(f.text, f.x, f.y, 22, '#fff', 'center');
      ctx.globalAlpha = 1;
    });
    if (g.msg) Draw.bubble(ctx, g.msg.x, g.msg.y, g.msg.text, 20, 340);

    if (free) this.freePanel(g); else this.levelPanel(g);

    if (g.state === 'run' && g.paused) this.overlayText('Pause', 'Tryk på P eller ⏸ for at køre videre');
    if (g.state === 'run' && g.result && g.result.fail) this.failPanel(g);
    if (g.state === 'run' && g.result && g.result.freeWin) this.freeWinPanel(g);
    if (g.state === 'win') this.winPanel(g);
  },

  pulseMap: function (g) {
    var m = {};
    for (var k in g.pulse) if (g.pulse[k] > g.time) m[k] = true;
    return m;
  },

  overlayText: function (big, small) {
    ctx.fillStyle = 'rgba(30,20,10,0.45)';
    Draw.rr(ctx, AREA.x, AREA.y, AREA.w, AREA.h, 16); ctx.fill();
    this.text(big, AREA.x + AREA.w / 2, AREA.y + AREA.h / 2 - 20, 60, '#fff', 'center');
    this.text(small, AREA.x + AREA.w / 2, AREA.y + AREA.h / 2 + 36, 22, '#fff', 'center');
  },

  levelPanel: function (g) {
    var b = g.board, building = g.state === 'build', running = g.state === 'run';
    var lv = LEVELS[g.li], self = this;
    var used = countPieces(b);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    Draw.rr(ctx, PX, 72, PW, 52, 14); ctx.fill();
    this.text('Skinner: ' + used, PX + 14, 90, 22, '#3d2c1e');
    this.text('★★★ ved ' + lv.par + ' eller færre', PX + 14, 112, 15, used <= lv.par ? '#2a9d8f' : '#6c584c', 'left', false);
    var half = (PW - 8) / 2;
    this.btn(g, { id: 'rail', x: PX, y: 134, w: half, h: 62, label: '✏️ Spor', size: 20, active: g.tool === 'rail', disabled: !building, onClick: function () { g.tool = 'rail'; } });
    this.btn(g, { id: 'erase', x: PX + half + 8, y: 134, w: half, h: 62, label: '🧽 Visk', size: 20, active: g.tool === 'erase', disabled: !building, onClick: function () { g.tool = 'erase'; } });
    this.btn(g, {
      id: 'hint', x: PX, y: 206, w: half, h: 54, label: '💡 Hjælp', size: 19, active: !!g.showGhost, disabled: !building,
      onClick: function () { g.showGhost = g.showGhost ? false : true; }
    });
    this.btn(g, {
      id: 'clear', x: PX + half + 8, y: 206, w: half, h: 54, label: '🗑 Ryd', size: 19, disabled: !building,
      onClick: function () { clearTrack(b); Sound.erase(); g.edited(); }
    });
    this.runButtons(g, 276);
    this.btn(g, { id: 'levels', x: PX, y: H - 72, w: PW - 68, h: 56, label: '☰ Baner', size: 22, onClick: function () { g.toLevels(); } });
    this.muteButton(g, PX + PW - 60, H - 72);
  },

  runButtons: function (g, y) {
    var running = g.state === 'run' || g.state === 'win', half = (PW - 8) / 2;
    if (!running) {
      this.btn(g, { id: 'go', x: PX, y: y, w: PW, h: 92, label: '▶ Kør!', size: 38, color: '#2a9d8f', onClick: function () { g.startRun(); } });
    } else {
      this.btn(g, { id: 'go', x: PX, y: y, w: PW, h: 92, label: '🔧 Ret sporet', size: 28, color: '#e76f51', onClick: function () { g.stopRun(); } });
    }
    var waiting = g.run && g.run.trains.some(function (t) { return t.waiting; });
    this.btn(g, {
      id: 'dyt', x: PX, y: y + 104, w: PW, h: 58, label: '📯 Dyt!', size: 26,
      color: waiting && Math.sin(g.time * 8) > 0 ? '#ffd60a' : '#ffffff', disabled: g.state !== 'run',
      onClick: function () { g.dyt(); }
    });
    this.btn(g, { id: 'fast', x: PX, y: y + 172, w: half, h: 50, label: g.fast ? '🐢 Langsom' : '⏩ Hurtig', size: 17, disabled: !running, onClick: function () { g.fast = !g.fast; } });
    this.btn(g, { id: 'pause', x: PX + half + 8, y: y + 172, w: half, h: 50, label: g.paused ? '▶ Videre' : '⏸ Pause', size: 17, disabled: g.state !== 'run', onClick: function () { g.paused = !g.paused; } });
  },

  freePanel: function (g) {
    var building = g.state === 'build', self = this;
    var tools = [
      ['rail', '✏️', 'Spor'], ['erase', '🧽', 'Visk'], ['train', '🚂', 'Tog'],
      ['tree', '🌳', 'Træ'], ['rock', '🪨', 'Klippe'], ['water', '💧', 'Vand'],
      ['house', '🏠', 'Hus'], ['cow', '🐄', 'Ko'], ['clear', '🗑', 'Ryd spor']
    ];
    var bw = (PW - 14) / 3;
    tools.forEach(function (tl, i) {
      var x = PX + (i % 3) * (bw + 7), y = 72 + Math.floor(i / 3) * 62;
      self.btn(g, {
        id: 'ft' + tl[0], x: x, y: y, w: bw, h: 56, label: tl[2], active: g.tool === tl[0], disabled: !building,
        icon: function (c, cx, cy) { self.text(tl[1], cx, cy, 24, '#000', 'center'); },
        onClick: function () {
          if (tl[0] === 'clear') { clearTrack(g.board); Sound.erase(); g.edited(); g.saveFree(); }
          else g.tool = tl[0];
        }
      });
    });
    var sw = (PW - 18) / 4;
    this.text('Stationer', PX + 4, 270, 15, '#3d2c1e');
    this.text('Passagerer', PX + 4, 336, 15, '#3d2c1e');
    for (var k = 0; k < 4; k++) {
      (function (k) {
        var x = PX + k * (sw + 6);
        self.btn(g, {
          id: 'fst' + k, x: x, y: 280, w: sw, h: 46, active: g.tool === 'st' + k, disabled: !building,
          icon: function (c, cx, cy) { Draw.stationSign(c, cx, cy, 60, k, 0); },
          onClick: function () { g.tool = 'st' + k; }
        });
        self.btn(g, {
          id: 'fpa' + k, x: x, y: 346, w: sw, h: 46, active: g.tool === 'pa' + k, disabled: !building,
          icon: function (c, cx, cy) { Draw.person(c, cx, cy - 2, 70, k, 0, false); },
          onClick: function () { g.tool = 'pa' + k; }
        });
      })(k);
    }
    this.runButtons(g, 404);
    this.btn(g, { id: 'menu', x: PX, y: H - 50, w: (PW - 76) / 2, h: 44, label: '☰ Menu', size: 17, onClick: function () { g.back(); } });
    this.btn(g, {
      id: 'new', x: PX + (PW - 76) / 2 + 8, y: H - 50, w: (PW - 76) / 2, h: 44, label: '🧹 Ny', size: 17, disabled: !building,
      onClick: function () { g.board = g.defaultFree(); g.board.allowCross = g.board.allowSwitch = true; g.edited(); g.saveFree(); }
    });
    this.btn(g, { id: 'mute', x: PX + PW - 60, y: H - 50, w: 60, h: 44, label: Sound.muted ? '🔇' : '🔊', size: 22, onClick: function () { g.toggleMute(); } });
  },

  box: function (w, h) {
    var x = AREA.x + (AREA.w - w) / 2, y = AREA.y + (AREA.h - h) / 2;
    ctx.fillStyle = 'rgba(30,20,10,0.35)';
    Draw.rr(ctx, AREA.x, AREA.y, AREA.w, AREA.h, 16); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    Draw.rr(ctx, x + 4, y + 6, w, h, 24); ctx.fill();
    ctx.fillStyle = '#fffdf5';
    Draw.rr(ctx, x, y, w, h, 24); ctx.fill();
    return { x: x, y: y };
  },

  winPanel: function (g) {
    var r = g.result, self = this;
    var p = this.box(540, 330);
    var cx = p.x + 270;
    this.text('Hurra! Alle er kommet frem! 🎉', cx, p.y + 46, 30, '#2a9d8f', 'center');
    for (var i = 0; i < 3; i++) {
      var shown = g.stateTime > 0.5 + i * 0.35;
      var on = i < r.stars && shown;
      var sc = on ? 1 + Math.max(0, 0.4 - (g.stateTime - 0.5 - i * 0.35)) : 1;
      this.text(on ? '★' : '☆', cx + (i - 1) * 90, p.y + 125, 80 * sc, on ? '#f4a300' : '#ced4da', 'center');
    }
    var line = 'Du brugte ' + r.used + ' skinner.';
    if (r.stars < 3) line += ' Kan du klare det med ' + r.par + '?';
    this.text(line, cx, p.y + 196, 20, '#3d2c1e', 'center');
    var last = g.li + 1 >= LEVELS.length;
    this.btn(g, { id: 'next', x: cx - 250, y: p.y + 240, w: 200, h: 62, label: last ? '☰ Baner' : '▶ Næste bane', size: 22, color: '#2a9d8f', sel: true, onClick: function () { g.nextLevel(); } });
    this.btn(g, { id: 'again', x: cx - 40, y: p.y + 240, w: 140, h: 62, label: '🔧 Byg om', size: 20, onClick: function () { g.stopRun(); } });
    this.btn(g, { id: 'lvls', x: cx + 110, y: p.y + 240, w: 140, h: 62, label: '☰ Baner', size: 20, onClick: function () { g.toLevels(); } });
    if (last) this.text('Du har klaret alle baner! Du er en rigtig togfører! 🚂', cx, p.y + 220, 16, '#d62828', 'center');
  },

  failPanel: function (g) {
    var x = AREA.x + AREA.w / 2 - 230, y = AREA.y + AREA.h - 92;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    Draw.rr(ctx, x + 3, y + 5, 460, 80, 20); ctx.fill();
    ctx.fillStyle = '#fffdf5';
    Draw.rr(ctx, x, y, 460, 80, 20); ctx.fill();
    this.text('Det gør ikke noget!', x + 24, y + 28, 22, '#3d2c1e');
    this.text('Ret sporet og prøv igen.', x + 24, y + 56, 18, '#6c584c', 'left', false);
    this.btn(g, { id: 'fix', x: x + 270, y: y + 12, w: 176, h: 56, label: '🔧 Ret sporet', size: 20, color: '#e76f51', sel: true, onClick: function () { g.stopRun(); } });
  },

  freeWinPanel: function (g) {
    var p = this.box(460, 200);
    this.text('Alle er kommet frem! 🎉', p.x + 230, p.y + 60, 30, '#2a9d8f', 'center');
    this.btn(g, { id: 'fwin', x: p.x + 120, y: p.y + 110, w: 220, h: 60, label: '🔧 Byg videre', size: 22, color: '#2a9d8f', sel: true, onClick: function () { g.stopRun(); } });
  }
};

Game.draw = function () { Screens.draw(this); };
