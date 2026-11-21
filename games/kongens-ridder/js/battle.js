// Slag: regnes ud i runder. Spilleren vælger taktik hver runde og ser hærene støde sammen.
const TACTICS = {
  attack: { label: 'Angreb!', dmg: 1.3, taken: 1.15 },
  hold: { label: 'Stå fast', dmg: 0.8, taken: 0.7 },
  bombard: { label: 'Bombardér', dmg: 0.6, taken: 0.85 },
  retreat: { label: 'Tilbagetog', dmg: 0, taken: 1 },
};

const War = {
  leadMul(fid) { return fid ? 0.8 + 0.15 * fac(fid).lead + (fac(fid).princess ? 0.1 : 0) : 0.85; },

  // Fordel tab (i "styrkepoint") på fodfolk og riddere
  applyLoss(u, pts) {
    let footPts = pts * 0.7, kPts = pts * 0.3;
    if (u.k <= 0) { footPts += kPts; kPts = 0; }
    if (u.f <= 0) { kPts += footPts; footPts = 0; }
    const fl = Math.min(u.f, Math.round(footPts));
    const kl = Math.min(u.k, Math.round(kPts / 3 + (Math.random() < (kPts / 3) % 1 ? 1 : 0)));
    u.f -= fl; u.k -= kl;
    return { f: fl, k: kl };
  },

  // Én runde. A angriber D. wall = 0..1 af murens styrke der står tilbage, castle = borgniveau.
  round(b, tA, tD) {
    const A = b.atk, D = b.def;
    const wallF = 1 + 0.55 * b.castle * b.wall;
    let powA = Economy.armyPower(A) * this.leadMul(b.attacker) * TACTICS[tA].dmg * rand(0.8, 1.2);
    if (tA === 'bombard') powA += (A.c || 0) * 5 * (b.castle ? 1.5 : 1);
    const powD = Economy.armyPower(D) * this.leadMul(b.defender) * TACTICS[tD].dmg * rand(0.8, 1.2) * (1 + 0.2 * b.castle * b.wall);
    const lossA = this.applyLoss(A, powD * 0.24 * TACTICS[tA].taken);
    const lossD = this.applyLoss(D, (powA * 0.24 * TACTICS[tD].taken) / wallF);
    b.rounds++;
    return { lossA, lossD };
  },

  // Saml forsvarerne: områdets garnison + ejerens hær hvis den står der
  gatherDefence(rid) {
    const r = G.regions[rid];
    const owner = fac(r.owner);
    const armyHere = owner && owner.army.at === rid && !Economy.armyEmpty(owner.army);
    return {
      units: { f: r.gar.f + (armyHere ? owner.army.f : 0), k: r.gar.k + (armyHere ? owner.army.k : 0) },
      gar: { f: r.gar.f, k: r.gar.k },
      army: armyHere ? { f: owner.army.f, k: owner.army.k } : null,
    };
  },

  // Fordel forsvarets overlevende tilbage på garnison og hær
  scatterDefence(rid, def, info) {
    const r = G.regions[rid];
    const owner = fac(r.owner);
    const tf = info.units.f || 1, tk = info.units.k || 1;
    const rf = def.f / tf, rk = def.k / tk;
    r.gar.f = Math.round(info.gar.f * rf); r.gar.k = Math.round(info.gar.k * rk);
    if (info.army && owner) {
      owner.army.f = Math.max(0, def.f - r.gar.f);
      owner.army.k = Math.max(0, def.k - r.gar.k);
    }
  },

  newBattle(attacker, rid, wall) {
    const r = G.regions[rid];
    const info = this.gatherDefence(rid);
    const a = fac(attacker).army;
    return {
      attacker, defender: r.owner, rid, info,
      atk: { f: a.f, k: a.k, c: a.c },
      def: { f: info.units.f, k: info.units.k, c: 0 },
      castle: r.castle, wall: wall === undefined ? 1 : wall, rounds: 0,
    };
  },

  // Computerens slag – ingen grafik
  auto(attacker, rid, wall) {
    const b = this.newBattle(attacker, rid, wall);
    let result = null;
    while (!result) {
      const tA = b.atk.c && b.rounds < 2 && b.castle ? 'bombard' : 'attack';
      const tD = Math.random() < 0.6 ? 'hold' : 'attack';
      this.round(b, tA, tD);
      const pa = Economy.armyPower(b.atk), pd = Economy.armyPower(b.def);
      if (pd <= 0) result = 'atk';
      else if (pa <= 0) result = 'def';
      else if (b.rounds >= 8 || (b.rounds >= 3 && pa < pd * 0.4)) result = 'def';
    }
    this.finish(b, result);
    return { result, b };
  },

  // Skriv slagets udfald tilbage i spillets tilstand
  finish(b, result) {
    const af = fac(b.attacker);
    const a = af.army;
    a.f = b.atk.f; a.k = b.atk.k;
    if (Economy.armyEmpty(a)) a.c = 0;
    const r = G.regions[b.rid];
    const prevOwner = r.owner;
    this.scatterDefence(b.rid, b.def, b.info);
    if (result === 'atk') {
      // Forsvarerne er væk – erobreren rykker ind
      if (prevOwner && fac(prevOwner).army.at === b.rid) { const pa = fac(prevOwner).army; pa.f = 0; pa.k = 0; pa.c = 0; }
      r.owner = b.attacker;
      const leave = Math.min(3, Math.max(0, a.f - 1));
      r.gar = { f: leave, k: 0 };
      a.f -= leave;
      a.at = b.rid;
      if (b.castle && b.wall < 0.5) r.castle = Math.max(1, r.castle - 1);
      onRegionLost(prevOwner, b.rid, b.attacker);
    }
    return result;
  },
};

// Når et område skifter ejer: tjek hjemborge, prinsesse og om nogen er slået ud
function onRegionLost(prev, rid, by) {
  if (!prev) return;
  const pf = fac(prev);
  if (pf.home === rid) {
    if (G.princess.state === 'captive' && G.princess.holder === prev) {
      G.princess.holder = null;
      if (by === 'player') Events.freePrincess();
      else { G.princess.state = 'captive'; G.princess.holder = by; }
    }
    // Hjemborgen er faldet: hærens rester flygter til et andet område
    const left = regionsOf(prev);
    if (left.length) pf.home = left[0];
    if (prev === 'player') G.over = 'lost-home';
  }
  if (!regionsOf(prev).length) {
    pf.alive = false;
    pf.army.f = pf.army.k = pf.army.c = 0;
    if (prev !== 'player') G.log.push(`${pf.name} er slået ud!`);
  }
}

// ---------- Slaget på skærmen ----------
const BattleScene = {
  b: null, onEnd: null, phase: 'choose', t: 0, playerIsAtk: true, last: null, sprites: { L: [], R: [] },

  enter(b, onEnd) {
    this.b = b; this.onEnd = onEnd;
    this.playerIsAtk = b.attacker === 'player';
    this.phase = 'choose'; this.t = 0; this.last = null; this.result = null;
    this.sprites = { L: this.makeSprites(this.mine()), R: this.makeSprites(this.theirs()) };
    UI.focus = 0;
    Sound.battleCry();
  },

  mine() { return this.playerIsAtk ? this.b.atk : this.b.def; },
  theirs() { return this.playerIsAtk ? this.b.def : this.b.atk; },
  scaleFor() { return Math.max(1, Math.ceil(Math.max(Economy.armyPower(this.b.atk), Economy.armyPower(this.b.def)) / 40)); },

  makeSprites(u) {
    const s = this.scaleFor();
    const out = [];
    for (let i = 0; i < Math.ceil(u.k * 3 / s); i += 3) out.push({ knight: true, dead: 0 });
    for (let i = 0; i < Math.ceil(u.f / s); i++) out.push({ knight: false, dead: 0 });
    return out;
  },

  // Markér faldne figurer så antallet passer med de overlevende
  syncDead(list, u) {
    const s = this.scaleFor();
    const wantK = Math.ceil(u.k * 3 / s / 3), wantF = Math.ceil(u.f / s);
    let k = 0, f = 0;
    list.forEach((sp) => {
      if (sp.dead) return;
      if (sp.knight) { k++; if (k > wantK) sp.dead = 0.01; } else { f++; if (f > wantF) sp.dead = 0.01; }
    });
  },

  choose(tac) {
    const b = this.b;
    if (tac === 'retreat') { this.end(this.playerIsAtk ? 'def' : 'atk', true); return; }
    const aiTac = this.playerIsAtk ? (Math.random() < 0.55 ? 'hold' : 'attack') : (b.atk.c && b.rounds < 2 && b.castle ? 'bombard' : 'attack');
    const tA = this.playerIsAtk ? tac : aiTac, tD = this.playerIsAtk ? aiTac : tac;
    this.last = War.round(b, tA, tD);
    this.last.tac = tac;
    this.last.aiTac = aiTac;
    this.phase = 'clash'; this.t = 0;
    if (tac === 'bombard' || tA === 'bombard') Sound.thunk();
    Sound.battleCry();
  },

  end(result, retreat) {
    const b = this.b;
    if (retreat) {
      // Tilbagetog koster en femtedel af hæren
      const u = this.mine();
      u.f = Math.floor(u.f * 0.8); u.k = Math.floor(u.k * 0.8);
    }
    this.result = result;
    this.retreat = retreat;
    this.phase = 'done';
    const won = (result === 'atk') === this.playerIsAtk;
    if (won) Sound.victory(); else Sound.defeat();
    if (!this.playerIsAtk && retreat) {
      // Spilleren opgiver området: hæren flygter, garnisonen overgiver sig
      const p = fac('player');
      const flee = MapData.regions[b.rid].nb.find((n) => G.regions[n].owner === 'player');
      b.def.f = 0; b.def.k = 0;
      const saved = { f: Math.floor(p.army.f * 0.8), k: Math.floor(p.army.k * 0.8), c: p.army.c };
      War.finish(b, 'atk');
      if (flee) { p.army.f = saved.f; p.army.k = saved.k; p.army.c = saved.c; p.army.at = flee; }
    } else {
      War.finish(b, result);
    }
  },

  update(dt) {
    this.t += dt;
    const all = this.sprites.L.concat(this.sprites.R);
    all.forEach((s) => { if (s.dead && s.dead < 1) s.dead = Math.min(1, s.dead + dt * 3); });
    if (this.phase === 'clash') {
      if (this.t > 0.6 && this.t - dt <= 0.6) {
        this.syncDead(this.sprites.L, this.mine());
        this.syncDead(this.sprites.R, this.theirs());
        Sound.clang(); setTimeout(() => Sound.clang(), 120); setTimeout(() => Sound.hurt(), 220);
      }
      if (this.t > 1.5) {
        this.phase = 'choose';
        const b = this.b;
        const pa = Economy.armyPower(b.atk), pd = Economy.armyPower(b.def);
        if (pd <= 0) this.end('atk');
        else if (pa <= 0) this.end('def');
        else if (b.rounds >= 8) this.end('def');
      }
    }
  },

  draw(x) {
    Art.bg('battle');
    const clash = this.phase === 'clash' ? Math.sin(clamp(this.t / 1.2, 0, 1) * Math.PI) : 0;
    const frame = Math.floor(this.t * 8);
    const col = { L: PLAYER_COLOR, R: ownerColor(this.playerIsAtk ? this.b.defender : this.b.attacker) };
    if (col.R === '#2a2a2a') col.R = '#4a4a4a';
    ['L', 'R'].forEach((side) => {
      const dir = side === 'L' ? 1 : -1;
      this.sprites[side].forEach((s, i) => {
        const c = i % 7, r = Math.floor(i / 7);
        const bx = 160 - dir * (30 + c * 12 + (r % 2) * 6) + dir * clash * 26;
        const by = 120 + r * 11 + (c % 2) * 3;
        if (s.dead >= 1) {
          x.fillStyle = 'rgba(0,0,0,0.15)'; x.beginPath(); x.ellipse(bx, by, 4, 1, 0, 0, Math.PI * 2); x.fill();
          x.fillStyle = col[side]; rrect(x, bx - 3, by - 2, 5, 2, 1); x.fill();
          x.fillStyle = PAL.s3; circle(x, bx + 2.5, by - 1, 1);
          return;
        }
        if (s.dead) { x.globalAlpha = 1 - s.dead * 0.5; }
        x.fillStyle = 'rgba(0,0,0,0.15)'; x.beginPath(); x.ellipse(bx, by, s.knight ? 4 : 2, 0.8, 0, 0, Math.PI * 2); x.fill();
        Art.soldier(x, bx, by, col[side], dir, this.phase === 'clash' ? frame + i : 0, s.knight);
        x.globalAlpha = 1;
      });
    });
    if (clash > 0.6) {
      const r = seeded(Math.floor(this.t * 20));
      x.fillStyle = 'rgba(230,220,200,0.5)';
      for (let i = 0; i < 18; i++) circle(x, 150 + r() * 22, 112 + r() * 76, 2 + r() * 3);
      x.fillStyle = PAL.gold;
      for (let i = 0; i < 8; i++) { const a = r() * 6.3; circle(x, 161 + Math.cos(a) * 8, 140 + Math.sin(a) * 30, 0.6); }
    }
    // borgmur bag forsvarerne
    if (this.b.castle) {
      const wx = this.playerIsAtk ? 290 : 30;
      Art.castle(x, wx, 112, 26 + this.b.castle * 4, this.b.wall > 0.3 ? PAL.s4 : PAL.s2, PAL.s1, col[this.playerIsAtk ? 'R' : 'L'], col[this.playerIsAtk ? 'R' : 'L']);
    }
  },

  drawUI(ctx) {
    const b = this.b;
    const me = this.mine(), them = this.theirs();
    const enemyId = this.playerIsAtk ? b.defender : b.attacker;
    UI.title(ctx, `Slaget om ${MapData.regions[b.rid].name}`, 480, 40, 34);
    UI.panel(ctx, 20, 70, 250, 92, true);
    Art.shield(ctx, 60, 116, 40, fac('player').arms);
    UI.text(ctx, fac('player').short, 92, 96, 20, PARCH, 'left', true);
    UI.text(ctx, `${me.f} fodfolk · ${me.k} riddere`, 92, 124, 16, PARCH);
    if (me.c) UI.text(ctx, `${me.c} katapulter`, 92, 146, 16, PARCH);
    UI.panel(ctx, 690, 70, 250, 92, true);
    Art.shield(ctx, 730, 116, 40, enemyId ? fac(enemyId).arms : { field: NEUTRAL_COLOR, charge: '#6a4a1a', pattern: 'chief' });
    UI.text(ctx, enemyId ? fac(enemyId).short : 'Lenets folk', 762, 96, 20, PARCH, 'left', true);
    UI.text(ctx, `${them.f} fodfolk · ${them.k} riddere`, 762, 124, 16, PARCH);
    if (b.castle) UI.text(ctx, b.wall > 0.3 ? `bag borgmuren (${Math.round(b.wall * 100)}%)` : 'muren er brudt', 762, 146, 16, PARCH);
    UI.text(ctx, `Runde ${b.rounds + (this.phase === 'done' ? 0 : 1)} af 8`, 480, 78, 18, PARCH, 'center');

    if (this.last && this.phase !== 'done') {
      const L = this.playerIsAtk ? this.last.lossA : this.last.lossD, R = this.playerIsAtk ? this.last.lossD : this.last.lossA;
      UI.text(ctx, `Du mistede ${L.f + L.k} · fjenden mistede ${R.f + R.k}`, 480, 104, 18, PARCH, 'center');
    }

    if (this.phase === 'choose') {
      const opts = ['attack', 'hold', 'bombard', 'retreat'];
      const bw = 200, gap = 14, x0 = 480 - (opts.length * bw + (opts.length - 1) * gap) / 2;
      opts.forEach((o, i) => {
        UI.button(ctx, x0 + i * (bw + gap), 490, bw, 48, `${i + 1}  ${TACTICS[o].label}`, {
          enabled: o !== 'bombard' || (me.c > 0),
          key: 'Digit' + (i + 1), onClick: () => this.choose(o),
        });
      });
      UI.caption(ctx, this.playerIsAtk ? 'Vælg din taktik, herre!' : 'Fjenden angriber! Forsvar dit land!');
    } else if (this.phase === 'done') {
      const won = (this.result === 'atk') === this.playerIsAtk;
      UI.panel(ctx, 280, 200, 400, 200);
      UI.text(ctx, won ? 'Sejr!' : this.retreat ? 'Tilbagetog' : 'Nederlag', 480, 250, 38, won ? '#244a1c' : '#701018', 'center', true);
      const msg = won
        ? (this.playerIsAtk ? `${MapData.regions[b.rid].name} er dit!` : 'Fjenden er slået tilbage.')
        : (this.playerIsAtk ? 'Din hær må vende om.' : `${MapData.regions[b.rid].name} er tabt.`);
      UI.text(ctx, msg, 480, 300, 20, INK, 'center');
      UI.button(ctx, 380, 336, 200, 46, 'Videre', { onClick: () => { const cb = this.onEnd; cb && cb(won, this.result); } });
    }
  },
};
