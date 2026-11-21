// Danmarks len omkring 1523, groft tegnet efter længde-/breddegrader.
// Hvert område har en indtægt pr. sæson og naboer (også over vandet).
const MAP_K = 43;
function proj(lon, lat) { return [Math.round((lon - 7.9) * 0.56 * MAP_K + 4), Math.round((57.9 - lat) * MAP_K + 4)]; }

const REGION_DEFS = [
  { id: 'thy', name: 'Thy', income: 2, poly: [[8.21, 56.7], [8.62, 57.12], [9.3, 57.12], [9.3, 56.95], [8.9, 56.75]] },
  { id: 'vendsyssel', name: 'Vendsyssel', income: 3, poly: [[9.3, 57.12], [9.96, 57.59], [10.6, 57.75], [10.54, 57.44], [10.3, 56.99], [9.3, 56.95]] },
  { id: 'viborg', name: 'Viborg', income: 4, poly: [[8.21, 56.7], [8.9, 56.75], [9.3, 56.95], [10.3, 56.99], [10.35, 56.55], [9.6, 56.3], [9.3, 56.0], [8.15, 56.1], [8.12, 56.4]] },
  { id: 'aarhus', name: 'Aarhus', income: 5, poly: [[10.35, 56.55], [10.6, 56.55], [10.95, 56.45], [10.6, 56.25], [10.2, 56.15], [9.85, 55.86], [9.55, 55.7], [9.3, 56.0], [9.6, 56.3]] },
  { id: 'ribe', name: 'Ribe', income: 4, poly: [[8.15, 56.1], [9.3, 56.0], [9.55, 55.7], [9.75, 55.56], [9.5, 55.49], [8.6, 55.45], [8.45, 55.47], [8.08, 55.56]] },
  { id: 'slesvig', name: 'Slesvig', income: 4, poly: [[8.6, 55.45], [9.5, 55.49], [9.5, 55.25], [9.42, 55.04], [9.8, 54.9], [9.43, 54.78], [9.93, 54.66], [9.84, 54.47], [10.0, 54.38], [9.67, 54.3], [8.85, 54.27], [8.6, 54.35], [9.0, 54.48], [8.65, 54.9]] },
  { id: 'holsten', name: 'Holsten', income: 6, poly: [[10.0, 54.38], [10.4, 54.4], [10.9, 54.35], [11.2, 54.45], [10.9, 54.0], [10.68, 53.87], [10.0, 53.55], [9.15, 53.9], [8.85, 54.1], [8.85, 54.27], [9.67, 54.3]] },
  { id: 'fyn', name: 'Fyn', income: 5, poly: [[9.8, 55.5], [10.1, 55.6], [10.6, 55.62], [10.8, 55.3], [10.65, 55.05], [10.25, 55.08], [9.9, 55.27]] },
  { id: 'lolland', name: 'Lolland-Falster', income: 3, poly: [[10.95, 54.85], [11.4, 54.95], [11.85, 54.92], [12.1, 54.9], [12.0, 54.57], [11.5, 54.63], [11.0, 54.7]] },
  { id: 'sydsjaelland', name: 'Sydsjælland', income: 3, poly: [[11.15, 55.42], [12.2, 55.46], [12.45, 55.3], [12.55, 55.0], [12.1, 54.95], [11.65, 55.2], [11.3, 55.25], [11.14, 55.33]] },
  { id: 'nordsjaelland', name: 'Nordsjælland', income: 5, poly: [[11.3, 55.97], [11.85, 55.97], [12.3, 56.12], [12.6, 56.03], [12.57, 55.68], [12.2, 55.46], [11.15, 55.42], [11.08, 55.68]] },
  { id: 'skaane', name: 'Skåne', income: 6, poly: [[12.95, 55.4], [12.9, 55.6], [12.7, 56.05], [12.45, 56.3], [12.85, 56.45], [13.5, 56.45], [14.2, 56.4], [14.4, 56.2], [14.3, 55.93], [14.35, 55.55], [13.82, 55.43], [13.15, 55.37]] },
  { id: 'halland', name: 'Halland', income: 3, poly: [[12.85, 56.45], [12.5, 56.7], [12.0, 57.4], [12.05, 57.55], [12.6, 57.5], [13.2, 57.1], [13.5, 56.45]] },
  { id: 'blekinge', name: 'Blekinge', income: 2, poly: [[14.2, 56.4], [15.0, 56.5], [15.9, 56.45], [15.9, 56.12], [15.0, 56.15], [14.6, 56.05], [14.4, 56.2]] },
  { id: 'bornholm', name: 'Bornholm', income: 2, poly: [[14.7, 55.3], [15.1, 55.3], [15.15, 55.1], [14.75, 54.98], [14.68, 55.15]] },
];

// Naboskaber – "~" betyder over vandet (bruges kun til tegning af sejlruter)
const LINKS = [
  ['thy', 'vendsyssel'], ['thy', 'viborg'], ['vendsyssel', 'viborg'], ['viborg', 'aarhus'], ['viborg', 'ribe'],
  ['aarhus', 'ribe'], ['ribe', 'slesvig'], ['slesvig', 'holsten'],
  ['aarhus', 'fyn', '~'], ['ribe', 'fyn', '~'], ['slesvig', 'fyn', '~'], ['fyn', 'sydsjaelland', '~'], ['fyn', 'lolland', '~'],
  ['holsten', 'lolland', '~'], ['lolland', 'sydsjaelland', '~'], ['sydsjaelland', 'nordsjaelland'],
  ['nordsjaelland', 'skaane', '~'], ['skaane', 'halland'], ['skaane', 'blekinge'], ['skaane', 'bornholm', '~'], ['blekinge', 'bornholm', '~'],
  ['vendsyssel', 'halland', '~'],
];

// Roskilde: kongesædet. Kan ikke erobres – her holdes turneringer.
const ROSKILDE = { name: 'Roskilde', pos: proj(12.08, 55.64) };

// Fremmede lande omkring (kun pynt)
const FOREIGN = [
  { name: 'Sverige', poly: [[12.05, 57.55], [12.0, 57.9], [16.2, 57.9], [16.2, 56.45], [15.9, 56.45], [15.0, 56.5], [14.2, 56.4], [13.5, 56.45], [13.2, 57.1], [12.6, 57.5]] },
  { name: 'Tyskland', poly: [[8.6, 53.4], [8.6, 53.9], [9.15, 53.9], [10.0, 53.55], [10.68, 53.87], [10.9, 54.0], [11.5, 54.05], [12.3, 54.2], [13.0, 54.35], [13.6, 54.2], [14.2, 54.0], [15.3, 54.1], [16.2, 54.3], [16.2, 53.4]] },
];

const MapData = {
  regions: {},
  order: [],

  init() {
    REGION_DEFS.forEach((d) => {
      const pts = d.poly.map(([lo, la]) => proj(lo, la));
      let cx = 0, cy = 0;
      pts.forEach(([x, y]) => { cx += x; cy += y; });
      cx /= pts.length; cy /= pts.length;
      this.regions[d.id] = { id: d.id, name: d.name, baseIncome: d.income, pts, cx, cy, nb: [], sea: {} };
      this.order.push(d.id);
    });
    // lidt finjustering af navnepladser
    const adj = { viborg: [-6, 2], aarhus: [4, -2], slesvig: [2, -4], nordsjaelland: [-2, -9], skaane: [0, 0], holsten: [0, -2], ribe: [-2, 0] };
    Object.keys(adj).forEach((k) => { this.regions[k].cx += adj[k][0]; this.regions[k].cy += adj[k][1]; });
    LINKS.forEach(([a, b, sea]) => {
      this.regions[a].nb.push(b); this.regions[b].nb.push(a);
      if (sea) { this.regions[a].sea[b] = true; this.regions[b].sea[a] = true; }
    });
    FOREIGN.forEach((f) => { f.pts = f.poly.map(([lo, la]) => proj(lo, la)); });
  },

  // Hvilket område ligger under punktet (lav-opløsnings-koordinater)?
  at(x, y) {
    for (const id of this.order) if (pointInPoly(x, y, this.regions[id].pts)) return id;
    return null;
  },

  // Nærmeste område i en retning (til piletasterne)
  neighbourInDir(fromId, dx, dy) {
    const f = this.regions[fromId];
    let best = null, bestScore = 1e9;
    this.order.forEach((id) => {
      if (id === fromId) return;
      const r = this.regions[id];
      const vx = r.cx - f.cx, vy = r.cy - f.cy;
      const along = vx * dx + vy * dy;
      if (along <= 0) return;
      const across = Math.abs(vx * dy - vy * dx);
      const score = along + across * 2.2;
      if (score < bestScore) { bestScore = score; best = id; }
    });
    return best;
  },
};

function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
