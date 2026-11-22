// Små matematik-hjælpere.
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

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
