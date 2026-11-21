// Skud: spillernes gule/regnbue-skud og fjendernes store, langsomme lyskugler.
const Bullets = {
  player: [],
  enemy: [],

  clear() { this.player = []; this.enemy = []; },

  firePlayer(x, y, angle, dmg, color, owner) {
    const sp = 950;
    this.player.push({ x, y, vx: Math.sin(angle) * sp, vy: -Math.cos(angle) * sp, r: 7, dmg, color, owner, angle, dead: false });
  },

  fireEnemy(x, y, vx, vy, r = 8) {
    if (this.enemy.length > 120) return;
    this.enemy.push({ x, y, vx, vy, r, t: rand(0, 1), dead: false });
  },

  aimed(x, y, tx, ty, speed, spread = 0) {
    const a = Math.atan2(ty - y, tx - x) + spread;
    this.fireEnemy(x, y, Math.cos(a) * speed, Math.sin(a) * speed);
  },

  ring(x, y, n, speed, offset = 0) {
    for (let i = 0; i < n; i++) {
      const a = offset + (i * TAU) / n;
      this.fireEnemy(x, y, Math.cos(a) * speed, Math.sin(a) * speed, 9);
    }
  },

  update(dt) {
    const out = (b) => b.dead || b.x < -40 || b.x > W + 40 || b.y < -60 || b.y > H + 40;
    for (const b of this.player) { b.x += b.vx * dt; b.y += b.vy * dt; }
    for (const b of this.enemy) { b.x += b.vx * dt; b.y += b.vy * dt; b.t += dt; }
    this.player = this.player.filter((b) => !out(b));
    this.enemy = this.enemy.filter((b) => !out(b));
  },

  drawPlayer() {
    ctx.lineCap = 'round';
    for (const b of this.player) {
      const dx = Math.sin(b.angle) * 12, dy = -Math.cos(b.angle) * 12;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(b.x - dx, b.y - dy); ctx.lineTo(b.x + dx, b.y + dy); ctx.stroke();
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(b.x - dx, b.y - dy); ctx.lineTo(b.x + dx, b.y + dy); ctx.stroke();
    }
  },

  drawEnemy() {
    for (const b of this.enemy) {
      const pulse = 1 + Math.sin(b.t * 14) * 0.12;
      ctx.globalAlpha = 0.35;
      Draw.circle(b.x, b.y, b.r * 1.8 * pulse, '#ff4fa3');
      ctx.globalAlpha = 1;
      Draw.circle(b.x, b.y, b.r * pulse, '#ff7b39');
      Draw.circle(b.x, b.y, b.r * 0.5, '#fff7d6');
    }
  },
};
