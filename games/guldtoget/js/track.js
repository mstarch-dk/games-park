// Sporene: mål, tilfældighed og skiftepunkter (krydsninger mellem nabospor).
// Her er ingen tegning – samme kode bruges af spillet og af test-autopiloten.

const LANE_W = 3.4;       // afstand mellem sporene (m)
const XL = 16;            // længden af en krydsning fra ét spor til nabosporet (m)
const LOCO_LEN = 6.5;     // lokomotivets længde (m)
const CAR_LEN = 5;        // en vogns længde (m)
const CAR_GAP = 0.8;      // kobling mellem vognene (m)
const N_CARS = 2;         // dine guldvogne
const TRAIN_LEN = LOCO_LEN + N_CARS * (CAR_GAP + CAR_LEN);
const ON_CARS = 2;        // vogne bag et modkørende lokomotiv
const ON_LEN = LOCO_LEN + ON_CARS * (CAR_GAP + CAR_LEN);
const COLLIDE_W = 2.5;    // to tog rører hinanden, hvis deres midter er tættere end dette sidelæns (m)
const VIEW = 175;         // hvor langt frem man kan se (m)
const FOG_START = 115;    // herfra toner tingene frem af disen
const SPAWN_AT = 168;     // modkørende tog sættes ind så langt fremme (i disen)
const GOLD_AT = 160;      // guld lægges ud så langt fremme
const GRACE = 2.5;        // et tryk op til så mange meter efter skiftet tæller stadig
const BRAKE = 30;         // bremselængde ved stationen (m)

function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function smooth(u) { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); }
function laneX(i, n) { return (i - (n - 1) / 2) * LANE_W; }

// Hvor langt (0..1) inde i en krydsning er toget så langt ude af sit gamle spor, at et tog dér ikke kan ramme?
const U_CLEAR = (() => {
  let lo = 0, hi = 1;
  const target = COLLIDE_W / LANE_W;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (smooth(m) < target) lo = m; else hi = m;
  }
  return hi;
})();

// Skiftepunkter: { z, pairs } hvor pair a betyder en saksekrydsning mellem spor a og a+1 (begge veje).
class Track {
  constructor(def, rnd) {
    this.def = def;
    this.n = def.lanes;
    this.rnd = rnd;
    this.points = [];
    this.nextZ = 60;
    this.stale = new Array(this.n).fill(2);
  }

  ensure(zMax) {
    while (this.nextZ < zMax && this.nextZ < this.def.len - 70) {
      this.points.push({ z: this.nextZ, pairs: this.pickPairs() });
      const [g0, g1] = this.def.gap;
      this.nextZ += g0 + this.rnd() * (g1 - g0);
    }
  }

  // Vælg krydsninger – helst ved spor, der længe ikke har haft et skifte.
  pickPairs() {
    const n = this.n, r = this.rnd;
    const w = [];
    let sum = 0;
    for (let a = 0; a < n - 1; a++) {
      const s = Math.max(this.stale[a], this.stale[a + 1]);
      w[a] = s * s + 1;
      sum += w[a];
    }
    let x = r() * sum, a = 0;
    while (a < n - 2 && x > w[a]) { x -= w[a]; a++; }
    let pairs = [a];
    const hint = this.hint ? this.hint() : -1;
    if (n >= 3 && hint > 0 && hint < n - 1 && r() < (this.def.doubleP || 0)) {
      // dobbelt-skifte omkring det spor, spilleren kører i – så kan der komme dobbelt-tog
      pairs = [hint - 1, hint];
    } else if (n >= 3 && r() < (this.def.doubleP || 0) * 0.5 + 0.15) {
      // krydsning til begge sider af det fælles spor
      const b = a > 0 && (a === n - 2 || r() < 0.5) ? a - 1 : a + 1;
      if (b >= 0 && b <= n - 2) pairs.push(b);
    } else if (n >= 4 && r() < 0.35) {
      const far = [];
      for (let b = 0; b < n - 1; b++) if (Math.abs(b - a) >= 2) far.push(b);
      if (far.length) pairs.push(far[Math.floor(r() * far.length)]);
    }
    for (let i = 0; i < n; i++) this.stale[i]++;
    for (const p of pairs) { this.stale[p] = 0; this.stale[p + 1] = 0; }
    return pairs;
  }

  // Retninger (-1 venstre, +1 højre) man kan skifte til fra spor L ved punktet.
  exitsAt(pt, L) {
    const e = [];
    if (pt.pairs.includes(L - 1)) e.push(-1);
    if (pt.pairs.includes(L)) e.push(1);
    return e;
  }

  // Næste skiftepunkt efter z, hvor spor L kan skifte.
  nextFor(L, z) {
    for (const pt of this.points) {
      if (pt.z <= z) continue;
      const ex = this.exitsAt(pt, L);
      if (ex.length) return { pt, exits: ex };
    }
    return null;
  }

  prune(z) {
    while (this.points.length && this.points[0].z + XL < z) this.points.shift();
  }
}
