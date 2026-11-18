// Selve spillet: skærme, regler og game loop.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const SMASH_WORDS = ['SMADR!', 'BANG!', 'KABOOM!', 'POW!', 'KRASH!'];

// Skærmen hvor man vælger bane: kort i et gitter, der ruller ved mange baner.
const SELECT_COLS = 4;
const SELECT_ROWS = 2;
const CARD_W = 200;
const CARD_H = 150;
const CARD_GAP = 20;
const THUMB_W = 184;
const THUMB_H = 100;

const Game = {
  state: 'title',
  stateTime: 0,
  t: 0,
  score: 0,
  lives: 3,
  levelIndex: 0,
  menuChoice: 0,   // 0 = start spil, 1 = vælg bane
  selected: 0,     // banen der er markeret på bane-skærmen
  selectTop: 0,    // øverste synlige række på bane-skærmen
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

  startGame(levelIndex = 0) {
    this.score = 0;
    this.lives = 3;
    this.bananaCount = 0;
    this.newHighscore = false;
    this.loadLevel(levelIndex);
  },

  openLevelSelect() {
    this.selected = this.levelIndex;
    this.selectTop = 0;
    this.scrollToSelected();
    this.setState('levelSelect');
  },

  scrollToSelected() {
    const row = Math.floor(this.selected / SELECT_COLS);
    if (row < this.selectTop) this.selectTop = row;
    if (row >= this.selectTop + SELECT_ROWS) this.selectTop = row - SELECT_ROWS + 1;
  },

  moveSelection(dx, dy) {
    const n = LEVELS.length;
    const before = this.selected;
    if (dx) this.selected = (this.selected + dx + n) % n;
    if (dy) {
      const target = this.selected + dy * SELECT_COLS;
      const lastRow = Math.floor((n - 1) / SELECT_COLS);
      if (target >= 0 && target < n) this.selected = target;
      else if (dy > 0 && Math.floor(this.selected / SELECT_COLS) < lastRow) this.selected = n - 1;
    }
    if (this.selected !== before) {
      this.scrollToSelected();
      Sound.tick();
    }
  },

  updateLevelSelect() {
    if (Input.hit('Escape')) { this.setState('title'); return; }
    if (Input.confirm()) { Sound.banana(); this.startGame(this.selected); return; }
    const dx = (Input.hit('ArrowRight', 'KeyD') ? 1 : 0) - (Input.hit('ArrowLeft', 'KeyA') ? 1 : 0);
    const dy = (Input.hit('ArrowDown', 'KeyS') ? 1 : 0) - (Input.hit('ArrowUp', 'KeyW') ? 1 : 0);
    if (dx || dy) this.moveSelection(dx, dy);
  },

  loadLevel(i) {
    this.levelIndex = i;
    this.level = new Level(LEVELS[i]);
    const s = this.level.start;
    const old = this.player;
    this.player = new Player(s.x, s.y);
    this.respawn = { x: s.x, y: s.y };
    this.barrels = [];
    this.bomber = null;
    this.bombs = [];
    this.blasts = [];
    this.bomberWarn = 0;
    this.spentBomb = false;
    this.bomberTimer = this.level.def.bomber.first;
    this.bomberMarks = [0.3, 0.65]; // hurtige aber møder også flyet
    this.flash = 0;
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
        if (Input.hit('ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS')) {
          this.menuChoice = 1 - this.menuChoice;
          Sound.tick();
        } else if (Input.confirm()) {
          Sound.banana();
          if (this.menuChoice === 0) this.startGame();
          else this.openLevelSelect();
        }
        break;
      case 'levelSelect':
        this.updateLevelSelect();
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
    this.flash = Math.max(0, this.flash - dt * 4);
    for (const b of this.blasts) b.t += dt;
    this.blasts = this.blasts.filter((b) => b.t < 0.55);
  },

  // Giver bananer, og et ekstra liv for hver 50.
  addBananas(n) {
    const p = this.player;
    this.levelBananas += n;
    for (let i = 0; i < n; i++) {
      this.bananaCount++;
      if (this.bananaCount % 50 === 0) {
        this.lives++;
        Sound.oneUp();
        Popups.add(p.cx, p.y - 30, 'EKSTRA LIV!', '#ff8fb0', 30);
      }
    }
  },

  nextBomberTime() {
    const [a, b] = this.level.def.bomber.every;
    return a + Math.random() * (b - a);
  },

  // ---------- Bombeflyet ----------
  updateBomber(dt) {
    const L = this.level;
    const p = this.player;
    const cfg = L.def.bomber;

    // Når aben når et bestemt stykke ind på banen, kommer flyet snart
    if (this.bomberMarks.length && p.cx > this.bomberMarks[0] * L.w * TILE) {
      this.bomberMarks.shift();
      this.bomberTimer = Math.min(this.bomberTimer, 1);
    }

    if (this.bomberWarn > 0) {
      this.bomberWarn -= dt;
      if (this.bomberWarn <= 0) {
        this.bomberWarn = 0;
        this.bomber = new Bomber(this.camX + W + BOMBER_HALF + 40, cfg.bombs);
      }
    } else if (!this.bomber && this.bombs.length === 0) {
      this.bomberTimer -= dt;
      if (this.bomberTimer <= 0) {
        // Ingen angreb lige ved målet
        if (L.finish && p.cx > L.finish.x - 680) {
          this.bomberTimer = 3;
        } else {
          this.bomberWarn = BOMBER_WARN;
          Sound.siren();
        }
      }
    }

    const pl = this.bomber;
    if (pl) {
      pl.update(dt);
      pl.putt -= dt;
      const seen = pl.x + BOMBER_HALF > this.camX && pl.x - BOMBER_HALF < this.camX + W;
      if (seen && pl.putt <= 0) { pl.putt = 0.17; Sound.plane(); }

      const target = p.cx + p.vx * 0.55 + pl.aim;
      const limit = p.cx - (pl.dropped ? 420 : 260);
      if (pl.armed && pl.toDrop > 0 && pl.gap <= 0 && pl.x <= target && pl.x > limit && L.groundBelow(pl.x)) {
        this.dropBomb(pl);
      }
      if (pl.x + BOMBER_HALF < this.camX - 80) {
        this.bomber = null;
        if (!pl.dropped) this.bomberTimer = 8;
      }
    }

    for (const b of this.bombs) {
      b.update(dt, L);
      if (b.tick <= 0 && Math.abs(b.cx - p.cx) < 900) {
        b.tick = b.fuse > 2 ? 0.5 : b.fuse > 1 ? 0.25 : 0.11;
        Sound.tick();
      }
      // Hop på bomben, og den bliver sparket væk
      if (b.kickWait <= 0 && overlap(p, b, 4) && p.vy > 0 && p.y + p.h - b.y < 24) {
        p.vy = Input.jumpHeld() ? -820 : -600;
        p.airJumps = 0;
        b.vx = p.facing * 300;
        b.vy = -240;
        b.kickWait = 0.4;
        Sound.boing();
        if (!b.scored) { b.scored = true; this.addScore(50, b.cx, b.y - 10, 'BOING!', '#7fffb0'); }
      }
      if (L.hazardAt(b) || b.y > L.h * TILE + 40) {
        this.fizzle(b);
      } else if (b.fuse <= 0) {
        this.explode(b);
        if (this.state !== 'playing') return;
      }
    }
    this.bombs = this.bombs.filter((b) => b.alive);
    if (this.spentBomb && this.bombs.length === 0) this.bomberTimer = this.nextBomberTime();
    this.spentBomb = false;
  },

  dropBomb(pl) {
    const cfg = this.level.def.bomber;
    const p = this.player;
    const fuse = cfg.fuse[0] + Math.random() * (cfg.fuse[1] - cfg.fuse[0]);
    this.bombs.push(new Bomb(pl.x, pl.y + 62, fuse, cfg.radius));
    pl.toDrop--;
    pl.dropped++;
    pl.gap = 0.55;
    pl.doors = 0.5;
    Sound.bombDrop();
    if (p.energy <= 0) Sound.superOn();
    p.energy = Math.max(p.energy, fuse + ENERGY_AFTER);
    p.energyMax = p.energy;
    if (pl.dropped === 1) Popups.add(p.cx, p.y - 34, 'SUPER-ENERGI! LØB!', '#ffe234', 28);
    Particles.burst(p.cx, p.cy, 18, { color: ['#ffe234', '#fff'], shape: 'star', size: 5, speed: 220, life: 0.6 });
  },

  fizzle(b) {
    b.alive = false;
    this.spentBomb = true;
    Sound.splash();
    Popups.add(b.cx, b.y - 20, 'PFFT!', '#c9f0ff', 28);
    Particles.burst(b.cx, b.cy, 14, { color: ['#ddd', '#999'], size: 6, speed: 110, up: 120, life: 0.8 });
  },

  explode(b) {
    const p = this.player;
    const x = b.cx, y = b.cy, R = b.radius;
    b.alive = false;
    this.spentBomb = true;
    this.blasts.push({ x, y, r: R, t: 0 });
    Popups.add(x, y - 40, 'KABOOM!', '#ffb02e', 58);
    Particles.burst(x, y, 50, { color: ['#ff4a1a', '#ffb02e', '#ffe36b', '#555'], size: 9, speed: R * 1.9, grav: 500, life: 0.9 });
    Particles.burst(x, y, 16, { color: ['#22242c', '#555a66'], shape: 'rect', size: 7, speed: 420, up: 160, grav: 1200, life: 1 });

    for (const o of this.barrels) {
      if (o.alive && Math.hypot(o.x + 15 - x, o.y + 15 - y) < R) this.smash(o, 150);
    }
    for (const c of this.level.cannons) {
      const cx = c.x + 20, cy = c.y + 20;
      if (Math.hypot(cx - x, cy - y) < R) {
        if (c.stun <= 0) this.addScore(150, cx, cy - 30, 'UDE AF DRIFT! +150', '#ffb347');
        c.stun = 8;
      }
    }

    Sound.boom();
    this.shake = 24;
    this.flash = 1;

    const d = Math.hypot(p.cx - x, p.cy - y);
    if (d < R) {
      if (p.star > 0 || p.invuln > 0) {
        Popups.add(p.cx, p.y - 24, 'PYH!', '#7fffb0', 28);
      } else {
        this.hurt({ x: x - 15 });
        p.vx = (p.cx < x ? -1 : 1) * 300;
        p.vy = -620;
        p.soot = 2.5;
        this.shake = 24;
      }
    } else if (d < R + BOMB_NEAR) {
      this.addScore(300, p.cx, p.y - 30, 'PÅ ET HÅR! +300', '#ffe46b');
    }
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
      if (c.stun > 0) {
        c.stun = Math.max(0, c.stun - dt);
        if (Math.random() < dt * 6) Particles.add({ x: c.x + 20, y: c.y, size: 6, color: 'rgba(70,70,70,0.6)', life: 0.8, vy: -45 });
        continue;
      }
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
    if (this.state !== 'playing') return;

    // Bombefly og bomber
    this.updateBomber(dt);
    this.barrels = this.barrels.filter((b) => b.alive);
    if (this.state !== 'playing') return;

    // Bananer
    for (const bn of L.bananas) {
      if (bn.taken) continue;
      const dx = bn.x - p.cx, dy = bn.y - p.cy;
      if (dx * dx + dy * dy < 28 * 28) {
        bn.taken = true;
        this.addBananas(1);
        this.addScore(10);
        Sound.banana();
        Particles.burst(bn.x, bn.y, 6, { color: '#fff36b', shape: 'star', size: 4, speed: 100, life: 0.5 });
      }
    }

    // Guld-bananer
    for (const g of L.golds) {
      if (g.taken) continue;
      const dx = g.x - p.cx, dy = g.y - p.cy;
      if (dx * dx + dy * dy < 32 * 32) {
        g.taken = true;
        this.addBananas(5);
        this.addScore(250, g.x, g.y + 26, 'GULD! +250', '#ffd23b');
        Sound.oneUp();
        Particles.burst(g.x, g.y, 16, { color: ['#ffd23b', '#fff'], shape: 'star', size: 5, speed: 180, life: 0.7 });
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
    p.energy = 0;
    p.invuln = 2;
    this.barrels = this.barrels.filter((b) => Math.abs(b.x - p.x) > 450);
    // Et frisk forsøg: ingen bomber i hovedet lige efter genstart
    this.bombs = this.bombs.filter((b) => Math.abs(b.cx - p.x) > 600);
    this.bomberWarn = 0;
    if (this.bomber) this.bomber.armed = false;
    this.bomberTimer = Math.max(this.bomberTimer, 8);
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
    if (this.state === 'levelSelect') { this.drawLevelSelect(); return; }
    const L = this.level;
    const sx = (Math.random() - 0.5) * this.shake;
    const sy = (Math.random() - 0.5) * this.shake;
    drawBackground(ctx, this.camX, L.theme, this.t);

    ctx.save();
    ctx.translate(Math.round(-this.camX + sx), Math.round(sy));
    if (this.bomber) this.bomber.draw(ctx);
    L.drawTiles(ctx, this.camX, this.t);
    L.drawMovers(ctx, this.t);
    L.drawCheckpoints(ctx, this.t);
    L.drawFinish(ctx, this.t);
    for (const bn of L.bananas) if (!bn.taken) drawBanana(ctx, bn.x, bn.y, this.t);
    for (const g of L.golds) if (!g.taken) drawGoldBanana(ctx, g.x, g.y, this.t);
    for (const it of L.items) if (!it.taken) drawItem(ctx, it, this.t);
    for (const c of L.cannons) drawCannon(ctx, c, this.t);
    for (const b of this.bombs) b.drawZone(ctx, this.t);
    for (const b of this.barrels) b.draw(ctx);
    for (const b of this.bombs) b.draw(ctx, this.t);
    if (this.state === 'levelDone' || this.state === 'win') {
      const p = this.player;
      drawMonkey(ctx, p.cx, p.y + p.h, { facing: 1, dance: true, t: this.t, runPhase: this.t * 12, squash: Math.sin(this.t * 10) * 0.15 });
    } else if (this.state !== 'gameover') {
      this.player.draw(ctx, this.t);
    }
    for (const b of this.blasts) drawBlast(ctx, b);
    Particles.draw(ctx);
    Popups.draw(ctx);
    ctx.restore();

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,245,215,${this.flash * 0.5})`;
      ctx.fillRect(0, 0, W, H);
    }
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

    menuButton(ctx, W / 2 - 125, 405, 230, 44, 'START SPIL', this.menuChoice === 0);
    menuButton(ctx, W / 2 + 125, 405, 230, 44, 'VÆLG BANE', this.menuChoice === 1);
  },

  // Et lille billede af starten på hver bane. Tegnes kun én gang.
  levelThumb(i) {
    if (!this.thumbs) this.thumbs = [];
    if (this.thumbs[i]) return this.thumbs[i];
    const thumb = document.createElement('canvas');
    thumb.width = THUMB_W * 2;
    thumb.height = THUMB_H * 2;
    const c = thumb.getContext('2d');
    c.scale(thumb.width / W, thumb.height / H);
    const L = new Level(LEVELS[i]);
    drawBackground(c, 0, L.theme, 0);
    L.drawTiles(c, 0, 0);
    L.drawMovers(c, 0);
    L.drawCheckpoints(c, 0);
    L.drawFinish(c, 0);
    for (const bn of L.bananas) drawBanana(c, bn.x, bn.y, 0);
    for (const g of L.golds) drawGoldBanana(c, g.x, g.y, 0);
    for (const it of L.items) drawItem(c, it, 0);
    for (const cn of L.cannons) drawCannon(c, cn, 0);
    this.thumbs[i] = thumb;
    return thumb;
  },

  drawLevelSelect() {
    const t = this.t;
    const theme = THEMES[LEVELS[this.selected].theme] || THEMES.jungle;
    drawBackground(ctx, t * 30, theme, t);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, 'VÆLG BANE', W / 2, 46, 50, '#ffd23b', 'center', '#4a2508');

    const x0 = (W - SELECT_COLS * CARD_W - (SELECT_COLS - 1) * CARD_GAP) / 2;
    const y0 = 95;
    const first = this.selectTop * SELECT_COLS;
    const last = Math.min(LEVELS.length, first + SELECT_ROWS * SELECT_COLS);
    for (let i = first; i < last; i++) {
      const col = i % SELECT_COLS;
      const row = Math.floor(i / SELECT_COLS) - this.selectTop;
      const x = x0 + col * (CARD_W + CARD_GAP);
      const y = y0 + row * (CARD_H + CARD_GAP);
      const active = i === this.selected;
      ctx.fillStyle = active ? 'rgba(70,35,100,0.95)' : 'rgba(30,15,50,0.82)';
      roundRect(ctx, x, y, CARD_W, CARD_H, 14);
      ctx.fill();
      ctx.drawImage(this.levelThumb(i), x + 8, y + 8, THUMB_W, THUMB_H);
      ctx.strokeStyle = active ? '#ffd23b' : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = active ? 5 : 2;
      roundRect(ctx, x, y, CARD_W, CARD_H, 14);
      ctx.stroke();
      text(ctx, `${i + 1}. ${LEVELS[i].name}`, x + CARD_W / 2, y + 128, 19, active ? '#ffd23b' : '#fff');
    }

    if (this.selectTop > 0) text(ctx, '▲ flere baner', W / 2, 83, 15, '#fff');
    if (last < LEVELS.length) text(ctx, '▼ flere baner', W / 2, 432, 15, '#fff');
    text(ctx, '← → ↑ ↓ vælg   ·   MELLEMRUM start   ·   ESC tilbage', W / 2, 468, 20, '#ffe46b');
  },
};

Game.init();
