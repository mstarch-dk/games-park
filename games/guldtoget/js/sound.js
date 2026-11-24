// Lydeffekter lavet direkte i browseren (ingen lydfiler).
const Sound = {
  ctx: null,
  muted: false,

  unlock() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  tone(freq, dur, type = 'square', vol = 0.12, slideTo = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  },

  noise(dur, vol = 0.3, delay = 0, lowpass = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
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

  chuff(k = 1) { this.noise(0.09, 0.05 * k, 0, 900); },
  // Fløjt fra et modkørende tog – svagt langt væk, højt når det er tæt på.
  whistle(near) {
    const v = near ? 0.07 : 0.025;
    this.tone(740, 0.55, 'triangle', v, 700);
    this.tone(932, 0.55, 'triangle', v * 0.8, 880);
    if (near) { this.tone(740, 0.3, 'triangle', v, 690, 0.62); this.tone(932, 0.3, 'triangle', v * 0.8, 870, 0.62); }
  },
  horn() {
    for (const d of [0, 0.22]) {
      this.tone(330, 0.18, 'square', 0.05, null, d);
      this.tone(415, 0.18, 'square', 0.04, null, d);
    }
  },
  clack() { this.tone(180, 0.05, 'square', 0.05, 120); this.tone(240, 0.04, 'square', 0.04, 160, 0.07); },
  gold() { this.tone(988, 0.07, 'square', 0.06); this.tone(1319, 0.14, 'square', 0.06, null, 0.06); },
  gem() { this.melody([1047, 1319, 1568, 2093], 0.06, 'triangle', 0.09); },
  whoosh() { this.noise(0.6, 0.12, 0, 1800); this.tone(220, 0.5, 'sine', 0.05, 90); },
  bonk() { this.tone(160, 0.3, 'square', 0.12, 60); this.noise(0.35, 0.22, 0, 600); this.tone(520, 0.25, 'triangle', 0.08, 1040, 0.15); },
  moo() { this.tone(210, 0.6, 'sawtooth', 0.05, 150); this.tone(105, 0.6, 'sine', 0.06, 80); },
  tick() { this.tone(1200, 0.04, 'square', 0.04); },
  arm() { this.tone(660, 0.05, 'triangle', 0.07, 880); },
  start() { this.melody([392, 523, 659, 784], 0.09, 'triangle', 0.1); },
  arrive() { this.melody([523, 659, 784, 1047, 0, 784, 1047], 0.1, 'triangle', 0.14); this.noise(0.8, 0.08, 0.2, 2500); },
  lose() { this.melody([392, 330, 262, 196], 0.16, 'triangle', 0.1); },
  star(i) { this.tone(660 + i * 220, 0.18, 'triangle', 0.13, 1320 + i * 220); },
  finale() { this.melody([523, 659, 784, 1047, 784, 1047, 1319, 0, 1319, 1568], 0.12, 'square', 0.08); },
};
