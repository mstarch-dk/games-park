// Havet nedenunder: bølger, øer, skyer og vejr. Det hele glider langsomt nedad.
const THEMES = [
  { name: 'Morgen', sea: ['#5ccdf5', '#2ea3e3'], wave: 'rgba(255,255,255,0.55)', tint: null, cloud: '#ffffff' },
  { name: 'Middag', sea: ['#38b6ef', '#1883cf'], wave: 'rgba(255,255,255,0.5)', tint: null, cloud: '#ffffff' },
  { name: 'Solnedgang', sea: ['#ffa47a', '#b85c9e'], wave: 'rgba(255,230,190,0.55)', tint: 'rgba(255,120,60,0.12)', cloud: '#ffd9c2' },
  { name: 'Stormvejr', sea: ['#5d7f9c', '#33506b'], wave: 'rgba(230,240,255,0.45)', tint: 'rgba(20,30,60,0.18)', cloud: '#c9d3df', rain: true },
  { name: 'Nat', sea: ['#26407a', '#101e45'], wave: 'rgba(180,210,255,0.4)', tint: 'rgba(10,10,50,0.25)', cloud: '#8fa3cf', night: true },
];

const Background = {
  theme: THEMES[0],
  speed: 70,
  waves: [],
  islands: [],
  lowClouds: [],
  highClouds: [],
  rain: [],
  islandT: 2,
  flash: 0,
  flashT: 6,
  t: 0,

  init(themeIndex = 0) {
    this.setTheme(themeIndex);
    this.waves = [];
    for (let i = 0; i < 70; i++) this.waves.push({ x: rand(0, W), y: rand(0, H), s: rand(0.6, 1.3), p: rand(0, TAU) });
    this.islands = [];
    this.addIsland(rand(200, 600));
    this.lowClouds = [];
    this.highClouds = [];
    for (let i = 0; i < 5; i++) this.lowClouds.push(this.makeCloud(rand(0, H), 0.5));
    for (let i = 0; i < 2; i++) this.highClouds.push(this.makeCloud(rand(0, H), 1.6));
    this.rain = [];
    for (let i = 0; i < 90; i++) this.rain.push({ x: rand(0, W), y: rand(0, H), l: rand(14, 26) });
  },

  setTheme(i) { this.theme = THEMES[i % THEMES.length]; },

  makeCloud(y, speedMul) {
    const puffs = [];
    const n = randInt(4, 7);
    const w = rand(90, 190);
    for (let i = 0; i < n; i++) puffs.push({ dx: rand(-w / 2, w / 2), dy: rand(-28, 28), r: rand(30, 58) });
    return { x: rand(-40, W + 40), y, puffs, speedMul };
  },

  addIsland(y) {
    const r = rand(55, 120);
    const pts = [];
    const n = 14;
    for (let i = 0; i < n; i++) pts.push(r * rand(0.75, 1.15));
    const palms = [];
    const np = randInt(1, 4);
    for (let i = 0; i < np; i++) palms.push({ dx: rand(-r * 0.4, r * 0.4), dy: rand(-r * 0.3, r * 0.3), rot: rand(0, TAU) });
    this.islands.push({ x: rand(60, W - 60), y, r, pts, palms, hut: Math.random() < 0.4 });
  },

  update(dt) {
    this.t += dt;
    const sp = this.speed;
    for (const w of this.waves) {
      w.y += sp * dt;
      if (w.y > H + 10) { w.y = -10; w.x = rand(0, W); }
    }
    for (const isl of this.islands) isl.y += sp * dt;
    this.islands = this.islands.filter((i) => i.y < H + i.r * 1.5);
    this.islandT -= dt;
    if (this.islandT <= 0) {
      this.addIsland(-150);
      this.islandT = rand(6, 11);
    }
    for (const c of this.lowClouds) {
      c.y += sp * c.speedMul * dt;
      if (c.y > H + 120) Object.assign(c, this.makeCloud(-120, c.speedMul));
    }
    for (const c of this.highClouds) {
      c.y += sp * c.speedMul * dt;
      if (c.y > H + 140) Object.assign(c, this.makeCloud(rand(-600, -140), c.speedMul));
    }
    if (this.theme.rain) {
      for (const r of this.rain) {
        r.y += 900 * dt; r.x -= 120 * dt;
        if (r.y > H) { r.y = -20; r.x = rand(0, W + 100); }
      }
      this.flashT -= dt;
      if (this.flashT <= 0) { this.flash = 1; this.flashT = rand(5, 10); Sound.noise(1.2, 0.08, 0.15, 300); }
    }
    this.flash = Math.max(0, this.flash - dt * 2.5);
  },

  drawCloud(c, color, alpha) {
    ctx.globalAlpha = alpha;
    for (const p of c.puffs) Draw.circle(c.x + p.dx, c.y + p.dy, p.r, color);
    ctx.globalAlpha = 1;
  },

  drawIsland(isl) {
    const pathAt = (scale) => {
      ctx.beginPath();
      const n = isl.pts.length;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU;
        const r = isl.pts[i % n] * scale;
        const x = isl.x + Math.cos(a) * r;
        const y = isl.y + Math.sin(a) * r * 0.8;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };
    ctx.lineJoin = 'round';
    pathAt(1.18); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
    pathAt(1.0); ctx.fillStyle = this.theme.night ? '#b8a87a' : '#f6dc8c'; ctx.fill();
    pathAt(0.72); ctx.fillStyle = this.theme.night ? '#2f6b45' : '#5cc46a'; ctx.fill();
    if (isl.hut) {
      Draw.roundRect(isl.x - 14, isl.y - 10, 28, 22, 4);
      ctx.fillStyle = '#c0703c'; ctx.fill();
      ctx.fillStyle = '#e8a24d';
      ctx.fillRect(isl.x - 14, isl.y - 2, 28, 4);
    }
    for (const p of isl.palms) {
      const x = isl.x + p.dx, y = isl.y + p.dy;
      for (let i = 0; i < 5; i++) {
        const a = p.rot + (i * TAU) / 5;
        Draw.ellipse(x + Math.cos(a) * 13, y + Math.sin(a) * 13, 14, 5, '#2e9e48', a);
      }
      Draw.circle(x, y, 5, '#8a5a2b');
    }
  },

  draw() {
    const th = this.theme;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, th.sea[0]);
    g.addColorStop(1, th.sea[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = th.wave;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (const w of this.waves) {
      const s = w.s * (0.8 + Math.sin(this.t * 2 + w.p) * 0.2);
      ctx.beginPath();
      ctx.arc(w.x - 7 * s, w.y, 7 * s, Math.PI * 1.15, Math.PI * 1.85);
      ctx.moveTo(w.x + 7 * s + Math.cos(Math.PI * 1.15) * 7 * s, w.y + Math.sin(Math.PI * 1.15) * 7 * s);
      ctx.arc(w.x + 7 * s, w.y, 7 * s, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    for (const isl of this.islands) this.drawIsland(isl);
    // Lave skyer under flyene
    for (const c of this.lowClouds) this.drawCloud(c, th.cloud, 0.28);
  },

  // Det der ligger ovenpå flyene: høje skyer, regn, lyn og farvetone
  drawTop() {
    const th = this.theme;
    for (const c of this.highClouds) this.drawCloud(c, th.cloud, 0.5);
    if (th.tint) { ctx.fillStyle = th.tint; ctx.fillRect(0, 0, W, H); }
    if (th.rain) {
      ctx.strokeStyle = 'rgba(220,235,255,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (const r of this.rain) { ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - r.l * 0.13, r.y + r.l); }
      ctx.stroke();
    }
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,240,${this.flash * 0.45})`;
      ctx.fillRect(0, 0, W, H);
    }
  },
};
