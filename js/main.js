// Selve spillet: spilformer, regler og game loop.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const NO_CTRL = { left: false, right: false, thrust: false, fire: false, special: false };
const DUEL_MODES = ['duel', 'duelAI', 'demo'];
const WINS_NEEDED = 3; // bedst af 5 runder

const Game = {
  state: 'title',
  stateTime: 0,
  t: 0,
  mode: 'demo',
  difficulty: 1,
  showVector: true,
  players: [],
  ships: [],
  projectiles: [],
  clouds: [],
  pickups: [],
  pilots: new Map(),
  planet: null,
  base: null,
  canFire: true,
  score: 0,
  highscore: 0,
  newHigh: false,
  nextLife: 10000,
  banner: null,
  slowmo: 0,
  roundEndT: 0,
  gameOverT: 0,
  round: 0,
  roundWinner: null,
  _hit: null,

  init() {
    try { this.highscore = parseInt(localStorage.getItem('rumduel-highscore'), 10) || 0; } catch (e) { this.highscore = 0; }
    Input.init();
    Starfield.init();
    this.startDemo();
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
  get isDuel() { return DUEL_MODES.includes(this.mode); },
  get humanCount() { return this.players.filter((p) => !p.ai).length; },

  // ---------- Hjælpere som skibe, skud og computer bruger ----------

  hittables() {
    if (!this._hit) {
      this._hit = this.ships.filter((s) => s.alive);
      if (this.base) this._hit.push(...this.base.parts);
    }
    return this._hit;
  },

  nearestTarget(from, team, maxDist = 1e9) {
    let best = null, bd = maxDist;
    for (const h of this.hittables()) {
      if (h.team === team || !h.alive || h.cloaked) continue;
      if (h.kind === 'core' && this.base && this.base.shielded) continue;
      const d = V.dist(from, h);
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  },

  inCloud(o, team, kind) {
    for (const c of this.clouds) if (c.kind === kind && c.team !== team && c.contains(o)) return c;
    return null;
  },

  threatNear(s, r) {
    return this.projectiles.some((p) => p.team !== s.team && V.dist(p, s) < r);
  },

  showBanner(text, sub = '', dur = 2) { this.banner = { text, sub, t: 0, dur }; },

  addScore(n, x, y) {
    if (this.isDuel) return;
    this.score += n;
    if (x !== undefined) Fx.text(x, y, `+${n}`, '#ffe35a', 24);
    if (this.score >= this.nextLife) {
      this.nextLife += 10000;
      for (const p of this.players) p.lives++;
      Sound.oneUp();
      this.showBanner('EKSTRA LIV!', 'Alle spillere får et liv mere', 2);
    }
  },

  saveHighscore() {
    this.newHigh = false;
    if (this.score > this.highscore) {
      this.highscore = this.score;
      this.newHigh = true;
      try { localStorage.setItem('rumduel-highscore', String(this.highscore)); } catch (e) { /* ingen lagring */ }
    }
  },

  // ---------- Opsætning af spilformer ----------

  resetWorld() {
    this.ships = [];
    this.projectiles = [];
    this.clouds = [];
    this.pickups = [];
    this.pilots = new Map();
    this.base = null;
    this._hit = null;
    Particles.list = [];
    this.planet = new Planet(pick(PLANET_TYPES));
    this.banner = null;
    this.slowmo = 0;
    this.roundEndT = 0;
    this.gameOverT = 0;
  },

  teamOf(pl) { return this.isDuel ? `p${pl.index}` : 'players'; },

  spawnPlayer(pl, x, y, angle, inv = 0) {
    const s = new Ship(SHIP_DEFS[pl.shipIdx], { x, y, angle, team: this.teamOf(pl), player: pl.index, inv });
    pl.ship = s;
    this.ships.push(s);
    if (pl.ai) this.pilots.set(s, new AIPilot(s, pl.skill));
    return s;
  },

  // Demo-kamp der kører bag titelskærmen
  startDemo() {
    this.mode = 'demo';
    const a = Math.floor(Math.random() * SHIP_DEFS.length);
    let b = Math.floor(Math.random() * SHIP_DEFS.length);
    if (b === a) b = (b + 1) % SHIP_DEFS.length;
    this.players = [
      { index: 0, ai: true, skill: 1, shipIdx: a, wins: 0 },
      { index: 1, ai: true, skill: 1, shipIdx: b, wins: 0 },
    ];
    this.startRound();
    this.setState('title');
  },

  // Kaldes fra menuen når man har valgt spilform
  chooseMode(mode) {
    this.mode = mode;
    this.round = 0;
    const keep = this.players.map((p) => p.shipIdx);
    const mk = (i, keyset, ai = false) => ({ index: i, keyset, ai, skill: this.difficulty, shipIdx: keep[i] ?? i, wins: 0, lives: 3, respawnT: 0 });
    if (mode === 'duel' || mode === 'coop') this.players = [mk(0, 'p1'), mk(1, 'p2')];
    else if (mode === 'duelAI') this.players = [mk(0, 'solo'), mk(1, null, true)];
    else this.players = [mk(0, 'solo')];
    this.players[0].shipIdx = 0;
    if (this.players[1]) this.players[1].shipIdx = 1;
    Menu.openSelect(this);
  },

  // Kaldes fra skib-vælgeren når alle er klar
  startMatch() {
    if (this.isDuel) {
      if (this.round === 0) for (const p of this.players) p.wins = 0;
      const cpu = this.players.find((p) => p.ai);
      if (cpu) cpu.shipIdx = Math.floor(Math.random() * SHIP_DEFS.length);
      this.round++;
      this.startRound();
      this.setState('countdown');
      Sound.select();
    } else {
      this.startWaves();
    }
  },

  startRound() {
    this.resetWorld();
    const c = this.planet;
    const [p0, p1] = this.players;
    const a = Math.atan2(900, 2000);
    this.spawnPlayer(p0, c.x - 1000, c.y - 450, a);
    this.spawnPlayer(p1, c.x + 1000, c.y + 450, a + Math.PI);
    Camera.reset(c.x, c.y, 0.4);
    Camera.follow(this.ships, 0, true);
  },

  startWaves() {
    this.resetWorld();
    this.score = 0;
    this.nextLife = 10000;
    const c = this.planet;
    this.players.forEach((p, i) => {
      p.lives = 3;
      p.respawnT = 0;
      this.spawnPlayer(p, c.x - 750, c.y + (i === 0 ? -160 : 160), 0);
    });
    Camera.reset(c.x - 750, c.y, 0.6);
    Waves.start(this);
    this.setState('playing');
  },

  // ---------- Hændelser ----------

  onShipDestroyed(ship, source) {
    const isPlayer = ship.player !== undefined;
    if (this.isDuel) {
      if (!this.roundEndT) { this.roundEndT = 2.6; this.slowmo = 1.3; }
      return;
    }
    if (!isPlayer) {
      this.addScore(ship.def.score || 100, ship.x, ship.y - 20);
      if (Math.random() < 0.12) this.pickups.push(new Pickup(ship.x, ship.y, Math.random() < 0.7 ? 'repair' : 'energy'));
    } else {
      const pl = this.players[ship.player];
      pl.lives--;
      if (pl.lives > 0) pl.respawnT = 3;
      else Fx.text(ship.x, ship.y - 60, 'UDE!', P_COLORS[pl.index], 32);
      const anyLeft = this.players.some((p) => p.lives > 0);
      if (!anyLeft) this.gameOverT = 2.5;
    }
  },

  onBasePartDestroyed(part, source) {
    const b = this.base;
    if (!b) return;
    if (part.kind === 'turret') {
      Fx.explosion(part.x, part.y, 1);
      Sound.boom();
      Camera.addShake(8);
      this.addScore(300, part.x, part.y - 30);
      if (!b.shielded) {
        this.showBanner('SKJOLDET ER NEDE!', 'Skyd på det store øje!', 2.5);
        Sound.alarm();
      }
    } else {
      for (let i = 0; i < 7; i++) {
        const a = Math.random() * TAU, r = rand(0, 110);
        Fx.explosion(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, rand(1.2, 2.4));
      }
      Fx.text(b.x, b.y - 60, 'RUMBASEN ER SPRÆNGT!', '#ffe35a', 40, 2);
      Sound.boom();
      Camera.addShake(18);
      this.addScore(2000 * Math.max(1, Waves.wave / 5), b.x, b.y);
      for (let i = 0; i < 3; i++) this.pickups.push(new Pickup(b.x + rand(-60, 60), b.y + rand(-60, 60), i ? 'repair' : 'energy'));
      b.alive = false;
      this.base = null;
      this._hit = null;
    }
  },

  finishRound() {
    const alive = this.players.filter((p) => p.ship && p.ship.alive);
    const winner = alive.length === 1 ? alive[0] : null;
    if (this.mode === 'demo') { this.startDemo(); return; }
    this.roundWinner = winner;
    if (winner) winner.wins++;
    if (winner && winner.wins >= WINS_NEEDED) {
      this.setState('matchOver');
      Sound.win();
    } else {
      this.setState('roundOver');
      Sound.roundWin();
    }
  },

  respawnPlayer(pl) {
    const partner = this.players.find((p) => p !== pl && p.ship && p.ship.alive);
    let pos;
    if (partner) {
      const a = Math.random() * TAU;
      pos = { x: partner.ship.x + Math.cos(a) * 160, y: partner.ship.y + Math.sin(a) * 160 };
    } else {
      const enemies = this.ships.filter((s) => s.alive && s.team === 'enemy');
      pos = { x: Math.random() * WORLD.w, y: Math.random() * WORLD.h };
      for (let i = 0; i < 40; i++) {
        const p = { x: Math.random() * WORLD.w, y: Math.random() * WORLD.h };
        if (V.dist(p, this.planet) < this.planet.r + 300) continue;
        if (this.base && V.dist(p, this.base) < 600) continue;
        if (enemies.every((e) => V.dist(p, e) > 700)) { pos = p; break; }
      }
    }
    const s = this.spawnPlayer(pl, wrapCoord(pos.x, WORLD.w), wrapCoord(pos.y, WORLD.h), Math.random() * TAU, 2.5);
    Fx.ring(s.x, s.y, 80, 5, P_COLORS[pl.index], 0.6, 5);
    Sound.respawn();
  },

  // ---------- Opdatering ----------

  update(dt) {
    this.t += dt;
    this.stateTime += dt;
    if (Input.hit('KeyM')) Sound.muted = !Sound.muted;
    if (Input.hit('KeyV')) this.showVector = !this.showVector;

    switch (this.state) {
      case 'title':
        this.updateWorld(dt, true);
        Menu.updateTitle(this);
        break;
      case 'modes':
        this.updateWorld(dt, true);
        Menu.updateModes(this);
        break;
      case 'select':
        Menu.updateSelect(this, dt);
        break;
      case 'countdown':
        this.updateWorld(dt, false);
        if (this.stateTime > 2.4) this.setState('playing');
        break;
      case 'playing':
        if (Input.hit('KeyP', 'Escape')) { this.setState('paused'); break; }
        this.updateWorld(dt, true);
        break;
      case 'paused':
        if (Input.hit('KeyP', 'Space', 'Enter')) this.setState('playing');
        else if (Input.hit('Escape')) this.startDemo();
        break;
      case 'roundOver':
        this.updateWorld(dt, true);
        if (this.stateTime > 1.2 && this.anyConfirm()) Menu.openSelect(this);
        else if (Input.hit('Escape')) this.startDemo();
        break;
      case 'matchOver':
        this.updateWorld(dt, true);
        if (Math.random() < 0.06) this.firework();
        if (this.stateTime > 2 && this.anyConfirm()) { this.round = 0; this.startDemo(); this.setState('modes'); }
        else if (Input.hit('Escape')) this.startDemo();
        break;
      case 'gameover':
        this.updateWorld(dt, false);
        if (this.stateTime > 1.5 && this.anyConfirm()) Menu.openSelect(this);
        else if (Input.hit('Escape')) this.startDemo();
        break;
    }
    Input.endFrame();
  },

  anyConfirm() {
    return Input.hit('Space', 'Enter', 'KeyF', 'KeyL', 'Numpad0');
  },

  firework() {
    const p = { x: Camera.x + rand(-500, 500) / Camera.zoom, y: Camera.y + rand(-250, 250) / Camera.zoom };
    const sets = [['#ff5a8a', '#ffd0e0', '#fff'], ['#5ad8ff', '#c0f4ff', '#fff'], ['#ffe35a', '#fff6c0', '#fff'], ['#7dff9a', '#d0ffe0', '#fff']];
    Fx.explosion(wrapCoord(p.x, WORLD.w), wrapCoord(p.y, WORLD.h), rand(0.8, 1.5), pick(sets));
    Sound.smallBoom();
  },

  controlFor(s) {
    const pilot = this.pilots.get(s);
    if (pilot) return pilot.update(this.dtNow, this);
    if (s.player !== undefined) {
      const pl = this.players[s.player];
      if (pl && pl.keyset) return Input.control(pl.keyset);
    }
    return NO_CTRL;
  },

  updateWorld(realDt, controlsOn) {
    // Slowmotion når et skib bliver skudt ned i en duel
    if (this.slowmo > 0) this.slowmo -= realDt;
    const dt = this.slowmo > 0 ? realDt * 0.35 : realDt;
    this.dtNow = dt;
    this._hit = null;
    this.canFire = controlsOn;

    for (const s of this.ships) {
      if (!s.alive) continue;
      s.update(dt, controlsOn ? this.controlFor(s) : NO_CTRL, this);
    }
    for (let i = 0; i < this.ships.length; i++) {
      for (let j = i + 1; j < this.ships.length; j++) {
        const a = this.ships[i], b = this.ships[j];
        if (a.alive && b.alive) collideShips(a, b, this);
      }
    }
    if (this.base) {
      for (const s of this.ships) if (s.alive) this.base.collide(s, this);
      this.base.update(dt, this);
    }
    this._hit = null;

    for (const p of this.projectiles) if (p.alive) p.update(dt, this);
    // Miner og missiler kan skydes ned
    for (const m of this.projectiles) {
      if (!m.alive || m.hp <= 0) continue;
      for (const q of this.projectiles) {
        if (q === m || !q.alive || q.team === m.team) continue;
        if (V.dist(m, q) < m.r + q.r + 2) {
          m.shotDown();
          if (q.hp > 0) q.shotDown(); else q.alive = false;
          break;
        }
      }
    }
    for (const c of this.clouds) c.update(dt, this);
    for (const p of this.pickups) p.update(dt, this);

    this.ships = this.ships.filter((s) => s.alive);
    this.projectiles = this.projectiles.filter((p) => p.alive);
    this.clouds = this.clouds.filter((c) => c.alive);
    this.pickups = this.pickups.filter((p) => p.alive);
    this._hit = null;

    if (this.planet) this.planet.update(dt);
    Particles.update(dt);
    if (this.banner) {
      this.banner.t += realDt;
      if (this.banner.t > this.banner.dur) this.banner = null;
    }

    if (this.isDuel) {
      if (this.roundEndT > 0) {
        this.roundEndT -= realDt;
        if (this.roundEndT <= 0 && this.state !== 'roundOver' && this.state !== 'matchOver') this.finishRound();
      }
    } else if (this.state === 'playing') {
      Waves.update(dt, this);
      for (const pl of this.players) {
        if (pl.respawnT > 0) {
          pl.respawnT -= dt;
          if (pl.respawnT <= 0) this.respawnPlayer(pl);
        }
      }
      if (this.gameOverT > 0) {
        this.gameOverT -= realDt;
        if (this.gameOverT <= 0) {
          this.saveHighscore();
          this.setState('gameover');
          Sound.gameOver();
        }
      }
    }

    Camera.follow(this.cameraPoints(), realDt);
    Camera.update(realDt);
  },

  cameraPoints() {
    const mine = this.ships.filter((s) => s.player !== undefined);
    if (this.isDuel) return mine.length ? mine : [Camera];
    const pts = [...mine];
    if (!pts.length) return [Camera];
    // Tag de nærmeste fjender med, så man kan se dem komme
    const enemies = this.ships.filter((s) => s.team === 'enemy')
      .map((e) => ({ e, d: Math.min(...mine.map((m) => V.dist(m, e))) }))
      .filter((o) => o.d < 650)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    for (const o of enemies) pts.push(o.e);
    if (this.base && Math.min(...mine.map((m) => V.dist(m, this.base))) < 800) pts.push({ x: this.base.x, y: this.base.y, r: 130 });
    return pts;
  },

  // ---------- Tegning ----------

  draw() {
    Starfield.draw(ctx, this.t);
    if (this.state === 'select') {
      Menu.drawSelect(ctx, this);
      return;
    }
    this.drawWorld();
    if (this.state === 'title') { Menu.drawTitle(ctx, this); return; }
    if (this.state === 'modes') { Menu.drawModes(ctx, this); return; }
    drawHUD(ctx, this);
  },

  drawWorld() {
    const t = this.t;
    for (const c of this.clouds) if (c.kind === 'fart') c.draw(ctx, t);
    if (this.planet) this.planet.draw(ctx, t);
    for (const p of this.pickups) p.draw(ctx, t);
    if (this.base) this.base.draw(ctx, t);
    for (const p of this.projectiles) p.draw(ctx, t);
    const vec = this.showVector && this.mode !== 'demo';
    for (const s of this.ships) s.draw(ctx, t, vec && s.player !== undefined && !this.pilots.has(s));
    Particles.draw(ctx);
    for (const c of this.clouds) if (c.kind === 'ink') c.draw(ctx, t);
  },
};

Game.init();
