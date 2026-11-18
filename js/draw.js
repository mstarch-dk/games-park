// Fælles tegne-hjælpere og konstanter.
const W = 960;
const H = 520;
const TILE = 40;
const GRAV = 2100;
const FONT = "'Comic Sans MS', 'Chalkboard SE', 'Trebuchet MS', sans-serif";

function approach(v, target, step) {
  if (v < target) return Math.min(v + step, target);
  return Math.max(v - step, target);
}

// Fast "tilfældigt" tal ud fra et tal, så baggrunde ser ens ud hver gang.
function rnd(i) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function overlap(a, b, shrink = 0) {
  return a.x + shrink < b.x + b.w && a.x + a.w - shrink > b.x &&
         a.y + shrink < b.y + b.h && a.y + a.h - shrink > b.y;
}

function text(ctx, str, x, y, size, color = '#fff', align = 'center', outline = '#2a1a0a') {
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

function circle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function ellipse(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawStarShape(ctx, x, y, r, rot, color, outline) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.restore();
}

function drawHeart(ctx, x, y, s, color = '#ff3b5c') {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s * 1.1, -s * 0.4, -s * 0.5, -s * 1.1, 0, -s * 0.45);
  ctx.bezierCurveTo(s * 0.5, -s * 1.1, s * 1.1, -s * 0.4, 0, s * 0.35);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#5a0a1a';
  ctx.lineWidth = 2;
  ctx.stroke();
  circle(ctx, -s * 0.35, -s * 0.45, s * 0.15, 'rgba(255,255,255,0.7)');
  ctx.restore();
}

// ---------- Partikler (støv, træsplinter, konfetti) ----------
const Particles = {
  list: [],
  add(p) {
    this.list.push(Object.assign({ vx: 0, vy: 0, grav: 0, life: 1, size: 4, color: '#fff', shape: 'circle', rot: 0, vr: 0 }, p, { max: p.life || 1 }));
  },
  burst(x, y, n, opts) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (opts.speed || 200) * (0.4 + Math.random() * 0.6);
      this.add(Object.assign({}, opts, {
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - (opts.up || 0),
        vr: (Math.random() - 0.5) * 12,
        color: Array.isArray(opts.color) ? opts.color[Math.floor(Math.random() * opts.color.length)] : opts.color,
        life: (opts.life || 0.8) * (0.6 + Math.random() * 0.5),
      }));
    }
  },
  update(dt) {
    for (const p of this.list) {
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.life -= dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  },
  draw(ctx) {
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.5));
      if (p.shape === 'rect') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size, -p.size / 2.5, p.size * 2, p.size / 1.25);
        ctx.restore();
      } else if (p.shape === 'star') {
        drawStarShape(ctx, p.x, p.y, p.size, p.rot, p.color);
      } else {
        circle(ctx, p.x, p.y, p.size, p.color);
      }
    }
    ctx.globalAlpha = 1;
  },
};

// ---------- Point der "popper" op ----------
const Popups = {
  list: [],
  add(x, y, str, color = '#fff', size = 24) {
    this.list.push({ x, y, str, color, size, life: 1.1 });
  },
  update(dt) {
    for (const p of this.list) { p.y -= 60 * dt; p.life -= dt; }
    this.list = this.list.filter((p) => p.life > 0);
  },
  draw(ctx) {
    for (const p of this.list) {
      ctx.globalAlpha = Math.min(1, p.life * 2);
      const pop = 1 + Math.max(0, p.life - 0.9) * 3;
      text(ctx, p.str, p.x, p.y, p.size * pop, p.color);
    }
    ctx.globalAlpha = 1;
  },
};
