// Tegning af banen: græs, vand, træer, huse, skinner, stationer, passagerer, køer og tog.
var TRAIN_COLORS = [
  { main: '#d62828', dark: '#8d0801', trim: '#ffd166' },
  { main: '#2a9d8f', dark: '#14535c', trim: '#ffd166' }
];

var Draw = {
  hash: function (x, y, k) {
    var n = (x * 374761393 + y * 668265263 + (k || 0) * 982451653) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  },

  layout: function (b, area) {
    var cs = Math.floor(Math.min(area.w / b.w, area.h / b.h, 100));
    return {
      cs: cs,
      ox: area.x + Math.floor((area.w - cs * b.w) / 2),
      oy: area.y + Math.floor((area.h - cs * b.h) / 2)
    };
  },

  rr: function (ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  // Punkt og retning på et skinnestykke fra side e til side o, t = 0..1.
  segPoint: function (e, o, cx, cy, s, t) {
    var ex = cx + DX[e] * s / 2, ey = cy + DY[e] * s / 2;
    var qx = cx + DX[o] * s / 2, qy = cy + DY[o] * s / 2;
    if (isStraight(e, o)) {
      return { x: ex + (qx - ex) * t, y: ey + (qy - ey) * t, ang: Math.atan2(DY[o], DX[o]) };
    }
    var kx = cx + (DX[e] + DX[o]) * s / 2, ky = cy + (DY[e] + DY[o]) * s / 2;
    var a0 = Math.atan2(ey - ky, ex - kx), a1 = Math.atan2(qy - ky, qx - kx);
    var da = a1 - a0;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    var a = a0 + da * t, r = s / 2;
    return { x: kx + Math.cos(a) * r, y: ky + Math.sin(a) * r, ang: a + (da > 0 ? Math.PI / 2 : -Math.PI / 2) };
  },

  // Tegn en sti (lige eller bue) forskudt `off` til siden.
  pathLine: function (ctx, e, o, cx, cy, s, off) {
    ctx.beginPath();
    if (isStraight(e, o)) {
      var px = -DY[o] * off, py = DX[o] * off;
      ctx.moveTo(cx + DX[e] * s / 2 + px, cy + DY[e] * s / 2 + py);
      ctx.lineTo(cx + DX[o] * s / 2 + px, cy + DY[o] * s / 2 + py);
    } else {
      var kx = cx + (DX[e] + DX[o]) * s / 2, ky = cy + (DY[e] + DY[o]) * s / 2;
      var a0 = Math.atan2(DY[e] * s / 2 + cy - ky, DX[e] * s / 2 + cx - kx);
      var a1 = Math.atan2(DY[o] * s / 2 + cy - ky, DX[o] * s / 2 + cx - kx);
      var da = a1 - a0;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      ctx.arc(kx, ky, Math.max(1, s / 2 + off), a0, a1, da < 0);
    }
  },

  sleepers: function (ctx, e, o, cx, cy, s, color) {
    ctx.strokeStyle = color || '#8b5a2b';
    ctx.lineWidth = s * 0.09;
    ctx.lineCap = 'butt';
    for (var i = 0; i < 4; i++) {
      var p = this.segPoint(e, o, cx, cy, s, (i + 0.5) / 4);
      var nx = -Math.sin(p.ang), ny = Math.cos(p.ang), l = s * 0.21;
      ctx.beginPath();
      ctx.moveTo(p.x - nx * l, p.y - ny * l);
      ctx.lineTo(p.x + nx * l, p.y + ny * l);
      ctx.stroke();
    }
  },

  rails: function (ctx, e, o, cx, cy, s, ghost) {
    var g = s * 0.12;
    ctx.lineCap = 'butt';
    for (var k = -1; k <= 1; k += 2) {
      this.pathLine(ctx, e, o, cx, cy, s, g * k);
      ctx.strokeStyle = ghost ? 'rgba(255,255,255,0.9)' : '#5c636a';
      ctx.lineWidth = s * (ghost ? 0.05 : 0.065);
      if (ghost) ctx.setLineDash([s * 0.08, s * 0.07]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (!ghost) {
        this.pathLine(ctx, e, o, cx, cy, s, g * k - s * 0.01);
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = s * 0.022;
        ctx.stroke();
      }
    }
  },

  bridge: function (ctx, horizontal, cx, cy, s) {
    ctx.save();
    ctx.translate(cx, cy);
    if (!horizontal) ctx.rotate(Math.PI / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(-s / 2, -s * 0.3 + s * 0.06, s, s * 0.6);
    ctx.fillStyle = '#c68b59';
    ctx.fillRect(-s / 2, -s * 0.3, s, s * 0.6);
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = Math.max(1, s * 0.02);
    for (var i = 1; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(-s / 2 + i * s / 6, -s * 0.3); ctx.lineTo(-s / 2 + i * s / 6, s * 0.3); ctx.stroke();
    }
    ctx.fillStyle = '#7f4f24';
    ctx.fillRect(-s / 2, -s * 0.33, s, s * 0.06);
    ctx.fillRect(-s / 2, s * 0.27, s, s * 0.06);
    ctx.restore();
  },

  tree: function (ctx, cx, cy, s, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(cx + s * 0.06, cy + s * 0.12, s * 0.36, s * 0.26, 0, 0, Math.PI * 2); ctx.fill();
    var cols = ['#2d6a4f', '#40916c', '#52b788'];
    var r = s * (0.3 + h * 0.06);
    ctx.fillStyle = cols[0];
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cols[1];
    ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.2, r * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cols[2];
    ctx.beginPath(); ctx.arc(cx - r * 0.38, cy - r * 0.35, r * 0.32, 0, Math.PI * 2); ctx.fill();
    if (h > 0.6) {
      ctx.fillStyle = '#e63946';
      ctx.beginPath(); ctx.arc(cx + r * 0.3, cy + r * 0.1, s * 0.04, 0, Math.PI * 2); ctx.arc(cx - r * 0.1, cy + r * 0.4, s * 0.04, 0, Math.PI * 2); ctx.fill();
    }
  },

  rock: function (ctx, cx, cy, s, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(cx + s * 0.05, cy + s * 0.14, s * 0.38, s * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8d99ae';
    ctx.beginPath();
    var n = 7;
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2;
      var r = s * (0.3 + this.hash(i, h * 100 | 0, 5) * 0.1);
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.85;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#adb5bd';
    ctx.beginPath(); ctx.ellipse(cx - s * 0.08, cy - s * 0.1, s * 0.16, s * 0.1, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6c757d';
    ctx.beginPath(); ctx.ellipse(cx + s * 0.18, cy + s * 0.12, s * 0.08, s * 0.05, 0.3, 0, Math.PI * 2); ctx.fill();
  },

  house: function (ctx, cx, cy, s, h) {
    var roofs = ['#e76f51', '#d62828', '#457b9d', '#bc6c25'];
    var roof = roofs[Math.floor(h * roofs.length)];
    var w = s * 0.7, d = s * 0.56;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(cx - w / 2 + s * 0.06, cy - d / 2 + s * 0.08, w, d);
    ctx.fillStyle = roof;
    ctx.fillRect(cx - w / 2, cy - d / 2, w, d);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(cx - w / 2, cy, w, d / 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath(); ctx.moveTo(cx - w / 2, cy); ctx.lineTo(cx + w / 2, cy); ctx.stroke();
    ctx.fillStyle = '#6c584c';
    ctx.fillRect(cx + w * 0.2, cy - d * 0.42, s * 0.09, s * 0.12);
    // dør og vindue ses foran
    ctx.fillStyle = '#fefae0';
    ctx.fillRect(cx - w / 2, cy + d / 2, w, s * 0.12);
    ctx.fillStyle = '#6f4518';
    ctx.fillRect(cx - s * 0.05, cy + d / 2 + s * 0.01, s * 0.1, s * 0.11);
    ctx.fillStyle = '#8ecae6';
    ctx.fillRect(cx + w * 0.22, cy + d / 2 + s * 0.02, s * 0.08, s * 0.06);
    ctx.fillRect(cx - w * 0.36, cy + d / 2 + s * 0.02, s * 0.08, s * 0.06);
  },

  // Hjørne hvor skilte og passagerer kan stå uden at være i vejen for skinnerne.
  freeCorner: function (p) {
    // hjørner: 0 = NV, 1 = NØ, 2 = SØ, 3 = SV
    if (p && p.kind === 'track' && !isStraight(p.dirs[0], p.dirs[1])) {
      var has = function (d) { return p.dirs.indexOf(d) >= 0; };
      if (has(0) && has(1)) return 3;
      if (has(1) && has(2)) return 0;
      if (has(2) && has(3)) return 1;
      return 2;
    }
    return 0;
  },
  cornerPos: function (corner, cx, cy, s) {
    var f = 0.3;
    var sx = corner === 1 || corner === 2 ? 1 : -1;
    var sy = corner >= 2 ? 1 : -1;
    return { x: cx + sx * s * f, y: cy + sy * s * f };
  },

  stationPlate: function (ctx, x, y, s, color) {
    var col = PCOLORS[color];
    ctx.fillStyle = col.fill + '55';
    this.rr(ctx, x + 3, y + 3, s - 6, s - 6, s * 0.18);
    ctx.fill();
    ctx.strokeStyle = col.fill;
    ctx.lineWidth = Math.max(2, s * 0.05);
    ctx.setLineDash([s * 0.12, s * 0.07]);
    ctx.stroke();
    ctx.setLineDash([]);
  },

  stationSign: function (ctx, px, py, s, color, pulse) {
    var col = PCOLORS[color];
    var r = s * 0.17 * (1 + (pulse || 0) * 0.15);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.arc(px + 2, py + 3, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col.fill;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(2, s * 0.04);
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // lille stationshus i skiltet
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(px - r * 0.55, py - r * 0.05);
    ctx.lineTo(px, py - r * 0.6);
    ctx.lineTo(px + r * 0.55, py - r * 0.05);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(px - r * 0.4, py - r * 0.05, r * 0.8, r * 0.55);
    ctx.fillStyle = col.dark;
    ctx.fillRect(px - r * 0.12, py + r * 0.15, r * 0.24, r * 0.35);
  },

  person: function (ctx, px, py, s, color, t, happy) {
    var col = PCOLORS[color];
    var bob = Math.sin(t * (happy ? 9 : 3) + px) * s * (happy ? 0.05 : 0.015);
    var r = s * 0.075;
    py += bob;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(px, py + r * 2.6 - bob, r * 1.3, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col.fill;
    ctx.strokeStyle = col.dark;
    ctx.lineWidth = Math.max(1, s * 0.02);
    this.rr(ctx, px - r * 1.1, py, r * 2.2, r * 2.4, r * 0.8);
    ctx.fill(); ctx.stroke();
    if (happy) {
      ctx.strokeStyle = col.fill; ctx.lineWidth = r * 0.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px - r, py + r * 0.4); ctx.lineTo(px - r * 1.8, py - r * 0.8);
      ctx.moveTo(px + r, py + r * 0.4); ctx.lineTo(px + r * 1.8, py - r * 0.8); ctx.stroke();
    }
    ctx.fillStyle = '#f4c89a';
    ctx.strokeStyle = '#c68b59';
    ctx.beginPath(); ctx.arc(px, py - r * 0.6, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(px - r * 0.35, py - r * 0.7, r * 0.14, 0, Math.PI * 2); ctx.arc(px + r * 0.35, py - r * 0.7, r * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = Math.max(1, r * 0.15);
    ctx.beginPath(); ctx.arc(px, py - r * 0.5, r * 0.4, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  },

  cow: function (ctx, cx, cy, s, t) {
    var wob = Math.sin(t * 2) * 0.05;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(wob);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(s * 0.04, s * 0.08, s * 0.34, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#555';
    ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.3, s * 0.19, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.ellipse(-s * 0.1, -s * 0.06, s * 0.08, s * 0.06, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.1, s * 0.07, s * 0.07, s * 0.05, -0.3, 0, Math.PI * 2); ctx.fill();
    // hoved
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(s * 0.33, -s * 0.02, s * 0.12, s * 0.1, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffadad';
    ctx.beginPath(); ctx.ellipse(s * 0.42, -s * 0.02, s * 0.05, s * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(s * 0.32, -s * 0.07, s * 0.018, 0, Math.PI * 2); ctx.arc(s * 0.32, s * 0.03, s * 0.018, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c9a227'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s * 0.28, -s * 0.1); ctx.lineTo(s * 0.24, -s * 0.17);
    ctx.moveTo(s * 0.28, s * 0.06); ctx.lineTo(s * 0.24, s * 0.13); ctx.stroke();
    ctx.strokeStyle = '#555';
    ctx.beginPath(); ctx.moveTo(-s * 0.3, 0); ctx.lineTo(-s * 0.4, Math.sin(t * 4) * s * 0.06); ctx.stroke();
    ctx.restore();
  },

  depot: function (ctx, x, y, s, dir) {
    var cx = x + s / 2, cy = y + s / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.atan2(DY[dir], DX[dir]));
    // et lille remise-tag bag toget
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(-s / 2 + 3, -s * 0.42 + 4, s * 0.34, s * 0.84);
    ctx.fillStyle = '#9c6644';
    ctx.fillRect(-s / 2, -s * 0.42, s * 0.34, s * 0.84);
    ctx.fillStyle = '#7f5539';
    ctx.fillRect(-s / 2, -s * 0.42, s * 0.34, s * 0.12);
    ctx.fillRect(-s / 2, s * 0.3, s * 0.34, s * 0.12);
    ctx.restore();
  },

  // Hele banen. o: { run, ghost, cursor, hover, time, editable, hideTrains }
  board: function (ctx, b, L, o) {
    var s = L.cs, t = o.time || 0;
    var self = this;
    var each = function (fn) {
      for (var y = 0; y < b.h; y++) for (var x = 0; x < b.w; x++) fn(cellAt(b, x, y), x, y, L.ox + x * s, L.oy + y * s);
    };
    // jord
    ctx.save();
    this.rr(ctx, L.ox - 6, L.oy - 6, b.w * s + 12, b.h * s + 12, 16);
    ctx.fillStyle = '#6a994e';
    ctx.fill();
    this.rr(ctx, L.ox, L.oy, b.w * s, b.h * s, 12);
    ctx.clip();
    each(function (c, x, y, px, py) {
      ctx.fillStyle = (x + y) % 2 ? '#9bd46b' : '#a7da77';
      ctx.fillRect(px, py, s, s);
    });
    // vand
    each(function (c, x, y, px, py) {
      if (c.t !== 'water') return;
      ctx.fillStyle = '#4cb5f5';
      ctx.fillRect(px - 0.5, py - 0.5, s + 1, s + 1);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = Math.max(1, s * 0.03);
      for (var i = 0; i < 2; i++) {
        var wy = py + s * (0.3 + i * 0.4);
        var sh = Math.sin(t * 1.5 + x + i * 2) * s * 0.08;
        ctx.beginPath();
        ctx.moveTo(px + s * 0.15 + sh, wy);
        ctx.quadraticCurveTo(px + s * 0.3 + sh, wy - s * 0.07, px + s * 0.45 + sh, wy);
        ctx.quadraticCurveTo(px + s * 0.6 + sh, wy + s * 0.07, px + s * 0.75 + sh, wy);
        ctx.stroke();
      }
    });
    // græs-pynt
    each(function (c, x, y, px, py) {
      if (c.t !== 'grass' || c.piece || c.station >= 0 || c.pass >= 0) return;
      var h = self.hash(x, y, 1);
      if (h < 0.35) {
        ctx.strokeStyle = '#6fb04a'; ctx.lineWidth = Math.max(1, s * 0.025); ctx.lineCap = 'round';
        var gx = px + s * (0.2 + self.hash(x, y, 2) * 0.6), gy = py + s * (0.25 + self.hash(x, y, 3) * 0.5);
        ctx.beginPath();
        ctx.moveTo(gx - s * 0.05, gy); ctx.lineTo(gx - s * 0.07, gy - s * 0.08);
        ctx.moveTo(gx, gy); ctx.lineTo(gx, gy - s * 0.1);
        ctx.moveTo(gx + s * 0.05, gy); ctx.lineTo(gx + s * 0.07, gy - s * 0.08);
        ctx.stroke();
      } else if (h < 0.5) {
        var fx = px + s * (0.2 + self.hash(x, y, 4) * 0.6), fy = py + s * (0.2 + self.hash(x, y, 5) * 0.6);
        var fc = ['#ffffff', '#ffd166', '#ff8fab'][Math.floor(self.hash(x, y, 6) * 3)];
        ctx.fillStyle = fc;
        for (var k = 0; k < 5; k++) {
          var a = k / 5 * Math.PI * 2;
          ctx.beginPath(); ctx.arc(fx + Math.cos(a) * s * 0.035, fy + Math.sin(a) * s * 0.035, s * 0.028, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#f4a261';
        ctx.beginPath(); ctx.arc(fx, fy, s * 0.022, 0, Math.PI * 2); ctx.fill();
      }
    });
    // stationer (under skinnerne)
    each(function (c, x, y, px, py) { if (c.station >= 0) self.stationPlate(ctx, px, py, s, c.station); });
    // depoter
    b.depots.forEach(function (d) { self.depot(ctx, L.ox + d.x * s, L.oy + d.y * s, s, d.dir); });
    // broer
    each(function (c, x, y, px, py) {
      if (c.t === 'water' && c.piece && c.piece.kind === 'track') self.bridge(ctx, c.piece.dirs.indexOf(1) >= 0, px + s / 2, py + s / 2, s);
    });
    // skinner: først sveller, så skinner
    var pairs = [];
    each(function (c, x, y, px, py) {
      if (!c.piece) return;
      piecePairs(c.piece).forEach(function (pp) { pairs.push({ e: pp[0], o: pp[1], a: pp[2], cx: px + s / 2, cy: py + s / 2, c: c }); });
    });
    pairs.forEach(function (p) {
      ctx.globalAlpha = p.a;
      if (p.c.t !== 'water') self.sleepers(ctx, p.e, p.o, p.cx, p.cy, s);
    });
    pairs.forEach(function (p) {
      ctx.globalAlpha = p.a;
      self.rails(ctx, p.e, p.o, p.cx, p.cy, s, false);
    });
    ctx.globalAlpha = 1;
    // sporskifte-håndtag
    each(function (c, x, y, px, py) {
      if (!c.piece || c.piece.kind !== 'switch') return;
      var p = c.piece, cx = px + s / 2, cy = py + s / 2;
      var q = self.segPoint(p.trunk, p.br[p.active], cx, cy, s, 0.62);
      var pulse = 1 + Math.sin(t * 5) * 0.12;
      ctx.fillStyle = '#ffd60a';
      ctx.strokeStyle = '#7a5c00';
      ctx.lineWidth = Math.max(1.5, s * 0.03);
      ctx.beginPath(); ctx.arc(q.x, q.y, s * 0.1 * pulse, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.save();
      ctx.translate(q.x, q.y); ctx.rotate(q.ang);
      ctx.fillStyle = '#7a5c00';
      ctx.beginPath(); ctx.moveTo(s * 0.06, 0); ctx.lineTo(-s * 0.04, -s * 0.05); ctx.lineTo(-s * 0.04, s * 0.05); ctx.closePath(); ctx.fill();
      ctx.restore();
    });
    // hjælpe-spor
    if (o.ghost) {
      var gp = 0.45 + Math.sin(t * 3) * 0.25;
      ctx.globalAlpha = gp;
      o.ghost.forEach(function (g) {
        var c = cellAt(b, g.x, g.y);
        var px = L.ox + g.x * s + s / 2, py = L.oy + g.y * s + s / 2;
        piecePairs(g.piece).forEach(function (pp) {
          if (pp[2] < 1) return;
          self.rails(ctx, pp[0], pp[1], px, py, s, true);
        });
      });
      ctx.globalAlpha = 1;
    }
    // forhindringer
    each(function (c, x, y, px, py) {
      var h = self.hash(x, y, 7);
      if (c.t === 'tree') self.tree(ctx, px + s / 2, py + s / 2, s, h);
      else if (c.t === 'rock') self.rock(ctx, px + s / 2, py + s / 2, s, h);
      else if (c.t === 'house') self.house(ctx, px + s / 2, py + s / 2, s, h);
    });
    // stationsskilte
    each(function (c, x, y, px, py) {
      if (c.station < 0) return;
      var k = self.cornerPos(self.freeCorner(c.piece), px + s / 2, py + s / 2, s);
      self.stationSign(ctx, k.x, k.y, s, c.station, o.pulseStation && o.pulseStation[x + ',' + y] ? 1 : 0);
    });
    // passagerer der venter / er kommet frem
    var run = o.run;
    if (run) {
      run.pass.forEach(function (p) {
        var c = cellAt(b, p.x, p.y);
        var corner = self.freeCorner(c.piece);
        if (p.state === 'wait') {
          var k = self.cornerPos(corner, L.ox + p.x * s + s / 2, L.oy + p.y * s + s / 2, s);
          self.person(ctx, k.x, k.y - s * 0.05, s, p.color, t, false);
        } else if (p.state === 'done') {
          var k2 = self.cornerPos((corner + 1) % 4, L.ox + p.x * s + s / 2, L.oy + p.y * s + s / 2, s);
          self.person(ctx, k2.x, k2.y - s * 0.05, s, p.color, t, true);
        }
      });
    } else {
      each(function (c, x, y, px, py) {
        if (c.pass < 0) return;
        var k = self.cornerPos(self.freeCorner(c.piece), px + s / 2, py + s / 2, s);
        self.person(ctx, k.x, k.y - s * 0.05, s, c.pass, t, false);
      });
    }
    // køer
    if (run) {
      run.cows.forEach(function (cw) {
        if (cw.gone) return;
        cw.fx += (cw.x - cw.fx) * 0.08; cw.fy += (cw.y - cw.fy) * 0.08;
        self.cow(ctx, L.ox + cw.fx * s + s / 2, L.oy + cw.fy * s + s / 2, s, t);
      });
    } else {
      each(function (c, x, y, px, py) { if (c.cow) self.cow(ctx, px + s / 2, py + s / 2, s, t); });
    }
    // tog
    if (run && !o.hideTrains) run.trains.forEach(function (tr) { self.train(ctx, b, L, run, tr, t); });
    ctx.restore();

    // markør
    if (o.hover) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 3;
      this.rr(ctx, L.ox + o.hover.x * s + 2, L.oy + o.hover.y * s + 2, s - 4, s - 4, 8);
      ctx.stroke();
    }
    if (o.cursor) {
      ctx.strokeStyle = '#ffd60a';
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 6]);
      ctx.lineDashOffset = -t * 20;
      this.rr(ctx, L.ox + o.cursor.x * s + 3, L.oy + o.cursor.y * s + 3, s - 6, s - 6, 8);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  },

  carPos: function (L, seg, p) {
    var s = L.cs;
    var q = this.segPoint(seg.e, seg.o, L.ox + seg.cx * s + s / 2, L.oy + seg.cy * s + s / 2, s, p);
    return q;
  },

  train: function (ctx, b, L, run, tr, t) {
    var s = L.cs;
    var p = run.tick === 0 ? run.p : (tr.moved ? run.p : 1);
    var col = TRAIN_COLORS[tr.id % TRAIN_COLORS.length];
    var self = this;
    var pos = tr.hist.map(function (seg) { return self.carPos(L, seg, p); });
    // koblinger
    ctx.strokeStyle = '#333';
    ctx.lineWidth = Math.max(2, s * 0.05);
    ctx.beginPath();
    for (var i = 0; i < pos.length - 1; i++) { ctx.moveTo(pos[i].x, pos[i].y); ctx.lineTo(pos[i + 1].x, pos[i + 1].y); }
    ctx.stroke();
    for (var k = pos.length - 1; k >= 1; k--) {
      var rider = tr.cargo[k - 1];
      this.wagon(ctx, pos[k], s, rider !== undefined ? run.pass[rider].color : -1, t, k);
    }
    var bump = tr.halted === 'bump' ? Math.sin(t * 20) * s * 0.02 : 0;
    this.engine(ctx, { x: pos[0].x + bump, y: pos[0].y, ang: pos[0].ang }, s, col, t);
    tr.chimney = {
      x: pos[0].x + Math.cos(pos[0].ang) * s * 0.2,
      y: pos[0].y + Math.sin(pos[0].ang) * s * 0.2
    };
    tr.screen = pos[0];
  },

  engine: function (ctx, q, s, col) {
    var Lh = s * 0.82, Wd = s * 0.5;
    ctx.save();
    ctx.translate(q.x, q.y);
    ctx.rotate(q.ang);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    this.rr(ctx, -Lh / 2 + 3, -Wd / 2 + 4, Lh, Wd, Wd * 0.3); ctx.fill();
    // førerhus bagerst
    ctx.fillStyle = col.dark;
    this.rr(ctx, -Lh / 2, -Wd / 2, Lh * 0.4, Wd, Wd * 0.2); ctx.fill();
    ctx.fillStyle = col.main;
    this.rr(ctx, -Lh / 2 + Lh * 0.04, -Wd / 2 + Wd * 0.08, Lh * 0.32, Wd * 0.84, Wd * 0.15); ctx.fill();
    // kedel
    ctx.fillStyle = '#343a40';
    this.rr(ctx, -Lh * 0.12, -Wd * 0.36, Lh * 0.6, Wd * 0.72, Wd * 0.34); ctx.fill();
    ctx.fillStyle = col.main;
    this.rr(ctx, -Lh * 0.1, -Wd * 0.3, Lh * 0.56, Wd * 0.6, Wd * 0.3); ctx.fill();
    ctx.fillStyle = col.trim;
    ctx.fillRect(Lh * 0.05, -Wd * 0.3, Lh * 0.04, Wd * 0.6);
    ctx.fillRect(Lh * 0.28, -Wd * 0.3, Lh * 0.04, Wd * 0.6);
    // skorsten og dom
    ctx.fillStyle = '#212529';
    ctx.beginPath(); ctx.arc(Lh * 0.3, 0, Wd * 0.17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.arc(Lh * 0.3, 0, Wd * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col.trim;
    ctx.beginPath(); ctx.arc(Lh * 0.12, 0, Wd * 0.12, 0, Math.PI * 2); ctx.fill();
    // kofanger og lygte
    ctx.fillStyle = '#212529';
    ctx.fillRect(Lh * 0.46, -Wd * 0.45, Lh * 0.05, Wd * 0.9);
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath(); ctx.arc(Lh * 0.44, 0, Wd * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  wagon: function (ctx, q, s, rider, t, k) {
    var Lh = s * 0.74, Wd = s * 0.46;
    ctx.save();
    ctx.translate(q.x, q.y);
    ctx.rotate(q.ang);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    this.rr(ctx, -Lh / 2 + 3, -Wd / 2 + 4, Lh, Wd, Wd * 0.25); ctx.fill();
    ctx.fillStyle = '#9c6644';
    this.rr(ctx, -Lh / 2, -Wd / 2, Lh, Wd, Wd * 0.25); ctx.fill();
    ctx.fillStyle = '#ddb892';
    this.rr(ctx, -Lh / 2 + Wd * 0.1, -Wd / 2 + Wd * 0.1, Lh - Wd * 0.2, Wd * 0.8, Wd * 0.18); ctx.fill();
    ctx.restore();
    if (rider >= 0) {
      var col = PCOLORS[rider];
      var r = s * 0.11;
      var bob = Math.sin(t * 6 + k) * s * 0.01;
      ctx.fillStyle = col.fill;
      ctx.strokeStyle = col.dark;
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath(); ctx.arc(q.x, q.y + bob, r * 1.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f4c89a';
      ctx.beginPath(); ctx.arc(q.x, q.y + bob, r * 0.75, 0, Math.PI * 2); ctx.fill();
    }
  },

  bubble: function (ctx, x, y, text, size, maxW) {
    size = size || 20;
    ctx.font = 'bold ' + size + 'px "Trebuchet MS", sans-serif';
    var lines = wrapText(ctx, text, maxW || 280);
    var w = 0;
    lines.forEach(function (l) { w = Math.max(w, ctx.measureText(l).width); });
    w += 28;
    var h = lines.length * size * 1.25 + 18;
    var bx = Math.max(8, Math.min(W - w - 8, x - w / 2));
    var by = y - h - 16;
    var down = true;
    if (by < 8) { by = y + 16; down = false; }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    this.rr(ctx, bx + 3, by + 4, w, h, 14); ctx.fill();
    ctx.fillStyle = '#fffdf5';
    this.rr(ctx, bx, by, w, h, 14); ctx.fill();
    ctx.beginPath();
    var tx = Math.max(bx + 16, Math.min(bx + w - 16, x));
    if (down) { ctx.moveTo(tx - 10, by + h - 1); ctx.lineTo(tx, by + h + 12); ctx.lineTo(tx + 10, by + h - 1); }
    else { ctx.moveTo(tx - 10, by + 1); ctx.lineTo(tx, by - 12); ctx.lineTo(tx + 10, by + 1); }
    ctx.fill();
    ctx.fillStyle = '#3d2c1e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    lines.forEach(function (l, i) { ctx.fillText(l, bx + w / 2, by + 10 + i * size * 1.25); });
  }
};

function wrapText(ctx, text, maxW) {
  var words = String(text).split(' ');
  var lines = [], cur = '';
  words.forEach(function (w) {
    var test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
  });
  if (cur) lines.push(cur);
  return lines;
}
