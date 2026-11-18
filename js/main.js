// Selve spillet: skærme, regler og game loop.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const SMASH_WORDS = ['SMADR!', 'BANG!', 'KABOOM!', 'POW!', 'KRASH!'];

const Game = {
  state: 'title',
  stateTime: 0,
  t: 0,
  score: 0,
  lives: 3,
  levelIndex: 0,
  bananaCount: 0,
  highscore: 0,
  camX: 0,
  shake: 0,

  init() {
    try { this.highscore = parseInt(localStorage.getItem('abehop-highscore'), 10) || 0; } catch (e) { this.highscore = 0; }
    Input.init();
    this.titleLevel = new Level(LEVELS[0]);
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      this.update(dt);
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  setState(s) { this.state = s; this.stateTime = 0; },

  saveHighscore() {
    if (this.score > this.highscore) {
      this.highscore = this.score;
      this.newHighscore = true;
      try { localStorage.setItem('abehop-highscore', String(this.highscore)); } catch (e) { /* ingen lagring */ }
    }
  },

  startGame() {
    this.score = 0;
    this.lives = 3;
    this.bananaCount = 0;
    this.newHighscore = false;
    this.loadLevel(0);
  },

  loadLevel(i) {
    this.levelIndex = i;
    this.level = new Level(LEVELS[i]);
    const s = this.level.start;
    const old = this.player;
    this.player = new Player(s.x, s.y);
    this.respawn = { x: s.x, y: s.y };
    this.barrels = [];
    Particles.list = [];
    Popups.list = [];
    this.camX = 0;
    this.levelTime = 0;
    this.levelBananas = 0;
    this.levelStartScore = this.score;
    this.levelStartBananas = this.bananaCount;
    this.setState('intro');
    void old;
  },

  addScore(n, x, y, str, color) {
    this.score += n;
    if (x !== undefined) Popups.add(x, y, str || `+${n}`, color || '#fff');
  },

  update(dt) {
    this.t += dt;
    this.stateTime += dt;
    if (Input.hit('KeyM')) Sound.muted = !Sound.muted;

    switch (this.state) {
      case 'title':
        if (Input.confirm()) this.startGame();
        break;
      case 'intro':
        Particles.update(dt);
        if (this.stateTime > 2 || (this.stateTime > 0.4 && Input.confirm())) this.setState('playing');
        break;
      case 'playing':
        if (Input.hit('KeyP', 'Escape')) { this.setState('paused'); break; }
        this.updatePlay(dt);
        break;
      case 'paused':
        if (Input.hit('KeyP', 'Space', 'Enter')) this.setState('playing');
        else if (Input.hit('Escape')) this.setState('title');
        break;
      case 'levelDone':
        this.updateEffects(dt);
        if (Math.random() < 0.5) this.confetti(1);
        if (this.stateTime > 1.5 && Input.confirm()) {
          if (this.levelIndex + 1 < LEVELS.length) this.loadLevel(this.levelIndex + 1);
          else { this.saveHighscore(); this.setState('win'); Sound.win(); }
        }
        break;
      case 'gameover':
        this.updateEffects(dt);
        if (this.stateTime > 1 && Input.confirm()) {
          // Prøv banen igen med 3 nye liv
          this.score = this.levelStartScore;
          this.bananaCount = this.levelStartBananas;
          this.lives = 3;
          this.loadLevel(this.levelIndex);
        } else if (Input.hit('Escape')) this.setState('title');
        break;
      case 'win':
        Particles.update(dt);
        if (Math.random() < 0.08) this.firework();
        if (this.stateTime > 2 && Input.confirm()) this.setState('title');
        break;
    }
    Input.endFrame();
  },

  updateEffects(dt) {
    Particles.update(dt);
    Popups.update(dt);
    this.shake = Math.max(0, this.shake - dt * 30);
  },

  updatePlay(dt) {
    const L = this.level;
    const p = this.player;
    this.levelTime += dt;
    L.update(dt);
    p.update(dt, L);
    if (p.x > L.w * TILE - p.w) p.x = L.w * TILE - p.w;

    // Faldet ned eller rørt lava/vand?
    const hz = L.hazardAt(p);
    if (p.y > L.h * TILE + 60 || hz) {
      if (hz === '~') { Sound.splash(); Particles.burst(p.cx, p.y + p.h, 16, { color: ['#4fb6ff', '#c9f0ff'], speed: 220, up: 200, grav: 900, life: 0.8 }); }
      if (hz === 'L') Particles.burst(p.cx, p.y + p.h, 16, { color: ['#ff4a1a', '#ffb02e', '#555'], speed: 220, up: 200, grav: 600, life: 0.8 });
      this.loseLife();
      return;
    }

    // Kanoner skyder tønder mod aben
    for (const c of L.cannons) {
      const dx = p.cx - (c.x + 20);
      c.dir = dx < 0 ? -1 : 1;
      c.puff = Math.max(0, c.puff - dt);
      if (Math.abs(dx) < 820 && Math.abs(dx) > 110 && this.barrels.length < 14) {
        c.timer -= dt;
        if (c.timer <= 0) {
          c.timer = L.def.spawnEvery * (0.7 + Math.random() * 0.6);
          const bx = c.dir < 0 ? c.x - 32 : c.x + TILE + 2;
          this.barrels.push(new Barrel(bx, c.y + TILE - 30, c.dir * L.def.barrelSpeed));
          c.puff = 0.3;
          if (Math.abs(dx) < 600) Sound.fire();
          Particles.burst(c.x + 20 + c.dir * 24, c.y + 12, 6, { color: ['#ddd', '#aaa'], size: 6, speed: 60, life: 0.6, up: 30 });
        }
      }
    }

    // Tønder
    for (const b of this.barrels) {
      b.update(dt, L);
      const bz = L.hazardAt(b);
      if (bz || b.y > L.h * TILE + 40 || Math.abs(b.x - p.x) > 1400) {
        if (bz === '~') Particles.burst(b.x + 15, b.y + 30, 8, { color: '#c9f0ff', speed: 160, up: 160, grav: 900, life: 0.6 });
        if (bz === 'L') Particles.burst(b.x + 15, b.y + 30, 8, { color: ['#ffb02e', '#555'], speed: 160, up: 160, grav: 600, life: 0.6 });
        b.alive = false;
        continue;
      }
      if ((p.star > 0 && overlap(p, b, 0)) || p.hammerHits(b)) {
        this.smash(b, p.star > 0 ? 500 : 300);
      } else if (overlap(p, b, 6)) {
        if (p.vy > 0 && p.y + p.h - b.y < 20) {
          p.vy = Input.jumpHeld() ? -820 : -600;
          p.airJumps = 0;
          Sound.boing();
          this.addScore(50, b.x + 15, b.y - 10, 'BOING!', '#7fffb0');
          b.scored = true;
        } else {
          this.hurt(b);
        }
      } else if (!b.scored && !p.onGround && p.y + p.h < b.y + 4 && Math.abs(p.cx - (b.x + 15)) < 16) {
        b.scored = true;
        Sound.hop();
        this.addScore(100, p.cx, p.y - 10, '+100', '#ffe46b');
      }
    }
    this.barrels = this.barrels.filter((b) => b.alive);

    // Bananer
    for (const bn of L.bananas) {
      if (bn.taken) continue;
      const dx = bn.x - p.cx, dy = bn.y - p.cy;
      if (dx * dx + dy * dy < 28 * 28) {
        bn.taken = true;
        this.bananaCount++;
        this.levelBananas++;
        this.addScore(10);
        Sound.banana();
        Particles.burst(bn.x, bn.y, 6, { color: '#fff36b', shape: 'star', size: 4, speed: 100, life: 0.5 });
        if (this.bananaCount % 50 === 0) {
          this.lives++;
          Sound.oneUp();
          Popups.add(p.cx, p.y - 30, 'EKSTRA LIV!', '#ff8fb0', 30);
        }
      }
    }

    // Power-ups
    for (const it of L.items) {
      if (it.taken) continue;
      const dx = it.x - p.cx, dy = it.y - p.cy;
      if (dx * dx + dy * dy < 32 * 32) {
        it.taken = true;
        if (it.type === 'H') p.hammer = 10;
        if (it.type === 'S') p.star = 8;
        if (it.type === 'W') p.feather = true;
        Sound.powerup();
        this.addScore(200, p.cx, p.y - 30, POWERUPS[it.type].name, POWERUPS[it.type].color);
        Particles.burst(it.x, it.y, 16, { color: [POWERUPS[it.type].color, '#fff'], shape: 'star', size: 5, speed: 200, life: 0.7 });
      }
    }

    // Checkpoints
    for (const cp of L.checkpoints) {
      if (!cp.reached && Math.abs(p.cx - (cp.x + 20)) < 24 && p.y + p.h > cp.y - 40) {
        cp.reached = true;
        this.respawn = { x: cp.x + 7, y: cp.y + TILE - 36 };
        Sound.checkpoint();
        Popups.add(cp.x + 20, cp.y - 60, 'CHECKPOINT!', '#7fffb0', 26);
        Particles.burst(cp.x + 20, cp.y - 40, 14, { color: ['#3ddc5a', '#fff36b'], shape: 'star', size: 4, speed: 160, life: 0.7 });
      }
    }

    // Mål!
    if (L.finish && overlap(p, L.finish)) {
      this.levelComplete();
      return;
    }

    // Kamera følger aben
    const target = p.cx - W * 0.4;
    this.camX += (target - this.camX) * Math.min(1, dt * 7);
    this.camX = Math.max(0, Math.min(this.camX, L.w * TILE - W));

    this.updateEffects(dt);
  },

  smash(b, pts) {
    b.alive = false;
    Sound.smash();
    this.shake = 9;
    const word = SMASH_WORDS[Math.floor(Math.random() * SMASH_WORDS.length)];
    this.addScore(pts, b.x + 15, b.y - 10, `${word} +${pts}`, '#ffb347');
    Particles.burst(b.x + 15, b.y + 15, 14, { color: ['#b5743a', '#5a3416', '#7a4a20'], shape: 'rect', size: 6, speed: 300, up: 150, grav: 1200, life: 1 });
    Particles.burst(b.x + 15, b.y + 15, 6, { color: '#fff36b', shape: 'star', size: 6, speed: 180, life: 0.5 });
  },

  hurt(b) {
    const p = this.player;
    if (p.invuln > 0 || p.star > 0) return;
    this.lives--;
    p.invuln = 2;
    p.vy = -450;
    p.vx = (p.cx < b.x + 15 ? -1 : 1) * 300;
    this.shake = 10;
    Sound.hurt();
    Popups.add(p.cx, p.y - 20, 'AV!', '#ff6b6b', 30);
    if (this.lives <= 0) this.gameOver();
  },

  loseLife() {
    const p = this.player;
    this.lives--;
    this.shake = 10;
    Sound.hurt();
    if (this.lives <= 0) { this.gameOver(); return; }
    p.x = this.respawn.x;
    p.y = this.respawn.y;
    p.vx = 0;
    p.vy = 0;
    p.star = 0;
    p.invuln = 2;
    this.barrels = this.barrels.filter((b) => Math.abs(b.x - p.x) > 450);
  },

  gameOver() {
    this.lives = 0;
    this.saveHighscore();
    Sound.gameOver();
    this.setState('gameover');
  },

  levelComplete() {
    const timeBonus = Math.max(0, Math.round(150 - this.levelTime)) * 10;
    const bananaBonus = this.levelBananas * 20;
    this.bonus = { base: 1000, time: timeBonus, bananas: bananaBonus };
    this.score += 1000 + timeBonus + bananaBonus;
    this.saveHighscore();
    Sound.levelDone();
    this.confetti(80);
    this.setState('levelDone');
  },

  confetti(n) {
    for (let i = 0; i < n; i++) {
      Particles.add({
        x: this.camX + Math.random() * W, y: -10 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 60, vy: 80 + Math.random() * 120,
        vr: (Math.random() - 0.5) * 10, shape: 'rect', size: 5, life: 4,
        color: `hsl(${Math.random() * 360},90%,60%)`,
      });
    }
  },

  firework() {
    const x = this.camX + 100 + Math.random() * (W - 200);
    const y = 80 + Math.random() * 200;
    const hue = Math.random() * 360;
    Particles.burst(x, y, 30, { color: [`hsl(${hue},100%,65%)`, `hsl(${hue + 40},100%,75%)`, '#fff'], shape: 'star', size: 4, speed: 260, grav: 200, life: 1.3 });
    Sound.tone(200 + Math.random() * 400, 0.3, 'triangle', 0.05, 80);
  },

  // ---------- Tegning ----------
  draw() {
    if (this.state === 'title') { this.drawTitle(); return; }
    const L = this.level;
    const sx = (Math.random() - 0.5) * this.shake;
    const sy = (Math.random() - 0.5) * this.shake;
    drawBackground(ctx, this.camX, L.theme, this.t);

    ctx.save();
    ctx.translate(Math.round(-this.camX + sx), Math.round(sy));
    L.drawTiles(ctx, this.camX, this.t);
    L.drawMovers(ctx, this.t);
    L.drawCheckpoints(ctx, this.t);
    L.drawFinish(ctx, this.t);
    for (const bn of L.bananas) if (!bn.taken) drawBanana(ctx, bn.x, bn.y, this.t);
    for (const it of L.items) if (!it.taken) drawItem(ctx, it, this.t);
    for (const c of L.cannons) drawCannon(ctx, c, this.t);
    for (const b of this.barrels) b.draw(ctx);
    if (this.state === 'levelDone' || this.state === 'win') {
      const p = this.player;
      drawMonkey(ctx, p.cx, p.y + p.h, { facing: 1, dance: true, t: this.t, runPhase: this.t * 12, squash: Math.sin(this.t * 10) * 0.15 });
    } else if (this.state !== 'gameover') {
      this.player.draw(ctx, this.t);
    }
    Particles.draw(ctx);
    Popups.draw(ctx);
    ctx.restore();

    drawHUD(ctx, this);
    this.drawOverlay();
  },

  drawOverlay() {
    const t = this.stateTime;
    if (this.state === 'intro') {
      const s = Math.min(1, t * 3);
      panel(ctx, W / 2 - 250, 170, 500, 150);
      text(ctx, `BANE ${this.levelIndex + 1}`, W / 2, 215, 30 * s, '#ffd23b');
      text(ctx, this.level.def.name, W / 2, 268, 50 * s, '#fff');
    } else if (this.state === 'paused') {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, W, H);
      panel(ctx, W / 2 - 220, 170, 440, 170);
      text(ctx, 'PAUSE', W / 2, 220, 48, '#ffd23b');
      text(ctx, 'P = spil videre', W / 2, 275, 22);
      text(ctx, 'ESC = til forsiden', W / 2, 308, 22);
    } else if (this.state === 'levelDone') {
      panel(ctx, W / 2 - 260, 110, 520, 290);
      text(ctx, 'BANE KLARET!', W / 2 + Math.sin(this.t * 6) * 4, 155, 46, '#ffd23b');
      const lines = [
        ['Bane klaret', this.bonus.base],
        ['Hurtig-bonus', this.bonus.time],
        [`Bananer (${this.levelBananas})`, this.bonus.bananas],
      ];
      lines.forEach(([label, val], i) => {
        if (t > 0.4 + i * 0.35) {
          text(ctx, label, W / 2 - 200, 215 + i * 40, 24, '#fff', 'left');
          text(ctx, `+${val}`, W / 2 + 200, 215 + i * 40, 24, '#7fffb0', 'right');
        }
      });
      if (t > 1.5) {
        text(ctx, `POINT: ${this.score}`, W / 2, 340, 28, '#fff');
        if (Math.floor(this.t * 2) % 2 === 0) text(ctx, 'Tryk MELLEMRUM for næste bane', W / 2, 378, 20, '#ffe46b');
      }
    } else if (this.state === 'gameover') {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, W, H);
      panel(ctx, W / 2 - 260, 130, 520, 260);
      text(ctx, 'ØV! GAME OVER', W / 2, 180, 46, '#ff6b6b');
      drawMonkey(ctx, W / 2, 290, { facing: 1, t: this.t, air: false, squash: 0.2 });
      text(ctx, `POINT: ${this.score}`, W / 2, 315, 26, '#fff');
      if (t > 1 && Math.floor(this.t * 2) % 2 === 0) text(ctx, 'MELLEMRUM = prøv banen igen', W / 2, 352, 20, '#ffe46b');
      text(ctx, 'ESC = forsiden', W / 2, 376, 16, '#ccc');
    } else if (this.state === 'win') {
      panel(ctx, W / 2 - 300, 100, 600, 300);
      text(ctx, 'DU VANDT!', W / 2 + Math.sin(this.t * 5) * 6, 160, 64, '#ffd23b');
      text(ctx, 'Alle bananerne er reddet!', W / 2, 220, 26, '#fff');
      text(ctx, `POINT: ${this.score}`, W / 2, 275, 34, '#7fffb0');
      if (this.newHighscore) text(ctx, 'NY HIGHSCORE!', W / 2, 320, 28, '#ff8fb0');
      if (t > 2 && Math.floor(this.t * 2) % 2 === 0) text(ctx, 'Tryk MELLEMRUM', W / 2, 365, 20, '#ffe46b');
    }
  },

  drawTitle() {
    const t = this.t;
    const camX = t * 70;
    drawBackground(ctx, camX, THEMES.jungle, t);
    // jord
    ctx.save();
    ctx.translate(-(camX % TILE), 0);
    for (let c = 0; c <= W / TILE + 1; c++) {
      this.titleLevel.drawSolid(ctx, c * TILE, 440, c, 11, THEMES.jungle, t);
      this.titleLevel.drawSolid(ctx, c * TILE, 480, c, 12, THEMES.jungle, t);
    }
    ctx.restore();

    // Abe der hopper over tønder
    const mx = 150;
    const phase = (t % 2.4) / 2.4;
    const bx = W + 40 - phase * (W + 120);
    const prog = (mx + 110 - bx) / 220;
    const jump = prog > 0 && prog < 1 ? Math.sin(prog * Math.PI) * 110 : 0;
    drawBarrel(ctx, bx, 425, -t * 9);
    drawMonkey(ctx, mx, 440 - jump, { facing: 1, t, runPhase: t * 12, air: jump > 0, flip: 0 });

    // Titel
    const title = 'ABE-HOP';
    ctx.save();
    for (let i = 0; i < title.length; i++) {
      const lx = W / 2 - 165 + i * 55;
      const ly = 95 + Math.sin(t * 4 + i * 0.6) * 10;
      text(ctx, title[i], lx, ly, 84, `hsl(${40 + i * 12},100%,60%)`, 'center', '#4a2508');
    }
    ctx.restore();
    text(ctx, 'Det store tønde-eventyr', W / 2, 160, 28, '#fff');

    panel(ctx, W / 2 - 250, 195, 500, 175);
    text(ctx, '← →  løb       ↑ / MELLEMRUM  hop', W / 2, 225, 21);
    text(ctx, 'Hop over tønderne og find målet!', W / 2, 260, 21, '#ffe46b');
    drawHammerIcon(ctx, W / 2 - 190, 302, 0.9, 0.3);
    text(ctx, 'smadr', W / 2 - 155, 302, 17, '#fff', 'left');
    drawStarShape(ctx, W / 2 - 70, 302, 13, 0, '#ffe234', '#c79a00');
    text(ctx, 'super-abe', W / 2 - 50, 302, 17, '#fff', 'left');
    drawFeather(ctx, W / 2 + 70, 302, 0.9, 0);
    text(ctx, 'dobbelthop', W / 2 + 90, 302, 17, '#fff', 'left');
    text(ctx, `Highscore: ${this.highscore}`, W / 2, 345, 20, '#7fffb0');

    if (Math.floor(t * 2) % 2 === 0) text(ctx, 'Tryk MELLEMRUM for at starte!', W / 2, 405, 26, '#fff');
  },
};

Game.init();
