// Tønder der ruller, og kanonerne der skyder dem ud.
class Barrel {
  constructor(x, y, vx) {
    this.x = x; this.y = y;
    this.w = 30; this.h = 30;
    this.vx = vx; this.vy = 0;
    this.rot = 0;
    this.scored = false;
    this.alive = true;
  }

  update(dt, level) {
    this.vy = Math.min(this.vy + GRAV * dt, 900);
    level.moveBody(this, dt);
    if (this.hitWall) this.vx = -this.vx;
    if (this.onGround && this.landVy > 280) this.vy = -this.landVy * 0.35;
    this.rot += (this.vx * dt) / 15;
  }

  draw(ctx) {
    drawBarrel(ctx, this.x + 15, this.y + 15, this.rot);
  }
}

function drawBarrel(ctx, x, y, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  circle(ctx, 0, 0, 15, '#5a3416');
  circle(ctx, 0, 0, 12.5, '#b5743a');
  ctx.strokeStyle = '#5a3416';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
  ctx.moveTo(0, -12); ctx.lineTo(0, 12);
  ctx.stroke();
  circle(ctx, 0, 0, 4, '#7a4a20');
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(x - 4, y - 5, 7, 0, Math.PI * 2);
  ctx.fill();
}

function drawCannon(ctx, c, t) {
  const x = c.x, y = c.y;
  // træstel
  ctx.fillStyle = '#7a4a20';
  roundRect(ctx, x + 2, y + 18, 36, 22, 4);
  ctx.fill();
  ctx.fillStyle = '#5a3416';
  ctx.fillRect(x + 4, y + 26, 32, 3);
  // kanonrør der peger mod aben
  const kick = c.puff > 0 ? c.puff * 12 : 0;
  ctx.save();
  ctx.translate(x + 20 - c.dir * kick, y + 18);
  ctx.scale(c.dir, 1);
  ctx.fillStyle = '#3a3f4a';
  roundRect(ctx, -14, -16, 34, 22, 8);
  ctx.fill();
  ctx.fillStyle = '#1a1c22';
  ellipse(ctx, 20, -5, 5, 10, '#1a1c22');
  ctx.fillStyle = '#ffd23b';
  ctx.fillRect(4, -16, 4, 22);
  // sure øjne
  circle(ctx, -4, -8, 4, '#fff');
  circle(ctx, -3, -8, 2, '#000');
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-9, -15); ctx.lineTo(1, -11); ctx.stroke();
  ctx.restore();
  // slået ud af en bombe: sodet og svimmel
  if (c.stun > 0) {
    ctx.fillStyle = 'rgba(15,12,10,0.55)';
    roundRect(ctx, x, y, 40, 40, 6);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + i * 2.1;
      drawStarShape(ctx, x + 20 + Math.cos(a) * 16, y - 6 + Math.sin(a) * 4, 4, a, '#ffe46b');
    }
  }
  // hjul
  circle(ctx, x + 10, y + 36, 6, '#2a2a2a');
  circle(ctx, x + 30, y + 36, 6, '#2a2a2a');
  circle(ctx, x + 10, y + 36, 2, '#888');
  circle(ctx, x + 30, y + 36, 2, '#888');
}
