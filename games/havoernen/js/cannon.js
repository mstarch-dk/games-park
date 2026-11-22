// Kanonkugler: flyver i en bue (højde z), trækkes ned af tyngden og skubbes af vinden.
const BALL = {
  speed: 260,     // mundingsfart (px/s)
  gravity: 150,   // tyngde (px/s²)
  windPush: 38,   // hvor meget vinden skubber kuglen
  hitHeight: 11,  // kuglen rammer, hvis den er lavere end skibets ræling
  minElev: 2, maxElev: 30,
};

class Ball {
  constructor(owner, x, y, vx, vy, vz, dmg) {
    this.owner = owner;
    this.x = x; this.y = y; this.z = 7;
    this.vx = vx; this.vy = vy; this.vz = vz;
    this.dmg = dmg;
    this.alive = true;
  }

  update(dt, ships) {
    this.vx += Wind.vx * BALL.windPush * dt;
    this.vy += Wind.vy * BALL.windPush * dt;
    this.vz -= BALL.gravity * dt;
    this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt;

    if (this.z < BALL.hitHeight) {
      for (const s of ships) {
        if (s === this.owner || s.sinking || !s.contains(this.x, this.y)) continue;
        this.alive = false;
        s.takeHit(this);
        return;
      }
    }
    if (this.z <= 0) {
      this.alive = false;
      if (Sea.isLand(this.x, this.y)) Fx.smoke(this.x, this.y, 0, 0, 7, 0.8);
      else { Fx.splash(this.x, this.y); if (Game.onScreen(this, 0)) Sound.splash(); }
    }
  }

  draw(ctx) {
    // skygge på vandet + kuglen løftet op efter højden
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.arc(this.x, this.y, 3, 0, TAU); ctx.fill();
    const lift = this.z * 0.45;
    ctx.fillStyle = '#1b1b1b';
    ctx.beginPath(); ctx.arc(this.x - lift * 0.3, this.y - lift, 3.2 + this.z * 0.03, 0, TAU); ctx.fill();
  }
}

// Udgangsfart for en kugle fra skibet (side +1 = styrbord/højre, -1 = bagbord/venstre)
function ballLaunch(ship, side, elevDeg, offset = 0) {
  const dir = ship.heading + side * Math.PI / 2;
  const fx = Math.cos(ship.heading), fy = Math.sin(ship.heading);
  const dx = Math.cos(dir), dy = Math.sin(dir);
  const e = Math.max(0.5, elevDeg) * DEG;
  const v = BALL.speed * ship.gunPower;
  return {
    x: ship.x + fx * offset + dx * ship.wid * 0.5,
    y: ship.y + fy * offset + dy * ship.wid * 0.5,
    vx: dx * v * Math.cos(e) + ship.vx,
    vy: dy * v * Math.cos(e) + ship.vy,
    vz: v * Math.sin(e),
    dx, dy,
  };
}

// Forudsig hvor kuglerne lander (sigtehjælpen). Giver punkter langs banen.
function predictShot(ship, side) {
  const L = ballLaunch(ship, side, ship.effElev(side));
  let { x, y, vx, vy, vz } = L, z = 7;
  const pts = [{ x, y, z }];
  const dt = 1 / 30;
  for (let i = 0; i < 240 && z > 0; i++) {
    vx += Wind.vx * BALL.windPush * dt; vy += Wind.vy * BALL.windPush * dt; vz -= BALL.gravity * dt;
    x += vx * dt; y += vy * dt; z += vz * dt;
    if (i % 3 === 0) pts.push({ x, y, z });
  }
  pts.push({ x, y, z: 0 });
  return pts;
}

// Hvilken hældning skal der til for at ramme i afstanden d? (computeren bruger den)
function elevForRange(d, power = 1) {
  const v = BALL.speed * power;
  const s = clamp(d * BALL.gravity / (v * v), 0, 1);
  return Math.asin(s) / 2 / DEG;
}
