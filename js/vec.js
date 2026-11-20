// Vektor-matematik og "wrap-around": feltet hænger sammen i kanterne,
// så flyver man ud til venstre, kommer man ind igen til højre.
const WORLD = { w: 4000, h: 2600 };
const TAU = Math.PI * 2;

// Lægger et tal ind i intervallet 0..size
function wrapCoord(v, size) {
  return ((v % size) + size) % size;
}

// Korteste afstand fra a til b på én akse (måske over kanten)
function wrapD(a, b, size) {
  let d = b - a;
  if (d > size / 2) d -= size;
  else if (d < -size / 2) d += size;
  return d;
}

const V = {
  wrap(o) {
    o.x = wrapCoord(o.x, WORLD.w);
    o.y = wrapCoord(o.y, WORLD.h);
  },
  // Vektor fra a til b ad korteste vej
  delta(a, b) {
    return { x: wrapD(a.x, b.x, WORLD.w), y: wrapD(a.y, b.y, WORLD.h) };
  },
  dist(a, b) {
    const d = V.delta(a, b);
    return Math.hypot(d.x, d.y);
  },
  // Klip en hastighed så den ikke bliver længere end max (retningen bevares)
  clamp(o, max) {
    const l = Math.hypot(o.vx, o.vy);
    if (l > max) {
      o.vx *= max / l;
      o.vy *= max / l;
    }
  },
  // Midtpunktet af flere punkter i en verden der wrapper
  center(points) {
    if (!points.length) return { x: WORLD.w / 2, y: WORLD.h / 2 };
    const a = points[0];
    let sx = 0, sy = 0;
    for (const p of points) {
      const d = V.delta(a, p);
      sx += d.x; sy += d.y;
    }
    return { x: wrapCoord(a.x + sx / points.length, WORLD.w), y: wrapCoord(a.y + sy / points.length, WORLD.h) };
  },
};

// Mindste vinkel-forskel (-PI..PI)
function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
