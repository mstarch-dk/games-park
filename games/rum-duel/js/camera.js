// Kameraet: følger midtpunktet mellem skibene og zoomer ud,
// når de er langt fra hinanden – så man altid kan se alle.
const ZOOM_MIN = 0.33;
const ZOOM_MAX = 1.0;

const Camera = {
  x: WORLD.w / 2,
  y: WORLD.h / 2,
  ux: 0, // "uendelig" position der aldrig wrapper (bruges af stjernerne)
  uy: 0,
  zoom: 0.6,
  shake: 0,
  sx: 0,
  sy: 0,

  reset(x, y, zoom) {
    this.x = x; this.y = y;
    this.zoom = zoom;
    this.shake = 0;
  },

  // points: objekter med x,y der skal kunne ses
  follow(points, dt, snap = false) {
    if (!points.length) return;
    const c = V.center(points);
    let mx = 0, my = 0;
    for (const p of points) {
      const d = V.delta(c, p);
      mx = Math.max(mx, Math.abs(d.x) + (p.r || 20));
      my = Math.max(my, Math.abs(d.y) + (p.r || 20));
    }
    // Plads til kanten af skærmen (i pixels)
    const zx = (W / 2 - 150) / Math.max(mx, 1);
    const zy = (H / 2 - 120) / Math.max(my, 1);
    const target = clamp(Math.min(zx, zy), ZOOM_MIN, ZOOM_MAX);
    const k = snap ? 1 : Math.min(1, dt * 3);
    const d = V.delta(this, c);
    this.x = wrapCoord(this.x + d.x * k, WORLD.w);
    this.y = wrapCoord(this.y + d.y * k, WORLD.h);
    this.ux += d.x * k;
    this.uy += d.y * k;
    // Zoom ud hurtigt, ind langsomt (så det ikke "hopper")
    const zk = snap ? 1 : Math.min(1, dt * (target < this.zoom ? 3 : 1.2));
    this.zoom += (target - this.zoom) * zk;
  },

  update(dt) {
    this.shake = Math.max(0, this.shake - dt * 25);
    this.sx = (Math.random() - 0.5) * this.shake * 2;
    this.sy = (Math.random() - 0.5) * this.shake * 2;
  },

  addShake(n) { this.shake = Math.min(18, Math.max(this.shake, n)); },

  // Skærm-position for et punkt i verden (nærmeste "kopi" af punktet)
  toScreen(o) {
    const d = V.delta(this, o);
    return { x: W / 2 + d.x * this.zoom + this.sx, y: H / 2 + d.y * this.zoom + this.sy };
  },

  // Tegn et objekt med verdens-skala. Hvis det står nær kanten af verden,
  // tegnes det alle steder hvor det kan ses (wrap-around).
  drawAt(ctx, o, radius, fn) {
    const d = V.delta(this, o);
    const z = this.zoom;
    const r = radius * z;
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const sx = W / 2 + (d.x + ox * WORLD.w) * z + this.sx;
        const sy = H / 2 + (d.y + oy * WORLD.h) * z + this.sy;
        if (sx < -r || sx > W + r || sy < -r || sy > H + r) continue;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(z, z);
        fn(ctx);
        ctx.restore();
      }
    }
  },

  onScreen(o, margin = 0) {
    const p = this.toScreen(o);
    return p.x > -margin && p.x < W + margin && p.y > -margin && p.y < H + margin;
  },
};
