// Planeten i midten af feltet. Den trækker i alt med tyngdekraft,
// så man kan slynge sig rundt om den – men pas på ikke at ramme den!
const GRAVITY_GM = 9.5e6; // jo større, jo stærkere tyngdekraft

const PLANET_TYPES = [
  { name: 'Lava-planeten', base: '#a8321e', dark: '#4a0e08', spot: '#ff8a2a', glow: 'rgba(255,110,40,', kind: 'lava' },
  { name: 'Is-planeten', base: '#8fd3ff', dark: '#2a5e9a', spot: '#ffffff', glow: 'rgba(150,220,255,', kind: 'ice' },
  { name: 'Jungle-planeten', base: '#2f7fd1', dark: '#123a6a', spot: '#3fbf5a', glow: 'rgba(110,190,255,', kind: 'land' },
  { name: 'Gas-kæmpen', base: '#e0a564', dark: '#8a4f2a', spot: '#f6dcae', glow: 'rgba(255,200,140,', kind: 'gas', ring: true },
  { name: 'Ost-månen', base: '#f2cf4a', dark: '#b08a1a', spot: '#c99c22', glow: 'rgba(255,230,120,', kind: 'cheese' },
];

class Planet {
  constructor(type, x = WORLD.w / 2, y = WORLD.h / 2, r = 150) {
    this.type = type;
    this.x = x; this.y = y; this.r = r;
    this.rot = 0;
    this.img = this.render();
  }

  // Tegnes én gang på et usynligt lærred – det er hurtigere
  render() {
    const T = this.type, r = this.r;
    const c = document.createElement('canvas');
    c.width = c.height = r * 2;
    const g = c.getContext('2d');
    g.save();
    g.beginPath();
    g.arc(r, r, r, 0, TAU);
    g.clip();
    g.fillStyle = T.base;
    g.fillRect(0, 0, r * 2, r * 2);
    const R = (i) => { const s = Math.sin(i * 91.7 + T.name.length * 13.1) * 43758.5; return s - Math.floor(s); };
    if (T.kind === 'gas') {
      for (let i = 0; i < 14; i++) {
        g.fillStyle = i % 2 ? T.spot : T.dark;
        g.globalAlpha = 0.25 + R(i) * 0.4;
        const y = (i / 14) * r * 2;
        g.fillRect(0, y, r * 2, r * 2 / 14 * (0.6 + R(i + 3)));
      }
      g.globalAlpha = 0.8;
      ellipse(g, r * 1.3, r * 1.25, r * 0.22, r * 0.13, 0, '#c4542e');
    } else if (T.kind === 'cheese') {
      for (let i = 0; i < 16; i++) {
        g.globalAlpha = 1;
        circle(g, R(i) * r * 2, R(i + 50) * r * 2, 8 + R(i + 9) * 22, T.spot);
        circle(g, R(i) * r * 2 + 3, R(i + 50) * r * 2 + 3, (8 + R(i + 9) * 22) * 0.75, T.dark);
      }
    } else {
      for (let i = 0; i < 22; i++) {
        g.globalAlpha = T.kind === 'lava' ? 0.9 : 0.85;
        const x = R(i) * r * 2, y = R(i + 30) * r * 2, s = 10 + R(i + 7) * 40;
        if (T.kind === 'lava') {
          g.strokeStyle = T.spot;
          g.lineWidth = 3 + R(i) * 3;
          g.beginPath();
          g.moveTo(x, y);
          g.quadraticCurveTo(x + s, y - s / 2, x + s * 1.6, y + s * 0.4);
          g.stroke();
        } else {
          ellipse(g, x, y, s, s * (0.5 + R(i + 2) * 0.5), R(i + 4) * 3, T.spot);
        }
      }
      if (T.kind === 'ice') {
        g.globalAlpha = 0.9;
        ellipse(g, r, 0, r * 0.9, r * 0.35, 0, '#ffffff');
        ellipse(g, r, r * 2, r * 0.8, r * 0.3, 0, '#ffffff');
      }
    }
    g.globalAlpha = 1;
    g.restore();
    return c;
  }

  // Tyngdekraft: jo tættere på, jo stærkere (1 / afstand²)
  pull(o, dt, factor = 1) {
    const d = V.delta(o, this);
    const r2 = d.x * d.x + d.y * d.y;
    const r = Math.sqrt(r2) || 1;
    const a = GRAVITY_GM / Math.max(r2, (this.r * 1.1) ** 2);
    o.vx += (d.x / r) * a * dt * factor;
    o.vy += (d.y / r) * a * dt * factor;
  }

  // Returnerer anslagsfarten hvis o rammer planeten (og skubber den ud)
  collide(o) {
    const d = V.delta(this, o);
    const dist = Math.hypot(d.x, d.y) || 1;
    const min = this.r + o.r;
    if (dist >= min) return 0;
    const nx = d.x / dist, ny = d.y / dist;
    o.x = wrapCoord(this.x + nx * (min + 1), WORLD.w);
    o.y = wrapCoord(this.y + ny * (min + 1), WORLD.h);
    const vn = o.vx * nx + o.vy * ny;
    if (vn < 0) {
      o.vx -= 1.6 * vn * nx;
      o.vy -= 1.6 * vn * ny;
    }
    // skub lidt ud, så man ikke klæber fast
    o.vx += nx * 60;
    o.vy += ny * 60;
    return Math.abs(vn);
  }

  update(dt) { this.rot += dt * 0.04; }

  draw(ctx, t) {
    const T = this.type, r = this.r;
    Camera.drawAt(ctx, this, r * 1.9, (c) => {
      // Lysende atmosfære
      const ag = c.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 1.35);
      ag.addColorStop(0, T.glow + '0.45)');
      ag.addColorStop(1, T.glow + '0)');
      c.fillStyle = ag;
      c.beginPath();
      c.arc(0, 0, r * 1.35, 0, TAU);
      c.fill();
      if (T.ring) this.drawRing(c, r, true);
      c.save();
      c.rotate(this.rot);
      c.drawImage(this.img, -r, -r);
      c.restore();
      // Skygge så den ligner en kugle (lyset kommer fra oppe til venstre)
      const sg = c.createRadialGradient(-r * 0.4, -r * 0.4, r * 0.2, 0, 0, r * 1.05);
      sg.addColorStop(0, 'rgba(255,255,255,0.18)');
      sg.addColorStop(0.55, 'rgba(0,0,0,0)');
      sg.addColorStop(1, 'rgba(0,0,10,0.7)');
      c.fillStyle = sg;
      c.beginPath();
      c.arc(0, 0, r, 0, TAU);
      c.fill();
      if (T.ring) this.drawRing(c, r, false);
    });
  }

  // Ringen tegnes i to halvdele: bagved og foran planeten
  drawRing(c, r, back) {
    c.save();
    c.rotate(-0.35);
    c.beginPath();
    if (back) c.ellipse(0, 0, r * 1.8, r * 0.42, 0, Math.PI, TAU);
    else c.ellipse(0, 0, r * 1.8, r * 0.42, 0, 0, Math.PI);
    c.strokeStyle = 'rgba(240,210,160,0.75)';
    c.lineWidth = r * 0.16;
    c.stroke();
    c.strokeStyle = 'rgba(160,110,70,0.6)';
    c.lineWidth = r * 0.04;
    c.stroke();
    c.restore();
  }
}
