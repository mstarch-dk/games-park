// Fælles hjælpere: lærred, matematik og tegning.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;   // 720
const H = canvas.height;  // 960
const TAU = Math.PI * 2;

function rand(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function lerp(a, b, t) { return a + (b - a) * t; }

const Draw = {
  roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  ellipse(x, y, rx, ry, fill, rot = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
    ctx.fillStyle = fill;
    ctx.fill();
  },

  circle(x, y, r, fill) { this.ellipse(x, y, r, r, fill); },

  // Stor, tydelig tekst med mørk kant
  text(str, x, y, size, color = '#fff', align = 'center', outline = '#123056') {
    ctx.font = `bold ${size}px "Comic Sans MS", "Trebuchet MS", sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    if (outline) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, size / 6);
      ctx.strokeStyle = outline;
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  },

  // Lille taleboble med tekst
  bubble(str, x, y, size = 16) {
    ctx.font = `bold ${size}px "Comic Sans MS", "Trebuchet MS", sans-serif`;
    const w = ctx.measureText(str).width + 16;
    const h = size + 12;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#123056';
    ctx.lineWidth = 2;
    this.roundRect(x - w / 2, y - h, w, h, 9);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 1); ctx.lineTo(x + 2, y + 9); ctx.lineTo(x + 6, y - 1);
    ctx.fill();
    ctx.fillStyle = '#123056';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y - h / 2);
  },

  heart(x, y, s, fill) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s / 20, s / 20);
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.bezierCurveTo(-14, -3, -9, -15, 0, -7);
    ctx.bezierCurveTo(9, -15, 14, -3, 0, 7);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#123056';
    ctx.stroke();
    ctx.restore();
  },

  star(x, y, r, fill, points = 5, inner = 0.5, rot = -Math.PI / 2) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const rr = i % 2 ? r * inner : r;
      const a = rot + (i * Math.PI) / points;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  },
};
