// Temaer (farver) og parallax-baggrunde: lagene længst væk bevæger sig langsomst.
const THEMES = {
  jungle: {
    sky: ['#6ec6ff', '#d6f5ff'], sun: '#fff3a0', far: '#86c494', mid: '#4c9a5c', near: '#2f7a3f', deco: 'palms',
    ground: '#8b5a2b', groundDark: '#6b4220', top: '#4fc94f', grass: true, plat: '#b07a43', platTop: '#d9a066',
  },
  beach: {
    sky: ['#3fa9f5', '#fff0c2'], sun: '#fff7b0', far: '#a8d8c0', mid: '#79c08f', near: '#2e8a55', deco: 'beach', sea: true,
    ground: '#e8c47a', groundDark: '#c9a35a', top: '#fbe3a3', plat: '#9c6b3a', platTop: '#c99258',
  },
  volcano: {
    sky: ['#2b0f1e', '#ff7b3b'], sun: null, far: '#5a2535', mid: '#3a1a22', near: '#24100f', deco: 'volcano',
    ground: '#4a3b3b', groundDark: '#2e2424', top: '#8a5a48', plat: '#5a4a4a', platTop: '#8a7a70',
  },
  sky: {
    sky: ['#7cc1ff', '#fdfdff'], sun: '#fff6b0', far: '#cfe6ff', mid: '#e6f2ff', near: '#ffffff', deco: 'clouds',
    ground: '#ffffff', groundDark: '#d7e8fb', top: '#ffffff', plat: '#ffffff', platTop: '#ffffff', cloudy: true,
  },
  castle: {
    sky: ['#1d1b4f', '#8a5fc0'], sun: 'moon', far: '#3a2f6e', mid: '#2c2458', near: '#1a1438', deco: 'towers',
    ground: '#8a8aa0', groundDark: '#5f5f78', top: '#a8a8c0', bricks: true, plat: '#7a6a5a', platTop: '#a08a70',
  },
  desert: {
    sky: ['#f39a4a', '#ffeabc'], sun: '#fff1a8', far: '#e3ae70', mid: '#d09558', near: '#b97c42', deco: 'palms',
    ground: '#d9a95f', groundDark: '#b98a45', top: '#f3d591', plat: '#9c6b3a', platTop: '#c99258',
  },
  snow: {
    sky: ['#8fc8ef', '#f2fbff'], sun: '#ffffff', far: '#bcd5ea', mid: '#d5e5f3', near: '#edf5fb', deco: 'peaks', snowing: true,
    ground: '#94afc9', groundDark: '#7893ae', top: '#ffffff', plat: '#60809f', platTop: '#dff0ff',
  },
  night: {
    sky: ['#071226', '#27466f'], sun: 'moon', far: '#173150', mid: '#10263f', near: '#0a1a2c', deco: 'palms', darkPalms: true,
    clouds: 'rgba(70,95,135,0.45)',
    ground: '#3c3146', groundDark: '#2a2233', top: '#3f8f6a', grass: true, plat: '#5a4a5a', platTop: '#8a7a8a',
  },
};

function hills(ctx, off, color, base, amp, wl, seed, pointy = false) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W + 10; x += 10) {
    const wx = x + off;
    let s1 = Math.sin(wx / wl + seed);
    if (pointy) s1 = 1 - Math.abs(s1) * 2;
    const y = base - s1 * amp - Math.sin(wx / (wl * 0.43) + seed * 2) * amp * 0.35;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

// Tegner ting der gentager sig, fx palmer, med fast afstand.
function repeatLayer(off, spacing, fn) {
  const first = Math.floor(off / spacing) - 1;
  const count = Math.ceil(W / spacing) + 3;
  for (let i = first; i < first + count; i++) fn(i * spacing - off + rnd(i) * spacing * 0.4, i);
}

function cloud(ctx, x, y, s, color = 'rgba(255,255,255,0.9)') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
  ctx.arc(x + 25 * s, y - 10 * s, 26 * s, 0, Math.PI * 2);
  ctx.arc(x + 52 * s, y, 20 * s, 0, Math.PI * 2);
  ctx.arc(x + 26 * s, y + 6 * s, 22 * s, 0, Math.PI * 2);
  ctx.fill();
}

function palm(ctx, x, base, h, t, i, dark = false) {
  const sway = Math.sin(t * 1.5 + i) * 4;
  ctx.strokeStyle = dark ? '#132338' : '#7a4f2a';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x + 14, base - h * 0.5, x + 6 + sway, base - h);
  ctx.stroke();
  const tx = x + 6 + sway;
  const ty = base - h;
  ctx.fillStyle = dark ? '#123049' : '#2f9a3f';
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.sin(t + i) * 0.1;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(28, 6, 32, 9, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  circle(ctx, tx - 4, ty + 6, 5, '#6b3d1a');
  circle(ctx, tx + 5, ty + 7, 5, '#6b3d1a');
}

function tower(ctx, x, base, h, w, color, i, t) {
  ctx.fillStyle = color;
  ctx.fillRect(x, base - h, w, h);
  for (let k = 0; k < w / 14; k++) {
    if (k % 2 === 0) ctx.fillRect(x + k * 14, base - h - 12, 14, 12);
  }
  // vinduer der lyser
  const glow = 0.6 + Math.sin(t * 2 + i) * 0.2;
  ctx.fillStyle = `rgba(255,210,90,${glow})`;
  roundRect(ctx, x + w / 2 - 6, base - h + 30, 12, 20, 6);
  ctx.fill();
  if (h > 180) {
    roundRect(ctx, x + w / 2 - 6, base - h + 90, 12, 20, 6);
    ctx.fill();
  }
  // flag
  ctx.fillStyle = '#bbb';
  ctx.fillRect(x + w / 2 - 1, base - h - 50, 3, 40);
  ctx.fillStyle = '#ffd23b';
  ctx.beginPath();
  ctx.moveTo(x + w / 2 + 2, base - h - 50);
  ctx.lineTo(x + w / 2 + 24, base - h - 44 + Math.sin(t * 4 + i) * 3);
  ctx.lineTo(x + w / 2 + 2, base - h - 36);
  ctx.fill();
}

function drawBackground(ctx, camX, th, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, th.sky[0]);
  g.addColorStop(1, th.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Sol / måne og stjerner
  if (th.sun === 'moon') {
    for (let i = 0; i < 60; i++) {
      const sx = ((rnd(i) * W * 2 - camX * 0.03) % W + W) % W;
      const sy = rnd(i + 100) * 260;
      ctx.globalAlpha = 0.5 + Math.sin(t * 3 + i) * 0.4;
      circle(ctx, sx, sy, 1.5 + rnd(i + 7), '#fff');
    }
    ctx.globalAlpha = 1;
    circle(ctx, 780 - camX * 0.02, 90, 46, '#fff8d8');
    circle(ctx, 795 - camX * 0.02, 80, 40, th.sky[0]);
  } else if (th.sun) {
    const sx = 780 - camX * 0.02;
    ctx.globalAlpha = 0.3;
    circle(ctx, sx, 90, 70 + Math.sin(t * 2) * 4, th.sun);
    ctx.globalAlpha = 1;
    circle(ctx, sx, 90, 46, th.sun);
  }

  // Fjerne bjerge
  if (th.deco === 'volcano') {
    hills(ctx, camX * 0.1, th.far, 300, 80, 200, 1, true);
    // stor vulkan
    const vx = 520 - ((camX * 0.12) % 1600);
    for (const ox of [vx, vx + 1600]) {
      ctx.fillStyle = '#3d1822';
      ctx.beginPath();
      ctx.moveTo(ox - 260, H);
      ctx.lineTo(ox - 50, 150);
      ctx.lineTo(ox + 50, 150);
      ctx.lineTo(ox + 260, H);
      ctx.fill();
      ctx.fillStyle = '#ff6a2a';
      ctx.fillRect(ox - 50, 146, 100, 8);
      for (let k = 0; k < 4; k++) {
        const p = (t * 0.3 + k / 4) % 1;
        ctx.globalAlpha = 0.5 * (1 - p);
        circle(ctx, ox + Math.sin(k + t) * 20 + p * 60, 140 - p * 130, 18 + p * 30, '#555');
      }
      ctx.globalAlpha = 1;
    }
    // gnister
    for (let i = 0; i < 25; i++) {
      const p = (t * 0.15 + rnd(i)) % 1;
      const ex = ((rnd(i + 50) * W - camX * 0.3) % W + W) % W;
      circle(ctx, ex + Math.sin(t * 2 + i) * 10, H - p * H, 2, `rgba(255,${150 + i * 4},50,${1 - p})`);
    }
  } else {
    hills(ctx, camX * 0.1, th.far, 310, 60, 230, 1, th.deco === 'towers' || th.deco === 'peaks');
  }

  // Skyer
  const cloudCol = th.clouds ? th.clouds : th.deco === 'volcano' ? 'rgba(80,40,50,0.6)' : th.deco === 'towers' ? 'rgba(120,100,180,0.5)' : 'rgba(255,255,255,0.85)';
  repeatLayer(camX * 0.2 + t * 8, 300, (x, i) => cloud(ctx, x, 60 + rnd(i + 3) * 110, 0.7 + rnd(i + 9) * 0.5, cloudCol));

  // Hav på stranden
  if (th.sea) {
    ctx.fillStyle = '#2aa3e0';
    ctx.fillRect(0, 330, W, H - 330);
    ctx.fillStyle = '#7fd4ff';
    for (let i = 0; i < 14; i++) {
      const wx = ((i * 90 - camX * 0.3 + t * 15) % (W + 90) + W + 90) % (W + 90) - 45;
      ctx.fillRect(wx, 345 + (i % 3) * 25, 40, 4);
    }
    // sejlbåd
    const bx = ((600 - camX * 0.25 + t * 12) % (W + 200) + W + 200) % (W + 200) - 100;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(bx, 320); ctx.lineTo(bx, 270); ctx.lineTo(bx + 30, 320); ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(bx - 20, 320, 60, 10);
  }

  // Mellemste lag
  if (th.deco === 'clouds') {
    repeatLayer(camX * 0.4, 260, (x, i) => cloud(ctx, x, 330 + rnd(i) * 80, 1.4, 'rgba(190,220,255,0.55)'));
  } else if (!th.sea) {
    hills(ctx, camX * 0.35, th.mid, 400, 40, 170, 2);
  }

  // Nærmeste lag
  if (th.deco === 'palms') {
    repeatLayer(camX * 0.55, 230, (x, i) => palm(ctx, x, H, 170 + rnd(i) * 80, t, i, th.darkPalms));
    hills(ctx, camX * 0.6, th.near, 480, 18, 90, 3);
  } else if (th.deco === 'peaks') {
    hills(ctx, camX * 0.6, th.near, 470, 34, 90, 4, true);
  } else if (th.deco === 'beach') {
    repeatLayer(camX * 0.55, 340, (x, i) => palm(ctx, x, H, 150 + rnd(i) * 60, t, i));
  } else if (th.deco === 'volcano') {
    hills(ctx, camX * 0.6, th.near, 470, 30, 80, 4, true);
  } else if (th.deco === 'clouds') {
    repeatLayer(camX * 0.65, 380, (x, i) => cloud(ctx, x, 480 + rnd(i) * 30, 2, 'rgba(160,200,245,0.6)'));
  } else if (th.deco === 'towers') {
    repeatLayer(camX * 0.5, 260, (x, i) => tower(ctx, x, H, 160 + rnd(i) * 120, 60 + rnd(i + 2) * 30, th.near, i, t));
  }

  // Snefnug
  if (th.snowing) {
    for (let i = 0; i < 45; i++) {
      const fx = ((rnd(i) * W * 1.5 - camX * 0.4 + Math.sin(t + i) * 14) % W + W) % W;
      const fy = (rnd(i + 30) * H + t * (24 + rnd(i + 60) * 30)) % H;
      circle(ctx, fx, fy, 1.5 + rnd(i + 90) * 1.5, 'rgba(255,255,255,0.85)');
    }
  }
}
