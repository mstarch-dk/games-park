// Bølge-spillet: fjender kommer i bølger, og hver 5. bølge er der en rumbase.

// En del af rumbasen der kan rammes (tårn eller kerne)
class BasePart {
  constructor(base, kind, angle) {
    this.base = base;
    this.kind = kind;     // 'turret' eller 'core'
    this.offA = angle;
    this.team = 'enemy';
    this.fixed = true;
    this.vx = 0; this.vy = 0;
    this.alive = true;
    this.r = kind === 'core' ? 62 : 20;
    this.maxHp = kind === 'core' ? base.coreHp : base.turretHp;
    this.hp = this.maxHp;
    this.cd = rand(1, 2.5);
    this.aim = 0;
    this.flash = 0;
    this.place();
  }

  place() {
    const b = this.base;
    if (this.kind === 'core') { this.x = b.x; this.y = b.y; return; }
    const a = b.rot + this.offA;
    this.x = wrapCoord(b.x + Math.cos(a) * 104, WORLD.w);
    this.y = wrapCoord(b.y + Math.sin(a) * 104, WORLD.h);
  }

  damage(n, G, source) {
    if (!this.alive) return;
    if (this.kind === 'core' && this.base.shielded) {
      Sound.shieldHit();
      Fx.ring(this.x, this.y, 80, 100, '#7ad8ff', 0.25, 5);
      return;
    }
    this.hp -= n;
    this.flash = 1;
    Sound.hit();
    if (this.hp <= 0) {
      this.alive = false;
      G.onBasePartDestroyed(this, source);
    }
  }
}

class SpaceBase {
  constructor(x, y, level) {
    this.x = x; this.y = y;
    this.alive = true;
    this.rot = 0;
    this.t = 0;
    this.coreHp = 30 + level * 6;
    this.turretHp = 8 + level;
    this.spawnCd = 6;
    this.turrets = [0, 1, 2, 3].map((i) => new BasePart(this, 'turret', (i / 4) * TAU + Math.PI / 4));
    this.core = new BasePart(this, 'core', 0);
  }

  get shielded() { return this.turrets.some((t) => t.alive); }
  get parts() { return [...this.turrets.filter((t) => t.alive), this.core].filter((p) => p.alive); }

  update(dt, G) {
    this.t += dt;
    this.rot += dt * 0.25;
    for (const p of [...this.turrets, this.core]) {
      p.place();
      p.flash = Math.max(0, p.flash - dt * 5);
    }
    // Tårnene skyder på nærmeste spiller
    for (const tu of this.turrets) {
      if (!tu.alive) continue;
      const tgt = G.nearestTarget(tu, 'enemy', 900);
      if (!tgt) continue;
      const d = V.delta(tu, tgt);
      const dist = Math.hypot(d.x, d.y);
      const tt = dist / 430;
      tu.aim = Math.atan2(d.y + (tgt.vy || 0) * tt * 0.6, d.x + (tgt.vx || 0) * tt * 0.6);
      tu.cd -= dt;
      if (tu.cd <= 0 && G.canFire) {
        tu.cd = rand(1.2, 2);
        G.projectiles.push(new Projectile({
          x: tu.x + Math.cos(tu.aim) * 24, y: tu.y + Math.sin(tu.aim) * 24,
          vx: Math.cos(tu.aim) * 430, vy: Math.sin(tu.aim) * 430,
          kind: 'enemy', dmg: 2, life: 2, r: 6, color: '#ffa030', team: 'enemy', owner: tu,
        }));
        Sound.zap();
      }
    }
    // Basen sender droner ud
    this.spawnCd -= dt;
    if (this.spawnCd <= 0) {
      this.spawnCd = this.shielded ? 7 : 4.5;
      if (G.ships.filter((s) => s.team === 'enemy').length < 7) {
        const a = Math.random() * TAU;
        const e = Waves.spawnEnemy(G, 'drone', this.x + Math.cos(a) * 160, this.y + Math.sin(a) * 160);
        e.vx = Math.cos(a) * 200; e.vy = Math.sin(a) * 200;
      }
    }
  }

  // Skibe preller af basen
  collide(s, G) {
    const d = V.delta(this, s);
    const dist = Math.hypot(d.x, d.y) || 1;
    const min = 80 + s.r;
    if (dist >= min) return;
    const nx = d.x / dist, ny = d.y / dist;
    s.x = wrapCoord(this.x + nx * (min + 1), WORLD.w);
    s.y = wrapCoord(this.y + ny * (min + 1), WORLD.h);
    const vn = s.vx * nx + s.vy * ny;
    if (vn < 0) { s.vx -= 1.7 * vn * nx; s.vy -= 1.7 * vn * ny; }
    if (s.team !== 'enemy') {
      s.damage(Math.max(1, Math.round(Math.abs(vn) / 160)), G, null);
      Sound.thud();
    }
  }

  draw(ctx, t) {
    Camera.drawAt(ctx, this, 200, (c) => {
      // Ydre ring med eger
      c.save();
      c.rotate(this.rot);
      c.strokeStyle = '#5a6070'; c.lineWidth = 10;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + Math.PI / 4;
        c.beginPath(); c.moveTo(Math.cos(a) * 50, Math.sin(a) * 50); c.lineTo(Math.cos(a) * 100, Math.sin(a) * 100); c.stroke();
      }
      circle(c, 0, 0, 104, null, '#3a3f4c', 16);
      circle(c, 0, 0, 104, null, '#7a8296', 8);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        const on = (Math.floor(this.t * 3) + i) % 4 === 0;
        circle(c, Math.cos(a) * 104, Math.sin(a) * 104, 3, on ? '#ff3a3a' : '#5a1a1a');
      }
      c.restore();
      // Kernen
      const core = this.core;
      const pulse = 0.6 + Math.sin(this.t * 4) * 0.25;
      circle(c, 0, 0, 62, '#2a2d38', '#111', 4);
      circle(c, 0, 0, 40, `rgba(255,60,60,${pulse})`, '#ff8080', 3);
      // Et stort, surt øje
      ellipse(c, 0, 0, 26, 16, 0, '#ffe0e0');
      const tgt = Game.nearestTarget(this.core, 'enemy', 2000);
      let ex = 0, ey = 0;
      if (tgt) { const d = V.delta(this, tgt); const l = Math.hypot(d.x, d.y) || 1; ex = d.x / l * 9; ey = d.y / l * 5; }
      circle(c, ex, ey, 8, '#200');
      c.strokeStyle = '#111'; c.lineWidth = 5;
      c.beginPath(); c.moveTo(-30, -24); c.lineTo(30, -14); c.stroke();
      if (core.flash > 0) circle(c, 0, 0, 62, `rgba(255,255,255,${core.flash * 0.5})`);
      // Kerne-liv
      if (!this.shielded) bar(c, -50, 74, 100, 9, core.hp / core.maxHp, '#ff5a5a');
      // Skjold
      if (this.shielded) {
        const a = 0.25 + Math.sin(this.t * 3) * 0.08;
        circle(c, 0, 0, 82, `rgba(90,200,255,${a})`, `rgba(160,230,255,${a + 0.35})`, 3);
      }
    });
    // Tårne
    for (const tu of this.turrets) {
      if (!tu.alive) continue;
      Camera.drawAt(ctx, tu, 50, (c) => {
        circle(c, 0, 0, 20, '#6a7080', '#22252e', 3);
        c.save();
        c.rotate(tu.aim);
        c.fillStyle = '#333844';
        c.fillRect(4, -5, 24, 10);
        c.restore();
        circle(c, 0, 0, 9, '#ffa030', '#7a3a00', 2);
        if (tu.flash > 0) circle(c, 0, 0, 20, `rgba(255,255,255,${tu.flash * 0.6})`);
        bar(c, -18, -32, 36, 6, tu.hp / tu.maxHp, '#ffa030');
      });
    }
  }
}

const Waves = {
  wave: 0,
  pause: 0,
  clearing: false,

  start(G) {
    this.wave = 0;
    this.pause = 2;
    this.clearing = true;
  },

  skillFor(w) { return w <= 3 ? 0 : w <= 8 ? 1 : 2; },

  // Find et sted langt fra spillerne og planeten
  safeSpot(G, minDist = 900) {
    const avoid = G.ships.filter((s) => s.alive && s.player !== undefined);
    for (let i = 0; i < 40; i++) {
      const p = { x: Math.random() * WORLD.w, y: Math.random() * WORLD.h };
      if (G.planet && V.dist(p, G.planet) < G.planet.r + 250) continue;
      if (G.base && V.dist(p, G.base) < 260) continue;
      if (avoid.every((s) => V.dist(p, s) > minDist)) return p;
    }
    return { x: Math.random() * WORLD.w, y: Math.random() * WORLD.h };
  },

  spawnEnemy(G, type, x, y) {
    const def = ENEMY_DEFS[type];
    const e = new Ship(def, { x: wrapCoord(x, WORLD.w), y: wrapCoord(y, WORLD.h), angle: Math.random() * TAU, team: 'enemy', hpMul: 1 + (this.wave - 1) * 0.08 });
    G.ships.push(e);
    G.pilots.set(e, new AIPilot(e, this.skillFor(this.wave)));
    Fx.ring(e.x, e.y, 60, 5, '#ff6a6a', 0.5, 4);
    return e;
  },

  nextWave(G) {
    this.wave++;
    const w = this.wave;
    const boss = w % 5 === 0;
    if (boss) {
      const p = this.safeSpot(G, 1100);
      G.base = new SpaceBase(p.x, p.y, w / 5);
      Sound.alarm();
      G.showBanner(`BØLGE ${w}`, 'En RUMBASE! Skyd tårnene ned for at fjerne skjoldet', 3.5);
    } else {
      Sound.wave();
      G.showBanner(`BØLGE ${w}`, w === 1 ? 'Skyd alle fjenderne ned!' : 'Gør klar!', 2.5);
    }
    const n = boss ? 2 + Math.floor(w / 5) : 2 + w;
    const coopBonus = G.mode === 'coop' ? 1.3 : 1;
    const count = Math.min(12, Math.round(n * coopBonus));
    for (let i = 0; i < count; i++) {
      let type = 'drone';
      const r = Math.random();
      if (w >= 2 && r < 0.2 + w * 0.04) type = 'jaeger';
      if (w >= 3 && r > 0.85 - w * 0.01) type = 'minelaegger';
      const p = this.safeSpot(G);
      this.spawnEnemy(G, type, p.x, p.y);
    }
    this.clearing = false;
  },

  update(dt, G) {
    if (this.clearing) {
      this.pause -= dt;
      if (this.pause <= 0) this.nextWave(G);
      return;
    }
    const enemies = G.ships.filter((s) => s.alive && s.team === 'enemy');
    if (enemies.length === 0 && !G.base) {
      this.clearing = true;
      this.pause = 3.5;
      const bonus = 500 * this.wave;
      G.addScore(bonus);
      G.showBanner('BØLGE KLARET!', `+${bonus} point · skibene bliver repareret`, 3);
      Sound.roundWin();
      for (const s of G.ships) {
        if (s.alive && s.player !== undefined) s.hp = Math.min(s.maxHp, s.hp + Math.ceil(s.maxHp * 0.5));
      }
    }
  },
};
