// Det komisk store bombefly og dets bombe.
const BOMBER_WARN = 1.2;    // sekunders varsel før flyet kommer
const BOMBER_SPEED = 300;
const BOMBER_Y = 78;
const BOMBER_HALF = 240;    // halv længde af flyet
const BOMB_GRAV = 1100;
const BOMB_NEAR = 90;       // så tæt på farezonen giver "PÅ ET HÅR!"
const ENERGY_AFTER = 1.2;   // super-energi varer så længe efter eksplosionen

class Bomber {
  constructor(x, bombs) {
    this.x = x;
    this.y = BOMBER_Y;
    this.toDrop = bombs;
    this.dropped = 0;
    this.gap = 0;
    this.aim = (Math.random() - 0.5) * 80;
    this.armed = true;
    this.t = 0;
    this.putt = 0;
    this.doors = 0;
  }

  update(dt) {
    this.t += dt;
    this.x -= BOMBER_SPEED * dt;
    this.gap = Math.max(0, this.gap - dt);
    this.doors = Math.max(0, this.doors - dt);
    if (Math.random() < dt * 14) {
      Particles.add({ x: this.x + BOMBER_HALF, y: this.y + (Math.random() - 0.5) * 20, vx: 40, vy: -20,
        size: 7 + Math.random() * 7, color: 'rgba(90,90,90,0.55)', life: 0.9 });
    }
  }

  draw(ctx) {
    const t = this.t;
    ctx.save();
    ctx.translate(this.x, this.y + Math.sin(t * 2.2) * 6);
    ctx.rotate(Math.sin(t * 1.7) * 0.018);

    // haleror og bagerste, alt for lille vinge
    ctx.fillStyle = '#b5482f';
    ctx.beginPath();
    ctx.moveTo(165, -38); ctx.lineTo(232, -74); ctx.lineTo(244, -12); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5f7052';
    ellipse(ctx, 24, -30, 34, 8, '#5f7052');

    // den tykke krop
    ellipse(ctx, 0, 0, 228, 60, '#7d9169');
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, 228, 60, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#c9d2a9';
    ctx.fillRect(-240, 26, 480, 40);
    ctx.fillStyle = '#b5482f';
    ctx.fillRect(112, -70, 18, 140);
    ctx.fillRect(140, -70, 8, 140);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(-240, -44, 480, 12);
    ctx.restore();
    ctx.strokeStyle = '#3f4d36';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 228, 60, 0, 0, Math.PI * 2);
    ctx.stroke();

    // nitter og et lappet hul
    for (let i = 0; i < 9; i++) circle(ctx, -90 + i * 24, 18, 2, '#46553c');
    ctx.fillStyle = '#a89a6b';
    ctx.save();
    ctx.translate(70, -12);
    ctx.rotate(0.2);
    ctx.fillRect(-14, -9, 28, 18);
    ctx.strokeStyle = '#46553c';
    ctx.lineWidth = 2;
    ctx.strokeRect(-14, -9, 28, 18);
    ctx.restore();

    // bombelem
    const open = this.doors > 0 ? 16 : 0;
    ctx.fillStyle = open ? '#1a1c22' : '#46553c';
    ctx.fillRect(-30, 52, 60, 8);
    ctx.fillStyle = '#3f4d36';
    ctx.fillRect(-34 - open, 56, 32, 6);
    ctx.fillRect(2 + open, 56, 32, 6);

    // lillebitte cockpit med en sur pilot
    ctx.fillStyle = 'rgba(190,235,255,0.85)';
    ctx.beginPath();
    ctx.arc(-92, -52, 25, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    circle(ctx, -92, -58, 11, '#e0a070');
    ctx.fillStyle = '#6b3d1a';
    ctx.beginPath();
    ctx.arc(-92, -60, 11, Math.PI, 0);
    ctx.fill();
    circle(ctx, -97, -58, 4, '#222');
    circle(ctx, -87, -58, 4, '#222');
    circle(ctx, -98, -59, 1.4, '#9fe0ff');
    circle(ctx, -88, -59, 1.4, '#9fe0ff');
    ctx.strokeStyle = '#3a1a10';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-98, -51); ctx.lineTo(-88, -53); ctx.stroke();
    ctx.strokeStyle = '#d33';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-82, -52);
    ctx.quadraticCurveTo(-70, -56 + Math.sin(t * 14) * 4, -58, -54 + Math.sin(t * 16) * 6);
    ctx.stroke();
    ctx.strokeStyle = '#3f4d36';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-92, -52, 25, Math.PI, 0);
    ctx.stroke();

    // fjollet ansigt på næsen
    circle(ctx, -176, -20, 15, '#fff');
    circle(ctx, -146, -24, 18, '#fff');
    circle(ctx, -181 + Math.sin(t * 5) * 2, -17, 6, '#111');
    circle(ctx, -152 + Math.sin(t * 5) * 2, -20, 7.5, '#111');
    ctx.strokeStyle = '#2b2f24';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-193, -42); ctx.lineTo(-166, -36);
    ctx.moveTo(-164, -46); ctx.lineTo(-130, -44);
    ctx.stroke();
    ctx.fillStyle = '#5b1b1b';
    ctx.beginPath();
    ctx.moveTo(-204, 10);
    ctx.quadraticCurveTo(-160, 48, -116, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) {
      const tx = -196 + i * 15;
      ctx.fillRect(tx, 12, 12, i === 2 ? 15 : 10);
    }

    // forreste, helt håbløst lille vinge
    ctx.fillStyle = '#65784f';
    ctx.beginPath();
    ctx.moveTo(-34, 6); ctx.lineTo(44, 6); ctx.lineTo(70, 42); ctx.lineTo(28, 42); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3f4d36';
    ctx.lineWidth = 3;
    ctx.stroke();

    // propel
    ctx.fillStyle = '#b5482f';
    circle(ctx, -231, 0, 10, '#b5482f');
    ctx.globalAlpha = 0.65;
    ellipse(ctx, -238, 0, 5, Math.abs(Math.sin(t * 40)) * 34 + 8, '#2b2b2b');
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

class Bomb {
  constructor(x, y, fuse, radius) {
    this.w = 34; this.h = 34;
    this.x = x - this.w / 2;
    this.y = y;
    this.vx = -70; this.vy = 80;
    this.fuse = fuse;
    this.maxFuse = fuse;
    this.radius = radius;
    this.alive = true;
    this.rot = 0;
    this.tick = 0;
    this.kickWait = 0;
    this.scored = false;
    this.riding = null;
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dt, level) {
    this.fuse -= dt;
    this.tick -= dt;
    this.kickWait = Math.max(0, this.kickWait - dt);
    if (this.riding) this.x += this.riding.dx;
    this.vy = Math.min(this.vy + BOMB_GRAV * dt, 800);
    level.moveBody(this, dt);
    if (this.hitWall) this.vx = -this.vx * 0.6;
    if (this.onGround) {
      if (this.landVy > 200) this.vy = -this.landVy * 0.4;
      this.vx = approach(this.vx, 0, 420 * dt);
    }
    this.rot += (this.vx * dt) / 17;
  }

  draw(ctx, t) {
    const urgent = this.fuse < 1.2;
    const blink = Math.floor(t * (urgent ? 14 : 5)) % 2 === 0;
    const grow = 1 + (urgent ? (1.2 - this.fuse) * 0.22 : 0);
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.scale(grow, grow);
    ctx.rotate(this.rot);
    circle(ctx, 0, 0, 17, urgent && blink ? '#d92b2b' : '#22242c');
    circle(ctx, -6, -6, 4.5, 'rgba(255,255,255,0.55)');
    ctx.fillStyle = '#555a66';
    ctx.fillRect(-5, -22, 10, 7);
    ctx.strokeStyle = '#c9a56a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.quadraticCurveTo(7, -31, 13, -26);
    ctx.stroke();
    drawStarShape(ctx, 13, -26, 5 + Math.sin(t * 30) * 2, t * 8, '#ffd23b', '#ff6a2a');
    // to små, nervøse øjne
    circle(ctx, -4, 3, 3.6, '#fff');
    circle(ctx, 6, 3, 3.6, '#fff');
    circle(ctx, -4, 4, 1.6, '#000');
    circle(ctx, 6, 4, 1.6, '#000');
    ctx.restore();
  }

  drawZone(ctx, t) {
    const left = Math.max(0, this.fuse / this.maxFuse);
    const speed = this.fuse < 1.2 ? 16 : 6;
    const pulse = 0.5 + Math.sin(t * speed) * 0.5;
    ctx.save();
    ctx.globalAlpha = 0.07 + (1 - left) * 0.08 + pulse * 0.04;
    circle(ctx, this.cx, this.cy, this.radius, '#ff3b2f');
    ctx.globalAlpha = 0.55 + pulse * 0.4;
    ctx.strokeStyle = '#ff3b2f';
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 12]);
    ctx.lineDashOffset = -t * 40;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    text(ctx, String(Math.max(1, Math.ceil(this.fuse))), this.cx, this.y - 28, 30, this.fuse < 1.2 ? '#ff6b6b' : '#fff');
  }
}

function drawBlast(ctx, b) {
  const p = Math.min(1, b.t / 0.28);
  const fade = Math.max(0, 1 - b.t / 0.55);
  ctx.save();
  ctx.globalAlpha = fade * 0.5;
  circle(ctx, b.x, b.y, b.r * p, '#ffb02e');
  ctx.globalAlpha = fade * 0.8;
  circle(ctx, b.x, b.y, b.r * p * 0.55, '#fff3b0');
  ctx.globalAlpha = fade;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 10 * fade + 1;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r * p, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawBolt(ctx, x, y, s, color = '#ffe234') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(4, -15); ctx.lineTo(-9, 2); ctx.lineTo(-1, 2);
  ctx.lineTo(-5, 15); ctx.lineTo(9, -3); ctx.lineTo(1, -3);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#a06a00';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}
