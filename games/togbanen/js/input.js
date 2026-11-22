// Mus, touch og tastatur. Sender alt videre til Game.
var Input = {
  init: function (canvas) {
    var toCanvas = function (e) {
      var r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
    };
    canvas.addEventListener('pointerdown', function (e) {
      Sound.unlock();
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
      var p = toCanvas(e);
      Game.pointerDown(p.x, p.y, e.button);
    });
    canvas.addEventListener('pointermove', function (e) {
      var p = toCanvas(e);
      Game.pointerMove(p.x, p.y, e.buttons);
    });
    var up = function (e) {
      var p = toCanvas(e);
      Game.pointerUp(p.x, p.y);
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', function () { Game.hover = null; Game.hoverBtn = null; });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    var block = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Backspace'];
    addEventListener('keydown', function (e) {
      if (block.indexOf(e.code) >= 0) e.preventDefault();
      Sound.unlock();
      Game.key(e);
    });
    addEventListener('keyup', function (e) {
      if (e.key === 'Shift') Game.kbStroke = null;
    });
  }
};
