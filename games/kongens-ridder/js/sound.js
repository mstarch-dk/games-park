// Lyd lavet direkte i browseren (ingen lydfiler): fanfarer, trommer, hove og sværdklang.
const Sound = {
  ctx: null,
  muted: false,
  last: {},
  music: null,

  unlock() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stopMusic();
    return this.muted;
  },

  limit(name, gap) {
    if (!this.ctx || this.muted) return false;
    const now = this.ctx.currentTime;
    if (this.last[name] && now - this.last[name] < gap) return false;
    this.last[name] = now;
    return true;
  },

  tone(freq, dur, type = 'square', vol = 0.1, slideTo = null, delay = 0) {
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

  // Messing-agtig tone: to lidt forstemte savtakker gennem et lavpasfilter
  brass(freq, dur, vol = 0.07, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq * 2, t);
    f.frequency.linearRampToValueAtTime(freq * 5, t + 0.08);
    f.frequency.linearRampToValueAtTime(freq * 3, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.04);
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    f.connect(g).connect(this.ctx.destination);
    [0, 4].forEach((det) => {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = det;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
  },

  noise(dur, vol = 0.3, delay = 0, lowpass = 0, highpass = 0) {
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
    if (lowpass) { const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass; node = node.connect(f); }
    if (highpass) { const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = highpass; node = node.connect(f); }
    node.connect(g).connect(this.ctx.destination);
    src.start(t);
  },

  // notes: [frekvens, varighed i slag] – 0 = pause
  fanfare(notes, beat = 0.16, vol = 0.07) {
    let t = 0;
    notes.forEach(([f, d]) => { if (f) this.brass(f, d * beat * 0.95, vol, t); t += d * beat; });
    return t;
  },

  drum(delay = 0, vol = 0.35) { this.tone(90, 0.25, 'sine', vol, 45, delay); this.noise(0.12, vol * 0.4, delay, 600); },

  // Lille melodi-loop på kortet (en enkel middelalder-dans i d-dorisk)
  startMusic() {
    if (!this.ctx || this.muted || this.music) return;
    const tune = [294, 349, 392, 440, 392, 349, 330, 294, 262, 294, 349, 330, 294, 0, 220, 262,
      294, 349, 392, 440, 523, 440, 392, 349, 330, 294, 262, 330, 294, 0, 294, 0];
    const bass = [147, 147, 131, 131, 117, 117, 131, 147];
    let i = 0;
    const step = () => {
      if (this.muted) return;
      const f = tune[i % tune.length];
      if (f) this.tone(f, 0.34, 'triangle', 0.045);
      if (i % 4 === 0) this.tone(bass[(i / 4) % bass.length], 1.3, 'sine', 0.05);
      if (i % 2 === 0) this.noise(0.04, 0.03, 0, 0, 5000);
      i++;
    };
    this.music = setInterval(step, 300);
  },
  stopMusic() { if (this.music) { clearInterval(this.music); this.music = null; } },

  tick() { this.tone(1200, 0.04, 'square', 0.03); },
  select() { this.tone(660, 0.07, 'square', 0.05); this.tone(990, 0.1, 'square', 0.05, null, 0.06); },
  deny() { this.tone(200, 0.2, 'square', 0.06, 140); },
  coin() { if (this.limit('coin', 0.05)) { this.tone(1320, 0.05, 'square', 0.04); this.tone(1760, 0.1, 'square', 0.04, null, 0.05); } },
  thunk() { this.tone(140, 0.2, 'square', 0.1, 60); this.noise(0.15, 0.2, 0, 800); },
  whoosh() { this.noise(0.5, 0.15, 0, 0, 900); },
  crash() { this.noise(0.7, 0.4, 0, 1500); this.tone(90, 0.5, 'sawtooth', 0.1, 40); },
  fire() { this.noise(0.9, 0.25, 0, 2500); this.tone(300, 0.6, 'sawtooth', 0.05, 80); },
  clang() { if (this.limit('clang', 0.06)) { this.tone(1900, 0.18, 'square', 0.05, 1700); this.tone(2650, 0.25, 'sine', 0.05); this.noise(0.05, 0.15, 0, 0, 3000); } },
  swish() { if (this.limit('swish', 0.08)) this.noise(0.12, 0.12, 0, 0, 2000); },
  hurt() { this.tone(400, 0.2, 'square', 0.07, 150); this.noise(0.1, 0.15, 0, 1500); },
  hoof() { if (this.limit('hoof', 0.1)) { this.tone(180, 0.05, 'sine', 0.15, 90); this.noise(0.04, 0.1, 0, 1200); } },
  splinter() { this.noise(0.5, 0.35, 0, 4000); this.tone(700, 0.15, 'square', 0.06, 200); },
  cheer() { this.noise(1.6, 0.12, 0, 3500, 600); this.noise(1.2, 0.08, 0.3, 2500, 800); },
  groan() { this.tone(160, 0.7, 'sawtooth', 0.04, 110); this.noise(1.0, 0.06, 0, 900); },
  battleCry() { this.noise(0.8, 0.15, 0, 1800, 300); this.tone(220, 0.5, 'sawtooth', 0.03, 330); },

  titleTheme() {
    return this.fanfare([[294, 1], [294, 0.5], [294, 0.5], [392, 2], [440, 1], [494, 1], [587, 3], [0, 1],
      [494, 1], [587, 1], [659, 1], [587, 1], [494, 1], [440, 1], [392, 4]], 0.2, 0.06);
  },
  royal() { this.fanfare([[392, 0.5], [392, 0.5], [523, 1], [392, 0.5], [523, 0.5], [659, 2]], 0.17); },
  victory() {
    this.fanfare([[523, 1], [523, 0.5], [523, 0.5], [659, 1], [784, 2], [659, 1], [784, 1], [1047, 4]], 0.18, 0.07);
    for (let i = 0; i < 8; i++) this.drum(i * 0.36, 0.2);
  },
  defeat() { this.fanfare([[392, 2], [370, 2], [349, 2], [294, 4]], 0.25, 0.05); this.drum(0, 0.3); this.drum(1.0, 0.3); },
  march() { for (let i = 0; i < 6; i++) this.drum(i * 0.22, i % 2 ? 0.15 : 0.3); },
};
