// Små effekter: fjer, hjerter, stjerner, plask og flyvende tekst.
const FX = {
  parts: [],
  pops: [],

  clear() { this.parts = []; this.pops = []; },

  burst(x, y, kind, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 140;
      this.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (kind === 'heart' ? 80 : 40),
        life: 0, max: 0.8 + Math.random() * 0.8, kind, color: color || '#fff',
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 8, size: 4 + Math.random() * 4,
      });
    }
  },

  popup(x, y, str, color = '#fff', size = 24) {
    this.pops.push({ x, y, str, color, size, life: 0, max: 1.3 });
  },

  update(dt) {
    for (const p of this.parts) {
      p.life += dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'feather') { p.vx *= 0.94; p.vy = p.vy * 0.94 + 30 * dt * 10; p.x += Math.sin(p.life * 6) * 0.8; }
      else if (p.kind === 'drop') p.vy += 500 * dt;
      else { p.vx *= 0.96; p.vy *= 0.96; }
      p.rot += p.vr * dt;
    }
    this.parts = this.parts.filter((p) => p.life < p.max);
    for (const p of this.pops) { p.life += dt; p.y -= 40 * dt; }
    this.pops = this.pops.filter((p) => p.life < p.max);
  },

  draw(ctx) {
    for (const p of this.parts) {
      const a = 1 - p.life / p.max;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.kind === 'feather') { ell(ctx, 0, 0, p.size * 1.6, p.size * 0.6); ctx.fill(); }
      else if (p.kind === 'heart') {
        const s = p.size * 0.8;
        ctx.rotate(-p.rot);
        ctx.beginPath();
        ctx.moveTo(0, s);
        ctx.bezierCurveTo(-s * 2, -s * 0.5, -s * 0.8, -s * 2, 0, -s * 0.7);
        ctx.bezierCurveTo(s * 0.8, -s * 2, s * 2, -s * 0.5, 0, s);
        ctx.fill();
      } else if (p.kind === 'star') star(ctx, 0, 0, p.size * 1.3, p.color);
      else { ell(ctx, 0, 0, p.size * 0.7, p.size * 0.7); ctx.fill(); }
      ctx.restore();
    }
    for (const p of this.pops) {
      ctx.globalAlpha = Math.min(1, 2.5 * (1 - p.life / p.max));
      text(ctx, p.str, p.x, p.y, p.size, p.color);
      ctx.globalAlpha = 1;
    }
  },
};
