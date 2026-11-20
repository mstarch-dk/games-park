// Partikler: flammer, røg, gnister, eksplosioner og tekst der popper op.
const Particles = {
  list: [],
  MAX: 1800,

  add(p) {
    if (this.list.length >= this.MAX) this.list.shift();
    p.life = p.life || 1;
    p.max = p.life;
    p.vx = p.vx || 0;
    p.vy = p.vy || 0;
    p.size = p.size || 3;
    p.drag = p.drag ?? 1;
    this.list.push(p);
  },

  update(dt) {
    for (const p of this.list) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.drag !== 1) {
        const k = Math.pow(p.drag, dt * 60);
        p.vx *= k; p.vy *= k;
      }
      if (p.grow) p.size += p.grow * dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  },

  draw(ctx) {
    const z = Camera.zoom;
    for (const p of this.list) {
      const s = Camera.toScreen(p);
      const m = (p.size + 40) * z;
      if (s.x < -m || s.x > W + m || s.y < -m || s.y > H + m) continue;
      const f = p.life / p.max; // 1 -> 0
      ctx.globalAlpha = p.fade === false ? 1 : Math.min(1, f * 1.5);
      if (p.type === 'text') {
        ctx.globalAlpha = Math.min(1, f * 3);
        const sz = p.size * (1 + (1 - f) * 0.3) * Math.max(0.7, z);
        text(ctx, p.str, s.x, s.y, sz, p.color);
      } else if (p.type === 'ring') {
        const r = (p.r0 + (p.r1 - p.r0) * (1 - f)) * z;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, p.size * f * z);
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, TAU);
        ctx.stroke();
      } else if (p.type === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, p.size * z);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - p.vx * 0.04 * z, s.y - p.vy * 0.04 * z);
        ctx.stroke();
      } else if (p.type === 'debris') {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(p.rot + (1 - f) * p.spin);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size * z, -p.size * z * 0.5, p.size * 2 * z, p.size * z);
        ctx.restore();
      } else {
        ctx.fillStyle = typeof p.color === 'function' ? p.color(f) : p.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, Math.max(0.8, p.size * z), 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  },
};

// Færdige effekter
const Fx = {
  // Flamme bag skibet når det speeder op
  flame(x, y, angle, vx, vy, colors, power = 1) {
    const a = angle + Math.PI + rand(-0.25, 0.25);
    const sp = rand(140, 260) * power;
    Particles.add({
      x, y, vx: vx + Math.cos(a) * sp, vy: vy + Math.sin(a) * sp,
      life: rand(0.2, 0.4), size: rand(3, 6) * Math.sqrt(power), grow: -8,
      color: pick(colors),
    });
  },

  sparks(x, y, n, color, speed = 260) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = rand(0.3, 1) * speed;
      Particles.add({ type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.2, 0.5), size: 2, color, drag: 0.95 });
    }
  },

  smoke(x, y, n, size = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = rand(10, 60);
      Particles.add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.6, 1.3), size: rand(size * 0.5, size), grow: 14, color: 'rgba(120,120,140,0.35)', drag: 0.97 });
    }
  },

  ring(x, y, r0, r1, color, life = 0.5, size = 6) {
    Particles.add({ type: 'ring', x, y, r0, r1, color, life, size });
  },

  text(x, y, str, color = '#fff', size = 30, life = 1) {
    Particles.add({ type: 'text', x, y, vy: -50, str, color, size, life, drag: 0.96 });
  },

  explosion(x, y, scale = 1, colors = ['#fff6a0', '#ffb030', '#ff5a1f', '#ff2a6a']) {
    const n = Math.floor(40 * scale);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = rand(40, 380) * Math.sqrt(scale);
      Particles.add({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.4, 1.1), size: rand(3, 9) * Math.sqrt(scale), grow: -4,
        color: pick(colors), drag: 0.95,
      });
    }
    for (let i = 0; i < 12 * scale; i++) {
      const a = Math.random() * TAU, sp = rand(100, 300);
      Particles.add({
        type: 'debris', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.8, 1.6),
        size: rand(2, 5) * Math.sqrt(scale), color: pick(['#ccd', '#889', '#ffcc66']), rot: Math.random() * TAU, spin: rand(-12, 12), drag: 0.99,
      });
    }
    Fx.smoke(x, y, Math.floor(10 * scale), 16 * scale);
    Fx.ring(x, y, 10, 120 * scale, 'rgba(255,240,200,0.9)', 0.45, 10);
    Particles.add({ x, y, life: 0.15, size: 60 * scale, color: 'rgba(255,255,230,0.9)' });
  },
};
