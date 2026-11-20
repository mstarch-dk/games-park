// Alt det der står ovenpå spillet: liv, energi, point, radar og beskeder.
function drawHUD(ctx, G) {
  drawTags(ctx, G);
  G.players.forEach((p, i) => drawPlayerPanel(ctx, G, p, i));

  if (!G.isDuel) {
    text(ctx, `BØLGE ${Waves.wave}`, W / 2, 26, 24, '#ffd27a');
    text(ctx, `POINT: ${G.score}`, W / 2, 56, 28, '#fff');
    if (G.highscore) text(ctx, `Rekord: ${Math.max(G.highscore, G.score)}`, W / 2, 84, 16, '#9ab8d8');
  } else {
    text(ctx, `Runde ${G.round}`, W / 2, 26, 22, '#ffd27a');
    text(ctx, `${G.players[0].wins} – ${G.players[1].wins}`, W / 2, 56, 30, '#fff');
  }

  drawRadar(ctx, G);
  if (G.showVector) drawVectorLegend(ctx);
  drawBanner(ctx, G);

  if (G.state === 'countdown') {
    const n = 3 - Math.floor(G.stateTime / 0.6);
    const str = n > 0 ? String(n) : 'KÆMP!';
    const f = (G.stateTime % 0.6) / 0.6;
    text(ctx, str, W / 2, H / 2 - 40, 120 * (1.3 - f * 0.3), n > 0 ? '#fff' : '#ffe35a');
  }
  if (G.state === 'paused') {
    overlay(ctx, 0.55);
    text(ctx, 'PAUSE', W / 2, H / 2 - 30, 80, '#fff');
    text(ctx, 'P fortsæt · ESC til menuen', W / 2, H / 2 + 40, 24, '#cfe8ff');
  }
  if (G.state === 'roundOver') {
    const w = G.roundWinner;
    const name = w ? winnerName(G, w) : 'Uafgjort!';
    text(ctx, w ? `${name} vinder runden!` : name, W / 2, H / 2 - 60, 56, w ? P_COLORS[w.index] : '#fff');
    text(ctx, `Stilling: ${G.players[0].wins} – ${G.players[1].wins}   (først til ${WINS_NEEDED})`, W / 2, H / 2 + 10, 28, '#fff');
    if (G.stateTime > 1.2) text(ctx, 'Tryk MELLEMRUM for næste runde', W / 2, H / 2 + 70, 24, '#ffe35a');
  }
  if (G.state === 'matchOver') {
    const w = G.roundWinner;
    text(ctx, `${winnerName(G, w).toUpperCase()} VINDER!`, W / 2, H / 2 - 60, 72, P_COLORS[w.index]);
    text(ctx, `${G.players[0].wins} – ${G.players[1].wins}`, W / 2, H / 2 + 20, 44, '#fff');
    if (G.stateTime > 2) text(ctx, 'Tryk MELLEMRUM for at spille igen', W / 2, H / 2 + 80, 24, '#ffe35a');
  }
  if (G.state === 'gameover') {
    overlay(ctx, 0.5);
    text(ctx, 'GAME OVER', W / 2, H / 2 - 90, 90, '#ff6a6a');
    text(ctx, `Du nåede bølge ${Waves.wave} og fik ${G.score} point`, W / 2, H / 2, 32, '#fff');
    if (G.newHigh) text(ctx, 'NY REKORD!', W / 2, H / 2 + 50, 40 + Math.sin(G.t * 6) * 4, '#ffe35a');
    else text(ctx, `Rekord: ${G.highscore}`, W / 2, H / 2 + 50, 24, '#9ab8d8');
    if (G.stateTime > 1.5) text(ctx, 'MELLEMRUM prøv igen · ESC menu', W / 2, H / 2 + 110, 24, '#ffe35a');
  }
}

function winnerName(G, p) {
  if (G.mode === 'duelAI') return p.ai ? 'Computeren' : 'Du';
  return P_NAMES[p.index];
}

function overlay(ctx, a) {
  ctx.fillStyle = `rgba(5,4,20,${a})`;
  ctx.fillRect(0, 0, W, H);
}

function drawPlayerPanel(ctx, G, p, i) {
  const pw = 300, ph = G.isDuel ? 86 : 96;
  const x = i === 0 ? 12 : W - pw - 12, y = 10;
  const s = p.ship;
  const def = SHIP_DEFS[p.shipIdx];
  ctx.fillStyle = 'rgba(0,0,20,0.45)';
  roundRect(ctx, x, y, pw, ph, 14);
  ctx.fill();
  ctx.fillStyle = P_COLORS[i];
  roundRect(ctx, x, y, 8, ph, 4);
  ctx.fill();
  drawShipPreview(ctx, def, x + 40, y + 42, 0.85, -Math.PI / 2, G.t, false);
  let label = G.mode === 'duelAI' ? (p.ai ? `Computer (${AI_SKILL[p.skill].name})` : 'Dig') : (G.humanCount > 1 ? P_NAMES[i] : 'Dig');
  text(ctx, `${label} · ${def.name}`, x + 76, y + 18, 16, P_COLORS[i], 'left');
  const hp = s && s.alive ? s.hp / s.maxHp : 0;
  const en = s && s.alive ? s.energy / def.energy : 0;
  text(ctx, 'LIV', x + 76, y + 42, 13, '#cfe8ff', 'left');
  bar(ctx, x + 112, y + 35, 176, 13, hp, hp > 0.5 ? '#5aff7a' : hp > 0.25 ? '#ffd23f' : '#ff4a4a');
  text(ctx, 'ENERGI', x + 76, y + 62, 13, '#cfe8ff', 'left');
  ctx.save();
  ctx.font = `bold 13px ${FONT}`;
  const ew = ctx.measureText('ENERGI ').width;
  ctx.restore();
  bar(ctx, x + 76 + ew, y + 56, 212 - ew, 11, en, '#4fd8ff');
  if (G.isDuel) {
    for (let k = 0; k < WINS_NEEDED; k++) star(ctx, x + 90 + k * 26, y + 76, 9, k < p.wins ? '#ffe35a' : 'rgba(255,255,255,0.18)');
  } else {
    text(ctx, 'LIV TILBAGE', x + 76, y + 82, 13, '#cfe8ff', 'left');
    for (let k = 0; k < Math.min(p.lives, 8); k++) {
      circle(ctx, x + 180 + k * 16, y + 82, 6, P_COLORS[i], '#000', 1);
    }
    if (p.respawnT > 0) text(ctx, `Tilbage om ${Math.ceil(p.respawnT)}...`, x + pw / 2, y + ph + 18, 18, P_COLORS[i]);
  }
}

function star(ctx, x, y, r, color) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * TAU;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  poly(ctx, pts, color, 'rgba(0,0,0,0.5)', 1.5);
}

// Små navneskilte over skibene
function drawTags(ctx, G) {
  const many = G.players.length > 1;
  if (!many) return;
  for (const p of G.players) {
    const s = p.ship;
    if (!s || !s.alive) continue;
    const pos = Camera.toScreen(s);
    const y = pos.y - (s.r * Camera.zoom + 26);
    const label = G.mode === 'duelAI' ? (p.ai ? 'CPU' : 'DIG') : `P${p.index + 1}`;
    text(ctx, label, pos.x, y, 16, P_COLORS[p.index]);
    poly(ctx, [pos.x - 6, y + 11, pos.x + 6, y + 11, pos.x, y + 18], P_COLORS[p.index]);
  }
}

// Radaren viser hele feltet. Midten er der hvor kameraet kigger.
function drawRadar(ctx, G) {
  const rw = 210, rh = rw * WORLD.h / WORLD.w;
  const x = W - rw - 14, y = H - rh - 14;
  const k = rw / WORLD.w;
  ctx.fillStyle = 'rgba(0,10,30,0.6)';
  roundRect(ctx, x, y, rw, rh, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,200,255,0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  roundRect(ctx, x, y, rw, rh, 10);
  ctx.clip();
  const cx = x + rw / 2, cy = y + rh / 2;
  const P = (o) => ({ x: cx + wrapD(Camera.x, o.x, WORLD.w) * k, y: cy + wrapD(Camera.y, o.y, WORLD.h) * k });
  // Det kameraet kan se
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - (W / Camera.zoom) * k / 2, cy - (H / Camera.zoom) * k / 2, (W / Camera.zoom) * k, (H / Camera.zoom) * k);
  if (G.planet) {
    const p = P(G.planet);
    circle(ctx, p.x, p.y, Math.max(4, G.planet.r * k), G.planet.type.base);
  }
  if (G.base) {
    const p = P(G.base);
    ctx.fillStyle = G.base.shielded ? '#7ad8ff' : '#ff5a5a';
    ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
  }
  for (const pr of G.projectiles) {
    if (pr.kind !== 'mine' && pr.kind !== 'missile') continue;
    const p = P(pr);
    ctx.fillStyle = 'rgba(255,200,200,0.7)';
    ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
  }
  for (const pu of G.pickups) {
    const p = P(pu);
    ctx.fillStyle = '#7dff9a';
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  for (const s of G.ships) {
    if (!s.alive) continue;
    const p = P(s);
    const col = s.player !== undefined ? P_COLORS[s.player] : '#ff4a4a';
    circle(ctx, p.x, p.y, s.player !== undefined ? 4 : 3, col);
  }
  ctx.restore();
  text(ctx, 'RADAR', x + 8, y - 10, 13, 'rgba(160,210,255,0.7)', 'left');
}

function drawVectorLegend(ctx) {
  const x = 16, y = H - 46;
  ctx.fillStyle = 'rgba(0,10,30,0.5)';
  roundRect(ctx, x - 6, y - 14, 300, 50, 10);
  ctx.fill();
  ctx.strokeStyle = '#6dff8a';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.beginPath(); ctx.moveTo(x + 4, y); ctx.lineTo(x + 40, y); ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, '= hvor du flyver hen', x + 50, y, 15, '#bfffc8', 'left');
  ctx.strokeStyle = '#ffe35a';
  ctx.beginPath(); ctx.arc(x + 22, y + 40, 16, -Math.PI / 2 - 0.25, -Math.PI / 2 + 0.25); ctx.stroke();
  text(ctx, '= hvor næsen peger  (V slår fra)', x + 50, y + 22, 15, '#fff2b0', 'left');
}

function drawBanner(ctx, G) {
  const b = G.banner;
  if (!b) return;
  const a = Math.min(1, b.t * 4, (b.dur - b.t) * 3);
  ctx.globalAlpha = Math.max(0, a);
  const s = 1 + Math.max(0, 0.3 - b.t) * 1.5;
  text(ctx, b.text, W / 2, 190, 64 * s, '#ffe35a');
  if (b.sub) text(ctx, b.sub, W / 2, 250, 26, '#fff');
  ctx.globalAlpha = 1;
}
