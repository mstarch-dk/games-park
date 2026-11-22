// Tegner et lands omrids (silhuet) i et lille lærred.
var Outline = {
  draw: function (canvas, c, opts) {
    opts = opts || {};
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var r = canvas.getBoundingClientRect();
    var w = Math.max(40, r.width), h = Math.max(40, r.height);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!c || !c.parts.length) return;
    var b = c.pbox, midLat = (b.minY + b.maxY) / 2;
    var k = Math.cos(midLat * Math.PI / 180);
    var bw = Math.max(0.05, (b.maxX - b.minX) * k), bh = Math.max(0.05, b.maxY - b.minY);
    var pad = 14, s = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh);
    var ox = w / 2 - ((b.minX + b.maxX) / 2) * k * s, oy = h / 2 + ((b.minY + b.maxY) / 2) * s;
    var fill = opts.fill || '#ffb703', stroke = opts.stroke || '#7a4a00';
    ctx.lineJoin = 'round';
    c.parts.forEach(function (part) {
      var a = part.r.pts, n = a.length / 2, sh = part.s;
      var pw = (part.r.maxX - part.r.minX) * k * s, ph = (part.r.maxY - part.r.minY) * s;
      if (pw < 3 && ph < 3) {
        // Bittesmå øer: vis dem som en prik.
        ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ox + (part.r.c[0] + sh) * k * s, oy - part.r.c[1] * s, c.parts.length > 12 ? 1.6 : 3, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        return;
      }
      ctx.beginPath();
      for (var i = 0; i < n; i++) {
        var x = ox + (a[i * 2] + sh) * k * s, y = oy - a[i * 2 + 1] * s;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
    });
  }
};
