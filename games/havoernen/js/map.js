// Kortet over de danske farvande: kyster, øer, havne og sejlruter.
// Kysterne er tegnet i længde-/breddegrader og omregnes til spil-koordinater.
// (Forenklet med vilje – sundene er gjort lidt bredere, så man kan sejle igennem.)
const MAP = {
  lonMin: 7.7, lonMax: 13.5, latMin: 54.1, latMax: 58.0,
  kx: 560, ky: 1000, // pixel pr. grad
};
MAP.w = (MAP.lonMax - MAP.lonMin) * MAP.kx;
MAP.h = (MAP.latMax - MAP.latMin) * MAP.ky;

function geo(lon, lat) { return { x: (lon - MAP.lonMin) * MAP.kx, y: (MAP.latMax - lat) * MAP.ky }; }

const LAND_DATA = [
  { name: 'Jylland', big: true, pts: [
    [7.6, 54.0], [8.85, 54.0], [8.85, 54.3], [8.65, 54.9], [8.6, 55.1], [8.65, 55.35], [8.45, 55.45], [8.08, 55.56],
    [8.15, 56.0], [8.12, 56.55], [8.25, 56.8], [8.6, 57.12], [9.1, 57.15], [9.6, 57.45], [10.0, 57.6], [10.6, 57.74],
    [10.47, 57.58], [10.53, 57.44], [10.45, 57.2], [10.3, 56.98], [10.3, 56.75], [10.35, 56.55], [10.95, 56.45],
    [10.85, 56.25], [10.55, 56.1], [10.22, 56.15], [10.2, 55.95], [10.0, 55.85], [9.85, 55.7], [9.72, 55.56],
    [9.68, 55.45], [9.63, 55.25], [9.6, 55.1], [9.75, 55.0], [9.92, 54.95], [9.8, 54.85], [9.6, 54.85],
    [10.0, 54.6], [10.0, 54.47], [10.2, 54.42], [10.25, 54.35], [10.6, 54.35], [11.0, 54.45], [11.25, 54.4],
    [11.1, 54.2], [11.6, 54.1], [12.1, 54.18], [12.5, 54.47], [13.0, 54.45], [13.4, 54.3], [13.7, 54.3], [13.7, 54.0],
  ] },
  { name: 'Sverige', big: true, pts: [
    [11.6, 58.1], [11.85, 57.7], [11.95, 57.4], [12.2, 57.15], [12.5, 56.9], [12.85, 56.65], [12.75, 56.45],
    [12.45, 56.3], [12.8, 56.2], [12.76, 56.05], [12.95, 55.85], [13.0, 55.6], [12.85, 55.4], [13.15, 55.35],
    [13.7, 55.3], [13.7, 58.1],
  ] },
  { name: 'Fyn', pts: [
    [9.95, 55.5], [10.2, 55.6], [10.45, 55.62], [10.6, 55.6], [10.8, 55.42], [10.8, 55.25], [10.75, 55.1],
    [10.6, 55.05], [10.35, 55.05], [10.1, 55.1], [9.95, 55.2], [9.93, 55.35],
  ] },
  { name: 'Sjælland', pts: [
    [11.08, 55.68], [11.2, 55.8], [11.35, 55.95], [11.5, 55.9], [11.75, 55.95], [11.9, 56.0], [12.3, 56.12],
    [12.58, 56.03], [12.56, 55.85], [12.6, 55.68], [12.35, 55.55], [12.2, 55.45], [12.45, 55.3], [12.2, 55.15],
    [12.0, 55.02], [11.75, 55.07], [11.5, 55.2], [11.15, 55.22], [11.12, 55.4], [11.12, 55.55],
  ] },
  { name: 'Lolland', pts: [
    [11.1, 54.82], [11.3, 54.95], [11.6, 54.9], [11.9, 54.98], [12.15, 54.85], [11.95, 54.56], [11.6, 54.65],
    [11.3, 54.65], [11.1, 54.75],
  ] },
  { name: 'Møn', pts: [[12.15, 55.0], [12.5, 55.05], [12.55, 54.95], [12.25, 54.95]] },
  { name: 'Langeland', pts: [[10.72, 55.0], [10.78, 54.9], [10.9, 54.75], [10.82, 54.72], [10.68, 54.9]] },
  { name: 'Ærø', pts: [[10.2, 54.9], [10.42, 54.87], [10.38, 54.8], [10.18, 54.84]] },
  { name: 'Samsø', pts: [[10.55, 55.95], [10.65, 55.93], [10.66, 55.82], [10.58, 55.8]] },
  { name: 'Læsø', pts: [[10.85, 57.28], [11.0, 57.31], [11.15, 57.27], [11.0, 57.22]] },
  { name: 'Anholt', pts: [[11.5, 56.72], [11.65, 56.73], [11.64, 56.69], [11.52, 56.69]] },
];

// Havne: dok = hvor skibet lægger til (i vandet).
const HARBOR_DATA = [
  { id: 'kbh', name: 'København', lon: 12.67, lat: 55.68, node: 'oeresund_s' },
  { id: 'hel', name: 'Helsingør', lon: 12.64, lat: 56.0, node: 'oeresund_n' },
  { id: 'aar', name: 'Aarhus', lon: 10.3, lat: 56.1, node: 'aarhus_bugt' },
  { id: 'frh', name: 'Frederikshavn', lon: 10.62, lat: 57.44, node: 'frhavn_off' },
  { id: 'nyb', name: 'Nyborg', lon: 10.87, lat: 55.31, node: 'storebaelt_s' },
  { id: 'sve', name: 'Svendborg', lon: 10.6, lat: 55.0, node: 'svendborg_sund' },
  { id: 'esb', name: 'Esbjerg', lon: 8.33, lat: 55.45, node: 'esbjerg_off' },
];

// Sejlrute-net til computerens skibe (knuder ude i vandet).
const NODE_DATA = {
  esbjerg_off: [8.0, 55.4], nordsoe: [7.9, 56.2], hanstholm: [8.4, 57.4], skagerrak: [9.6, 57.75],
  skagen: [10.75, 57.85], frhavn_off: [10.75, 57.42], laesoe_s: [10.9, 57.05], kattegat: [11.55, 57.0], anholt_e: [11.95, 56.75], samsoe_n: [10.8, 56.03], als_s: [10.05, 54.75],
  anholt_w: [11.15, 56.65], djursland: [11.15, 56.15], aarhus_bugt: [10.45, 56.0], samsoe_e: [10.85, 55.85],
  horsens_off: [10.25, 55.75], lillebaelt_n: [9.84, 55.53], lillebaelt: [9.8, 55.3], lillebaelt_s: [10.1, 54.98],
  storebaelt_n: [10.92, 55.6], storebaelt_s: [10.95, 55.2], svendborg_sund: [10.58, 54.96],
  langelandsbaelt: [11.0, 54.85], kiel_bugt: [10.45, 54.6], oestersoe_w: [11.05, 54.52], femern: [11.5, 54.52],
  gedser_s: [12.0, 54.42], oestersoe: [12.65, 54.75], oestersoe_e: [13.2, 54.95], falsterbo: [12.95, 55.15],
  koege_bugt: [12.7, 55.35], oeresund_s: [12.78, 55.7], oeresund_n: [12.67, 56.07], kattegat_s: [11.9, 56.3],
  odde_n: [11.4, 56.12],
};
const EDGE_DATA = [
  ['esbjerg_off', 'nordsoe'], ['nordsoe', 'hanstholm'], ['hanstholm', 'skagerrak'], ['skagerrak', 'skagen'],
  ['skagen', 'frhavn_off'], ['frhavn_off', 'laesoe_s'], ['skagen', 'kattegat'], ['laesoe_s', 'kattegat'],
  ['laesoe_s', 'anholt_w'], ['kattegat', 'anholt_w'], ['anholt_w', 'djursland'], ['kattegat', 'anholt_e'], ['anholt_e', 'kattegat_s'],
  ['djursland', 'aarhus_bugt'], ['djursland', 'samsoe_e'], ['djursland', 'kattegat_s'], ['aarhus_bugt', 'samsoe_n'], ['samsoe_n', 'samsoe_e'], ['samsoe_n', 'djursland'],
  ['aarhus_bugt', 'horsens_off'], ['horsens_off', 'lillebaelt_n'],
  ['lillebaelt_n', 'lillebaelt'], ['lillebaelt', 'lillebaelt_s'], ['lillebaelt_s', 'svendborg_sund'],
  ['lillebaelt_s', 'als_s'], ['als_s', 'kiel_bugt'], ['samsoe_e', 'storebaelt_n'], ['samsoe_e', 'odde_n'], ['odde_n', 'kattegat_s'],
  ['storebaelt_n', 'storebaelt_s'], ['storebaelt_s', 'svendborg_sund'], ['storebaelt_s', 'langelandsbaelt'],
  ['svendborg_sund', 'kiel_bugt'], ['langelandsbaelt', 'oestersoe_w'],
  ['kiel_bugt', 'oestersoe_w'], ['oestersoe_w', 'femern'], ['femern', 'gedser_s'], ['gedser_s', 'oestersoe'],
  ['oestersoe', 'oestersoe_e'], ['oestersoe', 'falsterbo'], ['oestersoe_e', 'falsterbo'], ['falsterbo', 'koege_bugt'],
  ['koege_bugt', 'oeresund_s'], ['oeresund_s', 'oeresund_n'], ['oeresund_n', 'kattegat_s'],
];

// Navne på farvandene, skrevet på kortet
const SEA_LABELS = [
  ['Nordsøen', 8.0, 55.95], ['Skagerrak', 9.3, 57.9], ['Kattegat', 11.4, 57.3], ['Øresund', 12.85, 55.9],
  ['Storebælt', 11.0, 55.45], ['Lillebælt', 9.75, 55.35], ['Østersøen', 12.9, 54.65], ['Kieler Bugt', 10.4, 54.5],
];

const Sea = {
  lands: [],
  harbors: [],
  nodes: {},
  adj: {},
  labels: [],

  init() {
    this.lands = LAND_DATA.map((l) => {
      const pts = l.pts.map(([lo, la]) => geo(lo, la));
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const c = pts.reduce((a, p) => ({ x: a.x + p.x / pts.length, y: a.y + p.y / pts.length }), { x: 0, y: 0 });
      return { name: l.name, big: !!l.big, pts, c,
        minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
    });
    this.harbors = HARBOR_DATA.map((h) => Object.assign({}, h, geo(h.lon, h.lat)));
    for (const k in NODE_DATA) { this.nodes[k] = geo(NODE_DATA[k][0], NODE_DATA[k][1]); this.adj[k] = []; }
    for (const [a, b] of EDGE_DATA) {
      const d = dist(this.nodes[a], this.nodes[b]);
      this.adj[a].push({ to: b, d });
      this.adj[b].push({ to: a, d });
    }
    this.labels = SEA_LABELS.map(([t, lo, la]) => Object.assign({ text: t }, geo(lo, la)));
  },

  // Er punktet på land? (eller uden for kortet)
  isLand(x, y) {
    if (x < 0 || y < 0 || x > MAP.w || y > MAP.h) return true;
    for (const l of this.lands) {
      if (x < l.minX || x > l.maxX || y < l.minY || y > l.maxY) continue;
      if (pointInPoly(x, y, l.pts)) return true;
    }
    return false;
  },

  // Er der land på linjen mellem to punkter?
  lineHitsLand(a, b, step = 12) {
    const d = dist(a, b);
    const n = Math.max(1, Math.ceil(d / step));
    for (let i = 0; i <= n; i++) {
      if (this.isLand(lerp(a.x, b.x, i / n), lerp(a.y, b.y, i / n))) return true;
    }
    return false;
  },

  nearestNode(p) {
    let best = null, bd = 1e9;
    for (const k in this.nodes) {
      const d = dist(p, this.nodes[k]);
      if (d < bd && !this.lineHitsLand(p, this.nodes[k], 20)) { bd = d; best = k; }
    }
    if (!best) for (const k in this.nodes) { const d = dist(p, this.nodes[k]); if (d < bd) { bd = d; best = k; } }
    return best;
  },

  // Korteste vej mellem to knuder (Dijkstra) – liste af punkter
  route(from, to) {
    const D = {}, prev = {}, todo = new Set(Object.keys(this.nodes));
    for (const k of todo) D[k] = Infinity;
    D[from] = 0;
    while (todo.size) {
      let u = null;
      for (const k of todo) if (u === null || D[k] < D[u]) u = k;
      todo.delete(u);
      if (u === to || D[u] === Infinity) break;
      for (const e of this.adj[u]) {
        const nd = D[u] + e.d;
        if (nd < D[e.to]) { D[e.to] = nd; prev[e.to] = u; }
      }
    }
    const path = [];
    for (let k = to; k; k = prev[k]) { path.unshift(this.nodes[k]); if (k === from) break; }
    return path;
  },

  harborAt(p, r = 70) {
    for (const h of this.harbors) if (dist(p, h) < r) return h;
    return null;
  },

  nearestHarbor(p) {
    let best = this.harbors[0];
    for (const h of this.harbors) if (dist(p, h) < dist(p, best)) best = h;
    return best;
  },

  // ---------- Tegning ----------
  drawWorld(ctx, cam, t, wind) {
    // Hav
    ctx.fillStyle = '#2c7fb8';
    ctx.fillRect(cam.x - 20, cam.y - 20, cam.w + 40, cam.h + 40);
    // Bølger der driver med vinden
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 2;
    const g = 90;
    const ox = (wind.vx * t * 20) % g, oy = (wind.vy * t * 20) % g;
    const ca = Math.cos(wind.angle), sa = Math.sin(wind.angle);
    ctx.beginPath();
    for (let x = Math.floor(cam.x / g) * g - g; x < cam.x + cam.w + g; x += g) {
      for (let y = Math.floor(cam.y / g) * g - g; y < cam.y + cam.h + g; y += g) {
        const jx = ((x * 7 + y * 13) % 37), jy = ((x * 11 + y * 3) % 41);
        const px = x + ox + jx, py = y + oy + jy;
        // små buer på tværs af vinden
        ctx.moveTo(px - sa * 9, py + ca * 9);
        ctx.quadraticCurveTo(px + ca * 4, py + sa * 4, px + sa * 9, py - ca * 9);
      }
    }
    ctx.stroke();

    // Land: lavvandet kant, sand og græs
    for (const l of this.lands) {
      if (l.maxX < cam.x - 40 || l.minX > cam.x + cam.w + 40 || l.maxY < cam.y - 40 || l.minY > cam.y + cam.h + 40) continue;
      this.polyPath(ctx, l.pts);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(120,200,230,0.55)';
      ctx.lineWidth = 26;
      ctx.stroke();
      ctx.strokeStyle = '#e9d8a6';
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.fillStyle = l.name === 'Sverige' ? '#7fb069' : '#8cc265';
      ctx.fill();
    }
    // Lidt "skov" på land, så det ikke er helt fladt
    ctx.fillStyle = 'rgba(40,110,50,0.35)';
    for (const l of this.lands) {
      if (l.maxX < cam.x || l.minX > cam.x + cam.w || l.maxY < cam.y || l.minY > cam.y + cam.h) continue;
      for (let x = Math.floor(Math.max(l.minX, cam.x) / 70) * 70; x < Math.min(l.maxX, cam.x + cam.w); x += 70) {
        for (let y = Math.floor(Math.max(l.minY, cam.y) / 70) * 70; y < Math.min(l.maxY, cam.y + cam.h); y += 70) {
          const px = x + ((x * 13 + y * 7) % 50), py = y + ((x * 5 + y * 17) % 50);
          if (pointInPoly(px, py, l.pts) && pointInPoly(px + 30, py, l.pts) && pointInPoly(px - 30, py, l.pts)) {
            ctx.beginPath(); ctx.arc(px, py, 9, 0, TAU); ctx.arc(px + 10, py + 4, 7, 0, TAU); ctx.fill();
          }
        }
      }
    }
    // Farvandenes navne
    for (const s of this.labels) {
      ctx.globalAlpha = 0.5;
      outlineText(ctx, s.text, s.x, s.y, 30, '#d7f0ff', 'center', 'italic bold');
      ctx.globalAlpha = 1;
    }
    // Øernes navne
    for (const l of this.lands) {
      if (l.big) continue;
      outlineText(ctx, l.name, l.c.x, l.c.y, l.pts.length > 6 ? 26 : 15, '#f3ffe0');
    }
    // Havne
    for (const h of this.harbors) this.drawHarbor(ctx, h, t);
  },

  drawHarbor(ctx, h, t) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -t * 10;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 60, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    // Mole og lille by
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(-18, -4, 36, 8);
    // Flagstang med Dannebrog
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, -34); ctx.stroke();
    const wave = Math.sin(t * 4) * 2;
    drawFlag(ctx, 'dk', 1, -34, 22, 14, wave);
    ctx.restore();
    outlineText(ctx, '⚓ ' + h.name, h.x, h.y + 28, 18, '#fff4c2');
  },

  polyPath(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
  },
};

function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

// Flag: 'dk' Dannebrog, 'green' fremmede (kaperbrevet gælder dem), 'pirate' sørøvere, 'white' overgivet
function drawFlag(ctx, kind, x, y, w, h, wave = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(w / 2, wave, w, 0);
  ctx.lineTo(w, h);
  ctx.quadraticCurveTo(w / 2, h + wave, 0, h);
  ctx.closePath();
  ctx.save();
  ctx.clip();
  if (kind === 'dk') {
    ctx.fillStyle = '#c8102e'; ctx.fillRect(0, -4, w, h + 8);
    ctx.fillStyle = '#fff'; ctx.fillRect(w * 0.3, -4, h * 0.2, h + 8); ctx.fillRect(0, h * 0.4, w, h * 0.2);
  } else if (kind === 'green') {
    ctx.fillStyle = '#2e8b57'; ctx.fillRect(0, -4, w, h + 8);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(w * 0.5, h * 0.5, h * 0.28, 0, TAU); ctx.fill();
  } else if (kind === 'pirate') {
    ctx.fillStyle = '#111'; ctx.fillRect(0, -4, w, h + 8);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(w * 0.5, h * 0.42, h * 0.22, 0, TAU); ctx.fill();
    ctx.fillRect(w * 0.42, h * 0.55, w * 0.16, h * 0.14);
    ctx.fillStyle = '#111';
    ctx.fillRect(w * 0.42, h * 0.36, h * 0.1, h * 0.1); ctx.fillRect(w * 0.54, h * 0.36, h * 0.1, h * 0.1);
  } else {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, -4, w, h + 8);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}
