// Små lydeffekter lavet direkte i browseren (ingen lydfiler).
const Sound = {
  ctx: null,
  muted: false,
  last: {},

  unlock() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  // Undgå at den samme lyd spilles 50 gange på én gang
  limit(name, gap) {
    if (!this.ctx) return false;
    const now = this.ctx.currentTime;
    if (this.last[name] && now - this.last[name] < gap) return false;
    this.last[name] = now;
    return true;
  },

  tone(freq, dur, type = 'square', vol = 0.12, slideTo = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  },

  noise(dur, vol = 0.3, delay = 0, lowpass = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    src.buffer = buf;
    g.gain.setValueAtTime(vol, t);
    let node = src;
    if (lowpass) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lowpass;
      node = src.connect(f);
    }
    node.connect(g).connect(this.ctx.destination);
    src.start(t);
  },

  melody(notes, step = 0.1, type = 'square', vol = 0.1) {
    notes.forEach((f, i) => { if (f) this.tone(f, step * 1.4, type, vol, null, i * step); });
  },

  tick() { this.tone(1200, 0.04, 'square', 0.04); },
  select() { this.tone(660, 0.07, 'square', 0.06); this.tone(990, 0.1, 'square', 0.06, null, 0.06); },
  laser() { if (this.limit('laser', 0.05)) this.tone(1400, 0.09, 'square', 0.035, 500); },
  zap() { if (this.limit('zap', 0.05)) this.tone(900, 0.12, 'sawtooth', 0.04, 300); },
  cannon() { if (this.limit('cannon', 0.08)) { this.noise(0.18, 0.18, 0, 900); this.tone(140, 0.2, 'square', 0.08, 60); } },
  bubble() { if (this.limit('bubble', 0.06)) this.tone(300, 0.12, 'sine', 0.12, 700); },
  missile() { if (this.limit('missile', 0.1)) { this.noise(0.35, 0.08, 0, 2500); this.tone(300, 0.3, 'sawtooth', 0.04, 900); } },
  mine() { if (this.limit('mine', 0.1)) this.tone(200, 0.1, 'triangle', 0.15, 120); },
  hit() { if (this.limit('hit', 0.04)) { this.noise(0.08, 0.15, 0, 3000); this.tone(220, 0.08, 'square', 0.06, 110); } },
  shieldHit() { if (this.limit('shieldHit', 0.06)) this.tone(1800, 0.1, 'sine', 0.06, 2400); },
  thud() { if (this.limit('thud', 0.15)) { this.noise(0.2, 0.25, 0, 500); this.tone(90, 0.2, 'sine', 0.2, 40); } },
  boom() { this.noise(0.9, 0.45, 0, 1200); this.tone(110, 0.85, 'sawtooth', 0.16, 26); },
  smallBoom() { if (this.limit('smallBoom', 0.05)) { this.noise(0.4, 0.25, 0, 1800); this.tone(160, 0.35, 'square', 0.06, 40); } },
  turbo() { this.tone(200, 0.5, 'sawtooth', 0.07, 1600); },
  shield() { this.tone(400, 0.4, 'sine', 0.12, 1200); this.tone(600, 0.4, 'sine', 0.06, 1800, 0.05); },
  ring() { this.melody([1568, 1319, 1047, 784], 0.04, 'square', 0.05); },
  ink() { this.noise(0.5, 0.2, 0, 400); this.tone(180, 0.4, 'sine', 0.12, 80); },
  prut() {
    this.tone(95, 0.55, 'sawtooth', 0.18, 55);
    this.tone(80, 0.5, 'square', 0.08, 140, 0.05);
    this.noise(0.5, 0.12, 0, 300);
  },
  oink() { this.tone(500, 0.08, 'sawtooth', 0.06, 300); this.tone(450, 0.1, 'sawtooth', 0.06, 250, 0.1); },
  chomp() { this.tone(600, 0.06, 'square', 0.1, 200); this.tone(500, 0.08, 'square', 0.1, 150, 0.12); },
  pickup() { this.melody([784, 988, 1319], 0.06, 'triangle', 0.12); },
  oneUp() { this.melody([659, 784, 1319, 1047, 1175, 1568], 0.08, 'square', 0.08); },
  wave() { this.melody([392, 523, 659, 784], 0.12, 'square', 0.08); },
  alarm() {
    for (let i = 0; i < 3; i++) this.tone(440, 0.25, 'sawtooth', 0.06, 880, i * 0.4);
  },
  roundWin() { this.melody([523, 659, 784, 1047], 0.1, 'square', 0.09); },
  win() { this.melody([523, 659, 784, 1047, 784, 1047, 1319, 0, 1319, 1568], 0.12, 'square', 0.09); },
  gameOver() { this.melody([392, 370, 349, 330, 0, 262], 0.18, 'triangle', 0.15); },
  respawn() { this.tone(200, 0.4, 'sine', 0.1, 900); },
};
