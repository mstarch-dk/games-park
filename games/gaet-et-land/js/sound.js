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
  click: function () { this.tone(800, 0.05, 'triangle', 0.07); },
  pin: function () { this.tone(520, 0.08, 'triangle', 0.1, 780); },
  hint: function () { this.melody([660, 880], 0.06, 'sine', 0.08); },
  page: function () { this.noise(0.08, 0.06, 0, 2500); },
  nope: function () { this.tone(260, 0.15, 'sine', 0.1, 220); },
  // Jo flere stjerner, jo gladere lyd.
  result: function (stars) {
    if (stars >= 3) this.melody([523, 659, 784, 1047, 0, 1319], 0.09, 'triangle', 0.13);
    else if (stars === 2) this.melody([523, 659, 784], 0.1, 'triangle', 0.12);
    else if (stars === 1) this.melody([440, 523], 0.12, 'triangle', 0.11);
    else this.melody([392, 330], 0.16, 'sine', 0.1);
  },
  win: function () { this.melody([523, 659, 784, 659, 784, 1047, 0, 1047, 1175, 1319], 0.11, 'triangle', 0.13); }
};
