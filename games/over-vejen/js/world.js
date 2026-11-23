// Verden: rækkerne, trafikken i hver bane og lyset ved fodgængerfeltet.
// Køretøjer gemmes i "kørsels-retning": p er forenden målt i den retning banen kører,
// så samme kode virker for begge retninger.
const ACCEL = 3;      // felter/s² når bilerne speeder op
const BRAKE = 6;      // felter/s² når de bremser
const MIN_DIST = 0.35; // afstand mellem biler i kø

const KINDS = {
  bil: { len: 1.25, w: 42, speed: 1, name: 'bilen' },
  bus: { len: 2.6, w: 50, speed: 1, name: 'bussen', colors: ['#ffb703', '#3a86ff', '#e63946'] },
  lastbil: { len: 2.3, w: 50, speed: 1, name: 'lastbilen', colors: ['#2a9d8f', '#e76f51', '#457b9d'] },
  traktor: { len: 1.3, w: 46, speed: 0.6, name: 'traktoren', colors: ['#2d9a4a', '#d62828'] },
  cykel: { len: 0.8, w: 22, speed: 1, name: 'cyklen', colors: ['#ff006e', '#3a86ff', '#ffbe0b', '#8338ec', '#06d6a0'] },
  isbil: { len: 1.8, w: 48, speed: 0.85, name: 'isbilen', colors: ['#ff8fab'] },
};
const CAR_COLORS = ['#ef476f', '#118ab2', '#06d6a0', '#ffd166', '#8338ec', '#ff7f11', '#e9ecef', '#5e60ce'];

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function rand(a, b) { return a + Math.random() * (b - a); }

class Light {
  constructor(def, easy) {
    this.col = def.col;
    this.green = def.green;
    this.red = def.red + (easy ? 2 : 0);
    this.phases = [['green', this.green], ['yellow', 1.6], ['red', this.red], ['redyellow', 1.0]];
    this.i = Math.floor(Math.random() * 4);
    this.pt = Math.random() * this.phases[this.i][1];
    this.tickT = 0;
  }
  get phase() { return this.phases[this.i][0]; }
  update(dt) {
    this.pt += dt;
    while (this.pt >= this.phases[this.i][1]) {
      this.pt -= this.phases[this.i][1];
      this.i = (this.i + 1) % this.phases.length;
    }
  }
  stopsCars() { return this.phase !== 'green'; }
  // Fodgængerne (ællingen) får grønt lidt efter bilerne har fået rødt.
  pedGreen() { return this.phase === 'red' && this.pt > 1.0 && this.pt < this.red - 0.3; }
  pedBlink() { return this.pedGreen() && this.pt > this.red - 2; }
}

class Lane {
  constructor(def, row, easy) {
    this.row = row;
    this.dir = def.dir;
    this.bike = def.t === 'B';
    this.speed = def.speed * (easy ? 0.8 : 1);
    this.types = def.types;
    const g = def.gap || [2.2 + def.speed * 0.55, 5.4 + def.speed * 0.55];
    this.gap = [g[0] + (easy ? 0.6 : 0), g[1] + (easy ? 0.8 : 0)];
    this.vs = []; // index 0 er forrest
    this.nextGap = rand(this.gap[0], this.gap[1]);
  }

  spawnP() { return this.dir > 0 ? -0.3 : -(COLS + 0.3); }
  endP() { return this.dir > 0 ? COLS + 0.5 : 0.5; }
  // Venstre kant i felter
  x(v) { return this.dir > 0 ? v.p - v.len : -v.p; }
  stopLine(light) { return this.dir > 0 ? light.col - 0.12 : -(light.col + 1 + 0.12); }

  spawn() {
    const type = pick(this.types);
    const kind = KINDS[type];
    const v = {
      type, kind, len: kind.len, p: this.spawnP(),
      color: pick(kind.colors || CAR_COLORS),
      cur: this.speed * kind.speed, honkT: 0, warned: false, seed: Math.random(),
    };
    this.vs.push(v);
    this.nextGap = rand(this.gap[0], this.gap[1]);
  }

  update(dt, light) {
    let limit = Infinity;
    const sl = light ? this.stopLine(light) : 0;
    const stop = light && light.stopsCars();
    for (const v of this.vs) {
      let lim = limit;
      if (stop && v.p <= sl + 0.01) {
        const need = (v.cur * v.cur) / (2 * BRAKE);
        if (sl - v.p >= need - 0.3) lim = Math.min(lim, sl);
      }
      const target = this.speed * v.kind.speed;
      const room = Math.max(0, lim - v.p);
      const desired = Math.min(target, Math.sqrt(2 * BRAKE * room));
      v.cur = v.cur < desired ? Math.min(desired, v.cur + ACCEL * dt) : desired;
      v.p = Math.min(v.p + v.cur * dt, Math.max(v.p, lim));
      limit = v.p - v.len - MIN_DIST;
      if (v.honkT > 0) v.honkT -= dt;
    }
    while (this.vs.length && this.vs[0].p - this.vs[0].len > this.endP()) this.vs.shift();
    const last = this.vs[this.vs.length - 1];
    if (!last || (last.p - last.len) - this.spawnP() >= this.nextGap) this.spawn();
  }
}

class World {
  constructor(def, index, easy) {
    this.def = def;
    this.index = index;
    this.rows = def.rows;
    this.easy = easy;
    this.lanes = this.rows.map((r, i) => (r.t === 'R' || r.t === 'B' ? new Lane(r, i, easy) : null));
    this.light = def.light ? new Light(def.light, easy) : null;
    this.roadRows = this.rows.map((r, i) => i).filter((i) => this.lanes[i]);
    this.corn = this.placeCorn();
    this.bg = buildBackground(this);
    // Kør trafikken et stykke tid, så vejen er fuld fra start.
    for (let i = 0; i < 500; i++) this.update(0.05);
  }

  placeCorn() {
    const spots = [];
    for (let r = 1; r < ROWS - 1; r++) for (let c = 0; c < COLS; c++) spots.push({ c, r });
    const out = [];
    while (out.length < 3 && spots.length) {
      const s = spots.splice(Math.floor(Math.random() * spots.length), 1)[0];
      if (out.some((o) => Math.abs(o.r - s.r) < 2 && Math.abs(o.c - s.c) < 3)) continue;
      out.push({ c: s.c, r: s.r, taken: false, bob: Math.random() * 6 });
    }
    return out;
  }

  isRoad(r) { return !!this.lanes[r]; }

  update(dt) {
    if (this.light) this.light.update(dt);
    for (const l of this.lanes) if (l) l.update(dt, this.light);
  }
}
