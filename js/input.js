// Tastatur: husker hvilke taster der holdes nede, og hvilke der lige er trykket.
const Input = {
  keys: {},
  pressed: {},

  init() {
    const block = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];
    addEventListener('keydown', (e) => {
      if (block.includes(e.code)) e.preventDefault();
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
      Sound.unlock();
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; });
  },

  down(...codes) { return codes.some((c) => this.keys[c]); },
  hit(...codes) { return codes.some((c) => this.pressed[c]); },
  endFrame() { this.pressed = {}; },

  left() { return this.down('ArrowLeft', 'KeyA'); },
  right() { return this.down('ArrowRight', 'KeyD'); },
  jumpHeld() { return this.down('ArrowUp', 'Space', 'KeyW'); },
  jumpHit() { return this.hit('ArrowUp', 'Space', 'KeyW'); },
  confirm() { return this.hit('Space', 'Enter'); },
};
