// Selve spillet: skærme, styring, point og game loop.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const KEY = {
  hi: 'guldtoget-highscore',
  unlocked: 'guldtoget-unlocked',
  stars: 'guldtoget-stars',
  mode: 'guldtoget-mode',
  cam: 'guldtoget-cam',
};
function load(k, d) {
  try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
}
function save(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ingen lagring */ }
}

// Test: index.html?autopilot (eller ?autopilot=late / ?autopilot=stay) og evt. &fast=8
const PARAMS = new URLSearchParams(location.search);
const AUTO = PARAMS.has('autopilot') ? (PARAMS.get('autopilot') || 'dodge') : null;
const FAST = Math.max(1, Math.min(20, parseInt(PARAMS.get('fast') || '1', 10) || 1));

const POINTS = { gold: 50, gem: 250, near: 25, cow: 10 };

const Game = {
  state: 'title',
  stateTime: 0,
  t: 0,
  mode: 0,          // 0 = let (med hjælpe-pil), 1 = normal (hurtigere)
  startLevel: 0,
  levelIndex: 0,
  score: 0,
  shake: 0,
  autoTotals: { levels: 0, threats: 0, dodged: 0, crashes: 0, verifyFail: 0 },

  init() {
    this.hi = load(KEY.hi, 0) || 0;
    this.unlocked = Math.max(1, Math.min(LEVELS.length, load(KEY.unlocked, 1) || 1));
    this.stars = load(KEY.stars, []);
    if (!Array.isArray(this.stars)) this.stars = [];
    this.mode = load(KEY.mode, 0) === 1 ? 1 : 0;
    this.startLevel = this.unlocked - 1;
    Cam.setPreset(load(KEY.cam, 0) === 1 ? 1 : 0, true);
    Input.init(canvas);
    this.titleWorld = this.makeDemo();
    Cam.follow(0, this.titleWorld, true);
    if (AUTO) this.startRun(0);
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

  makeDemo() { return new World(LEVELS[3], { auto: 'dodge', god: true }); },
  setState(s) { this.state = s; this.stateTime = 0; },
  activeWorld() { return this.state === 'title' || this.state === 'finale' ? this.titleWorld : this.world; },

  startRun(i) {
    this.score = 0;
    save(KEY.mode, this.mode);
    this.loadLevel(i);
  },

  loadLevel(i) {
    this.levelIndex = i;
    this.levelStartScore = this.score;
    this.world = new World(LEVELS[i], { hard: this.mode === 1, auto: AUTO, god: !!AUTO });
    this.armShown = 0;
    FX.clear();
    Cam.follow(0, this.world, true);
    this.setState(AUTO ? 'playing' : 'intro');
  },

  // ---------- Opdatering ----------
  update(dt) {
    this.t += dt;
    this.stateTime += dt;
    this.shake = Math.max(0, this.shake - dt);
    if (Input.hit('KeyM')) Sound.muted = !Sound.muted;
    if (Input.hit('KeyV')) {
      Cam.setPreset(Cam.target ? 0 : 1);
      save(KEY.cam, Cam.target);
      Sound.tick();
    }

    switch (this.state) {
      case 'title': this.updateTitle(dt); break;
      case 'intro':
        if (this.stateTime > 0.4 && (Input.confirm() || Input.anyArrow())) { Sound.start(); this.setState('playing'); }
        else if (Input.hit('Escape')) this.setState('title');
        break;
      case 'playing': this.updatePlaying(dt); break;
      case 'paused':
        if (Input.hit('KeyP', 'Space', 'Enter') || Input.taps.length) this.setState('playing');
        else if (Input.hit('Escape')) this.setState('title');
        break;
      case 'won':
        this.tickWorld(dt);
        if (Math.random() < 0.25) FX.burst(Math.random() * W, 120 + Math.random() * 200, 'star', 2, pick(['#ffd23f', '#ffb703', '#fff3b0']));
        this.wonStars.forEach((s, i) => {
          if (!s.shown && this.stateTime > 0.6 + i * 0.35) { s.shown = true; if (i < this.wonCount) Sound.star(i); }
        });
        if (this.stateTime > 1.3 && Input.confirm()) {
          if (this.levelIndex + 1 < LEVELS.length) this.loadLevel(this.levelIndex + 1);
          else { this.setState('finale'); Sound.finale(); }
        } else if (this.stateTime > 0.5 && Input.hit('KeyR')) {
          this.score = this.levelStartScore;
          this.loadLevel(this.levelIndex);
        } else if (Input.hit('Escape')) this.setState('title');
        break;
      case 'out':
        this.tickWorld(dt);
        if (this.stateTime > 1 && Input.confirm()) { this.score = this.levelStartScore; this.loadLevel(this.levelIndex); }
        else if (Input.hit('Escape')) this.setState('title');
        break;
      case 'finale':
        this.demoStep(dt);
        if (Math.random() < 0.3) FX.burst(Math.random() * W, Math.random() * H * 0.6, 'star', 3, pick(['#ffd23f', '#ff6b8b', '#4cc9f0', '#80ed99']));
        FX.update(dt);
        if (this.stateTime > 2 && Input.confirm()) this.setState('title');
        break;
    }
    Input.endFrame();
  },

  // Verdenen står stille, men røg og kamera lever videre.
  tickWorld(dt) {
    Smoke.update(this.world, dt);
    Cam.follow(dt, this.world);
    FX.update(dt);
  },

  demoStep(dt) {
    const w = this.titleWorld;
    w.update(dt);
    w.events.length = 0;
    if (w.arrived) { this.titleWorld = this.makeDemo(); Cam.follow(0, this.titleWorld, true); return; }
    Smoke.update(w, dt);
    Cam.follow(dt, w);
  },

  updateTitle(dt) {
    this.demoStep(dt);
    if (Input.hit('ArrowUp', 'ArrowDown', 'KeyW', 'KeyS')) { this.mode = 1 - this.mode; Sound.tick(); }
    const dx = (Input.hit('ArrowRight', 'KeyD') ? 1 : 0) - (Input.hit('ArrowLeft', 'KeyA') ? 1 : 0);
    if (dx) {
      const n = Math.max(0, Math.min(this.unlocked - 1, this.startLevel + dx));
      if (n !== this.startLevel) { this.startLevel = n; Sound.tick(); }
    }
    for (const tap of Input.taps) {
      if (tap.y > 290 && tap.y < 375 && Math.abs(tap.x - W / 2) < 260) this.mode = tap.x < W / 2 ? 0 : 1;
    }
    if (Input.confirm()) { Sound.start(); this.startRun(this.startLevel); }
  },

  updatePlaying(dt) {
    const w = this.world;
    if (Input.hit('KeyP')) { this.setState('paused'); return; }
    if (Input.hit('Escape')) { this.setState('title'); return; }
    const pl = w.player;
    if (!AUTO) {
      let arm = null;
      if (Input.hit('ArrowLeft', 'KeyA')) arm = -1;
      else if (Input.hit('ArrowRight', 'KeyD')) arm = 1;
      else if (Input.hit('ArrowUp', 'ArrowDown', 'KeyW', 'KeyS')) arm = 0;
      for (const tap of Input.taps) {
        if (tap.x < W / 3) arm = -1;
        else if (tap.x > (W * 2) / 3) arm = 1;
        else w.honk();
      }
      if (arm !== null && arm !== pl.arm) { pl.arm = arm; Sound.arm(); }
      if (Input.hit('Space')) w.honk();
    }

    for (let i = 0; i < FAST; i++) {
      w.update(dt);
      this.handleEvents(w);
      if (w.arrived || w.over) break;
    }
    Smoke.update(w, dt);
    Cam.follow(dt, w);
    FX.update(dt);

    // tøf-tøf i takt med farten
    this.chuffT = (this.chuffT || 0) - dt * w.v / 12;
    if (this.chuffT <= 0) { this.chuffT = 0.32; Sound.chuff(0.8); }

    if (w.arrived) {
      if (AUTO) this.autoNext(w); else this.finishLevel();
    } else if (w.over) {
      Sound.lose();
      this.setState('out');
    }
  },

  // Gør lyde og effekter ud af det, der skete i verdenen.
  handleEvents(w) {
    const at = (x, y, z) => P(x, y, z) || { x: W / 2, y: H / 2, s: 10 };
    const pl = w.player;
    for (const e of w.events) {
      switch (e.type) {
        case 'gold': {
          this.score += POINTS.gold;
          Sound.gold();
          const p = at(e.x, 1, e.z);
          FX.burst(p.x, p.y, 'star', 6, '#ffd23f');
          FX.popup(p.x, p.y - 20, '+' + POINTS.gold, '#ffe066', 22);
          break;
        }
        case 'gem': {
          this.score += POINTS.gem;
          Sound.gem();
          const p = at(e.x, 1, e.z);
          FX.burst(p.x, p.y, 'star', 14, '#8ff0ff');
          FX.popup(p.x, p.y - 24, '💎 +' + POINTS.gem, '#c7f7ff', 28);
          break;
        }
        case 'switch': Sound.clack(); break;
        case 'spawn': Sound.whistle(false); break;
        case 'whistle': Sound.whistle(true); break;
        case 'cow': Sound.moo(); break;
        case 'horn': Sound.horn(); break;
        case 'cowAway': {
          this.score += POINTS.cow;
          Sound.moo();
          const p = at(laneX(e.lane, w.n), 2.5, e.z);
          FX.popup(p.x, p.y - 20, 'Muuh! +' + POINTS.cow, '#ffffff', 22);
          break;
        }
        case 'pass':
          Sound.whoosh();
          if (e.near) {
            this.score += POINTS.near;
            const p = at(w.px(pl.p), 4.5, pl.p - 2);
            FX.popup(p.x, p.y - 10, pick(['Puha!', 'Suuus!', 'Lige akkurat!', 'Godt skiftet!']) + ' +' + POINTS.near, '#b9fbc0', 28);
          }
          break;
        case 'poof': {
          const p = at(laneX(e.lane, w.n), 2, e.z);
          FX.burst(p.x, p.y, 'puff', 16, '#ffffff');
          break;
        }
        case 'crash': {
          Sound.bonk();
          this.shake = 0.4;
          const p = at(w.px(pl.p), 3, pl.p);
          FX.burst(p.x, p.y, 'star', 12, '#ffd23f');
          FX.popup(p.x, p.y - 30, 'BONK!', '#ff6b6b', 40);
          if (e.lost) FX.popup(p.x, p.y + 20, `-${e.lost} sæk${e.lost > 1 ? 'ke' : ''}`, '#ffe066', 22);
          break;
        }
        case 'arrive': Sound.arrive(); break;
      }
    }
    w.events.length = 0;
  },

  autoNext(w) {
    const T = this.autoTotals;
    T.levels++;
    for (const k of ['threats', 'dodged', 'crashes', 'verifyFail']) T[k] += w.stats[k];
    console.log(`Autopilot (${AUTO}) bane ${this.levelIndex + 1}: forhindringer ${w.stats.threats}, undviget ${w.stats.dodged}, bump ${w.stats.crashes}, forkastet ${w.stats.verifyFail}`, JSON.stringify(w.stats.kinds), '· I alt:', JSON.stringify(T));
    this.loadLevel((this.levelIndex + 1) % LEVELS.length);
  },

  finishLevel() {
    const w = this.world;
    const ratio = w.goldTotal ? w.carried / w.goldTotal : 1;
    const n = ratio >= 0.55 ? 3 : ratio >= 0.3 ? 2 : 1;
    this.wonCount = n;
    this.wonStars = [0, 1, 2].map(() => ({ shown: false }));
    this.levelPoints = 200 + n * 100 + (w.crashes === 0 ? 150 : 0);
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
    const w = this.activeWorld();
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * 14 * this.shake, (Math.random() - 0.5) * 14 * this.shake);
    drawScene(ctx, w, this.t, this.state !== 'title' && this.state !== 'finale');
    ctx.restore();
    if (this.state === 'title') { this.drawTitle(); return; }
    if (this.state === 'finale') { this.drawFinale(); return; }
    if (this.state === 'playing' || this.state === 'paused') this.drawHelp(w);
    FX.draw(ctx);
    this.drawHud(w);
    if (this.state === 'intro') this.drawIntro();
    if (this.state === 'paused') this.drawPaused();
    if (this.state === 'won') this.drawWon();
    if (this.state === 'out') this.drawOut();
  },

  // Pil over toget: din valgte retning – og i let-tilstand en blinkende hjælpe-pil.
  drawHelp(w) {
    const pl = w.player;
    const p = P(w.px(pl.p - 3), 5.4, pl.p - 3);
    if (!p) return;
    const hint = this.mode === 0 ? w.hint() : 0;
    const th = w.threat;
    if (hint && Math.floor(this.t * 5) % 2 === 0) {
      this.bigArrow(p.x + hint * 70, p.y - 30, hint, '#ff595e', 1.25);
      text(ctx, th && th.kind === 'cow' ? (hint < 0 ? '← skift – eller DYT!' : 'skift – eller DYT! →') : (hint < 0 ? '← Skift spor!' : 'Skift spor! →'), p.x + hint * 70, p.y - 85, 26, '#fff', 'center', '#7a1020');
    }
    if (pl.arm) this.bigArrow(p.x + pl.arm * 26, p.y + 6, pl.arm, '#ffd23f', 0.7);
  },

  bigArrow(x, y, dir, color, k) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir * k, k);
    ctx.beginPath();
    ctx.moveTo(-34, -12); ctx.lineTo(4, -12); ctx.lineTo(4, -28); ctx.lineTo(36, 0);
    ctx.lineTo(4, 28); ctx.lineTo(4, 12); ctx.lineTo(-34, 12);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 4 / k;
    ctx.strokeStyle = '#3a2410';
    ctx.stroke();
    ctx.restore();
  },

  drawHud(w) {
    const def = w.def;
    ctx.fillStyle = 'rgba(40,24,10,0.55)';
    ctx.fillRect(0, 0, W, 52);
    text(ctx, `Bane ${this.levelIndex + 1}: ${def.name}`, 16, 26, 22, '#ffe066', 'left');
    let hearts = '';
    for (let i = 0; i < 3; i++) hearts += i < w.hearts ? '❤️' : '🤍';
    if (!AUTO) text(ctx, hearts, 400, 26, 22, '#fff', 'left', null);
    drawSackAt(ctx, 528, 40, 15);
    text(ctx, `${w.carried}`, 552, 27, 26, '#fff', 'left');
    if (w.gemTotal || w.gems) text(ctx, `💎 ${w.gems}`, 615, 27, 22, '#c7f7ff', 'left');
    text(ctx, `${this.score}`, W - 16, 27, 28, '#fff', 'right');
    // hvor langt er der til Guldbanken?
    const k = clamp(w.player.p / def.len, 0, 1);
    const x0 = 16, x1 = W - 16, y = 58;
    ctx.fillStyle = 'rgba(40,24,10,0.45)';
    rr(ctx, x0, y - 4, x1 - x0, 8, 4); ctx.fill();
    ctx.fillStyle = '#ffd23f';
    rr(ctx, x0, y - 4, (x1 - x0) * k, 8, 4); ctx.fill();
    text(ctx, '🏦', x1 - 4, y + 2, 18, '#fff', 'center', null);
    text(ctx, '🚂', x0 + (x1 - x0) * k, y, 18, '#fff', 'center', null);
    if (AUTO) {
      const T = this.autoTotals;
      text(ctx, `AUTOPILOT ${AUTO} ×${FAST} · baner ${T.levels} · forhindringer ${T.threats + w.stats.threats} · undviget ${T.dodged + w.stats.dodged} · bump ${T.crashes + w.stats.crashes} · forkastet ${T.verifyFail + w.stats.verifyFail}`, W / 2, H - 20, 16, '#fff');
    }
    if (Sound.muted) text(ctx, '🔇', W - 40, 88, 20, '#fff', 'center', null);
  },

  panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    rr(ctx, x + 6, y + 8, w, h, 26); ctx.fill();
    ctx.fillStyle = '#fff8e7';
    rr(ctx, x, y, w, h, 26); ctx.fill();
    ctx.strokeStyle = '#c8862a'; ctx.lineWidth = 5; ctx.stroke();
  },

  wrap(str, x, y, maxW, size, color) {
    ctx.font = `bold ${size}px "Comic Sans MS", "Trebuchet MS", sans-serif`;
    const words = str.split(' ');
    const lines = [];
    let line = '';
    for (const wd of words) {
      const test = line ? line + ' ' + wd : wd;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = wd; } else line = test;
    }
    lines.push(line);
    lines.forEach((l, i) => text(ctx, l, x, y + (i - (lines.length - 1) / 2) * size * 1.3, size, color, 'center', null));
  },

  drawIntro() {
    const def = LEVELS[this.levelIndex];
    this.panel(150, 200, 660, 290);
    text(ctx, `Bane ${this.levelIndex + 1}  ·  ${def.lanes} spor`, W / 2, 245, 28, '#8a5a1a', 'center', null);
    text(ctx, def.name, W / 2, 297, 46, '#e85d04', 'center', '#fff');
    this.wrap(def.tip, W / 2, 370, 580, 23, '#3a2410');
    text(ctx, 'Tryk en piletast for at køre!', W / 2, 452, 24, '#2a9d8f', 'center', null);
  },

  drawPaused() {
    ctx.fillStyle = 'rgba(30,18,6,0.55)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, 'Pause', W / 2, H / 2 - 30, 64, '#ffe066');
    text(ctx, 'P fortsæt  ·  ESC menu', W / 2, H / 2 + 40, 26);
  },

  drawWon() {
    const w = this.world;
    ctx.globalAlpha = Math.min(1, this.stateTime * 3);
    this.panel(180, 170, 600, 380);
    text(ctx, 'Fremme ved Guldbanken! 🏦', W / 2, 215, 38, '#e85d04', 'center', '#fff');
    for (let i = 0; i < 3; i++) {
      const s = this.wonStars[i];
      const on = i < this.wonCount && s.shown;
      const pop = on ? 1 + 0.35 * Math.max(0, 1 - (this.stateTime - 0.6 - i * 0.35) * 4) : 1;
      star(ctx, W / 2 + (i - 1) * 90, 292, 34 * pop, on ? '#ffd23f' : '#e5e5e5', on ? '#f4a300' : '#c9c9c9');
    }
    const msg = this.wonCount === 3 ? 'Sikke meget guld! Du er en rigtig lokomotivfører!' : this.wonCount === 2 ? 'Flot kørt! Kan du samle endnu flere sække?' : 'Du kom frem! Prøv at samle flere guldsække.';
    text(ctx, msg, W / 2, 358, 21, '#3a2410', 'center', null);
    text(ctx, `Guldsække: ${w.carried} af ${w.goldTotal}${w.gemTotal ? `  ·  Diamanter: ${w.gems}` : ''}  ·  Bump: ${w.crashes}`, W / 2, 396, 21, '#2a9d8f', 'center', null);
    text(ctx, `+${this.levelPoints} point${w.crashes === 0 ? '  (uden bump!)' : ''}`, W / 2, 428, 21, '#2a9d8f', 'center', null);
    if (this.newHi) text(ctx, '✨ Ny rekord! ✨', W / 2, 460, 22, '#e63946', 'center', null);
    const last = this.levelIndex + 1 >= LEVELS.length;
    text(ctx, last ? 'MELLEMRUM: se finalen!' : 'MELLEMRUM: næste bane', W / 2, 497, 26, '#e85d04', 'center', null);
    text(ctx, 'R: kør banen igen (den bliver ny hver gang)', W / 2, 530, 17, '#6c757d', 'center', null);
    ctx.globalAlpha = 1;
  },

  drawOut() {
    ctx.globalAlpha = Math.min(1, this.stateTime * 3);
    this.panel(200, 230, 560, 230);
    text(ctx, 'Av – toget skal lige hvile sig 😅', W / 2, 280, 32, '#e85d04', 'center', '#fff');
    this.wrap('Tre bump er for mange. Se efter pilene på skinnerne, og skift spor, når et tog kommer imod dig.', W / 2, 345, 500, 21, '#3a2410');
    if (this.stateTime > 1) text(ctx, 'MELLEMRUM: prøv igen', W / 2, 420, 26, '#2a9d8f', 'center', null);
    ctx.globalAlpha = 1;
  },

  drawTitle() {
    ctx.fillStyle = 'rgba(30,18,6,0.5)';
    ctx.fillRect(0, 0, W, H);
    const bob = Math.sin(this.t * 3) * 5;
    text(ctx, 'Guldtoget', W / 2, 110 + bob, 88, '#ffd23f', 'center', '#5a3a10');
    text(ctx, 'Skift spor i sidste øjeblik – og kør guldet hjem!', W / 2, 190, 27, '#fff');

    const items = [['🐣 Let', 'med hjælpe-pil'], ['🚂 Normal', 'lidt hurtigere']];
    items.forEach(([a, b], i) => {
      const x = W / 2 + (i === 0 ? -250 : 10), y = 290;
      const sel = this.mode === i;
      ctx.fillStyle = sel ? '#ffd23f' : 'rgba(255,255,255,0.18)';
      rr(ctx, x, y, 240, 82, 20); ctx.fill();
      if (sel) { ctx.strokeStyle = '#e85d04'; ctx.lineWidth = 4; ctx.stroke(); }
      text(ctx, a, x + 120, y + 30, 30, sel ? '#3a2410' : '#fff', 'center', null);
      text(ctx, b, x + 120, y + 62, 18, sel ? '#5a3a10' : '#ddd', 'center', null);
    });

    const def = LEVELS[this.startLevel];
    text(ctx, `◀  Bane ${this.startLevel + 1}: ${def.name}  ▶`, W / 2, 420, 28, '#fff');
    for (let i = 0; i < 3; i++) {
      const on = i < (this.stars[this.startLevel] || 0);
      star(ctx, W / 2 + (i - 1) * 34, 460, 13, on ? '#ffd23f' : 'rgba(255,255,255,0.25)');
    }
    if (Math.floor(this.t * 2) % 2 === 0) text(ctx, 'Tryk MELLEMRUM for at starte', W / 2, 520, 32, '#ffe066');
    text(ctx, '↑ ↓ sværhed  ·  ← → bane  ·  I spillet: ← → skift spor, ↑ ligeud, MELLEMRUM dyt', W / 2, 580, 18, '#eee');
    text(ctx, 'P pause  ·  M lyd  ·  V kamera (' + CAM_PRESETS[Cam.target].name + ')', W / 2, 610, 18, '#eee');
    text(ctx, '🚂 Kommer et tog imod dig? Skift spor ved skiftesporet!', W / 2, 655, 22, '#b9fbc0');
    if (this.hi) text(ctx, `Rekord: ${this.hi}`, W - 20, 30, 22, '#fff', 'right');
  },

  drawFinale() {
    ctx.fillStyle = 'rgba(30,18,6,0.55)';
    ctx.fillRect(0, 0, W, H);
    FX.draw(ctx);
    text(ctx, 'Hurra! Alt guldet er hjemme!', W / 2, 150, 50, '#ffd23f');
    drawSackAt(ctx, W / 2 - 70, 300 + Math.sin(this.t * 4) * 6, 40);
    drawSackAt(ctx, W / 2 + 70, 300 - Math.sin(this.t * 4) * 6, 40);
    const total = this.stars.reduce((s, n) => s + (n || 0), 0);
    text(ctx, `Alle ${LEVELS.length} baner klaret  ·  ${total} af ${LEVELS.length * 3} stjerner`, W / 2, 390, 28, '#fff');
    text(ctx, `Point: ${this.score}`, W / 2, 440, 32, '#fff');
    if (this.newHi) text(ctx, '✨ Ny rekord! ✨', W / 2, 485, 26, '#ffafcc');
    if (this.stateTime > 2) text(ctx, 'MELLEMRUM: til menuen', W / 2, 570, 26, '#b9fbc0');
  },
};

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

Game.init();
