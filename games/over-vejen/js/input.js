// Tastatur og mus/touch: husker hvilke taster der holdes nede, hvilke der lige er trykket, og klik.
const Input = {
  keys: {},
  pressed: {},
  taps: [],

  init(canvas) {
    const block = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];
    addEventListener('keydown', (e) => {
      if (block.includes(e.code)) e.preventDefault();
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
      Sound.unlock();
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; });
    canvas.addEventListener('pointerdown', (e) => {
      const r = canvas.getBoundingClientRect();
      this.taps.push({
        x: (e.clientX - r.left) * canvas.width / r.width,
        y: (e.clientY - r.top) * canvas.height / r.height,
      });
      Sound.unlock();
      e.preventDefault();
    });
  },

  down(...codes) { return codes.some((c) => this.keys[c]); },
  hit(...codes) { return codes.some((c) => this.pressed[c]); },
  endFrame() { this.pressed = {}; this.taps = []; },

  // Retning der lige er trykket (eller null).
  hitDir() {
    if (this.hit('ArrowUp', 'KeyW')) return { dc: 0, dr: -1 };
    if (this.hit('ArrowDown', 'KeyS')) return { dc: 0, dr: 1 };
    if (this.hit('ArrowLeft', 'KeyA')) return { dc: -1, dr: 0 };
    if (this.hit('ArrowRight', 'KeyD')) return { dc: 1, dr: 0 };
    return null;
  },
  // Retning der holdes nede (eller null).
  heldDir() {
    if (this.down('ArrowUp', 'KeyW')) return { dc: 0, dr: -1 };
    if (this.down('ArrowDown', 'KeyS')) return { dc: 0, dr: 1 };
    if (this.down('ArrowLeft', 'KeyA')) return { dc: -1, dr: 0 };
    if (this.down('ArrowRight', 'KeyD')) return { dc: 1, dr: 0 };
    return null;
  },
  anyArrow() { return this.hit('ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'); },
  confirm() { return this.hit('Space', 'Enter') || this.taps.length > 0; },
};
