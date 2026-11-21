// Fjenderne: små tegneseriefly med store øjne, dykkere, bombefly, kanonbåde og balloner.
// Når et fly bliver ramt, spinner det væk i en sky af røg – og piloten hopper ud i faldskærm.
const ENEMY_LOOKS = {
  purple: { body: '#8e5cf7', wing: '#c9b3ff', stripe: '#5a2fc2', nose: '#ffcf56' },
  green: { body: '#43aa5b', wing: '#b4ec9a', stripe: '#24733a', nose: '#ff8a65' },
  orange: { body: '#f4845f', wing: '#ffd6a5', stripe: '#c8553d', nose: '#8ecae6' },
  carrier: { body: '#ff2e63', wing: '#ffd1dc', stripe: '#c9184a', nose: '#ffd166' },
};
const BALLOON_COLORS = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#ff8fd8'];

const ENEMY_TYPES = {
  zip: { r: 24, hp: 1, score: 100, scale: 0.62 },
  diver: { r: 26, hp: 3, score: 150, scale: 0.72 },
  bomber: { r: 62, hp: 18, score: 800, scale: 1.5 },
  boat: { r: 34, hp: 6, score: 400, ground: true },
  balloon: { r: 24, hp: 1, score: 50, harmless: true },
};

class Enemy {
  constructor(type, x, y, o = {}) {
    const def = ENEMY_TYPES[type];
    this.type = type;
    this.r = def.r;
    this.score = def.score;
    this.scale = def.scale || 1;
    this.ground = !!def.ground;
    this.harmless = !!def.harmless;
    this.hp = def.hp * (type === 'zip' || type === 'balloon' ? 1 : Game.hpScale);
    this.x = x; this.y = y;
    this.baseX = x;
    this.vx = o.vx || 0;
    this.vy = o.vy !== undefined ? o.vy : 160;
    this.turn = o.turn || 0;
    this.turnT = o.turnT || 0;
    this.sineAmp = o.sineAmp || 0;
    this.sineFreq = o.sineFreq || 2;
    this.delay = o.delay || 0;
    this.group = o.group || null;
    this.carrier = !!o.carrier;
    this.look = this.carrier ? ENEMY_LOOKS.carrier : (o.look || ENEMY_LOOKS.purple);
    this.shooter = o.shooter !== undefined ? o.shooter : Math.random() < Game.diff.shooterChance;
    this.shots = o.shots !== undefined ? o.shots : (Game.diff.level >= 3 ? 2 : 1);
    this.shootCD = rand(0.5, 1.4);
    this.stopY = o.stopY || 200;
    this.phase = 'in';
    this.phaseT = 0;
    this.t = 0;
    this.flash = 0;
    this.falling = 0;
    this.dead = false;
    this.escaped = false;
    this.prop = rand(0, TAU);
    this.angle = headingOf(this.vx, this.vy);
    this.spin = 0;
    this.turretA = Math.PI / 2;
    this.colors = type === 'balloon' ? [pick(BALLOON_COLORS), pick(BALLOON_COLORS), pick(BALLOON_COLORS)] : null;
  }

  get active() { return !this.dead && !this.falling && this.delay <= 0; }
  get visible() { return !this.dead && this.delay <= 0; }

  update(dt) {
    if (this.dead) return;
    if (this.delay > 0) { this.delay -= dt; return; }
    this.t += dt;
    this.prop += dt * 40;
    this.flash -= dt;

    if (this.falling > 0) {
      // spinner væk og bliver mindre, med en hale af røg
      this.falling -= dt;
      this.spin += dt * 11;
      this.x += this.vx * 0.4 * dt;
      this.y += (this.vy * 0.4 + 40) * dt;
      if (Math.random() < 0.6) Particles.smoke(this.x, this.y, 1, 10 * this.scale, '#8d99ae');
      if (this.falling <= 0) {
        this.dead = true;
        Particles.smoke(this.x, this.y, 8, 18 * this.scale, '#ffffff');
        Particles.splash(this.x, this.y);
        Sound.puff();
      }
      return;
    }

    const px = this.x;
    const py = this.y;
    const player = Game.nearestPlayer(this.x, this.y);

    if (this.type === 'boat') {
      this.y += Background.speed * dt;
      this.x += this.vx * dt;
      if (player) this.turretA = Math.atan2(player.y - this.y, player.x - this.x);
    } else if (this.type === 'diver') {
      this.updateDiver(dt, player);
    } else {
      if (this.turnT > 0) {
        const a = this.turn * dt;
        const c = Math.cos(a), s = Math.sin(a);
        const vx = this.vx * c - this.vy * s;
        this.vy = this.vx * s + this.vy * c;
        this.vx = vx;
        this.turnT -= dt;
      }
      if (this.sineAmp) {
        this.baseX += this.vx * dt;
        this.x = this.baseX + Math.sin(this.t * this.sineFreq) * this.sineAmp;
      } else {
        this.x += this.vx * dt;
      }
      this.y += this.vy * dt;
      if (this.type === 'balloon') this.x += Math.sin(this.t * 1.5) * 20 * dt;
    }
    if (this.type !== 'boat' && this.type !== 'balloon' && dt > 0) {
      const want = headingOf((this.x - px) / dt, (this.y - py) / dt);
      let d = want - this.angle;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      this.angle += d * Math.min(1, dt * 10);
    }

    this.updateShooting(dt, player);

    const gone = this.y > H + 90 || this.x < -160 || this.x > W + 160 || (this.y < -260 && this.t > 3);
    if (gone) { this.dead = true; this.escaped = true; }
  }

  updateDiver(dt, player) {
    this.phaseT += dt;
    if (this.phase === 'in') {
      this.y += this.vy * dt;
      if (this.y >= this.stopY) { this.phase = 'wait'; this.phaseT = 0; }
    } else if (this.phase === 'wait') {
      this.y += 10 * dt;
      // vrikker lidt, så man kan se den gør sig klar
      this.x += Math.sin(this.phaseT * 30) * 40 * dt;
      if (this.phaseT > 0.9) {
        this.phase = 'dive';
        const tx = player ? player.x : W / 2, ty = player ? player.y : H;
        const a = Math.atan2(ty - this.y, tx - this.x);
        const sp = 330 + Game.diff.level * 15;
        this.vx = Math.cos(a) * sp;
        this.vy = Math.max(120, Math.sin(a) * sp);
        Sound.boing();
      }
    } else {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
  }

  updateShooting(dt, player) {
    if (!player || this.harmless || this.y < 30 || this.y > H * 0.62) return;
    this.shootCD -= dt * Game.diff.fireMul;
    if (this.shootCD > 0) return;
    const sp = Game.diff.bulletSpeed;
    if (this.type === 'bomber') {
      for (const s of [-0.25, 0, 0.25]) Bullets.aimed(this.x, this.y + 40, player.x, player.y, sp * 0.9, s);
      this.shootCD = 2.4;
      Sound.enemyShot();
    } else if (this.type === 'boat') {
      Bullets.aimed(this.x + Math.cos(this.turretA) * 26, this.y + Math.sin(this.turretA) * 26, player.x, player.y, sp);
      this.shootCD = 2.6;
      Sound.enemyShot();
    } else if (this.shooter && this.shots > 0) {
      Bullets.aimed(this.x, this.y + 20, player.x, player.y, sp);
      this.shots--;
      this.shootCD = 1.6;
      Sound.enemyShot();
    }
  }

  hit(dmg) {
    if (!this.active) return false;
    this.hp -= dmg;
    this.flash = 0.07;
    if (this.hp <= 0) this.die();
    else Sound.tink();
    return true;
  }

  die() {
    Game.addScore(this.score, this.x, this.y);
    Game.onEnemyKilled(this);
    if (this.type === 'balloon') {
      this.dead = true;
      Particles.confetti(this.x, this.y, 28);
      Sound.pop();
      Pickups.coins(this.x, this.y, 2);
      return;
    }
    if (this.type === 'boat') {
      this.dead = true;
      Particles.explosion(this.x, this.y, 1.2);
      Particles.splash(this.x, this.y);
      Particles.text(this.x, this.y - 30, 'Plask!', '#bde0fe', 26);
      Sound.puff();
      Pickups.coins(this.x, this.y, 3);
      if (this.carrier) Pickups.dropPowerUp(this.x, this.y);
      return;
    }
    const big = this.type === 'bomber';
    this.falling = big ? 1.2 : 0.75;
    Particles.explosion(this.x, this.y, big ? 1.8 : 1);
    Sound.puff();
    if (big) {
      Game.shake(10);
      for (let i = 0; i < 3; i++) Particles.parachute(this.x + (i - 1) * 50, this.y + rand(-20, 20), this.look.body);
      Pickups.coins(this.x, this.y, 5);
      Pickups.dropPowerUp(this.x, this.y);
    } else {
      if (this.type === 'diver' || Math.random() < 0.75) Particles.parachute(this.x, this.y, this.look.body);
      Pickups.coins(this.x, this.y, 1);
      if (this.carrier) Pickups.dropPowerUp(this.x, this.y);
    }
  }

  drawShadow() {
    if (!this.visible || this.ground) return;
    if (this.type === 'balloon') {
      Draw.ellipse(this.x + 18, this.y + 30, 26, 18, 'rgba(0,20,60,0.15)');
      return;
    }
    const k = this.falling > 0 ? 0.6 : 1;
    drawPlaneShadow(this.x, this.y, this.angle + this.spin, this.scale * k);
  }

  draw() {
    if (!this.visible) return;
    if (this.type === 'boat') return this.drawBoat();
    if (this.type === 'balloon') return this.drawBalloon();
    const p = Game.nearestPlayer(this.x, this.y);
    let eyes = { x: 0, y: -1 };
    if (p) {
      // øjnene kigger mod spilleren (i flyets eget koordinatsystem)
      const a = Math.atan2(p.y - this.y, p.x - this.x) - this.angle;
      eyes = { x: Math.cos(a), y: Math.sin(a) };
    }
    const shrink = this.falling > 0 ? 0.6 + 0.4 * (this.falling / (this.type === 'bomber' ? 1.2 : 0.75)) : 1;
    drawPlane({ x: this.x, y: this.y, angle: this.angle + this.spin, scale: this.scale * shrink, look: this.look,
      prop: this.prop, eyes: this.falling > 0 ? null : eyes, flash: this.flash, twin: this.type === 'bomber' });
    if (this.carrier && this.falling <= 0) {
      ctx.globalAlpha = 0.4 + Math.sin(Game.t * 10) * 0.3;
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 8, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (this.type === 'diver' && this.phase === 'wait') Draw.text('!', this.x, this.y - 40, 28, '#ffd166');
  }

  drawBoat() {
    ctx.save();
    ctx.translate(this.x, this.y);
    // kølvand bag båden
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-14, -30); ctx.lineTo(-30, -80); ctx.moveTo(14, -30); ctx.lineTo(30, -80); ctx.stroke();
    // skrog (stævnen peger nedad mod spillerne)
    ctx.beginPath();
    ctx.moveTo(0, 46);
    ctx.quadraticCurveTo(24, 22, 22, -20);
    ctx.lineTo(18, -36); ctx.lineTo(-18, -36); ctx.lineTo(-22, -20);
    ctx.quadraticCurveTo(-24, 22, 0, 46);
    ctx.closePath();
    ctx.fillStyle = this.flash > 0 ? '#fff' : (this.carrier ? '#ff6b8b' : '#7d8597');
    ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();
    Draw.roundRect(-13, -28, 26, 50, 8);
    ctx.fillStyle = '#ffd166'; ctx.fill(); ctx.stroke();
    // kanontårn der drejer efter spilleren
    ctx.rotate(this.turretA);
    ctx.fillStyle = '#4a4e69';
    ctx.fillRect(0, -4, 28, 8);
    ctx.rotate(-this.turretA);
    Draw.circle(0, 0, 11, '#9a8c98'); ctx.stroke();
    ctx.restore();
  }

  drawBalloon() {
    const offs = [[-14, 6], [14, 6], [0, -12]];
    ctx.strokeStyle = 'rgba(18,48,86,0.6)'; ctx.lineWidth = 1.5;
    for (const [dx, dy] of offs) {
      ctx.beginPath(); ctx.moveTo(this.x, this.y + 26); ctx.lineTo(this.x + dx, this.y + dy); ctx.stroke();
    }
    offs.forEach(([dx, dy], i) => {
      Draw.circle(this.x + dx, this.y + dy, 15, this.flash > 0 ? '#fff' : this.colors[i]);
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.x + dx, this.y + dy, 15, 0, TAU); ctx.stroke();
      Draw.ellipse(this.x + dx - 5, this.y + dy - 5, 4, 6, 'rgba(255,255,255,0.7)', -0.5);
    });
  }
}
