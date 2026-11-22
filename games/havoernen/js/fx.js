// Effekter: kølvand, røg, plask, træsplinter og svævende tekst.
const Fx = {
  list: [],

  add(p) { if (this.list.length < 900) this.list.push(p); },

  wake(x, y, size) { this.add({ kind: 'wake', x, y, r: size, life: 1.6, max: 1.6 }); },
  smoke(x, y, vx = 0, vy = 0, r = 10, life = 1.4) {
    this.add({ kind: 'smoke', x, y, vx: vx + rand(-8, 8), vy: vy + rand(-8, 8), r, life, max: life });
  },
  splash(x, y) {
    this.add({ kind: 'ring', x, y, r: 4, life: 0.8, max: 0.8 });
    for (let i = 0; i < 7; i++) {
      const a = rand(0, TAU), s = rand(20, 60);
      this.add({ kind: 'drop', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rand(2, 4), life: 0.5, max: 0.5 });
    }
  },
  splinters(x, y) {
    for (let i = 0; i < 9; i++) {
      const a = rand(0, TAU), s = rand(30, 110);
      this.add({ kind: 'wood', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, rot: rand(0, TAU), life: 0.9, max: 0.9 });
    }
    this.add({ kind: 'flash', x, y, r: 16, life: 0.25, max: 0.25 });
    this.smoke(x, y, 0, 0, 12, 1.2);
  },
  muzzle(x, y, dirX, dirY, vx, vy) {
    this.add({ kind: 'flash', x: x + dirX * 6, y: y + dirY * 6, r: 9, life: 0.12, max: 0.12 });
    for (let i = 0; i < 3; i++) this.smoke(x + dirX * 10, y + dirY * 10, vx * 0.5 + dirX * 40, vy * 0.5 + dirY * 40, 9, 1.6);
  },
  text(x, y, text, color = '#ffe066', size = 22) {
    this.add({ kind: 'text', x, y, text, color, size, life: 1.8, max: 1.8 });
  },

  update(dt) {
    for (const p of this.list) {
      p.life -= dt;
      if (p.vx !== undefined) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 1 - 1.5 * dt; p.vy *= 1 - 1.5 * dt;
      }
      if (p.kind === 'smoke') { p.x += Wind.vx * 25 * dt; p.y += Wind.vy * 25 * dt; p.r += 10 * dt; }
      if (p.kind === 'ring') p.r += 30 * dt;
      if (p.kind === 'wake') p.r += 6 * dt;
      if (p.kind === 'text') p.y -= 30 * dt;
      if (p.kind === 'wood') p.rot += 6 * dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  },

  drawBelow(ctx) {
    for (const p of this.list) {
      const a = p.life / p.max;
      if (p.kind === 'wake') {
        ctx.fillStyle = `rgba(255,255,255,${0.22 * a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      } else if (p.kind === 'ring') {
        ctx.strokeStyle = `rgba(255,255,255,${0.8 * a})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.stroke();
      } else if (p.kind === 'drop') {
        ctx.fillStyle = `rgba(230,250,255,${a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      } else if (p.kind === 'wood') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = `rgba(120,70,30,${a})`; ctx.fillRect(-4, -1.5, 8, 3);
        ctx.restore();
      }
    }
  },

  drawAbove(ctx) {
    for (const p of this.list) {
      const a = p.life / p.max;
      if (p.kind === 'smoke') {
        ctx.fillStyle = `rgba(225,225,225,${0.45 * a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      } else if (p.kind === 'flash') {
        ctx.fillStyle = `rgba(255,210,80,${a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.4 - a * 0.4), 0, TAU); ctx.fill();
      } else if (p.kind === 'text') {
        ctx.globalAlpha = Math.min(1, a * 2);
        outlineText(ctx, p.text, p.x, p.y, p.size, p.color);
        ctx.globalAlpha = 1;
      }
    }
  },
};
