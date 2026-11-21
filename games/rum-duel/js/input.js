// Tastatur: husker hvilke taster der holdes nede, og hvilke der lige er trykket.
// To spillere deler tastaturet, så hver har sit eget tastsæt.
const KEYSETS = {
  // Én spiller: både pile og WASD virker
  solo: {
    left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], thrust: ['ArrowUp', 'KeyW'],
    fire: ['Space', 'KeyF', 'Enter', 'KeyL'], special: ['ArrowDown', 'KeyS', 'KeyG', 'KeyK'],
  },
  p1: {
    left: ['KeyA'], right: ['KeyD'], thrust: ['KeyW'],
    fire: ['KeyF', 'Space'], special: ['KeyG', 'KeyS'],
  },
  p2: {
    left: ['ArrowLeft'], right: ['ArrowRight'], thrust: ['ArrowUp'],
    fire: ['KeyL', 'Numpad0', 'Enter', 'ShiftRight'], special: ['ArrowDown', 'KeyK', 'Numpad1'],
  },
};

const KEY_HELP = {
  solo: '← → drej · ↑ speeder · MELLEMRUM skyd · ↓ special',
  p1: 'A D drej · W speeder · F skyd · G special',
  p2: '← → drej · ↑ speeder · L skyd · ↓ special',
};

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
  confirm() { return this.hit('Space', 'Enter'); },

  // Læs et tastsæt som et "styre-objekt", som skibet forstår.
  // Computeren laver samme slags objekt i ai.js.
  control(setName) {
    const k = KEYSETS[setName];
    return {
      left: this.down(...k.left),
      right: this.down(...k.right),
      thrust: this.down(...k.thrust),
      fire: this.down(...k.fire),
      special: this.down(...k.special),
    };
  },
  // Menu-navigation for et tastsæt: -1/0/1 og bekræft
  menu(setName) {
    const k = KEYSETS[setName];
    return {
      dx: (this.hit(...k.right) ? 1 : 0) - (this.hit(...k.left) ? 1 : 0),
      dy: (this.hit(...k.special) ? 1 : 0) - (this.hit(...k.thrust) ? 1 : 0),
      ok: this.hit(...k.fire),
    };
  },
};
