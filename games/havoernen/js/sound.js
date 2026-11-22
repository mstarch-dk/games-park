// Lydeffekter lavet direkte i browseren med Web Audio (ingen lydfiler).
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

  tick() { this.tone(900, 0.04, 'square', 0.04); },
  select() { this.tone(660, 0.07, 'square', 0.06); this.tone(990, 0.1, 'square', 0.06, null, 0.06); },
  cannon() {
    if (!this.limit('cannon', 0.06)) return;
    this.noise(0.5, 0.35, 0, 700);
    this.tone(90, 0.35, 'sine', 0.25, 35);
  },
  distantCannon() { if (this.limit('dcannon', 0.1)) { this.noise(0.5, 0.12, 0, 400); this.tone(70, 0.3, 'sine', 0.1, 30); } },
  splash() { if (this.limit('splash', 0.05)) { this.noise(0.3, 0.1, 0, 2500); this.tone(500, 0.15, 'sine', 0.04, 150); } },
  hit() { if (this.limit('hit', 0.05)) { this.noise(0.25, 0.3, 0, 1500); this.tone(160, 0.2, 'square', 0.08, 60); } },
  ouch() { if (this.limit('ouch', 0.1)) { this.noise(0.3, 0.35, 0, 900); this.tone(120, 0.3, 'sawtooth', 0.1, 50); } },
  sail() { if (this.limit('sail', 0.15)) this.noise(0.25, 0.08, 0, 1200); },
  elev() { if (this.limit('elev', 0.06)) this.tone(300, 0.05, 'square', 0.04, 360); },
  bump() { if (this.limit('bump', 0.5)) { this.noise(0.2, 0.2, 0, 300); this.tone(70, 0.2, 'sine', 0.2, 40); } },
  surrender() { this.melody([523, 440, 392, 330], 0.12, 'triangle', 0.1); },
  board() {
    for (let i = 0; i < 8; i++) this.tone(rand(1800, 2600), 0.06, 'square', 0.035, rand(900, 1400), i * 0.18 + rand(0, 0.05));
  },
  coins() { this.melody([988, 1319, 1568, 1976], 0.06, 'triangle', 0.1); },
  bell() { this.tone(1046, 1.2, 'sine', 0.12); this.tone(2093, 0.8, 'sine', 0.04); },
  sink() { this.noise(1.5, 0.25, 0, 500); this.tone(300, 1.4, 'sine', 0.1, 60); },
  bad() { this.tone(220, 0.25, 'square', 0.07, 160); this.tone(160, 0.35, 'square', 0.07, 110, 0.2); },
  rankUp() { this.melody([523, 659, 784, 1047, 0, 784, 1047, 1319], 0.11, 'square', 0.08); },
  windShift() { this.noise(1.2, 0.07, 0, 800); },
  fanfare() { this.melody([392, 523, 659, 784, 659, 784, 1047], 0.13, 'square', 0.08); },
};
