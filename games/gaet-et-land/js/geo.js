// Geografi: pakker landenes omrids ud, finder lande under et klik og måler afstande i km.
var Geo = (function () {
  var R = 6371; // jordens radius i km
  var RAD = Math.PI / 180;

  function decodeRing(enc) {
    var n = enc.length / 2, out = new Float32Array(enc.length), x = 0, y = 0;
    for (var i = 0; i < n; i++) {
      x += enc[i * 2]; y += enc[i * 2 + 1];
      out[i * 2] = x / 100; out[i * 2 + 1] = y / 100;
    }
    return out;
  }

  function ringInfo(r) {
    var minX = 999, minY = 999, maxX = -999, maxY = -999, a = 0, cx = 0, cy = 0, n = r.length / 2;
    for (var i = 0; i < n; i++) {
      var x = r[i * 2], y = r[i * 2 + 1];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      var j = (i + 1) % n, x2 = r[j * 2], y2 = r[j * 2 + 1];
      var f = x * y2 - x2 * y;
      a += f; cx += (x + x2) * f; cy += (y + y2) * f;
    }
    a /= 2;
    var c = Math.abs(a) > 1e-9 ? [cx / (6 * a), cy / (6 * a)] : [(minX + maxX) / 2, (minY + maxY) / 2];
    var k = Math.cos(((minY + maxY) / 2) * RAD);
    return { pts: r, minX: minX, minY: minY, maxX: maxX, maxY: maxY, area: Math.abs(a) * k, c: c };
  }

  function bboxOf(rings) {
    var b = { minX: 999, minY: 999, maxX: -999, maxY: -999 };
    rings.forEach(function (r) {
      b.minX = Math.min(b.minX, r.minX); b.maxX = Math.max(b.maxX, r.maxX);
      b.minY = Math.min(b.minY, r.minY); b.maxY = Math.max(b.maxY, r.maxY);
    });
    return b;
  }

  // Vælg de dele af landet, der giver et pænt omrids (ikke fjerne øer og oversøiske områder).
  // Hver del får et skift (-360/0/360) så dele på hver sin side af datolinjen ligger sammen.
  function mainParts(rings) {
    if (!rings.length) return [];
    var sorted = rings.slice().sort(function (a, b) { return b.area - a.area; });
    var big = sorted[0], gap = 6, out = [];
    sorted.forEach(function (r) {
      var s = 0;
      if (r.c[0] - big.c[0] > 180) s = -360; else if (big.c[0] - r.c[0] > 180) s = 360;
      if (r === big) { out.push({ r: r, s: 0 }); return; }
      var dx = Math.max(0, r.minX + s - big.maxX, big.minX - r.maxX - s);
      var dy = Math.max(0, r.minY - big.maxY, big.minY - r.maxY);
      var keep = r.area > big.area * 0.04 ||
        (dx < gap && dy < gap && r.area > big.area * 0.0005) || (dx < gap / 3 && dy < gap / 3);
      if (keep) out.push({ r: r, s: s });
    });
    return out;
  }

  function partsBox(parts) {
    var b = { minX: 9999, minY: 999, maxX: -9999, maxY: -999 };
    parts.forEach(function (p) {
      b.minX = Math.min(b.minX, p.r.minX + p.s); b.maxX = Math.max(b.maxX, p.r.maxX + p.s);
      b.minY = Math.min(b.minY, p.r.minY); b.maxY = Math.max(b.maxY, p.r.maxY);
    });
    return b;
  }

  function normLon(lon) { lon = ((lon + 180) % 360 + 360) % 360 - 180; return lon; }

  function haversine(lat1, lon1, lat2, lon2) {
    var dLat = (lat2 - lat1) * RAD, dLon = (lon2 - lon1) * RAD;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  function inRing(r, x, y) {
    if (r.maxX > 180 && x < r.minX) x += 360; // ring der går over datolinjen
    if (x < r.minX || x > r.maxX || y < r.minY || y > r.maxY) return false;
    var p = r.pts, n = p.length / 2, inside = false;
    for (var i = 0, j = n - 1; i < n; j = i++) {
      var xi = p[i * 2], yi = p[i * 2 + 1], xj = p[j * 2], yj = p[j * 2 + 1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  // Nærmeste punkt på landets kyst/grænse. Returnerer { km, lon, lat } (km = 0 hvis klikket er inde i landet).
  function nearest(country, lon, lat) {
    lon = normLon(lon);
    var k = Math.cos(lat * RAD), best = Infinity, bx = 0, by = 0, inside = false;
    country.rings.forEach(function (r) {
      if (inRing(r, lon, lat)) inside = true;
      var p = r.pts, n = p.length / 2;
      for (var i = 0; i < n; i++) {
        var j = (i + 1) % n;
        var ax = normLon(p[i * 2] - lon) * k, ay = p[i * 2 + 1] - lat;
        // Næste punkt regnes ud fra det forrige, så et stykke aldrig "går hele vejen rundt" om kloden.
        var bxx = ax + normLon(p[j * 2] - p[i * 2]) * k, byy = p[j * 2 + 1] - lat;
        var dx = bxx - ax, dy = byy - ay, l2 = dx * dx + dy * dy;
        var t = l2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
        var qx = ax + t * dx, qy = ay + t * dy, d = qx * qx + qy * qy;
        if (d < best) { best = d; bx = qx; by = qy; }
      }
    });
    var nLat = lat + by, nLon = lon + (k > 0.01 ? bx / k : 0);
    if (inside) return { km: 0, lon: lon, lat: lat, inside: true };
    return { km: haversine(lat, lon, nLat, nLon), lon: nLon, lat: nLat, inside: false };
  }

  var list = [], byCode = {}, other = [];

  function init() {
    list = window.COUNTRIES;
    list.forEach(function (c, i) {
      c.idx = i;
      c.rings = (window.SHAPES[c.c] || []).map(function (e) { return ringInfo(decodeRing(e)); });
      c.bbox = bboxOf(c.rings);
      c.parts = mainParts(c.rings);
      c.pbox = partsBox(c.parts);
      c.center = c.parts.length ? c.parts[0].r.c : [c.ll[1], c.ll[0]];
      c.areaDeg = c.rings.reduce(function (s, r) { return s + r.area; }, 0);
      byCode[c.c] = c;
    });
    other = (window.OTHER_LAND || []).map(function (e) { return ringInfo(decodeRing(e)); });
  }

  // Landet lige under punktet – eller det nærmeste inden for maxKm (så små lande kan rammes).
  function countryAt(lon, lat, maxKm) {
    lon = normLon(lon);
    // Lande inde i andre lande (Vatikanstaten, Lesotho ...): det mindste land vinder.
    var hit = null;
    for (var i = 0; i < list.length; i++) {
      var c = list[i], b = c.bbox;
      if ((lon < b.minX && lon + 360 > b.maxX) || lon > b.maxX || lat < b.minY || lat > b.maxY) continue;
      for (var j = 0; j < c.rings.length; j++) {
        if (inRing(c.rings[j], lon, lat)) { if (!hit || c.areaDeg < hit.areaDeg) hit = c; break; }
      }
    }
    // Bittesmå lande (Monaco, Malta ...) er svære at ramme – tæt nok på er godt nok.
    if (maxKm) {
      var tinyBest = null, tinyKm = maxKm;
      list.forEach(function (c) {
        if (c.areaDeg > 0.05 || c === hit) return;
        var bb = c.bbox, deg = maxKm / 111 + 1;
        if (lat < bb.minY - deg || lat > bb.maxY + deg) return;
        var n = nearest(c, lon, lat);
        if (n.km < tinyKm) { tinyKm = n.km; tinyBest = c; }
      });
      if (tinyBest) return tinyBest;
    }
    if (hit || !maxKm) return hit;
    var best = null, bestKm = maxKm, deg = maxKm / 111 + 1;
    list.forEach(function (c) {
      var b = c.bbox;
      if (lat < b.minY - deg || lat > b.maxY + deg) return;
      var n = nearest(c, lon, lat);
      if (n.km < bestKm) { bestKm = n.km; best = c; }
    });
    return best;
  }

  function isOtherLand(lon, lat) {
    lon = normLon(lon);
    for (var i = 0; i < other.length; i++) if (inRing(other[i], lon, lat)) return true;
    return false;
  }

  return {
    init: init, nearest: nearest, haversine: haversine, countryAt: countryAt, isOtherLand: isOtherLand,
    normLon: normLon,
    get list() { return list; }, get other() { return other; },
    byCode: function (c) { return byCode[c]; }
  };
})();
