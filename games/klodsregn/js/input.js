// Tastatur: husker hvilke taster der holdes nede, og hvilke der lige er trykket.
var Input = {
  keys: {},
  pressed: {},

  init: function () {
    var self = this;
    var block = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];
    addEventListener('keydown', function (e) {
      if (block.indexOf(e.code) >= 0) e.preventDefault();
      if (!self.keys[e.code]) self.pressed[e.code] = true;
      self.keys[e.code] = true;
      Sound.unlock();
    });
    addEventListener('keyup', function (e) { self.keys[e.code] = false; });
    addEventListener('blur', function () { self.keys = {}; });
  },

  down: function () { for (var i = 0; i < arguments.length; i++) if (this.keys[arguments[i]]) return true; return false; },
  hit: function () { for (var i = 0; i < arguments.length; i++) if (this.pressed[arguments[i]]) return true; return false; },
  endFrame: function () { this.pressed = {}; }
};
