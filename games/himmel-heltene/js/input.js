// Tastatur: husker hvilke taster der holdes nede, og hvilke der lige er trykket.
// To spillere deler tastaturet, så hver har sit eget tastsæt.
const KEYSETS = {
  // Én spiller: både pile og WASD virker
  solo: {
    left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
    up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
    fire: ['Space', 'KeyF', 'KeyL'], special: ['KeyB', 'Enter', 'KeyG', 'KeyK'],
  },
  p1: {
    left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
    fire: ['KeyF', 'Space'], special: ['KeyG'],
  },
  p2: {
    left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
    fire: ['KeyL', 'Numpad0', 'ShiftRight'], special: ['KeyK', 'Enter', 'Numpad1'],
  },
};

const KEY_HELP = {
  solo: ['← → ↑ ↓  flyv', 'MELLEMRUM  skyd', 'B  venne-fly'],
  p1: ['W A S D  flyv', 'F  skyd', 'G  venne-fly'],
  p2: ['← → ↑ ↓  flyv', 'L  skyd', 'K  venne-fly'],
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
  confirm() { return this.hit('Space', 'Enter', 'NumpadEnter'); },

  // Læs et tastsæt som et "styre-objekt", som flyet forstår
  control(setName) {
    const k = KEYSETS[setName];
    return {
      dx: (this.down(...k.right) ? 1 : 0) - (this.down(...k.left) ? 1 : 0),
      dy: (this.down(...k.down) ? 1 : 0) - (this.down(...k.up) ? 1 : 0),
      fire: this.down(...k.fire),
      special: this.hit(...k.special),
    };
  },
};
