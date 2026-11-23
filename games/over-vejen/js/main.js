// Selve spillet: skærme, regler og game loop.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const KEY = {
  hi: 'overvejen-highscore',
  unlocked: 'overvejen-unlocked',
  stars: 'overvejen-stars',
  mode: 'overvejen-mode',
};
function load(k, d) {
  try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
}
function save(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ingen lagring */ }
}

const START_COL = 7;
const MOTHER_COL = 7.5;

const Game = {
  state: 'title',
  stateTime: 0,
  t: 0,
  mode: 0,          // 0 = let (med kig-hjælp), 1 = normal
  startLevel: 0,
  levelIndex: 0,
  score: 0,
  ghosts: true,

  init() {
    this.hi = load(KEY.hi, 0) || 0;
    this.unlocked = Math.max(1, Math.min(LEVELS.length, load(KEY.unlocked, 1) || 1));
    this.stars = load(KEY.stars, []);
    if (!Array.isArray(this.stars)) this.stars = [];
    this.mode = load(KEY.mode, 0) === 1 ? 1 : 0;
    this.startLevel = this.unlocked - 1;
    Input.init(canvas);
    this.titleWorld = new World(LEVELS[2], 2, false);
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      this.update(dt);
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  setState(s) { this.state = s; this.stateTime = 0; },

  startRun(i) {
    this.score = 0;
    this.ghosts = this.mode === 0;
    save(KEY.mode, this.mode);
    this.loadLevel(i);
  },

  loadLevel(i) {
    this.levelIndex = i;
    this.world = new World(LEVELS[i], i, this.mode === 0);
    this.duck = new Duck(START_COL, ROWS - 1);
    this.bumps = 0;
    this.cornGot = 0;
    this.bestRow = ROWS - 1;
    this.levelStartScore = this.score;
    this.tip = null;
    this.pedTickT = 0;
    FX.clear();
    this.setState('intro');
  },

  // ---------- Opdatering ----------
  update(dt) {
    this.t += dt;
    this.stateTime += dt;
    if (Input.hit('KeyM')) Sound.muted = !Sound.muted;

    switch (this.state) {
      case 'title': this.updateTitle(dt); break;
      case 'intro':
        this.world.update(dt);
        if (this.stateTime > 4 || (this.stateTime > 0.4 && (Input.confirm() || Input.anyArrow()))) this.setState('playing');
        else if (Input.hit('Escape')) this.setState('title');
        break;
      case 'playing': this.updatePlaying(dt); break;
      case 'paused':
        if (Input.hit('KeyP', 'Space', 'Enter') || Input.taps.length) this.setState('playing');
        else if (Input.hit('Escape')) this.setState('title');
        break;
      case 'home':
        this.world.update(dt);
        FX.update(dt);
        this.updateHome(dt);
        break;
      case 'won':
        this.world.update(dt);
        FX.update(dt);
        if (Math.random() < 0.15) FX.burst(MOTHER_COL * T, TOP + 30, 'heart', 1, '#ff6b8b');
        this.wonStars.forEach((s, i) => {
          if (!s.shown && this.stateTime > 0.5 + i * 0.35) { s.shown = true; if (i < this.wonCount) Sound.star(i); }
        });
        if (this.stateTime > 1.2 && Input.confirm()) {
          if (this.levelIndex + 1 < LEVELS.length) this.loadLevel(this.levelIndex + 1);
          else { this.setState('finale'); Sound.finale(); }
        } else if (this.stateTime > 0.5 && Input.hit('KeyR')) {
          this.score = this.levelStartScore;
          this.loadLevel(this.levelIndex);
        } else if (Input.hit('Escape')) this.setState('title');
        break;
      case 'finale':
        this.titleWorld.update(dt);
        FX.update(dt);
        if (Math.random() < 0.3) FX.burst(Math.random() * W, Math.random() * H * 0.6, Math.random() < 0.5 ? 'star' : 'heart', 3, pick(['#ffd23f', '#ff6b8b', '#4cc9f0', '#80ed99']));
        if (this.stateTime > 2 && Input.confirm()) this.setState('title');
        break;
    }
    Input.endFrame();
  },

  updateTitle(dt) {
    this.titleWorld.update(dt);
    if (Input.hit('ArrowUp', 'ArrowDown', 'KeyW', 'KeyS')) { this.mode = 1 - this.mode; Sound.tick(); }
    const dx = (Input.hit('ArrowRight', 'KeyD') ? 1 : 0) - (Input.hit('ArrowLeft', 'KeyA') ? 1 : 0);
    if (dx) {
      const n = Math.max(0, Math.min(this.unlocked - 1, this.startLevel + dx));
      if (n !== this.startLevel) { this.startLevel = n; Sound.tick(); }
    }
    for (const tap of Input.taps) {
      // Klik på et af de to knapper vælger sværhedsgrad og starter.
      if (tap.y > 300 && tap.y < 380 && Math.abs(tap.x - W / 2) < 260) { this.mode = tap.x < W / 2 ? 0 : 1; }
    }
    if (Input.confirm()) { Sound.peep(); this.startRun(this.startLevel); }
  },

  inputDir() {
    const d = Input.hitDir();
    if (d) return d;
    const tap = Input.taps[0];
    if (!tap) return null;
    const p = this.duck.pos();
    const dx = tap.x - p.x * T, dy = tap.y - (TOP + p.y * T);
    if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return null;
    if (Math.abs(dx) > Math.abs(dy)) return { dc: Math.sign(dx), dr: 0 };
    return { dc: 0, dr: Math.sign(dy) };
  },

  updatePlaying(dt) {
    if (Input.hit('KeyP')) { this.setState('paused'); return; }
    if (Input.hit('Escape')) { this.setState('title'); return; }
    if (Input.hit('KeyH')) {
      this.ghosts = !this.ghosts;
      Sound.tick();
      FX.popup(W / 2, TOP + 40, this.ghosts ? 'Kig-hjælp: TIL' : 'Kig-hjælp: FRA', '#bde0fe', 26);
    }
    this.world.update(dt);
    this.duck.update(dt, this);
    if (this.state !== 'playing') return;
    this.checkTraffic();
    FX.update(dt);
    if (this.tip) { this.tip.t -= dt; if (this.tip.t <= 0) this.tip = null; }

    // Fodgænger-lyset tikker hurtigt, når der er grønt (ligesom de rigtige).
    const L = this.world.light;
    if (L && L.pedGreen() && Math.abs(this.duck.c - L.col) <= 3) {
      this.pedTickT -= dt;
      if (this.pedTickT <= 0) { this.pedTickT = 0.22; Sound.pedTick(); }
    }
  },

  checkTraffic() {
    const d = this.duck;
    if (d.busy()) return;
    const row = d.rowNow();
    const lane = this.world.lanes[row];
    if (!lane) return;
    const p = d.pos();
    const x0 = p.x - 0.27, x1 = p.x + 0.27;
    for (const v of lane.vs) {
      const vx = lane.x(v), vx1 = vx + v.len;
      if (x1 > vx + 0.05 && x0 < vx1 - 0.05) { this.bump(v, lane); return; }
      // Bilen dytter, lige før den når ællingen – så er der lige tid til at hoppe væk.
      const dist = lane.dir > 0 ? x0 - vx1 : vx - x1;
      if (dist > 0 && dist < Math.max(0.35, v.cur * 0.5) && !v.warned) {
        v.warned = true;
        v.honkT = 0.7;
        Sound.honk(v.type);
      }
    }
  },

  bump(v, lane) {
    const d = this.duck;
    const p = d.pos();
    const stood = d.still > 1.2 && !d.hopping;
    this.bumps++;
    v.honkT = 0.9;
    if (!v.warned) Sound.honk(v.type);
    v.warned = true;
    Sound.whoosh();
    Sound.quack(0.1);
    FX.burst(p.x * T, TOP + p.y * T, 'feather', 10, '#ffe066');
    FX.popup(p.x * T, TOP + p.y * T - 30, 'Hov!', '#ffd23f', 30);
    d.startFly(d.lastSafe);
    this.tip = { text: this.tipFor(v, lane, stood), t: 4.5 };
  },

  tipFor(v, lane, stood) {
    const name = v.kind.name;
    const Name = name[0].toUpperCase() + name.slice(1);
    const side = lane.dir > 0 ? 'venstre' : 'højre';
    if (stood) return 'Bliv ikke stående på vejen – hop videre, når der er plads!';
    if (v.type === 'bus' || v.type === 'lastbil') return `${Name} er lang! Vent til HELE ${name} er kørt forbi.`;
    if (v.type === 'cykel') return `${Name} kom fra ${side}. Husk også at kigge efter cykler!`;
    if (lane.speed >= 2.2) return `${Name} kørte stærkt fra ${side}. Vent på et stort hul!`;
    return `${Name} kom fra ${side}. Kig til ${side}, før du hopper!`;
  },

  afterBump() {
    Sound.peep();
    const p = this.duck.pos();
    FX.popup(p.x * T, TOP + p.y * T - 34, 'Puha!', '#fff', 24);
  },

  onLand(d) {
    const w = this.world;
    if (!w.isRoad(d.r)) d.lastSafe = d.r;
    if (d.r < this.bestRow) {
      this.score += 10 * (this.bestRow - d.r);
      this.bestRow = d.r;
    }
    for (const k of w.corn) {
      if (!k.taken && k.c === d.c && k.r === d.r) {
        k.taken = true;
        this.cornGot++;
        this.score += 50;
        Sound.corn();
        FX.burst(d.c * T + T / 2, TOP + d.r * T + T / 2, 'star', 8, '#ffbe0b');
        FX.popup(d.c * T + T / 2, TOP + d.r * T, '+50', '#ffe066');
      }
    }
    if (w.rows[d.r].t === 'P') {
      d.home = { t: 0, sx: d.c + 0.5 };
      this.tip = null;
      Sound.splash();
      FX.burst(d.c * T + T / 2, TOP + d.r * T + T / 2, 'drop', 14, '#bde0fe');
      this.setState('home');
    }
  },

  updateHome(dt) {
    const h = this.duck.home;
    h.t += dt;
    if (h.t > 0.4 && !h.sang) { h.sang = true; Sound.home(); }
    if (Math.random() < 0.2) FX.burst(MOTHER_COL * T, TOP + 24, 'heart', 1, '#ff6b8b');
    if (this.stateTime > 2.4) this.finishLevel();
  },

  finishLevel() {
    const n = this.bumps === 0 ? 3 : this.bumps <= 2 ? 2 : 1;
    this.wonCount = n;
    this.wonStars = [0, 1, 2].map(() => ({ shown: false }));
    this.levelPoints = 200 + n * 100;
    this.score += this.levelPoints;
    const i = this.levelIndex;
    this.stars[i] = Math.max(this.stars[i] || 0, n);
    save(KEY.stars, this.stars);
    if (i + 2 > this.unlocked && i + 1 < LEVELS.length) { this.unlocked = i + 2; save(KEY.unlocked, this.unlocked); }
    this.startLevel = Math.min(this.unlocked - 1, i + 1);
    this.newHi = false;
    if (this.score > this.hi) { this.hi = this.score; this.newHi = true; save(KEY.hi, this.hi); }
    this.setState('won');
  },

  // ---------- Tegning ----------
  draw() {
    ctx.clearRect(0, 0, W, H);
    if (this.state === 'title' || this.state === 'finale') {
      this.drawWorld(this.titleWorld, false);
      if (this.state === 'title') this.drawTitle(); else this.drawFinale();
      return;
    }
    this.drawWorld(this.world, this.ghosts && this.state !== 'intro');
    this.drawDuck();
    FX.draw(ctx);
    this.drawHud();
    if (this.tip && this.state === 'playing') this.drawTip();
    if (this.state === 'intro') this.drawIntro();
    if (this.state === 'paused') this.drawPaused();
    if (this.state === 'won') this.drawWon();
  },

  drawWorld(w, ghosts) {
    ctx.fillStyle = '#183024';
    ctx.fillRect(0, 0, W, TOP);
    ctx.drawImage(w.bg, 0, TOP);
    drawPond(ctx, this.t);
    const happy = this.state === 'home' || this.state === 'won';
    const face = this.duck && this.state !== 'title' && this.state !== 'finale' && this.duck.pos().x < MOTHER_COL ? -1 : 1;
    drawMother(ctx, MOTHER_COL * T, this.t, face, happy);
    for (const k of w.corn) if (!k.taken && w !== this.titleWorld) drawCorn(ctx, k.c, k.r, this.t, k.bob);
    drawLight(ctx, w, this.t);
    if (ghosts) for (const l of w.lanes) if (l) for (const v of l.vs) drawGhost(ctx, l, v);
    for (const l of w.lanes) if (l) for (const v of l.vs) drawVehicle(ctx, l, v, this.t, false);
  },

  drawDuck() {
    const d = this.duck;
    if (d.home) {
      const h = d.home;
      const e = Math.min(1, h.t / 1.6);
      const tx = MOTHER_COL + (h.sx < MOTHER_COL ? -0.9 : 0.9);
      const x = (h.sx + (tx - h.sx) * e) * T;
      const y = TOP + 40 + Math.sin(this.t * 3) * 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
      ell(ctx, x, y + 9, 22, 5); ctx.stroke();
      const face = e < 1 ? Math.sign(tx - h.sx) || 1 : (x < MOTHER_COL * T ? 1 : -1);
      drawDuckling(ctx, x, y, 0.85, face, { swim: true, open: Math.sin(this.t * 16) > 0.3 });
      return;
    }
    const p = d.pos();
    const x = p.x * T, gy = TOP + p.y * T;
    drawShadow(ctx, x, gy + 18, 16 * (1 - Math.min(0.6, p.h * 0.3)));
    const y = gy - p.h * T;
    if (d.fly) {
      const rot = d.fly.t * Math.PI * 2 * (d.face > 0 ? -1 : 1);
      drawDuckling(ctx, x, y, 1.05 + p.h * 0.25, d.face, { rot, flap: Math.sin(this.t * 40) > 0, scared: true });
      return;
    }
    const step = d.hopping ? Math.sin(d.hopT * Math.PI * 2) : 0;
    const blink = !d.hopping && (this.t % 3.2) < 0.12;
    const squish = d.hopping ? 1 : 1 + Math.sin(this.t * 4) * 0.02;
    drawDuckling(ctx, x, y, squish, d.face, { step, blink, flap: d.hopping });
  },

  drawHud() {
    const def = LEVELS[this.levelIndex];
    ctx.fillStyle = '#183024';
    ctx.fillRect(0, 0, W, TOP);
    text(ctx, `Bane ${this.levelIndex + 1}: ${def.name}`, 18, 32, 24, '#ffe066', 'left');
    // majs
    const cx = 520;
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = i < this.cornGot ? 1 : 0.25;
      ctx.fillStyle = '#ffbe0b';
      ell(ctx, cx + i * 22, 32, 7, 9); ctx.fill();
    }
    ctx.globalAlpha = 1;
    text(ctx, `Hov: ${this.bumps}`, 650, 32, 22, this.bumps ? '#ffafcc' : '#b9fbc0', 'left');
    text(ctx, `${this.score}`, W - 20, 32, 28, '#fff', 'right');
    if (this.ghosts) text(ctx, '👻 H', W - 120, 32, 18, '#bde0fe', 'right');
  },

  drawTip() {
    const a = Math.min(1, this.tip.t * 2);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(24,48,36,0.88)';
    rr(ctx, 90, H - 70, W - 180, 54, 18); ctx.fill();
    ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 3; ctx.stroke();
    text(ctx, '💡 ' + this.tip.text, W / 2, H - 43, 22, '#fff', 'center', null);
    ctx.globalAlpha = 1;
  },

  panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    rr(ctx, x + 6, y + 8, w, h, 26); ctx.fill();
    ctx.fillStyle = '#fffaf0';
    rr(ctx, x, y, w, h, 26); ctx.fill();
    ctx.strokeStyle = '#2d6a4f'; ctx.lineWidth = 5; ctx.stroke();
  },

  drawIntro() {
    const def = LEVELS[this.levelIndex];
    ctx.fillStyle = 'rgba(10,30,20,0.35)';
    ctx.fillRect(0, TOP, W, H - TOP);
    this.panel(150, 220, 660, 250);
    text(ctx, `Bane ${this.levelIndex + 1}`, W / 2, 265, 30, '#2d6a4f', 'center', null);
    text(ctx, def.name, W / 2, 315, 44, '#ff8c1a', 'center', '#fff');
    this.wrap(def.tip, W / 2, 375, 560, 24, '#33415c');
    text(ctx, 'Tryk på en piletast for at hoppe!', W / 2, 440, 22, '#2d6a4f', 'center', null);
  },

  wrap(str, x, y, maxW, size, color) {
    ctx.font = `bold ${size}px "Comic Sans MS", "Trebuchet MS", sans-serif`;
    const words = str.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    lines.push(line);
    lines.forEach((l, i) => text(ctx, l, x, y + (i - (lines.length - 1) / 2) * size * 1.3, size, color, 'center', null));
  },

  drawPaused() {
    ctx.fillStyle = 'rgba(10,30,20,0.55)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, 'Pause', W / 2, H / 2 - 30, 64, '#ffe066');
    text(ctx, 'P fortsæt  ·  ESC menu', W / 2, H / 2 + 40, 26);
  },

  drawWon() {
    const a = Math.min(1, this.stateTime * 3);
    ctx.globalAlpha = a;
    this.panel(180, 180, 600, 360);
    text(ctx, 'Hjemme hos mor! 🦆', W / 2, 225, 40, '#ff8c1a', 'center', '#fff');
    for (let i = 0; i < 3; i++) {
      const s = this.wonStars[i];
      const on = i < this.wonCount && s.shown;
      const pop = on ? 1 + 0.35 * Math.max(0, 1 - (this.stateTime - 0.5 - i * 0.35) * 4) : 1;
      star(ctx, W / 2 + (i - 1) * 90, 305, 34 * pop, on ? '#ffd23f' : '#e5e5e5', on ? '#f4a300' : '#c9c9c9');
    }
    const msg = this.bumps === 0 ? 'Perfekt! Ingen biler behøvede at dytte!' : this.bumps <= 2 ? 'Flot klaret – næsten uden dyt!' : 'Du kom hjem! Prøv igen med færre dyt.';
    text(ctx, msg, W / 2, 370, 22, '#33415c', 'center', null);
    text(ctx, `Majs: ${this.cornGot}/3   ·   Hov: ${this.bumps}   ·   +${this.levelPoints} point`, W / 2, 410, 22, '#2d6a4f', 'center', null);
    if (this.newHi) text(ctx, '✨ Ny rekord! ✨', W / 2, 445, 22, '#e63946', 'center', null);
    const last = this.levelIndex + 1 >= LEVELS.length;
    text(ctx, last ? 'MELLEMRUM: se finalen!' : 'MELLEMRUM: næste bane', W / 2, 485, 26, '#ff8c1a', 'center', null);
    text(ctx, 'R: prøv banen igen', W / 2, 518, 18, '#6c757d', 'center', null);
    ctx.globalAlpha = 1;
  },

  drawTitle() {
    ctx.fillStyle = 'rgba(10,30,20,0.55)';
    ctx.fillRect(0, TOP, W, H - TOP);
    const bob = Math.sin(this.t * 3) * 6;
    drawDuckling(ctx, 175, 160 + bob, 2.6, 1, { blink: (this.t % 3) < 0.12 });
    drawDuckling(ctx, 790, 175 - bob, 2.2, -1, { body: '#fffdf5', dark: '#e9e3d3', scarf: '#4361ee' });
    text(ctx, 'Over Vejen', W / 2, 130, 82, '#ffe066', 'center', '#183024');
    text(ctx, 'Hjælp ællingen hjem til mor and!', W / 2, 205, 28, '#fff');

    const items = [['🐣 Let', 'med kig-hjælp'], ['🦆 Normal', 'lidt hurtigere']];
    items.forEach(([a, b], i) => {
      const x = W / 2 + (i === 0 ? -250 : 10), y = 290;
      const sel = this.mode === i;
      ctx.fillStyle = sel ? '#ffe066' : 'rgba(255,255,255,0.18)';
      rr(ctx, x, y, 240, 82, 20); ctx.fill();
      if (sel) { ctx.strokeStyle = '#ff8c1a'; ctx.lineWidth = 4; ctx.stroke(); }
      text(ctx, a, x + 120, y + 30, 30, sel ? '#183024' : '#fff', 'center', null);
      text(ctx, b, x + 120, y + 62, 18, sel ? '#33415c' : '#ddd', 'center', null);
    });

    const def = LEVELS[this.startLevel];
    text(ctx, `◀  Bane ${this.startLevel + 1}: ${def.name}  ▶`, W / 2, 420, 28, '#fff');
    for (let i = 0; i < 3; i++) {
      const on = i < (this.stars[this.startLevel] || 0);
      star(ctx, W / 2 + (i - 1) * 34, 460, 13, on ? '#ffd23f' : 'rgba(255,255,255,0.25)');
    }
    if (Math.floor(this.t * 2) % 2 === 0) text(ctx, 'Tryk MELLEMRUM for at starte', W / 2, 520, 32, '#ffe066');
    text(ctx, '↑ ↓ sværhed   ·   ← → bane   ·   PILETASTER hop   ·   H kig-hjælp   ·   P pause', W / 2, 580, 18, '#ddd');
    text(ctx, '👀 Kig til venstre, til højre – og til venstre igen!', W / 2, 625, 22, '#b9fbc0');
    if (this.hi) text(ctx, `Rekord: ${this.hi}`, W - 20, 32, 22, '#fff', 'right');
  },

  drawFinale() {
    ctx.fillStyle = 'rgba(10,30,20,0.6)';
    ctx.fillRect(0, 0, W, H);
    FX.draw(ctx);
    const bob = Math.sin(this.t * 4) * 8;
    drawDuckling(ctx, W / 2 - 60, 250 + bob, 2.4, 1, { open: Math.sin(this.t * 10) > 0 });
    drawDuckling(ctx, W / 2 + 80, 240 - bob, 2.8, -1, { body: '#fffdf5', dark: '#e9e3d3', scarf: '#4361ee' });
    text(ctx, 'Hurra! Du er en trafik-helt!', W / 2, 110, 52, '#ffe066');
    const total = this.stars.reduce((s, n) => s + (n || 0), 0);
    text(ctx, `Alle ${LEVELS.length} veje klaret  ·  ${total} af ${LEVELS.length * 3} stjerner`, W / 2, 380, 28, '#fff');
    text(ctx, `Point: ${this.score}`, W / 2, 430, 32, '#fff');
    if (this.newHi) text(ctx, '✨ Ny rekord! ✨', W / 2, 475, 26, '#ffafcc');
    if (this.stateTime > 2) text(ctx, 'MELLEMRUM: til menuen', W / 2, 560, 26, '#b9fbc0');
  },
};

Game.init();
