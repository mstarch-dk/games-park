// Spillernes fly: flyvning, skud i 5 niveauer, hjerter, skjold og at komme tilbage efter et nedskud.
const MAX_HP = 5;
const MAX_WEAPON = 5;
const MAX_SPECIALS = 5;
const PLAYER_SPEED = 380;
const WEAPON_RATE = [0, 0.17, 0.16, 0.15, 0.13, 0.12];
const RAINBOW = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#c77dff'];

const PLAYER_LOOKS = [
  { body: '#e63946', wing: '#fdf0d5', stripe: '#e63946', nose: '#ffd166', shot: '#ffe14d', name: 'Rød' },
  { body: '#2f80ff', wing: '#ffd60a', stripe: '#2f80ff', nose: '#ffffff', shot: '#7ef9ff', name: 'Blå' },
];

class Player {
  constructor(index, keyset, count) {
    this.index = index;
    this.keyset = keyset;
    this.count = count;
    this.look = PLAYER_LOOKS[index];
    this.weapon = 1;
    this.specials = 2;
    this.prop = 0;
    this.spawn(true);
  }

  homeX() { return this.count === 1 ? W / 2 : W * (this.index === 0 ? 0.35 : 0.65); }

  spawn(first = false) {
    this.alive = true;
    this.waiting = false;
    this.respawnT = 0;
    this.hp = MAX_HP;
    this.x = this.homeX();
    this.y = first ? H - 170 : H + 60;
    this.entering = !first;
    this.invT = first ? 1.5 : 3;
    this.shieldT = 0;
    this.magnetT = 0;
    this.fireCD = 0;
    this.bank = 0;
    this.smokeT = 0;
    if (!first) Sound.respawn();
  }

  update(dt, c) {
    this.prop += dt * 45;
    if (!this.alive) {
      if (this.respawnT > 0) {
        this.respawnT -= dt;
        if (this.respawnT <= 0) this.spawn();
      }
      return;
    }
    this.invT -= dt;
    this.shieldT -= dt;
    this.magnetT -= dt;

    if (this.entering) {
      this.y -= 320 * dt;
      if (this.y <= H - 170) this.entering = false;
    } else {
      let dx = c.dx, dy = c.dy;
      if (dx && dy) { dx *= 0.707; dy *= 0.707; }
      this.x = clamp(this.x + dx * PLAYER_SPEED * dt, 40, W - 40);
      this.y = clamp(this.y + dy * PLAYER_SPEED * dt, 280, H - 50);
      this.bank = lerp(this.bank, c.dx, Math.min(1, dt * 8));
    }

    this.fireCD -= dt;
    if (c.fire && this.fireCD <= 0) {
      this.shoot();
      this.fireCD = WEAPON_RATE[this.weapon];
    }
    if (c.special && this.specials > 0 && !this.entering) {
      this.specials--;
      Game.special(this);
    }
    // Lidt røg når flyet er ved at være slidt – så man kan se at man skal finde et hjerte
    if (this.hp <= 2) {
      this.smokeT -= dt;
      if (this.smokeT <= 0) { Particles.smoke(this.x + rand(-10, 10), this.y + 10, 1, 8, '#9aa5b1'); this.smokeT = 0.12; }
    }
  }

  shoot() {
    const x = this.x, y = this.y - 38, col = this.look.shot, me = this.index;
    const shot = (dx, a, dmg = 1, color = col) => Bullets.firePlayer(x + dx, y, a, dmg, color, me);
    switch (this.weapon) {
      case 1: shot(0, 0); break;
      case 2: shot(-9, 0); shot(9, 0); break;
      case 3: shot(0, 0); shot(-14, -0.12); shot(14, 0.12); break;
      case 4: shot(-8, 0); shot(8, 0); shot(-18, -0.18); shot(18, 0.18); break;
      default:
        [-0.24, -0.12, 0, 0.12, 0.24].forEach((a, i) => shot(a * 50, a, 1, RAINBOW[i]));
    }
    Sound.pew();
  }

  hurt() {
    if (!this.alive || this.invT > 0 || this.entering) return false;
    if (this.shieldT > 0) {
      Sound.shieldHit();
      Particles.sparks(this.x, this.y, 5, '#9bf6ff');
      this.invT = 0.3;
      return false;
    }
    this.hp--;
    this.invT = 1.6;
    Sound.hurt();
    Game.shake(8);
    Particles.smoke(this.x, this.y, 4, 12, '#cfd8e3');
    Particles.sparks(this.x, this.y, 6);
    if (this.hp <= 0) this.down();
    return true;
  }

  down() {
    this.alive = false;
    Particles.explosion(this.x, this.y, 1.5);
    Particles.parachute(this.x, this.y, this.look.body, pick(['Jeg kommer igen!', 'Hov hov!', 'Wiiii!', 'Puha!']));
    Sound.boom();
    Game.shake(16);
    this.weapon = Math.max(1, this.weapon - 1);
    this.shieldT = 0;
    this.magnetT = 0;
    Game.onPlayerDown(this);
  }

  heal(n) { this.hp = Math.min(MAX_HP, this.hp + n); }

  drawShadow() {
    if (this.alive) drawPlaneShadow(this.x, this.y, 0, 1);
  }

  draw() {
    if (!this.alive) return;
    const blink = this.invT > 0 && Math.floor(this.invT * 12) % 2 === 0;
    drawPlane({ x: this.x, y: this.y, look: this.look, bank: this.bank, prop: this.prop, alpha: blink ? 0.45 : 1 });
    if (this.count > 1) Draw.text(this.index === 0 ? '1' : '2', this.x, this.y + 46, 18, this.look.wing);
    if (this.shieldT > 0) {
      const fading = this.shieldT < 2 && Math.floor(this.shieldT * 8) % 2 === 0;
      if (!fading) {
        ctx.globalAlpha = 0.25;
        Draw.circle(this.x, this.y, 54, '#9bf6ff');
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = '#e0fbff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(this.x, this.y, 54, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    if (this.magnetT > 0) {
      ctx.globalAlpha = 0.3 + Math.sin(Game.t * 8) * 0.15;
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
      ctx.beginPath(); ctx.arc(this.x, this.y, 70 + Math.sin(Game.t * 4) * 6, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }
}
