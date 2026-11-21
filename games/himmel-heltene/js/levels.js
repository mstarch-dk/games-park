// Baner: fjender kommer i bølger fra toppen. Efter et stykke tid kommer bossen.
// Juster LEVEL_LENGTH for kortere/længere baner.
const LEVEL_LENGTH = 80; // sekunder før Brumle-Zeppelineren kommer
let groupCounter = 0;

const WAVES = {
  // række af småfly der kommer lige ned
  line(L) {
    const n = 5, g = Levels.group(n), x0 = rand(80, 160), look = pick([ENEMY_LOOKS.purple, ENEMY_LOOKS.green]);
    for (let i = 0; i < n; i++) Game.spawn(new Enemy('zip', x0 + i * 110, -40, { vy: 170 + L * 8, delay: i * 0.25, group: g, look }));
  },
  // V-formation
  vee(L) {
    const n = L >= 2 ? 7 : 5, g = Levels.group(n), cx = rand(220, W - 220), mid = (n - 1) / 2;
    for (let i = 0; i < n; i++) {
      const off = i - mid;
      Game.spawn(new Enemy('zip', cx + off * 55, -40, { vy: 185 + L * 8, delay: Math.abs(off) * 0.2, group: g, look: ENEMY_LOOKS.purple }));
    }
  },
  // slange der snor sig
  snake(L) {
    const n = 6, g = Levels.group(n), x = rand(170, W - 170);
    for (let i = 0; i < n; i++) {
      Game.spawn(new Enemy('zip', x, -40, { vy: 160 + L * 8, sineAmp: 120, sineFreq: 2.2, delay: i * 0.32, group: g, look: ENEMY_LOOKS.green }));
    }
  },
  // kommer ind fra siden og svinger ned
  swoop(L) {
    const n = 5, g = Levels.group(n), side = Math.random() < 0.5 ? -1 : 1, y = rand(70, 180);
    for (let i = 0; i < n; i++) {
      Game.spawn(new Enemy('zip', side < 0 ? -40 : W + 40, y, {
        vx: -side * 270, vy: 30, turn: side < 0 ? 1.5 : -1.5, turnT: 1.05, delay: i * 0.22, group: g, look: ENEMY_LOOKS.orange,
      }));
    }
  },
  divers(L) {
    const n = L >= 3 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      Game.spawn(new Enemy('diver', rand(80, W - 80), -40, { vy: 200, stopY: rand(110, 250), delay: i * 0.6, look: ENEMY_LOOKS.orange, shooter: false }));
    }
  },
  boats(L) {
    const n = L >= 3 ? 2 : 1;
    for (let i = 0; i < n; i++) Game.spawn(new Enemy('boat', rand(90, W - 90), -60 - i * 140, { vx: rand(-15, 15) }));
  },
  bomber(L) {
    const x = rand(200, W - 200);
    Game.spawn(new Enemy('bomber', x, -90, { vy: 55, look: ENEMY_LOOKS.green }));
    for (const s of [-1, 1]) Game.spawn(new Enemy('zip', x + s * 110, -60, { vy: 150, delay: 1, look: ENEMY_LOOKS.green }));
  },
  balloons() {
    const n = randInt(3, 4);
    for (let i = 0; i < n; i++) Game.spawn(new Enemy('balloon', rand(60, W - 60), -40 - i * 60, { vy: 85 }));
  },
  // ét rødt fly med en gave
  gift(L) {
    Game.spawn(new Enemy('zip', rand(150, W - 150), -40, { vy: 140, sineAmp: 90, sineFreq: 1.6, carrier: true, shooter: false }));
  },
};

// Hvilke bølger der kan komme på hver bane (bane 1 er nemmest)
const WAVE_POOLS = [
  ['line', 'vee', 'snake', 'swoop', 'balloons'],
  ['line', 'vee', 'snake', 'swoop', 'divers', 'boats', 'balloons'],
  ['vee', 'snake', 'swoop', 'divers', 'boats', 'bomber', 'balloons'],
  ['vee', 'snake', 'swoop', 'divers', 'boats', 'bomber', 'line'],
  ['vee', 'snake', 'swoop', 'divers', 'boats', 'bomber', 'line', 'balloons'],
];

const Levels = {
  t: 0,
  waveT: 0,
  count: 0,
  bossT: -1,
  last: null,

  start() {
    this.t = 0;
    this.waveT = 2.5;
    this.count = 0;
    this.bossT = -1;
    this.last = null;
  },

  group(n) {
    const id = ++groupCounter;
    Game.groups.set(id, { total: n, killed: 0 });
    return id;
  },

  gap() {
    const L = Game.level, base = 3.8 - L * 0.28 - Game.loop * 0.4;
    return Math.max(1.7, base) * (Game.players.length === 2 ? 0.85 : 1);
  },

  update(dt) {
    if (Game.boss) return;
    this.t += dt;
    if (this.t >= LEVEL_LENGTH) {
      if (this.bossT < 0) {
        this.bossT = 3.5;
        Game.showBanner('Pas på!', 'Brumle-Zeppelineren kommer!');
        Sound.alarm();
      }
      this.bossT -= dt;
      if (this.bossT <= 0) Game.boss = new Boss(Game.level, Game.loop);
      return;
    }
    this.waveT -= dt;
    if (this.waveT > 0) return;
    this.count++;
    const L = Game.level;
    const pool = WAVE_POOLS[L];
    let name = pick(pool);
    if (name === this.last) name = pick(pool);
    this.last = name;
    WAVES[name](L);
    // en "gave" hver tredje bølge – så der kommer power-ups ofte
    if (this.count % 3 === 0) WAVES.gift(L);
    this.waveT = this.gap() * (name === 'bomber' ? 1.4 : 1);
  },
};
