// Belejring: skyd med katapulten mod borgmuren, indtil den er brudt.
// ↑↓ kraft, ← → vælg sten eller ildkrukke, MELLEMRUM kast.
const BLOCK_W = 6, BLOCK_H = 5, WALL_X = 226, WALL_BASE = 150, WALL_COLS = 12;
const CAT_X = 46, CAT_Y = 156, GRAV = 120, BREACH = 0.6;

const Siege = {
  enter(opts) {
    this.opts = opts;
    const r = G.regions[opts.rid];
    this.castle = r.castle;
    this.rows = 4 + r.castle * 2;
    this.blocks = [];
    for (let row = 0; row < this.rows; row++) for (let c = 0; c < WALL_COLS; c++) this.blocks.push({ c, row, alive: true });
    this.total = this.blocks.length;
    const cats = Math.max(1, opts.catapults);
    this.shots = Math.min(14, 5 + cats * 3);
    this.fire = 1 + Math.floor(cats / 2);
    this.shotNo = 0;
    this.day = 1;
    this.power = 0.5;
    this.ammo = 'stone';
    this.wind = rand(-1, 1);
    this.proj = null;
    this.parts = [];
    this.arm = 0;          // katapultarmens vinkel-animation 0..1
    this.lastLand = null;
    this.phase = 'aim';    // aim | flying | breached | out | night
    this.t = 0;
    this.msg = 'Sigt på muren! ↑↓ kraft · ← → ammunition · MELLEMRUM kast';
    this.killed = 0;
    this.repairT = 0;
    UI.focus = 0;
    Sound.march();
  },

  integrity() { return this.blocks.filter((b) => b.alive).length / this.total; },
  blockRect(b) { return [WALL_X + b.c * BLOCK_W, WALL_BASE - (b.row + 1) * BLOCK_H, BLOCK_W, BLOCK_H]; },
  wallValue() { return clamp((this.integrity() - 0.25) / 0.75, 0, 1); },

  throwShot() {
    if (this.ammo === 'fire' && this.fire <= 0) this.ammo = 'stone';
    if (this.ammo === 'fire') this.fire--;
    const ang = 0.88, v = 90 + this.power * 95;
    this.proj = { x: CAT_X + 10, y: CAT_Y - 20, vx: Math.cos(ang) * v, vy: -Math.sin(ang) * v, kind: this.ammo, trail: [] };
    this.shotNo++;
    this.arm = 0.01;
    this.phase = 'flying';
    Sound.whoosh();
  },

  smash(px, py, radius) {
    let n = 0;
    this.blocks.forEach((b) => {
      if (!b.alive) return;
      const [x, y] = this.blockRect(b);
      const d = Math.hypot(x + 3 - px, y + 2.5 - py);
      if (d < radius + Math.random() * 3) {
        b.alive = false; n++;
        for (let i = 0; i < 4; i++) this.parts.push({ x: x + 3, y: y + 2, vx: rand(-30, 40), vy: rand(-50, -10), life: rand(1, 2), c: pick([PAL.s3, PAL.s4, PAL.s2]), g: 1 });
      }
    });
    // Blokke uden noget under sig falder også ned
    let changed = true;
    while (changed) {
      changed = false;
      this.blocks.forEach((b) => {
        if (!b.alive || b.row === 0) return;
        const below = this.blocks.find((o) => o.c === b.c && o.row === b.row - 1);
        if (!below.alive && Math.random() < 0.6) { b.alive = false; changed = true; }
      });
    }
    return n;
  },

  landed(kind, x, y, hitWall) {
    this.proj = null;
    this.lastLand = { x, y };
    if (hitWall) {
      const n = this.smash(x, y, kind === 'fire' ? 16 : 9);
      if (kind === 'fire') {
        Sound.fire();
        for (let i = 0; i < 30; i++) this.parts.push({ x, y, vx: rand(-40, 40), vy: rand(-70, -10), life: rand(0.6, 1.6), c: pick([PAL.gold, PAL.dusk0, PAL.dusk1, PAL.red1]), g: 0.3 });
      } else Sound.crash();
      this.msg = n ? `Fuldtræffer! ${n} sten styrtede ned.` : 'Muren holdt…';
    } else if (x > WALL_X + WALL_COLS * BLOCK_W) {
      // Over muren og ind i borggården
      const k = kind === 'fire' ? randi(1, 3) : randi(0, 1);
      this.killed += k;
      this.msg = k ? `Over muren! ${k} forsvarer${k > 1 ? 'e' : ''} ramt.` : 'For langt – over muren.';
      Sound.thunk();
    } else {
      this.msg = 'For kort! Stenen landede i græsset.';
      Sound.thunk();
      for (let i = 0; i < 10; i++) this.parts.push({ x, y, vx: rand(-20, 20), vy: rand(-30, -5), life: 0.8, c: PAL.s2, g: 1 });
    }
    this.wind = clamp(this.wind + rand(-0.5, 0.5), -1, 1);
    if (this.integrity() <= BREACH) { this.phase = 'breached'; this.msg = 'Muren er brudt! Til storm!'; Sound.royal(); return; }
    if (this.shotNo >= this.shots) { this.phase = 'out'; this.msg = 'Belejringen er forbi – stenene er brugt op.'; Sound.groan(); return; }
    if (this.shotNo % 3 === 0) { this.phase = 'night'; this.t = 0; this.repairT = 0; return; }
    this.phase = 'aim';
  },

  repair() {
    // Om natten lapper forsvarerne muren – nederst først
    let n = this.castle + 1;
    const dead = this.blocks.filter((b) => !b.alive).sort((a, b) => a.row - b.row);
    for (const b of dead) {
      if (n <= 0) break;
      const below = this.blocks.find((o) => o.c === b.c && o.row === b.row - 1);
      if (b.row === 0 || below.alive) { b.alive = true; n--; }
    }
  },

  update(dt) {
    this.t += dt;
    if (this.arm > 0) this.arm = Math.min(1, this.arm + dt * 5);
    if (this.phase === 'aim') {
      if (Input.down('ArrowUp', 'KeyW')) this.power = clamp(this.power + dt * 0.35, 0, 1);
      if (Input.down('ArrowDown', 'KeyS')) this.power = clamp(this.power - dt * 0.35, 0, 1);
      if (Input.left() || Input.right()) { this.ammo = this.ammo === 'stone' && this.fire > 0 ? 'fire' : 'stone'; Sound.tick(); }
      if (Input.hit('Space')) this.throwShot();
      if (this.arm >= 1) this.arm = 0;
    } else if (this.phase === 'flying' && this.proj) {
      const p = this.proj;
      const steps = 4;
      for (let s = 0; s < steps && this.proj; s++) {
        const h = dt / steps;
        p.vx += this.wind * 14 * h;
        p.vy += GRAV * h;
        p.x += p.vx * h; p.y += p.vy * h;
        const hit = this.blocks.find((b) => {
          if (!b.alive) return false;
          const [x, y, w, hh] = this.blockRect(b);
          return p.x >= x && p.x < x + w && p.y >= y && p.y < y + hh;
        });
        if (hit) { this.landed(p.kind, p.x, p.y, true); break; }
        if (p.y >= this.groundY(p.x)) { this.landed(p.kind, p.x, p.y, false); break; }
      }
      if (this.proj) {
        p.trail.push([p.x, p.y]);
        if (p.trail.length > 8) p.trail.shift();
        if (p.kind === 'fire') this.parts.push({ x: p.x, y: p.y, vx: rand(-5, 5), vy: rand(-10, 0), life: 0.4, c: pick([PAL.gold, PAL.dusk0]), g: 0 });
      }
    } else if (this.phase === 'night') {
      if (this.t > 1.2 && !this.repairT) { this.repair(); this.repairT = 1; this.day++; }
      if (this.t > 2.4) { this.phase = 'aim'; this.msg = `Dag ${this.day}. Forsvarerne har lappet muren i nat.`; }
    }
    this.parts.forEach((q) => { q.vy += GRAV * q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; if (q.y > this.groundY(q.x)) { q.y = this.groundY(q.x); q.vx *= 0.5; q.vy = 0; } });
    this.parts = this.parts.filter((q) => q.life > 0);
  },

  groundY(x) {
    if (x < 175) return 158;
    if (x < WALL_X) return 158 - (x - 175) * 0.16;
    return WALL_BASE;
  },

  draw(x) {
    Art.bg('siege');
    if (this.phase === 'night') {
      const a = Math.sin(clamp(this.t / 2.4, 0, 1) * Math.PI) * 0.7;
      x.globalAlpha = a; x.fillStyle = PAL.night; x.fillRect(0, 0, LO_W, LO_H); x.globalAlpha = 1;
    }
    const right = WALL_X + WALL_COLS * BLOCK_W;
    const top = WALL_BASE - this.rows * BLOCK_H;
    const owner = G.regions[this.opts.rid].owner;
    const ocol = owner ? ownerColor(owner) : PAL.p0;
    // tårne
    const tower = (tx, tw, th) => {
      x.fillStyle = Shade.lin(x, tx, 0, tx + tw, 0, [PAL.s4, PAL.s3, PAL.s2]);
      rrect(x, tx, WALL_BASE - th, tw, th, 1); x.fill();
      x.fillStyle = Shade.mix(ocol === '#2a2a2a' ? '#555555' : ocol, '#000000', 0.1);
      x.beginPath(); x.moveTo(tx - 2, WALL_BASE - th); x.lineTo(tx + tw / 2, WALL_BASE - th - tw * 1.2); x.lineTo(tx + tw + 2, WALL_BASE - th); x.fill();
      x.fillStyle = PAL.s0; rrect(x, tx + tw / 2 - 1.5, WALL_BASE - th + 8, 3, 5, 1.5); x.fill();
    };
    tower(right + 1, 18, this.rows * BLOCK_H + 26);
    tower(WALL_X - 13, 13, this.rows * BLOCK_H + 12);
    // flag viser vinden
    const fx = right + 10, fy = top - 26 - 18 * 1.2;
    x.strokeStyle = PAL.s0; x.lineWidth = 0.6;
    x.beginPath(); x.moveTo(fx, fy + 2); x.lineTo(fx, fy - 10); x.stroke();
    const wl = this.wind * 10 || 0.5;
    x.fillStyle = ocol;
    x.beginPath(); x.moveTo(fx, fy - 10); x.quadraticCurveTo(fx + wl * 0.5, fy - 11 + Math.sin(this.t * 6), fx + wl, fy - 8); x.lineTo(fx, fy - 6); x.fill();
    // muren
    this.blocks.forEach((b) => {
      if (!b.alive) return;
      const [bx, by, w, h] = this.blockRect(b);
      const off = b.row % 2 ? 0 : 0;
      x.fillStyle = (b.c * 7 + b.row * 3) % 5 === 0 ? PAL.s3 : PAL.s4;
      rrect(x, bx + 0.25 + off, by + 0.25, w - 0.5, h - 0.5, 1); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(bx + 1, by + 0.6, w - 2, 0.6);
      if (b.row === this.rows - 1 && b.c % 2 === 0) { x.fillStyle = PAL.s4; rrect(x, bx + 0.3, by - 3, BLOCK_W - 0.6, 3.2, 0.8); x.fill(); }
    });
    // katapult
    x.save(); x.translate(CAT_X, CAT_Y);
    x.fillStyle = 'rgba(0,0,0,0.2)'; x.beginPath(); x.ellipse(2, 3, 16, 2, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#7a4e2a'; x.lineWidth = 2.2;
    x.beginPath(); x.moveTo(-10, -2); x.lineTo(14, -2); x.stroke();
    x.lineWidth = 1.8; x.beginPath(); x.moveTo(-4, -2); x.lineTo(2, -15); x.lineTo(8, -2); x.stroke();
    [-6, 9].forEach((wx) => { x.fillStyle = '#5a3a20'; circle(x, wx, 0, 3); x.fillStyle = PAL.p1; circle(x, wx, 0, 1); });
    const ang = this.arm > 0 ? -2.6 + this.arm * 1.9 : -2.6;
    x.translate(2, -14); x.rotate(ang + Math.PI);
    x.strokeStyle = '#a06a38'; x.lineWidth = 1.6;
    x.beginPath(); x.moveTo(-3, 0); x.lineTo(21, 0); x.stroke();
    x.fillStyle = '#5a3a20'; x.beginPath(); x.arc(22, 0, 2.6, 0, Math.PI); x.fill();
    x.restore();
    Art.soldier(x, CAT_X - 16, CAT_Y, PLAYER_COLOR, 1, 0, false);
    Art.soldier(x, CAT_X + 20, CAT_Y, PLAYER_COLOR, 1, 0, false);
    // projektil
    if (this.proj) {
      const p = this.proj;
      p.trail.forEach(([tx, ty], i) => { x.fillStyle = p.kind === 'fire' ? 'rgba(255,180,80,0.5)' : 'rgba(255,255,255,0.35)'; circle(x, tx, ty, 0.4 + i * 0.12); });
      if (p.kind === 'fire') { Shade.glow(x, p.x, p.y, 6, '#ffb040', 0.7); x.fillStyle = PAL.gold; } else x.fillStyle = PAL.s1;
      circle(x, p.x, p.y, 1.8);
    }
    if (this.lastLand && this.phase === 'aim') {
      x.strokeStyle = PAL.red1; x.lineWidth = 0.6;
      const lx = this.lastLand.x, ly = this.lastLand.y;
      x.beginPath(); x.moveTo(lx - 2, ly - 2); x.lineTo(lx + 2, ly + 2); x.moveTo(lx + 2, ly - 2); x.lineTo(lx - 2, ly + 2); x.stroke();
    }
    this.parts.forEach((q) => { x.fillStyle = q.c; x.globalAlpha = clamp(q.life * 2, 0, 1); circle(x, q.x, q.y, 1.1); });
    x.globalAlpha = 1;
  },

  drawUI(ctx) {
    UI.title(ctx, `Belejringen af ${MapData.regions[this.opts.rid].name}`, 480, 36, 32);
    UI.panel(ctx, 16, 64, 230, 150, true);
    UI.text(ctx, `Dag ${this.day}`, 34, 92, 20, GOLD, 'left', true);
    UI.text(ctx, `Kast tilbage: ${this.shots - this.shotNo}`, 34, 120, 18, PARCH);
    UI.text(ctx, `Ildkrukker: ${this.fire}`, 34, 144, 18, PARCH);
    UI.text(ctx, `Muren: ${Math.round(this.integrity() * 100)}%  (brud ved 60%)`, 34, 168, 16, PARCH);
    const wd = this.wind > 0.15 ? 'vind →' : this.wind < -0.15 ? '← vind' : 'stille';
    UI.text(ctx, `Vind: ${wd}`, 34, 192, 16, PARCH);
    // kraftmåler
    ctx.fillStyle = '#2a1a08'; ctx.fillRect(260, 72, 30, 140);
    const ph = 132 * this.power;
    const grd = ctx.createLinearGradient(0, 212, 0, 72);
    grd.addColorStop(0, '#3c6c28'); grd.addColorStop(0.6, '#f0c838'); grd.addColorStop(1, '#b82830');
    ctx.fillStyle = grd; ctx.fillRect(264, 208 - ph, 22, ph);
    UI.text(ctx, 'Kraft', 275, 226, 15, PARCH, 'center');
    UI.text(ctx, this.ammo === 'fire' ? '🔥 Ildkrukke' : '🪨 Sten', 312, 92, 20, PARCH, 'left', true);
    UI.caption(ctx, this.phase === 'night' ? 'Natten falder på…' : this.msg);
    if (this.phase === 'breached') {
      UI.button(ctx, 380, 470, 200, 50, 'Storm borgen!', { onClick: () => this.opts.onDone('storm', this.wallValue(), this.killed) });
    } else if (this.phase === 'out') {
      UI.button(ctx, 250, 470, 220, 50, 'Storm alligevel', { onClick: () => this.opts.onDone('storm', this.wallValue(), this.killed) });
      UI.button(ctx, 490, 470, 220, 50, 'Træk tilbage', { onClick: () => this.opts.onDone('retreat', 1, this.killed) });
    }
  },
};
