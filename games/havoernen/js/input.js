// Tastatur: husker hvilke taster der holdes nede, og hvilke der lige er trykket.
const Input = {
  keys: {},
  pressed: {},

  init() {
    const block = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab'];
    addEventListener('keydown', (e) => {
      if (block.includes(e.code)) e.preventDefault();
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
      Sound.unlock();
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; });
    addEventListener('mousedown', () => Sound.unlock());
  },

  down(...codes) { return codes.some((c) => this.keys[c]); },
  hit(...codes) { return codes.some((c) => this.pressed[c]); },
  endFrame() { this.pressed = {}; },
  confirm() { return this.hit('Space', 'Enter', 'NumpadEnter'); },
  menuUp() { return this.hit('ArrowUp', 'KeyW'); },
  menuDown() { return this.hit('ArrowDown', 'KeyS'); },
};
