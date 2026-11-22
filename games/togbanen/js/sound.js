// Lyde lavet direkte i browseren med Web Audio (ingen lydfiler).
var Sound = {
  ctx: null,
  muted: false,

  unlock: function () {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  tone: function (freq, dur, type, vol, slideTo, delay) {
    if (!this.ctx || this.muted) return;
    var t = this.ctx.currentTime + (delay || 0);
    var o = this.ctx.createOscillator();
    var g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  },

  noise: function (dur, vol, delay, cutoff) {
    if (!this.ctx || this.muted) return;
    var t = this.ctx.currentTime + (delay || 0);
    var len = Math.floor(this.ctx.sampleRate * dur);
    var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    var src = this.ctx.createBufferSource();
    var f = this.ctx.createBiquadFilter();
    var g = this.ctx.createGain();
    f.type = 'lowpass';
    f.frequency.value = cutoff || 1200;
    src.buffer = buf;
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.ctx.destination);
    src.start(t);
  },

  melody: function (notes, step, type, vol) {
    var self = this;
    notes.forEach(function (f, i) { if (f) self.tone(f, step * 1.5, type, vol, null, i * step); });
  },

  chuff: function () { this.noise(0.11, 0.22, 0, 700); },
  whistle: function () {
    this.tone(784, 0.55, 'sine', 0.09);
    this.tone(988, 0.55, 'sine', 0.07);
    this.tone(784, 0.35, 'sine', 0.09, null, 0.62);
    this.tone(988, 0.35, 'sine', 0.07, null, 0.62);
  },
  horn: function () {
    this.tone(330, 0.28, 'square', 0.06);
    this.tone(415, 0.28, 'square', 0.05);
    this.tone(330, 0.4, 'square', 0.06, null, 0.32);
    this.tone(415, 0.4, 'square', 0.05, null, 0.32);
  },
  place: function () { this.tone(520 + Math.random() * 80, 0.06, 'triangle', 0.09); },
  rotate: function () { this.tone(660, 0.07, 'triangle', 0.09, 880); },
  flip: function () { this.tone(900, 0.04, 'square', 0.05); this.tone(600, 0.06, 'square', 0.05, null, 0.06); },
  erase: function () { this.noise(0.12, 0.12, 0, 3000); },
  click: function () { this.tone(800, 0.05, 'triangle', 0.07); },
  nope: function () { this.tone(260, 0.15, 'sine', 0.1, 220); },
  pickup: function () { this.melody([659, 880], 0.07, 'triangle', 0.12); },
  deliver: function () { this.melody([523, 659, 784, 1047], 0.09, 'triangle', 0.13); },
  full: function () { this.tone(330, 0.2, 'sine', 0.1, 260); },
  bump: function () { this.tone(200, 0.35, 'sine', 0.25, 90); this.tone(500, 0.2, 'sine', 0.08, 900, 0.1); },
  stop: function () { this.tone(523, 0.18, 'triangle', 0.1); this.tone(392, 0.3, 'triangle', 0.1, null, 0.18); },
  moo: function () { this.tone(150, 0.8, 'sawtooth', 0.06, 115); this.tone(152, 0.8, 'triangle', 0.08, 118); },
  win: function () { this.melody([523, 659, 784, 659, 784, 1047, 0, 1047, 1175, 1319], 0.11, 'triangle', 0.13); },
  star: function (i) { this.tone(880 + i * 220, 0.18, 'triangle', 0.12); }
};
