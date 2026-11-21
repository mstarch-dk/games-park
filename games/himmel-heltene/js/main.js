// Selve spillet: regler, tilstande og game loop.
const LEVEL_COUNT = THEMES.length; // 5 baner
const EXTRA_LIFE_EVERY = 20000;
const START_RESERVES = 3;

const Game = {
  state: 'title',
  stateTime: 0,
  t: 0,
  players: [],
  enemies: [],
  friends: [],
  groups: new Map(),
  boss: null,
  level: 0,
  loop: 0,
  score: 0,
  highscore: 0,
  newHigh: false,
  reserves: START_RESERVES,
  nextLife: EXTRA_LIFE_EVERY,
  shakeAmt: 0,
  banner: null,
  rescueT: 0,
  overT: 0,
  diff: { level: 0, shooterChance: 0.25, bulletSpeed: 170, fireMul: 1 },
  hpScale: 1,

  init() {
    try { this.highscore = parseInt(localStorage.getItem('himmelheltene-highscore'), 10) || 0; } catch (e) { this.highscore = 0; }
    Input.init();
    Background.init(0);
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

  // ---------- Start og baner ----------

  startGame(n) {
    this.players = n === 1 ? [new Player(0, 'solo', 1)] : [new Player(0, 'p1', 2), new Player(1, 'p2', 2)];
    this.score = 0;
    this.newHigh = false;
    this.reserves = START_RESERVES;
    this.nextLife = EXTRA_LIFE_EVERY;
    this.level = 0;
    this.loop = 0;
    Particles.clear();
    Pickups.clear();
    this.startLevel();
    Sound.start();
    Sound.engineStart();
  },

  startLevel() {
    const L = this.level, lp = this.loop;
    this.diff = {
      level: L,
      shooterChance: Math.min(0.85, 0.22 + L * 0.1 + lp * 0.15),
      bulletSpeed: 165 + L * 15 + lp * 35,
      fireMul: 1 + L * 0.18 + lp * 0.35,
    };
    this.hpScale = (1 + L * 0.1 + lp * 0.5) * (this.players.length === 2 ? 1.25 : 1);
    Background.setTheme(L);
    Levels.start();
    this.enemies = [];
    this.friends = [];
    this.groups = new Map();
    this.boss = null;
    Bullets.clear();
    this.showBanner(`Bane ${L + 1}${lp ? ' +' : ''}`, THEMES[L].name);
    this.setState('playing');
  },

  showBanner(text, sub = '') { this.banner = { text, sub, t: 0, dur: 2.8 }; },
  shake(n) { this.shakeAmt = Math.max(this.shakeAmt, n); },
  spawn(e) { this.enemies.push(e); },

  nearestPlayer(x, y) {
    let best = null, bd = 1e9;
    for (const p of this.players) {
      if (!p.alive) continue;
      const d = dist(x, y, p.x, p.y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  },

  addScore(n, x, y, show = true) {
    this.score += n;
    if (show && x !== undefined) Particles.text(x, y, `+${n}`, '#fff', n >= 500 ? 26 : 18);
    while (this.score >= this.nextLife) {
      this.nextLife += EXTRA_LIFE_EVERY;
      this.reserves++;
      Sound.oneUp();
      this.showBanner('Ekstra fly!', 'Godt gået!');
      const w = this.players.find((p) => p.waiting);
      if (w) { this.reserves--; w.waiting = false; w.respawnT = 1.5; }
    }
  },

  // ---------- Hændelser ----------

  onPlayerDown(p) {
    if (this.reserves > 0) {
      this.reserves--;
      p.respawnT = 2.5;
    } else {
      p.waiting = true;
      this.rescueT = 4;
    }
  },

  rescue(by) {
    const w = this.players.find((p) => p.waiting);
    if (!w) { this.addScore(1000, by.x, by.y); return; }
    w.waiting = false;
    w.spawn();
    w.x = by.x;
    Sound.oneUp();
    this.showBanner('Reddet!', `Spiller ${w.index + 1} er tilbage`);
  },

  onEnemyKilled(e) {
    if (!e.group) return;
    const g = this.groups.get(e.group);
    if (!g) return;
    g.killed++;
    if (g.killed === g.total) {
      this.addScore(500, e.x, e.y - 30);
      Particles.text(e.x, e.y - 60, 'Hele flokken!', '#ffd166', 24);
      Pickups.coins(e.x, e.y, 3);
      if (Math.random() < 0.35) Pickups.dropPowerUp(e.x, e.y);
      this.groups.delete(e.group);
    }
  },

  // Venne-eskadrillen: tre venlige fly suser over skærmen og rydder op
  special(p) {
    Sound.special();
    this.shake(10);
    for (let i = 0; i < 3; i++) {
      this.friends.push({ x: W * (0.25 + i * 0.25), y: H + 80 + Math.abs(i - 1) * 70, prop: 0 });
    }
    for (const b of Bullets.enemy) {
      Particles.sparks(b.x, b.y, 2, '#fff3b0');
      Particles.add({ kind: 'text', x: b.x, y: b.y, vx: 0, vy: -40, str: '★', color: '#ffd166', size: 18, life: 0.6, t: 0 });
      this.score += 10;
    }
    Bullets.enemy = [];
    for (const e of this.enemies) if (e.active && e.y > -20) e.hit(6);
    if (this.boss) this.boss.damage(this.boss.hpMax * 0.06);
    p.invT = Math.max(p.invT, 1.5);
    Particles.text(W / 2, H / 2, 'Venne-fly!', '#b9fbc0', 44);
  },

  onBossDefeated() {
    this.addScore(5000 * (this.loop + 1), W / 2, 260);
    for (const p of this.players) if (p.alive) p.heal(2);
    Sound.levelClear();
    this.setState('levelclear');
  },

  gameOver() {
    Sound.engineStop();
    Sound.gameOver();
    this.saveHighscore();
    this.setState('gameover');
  },

  saveHighscore() {
    if (this.score > this.highscore) {
      this.highscore = this.score;
      this.newHigh = true;
      try { localStorage.setItem('himmelheltene-highscore', String(this.score)); } catch (e) { /* ingen lagring */ }
    }
  },

  toTitle() {
    Sound.engineStop();
    this.saveHighscore();
    this.players = [];
    this.enemies = [];
    this.boss = null;
    Bullets.clear();
    Pickups.clear();
    Particles.clear();
    Background.setTheme(0);
    this.setState('title');
  },

  // ---------- Opdatering ----------

  update(dt) {
    this.t += dt;
    this.stateTime += dt;
    if (Input.hit('KeyM')) {
      const muted = Sound.toggleMute();
      if (!muted && (this.state === 'playing' || this.state === 'levelclear')) Sound.engineStart();
    }

    switch (this.state) {
      case 'title':
        Background.update(dt);
        Particles.update(dt);
        Menu.updateTitle();
        break;
      case 'playing':
        if (Input.hit('KeyP')) { this.setState('paused'); Sound.engineStop(); break; }
        if (Input.hit('Escape')) { this.toTitle(); break; }
        this.updatePlay(dt);
        break;
      case 'paused':
        if (Input.hit('KeyP')) { this.setState('playing'); Sound.engineStart(); }
        else if (Input.hit('Escape')) this.toTitle();
        break;
      case 'levelclear':
        if (Input.hit('Escape')) { this.toTitle(); break; }
        this.updatePlay(dt);
        if (this.stateTime > 4.5) {
          this.level++;
          if (this.level >= LEVEL_COUNT) {
            this.level = LEVEL_COUNT - 1;
            this.saveHighscore();
            Sound.victory();
            this.setState('victory');
          } else {
            this.startLevel();
          }
        }
        break;
      case 'victory':
        this.updatePlay(dt);
        if (this.stateTime > 2 && (Input.confirm())) {
          this.level = 0;
          this.loop++;
          this.startLevel();
        } else if (Input.hit('Escape')) this.toTitle();
        break;
      case 'gameover':
        Background.update(dt);
        Particles.update(dt);
        Pickups.update(dt);
        Bullets.update(dt);
        for (const e of this.enemies) e.update(dt);
        this.enemies = this.enemies.filter((e) => !e.dead);
        if (this.stateTime > 1.2 && Input.confirm()) this.startGame(this.players.length);
        else if (Input.hit('Escape')) this.toTitle();
        break;
    }
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t > this.banner.dur) this.banner = null;
    }
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 40);
    Input.endFrame();
  },

  updatePlay(dt) {
    Background.update(dt);
    const solo = this.players.length === 1;
    for (const p of this.players) p.update(dt, Input.control(solo ? 'solo' : p.keyset));
    if (this.state === 'playing') Levels.update(dt);
    for (const e of this.enemies) e.update(dt);
    if (this.boss) {
      this.boss.update(dt);
      if (this.boss.dead) this.boss = null;
    }
    for (const f of this.friends) {
      f.y -= 900 * dt;
      f.prop += dt * 50;
      if (Math.random() < 0.5) Particles.smoke(f.x, f.y + 30, 1, 8, '#ffffff');
    }
    this.friends = this.friends.filter((f) => f.y > -100);
    Bullets.update(dt);
    Pickups.update(dt);
    Particles.update(dt);
    this.collisions();
    this.enemies = this.enemies.filter((e) => !e.dead);

    // redningskrans til en spiller der venter (kun med 2 spillere)
    if (this.players.some((p) => p.waiting) && this.players.some((p) => p.alive)) {
      this.rescueT -= dt;
      if (this.rescueT <= 0 && !Pickups.has('rescue')) {
        Pickups.spawn('rescue', rand(120, W - 120), -30);
        this.rescueT = 10;
      }
    }

    // game over når ingen fly er tilbage
    if (this.state === 'playing' && this.players.every((p) => !p.alive && p.respawnT <= 0)) {
      this.overT += dt;
      if (this.overT > 2) { this.overT = 0; this.gameOver(); }
    } else this.overT = 0;
  },

  collisions() {
    const alive = this.players.filter((p) => p.alive);
    // spillernes skud mod fjender og boss
    for (const b of Bullets.player) {
      for (const e of this.enemies) {
        if (!e.active || e.y < -10) continue;
        if (dist(b.x, b.y, e.x, e.y) < e.r + b.r) {
          e.hit(b.dmg);
          b.dead = true;
          Particles.sparks(b.x, b.y, 2);
          break;
        }
      }
      if (!b.dead && this.boss && this.boss.hit(b.dmg, b.x, b.y)) {
        b.dead = true;
        Particles.sparks(b.x, b.y, 2);
      }
    }
    // fjendeskud mod spillerne (lille hitboks = cockpittet)
    for (const b of Bullets.enemy) {
      for (const p of alive) {
        if (dist(b.x, b.y, p.x, p.y) < b.r + 11) {
          b.dead = true;
          p.hurt();
          break;
        }
      }
    }
    // sammenstød med fjendefly
    for (const e of this.enemies) {
      if (!e.active || e.harmless || e.ground) continue;
      for (const p of alive) {
        if (dist(e.x, e.y, p.x, p.y) < e.r * 0.7 + 16) {
          if (p.hurt() || p.shieldT > 0) e.hit(5);
        }
      }
    }
    if (this.boss) {
      for (const p of alive) if (this.boss.touches(p.x, p.y)) p.hurt();
    }
  },

  // ---------- Tegning ----------

  draw() {
    ctx.save();
    if (this.shakeAmt > 0) ctx.translate(rand(-1, 1) * this.shakeAmt, rand(-1, 1) * this.shakeAmt);
    Background.draw();

    if (this.state === 'title') {
      Particles.draw();
      Background.drawTop();
      ctx.restore();
      Menu.drawTitle();
      return;
    }

    for (const e of this.enemies) if (e.ground) e.draw();
    Particles.drawChutes();
    for (const e of this.enemies) e.drawShadow();
    if (this.boss) this.boss.drawShadow();
    for (const p of this.players) p.drawShadow();
    Pickups.draw();
    if (this.boss) this.boss.draw();
    for (const e of this.enemies) if (!e.ground) e.draw();
    Bullets.drawPlayer();
    for (const p of this.players) p.draw();
    for (const f of this.friends) {
      drawPlane({ x: f.x, y: f.y, scale: 0.8, look: { body: '#2a9d8f', wing: '#ffffff', stripe: '#2a9d8f', nose: '#ffd166' }, prop: f.prop });
    }
    Bullets.drawEnemy();
    Particles.draw();
    Background.drawTop();
    ctx.restore();

    HUD.draw();
    this.drawBanner();
    if (this.state === 'paused') Menu.drawPause();
    else if (this.state === 'gameover') Menu.drawGameOver();
    else if (this.state === 'levelclear') Menu.drawLevelClear();
    else if (this.state === 'victory') Menu.drawVictory();
  },

  drawBanner() {
    const b = this.banner;
    if (!b) return;
    const pop = Math.min(1, b.t * 5);
    const fade = Math.min(1, (b.dur - b.t) * 2);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(W / 2, H * 0.36);
    ctx.scale(0.6 + pop * 0.4, 0.6 + pop * 0.4);
    Draw.text(b.text, 0, 0, 64, '#ffd166');
    if (b.sub) Draw.text(b.sub, 0, 58, 30, '#fff');
    ctx.restore();
  },
};

Game.init();
