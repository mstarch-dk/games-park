// Et rumskib i spillet. Det kan styres af en spiller eller af computeren –
// begge giver skibet et "styre-objekt" { left, right, thrust, fire, special }.

class Ship {
  constructor(def, o) {
    this.def = def;
    this.x = o.x; this.y = o.y;
    this.vx = o.vx || 0; this.vy = o.vy || 0;
    this.angle = o.angle || 0;
    this.team = o.team;
    this.player = o.player;      // 0 eller 1 for spillere, ellers undefined
    this.r = def.radius;
    this.mass = def.mass;
    this.maxHp = Math.round(def.hp * (o.hpMul || 1));
    this.hp = this.maxHp;
    this.energy = def.energy;
    this.fireCd = 0;
    this.specialCd = 0;
    this.alive = true;
    this.t = Math.random() * 10;
    this.flash = 0;
    this.inv = o.inv || 0;   // usårlig (lige efter man er kommet tilbage)
    this.shield = 0;
    this.boost = 0;
    this.bite = 0;
    this.recoil = 0;
    this.thrusting = false;
    this.ctrl = { left: false, right: false, thrust: false, fire: false, special: false };
  }

  get cloaked() {
    return this._cloaked;
  }

  update(dt, ctrl, G) {
    const d = this.def;
    this.ctrl = ctrl;
    this.t += dt;
    this.fireCd -= dt;
    this.specialCd -= dt;
    this.flash = Math.max(0, this.flash - dt * 5);
    this.inv = Math.max(0, this.inv - dt);
    this.shield = Math.max(0, this.shield - dt);
    this.boost = Math.max(0, this.boost - dt);
    this.bite = Math.max(0, this.bite - dt);
    this.recoil = Math.max(0, this.recoil - dt * 5);

    const boosting = this.boost > 0;
    const turn = d.turn * (boosting ? 1.2 : 1);
    if (ctrl.left) this.angle -= turn * dt;
    if (ctrl.right) this.angle += turn * dt;

    // Thrust: motoren skubber i den retning skibet peger.
    // Farten lægges oven i den fart skibet allerede har (vektorer).
    this.thrusting = ctrl.thrust || boosting;
    if (this.thrusting) {
      const acc = d.accel * (boosting ? 2.6 : 1);
      this.vx += Math.cos(this.angle) * acc * dt;
      this.vy += Math.sin(this.angle) * acc * dt;
      const ca = Math.cos(this.angle), sa = Math.sin(this.angle);
      for (const [ex, ey] of d.engines) {
        const wx = this.x + ca * ex - sa * ey, wy = this.y + sa * ex + ca * ey;
        Fx.flame(wx, wy, this.angle, this.vx, this.vy, d.flame, boosting ? 1.6 : 1);
      }
    }

    if (G.planet) G.planet.pull(this, dt);

    // Blæk: fjendens blæk gør det "klistret", eget blæk skjuler skibet
    if (G.inCloud(this, this.team, 'ink')) {
      const k = Math.pow(0.96, dt * 60);
      this.vx *= k; this.vy *= k;
    }
    this._cloaked = G.clouds.some((c) => c.kind === 'ink' && c.owner === this && c.contains(this));

    // Max-fart. Er man hurtigere (fx efter en slynge-tur om planeten),
    // bremses man blødt ned igen – ellers bliver det for vildt.
    const max = d.speed * (boosting ? 1.7 : 1);
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > max) {
      const ns = Math.max(max, sp - 260 * dt);
      const capped = Math.min(ns, max * 1.8);
      this.vx *= capped / sp;
      this.vy *= capped / sp;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    V.wrap(this);

    if (G.planet) {
      const hit = G.planet.collide(this);
      this.planetCd = Math.max(0, (this.planetCd || 0) - dt);
      if (hit > 0 && this.planetCd <= 0) {
        // Kort pusterum, så man ikke mister alt ved at hoppe på planeten
        this.planetCd = 1;
        this.damage(Math.min(3, Math.max(1, Math.round(hit / 160))), G, null);
        Sound.thud();
        Camera.addShake(6);
        Fx.sparks(this.x, this.y, 10, '#ffd080');
      }
    }

    this.energy = Math.min(d.energy, this.energy + d.regen * dt);

    if (G.canFire) {
      if (ctrl.fire && this.fireCd <= 0 && this.energy >= d.fire.cost) {
        this.energy -= d.fire.cost;
        this.fireCd = d.fire.cd;
        d.fire.fn(this, G);
      }
      if (d.special && ctrl.special && this.specialCd <= 0 && this.energy >= d.special.cost) {
        this.energy -= d.special.cost;
        this.specialCd = d.special.cd;
        d.special.fn(this, G);
      }
    }
  }

  damage(n, G, source) {
    if (!this.alive) return;
    if (this.inv > 0) return;
    if (this.shield > 0) {
      Sound.shieldHit();
      Fx.ring(this.x, this.y, this.r + 10, this.r + 22, '#8ff0ff', 0.25, 4);
      return;
    }
    this.hp -= n;
    this.flash = 1;
    Sound.hit();
    if (this.player !== undefined) Camera.addShake(4 + n);
    if (this.hp <= 0) {
      this.hp = 0;
      this.die(G, source);
    }
  }

  die(G, source) {
    this.alive = false;
    const big = this.player !== undefined ? 1.8 : 1;
    Fx.explosion(this.x, this.y, big * (this.r / 20));
    Fx.text(this.x, this.y - 30, pick(['BOOM!', 'KABOOM!', 'BANG!', 'POW!']), '#ffe35a', 36 * big);
    Sound.boom();
    Camera.addShake(10 * big);
    G.onShipDestroyed(this, source);
  }

  draw(ctx, t, showVector) {
    if (!this.alive) return;
    if (this.inv > 0 && Math.floor(this.inv * 10) % 2 === 0) return;
    Camera.drawAt(ctx, this, this.r * 3 + 30, (c) => {
      if (this.cloaked) c.globalAlpha = 0.3;
      // Fartpil: viser hvor skibet BEVÆGER sig (grøn) og hvor det PEGER (gul)
      if (showVector) this.drawVector(c);

      c.save();
      c.rotate(this.angle);
      if (this.def.flip && Math.cos(this.angle) < 0) c.scale(1, -1);
      if (this.thrusting) this.drawFlames(c);
      this.def.draw(c, this, this.t);
      c.restore();

      if (this.flash > 0) {
        c.globalCompositeOperation = 'lighter';
        circle(c, 0, 0, this.r * 1.1, `rgba(255,255,255,${this.flash * 0.6})`);
        c.globalCompositeOperation = 'source-over';
      }
      if (this.shield > 0) {
        const a = 0.35 + Math.sin(this.t * 20) * 0.15;
        circle(c, 0, 0, this.r + 12, `rgba(120,240,255,${a * 0.5})`, `rgba(180,250,255,${a + 0.3})`, 3);
      }
      if (this.bite > 0) {
        c.globalAlpha = 0.5;
        circle(c, 0, 0, this.r + 8, null, '#ff5a5a', 2);
      }
      c.globalAlpha = 1;
    });
  }

  drawFlames(c) {
    const d = this.def;
    const big = this.boost > 0 ? 1.8 : 1;
    for (const [ex, ey] of d.engines) {
      const l = (14 + Math.random() * 10) * big;
      poly(c, [ex, ey - 5, ex - l, ey, ex, ey + 5], d.flame[0]);
      poly(c, [ex, ey - 2.5, ex - l * 0.55, ey, ex, ey + 2.5], '#fff');
    }
  }

  drawVector(c) {
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > 15) {
      const l = 30 + sp * 0.22;
      const a = Math.atan2(this.vy, this.vx);
      c.save();
      c.rotate(a);
      c.globalAlpha *= 0.7;
      c.strokeStyle = '#6dff8a';
      c.lineWidth = 3;
      c.setLineDash([8, 6]);
      c.beginPath(); c.moveTo(this.r + 6, 0); c.lineTo(this.r + l, 0); c.stroke();
      c.setLineDash([]);
      poly(c, [this.r + l + 10, 0, this.r + l, -6, this.r + l, 6], '#6dff8a');
      c.restore();
    }
    c.save();
    c.rotate(this.angle);
    c.globalAlpha *= 0.6;
    c.strokeStyle = '#ffe35a';
    c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, this.r + 14, -0.15, 0.15); c.stroke();
    c.restore();
  }
}

// Når to skibe støder sammen, preller de af hinanden (tunge skibe skubbes mindst).
function collideShips(a, b, G) {
  const d = V.delta(a, b);
  const dist = Math.hypot(d.x, d.y) || 1;
  const min = a.r + b.r;
  if (dist >= min) return;
  const nx = d.x / dist, ny = d.y / dist;
  const overlap = min - dist;
  const tm = a.mass + b.mass;
  a.x -= nx * overlap * (b.mass / tm); a.y -= ny * overlap * (b.mass / tm);
  b.x += nx * overlap * (a.mass / tm); b.y += ny * overlap * (a.mass / tm);
  V.wrap(a); V.wrap(b);
  const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rel >= 0) return; // bevæger sig allerede væk fra hinanden
  const imp = (-1.8 * rel) / tm;
  a.vx -= imp * b.mass * nx; a.vy -= imp * b.mass * ny;
  b.vx += imp * a.mass * nx; b.vy += imp * a.mass * ny;
  if (a.team === b.team) return;
  const dmg = clamp(Math.round(-rel / 230), 1, 4);
  Sound.thud();
  Fx.sparks(a.x + nx * a.r, a.y + ny * a.r, 12, '#ffe080');
  for (const [s, o] of [[a, b], [b, a]]) {
    if (s.bite > 0) {
      o.damage(8, G, s);
      s.bite = 0;
      Sound.chomp();
      Fx.text(o.x, o.y - 30, 'CHOMP!', '#ff5a5a', 34);
    }
  }
  a.damage(dmg, G, b);
  b.damage(dmg, G, a);
}
