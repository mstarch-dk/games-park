// Små matematik-hjælpere.
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

// Farver for skibets to sider – bruges både ved skibet, på sigtebuen og i kanon-panelet
const SIDE = {
  '-1': { key: 'A', name: 'Bagbord', color: '#ff9f1c', rgb: '255,159,28' },
  '1': { key: 'D', name: 'Styrbord', color: '#4cc9f0', rgb: '76,201,240' },
};

// Rund "tast" med et bogstav, fx A eller D
function keyBadge(ctx, x, y, letter, color, r = 13) {
  ctx.fillStyle = 'rgba(10,20,40,0.55)';
  ctx.beginPath(); ctx.arc(x + 1.5, y + 2, r, 0, TAU); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.font = `bold ${Math.round(r * 1.35)}px "Comic Sans MS", "Trebuchet MS", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#10213a';
  ctx.fillText(letter, x, y + 1);
}

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

// Vinkelforskel i intervallet -PI..PI
function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

// Kompasretning (0 = nord, med uret) som dansk tekst. Vinkel i canvas-radianer (0 = øst).
const COMPASS = ['N', 'NØ', 'Ø', 'SØ', 'S', 'SV', 'V', 'NV'];
function compassName(angle) {
  const deg = ((angle / DEG) + 90 + 360) % 360;
  return COMPASS[Math.round(deg / 45) % 8];
}

function fmtMoney(n) { return Math.round(n).toLocaleString('da-DK') + ' rd'; }

// Afrundet rektangel
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Tekst med mørk kant, så den kan læses oven på kortet
function outlineText(ctx, text, x, y, size, color = '#fff', align = 'center', weight = 'bold') {
  ctx.font = `${weight} ${size}px "Comic Sans MS", "Trebuchet MS", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size / 6);
  ctx.strokeStyle = 'rgba(10,20,40,0.85)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
