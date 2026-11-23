// Ællingen: hopper ét felt ad gangen og flagrer tilbage til fortovet, hvis en bil dytter.
const HOP_TIME = 0.16;
const FLY_TIME = 0.9;

class Duck {
  constructor(c, r) {
    this.c = c; this.r = r;
    this.fc = c; this.fr = r; this.tc = c; this.tr = r;
    this.hopping = false;
    this.hopT = 0;
    this.face = 1;
    this.lastSafe = r;
    this.fly = null;
    this.home = null;
    this.queued = null;
    this.holdT = 0;
    this.still = 0;
    this.lookT = 0;
  }

  // Midtpunkt i felter (x, y) og højde over jorden (h)
  pos() {
    if (this.fly) {
      const f = this.fly, e = f.t;
      return { x: f.fx + (f.tc + 0.5 - f.fx) * e, y: f.fy + (f.tr + 0.5 - f.fy) * e, h: Math.sin(Math.PI * e) * 1.6 };
    }
    if (this.hopping) {
      const e = this.hopT;
      return { x: this.fc + (this.tc - this.fc) * e + 0.5, y: this.fr + (this.tr - this.fr) * e + 0.5, h: Math.sin(Math.PI * e) * 0.3 };
    }
    return { x: this.c + 0.5, y: this.r + 0.5, h: 0 };
  }

  rowNow() { return this.hopping ? (this.hopT < 0.5 ? this.fr : this.tr) : this.r; }
  busy() { return !!this.fly || !!this.home; }

  tryHop(d) {
    const nc = this.c + d.dc, nr = this.r + d.dr;
    if (d.dc) this.face = d.dc;
    if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return false;
    this.fc = this.c; this.fr = this.r; this.tc = nc; this.tr = nr;
    this.hopping = true;
    this.hopT = 0;
    this.still = 0;
    Sound.hop();
    return true;
  }

  startFly(toRow) {
    const p = this.pos();
    const tc = Math.max(0, Math.min(COLS - 1, Math.round(p.x - 0.5)));
    this.fly = { fx: p.x, fy: p.y, tc, tr: toRow, t: 0 };
    this.hopping = false;
    this.queued = null;
  }

  update(dt, game) {
    if (this.fly) {
      this.fly.t += dt / FLY_TIME;
      if (this.fly.t >= 1) {
        this.c = this.fly.tc; this.r = this.fly.tr;
        this.fly = null;
        this.still = 0;
        game.afterBump();
      }
      return;
    }
    if (this.home) return;

    const d = game.inputDir();
    if (d) { this.queued = d; this.holdT = 0; }
    const held = Input.heldDir();
    this.holdT = held ? this.holdT + dt : 0;

    if (this.hopping) {
      this.hopT += dt / HOP_TIME;
      if (this.hopT >= 1) {
        this.hopping = false;
        this.c = this.tc; this.r = this.tr;
        game.onLand(this);
      }
    }
    if (!this.hopping && !this.home) {
      if (this.queued) { this.tryHop(this.queued); this.queued = null; }
      else if (held && this.holdT > 0.3) { this.tryHop(held); this.holdT = 0.12; }
    }
    if (!this.hopping) this.still += dt;

    // Står ællingen og venter ved vejen, kigger den til begge sider.
    this.lookT += dt;
    const nearRoad = !game.world.isRoad(this.r) && (game.world.isRoad(this.r - 1) || game.world.isRoad(this.r + 1));
    if (!this.hopping && nearRoad && this.still > 1 && this.lookT > 0.8) {
      this.face = -this.face;
      this.lookT = 0;
    }
  }
}
