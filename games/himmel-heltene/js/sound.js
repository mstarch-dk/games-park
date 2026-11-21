// Små lydeffekter lavet direkte i browseren (ingen lydfiler).
const Sound = {
  ctx: null,
  muted: false,
  last: {},
  engine: null,

  unlock() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.engineStop();
    return this.muted;
  },

  // Undgå at den samme lyd spilles 50 gange på én gang
  limit(name, gap) {
    if (!this.ctx || this.muted) return false;
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

  // Lav, blød propel-brummen mens man flyver
  engineStart() {
    if (!this.ctx || this.muted || this.engine) return;
    const o = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = 62;
    lfo.frequency.value = 9;
    lfoGain.gain.value = 6;
    lfo.connect(lfoGain).connect(o.frequency);
    f.type = 'lowpass';
    f.frequency.value = 260;
    g.gain.value = 0.025;
    o.connect(f).connect(g).connect(this.ctx.destination);
    o.start(); lfo.start();
    this.engine = { o, lfo, g };
  },
  engineStop() {
    if (!this.engine) return;
    try { this.engine.o.stop(); this.engine.lfo.stop(); } catch (e) { /* allerede stoppet */ }
    this.engine = null;
  },

  tick() { this.tone(1200, 0.04, 'square', 0.04); },
  select() { this.tone(660, 0.07, 'square', 0.06); this.tone(990, 0.1, 'square', 0.06, null, 0.06); },
  pew() { if (this.limit('pew', 0.07)) this.tone(1300, 0.06, 'square', 0.025, 700); },
  enemyShot() { if (this.limit('eshot', 0.12)) this.tone(420, 0.12, 'triangle', 0.06, 260); },
  tink() { if (this.limit('tink', 0.05)) this.tone(2200, 0.04, 'sine', 0.04); },
  puff() { if (this.limit('puff', 0.04)) { this.noise(0.3, 0.2, 0, 1400); this.tone(300, 0.25, 'square', 0.04, 90); } },
  boing() { if (this.limit('boing', 0.1)) this.tone(250, 0.3, 'sine', 0.12, 650); },
  pop() { if (this.limit('pop', 0.05)) { this.tone(900, 0.06, 'square', 0.08, 1800); this.noise(0.08, 0.15, 0, 4000); } },
  splash() { if (this.limit('splash', 0.2)) this.noise(0.4, 0.12, 0, 2500); },
  boom() { this.noise(0.9, 0.4, 0, 1100); this.tone(110, 0.8, 'sawtooth', 0.14, 30); },
  hurt() { if (this.limit('hurt', 0.2)) { this.tone(500, 0.18, 'square', 0.08, 180); this.noise(0.15, 0.15, 0, 2000); } },
  shieldHit() { if (this.limit('shieldHit', 0.08)) this.tone(1600, 0.12, 'sine', 0.07, 2400); },
  coin() { if (this.limit('coin', 0.04)) { this.tone(1320, 0.05, 'square', 0.04); this.tone(1760, 0.08, 'square', 0.04, null, 0.05); } },
  pickup() { this.melody([784, 988, 1319], 0.06, 'triangle', 0.13); },
  powerUp() { this.melody([523, 659, 784, 1047, 1319], 0.06, 'square', 0.07); },
  heal() { this.melody([659, 880, 1109, 1319], 0.08, 'sine', 0.14); },
  shield() { this.tone(400, 0.4, 'sine', 0.12, 1200); this.tone(600, 0.4, 'sine', 0.06, 1800, 0.05); },
  special() {
    this.noise(0.8, 0.12, 0, 3000);
    this.tone(200, 0.7, 'sawtooth', 0.05, 900);
    this.melody([523, 659, 784, 1047, 784, 1047], 0.09, 'square', 0.07);
  },
  oneUp() { this.melody([659, 784, 1319, 1047, 1175, 1568], 0.08, 'square', 0.08); },
  respawn() { this.tone(200, 0.4, 'sine', 0.1, 900); },
  alarm() { for (let i = 0; i < 3; i++) this.tone(440, 0.25, 'sawtooth', 0.06, 660, i * 0.4); },
  grumble() { if (this.limit('grumble', 1)) { this.tone(110, 0.3, 'sawtooth', 0.07, 85); this.tone(95, 0.35, 'sawtooth', 0.06, 75, 0.3); } },
  levelClear() { this.melody([523, 659, 784, 1047, 0, 784, 1047, 1319], 0.12, 'square', 0.09); },
  start() { this.melody([392, 523, 659, 784], 0.1, 'square', 0.08); },
  victory() { this.melody([523, 659, 784, 1047, 784, 1047, 1319, 0, 1319, 1568, 1319, 1568, 2093], 0.12, 'square', 0.09); },
  gameOver() { this.melody([523, 494, 440, 392, 0, 330, 392, 523], 0.15, 'triangle', 0.13); },
};
