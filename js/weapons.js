// Skud, missiler, miner, skyer (blæk og prut) og reparations-pakker.

class Projectile {
  constructor(o) {
    this.r = 4;
    this.dmg = 1;
    this.life = 1;
    this.grav = 0;       // hvor meget planetens tyngdekraft trækker i skuddet
    this.homing = 0;     // drejehastighed for målsøgende missiler
    this.hp = 0;         // > 0 betyder at skuddet kan skydes ned
    this.arm = 0;        // miner skal "lades" før de virker
    this.kind = 'laser';
    this.color = '#fff';
    this.alive = true;
    this.t = 0;
    Object.assign(this, o);
    this.angle = this.angle ?? Math.atan2(this.vy, this.vx);
  }

  update(dt, G) {
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) { this.expire(G); return; }
    if (this.grav && G.planet) G.planet.pull(this, dt, this.grav);

    if (this.homing) {
      const tgt = G.nearestTarget(this, this.team, 1000);
      if (tgt) {
        const d = V.delta(this, tgt);
        const want = Math.atan2(d.y, d.x);
        this.angle += clamp(angleDiff(this.angle, want), -this.homing * dt, this.homing * dt);
      }
      const sp = Math.min(this.maxSpeed || 520, Math.hypot(this.vx, this.vy) + 400 * dt);
      this.vx = Math.cos(this.angle) * sp;
      this.vy = Math.sin(this.angle) * sp;
      if (Math.random() < 0.6) {
        Particles.add({ x: this.x - Math.cos(this.angle) * 8, y: this.y - Math.sin(this.angle) * 8, life: 0.4, size: 3, grow: 6, color: 'rgba(200,200,220,0.5)' });
      }
    }

    if (this.kind === 'mine') {
      const k = Math.pow(0.985, dt * 60);
      this.vx *= k; this.vy *= k;
      if (this.t > this.arm) {
        // Miner kryber langsomt hen mod fjender i nærheden
        const tgt = G.nearestTarget(this, this.team, 290);
        if (tgt) {
          const d = V.delta(this, tgt);
          const l = Math.hypot(d.x, d.y) || 1;
          this.vx += (d.x / l) * 300 * dt;
          this.vy += (d.y / l) * 300 * dt;
        }
      }
    }

    // Blæk bremser fjendens skud
    const ink = G.inCloud(this, this.team, 'ink');
    if (ink) {
      const k = Math.pow(0.9, dt * 60);
      this.vx *= k; this.vy *= k;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    V.wrap(this);

    if (G.planet && V.dist(this, G.planet) < G.planet.r + this.r) {
      Fx.sparks(this.x, this.y, 6, this.color, 160);
      this.alive = false;
      return;
    }

    const armed = this.kind !== 'mine' || this.t > this.arm;
    if (!armed) return;
    for (const h of G.hittables()) {
      if (h.team === this.team || !h.alive) continue;
      if (V.dist(this, h) < this.r + h.r) {
        this.hitThing(h, G);
        return;
      }
    }
  }

  hitThing(h, G) {
    this.alive = false;
    h.damage(this.dmg, G, this.owner, this);
    if (this.kind === 'mine' || this.kind === 'missile' || this.kind === 'ball') {
      Fx.explosion(this.x, this.y, this.kind === 'mine' ? 0.6 : 0.4);
      Sound.smallBoom();
      if (this.kind === 'mine') Fx.text(this.x, this.y - 20, 'BUM!', '#ff9ec4', 26);
    } else {
      Fx.sparks(this.x, this.y, 8, this.color);
    }
  }

  // Skud der bliver skudt ned (miner og missiler)
  shotDown() {
    this.alive = false;
    Fx.explosion(this.x, this.y, 0.3);
    Sound.smallBoom();
  }

  expire() {
    this.alive = false;
    if (this.kind === 'mine' || this.kind === 'missile') Fx.explosion(this.x, this.y, 0.25);
  }

  draw(ctx, t) {
    Camera.drawAt(ctx, this, 30, (c) => {
      const k = this.kind;
      if (k === 'laser') {
        const l = Math.hypot(this.vx, this.vy) * 0.022;
        c.rotate(Math.atan2(this.vy, this.vx));
        c.strokeStyle = this.color;
        c.lineCap = 'round';
        c.lineWidth = this.r * 1.6;
        c.globalAlpha = 0.35;
        c.beginPath(); c.moveTo(-l, 0); c.lineTo(0, 0); c.stroke();
        c.globalAlpha = 1;
        c.lineWidth = this.r * 0.8;
        c.strokeStyle = '#fff';
        c.beginPath(); c.moveTo(-l * 0.7, 0); c.lineTo(0, 0); c.stroke();
      } else if (k === 'ball') {
        circle(c, 0, 0, this.r, '#2a2a33', '#000', 2);
        circle(c, -this.r * 0.35, -this.r * 0.35, this.r * 0.3, 'rgba(255,255,255,0.6)');
        c.globalAlpha = 0.5;
        circle(c, 0, 0, this.r + 3, null, '#ffb84a', 2);
      } else if (k === 'bubble') {
        circle(c, 0, 0, this.r, 'rgba(230,120,255,0.35)', '#f6b2ff', 2);
        circle(c, -this.r * 0.35, -this.r * 0.35, this.r * 0.25, 'rgba(255,255,255,0.8)');
      } else if (k === 'bolt') {
        c.rotate(this.t * 14);
        poly(c, [0, -this.r * 1.6, this.r * 0.5, 0, 0, this.r * 1.6, -this.r * 0.5, 0], this.color, '#fff', 1);
        poly(c, [-this.r * 1.6, 0, 0, this.r * 0.5, this.r * 1.6, 0, 0, -this.r * 0.5], this.color, '#fff', 1);
      } else if (k === 'missile') {
        c.rotate(this.angle);
        poly(c, [10, 0, 2, -4, -8, -4, -12, -8, -10, 0, -12, 8, -8, 4, 2, 4], '#c8d2dc', '#333', 1.5);
        circle(c, 4, -1, 1.2, '#000');
        poly(c, [-10, 0, -18 - Math.random() * 6, -3, -18 - Math.random() * 6, 3], '#ffb030');
      } else if (k === 'mine') {
        const armed = this.t > this.arm;
        c.rotate(this.t * 1.5);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          poly(c, [Math.cos(a - 0.2) * 8, Math.sin(a - 0.2) * 8, Math.cos(a) * 15, Math.sin(a) * 15, Math.cos(a + 0.2) * 8, Math.sin(a + 0.2) * 8], '#7a2a4a');
        }
        circle(c, 0, 0, 9, this.color, '#5a1030', 2);
        const blink = armed && Math.floor(this.t * 4) % 2 === 0;
        circle(c, 0, 0, 3.5, blink ? '#ff2040' : '#661020');
      } else {
        // almindelige fjende-skud
        circle(c, 0, 0, this.r + 3, 'rgba(255,60,60,0.3)');
        circle(c, 0, 0, this.r, this.color);
        circle(c, 0, 0, this.r * 0.5, '#fff');
      }
    });
  }
}

// Affyr et skud fra et skib. o kan indeholde:
// speed, spread (vinkel), fwd (hvor langt foran), side (til siden), inherit (hvor meget af skibets fart skuddet får med)
function shoot(ship, G, o) {
  const a = ship.angle + (o.spread || 0);
  const ca = Math.cos(ship.angle), sa = Math.sin(ship.angle);
  const fwd = o.fwd ?? ship.r + 4;
  const side = o.side || 0;
  const inherit = o.inherit ?? 1;
  const p = new Projectile(Object.assign({
    x: wrapCoord(ship.x + ca * fwd - sa * side, WORLD.w),
    y: wrapCoord(ship.y + sa * fwd + ca * side, WORLD.h),
    vx: ship.vx * inherit + Math.cos(a) * o.speed,
    vy: ship.vy * inherit + Math.sin(a) * o.speed,
    angle: a,
    team: ship.team,
    owner: ship,
  }, o));
  G.projectiles.push(p);
  return p;
}

// Skyer: blæk (skjuler og bremser) og prut (gør skade og skubber)
class Cloud {
  constructor(o) {
    this.vx = 0; this.vy = 0;
    this.alive = true;
    this.hitSet = new Set();
    Object.assign(this, o);
    this.max = this.life;
    this.blobs = [];
    for (let i = 0; i < 14; i++) this.blobs.push({ a: Math.random() * TAU, d: Math.random() * 0.7, s: rand(0.35, 0.6), w: rand(1, 3) });
  }

  get cr() {
    // Skyen vokser hurtigt op og svinder ind til sidst
    const age = this.max - this.life;
    return this.r * Math.min(1, age * 4) * Math.min(1, this.life * 1.5 + 0.3);
  }

  update(dt, G) {
    this.life -= dt;
    if (this.life <= 0) { this.alive = false; return; }
    const k = Math.pow(0.97, dt * 60);
    this.vx *= k; this.vy *= k;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    V.wrap(this);
    if (this.kind === 'fart') {
      for (const h of G.hittables()) {
        if (h.team === this.team || !h.alive || this.hitSet.has(h)) continue;
        const d = V.delta(this, h);
        const l = Math.hypot(d.x, d.y);
        if (l < this.cr + h.r) {
          this.hitSet.add(h);
          h.damage(this.dmg, G, this.owner, this);
          if (h.vx !== undefined && !h.fixed) {
            h.vx += (d.x / (l || 1)) * 260;
            h.vy += (d.y / (l || 1)) * 260;
          }
          Fx.text(h.x, h.y - 30, 'ADR!', '#b6ff6a', 26);
        }
      }
    }
  }

  contains(o) { return V.dist(this, o) < this.cr; }

  draw(ctx, t) {
    const ink = this.kind === 'ink';
    Camera.drawAt(ctx, this, this.r * 1.3, (c) => {
      const R = this.cr;
      c.globalAlpha = Math.min(1, this.life) * (ink ? 0.82 : 0.6);
      for (const b of this.blobs) {
        const a = b.a + t * 0.3 * b.w;
        const x = Math.cos(a) * b.d * R, y = Math.sin(a) * b.d * R;
        circle(c, x, y, R * b.s, ink ? '#1a0d2e' : '#9be05a');
      }
      if (ink) {
        c.globalAlpha *= 0.5;
        for (const b of this.blobs.slice(0, 5)) circle(c, Math.cos(b.a) * b.d * R * 0.6, Math.sin(b.a) * b.d * R * 0.6, R * b.s * 0.5, '#3a1f5e');
      }
      c.globalAlpha = 1;
    });
  }
}

// Reparations-pakke som fjender kan tabe i bølge-spillet
class Pickup {
  constructor(x, y, kind = 'repair') {
    this.x = x; this.y = y;
    this.vx = rand(-40, 40); this.vy = rand(-40, 40);
    this.r = 18;
    this.kind = kind;
    this.life = 15;
    this.alive = true;
    this.t = 0;
  }

  update(dt, G) {
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) { this.alive = false; return; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    V.wrap(this);
    for (const s of G.ships) {
      if (!s.alive || s.player === undefined || s.player === null) continue;
      if (V.dist(this, s) < this.r + s.r) {
        this.alive = false;
        if (this.kind === 'repair') {
          s.hp = Math.min(s.maxHp, s.hp + Math.ceil(s.maxHp * 0.4));
          Fx.text(s.x, s.y - 40, 'REPARERET!', '#7dff9a', 26);
        } else {
          s.energy = s.def.energy;
          Fx.text(s.x, s.y - 40, 'FULD ENERGI!', '#7ad8ff', 26);
        }
        Fx.ring(s.x, s.y, 10, 70, '#9fffb0', 0.5, 5);
        Sound.pickup();
        return;
      }
    }
  }

  draw(ctx, t) {
    if (this.life < 3 && Math.floor(this.t * 8) % 2 === 0) return;
    Camera.drawAt(ctx, this, 30, (c) => {
      c.rotate(Math.sin(this.t * 2) * 0.3);
      const s = 1 + Math.sin(this.t * 5) * 0.08;
      c.scale(s, s);
      circle(c, 0, 0, 20, 'rgba(120,255,160,0.18)');
      if (this.kind === 'repair') {
        roundRect(c, -13, -13, 26, 26, 6);
        c.fillStyle = '#f4f4f4'; c.fill();
        c.strokeStyle = '#2a8a3a'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#28c048';
        c.fillRect(-3.5, -9, 7, 18);
        c.fillRect(-9, -3.5, 18, 7);
      } else {
        poly(c, [3, -14, -8, 2, -1, 2, -4, 14, 8, -3, 1, -3], '#ffe24a', '#8a6a00', 2);
      }
    });
  }
}
