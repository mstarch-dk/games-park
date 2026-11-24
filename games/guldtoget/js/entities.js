// Togets vej gennem sporene og sammenstød. Ren beregning – ingen tegning.

// Din vej: startspor + de krydsninger, toget har taget. Alle vogne følger samme vej.
function newPath(lane) { return { start: lane, segs: [] }; }

// Sidelæns position (x) af din vej ved afstanden z.
function pathX(path, z, n) {
  for (let i = path.segs.length - 1; i >= 0; i--) {
    const s = path.segs[i];
    if (z >= s.z0) {
      if (z >= s.z0 + XL) return laneX(s.to, n);
      return lerp(laneX(s.from, n), laneX(s.to, n), smooth((z - s.z0) / XL));
    }
  }
  return laneX(path.start, n);
}

// Lokomotiv + vogne, når lokomotivets front er ved p.
function carsOf(p) {
  const cars = [{ zf: p, zb: p - LOCO_LEN, kind: 'loco', i: -1 }];
  let z = p - LOCO_LEN;
  for (let i = 0; i < N_CARS; i++) {
    z -= CAR_GAP;
    cars.push({ zf: z, zb: z - CAR_LEN, kind: 'car', i });
    z -= CAR_LEN;
  }
  return cars;
}

// Rammer dit tog (vej + front p) noget i spor `lane`, der fylder z0..z1?
function hitsBox(path, p, n, lane, z0, z1) {
  if (z0 > p || z1 < p - TRAIN_LEN) return false;
  const lx = laneX(lane, n);
  for (const c of carsOf(p)) {
    const lo = Math.max(c.zb, z0), hi = Math.min(c.zf, z1);
    if (lo > hi) continue;
    if (Math.abs(pathX(path, lo, n) - lx) < COLLIDE_W) return true;
    if (Math.abs(pathX(path, hi, n) - lx) < COLLIDE_W) return true;
    if (Math.abs(pathX(path, (lo + hi) / 2, n) - lx) < COLLIDE_W) return true;
  }
  return false;
}

const COW_HALF = 1.2;   // en ko fylder så meget langs sporet (m) til hver side
const TRAIN_COLORS = [
  { body: '#2f6fd6', cab: '#1f4fa8', roof: '#203050', trim: '#ffd23f', freight: '#3fa7a0' },
  { body: '#2e9e5b', cab: '#1f7a43', roof: '#24402f', trim: '#ffb703', freight: '#e76f51' },
  { body: '#8a4fd6', cab: '#6a35b0', roof: '#33244f', trim: '#ffe066', freight: '#f4a261' },
  { body: '#e0663a', cab: '#b84a24', roof: '#4a2a1c', trim: '#fff1a8', freight: '#4d8fd6' },
];
