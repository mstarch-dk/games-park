// Kameraet kigger lige bagfra og skråt ned på toget – aldrig drejet til siden.
// To indstillinger (tasten V): 45° oppefra (standard) og en lavere, der ser mere af vognene.
const W = 960;
const H = 704;

const CAM_PRESETS = [
  { name: '45°', phi: 45, h: 15, back: 15, F: 540, horizon: 44 },
  { name: 'Lav', phi: 30, h: 10, back: 19, F: 600, horizon: 44 },
];

const Cam = {
  k: 0,          // 0..1 blanding mellem de to indstillinger
  target: 0,
  x: 0, z: 0,
  h: 15, back: 15, F: 540, sin: 0, cos: 1, cy: 0, hz: 44,
  px: 0, py: 0, pz: 0, // kameraets position (til at se hvilke sider af en kasse der vender mod os)

  setPreset(i, instant) {
    this.target = i ? 1 : 0;
    if (instant) this.k = this.target;
    this.apply();
  },

  apply() {
    const a = CAM_PRESETS[0], b = CAM_PRESETS[1], k = smooth(this.k);
    const phi = lerp(a.phi, b.phi, k) * Math.PI / 180;
    this.h = lerp(a.h, b.h, k);
    this.back = lerp(a.back, b.back, k);
    this.F = lerp(a.F, b.F, k);
    this.hz = lerp(a.horizon, b.horizon, k);
    this.sin = Math.sin(phi);
    this.cos = Math.cos(phi);
    this.cy = this.hz + this.F * Math.tan(phi);
  },

  follow(dt, world, snap) {
    if (this.k !== this.target) {
      this.k += Math.sign(this.target - this.k) * Math.min(Math.abs(this.target - this.k), dt * 2);
      this.apply();
    }
    const pl = world.player;
    const tx = world.px(pl.p) * 0.45;
    this.x = snap ? tx : this.x + (tx - this.x) * Math.min(1, dt * 3);
    this.z = pl.p - this.back;
    this.px = this.x; this.py = this.h; this.pz = this.z;
  },

  // Verden (x sidelæns, y op, z frem) → skærm. Null hvis punktet er bag kameraet.
  proj(x, y, z) {
    const rx = x - this.x, ry = y - this.h, rz = z - this.z;
    const d = -ry * this.sin + rz * this.cos;
    if (d < 0.4) return null;
    const vy = ry * this.cos + rz * this.sin;
    return { x: W / 2 + this.F * rx / d, y: this.cy - this.F * vy / d, s: this.F / d };
  },
};
