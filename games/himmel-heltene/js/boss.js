// Brumle-Zeppelineren: et stort, gnavent luftskib med kanontårne. Kommer i slutningen af hver bane.
const BOSS_RX = 220;
const BOSS_RY = 82;
const BOSS_WORDS = ['Brumm!', 'Hmpf!', 'Nu skal I bare se!', 'Mit luftskib er det flotteste!', 'Brumme-brum!', 'Hvem har lov at flyve her?'];
const BOSS_OUCH = ['Av!', 'Av av!', 'Min kanon!', 'Det kilder!', 'Uhh!'];

class Boss {
  constructor(level, loop) {
    this.level = level;
    this.x = W / 2;
    this.y = -160;
    this.baseY = 190;
    this.hpMax = (160 + level * 50) * Game.hpScale * (1 + loop * 0.4);
    this.hp = this.hpMax;
    this.phase = 'enter';
    this.t = 0;
    this.flash = 0;
    this.prop = 0;
    this.dead = false;
    this.dyingT = 0;
    this.boomT = 0;
    this.ringCD = 3;
    this.spawnCD = 7;
    this.talk = { str: 'Brumm! Hvem dér?', t: 2.5 };
    this.talkCD = 6;
    const n = 2 + Math.min(level, 3);
    this.turrets = [];
    for (let i = 0; i < n; i++) {
      const dx = n === 1 ? 0 : lerp(-150, 150, i / (n - 1));
      this.turrets.push({ dx, dy: i % 2 ? -30 : 34, hp: 9 * Game.hpScale, alive: true, cd: rand(1, 2.5), a: Math.PI / 2, flash: 0 });
    }
    Sound.alarm();
  }

  say(str, t = 1.8) { this.talk = { str, t }; }

  inside(x, y, pad = 0) {
    const dx = (x - this.x) / (BOSS_RX + pad), dy = (y - this.y) / (BOSS_RY + pad);
    return dx * dx + dy * dy < 1;
  }

  update(dt) {
    this.t += dt;
    this.prop += dt * 30;
    this.flash -= dt;
    if (this.talk) { this.talk.t -= dt; if (this.talk.t <= 0) this.talk = null; }

    if (this.phase === 'enter') {
      this.y += 90 * dt;
      if (this.y >= this.baseY) { this.phase = 'fight'; this.t = 0; }
      return;
    }
    if (this.phase === 'dying') {
      this.dyingT += dt;
      this.boomT -= dt;
      this.y += 20 * dt;
      if (this.boomT <= 0) {
        Particles.explosion(this.x + rand(-BOSS_RX, BOSS_RX) * 0.8, this.y + rand(-BOSS_RY, BOSS_RY) * 0.7, 1.4);
        Sound.puff();
        Game.shake(6);
        this.boomT = 0.13;
      }
      if (this.dyingT > 2.2) this.finish();
      return;
    }

    // Svæver frem og tilbage
    this.x = W / 2 + Math.sin(this.t * 0.45) * 130;
    this.y = this.baseY + Math.sin(this.t * 0.8) * 22;
    const fm = Game.diff.fireMul;
    const sp = Game.diff.bulletSpeed;

    for (const tr of this.turrets) {
      if (!tr.alive) continue;
      tr.flash -= dt;
      const tx = this.x + tr.dx, ty = this.y + tr.dy;
      const p = Game.nearestPlayer(tx, ty);
      if (!p) continue;
      tr.a = Math.atan2(p.y - ty, p.x - tx);
      tr.cd -= dt * fm;
      if (tr.cd <= 0) {
        Bullets.aimed(tx + Math.cos(tr.a) * 22, ty + Math.sin(tr.a) * 22, p.x, p.y, sp);
        tr.cd = rand(2.2, 3.4);
        Sound.enemyShot();
      }
    }

    const angry = this.turrets.every((t) => !t.alive);
    if (this.level >= 1 || angry) {
      this.ringCD -= dt * fm;
      if (this.ringCD <= 0) {
        const n = 8 + this.level * 2;
        Bullets.ring(this.x, this.y + 30, n, sp * 0.8, this.t);
        this.ringCD = angry ? 2.6 : 4.8;
        Sound.grumble();
      }
    }

    this.spawnCD -= dt;
    if (this.spawnCD <= 0) {
      for (const side of [-1, 1]) {
        Game.spawn(new Enemy('zip', this.x + side * BOSS_RX * 0.8, this.y, { vx: side * 60, vy: 190, look: ENEMY_LOOKS.green, shooter: false }));
      }
      this.spawnCD = 9;
    }

    this.talkCD -= dt;
    if (this.talkCD <= 0) { this.say(pick(BOSS_WORDS)); Sound.grumble(); this.talkCD = rand(5, 8); }
  }

  // Et skud rammer bossen? Kanontårne først, så selve ballonen.
  hit(dmg, x, y) {
    if (this.phase !== 'fight') return this.phase === 'enter' && this.inside(x, y);
    for (const tr of this.turrets) {
      if (!tr.alive) continue;
      if (dist(x, y, this.x + tr.dx, this.y + tr.dy) < 24) {
        tr.hp -= dmg;
        tr.flash = 0.07;
        if (tr.hp <= 0) {
          tr.alive = false;
          Particles.explosion(this.x + tr.dx, this.y + tr.dy, 1.2);
          Sound.puff();
          Game.addScore(300, this.x + tr.dx, this.y + tr.dy);
          this.say(pick(BOSS_OUCH));
        } else Sound.tink();
        return true;
      }
    }
    if (this.inside(x, y)) {
      this.damage(this.turrets.some((t) => t.alive) ? dmg * 0.5 : dmg);
      return true;
    }
    return false;
  }

  damage(dmg) {
    if (this.phase !== 'fight') return;
    this.hp -= dmg;
    this.flash = 0.06;
    if (Math.random() < 0.15) Sound.tink();
    if (this.hp <= 0) {
      this.hp = 0;
      this.phase = 'dying';
      this.say('Neeej! Mit flotte luftskib!', 2.5);
      Sound.boom();
    }
  }

  finish() {
    this.dead = true;
    Particles.explosion(this.x, this.y, 3);
    Particles.confetti(this.x, this.y, 90);
    Particles.text(this.x, this.y, 'POF!', '#ffd166', 80);
    for (let i = 0; i < 4; i++) Particles.parachute(this.x + (i - 1.5) * 70, this.y + rand(-30, 30), '#b8a9e0', i === 0 ? 'Jeg giver op!' : null);
    Pickups.coins(this.x, this.y, 12);
    Pickups.spawn('heart', this.x - 40, this.y);
    Pickups.spawn('weapon', this.x + 40, this.y);
    Sound.boom();
    Game.shake(22);
    Game.onBossDefeated();
  }

  touches(x, y) { return this.phase === 'fight' && this.inside(x, y, -10); }

  drawShadow() {
    Draw.ellipse(this.x + 40, this.y + 60, BOSS_RX * 0.9, BOSS_RY * 0.8, 'rgba(0,20,60,0.18)');
  }

  draw() {
    const x = this.x, y = this.y + (this.phase === 'dying' ? Math.sin(this.dyingT * 40) * 4 : 0);
    const white = this.flash > 0;
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = OUTLINE;
    // halefinner i venstre ende og propel
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x - BOSS_RX + 40, y + s * 20);
      ctx.lineTo(x - BOSS_RX - 30, y + s * 62);
      ctx.lineTo(x - BOSS_RX - 10, y + s * 14);
      ctx.closePath();
      ctx.fillStyle = '#e76f51'; ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 0.4;
    Draw.ellipse(x - BOSS_RX - 18, y, 5, 34, '#eef6ff');
    ctx.globalAlpha = 1;
    const l = 34 * Math.cos(this.prop);
    ctx.beginPath(); ctx.moveTo(x - BOSS_RX - 18, y - l); ctx.lineTo(x - BOSS_RX - 18, y + l); ctx.lineWidth = 5; ctx.stroke();
    ctx.lineWidth = 3;

    // selve ballonen
    const g = ctx.createLinearGradient(0, y - BOSS_RY, 0, y + BOSS_RY);
    g.addColorStop(0, white ? '#fff' : '#d7ccf5');
    g.addColorStop(1, white ? '#fff' : '#8f7fc8');
    ctx.beginPath(); ctx.ellipse(x, y, BOSS_RX, BOSS_RY, 0, 0, TAU);
    ctx.fillStyle = g; ctx.fill(); ctx.stroke();
    // syninger
    ctx.strokeStyle = 'rgba(18,48,86,0.25)'; ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.ellipse(x + i * 55, y, 14, BOSS_RY * Math.sqrt(1 - Math.pow((i * 55) / BOSS_RX, 2)), 0, 0, TAU); ctx.stroke();
    }
    // stribe
    ctx.fillStyle = 'rgba(255,209,102,0.8)';
    ctx.fillRect(x - BOSS_RX * 0.92, y - 6, BOSS_RX * 1.84, 12);

    // ansigt i højre ende: gnavne øjenbryn og en brummende mund
    const fx = x + BOSS_RX * 0.62;
    const p = Game.nearestPlayer(fx, y);
    const look = p ? Math.atan2(p.y - y, p.x - fx) : Math.PI / 2;
    const dizzy = this.phase === 'dying';
    for (const dy of [-26, 26]) {
      Draw.circle(fx, y + dy, 17, '#fff');
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(fx, y + dy, 17, 0, TAU); ctx.stroke();
      if (dizzy) {
        ctx.beginPath();
        for (let a = 0; a < 12; a += 0.3) {
          const rr = a * 1.1;
          ctx.lineTo(fx + Math.cos(a + this.dyingT * 8) * rr, y + dy + Math.sin(a + this.dyingT * 8) * rr);
        }
        ctx.stroke();
      } else {
        Draw.circle(fx + Math.cos(look) * 7, y + dy + Math.sin(look) * 7, 7, OUTLINE);
      }
    }
    if (!dizzy) {
      ctx.lineWidth = 6; ctx.lineCap = 'round';
      const angry = this.turrets.every((t) => !t.alive) ? 10 : 4;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(fx - 22, y + s * (26 + 22));
        ctx.lineTo(fx + 8, y + s * (26 + 22 - angry));
        ctx.stroke();
      }
    }
    // mund
    ctx.lineWidth = 4;
    ctx.beginPath();
    const m = Math.sin(this.t * 12) * 4;
    ctx.ellipse(fx + 42, y, 6 + Math.abs(m), 16, 0, 0, TAU);
    ctx.fillStyle = '#5a189a'; ctx.fill(); ctx.stroke();

    // kanontårne
    for (const tr of this.turrets) {
      const tx = x + tr.dx, ty = y + tr.dy;
      if (!tr.alive) {
        Draw.circle(tx, ty, 14, '#4a4e69');
        continue;
      }
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(tr.a);
      ctx.fillStyle = '#4a4e69'; ctx.fillRect(0, -5, 26, 10);
      ctx.restore();
      Draw.circle(tx, ty, 17, tr.flash > 0 ? '#fff' : '#ff9f1c');
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(tx, ty, 17, 0, TAU); ctx.stroke();
      Draw.circle(tx, ty, 6, OUTLINE);
    }
    ctx.restore();

    if (this.talk) Draw.bubble(this.talk.str, x, y - BOSS_RY - 8, 20);
  }
}
