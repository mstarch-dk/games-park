// Turnering i Roskilde: rid mod modstanderen og ram hans skjold med lansen.
// ← → ↑ ↓ styr lansespidsen, HOLD MELLEMRUM for at sænke lansen lige før sammenstødet.
const VP_X = 160, VP_Y = 84, FOCAL = 120, D_FAR = 30, D_HIT = 2.2, RIDE_TIME = 3.4;

const Joust = {
  enter(opts) {
    this.opts = opts; // { opponent: fid|null, stake: 'honour'|'land', onDone(result) }
    this.opp = opts.opponent ? fac(opts.opponent) : { short: 'Den Sorte Ridder', name: 'Den Sorte Ridder', lance: 2, color: '#1a1a1a', light: '#b8b8b8', arms: { field: '#1a1a1a', charge: '#b8b8b8', pattern: 'bend' } };
    this.pass = 0;
    this.score = { me: 0, opp: 0 };
    this.result = null;
    this.startPass();
    Sound.royal();
  },

  startPass() {
    this.pass++;
    this.phase = 'ready'; // ready | ride | impact | between | done
    this.t = 0;
    this.d = D_FAR;
    this.aim = { x: 150, y: 120, vx: 0, vy: 0 };
    this.couch = 0;
    this.msg = `Løb ${this.pass} af 3 – tryk MELLEMRUM for at sætte af!`;
    this.fall = 0; this.meFall = 0;
    this.parts = [];
    this.hoofT = 0;
  },

  sp(X, Y) { return [VP_X + (X * FOCAL) / this.d, VP_Y + (Y * FOCAL) / this.d, FOCAL / this.d]; },

  update(dt) {
    this.t += dt;
    if (this.phase === 'ready') {
      if (Input.hit('Space', 'Enter')) { this.phase = 'ride'; this.t = 0; Sound.royal(); }
    } else if (this.phase === 'ride') {
      const prog = clamp(this.t / RIDE_TIME, 0, 1);
      this.d = D_FAR - (D_FAR - D_HIT) * Math.pow(prog, 1.6);
      this.hoofT -= dt;
      if (this.hoofT <= 0) { Sound.hoof(); this.hoofT = 0.22; }
      // styr lansen – med lidt træghed
      const ax = (Input.down('ArrowRight', 'KeyD') ? 1 : 0) - (Input.down('ArrowLeft', 'KeyA') ? 1 : 0);
      const ay = (Input.down('ArrowDown', 'KeyS') ? 1 : 0) - (Input.down('ArrowUp', 'KeyW') ? 1 : 0);
      const a = this.aim;
      a.vx = (a.vx + ax * 420 * dt) * Math.pow(0.04, dt);
      a.vy = (a.vy + ay * 420 * dt) * Math.pow(0.04, dt);
      // hesten gynger lansen; dårlig lanseføring = mere gyngen
      const skill = fac('player').lance;
      const amp = (5 - skill) * 9 * (this.couch > 1.4 ? 1.8 : 1);
      a.vx += Math.sin(this.t * 7.3) * amp * dt * 3 + Math.sin(this.t * 2.1) * amp * dt * 2;
      a.vy += Math.sin(this.t * 9.1 + 1) * amp * dt * 3;
      a.x = clamp(a.x + a.vx * dt, 60, 310); a.y = clamp(a.y + a.vy * dt, 60, 190);
      if (Input.down('Space')) this.couch += dt; else this.couch = 0;
      if (prog >= 1) this.impact();
    } else if (this.phase === 'impact') {
      if (this.fall) this.fall = Math.min(1, this.fall + dt * 1.4);
      if (this.meFall) this.meFall = Math.min(1, this.meFall + dt * 1.4);
      if (this.t > 2.2) this.phase = this.result ? 'done' : 'between';
    }
    this.parts.forEach((q) => { q.vy += 160 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; });
    this.parts = this.parts.filter((q) => q.life > 0);
  },

  tip() {
    // Uden sænket lanse peger spidsen op i luften
    const up = this.couch > 0 ? 0 : 45;
    return { x: this.aim.x, y: this.aim.y - up };
  },

  impact() {
    this.phase = 'impact'; this.t = 0;
    const tip = this.tip();
    const [sx, sy, s] = this.sp(0.7, 0.15);
    const shieldR = 0.32 * s;
    const [hx, hy] = this.sp(1.0, -0.55);
    const dShield = Math.hypot(tip.x - sx, tip.y - sy);
    let mine = 'miss';
    if (this.couch <= 0) mine = 'raised';
    else if (dShield < shieldR * 0.4) mine = 'center';
    else if (dShield < shieldR) mine = 'shield';
    else if (Math.hypot(tip.x - hx, tip.y - hy) < 0.2 * s) mine = 'helm';
    // modstanderens stød
    const ol = this.opp.lance || 2;
    const oppHits = Math.random() < 0.35 + ol * 0.1;
    const braced = mine === 'center' || mine === 'shield';
    const unhorseMe = oppHits && Math.random() < (braced ? 0.06 + ol * 0.06 : 0.18 + ol * 0.1);

    let msg = '';
    if (mine === 'center') { this.fall = 0.01; msg = 'Fuldtræffer midt på skjoldet! Modstanderen ryger af hesten!'; }
    else if (mine === 'shield') { this.score.me++; msg = 'Lansen splintres mod skjoldet! +1 point'; }
    else if (mine === 'helm') { this.score.me++; msg = 'Du strejfede hjelmen! +1 point'; }
    else if (mine === 'raised') msg = 'Du glemte at sænke lansen (hold MELLEMRUM)!';
    else msg = 'Forbi!';
    if (mine === 'center' || mine === 'shield' || mine === 'helm') {
      Sound.splinter();
      for (let i = 0; i < 24; i++) this.parts.push({ x: tip.x, y: tip.y, vx: rand(-120, 120), vy: rand(-140, 20), life: rand(0.5, 1.2), c: pick([PAL.p1, PAL.p2, PAL.white]) });
    } else Sound.whoosh();
    if (oppHits && !this.fall) {
      if (unhorseMe) { this.meFall = 0.01; msg += ' Men du bliver kastet af hesten!'; }
      else { this.score.opp++; msg += ` ${this.opp.short} rammer dig. +1 til ham.`; }
      Sound.clang();
    }
    this.msg = msg;
    if (this.fall) this.result = 'win';
    else if (this.meFall) this.result = 'lose';
    else if (this.pass >= 3) this.result = this.score.me > this.score.opp ? 'win' : this.score.me < this.score.opp ? 'lose' : 'draw';
    if (this.result === 'win') setTimeout(() => Sound.cheer(), 300);
    if (this.result === 'lose') setTimeout(() => Sound.groan(), 300);
  },

  drawKnight(x) {
    const [cx, cy, s] = this.sp(1.0, 0);
    const o = this.opp;
    x.save();
    x.translate(cx, cy);
    if (this.fall) { x.rotate(this.fall * 1.4); x.translate(this.fall * s * 0.6, -this.fall * s * 0.3); }
    const bob = Math.sin(this.t * 14) * s * 0.03;
    // hest set forfra
    x.fillStyle = PAL.s1;
    x.fillRect(-0.35 * s, 0.4 * s + bob, 0.7 * s, 0.6 * s);
    x.fillStyle = o.color;
    x.beginPath(); x.moveTo(-0.45 * s, 0.25 * s); x.lineTo(0.45 * s, 0.25 * s); x.lineTo(0.55 * s, 1.0 * s); x.lineTo(-0.55 * s, 1.0 * s); x.fill();
    x.fillStyle = o.light;
    x.fillRect(-0.45 * s, 0.25 * s, 0.9 * s, 0.06 * s);
    x.fillStyle = PAL.s1;
    x.fillRect(-0.12 * s, 0.05 * s + bob, 0.24 * s, 0.4 * s);
    x.fillStyle = o.color;
    x.fillRect(-0.12 * s, 0.05 * s + bob, 0.24 * s, 0.12 * s);
    // ben
    x.fillStyle = PAL.s0;
    const g = Math.sin(this.t * 14) * 0.08 * s;
    x.fillRect(-0.3 * s, 1.0 * s, 0.1 * s, 0.5 * s + g); x.fillRect(0.2 * s, 1.0 * s, 0.1 * s, 0.5 * s - g);
    // rytter
    if (!this.fall || this.fall < 1) {
      x.fillStyle = PAL.s3; rrect(x, -0.22 * s, -0.45 * s, 0.44 * s, 0.72 * s, 0.1 * s); x.fill();
      x.fillStyle = o.color; rrect(x, -0.22 * s, -0.22 * s, 0.44 * s, 0.34 * s, 0.06 * s); x.fill();
      x.fillStyle = PAL.s4; rrect(x, -0.14 * s, -0.78 * s, 0.28 * s, 0.36 * s, 0.12 * s); x.fill();
      x.fillStyle = PAL.s0; rrect(x, -0.1 * s, -0.64 * s, 0.2 * s, 0.04 * s, 0.02 * s); x.fill();
      x.strokeStyle = o.light; x.lineWidth = 0.07 * s;
      x.beginPath(); x.moveTo(0, -0.78 * s); x.quadraticCurveTo(0.1 * s, -1.05 * s, -0.15 * s, -1.0 * s); x.stroke();
    }
    x.restore();
    // skjold (på hans venstre side – mod barrieren)
    if (!this.fall) {
      const [sx, sy, ss] = this.sp(0.7, 0.15);
      const r = 0.32 * ss;
      x.fillStyle = o.arms.field;
      x.beginPath(); x.moveTo(sx - r, sy - r); x.lineTo(sx + r, sy - r); x.lineTo(sx + r, sy); x.quadraticCurveTo(sx + r, sy + r * 0.8, sx, sy + r * 1.2); x.quadraticCurveTo(sx - r, sy + r * 0.8, sx - r, sy); x.fill();
      x.fillStyle = o.arms.charge;
      x.fillRect(sx - r * 0.15, sy - r, r * 0.3, r * 2);
      x.fillStyle = PAL.gold; circle(x, sx, sy, Math.max(0.6, r * 0.12));
      x.strokeStyle = PAL.gold; x.lineWidth = Math.max(0.3, r * 0.08);
      x.beginPath(); x.moveTo(sx - r, sy - r); x.lineTo(sx + r, sy - r); x.lineTo(sx + r, sy); x.quadraticCurveTo(sx + r, sy + r * 0.8, sx, sy + r * 1.2); x.quadraticCurveTo(sx - r, sy + r * 0.8, sx - r, sy); x.closePath(); x.stroke();
      // hans lanse peger mod os
      const [lx, ly] = this.sp(1.15, -0.05);
      x.strokeStyle = PAL.p2; x.lineWidth = Math.max(1, 0.06 * ss);
      x.beginPath(); x.moveTo(lx, ly); x.lineTo(lx - (lx - 120) * 0.25, ly + (150 - ly) * 0.25); x.stroke();
    }
  },

  draw(x) {
    Art.bg('joust');
    const shake = this.phase === 'ride' ? Math.sin(this.t * 14) * 1.5 : 0;
    x.save();
    x.translate(0, Math.round(shake));
    // skrankebarrieren i perspektiv
    x.fillStyle = PAL.red0;
    x.beginPath(); x.moveTo(VP_X, VP_Y); x.lineTo(VP_X + 2, VP_Y); x.lineTo(205, 210); x.lineTo(185, 210); x.fill();
    x.fillStyle = PAL.white;
    for (let i = 1; i < 12; i++) {
      const dd = D_FAR - i * 2.5 + ((D_FAR - this.d) % 2.5);
      if (dd < 0.8) continue;
      const px = VP_X + (0.25 * FOCAL) / dd, py = VP_Y + (0.9 * FOCAL) / dd;
      rrect(x, px, py - 6 / dd * 4, 3 / dd * 4, 5 / dd * 4, 0.5); x.fill();
    }
    if (this.phase !== 'ready') this.drawKnight(x);
    else { this.d = D_FAR; this.drawKnight(x); }
    // egen hest: hals og hoved set bagfra
    x.fillStyle = Shade.lin(x, 120, 150, 172, 205, ['#a8784e', '#6a4228']);
    x.beginPath(); x.moveTo(116, 206); x.quadraticCurveTo(126, 172, 139, 159); x.quadraticCurveTo(146, 152, 153, 159);
    x.quadraticCurveTo(166, 172, 174, 206); x.fill();
    x.fillStyle = '#7a4e30';
    x.beginPath(); x.moveTo(137, 162); x.lineTo(138, 151); x.lineTo(142, 158); x.fill();
    x.beginPath(); x.moveTo(155, 162); x.lineTo(154, 151); x.lineTo(150, 158); x.fill();
    x.fillStyle = '#3a2418';
    x.beginPath(); x.moveTo(141, 157); x.quadraticCurveTo(148, 176, 143, 206); x.lineTo(151, 206); x.quadraticCurveTo(153, 176, 151, 157); x.fill();
    x.strokeStyle = '#4a2a18'; x.lineWidth = 0.9;
    x.beginPath(); x.moveTo(128, 196); x.quadraticCurveTo(137, 172, 141, 166); x.moveTo(164, 196); x.quadraticCurveTo(155, 172, 151, 166); x.stroke();
    x.fillStyle = PLAYER_COLOR; rrect(x, 122, 188, 48, 16, 5); x.fill();
    x.fillStyle = PAL.white; x.fillRect(139, 188, 6, 16); x.fillRect(122, 193, 48, 4);
    x.fillStyle = PAL.gold; rrect(x, 122, 187, 48, 1.6, 0.8); x.fill();
    x.restore();
    // egen lanse
    if (!this.meFall) {
      const tip = this.tip();
      x.strokeStyle = PAL.p1; x.lineWidth = 5;
      x.beginPath(); x.moveTo(70, 205); x.lineTo(tip.x, tip.y); x.stroke();
      x.strokeStyle = PAL.p3; x.lineWidth = 1;
      x.beginPath(); x.moveTo(72, 203); x.lineTo(tip.x, tip.y - 1); x.stroke();
      x.fillStyle = PAL.s5; circle(x, tip.x, tip.y, 1.6);
      // skjold/vamplade ved hånden
      x.fillStyle = PAL.s3; x.beginPath(); x.arc(84, 196, 16, 0, Math.PI * 2); x.fill();
      x.fillStyle = PAL.s4; x.beginPath(); x.arc(82, 194, 10, 0, Math.PI * 2); x.fill();
    } else {
      x.globalAlpha = this.meFall * 0.8; x.fillStyle = PAL.sky3; x.fillRect(0, 0, LO_W, LO_H); x.globalAlpha = 1;
    }
    this.parts.forEach((q) => { x.strokeStyle = q.c; x.lineWidth = 0.8; x.beginPath(); x.moveTo(q.x, q.y); x.lineTo(q.x + q.vx * 0.02, q.y + q.vy * 0.02); x.stroke(); });
  },

  drawUI(ctx) {
    UI.title(ctx, 'Turneringen i Roskilde', 480, 36, 32);
    UI.text(ctx, `${fac('player').short}  ${this.score.me}  –  ${this.score.opp}  ${this.opp.short}`, 480, 74, 22, PARCH, 'center', true);
    UI.text(ctx, this.opts.stake === 'land' ? 'Der rides om land!' : 'Der rides om ære og guld', 480, 100, 17, PARCH, 'center');
    if (this.phase === 'ride' && this.couch > 1.4) UI.text(ctx, 'Armen bliver træt!', 480, 130, 20, '#ff8080', 'center', true);
    UI.caption(ctx, this.phase === 'ride' ? 'Ram skjoldet! ← → ↑ ↓ sigt · HOLD MELLEMRUM lige før stødet' : this.msg);
    if (this.phase === 'between') UI.button(ctx, 380, 470, 200, 50, `Løb ${this.pass + 1}`, { onClick: () => this.startPass() });
    if (this.phase === 'done') {
      const t = { win: 'Du vandt turneringen!', lose: 'Du tabte turneringen…', draw: 'Uafgjort!' }[this.result];
      UI.panel(ctx, 300, 200, 360, 120);
      UI.text(ctx, t, 480, 240, 28, this.result === 'win' ? '#244a1c' : '#701018', 'center', true);
      UI.button(ctx, 400, 262, 160, 44, 'Videre', { onClick: () => this.opts.onDone(this.result) });
    }
  },
};
