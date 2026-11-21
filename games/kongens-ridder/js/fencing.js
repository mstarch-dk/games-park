// Fægtning: dueller i borgens sal. Se hvor modstanderen holder sværdet – og hug et andet sted.
// ↑ højt hug · → stød · ↓ lavt hug · ← parér (når han svinger sværdet)
const LINES = { high: -0.9, mid: 0, low: 0.6 };
const FLOOR_Y = 172;

const Fencing = {
  enter(opts) {
    this.opts = opts; // { foes:[{name,sword,color}], title, onDone(win) }
    this.foeIdx = 0;
    const p = fac('player');
    this.me = this.fighter(p.short, PLAYER_COLOR, 3 + p.sword, p.sword, 1);
    this.startFoe();
  },

  fighter(name, color, hp, skill, dir) {
    return { name, color, hp, max: hp, skill, dir, x: dir > 0 ? 120 : 200, state: 'guard', line: 'mid', t: 0, fall: 0, flash: 0, nextGuard: 1, nextAtk: 2 };
  },

  startFoe() {
    const f = this.opts.foes[this.foeIdx];
    this.foe = this.fighter(f.name, f.color, 3 + f.sword * 2, f.sword, -1);
    this.foe.nextAtk = 1.6;
    this.me.x = 120; this.me.state = 'guard';
    this.phase = 'intro'; this.t = 0;
    this.msg = `${f.name} trækker sværdet!`;
    this.sparks = [];
    Sound.clang();
  },

  hitTest(att, def, line) {
    // forsvareren blokerer med parade, eller hvis hans garde dækker linjen
    if (def.state === 'parry') return 'parried';
    if ((def.state === 'guard') && def.line === line) return 'blocked';
    return 'hit';
  },

  spark(x, y, c) { for (let i = 0; i < 10; i++) this.sparks.push({ x, y, vx: rand(-60, 60), vy: rand(-80, 10), life: rand(0.2, 0.5), c }); },

  land(att, def) {
    const r = this.hitTest(att, def, att.line);
    const sx = (att.x + def.x) / 2, sy = FLOOR_Y - 26 + LINES[att.line] * 14;
    if (r === 'hit') {
      def.hp--; def.flash = 0.3; def.state = 'hurt'; def.t = 0;
      def.x = clamp(def.x - def.dir * 8, 60, 260);
      this.spark(sx, sy, PAL.red1); Sound.hurt();
      return true;
    }
    this.spark(sx, sy, PAL.gold); Sound.clang();
    if (r === 'parried') { att.state = 'stunned'; att.t = 0; }
    return false;
  },

  attack(f, line) {
    if (!['guard', 'parry'].includes(f.state)) return;
    f.state = 'windup'; f.line = line; f.t = 0;
    Sound.swish();
  },

  stepFighter(f, other, dt, isFoe) {
    f.t += dt;
    f.flash = Math.max(0, f.flash - dt);
    const wind = isFoe ? Math.max(0.28, 0.62 - f.skill * 0.08 + fac('player').sword * 0.05) : (f.line === 'mid' ? 0.1 : 0.16);
    switch (f.state) {
      case 'windup': if (f.t >= wind) { f.state = 'strike'; f.t = 0; this.land(f, other); } break;
      case 'strike': if (f.t >= 0.15) { f.state = 'recover'; f.t = 0; } break;
      case 'recover': if (f.t >= (isFoe ? 0.35 : 0.3)) { f.state = 'guard'; f.t = 0; } break;
      case 'parry': if (f.t >= 0.35) { f.state = 'guard'; f.t = 0; } break;
      case 'stunned': if (f.t >= 0.75) { f.state = 'guard'; f.t = 0; } break;
      case 'hurt': if (f.t >= 0.3) { f.state = 'guard'; f.t = 0; } break;
      default: break;
    }
  },

  update(dt) {
    this.t += dt;
    const me = this.me, foe = this.foe;
    this.sparks.forEach((s) => { s.vy += 200 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; });
    this.sparks = this.sparks.filter((s) => s.life > 0);
    if (this.phase === 'intro') { if (this.t > 1.2) { this.phase = 'fight'; this.msg = ''; } return; }
    if (this.phase !== 'fight') {
      if (me.hp <= 0) me.fall = Math.min(1, me.fall + dt * 2);
      if (foe.hp <= 0) foe.fall = Math.min(1, foe.fall + dt * 2);
      return;
    }
    if (Input.hit('ArrowUp', 'KeyW')) this.attack(me, 'high');
    if (Input.hit('ArrowRight', 'KeyD')) this.attack(me, 'mid');
    if (Input.hit('ArrowDown', 'KeyS')) this.attack(me, 'low');
    if (Input.hit('ArrowLeft', 'KeyA') && ['guard', 'recover'].includes(me.state)) { me.state = 'parry'; me.t = 0; }
    this.stepFighter(me, foe, dt, false);
    this.stepFighter(foe, me, dt, true);

    // modstanderens hjerne
    if (foe.state === 'guard') {
      foe.nextGuard -= dt; foe.nextAtk -= dt;
      if (foe.nextGuard <= 0) { foe.line = pick(['high', 'mid', 'low']); foe.nextGuard = rand(0.7, 1.6) - foe.skill * 0.1; }
      if (foe.nextAtk <= 0) { this.attack(foe, pick(['high', 'mid', 'low'])); foe.nextAtk = rand(1.0, 2.2) - foe.skill * 0.15; }
      // dygtige modstandere skifter garde når du svinger
      if (me.state === 'windup' && me.t < 0.03 && Math.random() < foe.skill * 0.12) foe.line = me.line;
    }
    if (me.state === 'guard') me.line = 'mid';

    if (foe.hp <= 0) {
      this.phase = 'foeDown'; this.t = 0;
      this.msg = `${foe.name} er besejret!`;
      Sound.groan();
    } else if (me.hp <= 0) {
      this.phase = 'lost'; this.t = 0;
      this.msg = 'Du blev overvundet…';
      Sound.defeat();
    }
  },

  drawFighter(x, f) {
    x.save();
    x.translate(f.x, FLOOR_Y);
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(0, 0, 10, 2, 0, 0, Math.PI * 2); x.fill();
    if (f.fall) { x.rotate(-f.dir * f.fall * 1.4); }
    x.scale(f.dir, 1);
    const lunge = f.state === 'strike' ? 6 : f.state === 'windup' ? -2 : 0;
    x.translate(lunge, 0);
    x.lineCap = 'round';
    // ben og støvler
    x.strokeStyle = '#3a3040'; x.lineWidth = 3;
    const fwd = f.state === 'strike' ? 7 : 4;
    x.beginPath(); x.moveTo(-1, -17); x.lineTo(-5, -1); x.moveTo(2, -17); x.lineTo(fwd, -1); x.stroke();
    x.fillStyle = '#4a3020'; rrect(x, -7, -2, 5, 2.5, 1); x.fill(); rrect(x, fwd - 1.5, -2, 5, 2.5, 1); x.fill();
    // krop med våbenkjole
    const body = f.flash > 0 ? PAL.white : f.color;
    x.fillStyle = body;
    x.beginPath(); x.moveTo(-6, -34); x.lineTo(6, -34); x.lineTo(8, -15); x.lineTo(-8, -15); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.18)'; x.beginPath(); x.moveTo(-6, -34); x.lineTo(-1, -34); x.lineTo(-3, -15); x.lineTo(-8, -15); x.fill();
    x.fillStyle = PAL.gold; rrect(x, -7, -20, 14, 2, 1); x.fill();
    // hoved med hjelm og fjer
    x.fillStyle = PAL.skin; circle(x, 0.5, -38.5, 4);
    x.fillStyle = PAL.s4; x.beginPath(); x.arc(0.5, -39.5, 4.4, Math.PI, 0); x.fill();
    x.fillStyle = PAL.s3; rrect(x, -4.2, -40, 9.4, 1.4, 0.7); x.fill();
    x.fillStyle = PAL.s0; circle(x, 3, -38, 0.6);
    x.strokeStyle = f.dir > 0 ? PAL.red1 : PAL.gold; x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(0, -44); x.quadraticCurveTo(-5, -48, -8, -44); x.stroke();
    // arm og sværd
    let ang = LINES[f.line] * 0.8;
    let reach = 8;
    if (f.state === 'windup') { ang = LINES[f.line] - 1.6; reach = 2; }
    if (f.state === 'strike') { ang = LINES[f.line] * 0.5; reach = 14; }
    if (f.state === 'parry') { ang = -1.3; reach = 6; }
    if (f.state === 'stunned' || f.state === 'hurt') { ang = 1.2; reach = 4; }
    const sx = 4, sy = -30;
    const hx = sx + Math.cos(ang * 0.5) * reach, hy = sy + Math.sin(ang * 0.5) * reach * 0.6;
    x.strokeStyle = body; x.lineWidth = 3;
    x.beginPath(); x.moveTo(sx, sy); x.lineTo(hx, hy); x.stroke();
    x.strokeStyle = PAL.s5; x.lineWidth = 1.3;
    x.beginPath(); x.moveTo(hx, hy); x.lineTo(hx + Math.cos(ang) * 22, hy + Math.sin(ang) * 22); x.stroke();
    x.strokeStyle = PAL.gold; x.lineWidth = 1.2;
    const px = -Math.sin(ang) * 2.5, py = Math.cos(ang) * 2.5;
    x.beginPath(); x.moveTo(hx - px, hy - py); x.lineTo(hx + px, hy + py); x.stroke();
    x.fillStyle = PAL.skin; circle(x, hx, hy, 1.4);
    x.restore();
  },

  draw(x) {
    Art.bg('hall');
    [[110, 60], [210, 60]].forEach(([tx, ty], i) => {
      x.fillStyle = '#4a3020'; rrect(x, tx - 1.5, ty, 3, 9, 1); x.fill();
      const fl = Math.sin(this.t * 13 + i * 2);
      Shade.glow(x, tx, ty - 3, 18, '#ffb050', 0.3 + fl * 0.05);
      x.fillStyle = PAL.dusk1; x.beginPath(); x.ellipse(tx, ty - 2, 2.4, 4 + fl * 0.5, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = PAL.gold; x.beginPath(); x.ellipse(tx, ty - 1.5, 1.2, 2.4 + fl * 0.4, 0, 0, Math.PI * 2); x.fill();
    });
    this.drawFighter(x, this.foe);
    this.drawFighter(x, this.me);
    this.sparks.forEach((s) => { x.fillStyle = s.c; x.globalAlpha = clamp(s.life * 3, 0, 1); circle(x, s.x, s.y, 0.8); });
    x.globalAlpha = 1;
  },

  hearts(ctx, f, x, align) {
    UI.panel(ctx, align === 'left' ? x - 20 : x - 230, 58, 250, 66, true);
    UI.text(ctx, f.name, x, 80, 20, PARCH, align, true);
    let s = '';
    for (let i = 0; i < f.max; i++) s += i < f.hp ? '♥' : '♡';
    UI.text(ctx, s, x, 106, 22, '#e04040', align);
  },

  drawUI(ctx) {
    UI.title(ctx, this.opts.title || 'Duel', 480, 36, 32);
    this.hearts(ctx, this.me, 40, 'left');
    this.hearts(ctx, this.foe, 920, 'right');
    if (this.opts.foes.length > 1) UI.text(ctx, `Modstander ${this.foeIdx + 1} af ${this.opts.foes.length}`, 480, 74, 17, PARCH, 'center');
    if (this.phase === 'fight' && this.foe.state === 'windup') UI.text(ctx, '← PARÉR!', 480, 130, 26, GOLD, 'center', true);
    UI.caption(ctx, this.msg || '↑ højt hug · → stød · ↓ lavt hug · ← parér   –   hug hvor han ikke dækker!');
    if (this.phase === 'foeDown' && this.t > 0.8) {
      const more = this.foeIdx + 1 < this.opts.foes.length;
      UI.button(ctx, 380, 470, 200, 50, more ? 'Næste vagt!' : 'Videre', {
        onClick: () => { if (more) { this.foeIdx++; this.startFoe(); } else this.opts.onDone(true); },
      });
    }
    if (this.phase === 'lost' && this.t > 0.8) UI.button(ctx, 380, 470, 200, 50, 'Videre', { onClick: () => this.opts.onDone(false) });
  },
};
