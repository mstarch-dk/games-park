// Point, hjerter, skud-niveau, venne-fly, reservefly og bossens energi.
const HUD = {
  draw() {
    const g = Game;
    // topbjælke
    ctx.fillStyle = 'rgba(10,30,60,0.35)';
    ctx.fillRect(0, 0, W, 56);
    Draw.text(`Bane ${g.level + 1}${g.loop ? '+' : ''}: ${Background.theme.name}`, 16, 28, 20, '#fff', 'left');
    Draw.text(g.score.toLocaleString('da-DK'), W / 2, 28, 34, '#ffd166');
    Draw.text(`Rekord ${Math.max(g.highscore, g.score).toLocaleString('da-DK')}`, W - 16, 18, 15, '#e0f2ff', 'right');
    // reservefly
    const n = Math.min(g.reserves, 6);
    for (let i = 0; i < n; i++) {
      drawPlane({ x: W - 24 - i * 30, y: 40, scale: 0.26, look: PLAYER_LOOKS[0], prop: 0 });
    }
    if (g.reserves > 6) Draw.text(`×${g.reserves}`, W - 24 - 6 * 30, 40, 15, '#fff');

    if (g.boss && !g.boss.dead) this.drawBossBar(g.boss);

    for (const p of g.players) this.drawPlayer(p);
  },

  drawBossBar(b) {
    const w = 360, x = W / 2 - w / 2, y = 66;
    Draw.roundRect(x - 4, y - 4, w + 8, 26, 10);
    ctx.fillStyle = 'rgba(10,30,60,0.6)'; ctx.fill();
    Draw.roundRect(x, y, w * (b.hp / b.hpMax), 18, 8);
    ctx.fillStyle = '#c77dff'; ctx.fill();
    Draw.text('Brumle-Zeppelineren', W / 2, y + 9, 14, '#fff');
  },

  drawPlayer(p) {
    const right = p.index === 1;
    const x0 = right ? W - 16 : 16;
    const dir = right ? -1 : 1;
    const y = H - 30;
    ctx.fillStyle = 'rgba(10,30,60,0.35)';
    Draw.roundRect(right ? W - 236 : 6, H - 82, 230, 76, 14);
    ctx.fill();
    // hjerter
    for (let i = 0; i < MAX_HP; i++) {
      const full = p.alive && i < p.hp;
      Draw.heart(x0 + dir * (14 + i * 30), y - 30, 22, full ? '#ff4d6d' : 'rgba(255,255,255,0.25)');
    }
    // skud-niveau som stjerner
    for (let i = 0; i < MAX_WEAPON; i++) {
      Draw.star(x0 + dir * (12 + i * 20), y + 4, 9, i < p.weapon ? '#ffd166' : 'rgba(255,255,255,0.2)');
    }
    // venne-fly
    for (let i = 0; i < p.specials; i++) {
      drawPlane({ x: x0 + dir * (128 + i * 22), y: y + 4, scale: 0.22, look: { body: '#2a9d8f', wing: '#ffffff', stripe: '#2a9d8f', nose: '#ffd166' }, prop: 0 });
    }
    if (p.count > 1) Draw.text(p.index === 0 ? 'Spiller 1' : 'Spiller 2', x0 + dir * 6, H - 96, 16, p.look.body, right ? 'right' : 'left', '#fff');

    // beskeder midt på skærmen
    if (!p.alive) {
      const cy = H / 2 + 120 + p.index * 44;
      if (p.respawnT > 0) {
        Draw.text(`${p.count > 1 ? `Spiller ${p.index + 1}` : 'Du'} kommer igen om ${Math.ceil(p.respawnT)}...`, W / 2, cy, 26, '#fff');
      } else if (p.waiting && Game.players.some((q) => q.alive)) {
        Draw.text(`Spiller ${p.index + 1} venter – fang redningskransen!`, W / 2, cy, 24, '#ffd166');
      }
    }
  },
};
