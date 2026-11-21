// Computer-piloten. Den laver det samme "styre-objekt" som tastaturet,
// så den kan flyve alle skibe – også fjenderne i bølge-spillet.
const AI_SKILL = [
  // 0 = Let, 1 = Mellem, 2 = Svær
  { name: 'Let', react: 0.32, lead: 0.15, aimTol: 0.22, err: 0.35, fireChance: 0.45, specialChance: 0.25, turnMul: 0.75 },
  { name: 'Mellem', react: 0.16, lead: 0.6, aimTol: 0.14, err: 0.14, fireChance: 0.8, specialChance: 0.6, turnMul: 0.9 },
  { name: 'Svær', react: 0.07, lead: 1, aimTol: 0.09, err: 0.04, fireChance: 1, specialChance: 1, turnMul: 1 },
];

class AIPilot {
  constructor(ship, skill = 1) {
    this.ship = ship;
    this.skill = AI_SKILL[skill];
    this.timer = 0;
    this.want = ship.angle;
    this.err = 0;
    this.orbit = pick([-1, 1]);
    this.wander = Math.random() * TAU;
    this.c = { left: false, right: false, thrust: false, fire: false, special: false };
  }

  update(dt, G) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this.skill.react * rand(0.7, 1.3);
      this.decide(G);
    }
    // Drejningen tjekkes hvert billede, så den ikke drejer for langt
    const s = this.ship;
    const diff = angleDiff(s.angle, this.want);
    const dead = 0.04 + s.def.turn * 0.012;
    // Let computer drejer lidt langsommere: slipper "tasten" en gang imellem
    const lazy = Math.random() > this.skill.turnMul;
    this.c.left = !lazy && diff < -dead;
    this.c.right = !lazy && diff > dead;
    return this.c;
  }

  decide(G) {
    const s = this.ship, d = s.def, sk = this.skill;
    const c = this.c;
    c.thrust = false; c.fire = false; c.special = false;
    if (Math.random() < 0.2) this.err = rand(-sk.err, sk.err);
    if (Math.random() < 0.03) this.orbit = -this.orbit;
    const speed = Math.hypot(s.vx, s.vy);

    // 1) Undgå planeten: kig lidt frem i tiden
    if (G.planet) {
      const P = G.planet;
      const safe = P.r + s.r + 90 + speed * 0.25;
      let danger = false;
      for (const look of [0.25, 0.5, 0.9, 1.4]) {
        const f = { x: s.x + s.vx * look, y: s.y + s.vy * look };
        if (V.dist(f, P) < safe) { danger = true; break; }
      }
      const dp = V.delta(s, P);
      const pd = Math.hypot(dp.x, dp.y) || 1;
      if (danger || pd < P.r + s.r + 70) {
        // Sving udenom: behold farten på tværs af planeten og skub væk fra den
        const nx = dp.x / pd, ny = dp.y / pd;
        const vn = s.vx * nx + s.vy * ny;
        let tx = s.vx - vn * nx, ty = s.vy - vn * ny;
        if (Math.hypot(tx, ty) < 40) { tx = -ny * this.orbit; ty = nx * this.orbit; }
        const tl = Math.hypot(tx, ty) || 1;
        this.want = Math.atan2(ty / tl - nx * 1.2, tx / tl - ny * 1.2);
        c.thrust = Math.abs(angleDiff(s.angle, this.want)) < 1.0;
        return;
      }
    }

    const tgt = G.nearestTarget(s, s.team, 3000);
    if (!tgt) {
      if (Math.random() < 0.05) this.wander = Math.random() * TAU;
      this.want = this.wander;
      c.thrust = speed < d.speed * 0.35;
      return;
    }

    const rel = V.delta(s, tgt);
    const dist = Math.hypot(rel.x, rel.y) || 1;
    const relAngle = Math.atan2(rel.y, rel.x);
    const tvx = tgt.vx || 0, tvy = tgt.vy || 0;

    // 2) Sigt efter hvor målet VIL være, når skuddet når frem
    let aim = rel;
    if (d.ai.shotSpeed > 0) {
      const tt = dist / d.ai.shotSpeed;
      aim = { x: rel.x + (tvx - s.vx) * tt * sk.lead, y: rel.y + (tvy - s.vy) * tt * sk.lead };
    }
    const aimAngle = Math.atan2(aim.y, aim.x) + this.err;
    const style = d.ai.style;

    if (style === 'mines') {
      // Grisen og mine-krabben flygter og lægger miner bag sig
      const behind = Math.abs(angleDiff(s.angle + Math.PI, relAngle)) < 0.8;
      if (dist < d.ai.range * 1.3) {
        this.want = relAngle + Math.PI + this.orbit * 0.7;
        c.thrust = true;
      } else {
        this.want = aimAngle;
        c.thrust = speed < d.speed * 0.6;
      }
      c.fire = behind && dist < 520;
      if (d.id === 'gris') c.special = behind && dist < 260;
    } else {
      this.want = aimAngle;
      const facing = Math.abs(angleDiff(s.angle, aimAngle));
      const pref = d.ai.range * 0.55;
      const closing = -((tvx - s.vx) * rel.x + (tvy - s.vy) * rel.y) / dist;
      if (dist > pref) {
        c.thrust = facing < 0.6 && closing < d.speed * 0.7;
      }
      const impact = closing > 60 ? dist / closing : 99; // sekunder til sammenstød
      if ((dist < pref * 0.55 && closing > 100) || (impact < 1.1 && dist < 500 && d.id !== 'haj')) {
        // For tæt på og på vej ind i den anden: sving udenom
        this.want = aimAngle + this.orbit * 1.3;
        c.thrust = true;
      }
      const tol = sk.aimTol + (style === 'missile' ? 0.6 : 0) + (s.r + (tgt.r || 20)) / dist * 0.5;
      c.fire = facing < tol && dist < d.ai.range;

      const threat = G.threatNear(s, 170);
      switch (d.id) {
        case 'lynet': c.special = (dist > 1000 && facing < 0.3) || (s.hp < s.maxHp * 0.3 && dist < 250); break;
        case 'boef': c.special = threat; break;
        case 'snurre': c.special = dist < 230; break;
        case 'blaek': c.special = (threat && s.hp < s.maxHp * 0.6) || dist < 200; break;
        case 'haj': c.special = dist < 420 && facing < 0.25; break;
        default: break;
      }
    }

    if (c.fire && Math.random() > sk.fireChance) c.fire = false;
    if (c.special && Math.random() > sk.specialChance) c.special = false;
  }
}
