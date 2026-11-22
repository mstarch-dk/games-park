// Små lydeffekter lavet direkte i browseren (ingen lydfiler).
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
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  },

  noise: function (dur, vol, delay) {
    if (!this.ctx || this.muted) return;
    var t = this.ctx.currentTime + (delay || 0);
    var len = Math.floor(this.ctx.sampleRate * dur);
    var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = this.ctx.createBufferSource();
    var g = this.ctx.createGain();
    src.buffer = buf;
    g.gain.setValueAtTime(vol || 0.3, t);
    src.connect(g).connect(this.ctx.destination);
    src.start(t);
  },

  melody: function (notes, step, type, vol) {
    var self = this;
    notes.forEach(function (f, i) { if (f) self.tone(f, step * 1.4, type, vol, null, i * step); });
  },

  tick: function () { this.tone(900, 0.04, 'square', 0.04); },
  move: function () { this.tone(520, 0.035, 'triangle', 0.08); },
  rotate: function () { this.tone(660, 0.07, 'triangle', 0.1, 990); },
  land: function () { this.tone(170, 0.09, 'sine', 0.25, 90); },
  drop: function () { this.tone(700, 0.12, 'sine', 0.12, 140); this.noise(0.08, 0.12, 0.08); },
  clear: function (n) {
    var songs = [
      [659, 784, 1047],
      [523, 659, 784, 1047],
      [523, 659, 784, 1047, 1319],
      [523, 659, 784, 1047, 784, 1047, 1319, 1568]
    ];
    this.melody(songs[Math.min(n, 4) - 1], 0.07, 'square', 0.08);
  },
  boom: function () { this.noise(0.6, 0.45); this.tone(130, 0.5, 'sawtooth', 0.15, 35); this.melody([1319, 1568, 2093], 0.06, 'triangle', 0.06); },
  levelUp: function () { this.melody([392, 523, 659, 784, 0, 659, 784, 1047], 0.09, 'triangle', 0.14); },
  oops: function () { this.tone(520, 0.5, 'triangle', 0.14, 160); },
  sweep: function () { for (var i = 0; i < 8; i++) this.tone(400 + i * 120, 0.12, 'sine', 0.07, null, i * 0.12); },
  gameOver: function () { this.melody([523, 494, 440, 392, 0, 330, 392, 523], 0.16, 'triangle', 0.14); },
  start: function () { this.melody([523, 659, 784, 1047], 0.08, 'square', 0.07); }
};
