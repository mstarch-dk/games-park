// Små lydeffekter lavet direkte i browseren (ingen lydfiler).
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
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  },

  noise(dur, vol = 0.3, delay = 0) {
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
    src.connect(g).connect(this.ctx.destination);
    src.start(t);
  },

  melody(notes, step = 0.1, type = 'square', vol = 0.1) {
    notes.forEach((f, i) => { if (f) this.tone(f, step * 1.4, type, vol, null, i * step); });
  },

  hop() { this.tone(520, 0.07, 'triangle', 0.1, 820); },
  peep() { this.tone(1500, 0.07, 'sine', 0.1, 1900); this.tone(1500, 0.08, 'sine', 0.09, 2000, 0.1); },
  quack(delay = 0) {
    this.tone(640, 0.1, 'sawtooth', 0.06, 380, delay);
    this.tone(320, 0.1, 'square', 0.03, 200, delay);
  },
  honk(type) {
    if (type === 'cykel') { // ringeklokke
      this.tone(2100, 0.25, 'sine', 0.08); this.tone(2100, 0.25, 'sine', 0.08, null, 0.13);
      return;
    }
    const f = type === 'bus' || type === 'lastbil' ? 220 : type === 'traktor' ? 180 : type === 'isbil' ? 523 : 392;
    for (const d of [0, 0.2]) {
      this.tone(f, 0.15, 'square', 0.05, null, d);
      this.tone(f * 1.26, 0.15, 'square', 0.04, null, d);
    }
  },
  whoosh() { this.tone(300, 0.5, 'sine', 0.1, 1100); this.noise(0.3, 0.06); },
  corn() { this.tone(988, 0.07, 'square', 0.06); this.tone(1319, 0.12, 'square', 0.06, null, 0.06); },
  splash() { this.noise(0.4, 0.18); this.tone(500, 0.25, 'sine', 0.08, 180); },
  pedTick() { this.tone(1700, 0.025, 'square', 0.025); },
  tick() { this.tone(1200, 0.04, 'square', 0.04); },
  home() {
    this.melody([523, 659, 784, 1047, 0, 784, 1047], 0.1, 'triangle', 0.14);
    this.quack(0.75); this.quack(0.95);
  },
  star(i) { this.tone(660 + i * 220, 0.18, 'triangle', 0.13, 1320 + i * 220); },
  finale() { this.melody([523, 659, 784, 1047, 784, 1047, 1319, 0, 1319, 1568], 0.12, 'square', 0.08); },
};
