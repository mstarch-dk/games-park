// Grafik: alle scener tegnes som vektorgrafik i et koordinatsystem på 320x200 "enheder",
// som skaleres x3 til lærredet (960x600) – så alt er skarpt og blødt.
// Hver baggrund kan erstattes af et malet billede: læg img/<scene>.png (960x600) i mappen
// og skriv navnet i img/billeder.js, så bruges det i stedet. Ellers tegnes scenen i kode.
const LO_W = 320, LO_H = 200, SCALE = 3;
const SCENES = ['title', 'map', 'battle', 'siege', 'joust', 'hall', 'princess', 'coronation'];

const Art = {
  lo: null, lctx: null,
  imgs: {},
  bgCache: {},

  makeCanvas() {
    const c = document.createElement('canvas');
    c.width = LO_W * SCALE; c.height = LO_H * SCALE;
    const x = c.getContext('2d');
    x.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    x.lineCap = 'round'; x.lineJoin = 'round';
    return [c, x];
  },

  init() {
    [this.lo, this.lctx] = this.makeCanvas();
    // Hent de malede baggrunde der står i img/billeder.js
    (window.KR_PAINTINGS || []).filter((n) => SCENES.includes(n)).forEach((name) => {
      const im = new Image();
      im.onload = () => { this.imgs[name] = im; delete this.bgCache[name]; };
      im.onerror = () => {};
      im.src = 'img/' + name + '.png';
    });
  },

  // Tegn en scenes baggrund
  bg(name) {
    let c = this.bgCache[name];
    if (!c) {
      let x;
      [c, x] = this.makeCanvas();
      x.fillStyle = PAL.black; x.fillRect(0, 0, LO_W, LO_H);
      if (this.imgs[name]) x.drawImage(this.imgs[name], 0, 0, LO_W, LO_H);
      else (PAINT[name] || PAINT.title)(x);
      this.bgCache[name] = c;
    }
    const l = this.lctx;
    l.save(); l.setTransform(1, 0, 0, 1, 0, 0); l.drawImage(c, 0, 0); l.restore();
  },
  hasPainting(name) { return !!this.imgs[name]; },

  present(ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.lo, 0, 0);
  },

  // ---------- Fælles tegne-hjælpere ----------

  // Bølgende bakkekam med blødt farveforløb
  ridge(x, seed, baseY, amp, a, b, _lvl, rough = 1) {
    const r = seeded(seed);
    const p1 = r() * 6, p2 = r() * 6, f1 = 0.015 + r() * 0.02, f2 = 0.04 + r() * 0.03;
    x.fillStyle = Shade.lin(x, 0, baseY - amp, 0, LO_H, [a, b]);
    x.beginPath();
    x.moveTo(0, LO_H);
    for (let i = 0; i <= LO_W; i += 4) {
      x.lineTo(i, baseY - amp * (Math.sin(i * f1 + p1) * 0.7 + Math.sin(i * f2 + p2) * 0.3 * rough));
    }
    x.lineTo(LO_W, LO_H);
    x.fill();
  },

  tree(x, tx, ty, h, dark, light) {
    x.fillStyle = 'rgba(0,0,0,0.15)';
    x.beginPath(); x.ellipse(tx + h * 0.15, ty, h * 0.35, h * 0.08, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#6b4a2f'; x.lineWidth = h * 0.09;
    x.beginPath(); x.moveTo(tx, ty); x.lineTo(tx, ty - h * 0.4); x.stroke();
    x.fillStyle = dark; circle(x, tx, ty - h * 0.62, h * 0.36);
    x.fillStyle = light; circle(x, tx - h * 0.1, ty - h * 0.72, h * 0.2);
  },

  cloud(x, cx, cy, w, col) {
    x.save();
    x.globalAlpha = 0.9;
    x.fillStyle = col;
    [[-0.3, 0.02, 0.17], [-0.1, -0.06, 0.22], [0.15, -0.03, 0.2], [0.34, 0.03, 0.14]].forEach(([dx, dy, r]) => circle(x, cx + dx * w, cy + dy * w, r * w * 0.6));
    rrect(x, cx - w * 0.42, cy - w * 0.02, w * 0.84, w * 0.12, w * 0.06); x.fill();
    x.restore();
  },

  // Eventyrborg med spidse tårntage. size ~ højde.
  castle(x, cx, by, size, wall, dark, flag, roof = PAL.red1) {
    const s = size / 10;
    x.save();
    x.lineWidth = Math.max(0.3, s * 0.25);
    x.strokeStyle = 'rgba(30,20,30,0.55)';
    const box = (bx, bw, bh) => {
      x.fillStyle = wall;
      x.beginPath();
      x.moveTo(bx, by); x.lineTo(bx, by - bh);
      const n = Math.max(2, Math.round(bw / (s * 1.6)));
      const step = bw / n;
      for (let i = 0; i < n; i++) {
        const x0 = bx + i * step;
        if (i % 2 === 0) { x.lineTo(x0, by - bh - s * 0.8); x.lineTo(x0 + step, by - bh - s * 0.8); } else x.lineTo(x0 + step, by - bh);
      }
      x.lineTo(bx + bw, by); x.closePath(); x.fill(); x.stroke();
    };
    box(cx - 4 * s, 8 * s, 5.5 * s);
    const tower = (tx, tw, th) => {
      x.fillStyle = wall;
      rrect(x, tx, by - th, tw, th, s * 0.3); x.fill(); x.stroke();
      x.fillStyle = roof;
      x.beginPath(); x.moveTo(tx - s * 0.4, by - th); x.lineTo(tx + tw / 2, by - th - tw * 1.3); x.lineTo(tx + tw + s * 0.4, by - th); x.closePath(); x.fill(); x.stroke();
      if (size >= 8) { x.fillStyle = dark; rrect(x, tx + tw * 0.35, by - th * 0.7, tw * 0.3, s * 1.1, s * 0.3); x.fill(); }
    };
    tower(cx - 5.4 * s, 2.6 * s, 8 * s);
    tower(cx + 2.8 * s, 2.6 * s, 8 * s);
    tower(cx - 1.4 * s, 2.8 * s, 10.5 * s);
    if (size >= 8) {
      x.fillStyle = dark;
      x.beginPath(); x.moveTo(cx - s, by); x.lineTo(cx - s, by - 1.8 * s); x.arc(cx, by - 1.8 * s, s, Math.PI, 0); x.lineTo(cx + s, by); x.fill();
    }
    if (flag) {
      const top = by - 10.5 * s - 2.8 * s * 1.3;
      x.strokeStyle = PAL.s0; x.lineWidth = Math.max(0.3, s * 0.2);
      x.beginPath(); x.moveTo(cx, top); x.lineTo(cx, top - 3 * s); x.stroke();
      x.fillStyle = flag;
      x.beginPath(); x.moveTo(cx, top - 3 * s); x.quadraticCurveTo(cx + 1.5 * s, top - 3.5 * s, cx + 3 * s, top - 2.4 * s); x.lineTo(cx, top - 1.6 * s); x.fill();
    }
    x.restore();
  },

  // Lille soldat set fra siden (ca. 12 enheder høj)
  soldier(x, sx, sy, col, dir, frame, knight) {
    x.save();
    x.translate(sx, sy);
    x.lineCap = 'round';
    const step = Math.sin(frame * 1.6) * 1.2;
    if (knight) {
      x.strokeStyle = '#5b3a24'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(-2.5, -4); x.lineTo(-3 - step * 0.5, 0); x.moveTo(2.5, -4); x.lineTo(3 + step * 0.5, 0); x.stroke();
      x.fillStyle = '#8a5a3a';
      x.beginPath(); x.ellipse(0, -5, 4.5, 2.2, 0, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.ellipse(dir * 4.6, -7.5, 1.4, 2.4, dir * 0.6, 0, Math.PI * 2); x.fill();
      x.fillStyle = col;
      x.beginPath(); x.moveTo(-4, -6); x.lineTo(4, -6); x.lineTo(3.5, -3); x.lineTo(-3.5, -3); x.fill();
      x.fillStyle = col; rrect(x, -1.4, -11, 2.8, 4.5, 1); x.fill();
      x.fillStyle = PAL.s4; circle(x, 0, -12.3, 1.4);
      x.strokeStyle = PAL.p1; x.lineWidth = 0.6;
      x.beginPath(); x.moveTo(-dir * 1, -9); x.lineTo(dir * 7, -12); x.stroke();
      x.restore();
      return;
    }
    x.strokeStyle = PAL.s0; x.lineWidth = 0.9;
    x.beginPath(); x.moveTo(-0.6, -3); x.lineTo(-0.8 - step * 0.4, 0); x.moveTo(0.6, -3); x.lineTo(0.8 + step * 0.4, 0); x.stroke();
    x.fillStyle = col; rrect(x, -1.6, -6.5, 3.2, 4, 1); x.fill();
    x.fillStyle = PAL.skin; circle(x, 0, -7.8, 1.3);
    x.fillStyle = PAL.s3; x.beginPath(); x.arc(0, -8.1, 1.45, Math.PI, 0); x.fill();
    x.strokeStyle = PAL.p0; x.lineWidth = 0.45;
    x.beginPath(); x.moveTo(dir * 1.9, -1); x.lineTo(dir * 1.9, -11); x.stroke();
    x.fillStyle = PAL.s4; x.beginPath(); x.moveTo(dir * 1.9, -12.4); x.lineTo(dir * 2.5, -10.8); x.lineTo(dir * 1.3, -10.8); x.fill();
    x.fillStyle = Shade.mix(col.startsWith('#') ? col : '#888888', '#ffffff', 0.25); circle(x, dir * 1.6, -4.8, 1.3);
    x.restore();
  },

  // ---------- Våbenskjolde (fuld opløsning, til menuer og kort) ----------
  shield(ctx, x, y, w, arms) {
    const h = w * 1.2;
    ctx.save();
    ctx.translate(x, y);
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2);
      ctx.lineTo(w / 2, -h / 2);
      ctx.lineTo(w / 2, 0);
      ctx.quadraticCurveTo(w / 2, h * 0.35, 0, h / 2);
      ctx.quadraticCurveTo(-w / 2, h * 0.35, -w / 2, 0);
      ctx.closePath();
    };
    ctx.save(); ctx.translate(w * 0.05, w * 0.06); path(); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill(); ctx.restore();
    path();
    ctx.fillStyle = arms.field;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = arms.charge;
    const u = w / 10;
    switch (arms.pattern) {
      case 'cross': ctx.fillRect(-w / 2, -u * 1.2, w, u * 2.4); ctx.fillRect(-u * 2.5, -h / 2, u * 2.4, h); break;
      case 'bend': ctx.rotate(0.7); ctx.fillRect(-w, -u * 1.5, w * 2, u * 3); break;
      case 'chevron':
        ctx.beginPath(); ctx.moveTo(-w / 2, h * 0.2); ctx.lineTo(0, -h * 0.15); ctx.lineTo(w / 2, h * 0.2);
        ctx.lineTo(w / 2, h * 0.38); ctx.lineTo(0, 0.05 * h); ctx.lineTo(-w / 2, h * 0.38); ctx.fill(); break;
      case 'pale': ctx.fillRect(-u * 1.7, -h / 2, u * 3.4, h); break;
      case 'chief': ctx.fillRect(-w / 2, -h / 2, w, h * 0.33); break;
      case 'lions':
        for (let i = 0; i < 3; i++) {
          const yy = -h * 0.28 + i * h * 0.25;
          ctx.beginPath(); ctx.ellipse(0, yy, u * 2.6, u * 0.9, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(u * 2.6, yy - u * 0.7, u * 0.9, 0, Math.PI * 2); ctx.fill();
        }
        break;
      case 'quarters': ctx.fillRect(-w / 2, -h / 2, w / 2, h / 2); ctx.fillRect(0, 0, w / 2, h / 2); break;
      case 'stripes': for (let i = 0; i < 4; i++) ctx.fillRect(-w / 2, -h / 2 + i * h / 4 + h / 16, w, h / 8); break;
      default: break;
    }
    const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
    path();
    ctx.lineWidth = Math.max(1.5, w / 16);
    ctx.strokeStyle = '#c99a2e';
    ctx.stroke();
    ctx.restore();
  },
};

// ---------- Baggrunde tegnet i kode ----------
const PAINT = {
  title(x) {
    Shade.vgrad(x, 0, 0, LO_W, 150, [PAL.night, PAL.dusk2, PAL.dusk1, PAL.dusk0]);
    const r = seeded(11);
    x.fillStyle = PAL.white;
    for (let i = 0; i < 40; i++) { x.globalAlpha = 0.3 + r() * 0.6; circle(x, r() * 320, r() * 55, 0.3 + r() * 0.4); }
    x.globalAlpha = 1;
    Shade.glow(x, 230, 104, 60, PAL.dusk0, 0.7);
    x.fillStyle = '#fff1c9'; circle(x, 230, 104, 17);
    Art.cloud(x, 70, 44, 90, '#c87a8a');
    Art.cloud(x, 270, 64, 70, '#d98c84');
    Art.ridge(x, 3, 125, 12, '#a65a78', '#5e3a64');
    Art.ridge(x, 7, 142, 10, '#5e3a64', '#3a2a50');
    x.fillStyle = Shade.lin(x, 0, 110, 0, 200, ['#3a2a50', '#22183a']);
    x.beginPath(); x.moveTo(50, 200); x.quadraticCurveTo(155, 100, 260, 200); x.fill();
    Art.castle(x, 155, 140, 34, '#4a3a62', '#ffcf6a', PAL.red1, '#7a3050');
    Art.castle(x, 122, 148, 16, '#4a3a62', '#ffcf6a', PAL.red1, '#7a3050');
    Art.castle(x, 188, 148, 16, '#4a3a62', '#ffcf6a', PAL.red1, '#7a3050');
    Shade.glow(x, 155, 128, 30, '#ffcf6a', 0.25);
    Art.ridge(x, 11, 188, 6, '#22183a', '#140e24');
  },

  map(x) {
    x.fillStyle = Shade.lin(x, 0, 0, 212, 200, [PAL.w3, PAL.w2, PAL.w1]);
    x.fillRect(0, 0, 214, LO_H);
    const r = seeded(42);
    x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 0.5;
    for (let i = 0; i < 70; i++) {
      const wx = r() * 210, wy = r() * 200;
      x.beginPath(); x.arc(wx, wy, 2.2, Math.PI * 1.15, Math.PI * 1.85); x.stroke();
    }
    x.fillStyle = Shade.lin(x, 212, 0, 320, 200, [PAL.p3, PAL.p2]);
    x.fillRect(212, 0, 108, LO_H);
    x.fillStyle = 'rgba(80,50,20,0.25)'; x.fillRect(212, 0, 3, LO_H);
    x.fillStyle = PAL.p0; x.fillRect(212, 0, 0.8, LO_H);
    x.save(); x.translate(18, 18); x.scale(0.8, 0.8);
    for (let i = 0; i < 8; i++) {
      x.rotate(Math.PI / 4);
      x.fillStyle = i % 2 ? 'rgba(255,250,235,0.6)' : 'rgba(255,250,235,0.9)';
      const l = i % 2 ? 8 : 14;
      x.beginPath(); x.moveTo(0, -l); x.lineTo(2.2, 0); x.lineTo(-2.2, 0); x.fill();
    }
    x.fillStyle = PAL.red1; x.beginPath(); x.moveTo(0, -14); x.lineTo(2, -2); x.lineTo(-2, -2); x.fill();
    x.fillStyle = PAL.gold; circle(x, 0, 0, 1.6);
    x.restore();
  },

  battle(x) {
    Shade.vgrad(x, 0, 0, LO_W, 110, [PAL.sky1, PAL.sky2, PAL.sky3, PAL.sky4]);
    Art.cloud(x, 80, 30, 80, PAL.white); Art.cloud(x, 240, 22, 60, PAL.white);
    Art.ridge(x, 21, 88, 10, '#9cc0d8', '#7ab07a');
    Art.ridge(x, 22, 98, 6, PAL.g2, PAL.g1);
    const r = seeded(5);
    for (let i = 0; i < 34; i++) Art.tree(x, r() * 320, 97 + r() * 5, 8 + r() * 5, PAL.g0, PAL.g1);
    Shade.vgrad(x, 0, 102, LO_W, 98, [PAL.g3, PAL.g2, PAL.g1]);
    for (let i = 0; i < 60; i++) {
      x.fillStyle = pick([PAL.g4, PAL.white, PAL.gold, PAL.g4]);
      x.globalAlpha = 0.7; circle(x, r() * 320, 106 + r() * 94, 0.5 + r() * 0.5);
    }
    x.globalAlpha = 1;
  },

  siege(x) {
    Shade.vgrad(x, 0, 0, LO_W, 150, [PAL.sky0, PAL.sky1, PAL.sky2, PAL.dusk0]);
    Art.cloud(x, 60, 30, 70, PAL.sky4); Art.cloud(x, 180, 18, 50, PAL.sky4);
    Art.ridge(x, 31, 118, 14, '#8aa8d0', '#5f8a6a');
    Art.ridge(x, 32, 135, 6, PAL.g2, PAL.g1);
    Shade.vgrad(x, 0, 150, LO_W, 50, [PAL.g2, PAL.g1, PAL.g0]);
    x.fillStyle = Shade.lin(x, 0, 140, 0, 200, ['#6f8f4a', '#4a6a34']);
    x.beginPath(); x.moveTo(175, 200); x.quadraticCurveTo(230, 142, 320, 140); x.lineTo(320, 200); x.fill();
    const r = seeded(9);
    for (let i = 0; i < 12; i++) Art.tree(x, r() * 150, 151 + r() * 4, 9 + r() * 6, PAL.g0, PAL.g2);
  },

  joust(x) {
    Shade.vgrad(x, 0, 0, LO_W, 60, [PAL.sky1, PAL.sky2, PAL.sky3]);
    Art.cloud(x, 250, 18, 70, PAL.white);
    x.fillStyle = Shade.lin(x, 0, 48, 0, 84, ['#8a6040', '#5e3e28']);
    x.fillRect(0, 46, LO_W, 38);
    const r = seeded(77);
    const crowd = [PAL.red1, PAL.blue1, PAL.gold, PAL.g3, PAL.white, PAL.dusk1, '#9a6ad0'];
    for (let row = 0; row < 6; row++) {
      const yy = 58 + row * 4;
      for (let xx = 1 + (row % 2) * 2; xx < LO_W; xx += 4) {
        x.fillStyle = crowd[Math.floor(r() * crowd.length)];
        rrect(x, xx - 1.4, yy, 2.8, 3, 1); x.fill();
        x.fillStyle = r() < 0.5 ? PAL.skin : PAL.skin0; circle(x, xx, yy - 0.6, 1.1);
      }
    }
    for (let i = 0; i < 16; i++) {
      x.fillStyle = i % 2 ? PAL.red1 : PAL.white;
      x.beginPath(); x.moveTo(i * 20, 42); x.lineTo(i * 20 + 20, 42); x.lineTo(i * 20 + 20, 50);
      x.quadraticCurveTo(i * 20 + 15, 55, i * 20 + 10, 50); x.quadraticCurveTo(i * 20 + 5, 55, i * 20, 50); x.fill();
    }
    x.strokeStyle = '#4a3020'; x.lineWidth = 0.8;
    for (let i = 0; i <= 16; i++) { x.beginPath(); x.moveTo(i * 20, 34); x.lineTo(i * 20, 84); x.stroke(); }
    for (let i = 0; i < 8; i++) {
      x.fillStyle = i % 2 ? PAL.gold : PAL.red1;
      x.beginPath(); x.moveTo(i * 40 + 20, 32); x.lineTo(i * 40 + 30, 34.5); x.lineTo(i * 40 + 20, 37); x.fill();
    }
    Shade.vgrad(x, 0, 84, LO_W, 116, ['#e8cf98', '#dcb878', '#c99c5c']);
    x.strokeStyle = 'rgba(140,100,50,0.18)'; x.lineWidth = 0.6;
    for (let i = -12; i <= 12; i++) { x.beginPath(); x.moveTo(160 + i * 6, 84); x.lineTo(160 + i * 60, 200); x.stroke(); }
  },

  hall(x) {
    Shade.vgrad(x, 0, 0, LO_W, 150, ['#4e4458', '#6e6276', '#5a5064']);
    x.strokeStyle = 'rgba(30,20,40,0.25)'; x.lineWidth = 0.4;
    for (let row = 0; row < 15; row++) {
      x.beginPath(); x.moveTo(0, row * 10); x.lineTo(LO_W, row * 10); x.stroke();
      for (let c = 0; c < 17; c++) { const bx = c * 20 + (row % 2) * 10; x.beginPath(); x.moveTo(bx, row * 10); x.lineTo(bx, row * 10 + 10); x.stroke(); }
    }
    [70, 250].forEach((wx) => {
      x.fillStyle = '#2e2638';
      x.beginPath(); x.moveTo(wx - 13, 88); x.lineTo(wx - 13, 26); x.arc(wx, 26, 13, Math.PI, 0); x.lineTo(wx + 13, 88); x.fill();
      x.fillStyle = Shade.lin(x, 0, 14, 0, 86, [PAL.sky2, PAL.sky4, PAL.p3]);
      x.beginPath(); x.moveTo(wx - 10, 85); x.lineTo(wx - 10, 26); x.arc(wx, 26, 10, Math.PI, 0); x.lineTo(wx + 10, 85); x.fill();
      x.strokeStyle = '#3e3448'; x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(wx, 16); x.lineTo(wx, 85); x.moveTo(wx - 10, 50); x.lineTo(wx + 10, 50); x.stroke();
      x.save(); x.globalAlpha = 0.18; x.fillStyle = PAL.p3;
      x.beginPath(); x.moveTo(wx - 10, 85); x.lineTo(wx + 10, 85); x.lineTo(wx + 40, 150); x.lineTo(wx - 4, 150); x.fill(); x.restore();
    });
    [[160, PAL.red0, PAL.gold], [20, PAL.blue, PAL.gold], [300, PAL.blue, PAL.gold]].forEach(([tx, c1, c2]) => {
      x.fillStyle = Shade.lin(x, tx - 14, 0, tx + 14, 0, [c1, Shade.mix(c1, '#ffffff', 0.15), c1]);
      x.beginPath(); x.moveTo(tx - 14, 18); x.lineTo(tx + 14, 18); x.lineTo(tx + 14, 86); x.lineTo(tx, 92); x.lineTo(tx - 14, 86); x.fill();
      x.fillStyle = c2; rrect(x, tx - 16, 16, 32, 3, 1.5); x.fill();
      x.beginPath(); x.moveTo(tx, 34); x.lineTo(tx + 6, 50); x.lineTo(tx, 66); x.lineTo(tx - 6, 50); x.fill();
    });
    Shade.vgrad(x, 0, 150, LO_W, 50, ['#8a7e86', '#a69aa0', '#7e727c']);
    x.strokeStyle = 'rgba(40,30,40,0.25)'; x.lineWidth = 0.5;
    for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(0, 150 + i * i * 1.5); x.lineTo(LO_W, 150 + i * i * 1.5); x.stroke(); }
    for (let i = -10; i <= 10; i++) { x.beginPath(); x.moveTo(160 + i * 18, 150); x.lineTo(160 + i * 40, 200); x.stroke(); }
  },

  princess(x) {
    Shade.vgrad(x, 0, 0, LO_W, LO_H, ['#3e3050', '#5a4668', '#3e3050']);
    x.fillStyle = '#2a2038';
    x.beginPath(); x.moveTo(178, 150); x.lineTo(178, 30); x.arc(220, 30, 42, Math.PI, 0); x.lineTo(262, 150); x.fill();
    x.save();
    x.beginPath(); x.moveTo(182, 148); x.lineTo(182, 30); x.arc(220, 30, 38, Math.PI, 0); x.lineTo(258, 148); x.clip();
    Shade.vgrad(x, 182, -10, 76, 160, [PAL.night, PAL.sky0, '#5a6ab0']);
    const r = seeded(3);
    x.fillStyle = PAL.white;
    for (let i = 0; i < 30; i++) { x.globalAlpha = 0.5 + r() * 0.5; circle(x, 182 + r() * 76, r() * 120, 0.4 + r() * 0.3); }
    x.globalAlpha = 1;
    Shade.glow(x, 238, 22, 20, '#fff6d0', 0.4);
    x.fillStyle = '#fff6d0'; circle(x, 238, 22, 8);
    x.fillStyle = '#2a3a70'; circle(x, 234, 20, 7.5);
    Art.ridge(x, 4, 140, 6, '#1a1a40', '#101030');
    x.restore();
    x.strokeStyle = '#2a2038'; x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(220, -10); x.lineTo(220, 150); x.moveTo(182, 80); x.lineTo(258, 80); x.stroke();
    [166, 274].forEach((cx) => {
      x.fillStyle = Shade.lin(x, cx - 12, 0, cx + 12, 0, [PAL.red0, PAL.red1, PAL.red0]);
      x.beginPath(); x.moveTo(cx - 12, 0); x.lineTo(cx + 12, 0); x.quadraticCurveTo(cx + 2, 80, cx + 8, 160); x.lineTo(cx - 8, 160); x.quadraticCurveTo(cx - 14, 80, cx - 12, 0); x.fill();
    });
    Shade.vgrad(x, 0, 160, LO_W, 40, ['#6a2a3a', '#3a1a28']);
  },

  coronation(x) {
    Shade.vgrad(x, 0, 0, LO_W, 110, [PAL.sky0, PAL.dusk2, PAL.dusk1, PAL.dusk0, '#fff0c0']);
    Shade.glow(x, 160, 108, 70, '#ffe0a0', 0.6);
    x.fillStyle = '#fff4d0'; x.beginPath(); x.arc(160, 108, 16, Math.PI, 0); x.fill();
    Art.cloud(x, 60, 36, 90, '#e89a8a'); Art.cloud(x, 260, 50, 70, '#e89a8a');
    x.fillStyle = '#3a2a4a';
    x.fillRect(0, 94, 92, 18);
    [[10, 22], [26, 30], [44, 18], [62, 40], [78, 16]].forEach(([tx, th]) => {
      rrect(x, tx, 110 - th, 8, th, 0.8); x.fill();
      x.beginPath(); x.moveTo(tx - 1, 110 - th); x.lineTo(tx + 4, 98 - th); x.lineTo(tx + 9, 110 - th); x.fill();
    });
    x.fillStyle = '#ffd77a';
    [[13, 100], [29, 95], [47, 102], [65, 90], [81, 104]].forEach(([wx, wy]) => { rrect(x, wx, wy, 2, 3, 1); x.fill(); });
    x.fillStyle = '#3a2a4a';
    Shade.vgrad(x, 0, 110, LO_W, 90, ['#e0866a', PAL.w2, PAL.w1, PAL.w0]);
    x.strokeStyle = 'rgba(255,240,200,0.7)'; x.lineWidth = 0.7;
    const r = seeded(8);
    for (let i = 0; i < 45; i++) { const yy = 112 + r() * 60; const xx = 160 + (r() - 0.5) * (yy - 100) * 1.2; x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx + 3 + r() * 3, yy); x.stroke(); }
  },
};
