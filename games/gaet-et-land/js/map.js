// Verdenskortet: tegner alle lande, kan trækkes og zoomes (mus, hjul, fingre, taster).
// Projektion: simpel "lige" kortprojektion (længde = x, bredde = y).
var PALETTE = ['#f6d186', '#a8e6cf', '#ffd3b6', '#ffaaa5', '#dcedc1', '#c5b4e3', '#b5e2fa', '#f9c6d9'];

function MapView(canvas, opts) {
  opts = opts || {};
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.interactive = opts.interactive !== false;
  this.w = 300; this.h = 200; this.dpr = 1;
  this.cx = 10; this.cy = 20; this.s = 3;
  this.minS = 1; this.maxS = 600;
  this.pins = []; this.line = null; this.highlight = null; this.hover = null; this.dot = null;
  this.dim = null; // { cont } – nedtoner lande uden for en verdensdel
  this.crosshair = false;
  this.anim = null; this.dirty = true; this.time = 0;
  this.onClick = opts.onClick || null;
  this.onHover = opts.onHover || null;
  this.buildPaths();
  this.resize();
  if (this.interactive) this.bind();
  var self = this;
  if (window.ResizeObserver) {
    new ResizeObserver(function () {
      var r = canvas.getBoundingClientRect();
      if (Math.abs(r.width - self.w) > 1 || Math.abs(r.height - self.h) > 1) self.resize();
    }).observe(canvas);
  }
}

MapView.prototype.buildPaths = function () {
  var self = this;
  var mk = function (rings) {
    var p = new Path2D();
    rings.forEach(function (r) {
      var a = r.pts, n = a.length / 2;
      p.moveTo(a[0], -a[1]);
      for (var i = 1; i < n; i++) p.lineTo(a[i * 2], -a[i * 2 + 1]);
      p.closePath();
    });
    return p;
  };
  var byName = {};
  Geo.list.forEach(function (c) { c.path = mk(c.rings); byName[c.n] = c; });
  // Farvelæg så nabolande (helst) får forskellige farver – store lande først.
  Geo.list.slice().sort(function (a, b) { return b.nb.length - a.nb.length; }).forEach(function (c) {
    if (c.color) return;
    var used = {};
    c.nb.forEach(function (n) { var o = byName[n]; if (o && o.color) used[o.color] = 1; });
    var start = (c.c.charCodeAt(0) + c.c.charCodeAt(1)) % PALETTE.length;
    for (var i = 0; i < PALETTE.length; i++) {
      var col = PALETTE[(start + i) % PALETTE.length];
      if (!used[col]) { c.color = col; break; }
    }
    if (!c.color) c.color = PALETTE[start];
  });
  self.otherPath = mk(Geo.other);
  // Store lande tegnes først, så lande inde i andre lande (Lesotho, San Marino) ligger øverst.
  self.order = Geo.list.slice().sort(function (a, b) { return b.areaDeg - a.areaDeg; });
};

MapView.prototype.resize = function () {
  var r = this.canvas.getBoundingClientRect();
  this.dpr = Math.min(2, window.devicePixelRatio || 1);
  this.w = Math.max(50, r.width); this.h = Math.max(50, r.height);
  this.canvas.width = Math.round(this.w * this.dpr);
  this.canvas.height = Math.round(this.h * this.dpr);
  this.minS = Math.min(this.w / 360, this.h / 150) * 0.98;
  this.clamp();
  this.dirty = true;
};

MapView.prototype.clamp = function () {
  this.s = Math.max(this.minS, Math.min(this.maxS, this.s));
  this.cy = Math.max(-58, Math.min(80, this.cy));
  this.cx = Geo.normLon(this.cx);
};

MapView.prototype.toScreen = function (lon, lat) {
  var dx = Geo.normLon(lon - this.cx);
  return [this.w / 2 + dx * this.s, this.h / 2 - (lat - this.cy) * this.s];
};
MapView.prototype.toGeo = function (x, y) {
  return [Geo.normLon(this.cx + (x - this.w / 2) / this.s), this.cy - (y - this.h / 2) / this.s];
};

MapView.prototype.home = function (instant) { this.flyTo({ minX: -170, maxX: 190, minY: -56, maxY: 78 }, instant, 1); };

// Flyv hen så kassen (grader) fylder skærmen.
MapView.prototype.flyTo = function (b, instant, pad) {
  pad = pad || 1.6;
  var w = Math.max(b.maxX - b.minX, 1.2), h = Math.max(b.maxY - b.minY, 0.9);
  var s = Math.min(this.w / (w * pad), this.h / (h * pad));
  s = Math.max(this.minS, Math.min(60, s));
  var to = { cx: Geo.normLon((b.minX + b.maxX) / 2), cy: (b.minY + b.maxY) / 2, s: s };
  if (instant) { this.cx = to.cx; this.cy = to.cy; this.s = to.s; this.clamp(); this.dirty = true; this.anim = null; return; }
  var dcx = Geo.normLon(to.cx - this.cx);
  this.anim = { t: 0, dur: 1.1, from: { cx: this.cx, cy: this.cy, s: this.s }, dcx: dcx, to: to };
};

MapView.prototype.zoomAt = function (x, y, f) {
  var g = this.toGeo(x, y);
  this.s = Math.max(this.minS, Math.min(this.maxS, this.s * f));
  this.cx = g[0] - (x - this.w / 2) / this.s;
  this.cy = g[1] + (y - this.h / 2) / this.s;
  this.clamp();
  this.anim = null;
  this.dirty = true;
};
MapView.prototype.pan = function (dx, dy) {
  this.cx -= dx / this.s; this.cy += dy / this.s;
  this.clamp(); this.anim = null; this.dirty = true;
};

MapView.prototype.bind = function () {
  var self = this, cv = this.canvas, ptrs = {}, down = null, pinch = null;
  var pos = function (e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', function (e) {
    Sound.unlock();
    cv.setPointerCapture(e.pointerId);
    ptrs[e.pointerId] = pos(e);
    var ids = Object.keys(ptrs);
    if (ids.length === 1) down = { p: pos(e), moved: false, last: pos(e), btn: e.button };
    if (ids.length === 2) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: self.s };
      if (down) down.moved = true;
    }
  });
  cv.addEventListener('pointermove', function (e) {
    var p = pos(e);
    if (!ptrs[e.pointerId]) {
      if (self.onHover && e.pointerType === 'mouse') self.onHover(self.toGeo(p[0], p[1]), p);
      return;
    }
    ptrs[e.pointerId] = p;
    var ids = Object.keys(ptrs);
    if (ids.length === 2 && pinch) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      var d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      var mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      self.zoomAt(mid[0], mid[1], (pinch.s * d / pinch.d) / self.s);
      return;
    }
    if (!down) return;
    if (!down.moved && Math.hypot(p[0] - down.p[0], p[1] - down.p[1]) > 6) down.moved = true;
    if (down.moved) {
      self.pan(p[0] - down.last[0], p[1] - down.last[1]);
      cv.style.cursor = 'grabbing';
    }
    down.last = p;
  });
  var up = function (e) {
    if (!ptrs[e.pointerId]) return;
    delete ptrs[e.pointerId];
    var left = Object.keys(ptrs).length;
    if (left < 2) pinch = null;
    if (left === 0 && down) {
      if (!down.moved && down.btn === 0 && self.onClick) {
        var g = self.toGeo(down.p[0], down.p[1]);
        self.onClick(g[0], g[1]);
      }
      down = null;
      cv.style.cursor = '';
    }
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', function (e) {
    e.preventDefault();
    var p = pos(e);
    self.zoomAt(p[0], p[1], Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0018)));
  }, { passive: false });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  cv.addEventListener('pointerleave', function () { if (self.onHover) self.onHover(null); });
};

MapView.prototype.update = function (dt) {
  this.time += dt;
  if (this.anim) {
    var a = this.anim;
    a.t += dt / a.dur;
    var t = Math.min(1, a.t), e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    // Zoom lidt ud undervejs, så man kan se hvor man flyver hen.
    var ls = Math.log(a.from.s) + (Math.log(a.to.s) - Math.log(a.from.s)) * e;
    var bump = Math.sin(t * Math.PI) * Math.min(0.9, Math.abs(a.dcx) / 120 + Math.abs(a.to.cy - a.from.cy) / 120);
    this.s = Math.exp(ls - bump);
    this.cx = a.from.cx + a.dcx * e;
    this.cy = a.from.cy + (a.to.cy - a.from.cy) * e;
    this.clamp();
    this.dirty = true;
    if (t >= 1) this.anim = null;
  }
  if (this.highlight || this.pins.length) this.dirty = true; // blinker
};

MapView.prototype.draw = function () {
  if (!this.dirty) return;
  this.dirty = false;
  var ctx = this.ctx, w = this.w, h = this.h, s = this.s, self = this;
  ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  var g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#3a86c8'); g.addColorStop(1, '#2a6fb0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Kopier af verden til venstre/højre, så man kan køre hele vejen rundt.
  var offs = [];
  for (var k = -2; k <= 2; k++) {
    var x0 = w / 2 + (-180 + k * 360 - this.cx) * s, x1 = x0 + 360 * s;
    if (x1 > 0 && x0 < w) offs.push(k * 360);
  }
  var hl = this.highlight, lw = 1 / s;

  offs.forEach(function (off) {
    var tx = w / 2 + (off - self.cx) * s, ty = h / 2 + self.cy * s;
    ctx.setTransform(self.dpr * s, 0, 0, self.dpr * s, self.dpr * tx, self.dpr * ty);
    // Breddegrader og længdegrader
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (var la = -60; la <= 80; la += 20) { ctx.moveTo(-180, -la); ctx.lineTo(180, -la); }
    for (var lo = -180; lo <= 180; lo += 30) { ctx.moveTo(lo, -85); ctx.lineTo(lo, 70); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.moveTo(-180, 0); ctx.lineTo(180, 0); ctx.stroke(); // ækvator

    ctx.fillStyle = '#c9c3b5';
    ctx.fill(self.otherPath);
    ctx.lineJoin = 'round';
    self.order.forEach(function (c) {
      var dimmed = self.dim && self.dim.cont && c.cont !== self.dim.cont;
      ctx.fillStyle = dimmed ? '#cfd4c8' : c.color;
      if (self.hover === c) ctx.fillStyle = '#fff3a8';
      ctx.fill(c.path);
    });
    ctx.strokeStyle = 'rgba(70,60,50,0.55)';
    ctx.lineWidth = lw * 0.8;
    self.order.forEach(function (c) { ctx.stroke(c.path); });
    ctx.strokeStyle = 'rgba(70,60,50,0.35)';
    ctx.stroke(self.otherPath);
    if (self.hover) { ctx.strokeStyle = '#7a5a00'; ctx.lineWidth = lw * 2; ctx.stroke(self.hover.path); }
    if (hl) {
      var pulse = 0.55 + 0.45 * Math.sin(self.time * 5);
      ctx.fillStyle = hl.color || '#ff6b35';
      ctx.globalAlpha = 0.75 + 0.25 * pulse;
      ctx.fill(hl.c.path);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#7a1f00';
      ctx.lineWidth = lw * 2;
      ctx.stroke(hl.c.path);
    }
  });

  ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  // Små lande får en ring om sig, så de kan ses.
  if (hl) {
    var b = hl.c.bbox, size = Math.max((b.maxX - b.minX), (b.maxY - b.minY)) * s;
    if (size < 26) {
      var p = this.toScreen(hl.c.center[0], hl.c.center[1]);
      ctx.strokeStyle = hl.color || '#ff6b35';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(p[0], p[1], 16 + 4 * Math.sin(this.time * 5), 0, Math.PI * 2); ctx.stroke();
    }
  }
  if (this.line) {
    var a = this.toScreen(this.line[0][0], this.line[0][1]);
    var bb = this.toScreen(this.line[1][0], this.line[1][1]);
    // Tegn den korte vej rundt om kloden.
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(bb[0], bb[1]); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(bb[0], bb[1], 5, 0, Math.PI * 2); ctx.fill();
  }
  if (this.dot) {
    var d = this.toScreen(this.dot.lon, this.dot.lat);
    ctx.fillStyle = '#d62828'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(d[0], d[1], 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (this.dot.label) {
      ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.fillStyle = '#fff';
      ctx.strokeText(this.dot.label, d[0] + 10, d[1] + 5); ctx.fillText(this.dot.label, d[0] + 10, d[1] + 5);
    }
  }
  this.pins.forEach(function (pin) { self.drawPin(pin); });
  if (this.crosshair) {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 14, h / 2); ctx.lineTo(w / 2 - 4, h / 2); ctx.moveTo(w / 2 + 4, h / 2); ctx.lineTo(w / 2 + 14, h / 2);
    ctx.moveTo(w / 2, h / 2 - 14); ctx.lineTo(w / 2, h / 2 - 4); ctx.moveTo(w / 2, h / 2 + 4); ctx.lineTo(w / 2, h / 2 + 14);
    ctx.stroke();
  }
};

MapView.prototype.drawPin = function (pin) {
  var ctx = this.ctx, p = this.toScreen(pin.lon, pin.lat), x = p[0], y = p[1];
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(x, y, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = pin.color || '#e63946';
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x - 4, y - 12, x - 13, y - 18, x - 13, y - 27);
  ctx.arc(x, y - 27, 13, Math.PI, 0);
  ctx.bezierCurveTo(x + 13, y - 18, x + 4, y - 12, x, y);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x, y - 27, 5, 0, Math.PI * 2); ctx.fill();
};
