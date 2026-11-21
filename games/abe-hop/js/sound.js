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

  jump() { this.tone(320, 0.15, 'square', 0.08, 640); },
  doubleJump() { this.tone(520, 0.18, 'triangle', 0.15, 1200); },
  boing() { this.tone(180, 0.3, 'sine', 0.3, 900); },
  hop() { this.tone(660, 0.08, 'square', 0.07); this.tone(990, 0.1, 'square', 0.07, null, 0.06); },
  banana() { this.tone(988, 0.07, 'square', 0.06); this.tone(1319, 0.12, 'square', 0.06, null, 0.06); },
  smash() { this.noise(0.35, 0.35); this.tone(160, 0.25, 'sawtooth', 0.12, 40); },
  hurt() { this.tone(500, 0.45, 'sawtooth', 0.12, 90); },
  splash() { this.noise(0.4, 0.2); },
  fire() { this.noise(0.12, 0.12); this.tone(120, 0.12, 'square', 0.08, 60); },
  powerup() { this.melody([523, 659, 784, 1047, 1319], 0.07, 'square', 0.09); },
  checkpoint() { this.melody([784, 988, 1175], 0.09, 'triangle', 0.15); },
  oneUp() { this.melody([659, 784, 1319, 1047, 1175, 1568], 0.08, 'square', 0.08); },
  levelDone() { this.melody([523, 523, 659, 784, 0, 659, 784, 1047], 0.11, 'square', 0.09); },
  gameOver() { this.melody([392, 370, 349, 330, 0, 262], 0.18, 'triangle', 0.15); },
  win() { this.melody([523, 659, 784, 1047, 784, 1047, 1319, 0, 1319, 1568], 0.12, 'square', 0.09); },
  tick() { this.tone(1200, 0.04, 'square', 0.04); },
  siren() {
    for (let i = 0; i < 2; i++) {
      this.tone(420, 0.3, 'sawtooth', 0.07, 860, i * 0.6);
      this.tone(860, 0.3, 'sawtooth', 0.07, 420, i * 0.6 + 0.3);
    }
  },
  plane() { this.tone(72, 0.13, 'sawtooth', 0.05, 54); },
  bombDrop() { this.tone(1500, 0.75, 'sine', 0.09, 240); },
  boom() { this.noise(0.9, 0.5); this.tone(115, 0.85, 'sawtooth', 0.2, 26); },
  superOn() { this.melody([392, 523, 659, 784, 1047, 1319], 0.05, 'sawtooth', 0.07); },
  superJump() { this.tone(240, 0.3, 'square', 0.09, 1300); },
};
