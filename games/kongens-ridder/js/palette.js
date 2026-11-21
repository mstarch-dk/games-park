// Farver og bløde farveovergange. Alt tegnes som vektorgrafik (ingen pixels),
// i varme, venlige farver med et nik til de gamle malede eventyrspil.
const PAL = {
  black: '#1a1420', white: '#fffaf0',
  night: '#1b2350', sky0: '#2b4a8c', sky1: '#3f6fc0', sky2: '#6a9be0', sky3: '#9cc3f0', sky4: '#d6e8fb',
  dusk0: '#ffc27a', dusk1: '#f2805a', dusk2: '#9a4a7a',
  g0: '#1f5a3a', g1: '#2f7a45', g2: '#4f9e4f', g3: '#7cc160', g4: '#b5e07a',
  s0: '#3a3040', s1: '#5e5466', s2: '#8a8090', s3: '#b2a9b4', s4: '#d6cfd2', s5: '#f0ebe8',
  p0: '#a67c3c', p1: '#d4ab6a', p2: '#ecd3a0', p3: '#fbf0d4',
  red0: '#8e1f2c', red1: '#d63a45', blue: '#2d5bb5', blue1: '#5f8fe6', gold: '#ffcc3d', gold0: '#c48f12',
  skin: '#f5c7a0', skin0: '#c98c66', w0: '#1b4f8a', w1: '#2a6fb0', w2: '#4a94d4', w3: '#8cc4ef',
};

function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

const Shade = {
  cache: {},

  // Bland to farver (t = 0..1)
  mix(a, b, t) {
    const key = a + b + t.toFixed(3);
    if (this.cache[key]) return this.cache[key];
    const A = hexRgb(a), B = hexRgb(b);
    const c = `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
    this.cache[key] = c;
    return c;
  },

  // lvl 0..16 = hvor meget af farve b (gammel skala, beholdt for enkelhed)
  pattern(ctx, a, b, lvl) { return this.mix(a, b, clamp(lvl, 0, 16) / 16); },
  fill(ctx, a, b, lvl) { ctx.fillStyle = this.pattern(ctx, a, b, lvl); },

  // Lodret farveforløb gennem en liste farver
  vgrad(ctx, x, y, w, h, colors) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  },

  lin(ctx, x0, y0, x1, y1, colors) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c));
    return g;
  },

  glow(ctx, x, y, r, color, alpha = 0.5) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  },
};

// Lille forudsigelig tilfældighed, så baggrunde ser ens ud hver gang
function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
}
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
