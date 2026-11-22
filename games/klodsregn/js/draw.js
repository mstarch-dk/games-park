// Tegne-hjælpere: afrundede firkanter, tekst, klodser med ansigter, skyen og bomben.
var FONT = '"Comic Sans MS", "Trebuchet MS", sans-serif';

var Draw = {
  rr: function (x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  text: function (t, x, y, size, color, align, stroke) {
    ctx.font = 'bold ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    if (stroke) {
      ctx.lineWidth = Math.max(3, size / 6);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = stroke;
      ctx.strokeText(t, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(t, x, y);
  },

  shade: function (hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var f = function (c) { return Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt); };
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  },

  // En klods med et lille ansigt. o: { ghost, seed, mood: 'happy' | 'scared', t }
  block: function (x, y, s, color, o) {
    o = o || {};
    var p = Math.max(1, s * 0.05);
    if (o.ghost) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      this.rr(x + p + 1, y + p + 1, s - 2 * p - 2, s - 2 * p - 2, s * 0.22);
      ctx.stroke();
      ctx.restore();
      return;
    }
    this.rr(x + p, y + p, s - 2 * p, s - 2 * p, s * 0.24);
    ctx.fillStyle = this.shade(color, -0.3);
    ctx.fill();
    this.rr(x + p, y + p, s - 2 * p, s - 2 * p - s * 0.08, s * 0.24);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(x + s * 0.32, y + s * 0.24, s * 0.16, s * 0.08, -0.4, 0, Math.PI * 2);
    ctx.fill();
    if (s < 14) return;

    // ansigt
    var t = o.t || 0, seed = o.seed || 0;
    var blink = ((t * 0.6 + seed * 1.7) % 5) < 0.14;
    var ex = s * 0.17, ey = y + s * 0.47, cx = x + s / 2;
    ctx.fillStyle = '#1d1d2b';
    ctx.strokeStyle = '#1d1d2b';
    ctx.lineWidth = Math.max(1.5, s * 0.06);
    ctx.lineCap = 'round';
    if (blink || o.mood === 'happy') {
      ctx.beginPath();
      ctx.arc(cx - ex, ey + s * 0.03, s * 0.07, Math.PI * 1.1, Math.PI * 1.9);
      ctx.moveTo(cx + ex + s * 0.07 * Math.cos(Math.PI * 1.1), ey + s * 0.03 + s * 0.07 * Math.sin(Math.PI * 1.1));
      ctx.arc(cx + ex, ey + s * 0.03, s * 0.07, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(cx - ex, ey, s * 0.075, 0, Math.PI * 2);
      ctx.arc(cx + ex, ey, s * 0.075, 0, Math.PI * 2);
      ctx.fill();
    }
    if (o.mood === 'scared') {
      ctx.beginPath();
      ctx.arc(cx, y + s * 0.7, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
    } else if (o.mood === 'happy') {
      ctx.beginPath();
      ctx.arc(cx, y + s * 0.62, s * 0.13, 0, Math.PI);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(cx, y + s * 0.58, s * 0.12, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
    }
    // røde kinder
    ctx.fillStyle = 'rgba(255,90,120,0.35)';
    ctx.beginPath();
    ctx.arc(cx - s * 0.3, y + s * 0.62, s * 0.07, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.3, y + s * 0.62, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
  },

  // Stjernebomben: en mørk kugle med en gul stjerne og en lunte der gnistrer.
  bomb: function (x, y, s, t) {
    var cx = x + s / 2, cy = y + s * 0.56, r = s * 0.4;
    ctx.fillStyle = '#2b2d42';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.35, cy - r * 0.35, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    this.star(cx, cy + 1, r * 0.55, '#ffe066');
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = Math.max(2, s * 0.07);
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.5, cy - r * 0.8);
    ctx.quadraticCurveTo(cx + r * 0.9, cy - r * 1.3, cx + r * 1.0, cy - r * 1.25);
    ctx.stroke();
    var f = 0.6 + 0.4 * Math.sin(t * 30);
    this.star(cx + r * 1.0, cy - r * 1.25, s * 0.14 * f + 2, f > 0.8 ? '#fff3b0' : '#ff9f1c');
  },

  star: function (x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  },

  // Tegn en hel form (matrix) med øverste venstre hjørne i (x, y).
  matrix: function (shape, m, x, y, s, o) {
    for (var r = 0; r < m.length; r++) for (var c = 0; c < m.length; c++) {
      if (!m[r][c]) continue;
      if (shape.bomb && !(o && o.ghost)) this.bomb(x + c * s, y + r * s, s, (o && o.t) || 0);
      else this.block(x + c * s, y + r * s, s, shape.color, o);
    }
  },

  // Den store sky der "regner" klodser ned. mood: 'calm' | 'happy' | 'sad' | 'wow'
  cloud: function (cx, cy, mood, t, scale) {
    ctx.save();
    ctx.translate(cx, cy + Math.sin(t * 1.5) * 2);
    ctx.scale(scale || 1, scale || 1);
    cx = 0; cy = 0;
    var puffs = [[-150, 6, 22], [-110, -4, 28], [-60, -10, 32], [0, -14, 36], [60, -10, 32], [110, -4, 28], [150, 6, 22]];
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    puffs.forEach(function (p) { ctx.beginPath(); ctx.arc(cx + p[0], cy + p[1] + 6, p[2], 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = mood === 'sad' ? '#c9d3e6' : '#ffffff';
    puffs.forEach(function (p) { ctx.beginPath(); ctx.arc(cx + p[0], cy + p[1], p[2], 0, Math.PI * 2); ctx.fill(); });
    this.rr(cx - 160, cy - 4, 320, 30, 14);
    ctx.fill();

    ctx.fillStyle = '#1d1d2b';
    ctx.strokeStyle = '#1d1d2b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    var blink = (t % 4) < 0.12;
    if (mood === 'happy' || blink) {
      ctx.beginPath();
      ctx.arc(cx - 22, cy - 2, 6, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 22, cy - 2, 6, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(cx - 22, cy - 4, mood === 'wow' ? 6 : 4.5, 0, Math.PI * 2);
      ctx.arc(cx + 22, cy - 4, mood === 'wow' ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    if (mood === 'happy') { ctx.arc(cx, cy + 6, 10, 0, Math.PI); ctx.fill(); }
    else if (mood === 'sad') { ctx.arc(cx, cy + 16, 8, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    else if (mood === 'wow') { ctx.arc(cx, cy + 10, 6, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.arc(cx, cy + 4, 9, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,120,150,0.4)';
    ctx.beginPath();
    ctx.arc(cx - 40, cy + 6, 7, 0, Math.PI * 2);
    ctx.arc(cx + 40, cy + 6, 7, 0, Math.PI * 2);
    ctx.fill();
    if (mood === 'sad') {
      ctx.fillStyle = '#4cc9f0';
      ctx.beginPath();
      ctx.arc(cx - 28, cy + 10 + (t * 30) % 14, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  heart: function (x, y, s, full) {
    ctx.fillStyle = full ? '#ff4d6d' : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x - s * 0.6, y - s * 0.15, x - s * 0.25, y - s * 0.55, x, y - s * 0.2);
    ctx.bezierCurveTo(x + s * 0.25, y - s * 0.55, x + s * 0.6, y - s * 0.15, x, y + s * 0.35);
    ctx.fill();
  }
};
