// Tegning af propelfly set oppefra. Bruges både til spillerne, fjenderne og venne-flyene.
// Flyet tegnes med næsen opad (vinkel 0); vinkel PI vender det nedad.
const OUTLINE = '#123056';

function drawPlane(o) {
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.angle || 0);
  const s = o.scale || 1;
  ctx.scale(s * (1 - Math.abs(o.bank || 0) * 0.2), s);
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  const white = o.flash > 0;
  const body = white ? '#ffffff' : o.look.body;
  const wing = white ? '#ffffff' : o.look.wing;
  const stripe = white ? '#ffffff' : o.look.stripe;
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';

  // haleror
  Draw.roundRect(-17, 20, 34, 11, 5);
  ctx.fillStyle = wing; ctx.fill(); ctx.stroke();
  // vinger
  Draw.roundRect(-42, -10, 84, 22, 11);
  ctx.fillStyle = wing; ctx.fill(); ctx.stroke();
  ctx.fillStyle = stripe;
  ctx.fillRect(-31, -9, 8, 20);
  ctx.fillRect(23, -9, 8, 20);
  if (o.twin) {
    // to motorer ude på vingerne (bombefly)
    for (const dx of [-24, 24]) {
      Draw.ellipse(dx, -12, 7, 12, body); ctx.stroke();
      ctx.globalAlpha = (o.alpha ?? 1) * 0.35;
      Draw.ellipse(dx, -26, 13, 3, '#eef6ff');
      ctx.globalAlpha = o.alpha ?? 1;
      const l = 13 * Math.cos(o.prop || 0);
      ctx.beginPath(); ctx.moveTo(dx - l, -26); ctx.lineTo(dx + l, -26);
      ctx.lineWidth = 3.5; ctx.stroke(); ctx.lineWidth = 2.5;
    }
  }
  // krop
  Draw.ellipse(0, 2, 11, 32, body); ctx.stroke();
  // halefinne
  Draw.roundRect(-2.5, 17, 5, 17, 2);
  ctx.fillStyle = stripe; ctx.fill();

  if (o.eyes) {
    // store tegneserie-øjne der kigger efter spilleren
    const lx = clamp(o.eyes.x, -1, 1) * 2.2, ly = clamp(o.eyes.y, -1, 1) * 2.2;
    for (const dx of [-5, 5]) {
      Draw.circle(dx, -8, 5.5, '#ffffff'); ctx.lineWidth = 1.5; ctx.stroke();
      Draw.circle(dx + lx, -8 + ly, 2.6, OUTLINE);
    }
    ctx.lineWidth = 2.5;
  } else {
    // cockpit
    Draw.ellipse(0, -4, 6.5, 9, '#bfe9ff'); ctx.stroke();
    Draw.ellipse(-2, -7, 2, 3, '#ffffff');
  }
  if (!o.twin) {
    // næse og propel
    Draw.circle(0, -27, 8, white ? '#fff' : o.look.nose); ctx.stroke();
    ctx.globalAlpha = (o.alpha ?? 1) * 0.35;
    Draw.ellipse(0, -34, 21, 4, '#eef6ff');
    ctx.globalAlpha = o.alpha ?? 1;
    const l = 21 * Math.cos(o.prop || 0);
    ctx.beginPath(); ctx.moveTo(-l, -34); ctx.lineTo(l, -34);
    ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
  }
  ctx.restore();
}

// Flyets skygge nede på havet (lidt forskudt, så det ser ud som om flyet er højt oppe)
function drawPlaneShadow(x, y, angle, scale) {
  ctx.save();
  ctx.translate(x + 16 * scale, y + 26 * scale);
  ctx.rotate(angle || 0);
  ctx.scale(scale * 0.8, scale * 0.8);
  ctx.fillStyle = 'rgba(0,20,60,0.2)';
  Draw.roundRect(-42, -10, 84, 22, 11); ctx.fill();
  Draw.roundRect(-17, 20, 34, 11, 5); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 2, 11, 32, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

// Vinkel så næsen peger i bevægelsesretningen
function headingOf(vx, vy) {
  if (Math.abs(vx) + Math.abs(vy) < 1) return Math.PI;
  return Math.atan2(vx, -vy);
}
