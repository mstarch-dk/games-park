// Kortet over Danmark – spillets centrum. Her vælger man område og hvad man vil gøre i sæsonen.
const CASTLE_NAMES = ['ingen borg', 'trævolde', 'stenborg', 'stor fæstning'];

const MapScreen = {
  sel: null,
  t: 0,

  enter() {
    const p = fac('player');
    if (!this.sel || !G.regions[this.sel]) this.sel = p.army.at;
    UI.focus = -1;
    Sound.startMusic();
  },

  // Områder hæren kan nå gennem egne lande (march)
  reachable() {
    const p = fac('player');
    const seen = new Set([p.army.at]);
    const q = [p.army.at];
    while (q.length) {
      const c = q.shift();
      MapData.regions[c].nb.forEach((n) => { if (!seen.has(n) && G.regions[n].owner === 'player') { seen.add(n); q.push(n); } });
    }
    seen.delete(p.army.at);
    return seen;
  },

  canAttack(rid) {
    const p = fac('player');
    return !Economy.armyEmpty(p.army) && G.regions[rid].owner !== 'player' && MapData.regions[p.army.at].nb.includes(rid);
  },
  canMarch(rid) { return !G.marched && this.reachable().has(rid); },

  context() {
    if (this.canAttack(this.sel)) Game.conquer(this.sel);
    else if (this.canMarch(this.sel)) this.march(this.sel);
    else Sound.deny();
  },

  march(rid) {
    fac('player').army.at = rid;
    G.marched = true;
    Sound.march();
    UI.toast(`Hæren marcherer til ${MapData.regions[rid].name}.`);
  },

  buyMenu() {
    const p = fac('player');
    Game.dialog({
      title: 'Køb og byg', cols: 2, back: SHOP.length,
      build: () => {
        const rid = G.regions[this.sel].owner === 'player' ? this.sel : p.home;
        const r = G.regions[rid];
        return {
          lines: [`Guld: ${p.gold}    Hær: ${p.army.f} fodfolk, ${p.army.k} riddere, ${p.army.c} katapulter`,
            `Byggeri sker i ${MapData.regions[rid].name} (${CASTLE_NAMES[r.castle]}, ${r.farm} gårde, ${r.market} marked).`],
          buttons: SHOP.map((it) => ({ label: `${it.label} – ${it.price} g`, keep: true, enabled: Economy.canBuy('player', it, rid),
            onClick: () => { Economy.buy('player', it.id, rid); Sound.coin(); } })).concat([{ label: 'Færdig' }]),
        };
      },
      buttons: [],
    });
  },

  menu() {
    Game.dialog({ title: 'Kongens Ridder', lines: ['Spillet gemmes automatisk ved starten af hver sæson.'], back: 0,
      buttons: [{ label: 'Spil videre' }, { label: 'Til titelskærmen', onClick: () => Game.go('title') }] });
  },

  update(dt) {
    this.t += dt;
    if (UI.dialog) return;
    const dirs = [['ArrowLeft', -1, 0], ['ArrowRight', 1, 0], ['ArrowUp', 0, -1], ['ArrowDown', 0, 1]];
    dirs.forEach(([k, dx, dy]) => {
      if (Input.hit(k)) { const n = MapData.neighbourInDir(this.sel, dx, dy); if (n) { this.sel = n; Sound.tick(); } }
    });
    const m = Input.mouse;
    if (m.clicked && m.x < 636) {
      const id = MapData.at(m.x / SCALE, m.y / SCALE);
      if (id) {
        if (id === this.sel) this.context(); else { this.sel = id; Sound.tick(); }
        m.clicked = false;
      }
    }
    if (Input.hit('Enter', 'Space', 'NumpadEnter')) this.context();
    if (Input.hit('Escape')) this.menu();
  },

  draw(x) {
    Art.bg('map');
    FOREIGN.forEach((f) => {
      Shade.fill(x, PAL.s3, PAL.p1, 7);
      x.beginPath(); f.pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill();
    });
    // sejlruter
    x.save();
    x.strokeStyle = 'rgba(255,250,230,0.7)'; x.lineWidth = 0.6; x.setLineDash([1.5, 2]);
    LINKS.forEach(([a, b, sea]) => {
      if (!sea) return;
      const A = MapData.regions[a], B = MapData.regions[b];
      x.beginPath(); x.moveTo(A.cx + (B.cx - A.cx) * 0.2, A.cy + (B.cy - A.cy) * 0.2); x.lineTo(A.cx + (B.cx - A.cx) * 0.8, A.cy + (B.cy - A.cy) * 0.8); x.stroke();
    });
    x.restore();
    // skygge under landene
    x.fillStyle = 'rgba(10,30,60,0.28)';
    MapData.order.forEach((id) => {
      x.beginPath(); MapData.regions[id].pts.forEach(([a, b], i) => (i ? x.lineTo(a + 1.2, b + 1.6) : x.moveTo(a + 1.2, b + 1.6))); x.closePath(); x.fill();
    });
    const p = fac('player');
    MapData.order.forEach((id) => {
      const R = MapData.regions[id], r = G.regions[id];
      x.beginPath(); R.pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath();
      if (r.owner) x.fillStyle = Shade.lin(x, R.cx - 15, R.cy - 15, R.cx + 15, R.cy + 15, [Shade.mix(ownerColor(r.owner), '#ffffff', 0.25), ownerColor(r.owner)]);
      else x.fillStyle = Shade.lin(x, R.cx - 15, R.cy - 15, R.cx + 15, R.cy + 15, [PAL.p3, PAL.p2]);
      x.fill();
      x.strokeStyle = 'rgba(40,25,20,0.7)'; x.lineWidth = 0.6; x.stroke();
    });
    // mulige angrebsmål blinker
    if (!Economy.armyEmpty(p.army) && Math.floor(this.t * 2) % 2 === 0) {
      MapData.regions[p.army.at].nb.forEach((n) => {
        if (G.regions[n].owner === 'player') return;
        const R = MapData.regions[n];
        x.beginPath(); R.pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath();
        x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 0.9; x.setLineDash([2, 1.5]); x.stroke(); x.setLineDash([]);
      });
    }
    // valgt område
    const S = MapData.regions[this.sel];
    x.beginPath(); S.pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath();
    x.strokeStyle = PAL.gold; x.lineWidth = 1.2 + Math.sin(this.t * 6) * 0.4; x.stroke(); x.lineWidth = 1;
    // borge
    MapData.order.forEach((id) => {
      const R = MapData.regions[id], r = G.regions[id];
      if (r.castle) Art.castle(x, R.cx, R.cy + 1, 6 + r.castle * 2, PAL.s5, PAL.s1, null, r.owner ? Shade.mix(ownerColor(r.owner), '#000000', 0.15) : PAL.p0);
    });
    // Roskilde
    const [rx, ry] = ROSKILDE.pos;
    Shade.glow(x, rx, ry, 6, PAL.gold, 0.6);
    x.fillStyle = PAL.gold; x.strokeStyle = PAL.gold0; x.lineWidth = 0.3;
    x.beginPath(); x.moveTo(rx - 2.5, ry + 1.5); x.lineTo(rx - 2.5, ry - 1.5); x.lineTo(rx - 1.2, ry - 0.3); x.lineTo(rx, ry - 2.2); x.lineTo(rx + 1.2, ry - 0.3); x.lineTo(rx + 2.5, ry - 1.5); x.lineTo(rx + 2.5, ry + 1.5); x.closePath(); x.fill(); x.stroke();
    // hære som små faner
    Object.values(G.factions).forEach((f, i) => {
      if (!f.alive || Economy.armyEmpty(f.army)) return;
      const R = MapData.regions[f.army.at];
      const ax = R.cx + 5 + (i % 2) * 3, ay = R.cy - 4 - i;
      const wave = Math.sin(this.t * 4 + i) * 0.6;
      x.strokeStyle = '#3a2a20'; x.lineWidth = 0.6;
      x.beginPath(); x.moveTo(ax, ay + 2); x.lineTo(ax, ay - 9); x.stroke();
      x.fillStyle = f.id === 'player' ? PAL.red1 : f.color;
      x.beginPath(); x.moveTo(ax, ay - 9); x.quadraticCurveTo(ax + 3.5, ay - 10 + wave, ax + 7, ay - 9); x.lineTo(ax + 7, ay - 5); x.quadraticCurveTo(ax + 3.5, ay - 6 + wave, ax, ay - 5); x.fill();
      x.fillStyle = f.id === 'player' ? PAL.white : f.light;
      if (f.id === 'player') { x.fillRect(ax, ay - 7.5 + wave * 0.5, 7, 1); x.fillRect(ax + 2, ay - 9 + wave * 0.3, 1, 4); } else circle(x, ax + 3.5, ay - 7 + wave * 0.5, 1);
      x.fillStyle = PAL.gold; circle(x, ax, ay - 9.3, 0.6);
    });
  },

  drawUI(ctx) {
    const p = fac('player');
    // navne på kortet
    MapData.order.forEach((id) => {
      const R = MapData.regions[id];
      const sel = id === this.sel;
      ctx.font = `${sel ? 'bold ' : ''}14px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tx = R.cx * SCALE, ty = R.cy * SCALE + 20;
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(255,248,230,0.9)'; ctx.strokeText(R.name, tx, ty);
      ctx.fillStyle = sel ? '#8e1f2c' : '#2a1a10'; ctx.fillText(R.name, tx, ty);
    });
    UI.text(ctx, '♛ Roskilde', ROSKILDE.pos[0] * SCALE + 8, ROSKILDE.pos[1] * SCALE + 4, 12, GOLD, 'left', true);
    if (G.tourney === 0) UI.text(ctx, '⚑ Turnering!', ROSKILDE.pos[0] * SCALE + 8, ROSKILDE.pos[1] * SCALE + 18, 12, '#fff', 'left', true);
    UI.text(ctx, 'Kattegat', 250, 200, 15, 'rgba(255,255,255,0.45)', 'center');
    UI.text(ctx, 'Østersøen', 470, 470, 15, 'rgba(255,255,255,0.45)', 'center');
    UI.text(ctx, 'SVERIGE', 470, 110, 16, 'rgba(60,40,20,0.55)', 'center', true);
    UI.text(ctx, 'TYSKLAND', 380, 560, 16, 'rgba(60,40,20,0.55)', 'center', true);

    // panel
    const X = 650;
    Art.shield(ctx, X + 30, 38, 40, p.arms);
    UI.text(ctx, p.name, X + 62, 26, 18, INK, 'left', true);
    UI.text(ctx, seasonName(G.turn), X + 62, 50, 16, '#701018', 'left', true);
    UI.text(ctx, `Guld: ${p.gold}   (+${Economy.income('player')} pr. sæson)`, X, 86, 17, INK, 'left', true);
    UI.text(ctx, `Hær: ${p.army.f} fodfolk · ${p.army.k} riddere · ${p.army.c} katap.`, X, 110, 15, INK);
    UI.text(ctx, `står i ${MapData.regions[p.army.at].name}`, X, 130, 15, INK);
    UI.text(ctx, `Leder ${stars(p.lead)}  Lanse ${stars(p.lance)}  Sværd ${stars(p.sword)}`, X, 152, 14, INK);
    if (p.princess) UI.text(ctx, `♛ ${PRINCESS} er med dig`, X, 172, 14, '#701018', 'left', true);

    ctx.fillStyle = '#8c6830'; ctx.fillRect(X, 186, 296, 2);
    const R = MapData.regions[this.sel], r = G.regions[this.sel];
    if (r.owner) Art.shield(ctx, X + 278, 214, 26, fac(r.owner).arms);
    UI.text(ctx, R.name, X, 206, 22, '#701018', 'left', true);
    UI.text(ctx, `Herre: ${r.owner ? fac(r.owner).name : 'ingen – lenets egne folk'}`, X, 232, 14, INK);
    UI.text(ctx, `Indtægt ${Economy.regionIncome(this.sel)} · ${CASTLE_NAMES[r.castle]}`, X, 252, 14, INK);
    UI.text(ctx, `Garnison: ${r.gar.f} fodfolk, ${r.gar.k} riddere`, X, 272, 14, INK);
    const armies = Object.values(G.factions).filter((f) => f.alive && f.id !== 'player' && f.army.at === this.sel && !Economy.armyEmpty(f.army));
    armies.forEach((f, i) => UI.text(ctx, `${f.short}s hær: ${f.army.f} fodf., ${f.army.k} ridd., ${f.army.c} kat.`, X, 292 + i * 18, 14, '#701018'));

    // knapper
    const bw = 145, bh = 38, gx = X, gy = 340;
    const attack = this.canAttack(this.sel), march = this.canMarch(this.sel);
    const here = p.army.at === this.sel && r.owner === 'player';
    const btns = [
      ['K', 'Køb og byg', true, () => this.buyMenu()],
      ['T', 'Togt', true, () => Events.raidMenu()],
      ['E', attack && r.castle ? 'Belejr!' : 'Erobr!', attack, () => Game.conquer(this.sel)],
      ['H', 'March hertil', march, () => this.march(this.sel)],
      ['G', 'Garnison +5', here && p.army.f > 0, () => { Economy.garrison('player', this.sel, 1); }],
      ['F', 'Hent 5 vagter', here && r.gar.f + r.gar.k > 0, () => { Economy.garrison('player', this.sel, -1); }],
      ['R', 'Turnering', G.tourney === 0, () => Events.tourneyMenu()],
      ['S', 'Slut sæson', true, () => Game.endTurn()],
    ];
    btns.forEach(([k, label, en, fn], i) => {
      UI.button(ctx, gx + (i % 2) * (bw + 6), gy + Math.floor(i / 2) * (bh + 6), bw, bh, label, { enabled: en, key: 'Key' + k, onClick: fn, size: 17 });
      UI.text(ctx, k, gx + (i % 2) * (bw + 6) + 10, gy + Math.floor(i / 2) * (bh + 6) + 12, 11, en ? '#e0c890' : '#a09070');
    });
    let hint = 'Vælg et område med musen eller piletasterne.';
    if (attack) hint = r.castle ? (p.army.c ? 'ENTER: belejr borgen med dine katapulter.' : 'Borgen har mure – du skal have en katapult!') : 'ENTER: angrib området!';
    else if (march) hint = 'ENTER: march hertil (én gang pr. sæson).';
    else if (G.marched && this.reachable().has(this.sel)) hint = 'Hæren har allerede marcheret denne sæson.';
    UI.text(ctx, hint, X, 530, 13, INK);
    UI.text(ctx, `Dine lande: ${regionsOf('player').length} af ${MapData.order.length}`, X, 552, 14, '#701018', 'left', true);
    UI.text(ctx, 'ESC menu · P pause · M lyd', X, 574, 12, '#6a4a1a');
  },
};
