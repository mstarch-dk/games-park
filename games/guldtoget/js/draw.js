// Tegning: himmel, bjerge, spor, tog (som små 3D-kasser), guld, køer, træer og stationen.

function rr(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ell(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
}

function text(ctx, str, x, y, size, color = '#fff', align = 'center', outline = '#3a2410') {
  ctx.font = `bold ${size}px "Comic Sans MS", "Trebuchet MS", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (outline) {
    ctx.lineWidth = Math.max(3, size / 6);
    ctx.strokeStyle = outline;
    ctx.lineJoin = 'round';
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

const shadeCache = {};
function shade(hex, amt) {
  const key = hex + amt;
  if (shadeCache[key]) return shadeCache[key];
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const to = amt < 0 ? 0 : 255;
  const a = Math.abs(amt);
  r = Math.round(r + (to - r) * a); g = Math.round(g + (to - g) * a); b = Math.round(b + (to - b) * a);
  return (shadeCache[key] = `rgb(${r},${g},${b})`);
}

function star(ctx, x, y, r, fill, stroke) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

function hash(k) { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

const COL = {
  skyTop: '#4fb3ea', skyBot: '#d8f1ff', grassFar: '#a9d98d', grass: '#5aab3c',
  ballast: '#a39582', sleeper: '#6b4a2f', rail: '#e4e8ef',
};

const P = (x, y, z) => Cam.proj(x, y, z);

function fillPoly(ctx, pts, color) {
  for (const p of pts) if (!p) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// ---------- Himmel og jord ----------
const MOUNTAINS = (() => {
  const r = seeded(4242), layers = [];
  for (let L = 0; L < 2; L++) {
    const pts = [];
    let x = -200;
    while (x < W * 2 + 200) {
      pts.push({ x, h: (L ? 10 : 22) + r() * (L ? 18 : 30) });
      x += 50 + r() * 90;
    }
    layers.push(pts);
  }
  return layers;
})();

function drawSky(ctx) {
  const hz = Cam.hz;
  const g = ctx.createLinearGradient(0, 0, 0, hz + 2);
  g.addColorStop(0, COL.skyTop);
  g.addColorStop(1, COL.skyBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, hz + 2);
  const colors = ['#9fb8d6', '#86ad8f'];
  MOUNTAINS.forEach((pts, L) => {
    const off = -((Cam.x * (L ? 6 : 3)) % W) - W / 2;
    ctx.beginPath();
    ctx.moveTo(-10, hz + 2);
    for (const p of pts) ctx.lineTo(p.x + off, hz - p.h);
    ctx.lineTo(W + 10, hz + 2);
    ctx.closePath();
    ctx.fillStyle = colors[L];
    ctx.fill();
  });
  const g2 = ctx.createLinearGradient(0, hz, 0, H);
  g2.addColorStop(0, COL.grassFar);
  g2.addColorStop(0.35, '#7cc25a');
  g2.addColorStop(1, COL.grass);
  ctx.fillStyle = g2;
  ctx.fillRect(0, hz, W, H - hz);
}

// ---------- Sporene ----------
function trackRange(w) {
  return { zN: Cam.z + 2.5, zF: Math.min(w.player.p + VIEW, w.def.len + 2.5) };
}

function crossCurve(w, from, to, z0, u) {
  return { x: lerp(laneX(from, w.n), laneX(to, w.n), smooth(u)), z: z0 + u * XL };
}

function drawTrack(ctx, w) {
  const n = w.n, pl = w.player;
  const { zN, zF } = trackRange(w);
  // skærver
  for (let i = 0; i < n; i++) {
    const x = laneX(i, n);
    fillPoly(ctx, [P(x - 1.65, 0, zN), P(x + 1.65, 0, zN), P(x + 1.65, 0, zF), P(x - 1.65, 0, zF)], COL.ballast);
  }
  const diags = [];
  for (const pt of w.track.points) {
    if (pt.z + XL < zN || pt.z > zF) continue;
    for (const a of pt.pairs) { diags.push([a, a + 1, pt.z]); diags.push([a + 1, a, pt.z]); }
  }
  for (const [from, to, z0] of diags) {
    const left = [], right = [];
    for (let k = 0; k <= 8; k++) {
      const c = crossCurve(w, from, to, z0, k / 8);
      if (c.z < zN) continue;
      left.push(P(c.x - 1.4, 0, c.z));
      right.unshift(P(c.x + 1.4, 0, c.z));
    }
    if (left.length > 1) fillPoly(ctx, left.concat(right), COL.ballast);
  }
  // sveller
  const step = 1.5, zMaxS = Math.min(zF, pl.p + 125);
  ctx.strokeStyle = COL.sleeper;
  for (let z = Math.ceil(zN / step) * step; z < zMaxS; z += step) {
    for (let i = 0; i < n; i++) {
      const x = laneX(i, n);
      const a = P(x - 1.2, 0.02, z), b = P(x + 1.2, 0.02, z);
      if (!a || !b) continue;
      ctx.lineWidth = Math.max(1, a.s * 0.3);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  // skinner
  for (let i = 0; i < n; i++) {
    const x = laneX(i, n);
    for (const off of [-0.72, 0.72]) {
      const xr = x + off;
      fillPoly(ctx, [P(xr - 0.08, 0.05, zN), P(xr + 0.08, 0.05, zN), P(xr + 0.08, 0.05, zF), P(xr - 0.08, 0.05, zF)], COL.rail);
    }
  }
  ctx.strokeStyle = COL.rail;
  ctx.lineCap = 'round';
  for (const [from, to, z0] of diags) {
    for (const off of [-0.72, 0.72]) {
      ctx.beginPath();
      let first = true, sMid = 1;
      for (let k = 0; k <= 10; k++) {
        const c = crossCurve(w, from, to, z0, k / 10);
        if (c.z < zN) continue;
        const p = P(c.x + off, 0.05, c.z);
        if (!p) continue;
        if (k === 5) sMid = p.s;
        if (first) { ctx.moveTo(p.x, p.y); first = false; } else ctx.lineTo(p.x, p.y);
      }
      ctx.lineWidth = Math.max(1, sMid * 0.16);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';
}

// Pile på skinnerne foran det næste skifte i dit spor.
function drawSwitchArrows(ctx, w, t) {
  const pl = w.player;
  if (w.crossing()) return;
  const nx = w.track.nextFor(pl.lane, pl.p);
  if (!nx || nx.pt.z - pl.p > 120) return;
  const x0 = laneX(pl.lane, w.n), s = nx.pt.z;
  const fa = fogA(w, s);
  for (const d of [0, -1, 1]) {
    if (d && !nx.exits.includes(d)) continue;
    const on = pl.arm === d;
    ctx.globalAlpha = fa * (on ? 1 : 0.5);
    const color = on ? (d ? (Math.floor(t * 6) % 2 ? '#ffd23f' : '#ffe680') : '#ffffff') : '#ffffff';
    drawGroundArrow(ctx, x0, s - 8, x0 + d * LANE_W * 0.85, s + (d ? 2.5 : 0.5), color);
  }
  ctx.globalAlpha = 1;
}

function drawGroundArrow(ctx, x0, z0, x1, z1, color) {
  const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz);
  const ux = dx / L, uz = dz / L, wx = uz, wz = -ux;
  const sw = 0.3, hw = 0.95, hl = 2.6;
  const bx = x1 - ux * hl, bz = z1 - uz * hl;
  const pts = [
    [x0 - wx * sw, z0 - wz * sw], [bx - wx * sw, bz - wz * sw], [bx - wx * hw, bz - wz * hw], [x1, z1],
    [bx + wx * hw, bz + wz * hw], [bx + wx * sw, bz + wz * sw], [x0 + wx * sw, z0 + wz * sw],
  ].map(([x, z]) => P(x, 0.08, z));
  fillPoly(ctx, pts, color);
  ctx.strokeStyle = 'rgba(60,40,20,0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function fogA(w, z) { return clamp((w.player.p + VIEW - z) / (VIEW - FOG_START), 0, 1); }

function drawFog(ctx, w) {
  const a = P(0, 0, w.player.p + FOG_START - 20);
  if (!a) return;
  const g = ctx.createLinearGradient(0, a.y, 0, Cam.hz);
  g.addColorStop(0, 'rgba(216,241,255,0)');
  g.addColorStop(1, 'rgba(216,241,255,0.95)');
  ctx.fillStyle = g;
  ctx.fillRect(0, Cam.hz, W, a.y - Cam.hz);
}

// ---------- 3D-kasser ----------
// Ramme for en vogn: a = afstand fra vognens bagende langs vognen, l = sidelæns, y = højde.
function carFrame(xb, zb, xf, zf) {
  const dx = xf - xb, dz = zf - zb, L = Math.hypot(dx, dz) || 1;
  const ux = dx / L, uz = dz / L, wx = uz, wz = -ux;
  return (a, l, y) => [xb + ux * a + wx * l, y, zb + uz * a + wz * l];
}

const FACES = [[0, 1, 5, 4, -0.08], [3, 2, 6, 7, -0.08], [0, 3, 7, 4, -0.22], [1, 2, 6, 5, -0.22], [4, 5, 6, 7, 0.16]];

function box(ctx, F, a0, a1, l0, l1, y0, y1, color) {
  const V = [F(a0, l0, y0), F(a0, l1, y0), F(a1, l1, y0), F(a1, l0, y0), F(a0, l0, y1), F(a0, l1, y1), F(a1, l1, y1), F(a1, l0, y1)];
  let cx = 0, cy = 0, cz = 0;
  for (const v of V) { cx += v[0]; cy += v[1]; cz += v[2]; }
  cx /= 8; cy /= 8; cz /= 8;
  const S = V.map((v) => P(v[0], v[1], v[2]));
  for (const f of FACES) {
    const A = V[f[0]], B = V[f[1]], C = V[f[2]], D = V[f[3]];
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2];
    const vx = D[0] - A[0], vy = D[1] - A[1], vz = D[2] - A[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const mx = (A[0] + C[0]) / 2, my = (A[1] + C[1]) / 2, mz = (A[2] + C[2]) / 2;
    if (nx * (mx - cx) + ny * (my - cy) + nz * (mz - cz) < 0) { nx = -nx; ny = -ny; nz = -nz; }
    if (nx * (Cam.px - mx) + ny * (Cam.py - my) + nz * (Cam.pz - mz) <= 0) continue;
    fillPoly(ctx, [S[f[0]], S[f[1]], S[f[2]], S[f[3]]], shade(color, f[4]));
  }
}

// Tegn en liste dele [a0,a1,l0,l1,y0,y1,farve] fra den fjerneste til den nærmeste.
function drawParts(ctx, F, parts, pal) {
  const list = parts.map((p) => {
    const c = F((p[0] + p[1]) / 2, (p[2] + p[3]) / 2, (p[4] + p[5]) / 2);
    const d = (c[0] - Cam.px) ** 2 + (c[1] - Cam.py) ** 2 + (c[2] - Cam.pz) ** 2;
    return { p, d };
  });
  list.sort((a, b) => b.d - a.d);
  for (const { p } of list) box(ctx, F, p[0], p[1], p[2], p[3], p[4], p[5], pal[p[6]] || p[6]);
}

function carShadow(ctx, F, len) {
  fillPoly(ctx, [P(...F(-0.2, -1.4, 0.03)), P(...F(-0.2, 1.4, 0.03)), P(...F(len + 0.2, 1.4, 0.03)), P(...F(len + 0.2, -1.4, 0.03))], 'rgba(30,30,20,0.25)');
}

const WHEELS = (len) => {
  const out = [];
  const spots = len > 6 ? [0.8, 2.5, 4.2] : [0.6, 3.4];
  for (const a of spots) {
    out.push([a, a + 1.1, -1.32, -1.06, 0, 1.1, 'wheel']);
    out.push([a, a + 1.1, 1.06, 1.32, 0, 1.1, 'wheel']);
  }
  return out;
};

const LOCO_PARTS = (() => {
  const L = LOCO_LEN;
  return [
    [0, L, -1.15, 1.15, 0.3, 0.95, 'dark'],
    ...WHEELS(L),
    [2.4, L - 0.3, -0.9, 0.9, 0.95, 2.45, 'body'],
    [L - 0.75, L, -0.98, 0.98, 0.95, 2.55, 'smoke'],
    [3.5, 4.3, -0.42, 0.42, 2.45, 3.0, 'trim'],
    [L - 1.55, L - 0.95, -0.3, 0.3, 2.45, 3.6, 'smoke'],
    [L - 1.68, L - 0.82, -0.4, 0.4, 3.6, 3.85, 'smoke'],
    [0.1, 2.5, -1.2, 1.2, 0.95, 3.15, 'cab'],
    [0, 2.7, -1.36, 1.36, 3.15, 3.42, 'roof'],
    [0.04, 0.1, -0.85, -0.2, 2.0, 2.8, 'glass'],
    [0.04, 0.1, 0.2, 0.85, 2.0, 2.8, 'glass'],
    [L, L + 0.25, -1.2, 1.2, 0.35, 1.0, 'trim2'],
    [L + 0.25, L + 0.85, -1.0, 1.0, 0.05, 0.45, 'trim2'],
  ];
})();

const PLAYER_PAL = {
  body: '#d62839', cab: '#b51d2c', roof: '#3a2a2a', dark: '#2b2d42', wheel: '#8d1b24',
  trim: '#ffd23f', trim2: '#ffb703', smoke: '#3d3d4a', glass: '#bde0fe', wood: '#9c6b3c',
};

function drawLoco(ctx, F, pal, facing, t) {
  carShadow(ctx, F, LOCO_LEN);
  drawParts(ctx, F, LOCO_PARTS, pal);
  if (!facing) return;
  // front mod os: røgkammer-dør og lygte
  const door = P(...F(LOCO_LEN + 0.27, 0, 1.75));
  if (door) {
    ctx.fillStyle = '#2a2a33';
    ell(ctx, door.x, door.y, door.s * 0.62, door.s * 0.62); ctx.fill();
    ctx.strokeStyle = pal.trim; ctx.lineWidth = Math.max(1, door.s * 0.08); ctx.stroke();
  }
  const lamp = P(...F(LOCO_LEN + 0.3, 0, 2.85));
  if (lamp) {
    const pulse = 0.85 + 0.15 * Math.sin(t * 12);
    const g = ctx.createRadialGradient(lamp.x, lamp.y, 0, lamp.x, lamp.y, lamp.s * 1.6);
    g.addColorStop(0, 'rgba(255,250,200,0.95)');
    g.addColorStop(1, 'rgba(255,240,150,0)');
    ctx.fillStyle = g;
    ell(ctx, lamp.x, lamp.y, lamp.s * 1.6 * pulse, lamp.s * 1.6 * pulse); ctx.fill();
    ctx.fillStyle = '#fffbe0';
    ell(ctx, lamp.x, lamp.y, lamp.s * 0.3, lamp.s * 0.3); ctx.fill();
  }
}

const WAGON_PARTS = [
  [0, CAR_LEN, -1.1, 1.1, 0.3, 0.9, 'dark'],
  ...WHEELS(CAR_LEN),
  [0.1, CAR_LEN - 0.1, -1.18, 1.18, 0.9, 1.95, 'wood'],
];
const FREIGHT_PARTS = [
  [0, CAR_LEN, -1.1, 1.1, 0.3, 0.9, 'dark'],
  ...WHEELS(CAR_LEN),
  [0.1, CAR_LEN - 0.1, -1.2, 1.2, 0.9, 2.8, 'freight'],
  [0, CAR_LEN, -1.32, 1.32, 2.8, 3.0, 'roof'],
];

// Guldsække læsset på dine vogne.
function drawWagonSacks(ctx, F, count) {
  const spots = [];
  for (let i = 0; i < count; i++) {
    const layer = Math.floor(i / 6), k = i % 6;
    spots.push(F(0.9 + (k % 3) * 1.6, (k < 3 ? -0.45 : 0.45) + (layer % 2) * 0.2, 1.95 + layer * 0.45));
  }
  spots.sort((a, b) => b[2] - a[2]);
  for (const s of spots) {
    const p = P(...s);
    if (p) drawSackAt(ctx, p.x, p.y, p.s * 0.42);
  }
}

// ---------- Små figurer (tegnes som "papfigurer", der vender mod kameraet) ----------
function drawSackAt(ctx, sx, sy, r) {
  ctx.fillStyle = '#c98b2f';
  ctx.beginPath();
  ctx.moveTo(sx - r * 0.3, sy - r * 1.5);
  ctx.quadraticCurveTo(sx - r * 1.1, sy - r * 0.9, sx - r * 0.85, sy - r * 0.2);
  ctx.quadraticCurveTo(sx, sy + r * 0.2, sx + r * 0.85, sy - r * 0.2);
  ctx.quadraticCurveTo(sx + r * 1.1, sy - r * 0.9, sx + r * 0.3, sy - r * 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7a4f17';
  ctx.lineWidth = Math.max(1, r * 0.09);
  ctx.stroke();
  ctx.fillStyle = '#dda24a';
  ell(ctx, sx, sy - r * 1.6, r * 0.42, r * 0.2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#e63946';
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath(); ctx.moveTo(sx - r * 0.32, sy - r * 1.42); ctx.lineTo(sx + r * 0.32, sy - r * 1.42); ctx.stroke();
  if (r > 4) {
    ctx.fillStyle = '#ffd23f';
    ell(ctx, sx, sy - r * 0.72, r * 0.36, r * 0.36); ctx.fill();
    ctx.strokeStyle = '#b8860b'; ctx.lineWidth = Math.max(1, r * 0.07); ctx.stroke();
    if (r > 9) star(ctx, sx, sy - r * 0.72, r * 0.22, '#fff3b0');
  }
}

function drawGem(ctx, sx, sy, r, t) {
  const cy = sy - r * 1.3;
  ctx.fillStyle = '#5ee7ff';
  ctx.beginPath();
  ctx.moveTo(sx - r * 0.8, cy - r * 0.25);
  ctx.lineTo(sx - r * 0.45, cy - r * 0.7);
  ctx.lineTo(sx + r * 0.45, cy - r * 0.7);
  ctx.lineTo(sx + r * 0.8, cy - r * 0.25);
  ctx.lineTo(sx, cy + r * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1b8fb0'; ctx.lineWidth = Math.max(1, r * 0.08); ctx.stroke();
  ctx.fillStyle = '#c7f7ff';
  ctx.beginPath();
  ctx.moveTo(sx - r * 0.45, cy - r * 0.7); ctx.lineTo(sx, cy - r * 0.25); ctx.lineTo(sx + r * 0.45, cy - r * 0.7);
  ctx.closePath(); ctx.fill();
  const sp = 0.5 + 0.5 * Math.sin(t * 5);
  star(ctx, sx + r * 0.6, cy - r * 0.8, r * 0.35 * sp + 1, '#ffffff');
}

function drawCow(ctx, sx, sy, r, face, step) {
  ctx.fillStyle = '#3d3d3d';
  for (const [lx, ph] of [[-0.75, 0], [-0.45, 1], [0.45, 1], [0.75, 0]]) {
    const lift = step ? Math.max(0, Math.sin(step * 10 + ph * Math.PI)) * 0.15 * r : 0;
    ctx.fillRect(sx + lx * r - 0.08 * r, sy - 0.95 * r - lift, 0.16 * r, 0.95 * r);
  }
  ctx.strokeStyle = '#333';
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.fillStyle = '#ffffff';
  ell(ctx, sx, sy - 1.3 * r, 1.0 * r, 0.5 * r); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2b2b2b';
  ell(ctx, sx - 0.35 * r, sy - 1.4 * r, 0.24 * r, 0.17 * r); ctx.fill();
  ell(ctx, sx + 0.32 * r, sy - 1.18 * r, 0.18 * r, 0.14 * r); ctx.fill();
  const hx = sx + face * 1.0 * r, hy = sy - 1.55 * r;
  ctx.fillStyle = '#f1e3c2';
  ell(ctx, hx - 0.26 * r, hy - 0.33 * r, 0.08 * r, 0.14 * r, -0.4); ctx.fill();
  ell(ctx, hx + 0.26 * r, hy - 0.33 * r, 0.08 * r, 0.14 * r, 0.4); ctx.fill();
  ctx.fillStyle = '#2b2b2b';
  ell(ctx, hx - 0.38 * r, hy - 0.1 * r, 0.14 * r, 0.07 * r); ctx.fill();
  ell(ctx, hx + 0.38 * r, hy - 0.1 * r, 0.14 * r, 0.07 * r); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ell(ctx, hx, hy, 0.34 * r, 0.32 * r); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f4a6b8';
  ell(ctx, hx, hy + 0.16 * r, 0.25 * r, 0.14 * r); ctx.fill();
  ctx.fillStyle = '#111';
  ell(ctx, hx - 0.12 * r, hy - 0.06 * r, 0.05 * r, 0.05 * r); ctx.fill();
  ell(ctx, hx + 0.12 * r, hy - 0.06 * r, 0.05 * r, 0.05 * r); ctx.fill();
}

function drawTree(ctx, sx, sy, s, kind) {
  if (kind === 3) {
    ctx.fillStyle = '#9a9a9a';
    ell(ctx, sx, sy - 0.5 * s, 1.1 * s, 0.6 * s); ctx.fill();
    ctx.fillStyle = '#b8b8b8';
    ell(ctx, sx - 0.25 * s, sy - 0.7 * s, 0.5 * s, 0.25 * s); ctx.fill();
    return;
  }
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(sx - 0.25 * s, sy - 1.4 * s, 0.5 * s, 1.4 * s);
  if (kind === 0 || kind === 2) {
    const greens = kind ? ['#1b4332', '#2d6a4f', '#40916c'] : ['#2d6a4f', '#40916c', '#52b788'];
    for (let i = 0; i < 3; i++) {
      const base = sy - (1.1 + i * 1.6) * s, wdt = (2.0 - i * 0.5) * s;
      ctx.fillStyle = greens[i];
      ctx.beginPath();
      ctx.moveTo(sx - wdt, base); ctx.lineTo(sx + wdt, base); ctx.lineTo(sx, base - 2.6 * s);
      ctx.closePath(); ctx.fill();
    }
  } else {
    ctx.fillStyle = '#52b788';
    ell(ctx, sx, sy - 3.0 * s, 1.8 * s, 1.7 * s); ctx.fill();
    ctx.fillStyle = '#74c69d';
    ell(ctx, sx - 0.5 * s, sy - 3.4 * s, 0.8 * s, 0.7 * s); ctx.fill();
  }
}

// ---------- Røg ----------
const Smoke = {
  update(w, dt) {
    if (!w.smoke) { w.smoke = []; w.smokeT = 0; }
    const pl = w.player;
    w.smokeT -= dt;
    if (w.smokeT <= 0) {
      w.smokeT = w.arrived ? 0.25 : 0.07;
      const z = pl.p - 1.25;
      w.smoke.push({ x: w.px(z) + (Math.random() - 0.5) * 0.3, y: 3.9, z, r: 0.3, life: 0, max: 1.0, own: true });
      for (const tr of w.trains) {
        if (tr.dead || tr.q - pl.p > VIEW) continue;
        if (Math.random() < 0.6) w.smoke.push({ x: laneX(tr.lane, w.n), y: 3.9, z: tr.q + 1.25, r: 0.35, life: 0, max: 1.3 });
      }
    }
    for (const s of w.smoke) { s.life += dt; s.y += 1.5 * dt; s.r += 1.0 * dt; }
    w.smoke = w.smoke.filter((s) => s.life < s.max);
  },
};

// ---------- Hele scenen ----------
function drawScene(ctx, w, t, showArrows) {
  drawSky(ctx);
  drawTrack(ctx, w);
  if (showArrows) drawSwitchArrows(ctx, w, t);
  drawFog(ctx, w);

  const pl = w.player, n = w.n;
  const { zN } = trackRange(w);
  const zFar = pl.p + VIEW;
  const objs = [];
  const add = (z, fn) => { if (z >= zN - 1 && z <= zFar + 4) objs.push({ z, fn }); };

  // træer og sten langs banen
  const half = laneX(n - 1, n) + 1.7;
  for (let k = Math.floor(zN / 7); k <= Math.ceil(zFar / 7); k++) {
    for (const side of [-1, 1]) {
      const h = hash(k * 3 + (side > 0 ? 1 : 0));
      if (h > 0.55) continue;
      const x = side * (half + 2.5 + hash(k * 7 + side * 3) * 16);
      const z = k * 7 + hash(k * 11 + side) * 5;
      const kind = Math.floor(hash(k * 13 + side * 5) * 4);
      add(z, () => {
        const p = P(x, 0, z);
        if (!p) return;
        ctx.globalAlpha = fogA(w, z);
        drawTree(ctx, p.x, p.y, p.s, kind);
        ctx.globalAlpha = 1;
      });
    }
  }

  // stationen
  const L = w.def.len;
  if (L - pl.p < VIEW + 20) add(L + 4, () => drawStation(ctx, w));

  // guld og diamanter
  for (const g of w.gold) {
    add(g.z, () => {
      const x = w.goldX(g);
      const hop = g.hop ? Math.sin(smooth(g.hop.t) * Math.PI) * 2.5 : 0;
      const p = P(x, 0.15 + hop + (g.bob !== undefined ? Math.sin(t * 3 + g.bob) * 0.12 : 0), g.z);
      const ps = P(x, 0.02, g.z);
      if (!p || !ps) return;
      ctx.globalAlpha = fogA(w, g.z);
      ctx.fillStyle = 'rgba(30,30,20,0.25)';
      ell(ctx, ps.x, ps.y, p.s * 0.6, p.s * 0.2); ctx.fill();
      if (g.kind === 'gem') drawGem(ctx, p.x, p.y, p.s * 0.65, t);
      else drawSackAt(ctx, p.x, p.y, p.s * 0.55);
      ctx.globalAlpha = 1;
    });
  }

  // køer
  for (const c of w.cows) {
    add(c.z, () => {
      let off = 0, step = 0;
      if (c.state === 'enter') { off = c.side * 5 * (1 - smooth(c.t)); step = c.t; }
      else if (c.state === 'leave') { off = c.side * 9 * smooth(c.t / 1.3); step = c.t; }
      const p = P(laneX(c.lane, n) + off, 0, c.z);
      if (!p) return;
      ctx.globalAlpha = fogA(w, c.z);
      ctx.fillStyle = 'rgba(30,30,20,0.25)';
      ell(ctx, p.x, p.y, p.s * 1.1, p.s * 0.3); ctx.fill();
      const face = c.state === 'leave' ? c.side : -c.side;
      drawCow(ctx, p.x, p.y, p.s, face, step);
      ctx.globalAlpha = 1;
    });
  }

  // modkørende tog
  for (const tr of w.trains) {
    if (tr.dead) continue;
    const x = laneX(tr.lane, n);
    const pal = Object.assign({}, PLAYER_PAL, tr.col);
    const locoBack = tr.q + LOCO_LEN;
    add(tr.q + LOCO_LEN / 2, () => {
      ctx.globalAlpha = fogA(w, tr.q);
      drawLoco(ctx, carFrame(x, locoBack, x, tr.q), pal, true, t);
      ctx.globalAlpha = 1;
      // et tog langt ude får et blinkende "!", så man opdager det i tide
      const far = tr.q - pl.p;
      if (far > 30 && !tr.passed) {
        const m = P(x, 6.2, tr.q);
        if (m) {
          const r = Math.max(13, m.s * 1.3) * (1 + 0.12 * Math.sin(t * 10));
          ctx.globalAlpha = clamp((far - 30) / 15, 0, 1);
          ctx.fillStyle = '#ff595e';
          ell(ctx, m.x, m.y - r, r, r); ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
          text(ctx, '!', m.x, m.y - r, r * 1.5, '#fff', 'center', null);
          ctx.globalAlpha = 1;
        }
      }
    });
    for (let i = 0; i < ON_CARS; i++) {
      const zf = locoBack + CAR_GAP + i * (CAR_LEN + CAR_GAP), zb = zf + CAR_LEN;
      add(zf + CAR_LEN / 2, () => {
        ctx.globalAlpha = fogA(w, zf);
        const F = carFrame(x, zb, x, zf);
        carShadow(ctx, F, CAR_LEN);
        drawParts(ctx, F, FREIGHT_PARTS, pal);
        ctx.globalAlpha = 1;
      });
    }
  }

  // dit tog
  const cars = carsOf(pl.p);
  const perCar = Math.ceil(w.carried / N_CARS);
  cars.forEach((c) => {
    add((c.zf + c.zb) / 2, () => {
      const F = carFrame(w.px(c.zb), c.zb, w.px(c.zf), c.zf);
      if (c.kind === 'loco') { drawLoco(ctx, F, PLAYER_PAL, false, t); return; }
      carShadow(ctx, F, CAR_LEN);
      drawParts(ctx, F, WAGON_PARTS, PLAYER_PAL);
      const cnt = Math.max(0, Math.min(perCar, w.carried - c.i * perCar));
      drawWagonSacks(ctx, F, Math.min(cnt, 18));
    });
  });

  // røg
  if (w.smoke) for (const s of w.smoke) {
    add(s.z, () => {
      const p = P(s.x, s.y, s.z);
      if (!p) return;
      // røgen fra dit eget lokomotiv er tynd, så den ikke skjuler toget
      ctx.globalAlpha = (1 - s.life / s.max) * (s.own ? 0.22 : 0.5) * fogA(w, s.z);
      ctx.fillStyle = '#f6f6f6';
      ell(ctx, p.x, p.y, s.r * p.s, s.r * p.s); ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  objs.sort((a, b) => b.z - a.z);
  for (const o of objs) o.fn();
}

function drawStation(ctx, w) {
  const n = w.n, z = w.def.len;
  const half = laneX(n - 1, n) + 2.2;
  ctx.globalAlpha = fogA(w, z);
  for (let i = 0; i < n; i++) {
    const x = laneX(i, n);
    const F = carFrame(x, z + 1.2, x, z + 2.2);
    box(ctx, F, 0, 1, -1.1, 1.1, 0, 1.1, '#e63946');
    box(ctx, F, -0.02, 0, -1.1, 1.1, 0.5, 0.75, '#ffffff');
  }
  const F = carFrame(0, z + 4, 0, z + 12);
  box(ctx, F, 0, 7, -half - 1, half + 1, 0, 5.2, '#f2e3c6');
  for (let i = 0; i < n; i++) {
    const x = laneX(i, n);
    box(ctx, F, -0.06, 0, x - 1.3, x + 1.3, 0, 3.6, '#5a4632');
  }
  box(ctx, F, -0.6, 7.6, -half - 1.7, half + 1.7, 5.2, 6.1, '#b23a48');
  const p = P(0, 6.9, z + 3.4);
  if (p) {
    text(ctx, 'GULDBANKEN', p.x, p.y, Math.max(8, p.s * 1.4), '#ffd23f', 'center', '#5a3a10');
  }
  ctx.globalAlpha = 1;
}
