// Sejlskibe: sejlads efter vinden, krængning, kanoner og skader.
const SHIP_TYPES = {
  player: { name: 'Havørnen', len: 46, wid: 15, speed: 118, hp: 30, guns: 3, reload: 2.6, flag: 'dk',
    hull: '#8a5a33', deck: '#d9b27c', sail: '#fffbea', masts: 2 },
  merchant: { name: 'Fremmed handelsskib', len: 50, wid: 18, speed: 82, hp: 12, guns: 1, reload: 4, flag: 'green',
    hull: '#6d4c35', deck: '#c9a46e', sail: '#efe0bd', masts: 2, surrender: 0.45, reward: [90, 200] },
  dkmerchant: { name: 'Dansk handelsskib', len: 48, wid: 18, speed: 80, hp: 12, guns: 0, reload: 4, flag: 'dk',
    hull: '#7b5537', deck: '#d1ad74', sail: '#f6ead0', masts: 2, friendly: true },
  pirate: { name: 'Sørøverskib', len: 42, wid: 14, speed: 108, hp: 14, guns: 2, reload: 3.2, flag: 'pirate',
    hull: '#3d2b22', deck: '#8b6b4a', sail: '#2e2e2e', masts: 2, surrender: 0.3, reward: [150, 260] },
  frigate: { name: 'Fremmed fregat', len: 58, wid: 19, speed: 100, hp: 30, guns: 4, reload: 3, flag: 'green',
    hull: '#4b3a5a', deck: '#b9a07a', sail: '#ffffff', masts: 3, surrender: 0.25, reward: [500, 800] },
};

const CARGO_NAMES = ['tønder med sild', 'kasser med te', 'baller af uld', 'sække med korn', 'kister med krydderier',
  'ruller af silke', 'tønder med vin', 'kasser med sukker', 'stænger af jern', 'kister med sølvmønter'];

let shipIdCounter = 0;

class Ship {
  constructor(type, x, y, heading) {
    const T = SHIP_TYPES[type];
    this.id = ++shipIdCounter;
    this.type = type;
    this.T = T;
    this.name = T.name;
    this.x = x; this.y = y;
    this.heading = heading;
    this.speed = 0;
    this.vx = 0; this.vy = 0;
    this.len = T.len; this.wid = T.wid;
    this.maxSpeed = T.speed;
    this.maxHp = T.hp; this.hp = T.hp;
    this.guns = T.guns;
    this.reloadTime = T.reload;
    this.reload = { '-1': 0, '1': 0 };
    this.gunPower = 1;
    this.sail = 2;           // 0 = sejlene nede, 1 = halve sejl, 2 = fulde sejl
    this.elev = 10;          // kanonernes hældning i grader
    this.heel = 0;           // krængning: + = skibet hælder mod styrbord
    this.flag = T.flag;
    this.surrendered = false;
    this.sinking = 0;
    this.gone = false;
    this.prize = false;
    this.ai = null;
    this.wakeT = 0;
    this.hitFlash = 0;
    this.bumpT = 0;
    this.lastHitBy = null;
  }

  get isPlayer() { return this.type === 'player'; }
  get sailLevel() { return this.sail / 2; }
  get hostile() { return this.type === 'pirate' || this.type === 'frigate'; }
  get relWind() { return angDiff(this.heading, Wind.angle + Math.PI); }

  // Kanonernes rigtige hældning på en side: krængningen løfter den ene side og sænker den anden
  effElev(side) { return clamp(this.elev - side * this.heel, 0.5, 40); }

  update(dt, ctrl) {
    if (this.sinking) {
      this.sinking += dt;
      this.speed *= 1 - dt;
      if (Math.random() < dt * 8) Fx.smoke(this.x + rand(-10, 10), this.y + rand(-10, 10), 0, 0, 10, 1.5);
      if (this.sinking > 3.2) this.gone = true;
      this.move(dt);
      return;
    }
    for (const k in this.reload) this.reload[k] = Math.max(0, this.reload[k] - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.bumpT = Math.max(0, this.bumpT - dt);

    if (ctrl) {
      if (ctrl.sailUp && this.sail < 2) { this.sail++; if (this.isPlayer) Sound.sail(); }
      if (ctrl.sailDown && this.sail > 0) { this.sail--; if (this.isPlayer) Sound.sail(); }
      if (ctrl.elev || ctrl.elevStep) {
        const before = this.elev;
        this.elev = clamp(this.elev + (ctrl.elev || 0) * 12 * dt + (ctrl.elevStep || 0), BALL.minElev, BALL.maxElev);
        if (this.isPlayer && Math.floor(before) !== Math.floor(this.elev)) Sound.elev();
      }
      if (ctrl.setElev !== undefined) this.elev = clamp(ctrl.setElev, BALL.minElev, BALL.maxElev);
      const turnRate = 0.55 + 0.75 * Math.min(1, this.speed / 60);
      this.heading += clamp(ctrl.turn || 0, -1, 1) * turnRate * dt;
      if (ctrl.fireL) this.fire(-1);
      if (ctrl.fireR) this.fire(1);
    }
    if (this.surrendered) this.sail = 0;

    // Fart efter vinden og hvor meget sejl der er sat
    const rel = this.relWind;
    const target = this.maxSpeed * (0.35 + 0.65 * Wind.strength) * sailFactor(rel) * this.sailLevel;
    this.speed += clamp(target - this.speed, -45 * dt, 24 * dt);

    // Krængning: vinden fra siden trykker skibet over mod læsiden
    const lee = Math.cos(Wind.angle - (this.heading + Math.PI / 2)); // + når vinden blæser mod styrbord
    const heelTarget = 9 * this.sailLevel * Wind.strength * lee * (Math.abs(rel) < 35 * DEG ? 0.3 : 1);
    this.heel += (heelTarget - this.heel) * Math.min(1, 1.5 * dt);

    this.move(dt);

    // Kølvand
    this.wakeT -= dt;
    if (this.wakeT <= 0 && this.speed > 12) {
      this.wakeT = 0.09;
      Fx.wake(this.x - Math.cos(this.heading) * this.len * 0.45, this.y - Math.sin(this.heading) * this.len * 0.45, this.wid * 0.35);
    }
    if (this.hp < this.maxHp * 0.5 && Math.random() < dt * 3) Fx.smoke(this.x, this.y, 0, 0, 7, 1.2);
  }

  move(dt) {
    const drift = 5 + 7 * this.sailLevel;
    this.vx = Math.cos(this.heading) * this.speed + Wind.vx * drift;
    this.vy = Math.sin(this.heading) * this.speed + Wind.vy * drift;
    const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
    if (!this.touchesLand(nx, ny, this.heading)) { this.x = nx; this.y = ny; return; }
    // Glid langs kysten, hvis det kan lade sig gøre
    if (!this.touchesLand(nx, this.y, this.heading)) this.x = nx;
    else if (!this.touchesLand(this.x, ny, this.heading)) this.y = ny;
    this.speed *= 0.5;
    if (this.bumpT <= 0) {
      this.bumpT = 1;
      if (this.isPlayer) { Sound.bump(); Game.toast('Pas på grundstødning! Drej væk fra land.', '#ffd166'); }
    }
    // Sidder vi helt fast, skubbes vi lidt ud mod vandet
    if (this.touchesLand(this.x, this.y, this.heading)) {
      search: for (let r = 6; r <= 120; r += 6) {
        for (let a = 0; a < TAU; a += TAU / 16) {
          const px = this.x + Math.cos(a) * r, py = this.y + Math.sin(a) * r;
          if (!this.touchesLand(px, py, this.heading)) { this.x = px; this.y = py; break search; }
        }
      }
    }
  }

  touchesLand(x, y, h) {
    const c = Math.cos(h), s = Math.sin(h), L = this.len * 0.45;
    return Sea.isLand(x + c * L, y + s * L) || Sea.isLand(x - c * L, y - s * L) || Sea.isLand(x, y);
  }

  fire(side) {
    if (this.guns <= 0 || this.surrendered || this.sinking || this.reload[side] > 0) return false;
    this.reload[side] = this.reloadTime;
    const spacing = this.len * 0.7 / Math.max(1, this.guns);
    for (let i = 0; i < this.guns; i++) {
      const off = (i - (this.guns - 1) / 2) * spacing;
      const L = ballLaunch(this, side, this.effElev(side) + rand(-0.8, 0.8), off);
      const spread = rand(-0.03, 0.03);
      const c = Math.cos(spread), s = Math.sin(spread);
      const vx = L.vx * c - L.vy * s, vy = L.vx * s + L.vy * c;
      Game.balls.push(new Ball(this, L.x, L.y, vx, vy, L.vz, this.type === 'frigate' ? 1.3 : 1));
      Fx.muzzle(L.x, L.y, L.dx, L.dy, this.vx, this.vy);
    }
    if (this.isPlayer) Sound.cannon();
    else if (Game.onScreen(this, 100)) Sound.distantCannon();
    return true;
  }

  contains(px, py) {
    const dx = px - this.x, dy = py - this.y;
    const c = Math.cos(-this.heading), s = Math.sin(-this.heading);
    const lx = dx * c - dy * s, ly = dx * s + dy * c;
    const a = this.len / 2 + 2, b = this.wid / 2 + 3;
    return (lx * lx) / (a * a) + (ly * ly) / (b * b) <= 1;
  }

  takeHit(ball) {
    this.hp -= ball.dmg;
    this.hitFlash = 0.25;
    this.lastHitBy = ball.owner;
    Fx.splinters(ball.x, ball.y);
    if (Game.onScreen(this, 0)) (this.isPlayer ? Sound.ouch() : Sound.hit());
    Game.onShipHit(this, ball.owner);
    if (this.hp <= 0 && !this.sinking) {
      this.hp = 0;
      this.sinking = 0.001;
      this.flag = 'none';
      Game.onShipSunk(this, ball.owner);
    } else if (!this.surrendered && !this.prize && this.T.surrender && this.hp <= this.maxHp * this.T.surrender) {
      this.surrender();
    }
  }

  surrender() {
    this.surrendered = true;
    this.flag = 'white';
    this.sail = 0;
    Game.onSurrender(this);
  }

  // ---------- Tegning ----------
  draw(ctx, t) {
    const sinkA = this.sinking ? Math.max(0, 1 - this.sinking / 3.2) : 1;
    ctx.save();
    ctx.globalAlpha = sinkA;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.heading);
    const L = this.len, W = this.wid;
    const heelShift = this.heel * 0.35; // skibet hælder: mast og sejl skubbes mod læsiden

    // Skygge
    ctx.fillStyle = 'rgba(0,20,50,0.25)';
    this.hullPath(ctx, L, W, 3, 4);
    ctx.fill();
    // Skrog
    this.hullPath(ctx, L, W, 0, 0);
    ctx.fillStyle = this.hitFlash > 0 ? '#ffb4a2' : this.T.hull;
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,15,5,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    this.hullPath(ctx, L * 0.86, W * 0.72, 0, 0);
    ctx.fillStyle = this.T.deck; ctx.fill();
    // planker
    ctx.strokeStyle = 'rgba(90,60,30,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-L * 0.38, 0); ctx.lineTo(L * 0.3, 0); ctx.stroke();
    // Kanoner langs siderne
    if (this.guns > 0) {
      ctx.fillStyle = '#222';
      const n = this.guns, sp = L * 0.7 / Math.max(1, n);
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * sp;
        ctx.fillRect(off - 2, -W / 2 - 3, 4, 4);
        ctx.fillRect(off - 2, W / 2 - 1, 4, 4);
      }
    }
    // Agterkahyt
    ctx.fillStyle = 'rgba(80,45,20,0.9)';
    ctx.fillRect(-L * 0.42, -W * 0.28, L * 0.14, W * 0.56);

    // Master og sejl. Sejlene drejes efter vinden og buler ud mod læsiden.
    const rel = this.relWind;
    const lee = Math.sign(Math.sin(Wind.angle - this.heading)) || 1;
    const boom = lee * clamp((Math.PI - Math.abs(rel)) * 0.5, 0.15, 1.35);
    const masts = this.T.masts;
    for (let m = 0; m < masts; m++) {
      const mx = lerp(L * 0.22, -L * 0.18, masts === 1 ? 0.5 : m / (masts - 1));
      ctx.save();
      ctx.translate(mx, heelShift);
      ctx.fillStyle = '#5b3a1e';
      ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, TAU); ctx.fill();
      const sw = W * (m === 0 && masts > 2 ? 1.4 : 1.7);
      if (this.sail > 0 && !this.sinking) {
        ctx.rotate(Math.PI / 2 + boom);
        // sejlet buler ud i den retning vinden blæser hen
        const wl = Wind.angle - (this.heading + Math.PI / 2 + boom);
        const bs = Math.sin(wl) >= 0 ? 1 : -1;
        const luff = Math.abs(rel) < 35 * DEG;
        const belly = W * (this.sail === 2 ? 0.6 : 0.32) * (luff ? 0.2 : 0.6 + 0.4 * Wind.strength);
        ctx.beginPath();
        ctx.moveTo(-sw / 2, 0);
        ctx.bezierCurveTo(-sw * 0.4, bs * belly * 1.3, sw * 0.4, bs * belly * 1.3, sw / 2, 0);
        ctx.closePath();
        ctx.fillStyle = this.T.sail;
        ctx.fill();
        ctx.strokeStyle = 'rgba(60,40,20,0.6)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-sw / 2, 0); ctx.lineTo(sw / 2, 0); ctx.stroke();
        if (this.type === 'pirate' && m === 0) {
          ctx.fillStyle = '#eee';
          ctx.beginPath(); ctx.arc(0, bs * belly * 0.55, 2.6, 0, TAU); ctx.fill();
        }
      } else {
        // sejlene er rullet sammen på rånocken
        ctx.rotate(Math.PI / 2);
        ctx.strokeStyle = this.T.sail; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-sw / 2, 0); ctx.lineTo(sw / 2, 0); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();

    // Flaget på agterste mast vajer med vinden (tegnet i verdens-retning)
    if (this.flag !== 'none') {
      const fx = this.x + Math.cos(this.heading) * (-L * 0.4), fy = this.y + Math.sin(this.heading) * (-L * 0.4);
      ctx.save();
      ctx.globalAlpha = sinkA;
      ctx.translate(fx, fy);
      ctx.rotate(Wind.angle);
      ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -1); ctx.stroke();
      drawFlag(ctx, this.flag, 0, -5, 16, 10, Math.sin(t * 8 + this.id) * 2.5);
      ctx.restore();
    }
  }

  hullPath(ctx, L, W, ox, oy) {
    ctx.beginPath();
    ctx.moveTo(L / 2 + ox, oy);
    ctx.quadraticCurveTo(L * 0.25 + ox, -W / 2 + oy, -L * 0.2 + ox, -W / 2 + oy);
    ctx.lineTo(-L / 2 + ox, -W * 0.38 + oy);
    ctx.lineTo(-L / 2 + ox, W * 0.38 + oy);
    ctx.lineTo(-L * 0.2 + ox, W / 2 + oy);
    ctx.quadraticCurveTo(L * 0.25 + ox, W / 2 + oy, L / 2 + ox, oy);
    ctx.closePath();
  }
}
