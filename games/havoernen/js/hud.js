// Skærmens faste visninger: penge, vindrose, kanon-panel, lille kort og beskeder.
const HUD = {
  draw(ctx, G) {
    const P = G.player;
    this.topBar(ctx, G, P);
    this.compass(ctx, P, 90, 625);
    this.gunPanel(ctx, P, 640, 640);
    this.minimap(ctx, G, 1280 - 200 - 14, 14, 200);
    this.prompts(ctx, G);
    this.toasts(ctx, G);
  },

  panel(ctx, x, y, w, h) {
    roundRect(ctx, x, y, w, h, 14);
    ctx.fillStyle = 'rgba(10,25,50,0.62)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; ctx.stroke();
  },

  bar(ctx, x, y, w, h, frac, color) {
    roundRect(ctx, x, y, w, h, h / 2); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
    if (frac > 0) { roundRect(ctx, x, y, Math.max(h, w * clamp(frac, 0, 1)), h, h / 2); ctx.fillStyle = color; ctx.fill(); }
  },

  topBar(ctx, G, P) {
    this.panel(ctx, 64, 10, 640, 58);
    ctx.font = 'bold 22px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe066';
    ctx.fillText(`💰 ${fmtMoney(G.money)}`, 80, 30);
    ctx.fillStyle = '#c3f0ca';
    ctx.fillText(`📦 Last: ${fmtMoney(G.cargoValue)}`, 255, 30);
    ctx.fillStyle = '#fff';
    ctx.fillText(`🎖️ ${G.rank.name}`, 470, 30);
    ctx.font = '15px "Comic Sans MS", sans-serif';
    ctx.fillStyle = '#cfe8ff';
    const next = G.nextRank;
    ctx.fillText(next ? `Næste rang: ${next.name} ved ${fmtMoney(next.at)} tjent` : 'Højeste rang!', 470, 54);
    ctx.fillText('Skrog', 80, 54);
    const f = P.hp / P.maxHp;
    this.bar(ctx, 130, 47, 320, 13, f, f > 0.5 ? '#06d6a0' : f > 0.25 ? '#ffd166' : '#ef476f');
  },

  compass(ctx, P, cx, cy) {
    const r = 70;
    this.panel(ctx, cx - r - 14, cy - r - 30, 2 * r + 28 + 150, 2 * r + 44);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.stroke();
    // Vindøjet: det røde felt hvor man ikke kan sejle
    const from = Wind.angle + Math.PI;
    ctx.fillStyle = 'rgba(239,71,111,0.35)';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, from - 35 * DEG, from + 35 * DEG); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(6,214,160,0.25)';
    for (const s of [1, -1]) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, from + s * 60 * DEG, from + s * 110 * DEG, s < 0); ctx.closePath(); ctx.fill();
    }
    ctx.font = 'bold 15px "Comic Sans MS", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('N', 0, -r + 11); ctx.fillText('S', 0, r - 11); ctx.fillText('Ø', r - 11, 0); ctx.fillText('V', -r + 11, 0);
    // Vindpil (blæser hen mod)
    ctx.save();
    ctx.rotate(Wind.angle);
    ctx.strokeStyle = '#a5d8ff'; ctx.fillStyle = '#a5d8ff'; ctx.lineWidth = 6;
    const len = 30 + Wind.strength * 25;
    ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(len - 12, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(len + 4, 0); ctx.lineTo(len - 16, -12); ctx.lineTo(len - 16, 12); ctx.closePath(); ctx.fill();
    ctx.restore();
    // Skibets kurs
    ctx.save();
    ctx.rotate(P.heading);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.moveTo(r - 2, 0); ctx.lineTo(r - 18, -8); ctx.lineTo(r - 18, 8); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();

    const pos = pointOfSail(P.relWind);
    ctx.textAlign = 'left';
    outlineText(ctx, 'VIND', cx + r + 18, cy - 70, 15, '#a5d8ff', 'left');
    outlineText(ctx, `fra ${Wind.fromName}`, cx + r + 18, cy - 48, 20, '#fff', 'left');
    outlineText(ctx, Wind.label, cx + r + 18, cy - 26, 16, '#cfe8ff', 'left');
    outlineText(ctx, pos.name, cx + r + 18, cy + 6, 22, pos.color, 'left');
    outlineText(ctx, pos.tip, cx + r + 18, cy + 30, 13, '#e0f0ff', 'left');
    const sailTxt = ['Sejl nede', 'Halve sejl', 'Fulde sejl'][P.sail];
    outlineText(ctx, `⛵ ${sailTxt}`, cx + r + 18, cy + 56, 16, '#fff', 'left');
    outlineText(ctx, `Fart ${Math.round(P.speed / 10)} knob`, cx + r + 18, cy + 76, 14, '#cfe8ff', 'left');
  },

  // Skibet set bagfra: krængningen og hvor højt kanonerne peger på hver side
  gunPanel(ctx, P, cx, cy) {
    const w = 380, h = 150;
    this.panel(ctx, cx - w / 2, cy - h / 2 - 8, w, h);
    outlineText(ctx, 'KANONER', cx, cy - 66, 15, '#ffd166');
    ctx.save();
    ctx.translate(cx, cy + 22);
    // vandlinje
    ctx.strokeStyle = '#5fb4ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-90, 18); ctx.quadraticCurveTo(0, 12, 90, 18); ctx.stroke();
    ctx.rotate(P.heel * DEG * 2); // vist dobbelt så meget, så man kan se det
    // skrog bagfra
    ctx.fillStyle = '#8a5a33';
    ctx.beginPath(); ctx.moveTo(-34, -8); ctx.lineTo(34, -8); ctx.lineTo(24, 18); ctx.lineTo(-24, 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5b3a1e'; ctx.fillRect(-3, -62, 6, 54);
    ctx.fillStyle = '#fffbea';
    if (P.sail > 0) { ctx.beginPath(); ctx.moveTo(-26, -56); ctx.lineTo(26, -56); ctx.lineTo(30, -16); ctx.lineTo(-30, -16); ctx.closePath(); ctx.fill(); }
    // kanonløb – vinklen er den rigtige hældning på hver side
    for (const side of [-1, 1]) {
      const e = P.effElev(side) * DEG;
      ctx.save();
      ctx.translate(side * 32, -2);
      ctx.rotate(side > 0 ? -e - P.heel * DEG * 2 : Math.PI + e - P.heel * DEG * 2);
      ctx.fillStyle = '#222'; ctx.fillRect(0, -3, 22, 6);
      ctx.fillStyle = SIDE[side].color; ctx.fillRect(16, -4, 7, 8);
      ctx.restore();
    }
    ctx.restore();
    // tal: venstre = bagbord, højre = styrbord
    for (const side of [-1, 1]) {
      const x = cx + side * 130;
      const ready = P.reload[side] <= 0;
      keyBadge(ctx, x - 52, cy - 40, SIDE[side].key, SIDE[side].color, 12);
      outlineText(ctx, SIDE[side].name, x + 10, cy - 40, 16, SIDE[side].color);
      outlineText(ctx, `${P.effElev(side).toFixed(0)}°`, x, cy - 12, 30, '#ffe066');
      this.bar(ctx, x - 50, cy + 12, 100, 12, 1 - P.reload[side] / P.reloadTime, ready ? '#06d6a0' : '#ef8354');
      outlineText(ctx, ready ? 'KLAR!' : 'lader...', x, cy + 36, 14, ready ? '#8ce99a' : '#ffb4a2');
    }
    const heelTxt = Math.abs(P.heel) < 1 ? 'Skibet ligger lige' : `Krænger ${Math.abs(P.heel).toFixed(0)}° mod ${P.heel > 0 ? 'styrbord' : 'bagbord'}`;
    outlineText(ctx, `Hældning ${P.elev.toFixed(0)}° (W/S) · ${heelTxt}`, cx, cy + 58, 13, '#cfe8ff');
  },

  minimap(ctx, G, x, y, w) {
    const h = w * MAP.h / MAP.w;
    const s = w / MAP.w;
    this.panel(ctx, x - 4, y - 4, w + 8, h + 8);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = '#2c7fb8'; ctx.fillRect(x, y, w, h);
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#8cc265';
    for (const l of Sea.lands) { Sea.polyPath(ctx, l.pts); ctx.fill(); }
    ctx.fillStyle = '#fff4c2';
    for (const hb of Sea.harbors) { ctx.beginPath(); ctx.arc(hb.x, hb.y, 30, 0, TAU); ctx.fill(); }
    for (const sh of G.ships) {
      if (sh.isPlayer || sh.sinking) continue;
      ctx.fillStyle = sh.surrendered ? '#ffffff' : sh.type === 'pirate' ? '#111' : sh.flag === 'green' ? '#2fd37a' : '#e63946';
      ctx.beginPath(); ctx.arc(sh.x, sh.y, sh.type === 'frigate' ? 40 : 30, 0, TAU); ctx.fill();
    }
    // udsnit
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 12;
    ctx.strokeRect(G.cam.x, G.cam.y, G.cam.w, G.cam.h);
    const P = G.player;
    ctx.fillStyle = '#ffd166';
    ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.heading);
    ctx.beginPath(); ctx.moveTo(70, 0); ctx.lineTo(-45, -40); ctx.lineTo(-45, 40); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
    outlineText(ctx, 'K = stort kort', x + w / 2, y + h + 16, 13, '#cfe8ff');
  },

  bigMap(ctx, G) {
    ctx.fillStyle = 'rgba(5,15,30,0.85)'; ctx.fillRect(0, 0, 1280, 720);
    const h = 650, w = h * MAP.w / MAP.h, x = (1280 - w) / 2, y = 40;
    const s = w / MAP.w;
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#2c7fb8'; ctx.fillRect(0, 0, MAP.w, MAP.h);
    for (const l of Sea.lands) {
      Sea.polyPath(ctx, l.pts);
      ctx.fillStyle = '#8cc265'; ctx.fill();
      ctx.strokeStyle = '#e9d8a6'; ctx.lineWidth = 8; ctx.stroke();
    }
    for (const lb of Sea.labels) { ctx.globalAlpha = 0.6; outlineText(ctx, lb.text, lb.x, lb.y, 95, '#d7f0ff', 'center', 'italic bold'); ctx.globalAlpha = 1; }
    for (const hb of Sea.harbors) outlineText(ctx, '⚓ ' + hb.name, hb.x, hb.y, 95, '#fff4c2');
    for (const sh of G.ships) {
      if (sh.isPlayer || sh.sinking) continue;
      ctx.fillStyle = sh.surrendered ? '#ffffff' : sh.type === 'pirate' ? '#111' : sh.flag === 'green' ? '#2fd37a' : '#e63946';
      ctx.beginPath(); ctx.arc(sh.x, sh.y, 22, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke();
    }
    const P = G.player;
    ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.heading);
    ctx.fillStyle = '#ffd166'; ctx.strokeStyle = '#000'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(60, 0); ctx.lineTo(-40, -34); ctx.lineTo(-40, 34); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.restore();
    // forklaring
    const lx = x + w + 24;
    outlineText(ctx, 'KORTET', lx, 70, 28, '#ffd166', 'left');
    const rows = [['#ffd166', 'Havørnen (dig)'], ['#2fd37a', 'Fremmede skibe – må opbringes'], ['#111', 'Sørøvere – dusør!'],
      ['#e63946', 'Danske skibe – lad dem være'], ['#ffffff', 'Har overgivet sig']];
    rows.forEach(([c, t], i) => {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(lx + 8, 115 + i * 34, 9, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      outlineText(ctx, t, lx + 26, 115 + i * 34, 15, '#fff', 'left', 'normal');
    });
    outlineText(ctx, '⚓ = havn', lx, 300, 16, '#fff4c2', 'left');
    outlineText(ctx, 'K eller ESC lukker kortet', lx, 340, 15, '#cfe8ff', 'left', 'normal');
  },

  prompts(ctx, G) {
    const p = G.prompt;
    if (!p) return;
    const pulse = 0.75 + Math.sin(G.t * 6) * 0.25;
    ctx.globalAlpha = pulse;
    this.panel(ctx, 640 - 230, 488, 460, 44);
    ctx.globalAlpha = 1;
    outlineText(ctx, p, 640, 510, 22, '#ffe066');
  },

  toasts(ctx, G) {
    let y = 100;
    for (const m of G.toasts) {
      const a = Math.min(1, m.t * 2);
      ctx.globalAlpha = a;
      outlineText(ctx, m.text, 640, y, m.size || 24, m.color);
      ctx.globalAlpha = 1;
      y += (m.size || 24) + 12;
    }
  },
};
