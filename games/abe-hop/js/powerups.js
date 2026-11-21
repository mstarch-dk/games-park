// Bananer og power-ups.
const POWERUPS = {
  H: { name: 'HAMMER!', color: '#ffd23b' },
  S: { name: 'STJERNE!', color: '#fff36b' },
  W: { name: 'FJER: DOBBELTHOP!', color: '#bfe9ff' },
};

function drawBanana(ctx, x, y, t, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 3 + x * 0.05) * 0.2);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.moveTo(-12, -6);
  ctx.quadraticCurveTo(0, 14, 12, -6);
  ctx.quadraticCurveTo(0, 4, -12, -6);
  ctx.fillStyle = '#ffdc3b';
  ctx.fill();
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#5a3a10';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(11, -6); ctx.lineTo(14, -10);
  ctx.stroke();
  ctx.restore();
}

// Guld-banan: hænger så højt at den kun kan nås med super-hop.
function drawGoldBanana(ctx, x, y, t) {
  const bob = Math.sin(t * 3 + x) * 4;
  ctx.globalAlpha = 0.3 + Math.sin(t * 5 + x) * 0.12;
  circle(ctx, x, y + bob, 21, '#ffb800');
  ctx.globalAlpha = 1;
  drawBanana(ctx, x, y + bob, t, 1.3);
  const s = (t * 1.5 + x * 0.01) % 1;
  drawStarShape(ctx, x + 13, y + bob - 12, 6 * (1 - s), t * 3, '#fff');
}

function drawHammerIcon(ctx, x, y, s, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.fillStyle = '#a0682f';
  ctx.fillRect(-2.5, -6, 5, 22);
  ctx.fillStyle = '#8d96a8';
  roundRect(ctx, -12, -14, 24, 12, 3);
  ctx.fill();
  ctx.strokeStyle = '#3a3f4a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawFeather(ctx, x, y, s, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot - 0.6);
  ctx.scale(s, s);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.quadraticCurveTo(12, -4, 2, 14);
  ctx.quadraticCurveTo(-10, -2, 0, -16);
  ctx.fill();
  ctx.strokeStyle = '#7fc8ff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -12); ctx.lineTo(1, 18);
  ctx.stroke();
  ctx.restore();
}

function drawItem(ctx, it, t) {
  const bob = Math.sin(t * 3 + it.x) * 5;
  const x = it.x, y = it.y + bob;
  ctx.globalAlpha = 0.35 + Math.sin(t * 5) * 0.15;
  circle(ctx, x, y, 22, POWERUPS[it.type].color);
  ctx.globalAlpha = 1;
  if (it.type === 'H') drawHammerIcon(ctx, x, y, 1.1, Math.sin(t * 4) * 0.4);
  else if (it.type === 'W') drawFeather(ctx, x, y, 1.1, Math.sin(t * 3) * 0.3);
  else if (it.type === 'S') {
    drawStarShape(ctx, x, y, 17, Math.sin(t * 2) * 0.3, '#ffe234', '#c79a00');
    circle(ctx, x - 4, y - 2, 2, '#000');
    circle(ctx, x + 4, y - 2, 2, '#000');
  }
}
