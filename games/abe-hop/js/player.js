// Aben! Styres med piletasterne.
const RUN = 270;
const JUMP = 800;
const SUPER_RUN = 400;
const SUPER_JUMP = 1200;

class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 26; this.h = 36;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.riding = null;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.airJumps = 0;
    this.feather = false;
    this.hammer = 0;
    this.star = 0;
    this.invuln = 0;
    this.energy = 0;
    this.energyMax = 1;
    this.soot = 0;
    this.runPhase = 0;
    this.flip = 0;
    this.squash = 0;
    this.swing = 0;
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dt, level) {
    if (this.riding) this.x += this.riding.dx;

    const dir = (Input.right() ? 1 : 0) - (Input.left() ? 1 : 0);
    if (dir) this.facing = dir;
    const charged = this.energy > 0;
    this.vx = approach(this.vx, dir * (charged ? SUPER_RUN : RUN), (this.onGround ? 2600 : 1700) * dt);

    // Tilgivende hop: man kan hoppe lidt efter man er gået ud over en kant,
    // og et tryk lige før man lander tæller også.
    this.coyote = this.onGround ? 0.1 : this.coyote - dt;
    this.jumpBuf = Input.jumpHit() ? 0.14 : this.jumpBuf - dt;

    if (this.jumpBuf > 0) {
      if (this.coyote > 0) {
        this.vy = charged ? -SUPER_JUMP : -JUMP;
        this.coyote = 0;
        this.jumpBuf = 0;
        this.squash = charged ? -0.5 : -0.3;
        if (charged) {
          Sound.superJump();
          Particles.burst(this.cx, this.y + this.h, 14, { color: ['#ffe234', '#fff', '#ff9d2e'], shape: 'star', size: 5, speed: 200, life: 0.5 });
        } else {
          Sound.jump();
          Particles.burst(this.cx, this.y + this.h, 6, { color: '#e8d8b0', size: 4, speed: 80, life: 0.4, up: 40 });
        }
      } else if (this.feather && this.airJumps < 1) {
        this.vy = -JUMP * 0.92;
        this.airJumps++;
        this.jumpBuf = 0;
        this.flip = Math.PI * 2;
        Sound.doubleJump();
        Particles.burst(this.cx, this.y + this.h, 10, { color: ['#ffffff', '#bfe9ff'], size: 4, speed: 120, life: 0.6, shape: 'star' });
      }
    }
    if (!Input.jumpHeld() && this.vy < -320) this.vy = -320;

    this.vy = Math.min(this.vy + GRAV * dt, 950);
    const wasGround = this.onGround;
    level.moveBody(this, dt);
    if (this.x < 0) this.x = 0;
    // Aben må ikke forsvinde op over skærmen
    if (this.y < 4) { this.y = 4; this.vy = Math.max(this.vy, 0); }
    if (this.onGround) {
      this.airJumps = 0;
      if (!wasGround && this.landVy > 300) {
        this.squash = 0.3;
        Particles.burst(this.cx, this.y + this.h, 5, { color: '#e8d8b0', size: 3, speed: 70, life: 0.35, up: 30 });
      }
    }

    this.hammer = Math.max(0, this.hammer - dt);
    this.star = Math.max(0, this.star - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.energy = Math.max(0, this.energy - dt);
    this.soot = Math.max(0, this.soot - dt);
    this.flip =Math.max(0, this.flip - dt * 13);
    this.squash = approach(this.squash, 0, dt * 2);
    this.runPhase += Math.abs(this.vx) * dt * 0.045;
    this.swing += dt * 13;

    if (this.star > 0 && Math.random() < 0.5) {
      Particles.add({ x: this.cx + (Math.random() - 0.5) * 30, y: this.cy + (Math.random() - 0.5) * 36, shape: 'star', size: 4,
        color: `hsl(${Math.random() * 360},100%,65%)`, life: 0.5, vy: -30 });
    }
    if (this.energy > 0 && Math.random() < 0.6) {
      Particles.add({ x: this.cx + (Math.random() - 0.5) * 34, y: this.cy + (Math.random() - 0.5) * 40, shape: 'star', size: 3.5,
        color: Math.random() < 0.5 ? '#ffe234' : '#fff', life: 0.3, vx: -this.vx * 0.15, vy: -20 });
    }
    if (this.soot > 0 && Math.random() < 0.25) {
      Particles.add({ x: this.cx, y: this.y, size: 5, color: 'rgba(60,60,60,0.6)', life: 0.6, vy: -50 });
    }
  }

  hammerHits(b) {
    if (this.hammer <= 0) return false;
    const dx = b.x + b.w / 2 - (this.cx + this.facing * 14);
    const dy = b.y + b.h / 2 - (this.cy - 6);
    return dx * dx + dy * dy < 58 * 58;
  }

  draw(ctx, t) {
    if (this.invuln > 0 && Math.floor(t * 18) % 2 === 0) return;
    drawMonkey(ctx, this.cx, this.y + this.h, {
      facing: this.facing,
      runPhase: Math.abs(this.vx) > 20 ? this.runPhase : 0,
      air: !this.onGround,
      flip: this.flip,
      hammer: this.hammer > 0,
      hammerBlink: this.hammer > 0 && this.hammer < 2,
      swing: this.swing,
      star: this.star > 0,
      energy: this.energy > 0 && (this.energy > 1 || Math.floor(t * 10) % 2 === 0),
      soot: this.soot > 0,
      squash: this.squash,
      t,
    });
  }
}

// Tegner aben. (x, y) er midt under fødderne.
function drawMonkey(ctx, x, y, o) {
  const t = o.t || 0;
  let fur = '#8a5a2b';
  let furDark = '#6b4220';
  let skin = '#f5cfa0';
  if (o.star) {
    fur = `hsl(${(t * 500) % 360},85%,55%)`;
    furDark = `hsl(${(t * 500 + 50) % 360},85%,40%)`;
  } else if (o.soot) {
    fur = '#2d2926';
    furDark = '#1c1917';
    skin = '#6a625a';
  } else if (o.energy) {
    fur = `hsl(${44 + Math.sin(t * 30) * 8},100%,52%)`;
    furDark = '#d98a00';
  }

  ctx.save();
  ctx.translate(x, y);
  if (o.energy) {
    ctx.globalAlpha = 0.25 + Math.sin(t * 24) * 0.08;
    circle(ctx, 0, -26, 34, '#fff36b');
    ctx.globalAlpha = 1;
  }
  const sq = o.squash || 0;
  ctx.scale(1 + sq * 0.5, 1 - sq * 0.5);
  ctx.scale(0.8 * (o.facing || 1), 0.8);
  if (o.flip) {
    ctx.translate(0, -26);
    ctx.rotate(o.flip);
    ctx.translate(0, 26);
  }

  const run = Math.sin(o.runPhase || 0);
  const dance = o.dance;
  const legA = o.air ? -0.7 : run * 0.75;
  const legB = o.air ? 0.5 : -run * 0.75;

  const limb = (x1, y1, ang, len, col, width, end) => {
    const x2 = x1 + Math.sin(ang) * len;
    const y2 = y1 + Math.cos(ang) * len;
    ctx.strokeStyle = col;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    circle(ctx, x2, y2, end, skin);
  };

  // hale
  const wag = Math.sin(t * 6) * 4;
  ctx.strokeStyle = furDark;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, -14);
  ctx.bezierCurveTo(-28, -10 + wag, -32, -36, -20, -38 + wag);
  ctx.bezierCurveTo(-12, -40, -11, -31, -17, -31);
  ctx.stroke();

  // bagerste ben og arm
  limb(-4, -14, legB, 13, furDark, 7, 4.5);
  const armBack = dance ? Math.PI - 0.5 + Math.sin(t * 10) * 0.4 : o.air ? -2.5 : -run * 0.8;
  limb(-2, -28, armBack, 14, furDark, 5.5, 4);

  // krop
  ellipse(ctx, 0, -22, 12, 13, fur);
  ellipse(ctx, 3, -20, 7.5, 9, skin);

  // forreste ben
  limb(4, -14, legA, 13, fur, 7, 4.5);

  // hoved
  circle(ctx, 3, -42, 14, fur);
  circle(ctx, -9, -46, 6, fur);
  circle(ctx, -9, -46, 3, skin);
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.moveTo(-2, -54); ctx.lineTo(4, -62); ctx.lineTo(8, -54);
  ctx.fill();
  ellipse(ctx, 9, -39, 10, 9, skin);
  circle(ctx, 6, -45, 4.2, '#fff');
  circle(ctx, 14, -45, 4.2, '#fff');
  circle(ctx, 7.8, -45, 2.2, '#1a1a1a');
  circle(ctx, 15.8, -45, 2.2, '#1a1a1a');
  circle(ctx, 8.5, -46, 0.8, '#fff');
  circle(ctx, 16.5, -46, 0.8, '#fff');
  circle(ctx, 14, -40, 1.2, '#6b4220');
  circle(ctx, 17, -40, 1.2, '#6b4220');
  ctx.strokeStyle = '#6b2a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(11, -37, 5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // røde kinder
  circle(ctx, 3, -37, 2.5, 'rgba(255,110,110,0.5)');

  // forreste arm (med hammer?)
  if (o.hammer) {
    const ang = -0.6 + Math.sin(o.swing) * 1.9;
    ctx.save();
    ctx.translate(2, -28);
    ctx.rotate(-ang);
    ctx.strokeStyle = fur;
    ctx.lineWidth = 5.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 14); ctx.stroke();
    ctx.strokeStyle = '#a0682f';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, 36); ctx.stroke();
    const blink = o.hammerBlink && Math.floor(t * 10) % 2 === 0;
    ctx.fillStyle = blink ? '#fff' : '#8d96a8';
    roundRect(ctx, -11, 32, 22, 14, 3);
    ctx.fill();
    ctx.strokeStyle = '#3a3f4a';
    ctx.lineWidth = 2;
    ctx.stroke();
    circle(ctx, 0, 14, 4, skin);
    ctx.restore();
  } else {
    const armFront = dance ? Math.PI + 0.5 - Math.sin(t * 10) * 0.4 : o.air ? -2.7 : run * 0.8;
    limb(2, -28, armFront, 14, fur, 5.5, 4);
  }

  ctx.restore();
}
