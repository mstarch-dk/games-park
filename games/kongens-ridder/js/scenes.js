// Titelskærm, valg af helt, fortælling, mellemscener, sejr og nederlag.
function drawPrincess(x, px, py, t) {
  // kjole med blødt fald
  x.fillStyle = Shade.lin(x, px - 14, 0, px + 14, 0, ['#3f6fd0', '#7aa4f0', '#3f6fd0']);
  x.beginPath(); x.moveTo(px - 4, py - 33); x.lineTo(px + 4, py - 33);
  x.quadraticCurveTo(px + 8, py - 14, px + 15, py); x.quadraticCurveTo(px, py + 2, px - 15, py);
  x.quadraticCurveTo(px - 8, py - 14, px - 4, py - 33); x.fill();
  x.strokeStyle = PAL.gold; x.lineWidth = 0.8;
  x.beginPath(); x.moveTo(px - 4.5, py - 26); x.quadraticCurveTo(px, py - 24, px + 4.5, py - 26); x.stroke();
  // arme
  x.strokeStyle = '#7aa4f0'; x.lineWidth = 2.2;
  x.beginPath(); x.moveTo(px - 4, py - 31); x.lineTo(px - 6, py - 21); x.moveTo(px + 4, py - 31); x.lineTo(px + 6, py - 21); x.stroke();
  x.fillStyle = PAL.skin; circle(x, px - 6, py - 20.5, 1.1); circle(x, px + 6, py - 20.5, 1.1);
  // hår, ansigt og krone
  x.fillStyle = '#c8642e';
  x.beginPath(); x.ellipse(px, py - 37, 5, 6.5, 0, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.moveTo(px - 5, py - 37); x.quadraticCurveTo(px - 6, py - 28, px - 4, py - 25); x.lineTo(px + 4, py - 25); x.quadraticCurveTo(px + 6, py - 28, px + 5, py - 37); x.fill();
  x.fillStyle = PAL.skin; x.beginPath(); x.ellipse(px, py - 37.5, 3.2, 4, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = PAL.s0; circle(x, px - 1.2, py - 38, 0.45); circle(x, px + 1.2, py - 38, 0.45);
  x.strokeStyle = '#c0504a'; x.lineWidth = 0.4; x.beginPath(); x.arc(px, py - 36.5, 1, 0.2, Math.PI - 0.2); x.stroke();
  x.fillStyle = PAL.gold;
  x.beginPath(); x.moveTo(px - 3, py - 41); x.lineTo(px - 3, py - 44); x.lineTo(px - 1.5, py - 42.5); x.lineTo(px, py - 45); x.lineTo(px + 1.5, py - 42.5); x.lineTo(px + 3, py - 44); x.lineTo(px + 3, py - 41); x.fill();
  // stearinlys
  x.fillStyle = '#5a3a28'; rrect(x, 92, 160, 22, 3, 1); x.fill(); x.fillRect(101, 162, 4, 14);
  x.fillStyle = PAL.p3; rrect(x, 101.5, 150, 3, 10, 1); x.fill();
  Shade.glow(x, 103, 146, 10, '#ffd27a', 0.35 + Math.sin(t * 11) * 0.08);
  x.fillStyle = PAL.gold; x.beginPath(); x.ellipse(103, 147, 1, 2 + Math.sin(t * 11) * 0.3, 0, 0, Math.PI * 2); x.fill();
}

const TitleScreen = {
  t: 0, played: false,
  enter() { this.t = 0; UI.focus = 0; Sound.stopMusic(); this.played = false; this.hasSave = Save.exists(); },
  update(dt) {
    this.t += dt;
    if (!this.played && Sound.ctx) { this.played = true; Sound.titleTheme(); }
    if (Game.debug) {
      if (Input.hit('Digit7')) Game.debugStart('siege');
      if (Input.hit('Digit8')) Game.debugStart('joust');
      if (Input.hit('Digit9')) Game.debugStart('fencing');
    }
  },
  draw(x) {
    Art.bg('title');
    // blinkende stjerner
    const r = seeded(11);
    for (let i = 0; i < 30; i++) {
      const sx = Math.floor(r() * 320), sy = Math.floor(r() * 50);
      x.fillStyle = PAL.white; x.globalAlpha = 0.4 + 0.5 * Math.max(0, Math.sin(this.t * 2 + i)); circle(x, sx, sy, 0.5); x.globalAlpha = 1;
    }
  },
  drawUI(ctx) {
    UI.title(ctx, 'Kongens Ridder', 480, 90, 76);
    UI.text(ctx, 'Danmark, Anno Domini 1523', 480, 150, 24, PARCH, 'center');
    const bx = 360;
    UI.button(ctx, bx, 410, 240, 40, 'Nyt spil', { onClick: () => Game.go('heroes') });
    UI.button(ctx, bx, 456, 240, 40, 'Fortsæt', { enabled: this.hasSave, onClick: () => Game.continueGame() });
    UI.button(ctx, bx, 502, 240, 40, 'Sådan spiller man', { onClick: () => Game.go('help') });
    UI.caption(ctx, 'Saml riget, så den landflygtige kong Christian II kan vende hjem');
    if (Game.debug) UI.text(ctx, 'DEBUG: 7 belejring · 8 turnering · 9 fægtning', 480, 200, 16, '#ff8080', 'center');
  },
};

const HeroSelect = {
  sel: 0,
  enter() { UI.focus = 0; this.sel = 0; },
  update() {
    if (Input.left()) { this.sel = (this.sel + 3) % 4; Sound.tick(); }
    if (Input.right()) { this.sel = (this.sel + 1) % 4; Sound.tick(); }
    if (Input.confirm()) { Sound.select(); Game.newGame(this.sel); }
    if (Input.back()) Game.go('title');
    const m = Input.mouse;
    if (m.clicked) {
      for (let i = 0; i < 4; i++) {
        const cx = 30 + i * 228;
        if (m.x > cx && m.x < cx + 216 && m.y > 110 && m.y < 500) {
          if (this.sel === i) { Sound.select(); Game.newGame(i); } else { this.sel = i; Sound.tick(); }
        }
      }
    }
  },
  draw(x) { Art.bg('hall'); x.globalAlpha = 0.5; x.fillStyle = PAL.black; x.fillRect(0, 0, LO_W, LO_H); x.globalAlpha = 1; },
  drawUI(ctx) {
    UI.title(ctx, 'Vælg din ridder', 480, 60, 44);
    HEROES.forEach((h, i) => {
      const cx = 30 + i * 228, sel = i === this.sel;
      UI.panel(ctx, cx, 110, 216, 390, !sel);
      Art.shield(ctx, cx + 108, 180, 70, h.arms);
      const col = sel ? INK : PARCH;
      UI.text(ctx, h.name, cx + 108, 256, 17, sel ? '#701018' : GOLD, 'center', true);
      UI.text(ctx, `Lederskab  ${stars(h.lead)}`, cx + 108, 292, 17, col, 'center');
      UI.text(ctx, `Lanse  ${stars(h.lance)}`, cx + 108, 318, 17, col, 'center');
      UI.text(ctx, `Sværd  ${stars(h.sword)}`, cx + 108, 344, 17, col, 'center');
      UI.wrap(ctx, h.about, 180, 15).forEach((l, j) => UI.text(ctx, l, cx + 108, 384 + j * 20, 15, col, 'center'));
      UI.text(ctx, `Hjem: ${MapData.regions[h.home].name}`, cx + 108, 470, 15, col, 'center', true);
    });
    UI.caption(ctx, '← → vælg · ENTER begynd · Lederskab = slag · Lanse = turnering · Sværd = fægtning');
  },
};

const HelpScreen = {
  enter() { UI.focus = 0; },
  update() { if (Input.back()) Game.go('title'); },
  draw(x) { Art.bg('map'); x.globalAlpha = 0.7; x.fillStyle = PAL.black; x.fillRect(0, 0, LO_W, LO_H); x.globalAlpha = 1; },
  drawUI(ctx) {
    UI.panel(ctx, 60, 30, 840, 540);
    UI.text(ctx, 'Sådan spiller man', 480, 66, 30, '#701018', 'center', true);
    const lines = [
      'Hver sæson får du guld fra dine områder. Køb fodfolk, riddere og katapulter – eller byg borge, gårde og markeder.',
      'Du må marchere én gang pr. sæson gennem dine egne lande. Derefter vælger du én stor handling:',
      '• Erobr et naboområde (de blinkende). Har området en borg, skal muren først skydes i stykker med katapult:',
      '    Hold MELLEMRUM for at spænde katapulten og slip for at kaste · ← → sten eller ildkrukke. Muren skal ned under 62 %.',
      '• Togt: snig dig ind i en herres borg og fægt – for guld, eller for at befri prinsessen.',
      '    ↑ højt hug · → stød · ↓ lavt hug · ← parér. Hug hvor modstanderen IKKE holder sværdet!',
      '• Turnering i Roskilde (når den er udråbt): ← → ↑ ↓ sigt på skjoldet, HOLD MELLEMRUM lige før stødet.',
      '• Slut sæson: så går turen til de tre herrer. De angriber hinanden – og dig.',
      'Efterlad vagter (G) i dine områder – områder uden vagter kan gøre oprør. Mister du din hjemborg, er spillet tabt!',
      'Saml alle 15 områder, så kan kong Christian II vende hjem.',
    ];
    let y = 110;
    lines.forEach((l) => UI.wrap(ctx, l, 760, 18).forEach((ll) => { UI.text(ctx, ll, 100, y, 18, INK); y += 26; }));
    UI.button(ctx, 380, 506, 200, 44, 'Tilbage', { onClick: () => Game.go('title') });
  },
};

const IntroScreen = {
  t: 0,
  enter() { this.t = 0; UI.focus = 0; Sound.titleTheme(); },
  update(dt) { this.t += dt; },
  draw(x) { Art.bg('coronation'); x.globalAlpha = 0.35; x.fillStyle = PAL.night; x.fillRect(0, 0, LO_W, LO_H); x.globalAlpha = 1; },
  drawUI(ctx) {
    const p = fac('player');
    UI.panel(ctx, 140, 70, 680, 400, true);
    UI.text(ctx, 'Året er 1523', 480, 110, 32, GOLD, 'center', true);
    const txt = [
      'Kong Christian II er drevet bort fra sit rige og sidder i landflygtighed.',
      'Tre grådige herrer har delt landene mellem sig, og hver især drømmer de om kronen.',
      `Men ${p.name} er stadig kongen tro. Fra borgen i ${MapData.regions[p.home].name} skal riget samles igen – land for land.`,
      'Når hele Danmark står under kongens banner, kan Christian vende hjem.',
      'Mister du din egen borg, er alt tabt.',
    ];
    let y = 160;
    txt.forEach((l) => UI.wrap(ctx, l, 600, 20).forEach((ll) => { UI.text(ctx, ll, 480, y, 20, PARCH, 'center'); y += 30; }));
    UI.button(ctx, 380, 400, 200, 46, 'Til kortet!', { onClick: () => Game.startTurn() });
  },
};

// Baggrund til beskeder med en malet scene (fx prinsessen)
const Cutscene = {
  t: 0, name: 'princess', rescued: false,
  enter(opts) { this.t = 0; this.name = opts.scene; this.rescued = opts.rescued; },
  update(dt) { this.t += dt; },
  draw(x) {
    Art.bg(this.name);
    if (this.name === 'princess' && !Art.hasPainting('princess')) {
      drawPrincess(x, this.rescued ? 150 : 222, 168, this.t);
      if (this.rescued) { x.save(); x.translate(186, 168); x.scale(3.6, 3.6); Art.soldier(x, 0, 0, PLAYER_COLOR, -1, 0, false); x.restore(); }
    }
  },
  drawUI() {},
};

const VictoryScreen = {
  t: 0,
  enter() { this.t = 0; Sound.stopMusic(); Sound.victory(); setTimeout(() => Sound.royal(), 2600); Save.clear(); UI.focus = 0; },
  update(dt) { this.t += dt; },
  draw(x) {
    Art.bg('coronation');
    // kongeskibet sejler ind
    const sx = 330 - Math.min(1, this.t / 8) * 170, sy = 120 + Math.sin(this.t * 2) * 1;
    x.save(); x.translate(sx, sy); x.rotate(Math.sin(this.t * 1.5) * 0.03);
    x.fillStyle = '#5a3a2a';
    x.beginPath(); x.moveTo(-28, -3); x.quadraticCurveTo(0, 2, 28, -5); x.quadraticCurveTo(22, 9, 0, 9); x.quadraticCurveTo(-22, 9, -28, -3); x.fill();
    x.fillStyle = PAL.gold; x.fillRect(-24, 0, 48, 1);
    x.strokeStyle = '#3a2a20'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -40); x.stroke();
    x.fillStyle = PAL.red1;
    x.beginPath(); x.moveTo(-15, -34); x.quadraticCurveTo(0, -37, 15, -34); x.quadraticCurveTo(18, -20, 15, -8); x.quadraticCurveTo(0, -11, -15, -8); x.quadraticCurveTo(-12, -20, -15, -34); x.fill();
    x.fillStyle = PAL.white; x.fillRect(-15, -23, 31, 4); x.fillRect(-6, -35, 4, 27);
    x.fillStyle = PAL.red1; x.beginPath(); x.moveTo(0, -40); x.lineTo(8, -38.5); x.lineTo(0, -37); x.fill();
    x.restore();
    if (this.t > 3) {
      const r = seeded(Math.floor(this.t * 3));
      for (let i = 0; i < 14; i++) { x.fillStyle = pick([PAL.gold, PAL.red1, PAL.white]); circle(x, r() * 320, r() * 90, 0.7); }
    }
  },
  drawUI(ctx) {
    UI.title(ctx, 'Kongen vender hjem!', 480, 80, 56);
    if (this.t > 2) {
      UI.panel(ctx, 220, 420, 520, 140, true);
      UI.text(ctx, `Hele Danmark er samlet af ${fac('player').name}.`, 480, 448, 20, PARCH, 'center');
      UI.text(ctx, `Det tog ${G.turn + 1} sæsoner. Kong Christian II sætter foden i land.`, 480, 476, 18, PARCH, 'center');
      UI.button(ctx, 380, 500, 200, 44, 'Til titelskærmen', { onClick: () => Game.go('title') });
    }
  },
};

const DefeatScreen = {
  t: 0,
  enter() { this.t = 0; Sound.stopMusic(); Sound.defeat(); Save.clear(); UI.focus = 0; },
  update(dt) { this.t += dt; },
  draw(x) { Art.bg('title'); x.globalAlpha = 0.6; x.fillStyle = PAL.black; x.fillRect(0, 0, LO_W, LO_H); x.globalAlpha = 1; },
  drawUI(ctx) {
    UI.title(ctx, 'Alt er tabt', 480, 120, 56, '#d04040');
    const why = G.over === 'lost-home' ? 'Din hjemborg er faldet i fjendens hænder.' : 'Du har hverken land eller hær tilbage.';
    UI.text(ctx, why, 480, 200, 22, PARCH, 'center');
    UI.text(ctx, 'Kongen må blive i landflygtighed… indtil en ny ridder rejser sig.', 480, 236, 20, PARCH, 'center');
    UI.button(ctx, 380, 420, 200, 46, 'Prøv igen', { onClick: () => Game.go('title') });
  },
};
