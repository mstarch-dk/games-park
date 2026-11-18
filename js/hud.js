// Point, liv og power-ups øverst på skærmen.
function drawHUD(ctx, g) {
  const p = g.player;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  roundRect(ctx, 8, 8, 200, 74, 12);
  ctx.fill();

  const shown = Math.min(g.lives, 6);
  for (let i = 0; i < shown; i++) drawHeart(ctx, 30 + i * 30, 30, 12);
  if (g.lives > 6) text(ctx, `+${g.lives - 6}`, 30 + 6 * 30, 30, 18, '#ffb3c1', 'left');

  drawBanana(ctx, 32, 62, 0, 1);
  text(ctx, `${g.bananaCount % 50} / 50`, 52, 62, 20, '#ffe46b', 'left');

  text(ctx, `Bane ${g.levelIndex + 1}: ${g.level.def.name}`, W / 2, 26, 24, '#fff');

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  roundRect(ctx, W - 218, 8, 210, 40, 12);
  ctx.fill();
  text(ctx, `POINT: ${g.score}`, W - 18, 29, 22, '#fff', 'right');

  // Aktive power-ups
  let x = W - 40;
  const slot = (draw, frac, color) => {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    roundRect(ctx, x - 22, 54, 44, 52, 10);
    ctx.fill();
    draw(x, 76);
    if (frac !== null) {
      ctx.fillStyle = '#333';
      ctx.fillRect(x - 17, 96, 34, 6);
      ctx.fillStyle = color;
      ctx.fillRect(x - 17, 96, 34 * frac, 6);
    }
    x -= 52;
  };
  if (p.hammer > 0) slot((sx, sy) => drawHammerIcon(ctx, sx, sy, 0.9, 0), p.hammer / 10, '#ffd23b');
  if (p.star > 0) slot((sx, sy) => drawStarShape(ctx, sx, sy, 14, 0, '#ffe234', '#c79a00'), p.star / 8, '#fff36b');
  if (p.feather) slot((sx, sy) => drawFeather(ctx, sx, sy, 0.9, 0), null);
  if (p.energy > 0) slot((sx, sy) => drawBolt(ctx, sx, sy - 2, 1), p.energy / p.energyMax, '#ffe234');

  // Bombefly på vej!
  const incoming = g.bomberWarn > 0 || (g.bomber && g.bomber.x - BOMBER_HALF > g.camX + W);
  if (incoming && Math.floor(g.t * 6) % 2 === 0) {
    text(ctx, 'BOMBEFLY!', W / 2, 64, 36, '#ff5a4a');
    ctx.fillStyle = '#ff5a4a';
    ctx.strokeStyle = '#2a1a0a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(W - 14, 150); ctx.lineTo(W - 50, 126); ctx.lineTo(W - 50, 174);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  }
}

function menuButton(ctx, cx, cy, w, h, label, active) {
  ctx.fillStyle = active ? '#ffd23b' : 'rgba(30,15,50,0.82)';
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = active ? '#fff' : '#ffd23b';
  ctx.lineWidth = active ? 4 : 2;
  ctx.stroke();
  text(ctx, label, cx, cy, 24, active ? '#4a2508' : '#fff', 'center', active ? '#ffe98f' : '#2a1a0a');
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(30,15,50,0.78)';
  roundRect(ctx, x, y, w, h, 22);
  ctx.fill();
  ctx.strokeStyle = '#ffd23b';
  ctx.lineWidth = 4;
  ctx.stroke();
}
