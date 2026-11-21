// Tastatur og mus/touch. Husker hvilke taster der holdes nede og hvad der lige er trykket.
const Input = {
  keys: {},
  pressed: {},
  mouse: { x: -1, y: -1, clicked: false, down: false, moved: false },
  canvas: null,

  init(canvas) {
    this.canvas = canvas;
    const block = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab'];
    addEventListener('keydown', (e) => {
      if (block.includes(e.code)) e.preventDefault();
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
      Sound.unlock();
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; });

    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - r.left) / r.width) * canvas.width;
      this.mouse.y = ((e.clientY - r.top) / r.height) * canvas.height;
    };
    canvas.addEventListener('pointermove', (e) => { pos(e); this.mouse.moved = true; });
    canvas.addEventListener('pointerdown', (e) => {
      pos(e);
      this.mouse.down = true;
      this.mouse.clicked = true;
      Sound.unlock();
    });
    addEventListener('pointerup', () => { this.mouse.down = false; });
  },

  down(...codes) { return codes.some((c) => this.keys[c]); },
  hit(...codes) { return codes.some((c) => this.pressed[c]); },
  confirm() { return this.hit('Space', 'Enter', 'NumpadEnter'); },
  back() { return this.hit('Escape', 'Backspace'); },
  left() { return this.hit('ArrowLeft', 'KeyA'); },
  right() { return this.hit('ArrowRight', 'KeyD'); },
  up() { return this.hit('ArrowUp', 'KeyW'); },
  dn() { return this.hit('ArrowDown', 'KeyS'); },
  endFrame() { this.pressed = {}; this.mouse.clicked = false; this.mouse.moved = false; },
};
