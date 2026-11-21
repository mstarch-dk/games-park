// Røgpust, gnister, konfetti, svævende point – og små piloter i faldskærm.
const PARACHUTE_WORDS = ['Øv!', 'Hov!', 'Ups!', 'Puha!', 'Den var god!', 'Jeg svømmer hjem!', 'Hjælp, en måge!', 'Næste gang!', 'Wiiii!', 'Min hat!'];
const CONFETTI_COLORS = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff8fd8', '#ffffff'];

const Particles = {
  list: [],
  chutes: [],

  clear() { this.list = []; this.chutes = []; },

  add(p) { if (this.list.length < 700) this.list.push(p); },

  smoke(x, y, n = 6, size = 14, color = '#e9eef5') {
    for (let i = 0; i < n; i++) {
      this.add({ kind: 'smoke', x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-40, 40), vy: rand(-40, 40),
        r: rand(size * 0.6, size), grow: rand(14, 30), life: rand(0.5, 0.9), t: 0, color });
    }
  },

  sparks(x, y, n = 6, color = '#ffe066') {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(80, 260);
      this.add({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rand(2, 4), life: rand(0.2, 0.45), t: 0, color });
    }
  },

  explosion(x, y, size = 1) {
    this.add({ kind: 'flash', x, y, r: 30 * size, life: 0.25, t: 0 });
    this.smoke(x, y, Math.round(7 * size), 16 * size, '#f2f2f2');
    this.sparks(x, y, Math.round(8 * size), '#ffb703');
    this.sparks(x, y, Math.round(5 * size), '#fff3b0');
  },

  confetti(x, y, n = 30) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(80, 380);
      this.add({ kind: 'confetti', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, w: rand(6, 11), h: rand(3, 6),
        rot: rand(0, TAU), vr: rand(-10, 10), life: rand(1.2, 2.2), t: 0, color: pick(CONFETTI_COLORS) });
    }
  },

  text(x, y, str, color = '#fff', size = 22) {
    this.add({ kind: 'text', x, y, vx: 0, vy: -60, str, color, size, life: 0.9, t: 0 });
  },

  splash(x, y) {
    this.add({ kind: 'ring', x, y, r: 6, life: 0.7, t: 0 });
    for (let i = 0; i < 6; i++) {
      const a = rand(0, TAU);
      this.add({ kind: 'spark', x, y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, r: 3, life: 0.4, t: 0, color: '#ffffff' });
    }
  },

  // Fjendepilot i faldskærm. Set oppefra bliver skærmen mindre mens den daler ned mod havet.
  parachute(x, y, color = '#ffffff', word = null) {
    if (this.chutes.length > 14) return;
    this.chutes.push({ x, y, t: 0, life: rand(2.6, 3.4), color, sway: rand(0, TAU),
      word: word || (Math.random() < 0.7 ? pick(PARACHUTE_WORDS) : null), wave: rand(0, TAU) });
  },

  update(dt) {
    for (const p of this.list) {
      p.t += dt;
      if (p.vx !== undefined) { p.x += p.vx * dt; p.y += p.vy * dt; }
      if (p.kind === 'spark') { p.vx *= 0.92; p.vy *= 0.92; }
      if (p.kind === 'smoke') { p.vx *= 0.95; p.vy *= 0.95; p.y += Background.speed * dt; p.r += p.grow * dt; }
      if (p.kind === 'confetti') { p.vx *= 0.97; p.vy = p.vy * 0.97 + 140 * dt; p.rot += p.vr * dt; }
      if (p.kind === 'ring') p.y += Background.speed * dt;
    }
    this.list = this.list.filter((p) => p.t < p.life);

    for (const c of this.chutes) {
      c.t += dt;
      c.y += (Background.speed * 0.6 + 15) * dt;
      c.x += Math.sin(c.t * 2 + c.sway) * 25 * dt;
      if (c.t >= c.life) { this.splash(c.x, c.y); Sound.splash(); }
    }
    this.chutes = this.chutes.filter((c) => c.t < c.life);
  },

  drawChutes() {
    for (const c of this.chutes) {
      const k = c.t / c.life;
      const s = lerp(1.1, 0.45, k);
      const r = 24 * s;
      ctx.save();
      ctx.translate(c.x, c.y);
      // skygge på havet kommer tættere på jo længere nede
      Draw.ellipse(18 * s, 24 * s, r * 0.8, r * 0.6, 'rgba(0,0,0,0.15)');
      // faldskærm set oppefra: farvede striber i en cirkel
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, (i * TAU) / 8, ((i + 1) * TAU) / 8);
        ctx.closePath();
        ctx.fillStyle = i % 2 ? c.color : '#ffffff';
        ctx.fill();
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(18,48,86,0.6)';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      Draw.circle(0, 0, 4 * s, '#f1c27d');
      // vinkende arm
      ctx.translate(r * 0.7, r * 0.7);
      ctx.rotate(Math.sin(c.t * 10 + c.wave) * 0.7);
      ctx.strokeStyle = '#123056'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(9 * s, -9 * s); ctx.stroke();
      Draw.circle(9 * s, -9 * s, 3, '#f1c27d');
      ctx.restore();
      if (c.word && c.t < 1.6) Draw.bubble(c.word, c.x, c.y - r - 4, 15);
    }
  },

  draw() {
    for (const p of this.list) {
      const k = p.t / p.life;
      if (p.kind === 'smoke') {
        ctx.globalAlpha = (1 - k) * 0.85;
        Draw.circle(p.x, p.y, p.r, p.color);
      } else if (p.kind === 'spark') {
        ctx.globalAlpha = 1 - k;
        Draw.circle(p.x, p.y, p.r, p.color);
      } else if (p.kind === 'flash') {
        ctx.globalAlpha = 1 - k;
        Draw.circle(p.x, p.y, p.r * (0.6 + k), '#fff6c2');
      } else if (p.kind === 'confetti') {
        ctx.globalAlpha = Math.min(1, (1 - k) * 2);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 1.3)) + 1);
        ctx.restore();
      } else if (p.kind === 'ring') {
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r + k * 26, (p.r + k * 26) * 0.7, 0, 0, TAU); ctx.stroke();
      } else if (p.kind === 'text') {
        ctx.globalAlpha = Math.min(1, (1 - k) * 2);
        Draw.text(p.str, p.x, p.y, p.size, p.color);
      }
    }
    ctx.globalAlpha = 1;
  },
};
