// Titelskærm, valg af spilform og skib-vælger.
const MODES = [
  { id: 'duel', name: 'Duel', desc: 'To spillere mod hinanden på samme tastatur', icon: '⚔', players: 2 },
  { id: 'duelAI', name: 'Duel mod computeren', desc: 'Kæmp mod en computer-pilot', icon: '🤖', players: 1 },
  { id: 'waves', name: 'Bølger', desc: 'Skyd fjende-bølger ned – og besejr rumbasen', icon: '👾', players: 1 },
  { id: 'coop', name: 'Samarbejde', desc: 'To spillere sammen mod bølgerne', icon: '🤝', players: 2 },
];

const FACTS = [
  'I rummet er der ingen luft, der bremser. Slipper du speederen, flyver du bare videre!',
  'For at bremse skal du vende skibet rundt og speede op den modsatte vej.',
  'Tyngdekraft trækker i alt. Jo tættere du er på planeten, jo hårdere trækker den.',
  'Rumsonder bruger planeters tyngdekraft til at slynge sig hurtigere afsted. Prøv selv!',
  'Når Kampbøffen skyder, bliver den skubbet lidt baglæns. Det hedder rekyl.',
  'Dine skud får skibets fart med. Flyver du hurtigt fremad, flyver skuddene også hurtigere.',
  'Den grønne fartpil viser hvor du flyver hen. Den peger ikke altid samme vej som skibet!',
  'Rumstationen ISS flyver ca. 28.000 km i timen – en tur rundt om Jorden tager 90 minutter.',
  'I rigtigt rum kan man ikke høre eksplosioner, for lyd skal bruge luft. Men det er sjovere med lyd!',
  'Månens tyngdekraft trækker i havene på Jorden. Det giver ebbe og flod.',
  'Hvis du flyver i en cirkel om planeten med lige præcis den rigtige fart, er du i kredsløb.',
  'Astronauter svæver i rumstationen, fordi de hele tiden "falder" rundt om Jorden.',
];

const STAT_NAMES = [['fart', 'Fart'], ['drej', 'Drejning'], ['liv', 'Hitpoints'], ['vaaben', 'Våben'], ['energi', 'Energi']];

// Tegn et skib uden at det er med i spillet (til menuer)
function drawShipPreview(c, def, x, y, scale, angle, t, thrust = true) {
  const fake = { def, thrusting: thrust, t, bite: Math.sin(t * 0.8) > 0.8 ? 1 : 0, recoil: 0, boost: 0, gunSide: 1 };
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.rotate(angle);
  if (def.flip && Math.cos(angle) < 0) c.scale(1, -1);
  if (thrust) Ship.prototype.drawFlames.call(fake, c);
  def.draw(c, fake, t);
  c.restore();
}

const Menu = {
  modeIdx: 0,
  cursors: [0, 1],
  locked: [false, false],
  lockT: 0,
  factIdx: 0,
  factT: 0,

  // ---------- Titel ----------
  updateTitle(G) {
    if (G.stateTime > 0.3 && (Input.confirm() || Input.hit('KeyF', 'KeyL'))) {
      Sound.select();
      G.setState('modes');
    }
  },

  drawTitle(ctx, G) {
    const t = G.t;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(5,4,20,0.75)');
    g.addColorStop(0.5, 'rgba(5,4,20,0.25)');
    g.addColorStop(1, 'rgba(5,4,20,0.75)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const title = 'RUM-DUEL';
    const cols = ['#ff5a8a', '#ffa53a', '#ffe35a', '#7dff9a', '#4fd8ff', '#9a7aff', '#ff7ad8', '#ff5a5a'];
    ctx.font = `bold 110px ${FONT}`;
    let x = W / 2 - ctx.measureText(title).width / 2;
    for (let i = 0; i < title.length; i++) {
      ctx.font = `bold 110px ${FONT}`;
      const w = ctx.measureText(title[i]).width;
      text(ctx, title[i], x + w / 2, 170 + Math.sin(t * 3 + i * 0.6) * 10, 110, cols[i % cols.length], 'center', '#140a30');
      x += w;
    }
    text(ctx, 'Et rumskibsspil med ægte rumfysik', W / 2, 260, 30, '#cfe8ff');
    if (Math.floor(t * 2) % 2 === 0) text(ctx, 'Tryk MELLEMRUM for at starte', W / 2, 560, 34, '#ffe35a');
    text(ctx, 'Feltet hænger sammen i kanterne – flyv ud til venstre, og du kommer ind til højre!', W / 2, 630, 20, '#9ab8d8');
    if (G.highscore) text(ctx, `Rekord i Bølger: ${G.highscore}`, W / 2, 670, 20, '#ffd27a');
  },

  // ---------- Spilform ----------
  updateModes(G) {
    const m = Input.menu('solo');
    if (Input.hit('Escape')) { G.setState('title'); return; }
    if (m.dy) {
      this.modeIdx = (this.modeIdx + m.dy + MODES.length) % MODES.length;
      Sound.tick();
    }
    if (m.dx && MODES[this.modeIdx].id === 'duelAI') {
      G.difficulty = clamp(G.difficulty + m.dx, 0, 2);
      Sound.tick();
    }
    if (m.ok && G.stateTime > 0.2) {
      Sound.select();
      G.chooseMode(MODES[this.modeIdx].id);
    }
  },

  drawModes(ctx, G) {
    ctx.fillStyle = 'rgba(5,4,20,0.7)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, 'Vælg spilform', W / 2, 80, 56, '#ffe35a');
    MODES.forEach((m, i) => {
      const y = 170 + i * 115;
      const sel = i === this.modeIdx;
      const x = W / 2 - 380;
      ctx.fillStyle = sel ? 'rgba(80,140,255,0.3)' : 'rgba(255,255,255,0.06)';
      roundRect(ctx, x, y, 760, 95, 18);
      ctx.fill();
      if (sel) { ctx.strokeStyle = '#4fd8ff'; ctx.lineWidth = 4; ctx.stroke(); }
      ctx.font = `48px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(m.icon, x + 60, y + 48);
      text(ctx, m.name, x + 120, y + 32, 32, sel ? '#fff' : '#bcd', 'left');
      text(ctx, m.desc, x + 120, y + 66, 20, '#9ab8d8', 'left');
      text(ctx, m.players === 2 ? '2 spillere' : '1 spiller', x + 740, y + 32, 18, '#ffd27a', 'right');
      if (m.id === 'duelAI') {
        const d = AI_SKILL[G.difficulty].name;
        text(ctx, `${sel ? '◀ ' : ''}${d}${sel ? ' ▶' : ''}`, x + 740, y + 66, 22, ['#7dff9a', '#ffe35a', '#ff6a6a'][G.difficulty], 'right');
      }
    });
    text(ctx, '↑ ↓ vælg · MELLEMRUM start · ESC tilbage', W / 2, 670, 20, '#9ab8d8');
  },

  // ---------- Skib-vælger ----------
  openSelect(G) {
    const humans = G.players.filter((p) => !p.ai);
    humans.forEach((p, i) => { this.cursors[i] = p.shipIdx; this.locked[i] = false; });
    this.lockT = 0;
    this.factIdx = Math.floor(Math.random() * FACTS.length);
    this.factT = 0;
    G.setState('select');
  },

  updateSelect(G, dt) {
    if (Input.hit('Escape')) { G.round = 0; G.startDemo(); G.setState('modes'); return; }
    this.factT += dt;
    if (this.factT > 7) { this.factT = 0; this.factIdx = (this.factIdx + 1) % FACTS.length; }
    const humans = G.players.filter((p) => !p.ai);
    const n = SHIP_DEFS.length;
    humans.forEach((p, i) => {
      const m = Input.menu(p.keyset);
      if (!this.locked[i]) {
        if (m.dx) { this.cursors[i] = (this.cursors[i] + m.dx + n) % n; Sound.tick(); }
        if (m.ok && G.stateTime > 0.25) {
          this.locked[i] = true;
          p.shipIdx = this.cursors[i];
          Sound.select();
          if (SHIP_DEFS[p.shipIdx].id === 'gris') Sound.oink();
        }
      } else if (m.dy > 0) {
        this.locked[i] = false; // fortryd med special-tasten
        Sound.tick();
      }
    });
    if (humans.every((p, i) => this.locked[i])) {
      this.lockT += dt;
      if (this.lockT > 0.7) G.startMatch();
    } else this.lockT = 0;
  },

  drawSelect(ctx, G) {
    const t = G.t;
    const humans = G.players.filter((p) => !p.ai);
    const mode = MODES.find((m) => m.id === G.mode);
    text(ctx, 'Vælg dit rumskib', W / 2, 44, 44, '#ffe35a');
    let sub = mode ? mode.name : '';
    if (G.isDuel && G.round > 0) sub += `  ·  Stilling ${G.players[0].wins} – ${G.players[1].wins}  ·  Runde ${G.round + 1}`;
    if (G.mode === 'duelAI') sub += `  ·  Computer: ${AI_SKILL[G.difficulty].name}`;
    text(ctx, sub, W / 2, 86, 20, '#9ab8d8');

    // Kort med alle skibe
    const cw = 186, ch = 168, gap = 14;
    const x0 = (W - (cw * 6 + gap * 5)) / 2, y0 = 110;
    SHIP_DEFS.forEach((d, i) => {
      const x = x0 + i * (cw + gap);
      const here = humans.map((p, k) => (this.cursors[k] === i ? k : -1)).filter((k) => k >= 0);
      ctx.fillStyle = here.length ? 'rgba(80,120,220,0.28)' : 'rgba(255,255,255,0.06)';
      roundRect(ctx, x, y0, cw, ch, 16);
      ctx.fill();
      here.forEach((k, j) => {
        ctx.strokeStyle = P_COLORS[k];
        ctx.lineWidth = 4;
        roundRect(ctx, x - j * 6, y0 - j * 6, cw + j * 12, ch + j * 12, 16 + j * 4);
        ctx.stroke();
      });
      const spin = here.length ? t * 1.2 : -0.5;
      drawShipPreview(ctx, d, x + cw / 2, y0 + 72, Math.min(1.9, 36 / d.radius), spin, t, here.length > 0);
      text(ctx, d.name, x + cw / 2, y0 + ch - 22, 22, d.color);
    });

    // Info om det valgte skib for hver spiller
    const panels = humans.length;
    const pw = panels === 2 ? 590 : 760;
    humans.forEach((p, k) => {
      const px = panels === 2 ? (k === 0 ? 40 : W - 40 - pw) : (W - pw) / 2;
      const py = 300;
      const d = SHIP_DEFS[this.cursors[k]];
      ctx.fillStyle = 'rgba(10,12,40,0.75)';
      roundRect(ctx, px, py, pw, 340, 20);
      ctx.fill();
      ctx.strokeStyle = P_COLORS[k];
      ctx.lineWidth = 3;
      ctx.stroke();
      const label = panels === 2 ? P_NAMES[k] : 'Dig';
      text(ctx, label, px + 20, py + 26, 22, P_COLORS[k], 'left');
      text(ctx, KEY_HELP[p.keyset], px + pw - 16, py + 26, 15, '#9ab8d8', 'right');
      drawShipPreview(ctx, d, px + 105, py + 125, Math.min(2.6, 52 / d.radius), Math.sin(t) * 0.4 - 0.3, t, true);
      text(ctx, d.name, px + 105, py + 212, 28, d.color);
      wrapText(ctx, d.tagline, px + 18, py + 244, 190, 14, '#cfe8ff');
      // Stats-søjler
      const sx = px + 230;
      STAT_NAMES.forEach(([key, name], j) => {
        const y = py + 66 + j * 30;
        text(ctx, name, sx, y, 18, '#cfe8ff', 'left');
        for (let b = 0; b < 5; b++) {
          ctx.fillStyle = b < d.stats[key] ? ['#7dff9a', '#ffe35a', '#ff8a5a', '#4fd8ff', '#c79aff'][j] : 'rgba(255,255,255,0.12)';
          roundRect(ctx, sx + 110 + b * 30, y - 9, 25, 18, 5);
          ctx.fill();
        }
      });
      const tx = sx, tw = pw - (sx - px) - 16;
      const lines = [['👍 ', d.strong, '#7dff9a'], ['👎 ', d.weak, '#ff9a8a'], ['✨ ', d.specialName, '#ffe35a']];
      let ly = py + 226;
      for (const [ic, str, col] of lines) ly = wrapText(ctx, ic + str, tx, ly, tw, 16, col) + 6;
      if (this.locked[k]) {
        ctx.save();
        ctx.translate(px + 105, py + 130);
        ctx.rotate(-0.2);
        text(ctx, 'KLAR!', 0, 0, 52, '#7dff9a', 'center', '#0a3a1a');
        ctx.restore();
      } else {
        text(ctx, `← → vælg · ${p.keyset === 'p2' ? 'L' : p.keyset === 'p1' ? 'F' : 'MELLEMRUM'} = klar`, px + 105, py + 318, 15, '#ffd27a');
      }
    });

    // Vidste du?
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(ctx, 80, 652, W - 160, 52, 14);
    ctx.fill();
    text(ctx, `🚀 Vidste du? ${FACTS[this.factIdx]}`, W / 2, 678, 18, '#cfe8ff');
  },
};

// Tekst der brydes over flere linjer hvis den er for lang
function wrapText(ctx, str, x, y, maxW, size, color) {
  ctx.font = `bold ${size}px ${FONT}`;
  const words = str.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      text(ctx, line, x, yy, size, color, 'left');
      line = w;
      yy += size + 2;
    } else line = test;
  }
  if (line) text(ctx, line, x, yy, size, color, 'left');
  return yy + size + 2;
}
