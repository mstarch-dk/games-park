// Tegning: baggrund, køretøjer, ællingen, mor and og hjælpefunktioner.
const T = 64;      // feltstørrelse i pixels
const COLS = 15;
const ROWS = 10;
const TOP = 64;    // højde på pointlinjen øverst
const W = 960;
const H = 704;

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
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

function text(ctx, str, x, y, size, color = '#fff', align = 'center', outline = '#183024') {
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

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const to = amt < 0 ? 0 : 255;
  const a = Math.abs(amt);
  r = Math.round(r + (to - r) * a); g = Math.round(g + (to - g) * a); b = Math.round(b + (to - b) * a);
  return `rgb(${r},${g},${b})`;
}

function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
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
  if (stroke) { ctx.lineWidth = 3; ctx.strokeStyle = stroke; ctx.stroke(); }
}

// ---------- Baggrund (tegnes én gang pr. bane) ----------
function buildBackground(world) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = ROWS * T;
  const g = c.getContext('2d');
  const rnd = seeded(world.index * 977 + 13);
  const rows = world.rows;
  const road = (r) => r >= 0 && r < ROWS && (rows[r].t === 'R' || rows[r].t === 'B');

  for (let r = 0; r < ROWS; r++) {
    const y = r * T;
    const t = rows[r].t;
    if (t === 'P') {
      const grad = g.createLinearGradient(0, y, 0, y + T);
      grad.addColorStop(0, '#3aa6e0');
      grad.addColorStop(1, '#5cc8f0');
      g.fillStyle = grad;
      g.fillRect(0, y, W, T);
      // åkander
      for (let i = 0; i < 6; i++) {
        const lx = 60 + i * 165 + rnd() * 40, ly = y + 18 + rnd() * 28;
        if (Math.abs(lx - 7.5 * T) < 70) continue;
        g.fillStyle = '#3fa34d';
        g.beginPath(); g.moveTo(lx, ly); g.arc(lx, ly, 13, 0.4, Math.PI * 2 - 0.1); g.closePath(); g.fill();
        if (rnd() < 0.5) { g.fillStyle = '#ffafcc'; ell(g, lx - 3, ly - 2, 5, 4); g.fill(); }
      }
      // siv i kanterne
      for (const sx of [10, 26, 930, 946]) {
        g.strokeStyle = '#4f772d'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(sx, y + T); g.lineTo(sx + 3, y + 10); g.stroke();
        g.fillStyle = '#7f5539'; rr(g, sx, y + 6, 8, 18, 4); g.fill();
      }
      g.fillStyle = '#e9d8a6';
      g.fillRect(0, y + T - 6, W, 6);
    } else if (t === 'G') {
      g.fillStyle = '#78c850';
      g.fillRect(0, y, W, T);
      for (let i = 0; i < 70; i++) {
        const gx = rnd() * W, gy = y + 4 + rnd() * (T - 8);
        g.strokeStyle = rnd() < 0.5 ? '#5fae3c' : '#8fd960';
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx - 2, gy - 6); g.moveTo(gx, gy); g.lineTo(gx + 3, gy - 5); g.stroke();
      }
      for (let i = 0; i < 9; i++) {
        const fx = rnd() * W, fy = y + 8 + rnd() * (T - 16);
        g.fillStyle = pick(['#fff', '#ffd166', '#ffafcc', '#cdb4db']);
        for (let k = 0; k < 5; k++) { const a = (k * Math.PI * 2) / 5; ell(g, fx + Math.cos(a) * 3.5, fy + Math.sin(a) * 3.5, 2.6, 2.6); g.fill(); }
        g.fillStyle = '#f4a300'; ell(g, fx, fy, 2, 2); g.fill();
      }
    } else if (t === 'S') {
      g.fillStyle = '#d8d2c4';
      g.fillRect(0, y, W, T);
      g.strokeStyle = '#bdb6a6';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, y + T / 2); g.lineTo(W, y + T / 2);
      for (let x = 0; x <= W; x += 48) {
        const off = (Math.floor(x / 48) % 2) * 0;
        g.moveTo(x + off, y); g.lineTo(x + off, y + T);
      }
      g.stroke();
    } else {
      g.fillStyle = t === 'B' ? '#575763' : '#4a4e57';
      g.fillRect(0, y, W, T);
      for (let i = 0; i < 120; i++) {
        g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
        g.fillRect(rnd() * W, y + rnd() * T, 3, 3);
      }
    }
  }

  // Kantsten, striber og pile
  for (let r = 0; r < ROWS; r++) {
    const y = r * T;
    if (!road(r)) {
      if (rows[r].t !== 'P') {
        g.fillStyle = '#a39d90';
        if (road(r - 1)) g.fillRect(0, y, W, 6);
        if (road(r + 1)) g.fillRect(0, y + T - 6, W, 6);
      }
      continue;
    }
    const lane = world.lanes[r];
    g.strokeStyle = '#f4f4f4';
    g.lineWidth = 3;
    if (!road(r - 1)) { g.beginPath(); g.moveTo(0, y + 9); g.lineTo(W, y + 9); g.stroke(); }
    if (!road(r + 1)) { g.beginPath(); g.moveTo(0, y + T - 9); g.lineTo(W, y + T - 9); g.stroke(); }
    if (road(r + 1)) {
      const bikeEdge = rows[r].t === 'B' || rows[r + 1].t === 'B';
      if (bikeEdge) {
        g.fillStyle = '#a39d90';
        g.fillRect(0, y + T - 3, W, 6);
      } else {
        g.setLineDash([28, 22]);
        g.beginPath(); g.moveTo(0, y + T); g.lineTo(W, y + T); g.stroke();
        g.setLineDash([]);
      }
    }
    // Pile der viser kørselsretningen / cykel-symboler
    const cy = y + T / 2;
    for (const col of [2, 7, 12]) {
      if (world.light && Math.abs(col - world.light.col) < 2) continue;
      const cx = col * T + T / 2;
      g.save();
      g.translate(cx, cy);
      g.scale(lane.dir, 1);
      g.globalAlpha = 0.35;
      g.fillStyle = '#fff';
      g.strokeStyle = '#fff';
      if (rows[r].t === 'B') {
        g.lineWidth = 3;
        g.beginPath(); g.arc(-12, 6, 8, 0, Math.PI * 2); g.arc(12, 6, 8, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.moveTo(-12, 6); g.lineTo(-2, -6); g.lineTo(12, 6); g.moveTo(-2, -6); g.lineTo(8, -6); g.stroke();
        g.beginPath(); g.moveTo(24, -6); g.lineTo(34, 0); g.lineTo(24, 6); g.fill();
      } else {
        g.beginPath();
        g.moveTo(-22, -4); g.lineTo(6, -4); g.lineTo(6, -12); g.lineTo(24, 0); g.lineTo(6, 12); g.lineTo(6, 4); g.lineTo(-22, 4);
        g.closePath(); g.fill();
      }
      g.restore();
    }
  }

  // Fodgængerfelt med stoplinjer
  if (world.light) {
    const col = world.light.col;
    for (const r of world.roadRows) {
      const y = r * T;
      g.fillStyle = '#f4f4f4';
      for (let sy = 6; sy < T - 4; sy += 14) g.fillRect(col * T + 4, y + sy, T - 8, 8);
      const lane = world.lanes[r];
      const sx = lane.dir > 0 ? col * T - 12 : (col + 1) * T + 6;
      g.fillRect(sx, y + 4, 6, T - 8);
    }
  }
  return c;
}

// ---------- Køretøjer ----------
function drawEyes(ctx, x, y, r, gap, scared) {
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ell(ctx, x, y + s * gap, r, r * (scared ? 1.15 : 1)); ctx.fill();
    ctx.fillStyle = '#1d1d2b';
    ell(ctx, x + r * 0.35, y + s * gap, r * (scared ? 0.35 : 0.5), r * (scared ? 0.35 : 0.5)); ctx.fill();
  }
}

function wheels(ctx, xs, h2, ww = 14, wh = 6) {
  ctx.fillStyle = '#1f1f24';
  for (const x of xs) {
    rr(ctx, x - ww / 2, -h2 - 3, ww, wh, 2); ctx.fill();
    rr(ctx, x - ww / 2, h2 - wh + 3, ww, wh, 2); ctx.fill();
  }
}

function drawVehicle(ctx, lane, v, t, ghost) {
  const L = v.len * T - 6;
  const x = lane.x(v) * T + 3 + L / 2;
  const cy = TOP + lane.row * T + T / 2;
  const w = v.kind.w, h2 = w / 2, l2 = L / 2;
  const scared = v.honkT > 0;
  ctx.save();
  ctx.translate(x, cy);
  if (lane.dir < 0) ctx.scale(-1, 1);

  if (ghost) {
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    rr(ctx, -l2, -h2, L, w, 12); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    return;
  }

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  rr(ctx, -l2 + 4, -h2 + 5, L, w, 12); ctx.fill();
  const col = v.color;

  switch (v.type) {
    case 'bus': {
      wheels(ctx, [-l2 + 22, l2 - 26], h2, 18, 7);
      ctx.fillStyle = col; rr(ctx, -l2, -h2, L, w, 10); ctx.fill();
      ctx.fillStyle = shade(col, 0.35); rr(ctx, -l2 + 10, -h2 + 10, L - 40, w - 20, 6); ctx.fill();
      ctx.fillStyle = '#bfe6ff';
      for (let wx = -l2 + 8; wx < l2 - 40; wx += 22) { rr(ctx, wx, -h2 + 2, 16, 6, 2); ctx.fill(); rr(ctx, wx, h2 - 8, 16, 6, 2); ctx.fill(); }
      rr(ctx, l2 - 22, -h2 + 5, 14, w - 10, 4); ctx.fill();
      drawEyes(ctx, l2 - 15, 0, 6, 10, scared);
      text(ctx, '5A', -l2 + 30, 0, 14, '#fff', 'center', shade(col, -0.4));
      break;
    }
    case 'lastbil': {
      const cabL = 44;
      wheels(ctx, [-l2 + 18, -l2 + 40, l2 - 24], h2, 16, 7);
      ctx.fillStyle = '#eef0f2'; rr(ctx, -l2, -h2, L - cabL - 4, w, 6); ctx.fill();
      ctx.fillStyle = col; ctx.fillRect(-l2 + 6, -5, L - cabL - 16, 10);
      ctx.fillStyle = col; rr(ctx, l2 - cabL, -h2 + 2, cabL, w - 4, 10); ctx.fill();
      ctx.fillStyle = '#bfe6ff'; rr(ctx, l2 - 16, -h2 + 7, 10, w - 14, 4); ctx.fill();
      drawEyes(ctx, l2 - 11, 0, 5.5, 10, scared);
      break;
    }
    case 'traktor': {
      ctx.fillStyle = '#1f1f24';
      rr(ctx, -l2 + 2, -h2 - 6, 28, 13, 4); ctx.fill();
      rr(ctx, -l2 + 2, h2 - 7, 28, 13, 4); ctx.fill();
      rr(ctx, l2 - 20, -h2 + 2, 14, 8, 3); ctx.fill();
      rr(ctx, l2 - 20, h2 - 10, 14, 8, 3); ctx.fill();
      ctx.fillStyle = col; rr(ctx, -l2 + 6, -h2 + 8, L - 6, w - 16, 8); ctx.fill();
      ctx.fillStyle = shade(col, -0.25); rr(ctx, -l2 + 6, -h2 + 8, 30, w - 16, 8); ctx.fill();
      ctx.fillStyle = '#ffd6a5'; ell(ctx, -l2 + 22, 0, 9, 9); ctx.fill();
      ctx.fillStyle = '#e63946'; ell(ctx, -l2 + 20, 0, 9, 7); ctx.fill();
      ctx.fillStyle = '#333'; ell(ctx, 4, -7, 3.5, 3.5); ctx.fill();
      for (let i = 0; i < 3; i++) {
        const k = (t * 1.2 + i / 3 + v.seed) % 1;
        ctx.fillStyle = `rgba(220,220,220,${0.5 * (1 - k)})`;
        ell(ctx, 4 - k * 26, -7 - k * 10, 4 + k * 6, 4 + k * 6); ctx.fill();
      }
      drawEyes(ctx, l2 - 9, 0, 5, 8, scared);
      break;
    }
    case 'cykel': {
      ctx.fillStyle = '#222';
      rr(ctx, -l2, -2, 18, 4, 2); ctx.fill();
      rr(ctx, l2 - 18, -2, 18, 4, 2); ctx.fill();
      ctx.strokeStyle = '#444'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-l2 + 9, 0); ctx.lineTo(l2 - 9, 0); ctx.moveTo(l2 - 12, -8); ctx.lineTo(l2 - 12, 8); ctx.stroke();
      ctx.fillStyle = col; ell(ctx, -3, 0, 8, 13); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(l2 - 12, -8); ctx.moveTo(0, 9); ctx.lineTo(l2 - 12, 8); ctx.stroke();
      ctx.fillStyle = '#ffd6a5'; ell(ctx, 2, 0, 7, 7); ctx.fill();
      ctx.fillStyle = shade(col, -0.2); ell(ctx, 0, 0, 7, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(-6, -1.5, 10, 3);
      break;
    }
    case 'isbil': {
      wheels(ctx, [-l2 + 20, l2 - 22], h2);
      ctx.fillStyle = '#fffaf3'; rr(ctx, -l2, -h2, L, w, 12); ctx.fill();
      ctx.fillStyle = col;
      for (let sx = -l2 + 6; sx < l2 - 30; sx += 16) { ctx.fillRect(sx, -h2, 8, 5); ctx.fillRect(sx, h2 - 5, 8, 5); }
      ctx.fillStyle = '#bfe6ff'; rr(ctx, l2 - 22, -h2 + 6, 14, w - 12, 5); ctx.fill();
      // is-vaffel på taget
      ctx.fillStyle = '#e0a458';
      ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(4, -10); ctx.lineTo(4, 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff8fab'; ell(ctx, 8, 0, 12, 12); ctx.fill();
      ctx.fillStyle = '#c9184a'; ell(ctx, 12, -4, 3.5, 3.5); ctx.fill();
      drawEyes(ctx, l2 - 15, 0, 5.5, 9, scared);
      break;
    }
    default: { // bil
      wheels(ctx, [-l2 + 16, l2 - 18], h2);
      ctx.fillStyle = col; rr(ctx, -l2, -h2, L, w, 13); ctx.fill();
      ctx.fillStyle = shade(col, -0.15); rr(ctx, -l2 + 14, -h2 + 6, L * 0.45, w - 12, 8); ctx.fill();
      ctx.fillStyle = '#bfe6ff'; rr(ctx, l2 - 30, -h2 + 6, 14, w - 12, 5); ctx.fill();
      ctx.fillStyle = '#9cc9e8'; rr(ctx, -l2 + 6, -h2 + 9, 7, w - 18, 3); ctx.fill();
      ctx.fillStyle = '#fff6a0'; ell(ctx, l2 - 4, -h2 + 7, 4, 4); ctx.fill(); ell(ctx, l2 - 4, h2 - 7, 4, 4); ctx.fill();
      ctx.fillStyle = '#ff4d4d'; ctx.fillRect(-l2, -h2 + 4, 3, 7); ctx.fillRect(-l2, h2 - 11, 3, 7);
      drawEyes(ctx, l2 - 23, 0, 5.5, 9, scared);
    }
  }
  ctx.restore();

  if (v.honkT > 0) {
    const fx = lane.dir > 0 ? x + l2 - 10 : x - l2 + 10;
    const word = v.type === 'cykel' ? 'KLING!' : 'DYT!';
    const bob = Math.sin(t * 30) * 2;
    ctx.fillStyle = '#fff';
    rr(ctx, fx - 34, cy - 58 + bob, 68, 28, 12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(fx - 6, cy - 31 + bob); ctx.lineTo(fx + 4, cy - 31 + bob); ctx.lineTo(fx, cy - 22); ctx.fill();
    text(ctx, word, fx, cy - 44 + bob, 17, '#e63946', 'center', null);
  }
}

// Kig-hjælp: viser hvor køretøjet er om lidt.
const GHOST_TIME = 1.0;
function drawGhost(ctx, lane, v) {
  if (v.cur < 0.1) return;
  const g = { ...v, p: v.p + v.cur * GHOST_TIME, honkT: 0 };
  drawVehicle(ctx, lane, g, 0, true);
  const cy = TOP + lane.row * T + T / 2;
  const fx = (lane.dir > 0 ? v.p : -v.p) * T;
  const gx = (lane.dir > 0 ? g.p : -g.p) * T;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 3;
  ctx.setLineDash([4, 6]);
  ctx.beginPath(); ctx.moveTo(fx, cy); ctx.lineTo(gx, cy); ctx.stroke();
  ctx.setLineDash([]);
}

// ---------- Lyset ved fodgængerfeltet ----------
function drawLight(ctx, world, t) {
  const L = world.light;
  if (!L) return;
  const top = world.roadRows[0], bot = world.roadRows[world.roadRows.length - 1];
  const ped = L.pedGreen();
  const blinkOff = L.pedBlink() && Math.floor(t * 4) % 2 === 0;
  // Selve fodgængerfeltet gløder grønt, når ællingen må gå, og svagt rødt ellers.
  ctx.fillStyle = ped && !blinkOff ? `rgba(61,255,110,${0.28 + Math.sin(t * 6) * 0.08})` : 'rgba(255,59,59,0.16)';
  ctx.fillRect(L.col * T, TOP + top * T, T, (bot - top + 1) * T);
  const posts = [
    { x: (L.col + 1) * T + 10, y: TOP + top * T - 54 },
    { x: L.col * T - 44, y: TOP + (bot + 1) * T + 8 },
  ];
  for (const p of posts) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; rr(ctx, p.x + 3, p.y + 3, 34, 46, 7); ctx.fill();
    ctx.fillStyle = '#2b2d42'; rr(ctx, p.x, p.y, 34, 46, 7); ctx.fill();
    // fodgænger-lys med en lille and
    ctx.fillStyle = !ped ? '#ff3b3b' : '#552222'; ell(ctx, p.x + 12, p.y + 12, 8, 8); ctx.fill();
    ctx.fillStyle = ped && !blinkOff ? '#3dff6e' : '#1f4d2b'; ell(ctx, p.x + 12, p.y + 33, 8, 8); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ell(ctx, p.x + 11, p.y + 14, 4, 3); ctx.fill(); ell(ctx, p.x + 13, p.y + 10, 2.4, 2.4); ctx.fill();
    ell(ctx, p.x + 11, p.y + 35, 4, 3); ctx.fill(); ell(ctx, p.x + 13, p.y + 31, 2.4, 2.4); ctx.fill();
    // bil-lys (rød / gul / grøn)
    const ph = L.phase;
    const lamps = [
      ['#ff3b3b', ph === 'red' || ph === 'redyellow'],
      ['#ffd23f', ph === 'yellow' || ph === 'redyellow'],
      ['#3dff6e', ph === 'green'],
    ];
    lamps.forEach(([c, on], i) => {
      ctx.fillStyle = on ? c : 'rgba(255,255,255,0.12)';
      ell(ctx, p.x + 27, p.y + 10 + i * 13, 4.5, 4.5); ctx.fill();
    });
  }
}

// ---------- Ællingen og mor and ----------
function drawDuckling(ctx, x, y, s, face, o = {}) {
  const body = o.body || '#ffd23f';
  const dark = o.dark || '#f4a300';
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(s * face, s);
  if (o.swim) { ctx.beginPath(); ctx.rect(-40, -50, 80, 58); ctx.clip(); }
  if (!o.swim) {
    const k = o.step || 0;
    ctx.fillStyle = '#ff8c1a';
    ell(ctx, -6 + k * 3, 17, 6, 3); ctx.fill();
    ell(ctx, 6 - k * 3, 17, 6, 3); ctx.fill();
  }
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-24, -8); ctx.lineTo(-17, 8); ctx.closePath(); ctx.fill();
  ell(ctx, 0, 5, 18, 14); ctx.fill();
  ctx.fillStyle = dark;
  ell(ctx, -4, 6, 9, 6, o.flap ? -0.6 : 0.15); ctx.fill();
  ctx.fillStyle = body;
  ell(ctx, 9, -10, 11.5, 11); ctx.fill();
  ctx.strokeStyle = body; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(7, -20); ctx.quadraticCurveTo(4, -27, 9, -27); ctx.stroke();
  if (o.scarf) {
    ctx.fillStyle = o.scarf;
    rr(ctx, 0, -2, 16, 6, 3); ctx.fill();
  }
  ctx.fillStyle = '#ff8c1a';
  ell(ctx, 21, -8, 6.5, 3.6); ctx.fill();
  if (o.open) { ctx.fillStyle = '#c1440e'; ell(ctx, 21, -6, 5, 1.6); ctx.fill(); }
  if (o.blink) {
    ctx.strokeStyle = '#1d1d2b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, -12); ctx.lineTo(15, -12); ctx.stroke();
  } else {
    ctx.fillStyle = '#1d1d2b'; ell(ctx, 13, -12, o.scared ? 3.4 : 2.7, o.scared ? 3.4 : 2.9); ctx.fill();
    ctx.fillStyle = '#fff'; ell(ctx, 13.8, -13, 1, 1); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,120,140,0.45)';
  ell(ctx, 9, -5, 3.2, 2.4); ctx.fill();
  ctx.restore();
}

function drawShadow(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ell(ctx, x, y, r, r * 0.4); ctx.fill();
}

function drawPond(ctx, t) {
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const x = ((i * 151 + t * 18) % (W + 80)) - 40;
    const y = TOP + 14 + ((i * 23) % 36);
    ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.quadraticCurveTo(x, y - 5, x + 14, y); ctx.stroke();
  }
}

function drawMother(ctx, x, t, face, happy) {
  const y = TOP + 34 + Math.sin(t * 2) * 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ell(ctx, x, y + 14, 34 + Math.sin(t * 3) * 3, 7); ctx.stroke();
  drawDuckling(ctx, x, y, 1.45, face, {
    body: '#fffdf5', dark: '#e9e3d3', swim: true, scarf: '#4361ee', open: happy && Math.sin(t * 14) > 0,
  });
}

function drawCorn(ctx, c, r, t, bob) {
  const x = c * T + T / 2, y = TOP + r * T + T / 2 + Math.sin(t * 3 + bob) * 3;
  drawShadow(ctx, x, TOP + r * T + T / 2 + 14, 12);
  for (const [dx, dy] of [[-7, 3], [7, 3], [0, -6]]) {
    ctx.fillStyle = '#ffbe0b';
    ell(ctx, x + dx, y + dy, 6, 7.5); ctx.fill();
    ctx.fillStyle = '#fff3b0';
    ell(ctx, x + dx - 2, y + dy - 3, 2, 2.5); ctx.fill();
  }
  if (Math.sin(t * 4 + bob) > 0.85) star(ctx, x + 12, y - 12, 6, '#fff');
}
