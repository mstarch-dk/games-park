// Computerens skibe: handelsskibe sejler mellem havnene, sørøvere og fregatter jager spilleren.
const AI = {
  // Vælg en kurs mod "want", som skibet faktisk kan sejle: ikke lige op mod vinden, og ikke ind i land.
  steer(ship, want, dt) {
    const ai = ship.ai;
    const from = Wind.angle + Math.PI;
    let d = angDiff(from, want);
    ai.tackT = (ai.tackT || 0) - dt;
    if (Math.abs(d) < 50 * DEG) {
      // Krydsning: sejl skråt op mod vinden og skift halse en gang imellem
      const side = Math.sign(d) || 1;
      if (!ai.tack || (ai.tackT <= 0 && side !== ai.tack && Math.abs(d) > 12 * DEG)) { ai.tack = side; ai.tackT = 10; }
      want = from + ai.tack * 52 * DEG;
    }
    // Undgå land: kig fremad og prøv kurser til begge sider
    let best = want;
    if (this.blocked(ship, want)) {
      best = null;
      for (let k = 1; k <= 8 && best === null; k++) {
        for (const sgn of [1, -1]) {
          const a = want + sgn * k * 22 * DEG;
          if (Math.abs(angDiff(from, a)) < 40 * DEG) continue;
          if (!this.blocked(ship, a)) { best = a; break; }
        }
      }
      if (best === null) best = ship.heading + Math.PI / 2;
    }
    return clamp(angDiff(ship.heading, best) * 2.2, -1, 1);
  },

  blocked(ship, a) {
    const c = Math.cos(a), s = Math.sin(a);
    for (const r of [35, 70, 110]) if (Sea.isLand(ship.x + c * r, ship.y + s * r)) return true;
    return false;
  },

  control(ship, dt) {
    const ai = ship.ai;
    const ctrl = { turn: 0, fireL: false, fireR: false };
    if (ship.surrendered) {
      ctrl.turn = 0;
      return ctrl;
    }
    const P = Game.player;
    const dP = P && !P.sinking ? dist(ship, P) : 1e9;

    if (ship.prize) {
      // Et opbragt skib sejles i havn af prisemandskabet
      this.follow(ship, ctrl, dt);
      return ctrl;
    }

    if (ship.type === 'merchant' || ship.type === 'dkmerchant') {
      const scared = ship.type === 'merchant' ? dP < 340 || ai.scaredT > 0 : ai.scaredT > 0;
      ai.scaredT = Math.max(0, (ai.scaredT || 0) - dt);
      if (scared && P) {
        const away = Math.atan2(ship.y - P.y, ship.x - P.x);
        ctrl.turn = this.steer(ship, away, dt);
        ship.sail = 2;
        // Et handelsskib kan skyde lidt igen, hvis spilleren ligger ved siden af
        this.broadside(ship, P, ctrl, 1.5);
      } else {
        this.follow(ship, ctrl, dt);
      }
      return ctrl;
    }

    // Sørøvere og fregatter
    const range = ship.type === 'frigate' ? 650 : 560;
    if (P && dP < range && !Game.inHarbor) {
      ai.hunting = true;
      const toP = Math.atan2(P.y - ship.y, P.x - ship.x);
      let want;
      if (dP > 260) want = toP;
      else {
        // Læg skibet med siden til spilleren
        const a1 = toP + Math.PI / 2, a2 = toP - Math.PI / 2;
        want = Math.abs(angDiff(ship.heading, a1)) < Math.abs(angDiff(ship.heading, a2)) ? a1 : a2;
        if (dP < 110) want += Math.sign(angDiff(toP, want)) * 0.5; // ikke for tæt på
      }
      ctrl.turn = this.steer(ship, want, dt);
      ship.sail = dP < 200 ? 1 : 2;
      this.broadside(ship, P, ctrl, Game.aiAim);
    } else {
      ai.hunting = false;
      ship.sail = 1;
      this.follow(ship, ctrl, dt, true);
    }
    return ctrl;
  },

  // Skyd, hvis målet ligger nogenlunde ud for den ene side
  broadside(ship, target, ctrl, aimError) {
    const d = dist(ship, target);
    if (d > 360 || d < 30) return;
    const toT = Math.atan2(target.y - ship.y, target.x - ship.x);
    const rel = angDiff(ship.heading, toT);
    const side = rel > 0 ? 1 : -1;
    if (Math.abs(Math.abs(rel) - Math.PI / 2) > 18 * DEG) return;
    if (ship.reload[side] > 0) return;
    ship.ai.aimT = (ship.ai.aimT || 0) + 1;
    // Find hældning til afstanden, regn krængningen med – og lav en lille fejl, så man kan nå at undvige
    const want = elevForRange(d, ship.gunPower) + side * ship.heel + rand(-aimError, aimError) * 2.2;
    ctrl.setElev = clamp(want, BALL.minElev, BALL.maxElev);
    ship.elev = ctrl.setElev;
    if (side > 0) ctrl.fireR = true; else ctrl.fireL = true;
  },

  // Følg ruten (liste af punkter). Ved ruteslut: handelsskibe forsvinder i havn, sørøvere finder en ny rute.
  follow(ship, ctrl, dt, roam = false) {
    const ai = ship.ai;
    if (!ai.path || ai.i >= ai.path.length) {
      if (roam) this.newRoam(ship);
      else { ship.gone = true; return; }
    }
    const wp = ai.path[ai.i];
    if (dist(ship, wp) < 90) { ai.i++; return; }
    ctrl.turn = this.steer(ship, Math.atan2(wp.y - ship.y, wp.x - ship.x), dt);
    if (!roam) ship.sail = 2;
    // Sidder skibet fast et sted uden for skærmen, flyttes det videre
    ai.stuckT = (ai.stuckT || 0) + dt;
    if (ai.stuckT > 6) {
      if (ai.lastPos && dist(ai.lastPos, ship) < 40 && !Game.onScreen(ship, 200)) { ship.x = wp.x; ship.y = wp.y; ai.i++; }
      ai.lastPos = { x: ship.x, y: ship.y };
      ai.stuckT = 0;
    }
  },

  newRoam(ship) {
    const keys = ship.ai.zone || Object.keys(Sea.nodes);
    const start = Sea.nearestNode(ship);
    const goal = pick(keys);
    ship.ai.path = Sea.route(start, goal);
    ship.ai.i = 0;
  },
};
