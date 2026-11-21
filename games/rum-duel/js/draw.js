// Fælles tegne-hjælpere og konstanter.
const W = 1280;
const H = 720;
const FONT = "'Comic Sans MS', 'Chalkboard SE', 'Trebuchet MS', sans-serif";
const P_COLORS = ['#4fd8ff', '#ffa53a'];
const P_NAMES = ['Spiller 1', 'Spiller 2'];

function text(ctx, str, x, y, size, color = '#fff', align = 'center', outline = '#0a0a24') {
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size / 5);
  ctx.strokeStyle = outline;
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circle(ctx, x, y, r, fill, stroke, lw = 2) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function ellipse(ctx, x, y, rx, ry, rot, fill, stroke, lw = 2) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

// Tegn en polygon ud fra punkter [x0,y0,x1,y1,...]
function poly(ctx, pts, fill, stroke, lw = 2) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); }
}

function bar(ctx, x, y, w, h, frac, color, back = 'rgba(0,0,0,0.55)') {
  ctx.fillStyle = back;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = color;
    roundRect(ctx, x, y, Math.max(h, w * clamp(frac, 0, 1)), h, h / 2);
    ctx.fill();
  }
}
