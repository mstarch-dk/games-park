// Selve spillet: tilstande, skibe der kommer og går, penge, rang og game loop.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const SAVE_KEY = 'havoernen-save';
const ZOOM = 1.25; // hvor tæt kameraet er på skibene

const RANKS = [
  { name: 'Skibsdreng', at: 0 }, { name: 'Matros', at: 250 }, { name: 'Bådsmand', at: 700 },
  { name: 'Styrmand', at: 1500 }, { name: 'Kaptajn', at: 2800 }, { name: 'Kommandør', at: 4500 },
  { name: 'Admiral', at: 7000 },
];

const Game = {
  state: 'title',
  stateTime: 0,
  t: 0,
  player: null,
  ships: [],
  balls: [],
  cam: { x: 0, y: 0, w: 1280 / ZOOM, h: 720 / ZOOM },
  money: 0, earned: 0, cargo: [],
  upg: { guns: 0, hull: 0, sails: 0, powder: 0, reload: 0 },
  rankIdx: 0,
  toasts: [],
  prompt: '',
  showAim: true,
  bigMap: false,
  inHarbor: false,
  aiAim: 1.4,
  banner: null,
  menuSel: 0,
  spawnT: 0,
  boardT: 0,
  boardTarget: null,
  hasSave: false,

  get cargoValue() { return this.cargo.reduce((a, c) => a + c.value, 0); },
  get rank() { return RANKS[this.rankIdx]; },
  get nextRank() { return RANKS[this.rankIdx + 1] || null; },

  init() {
    Input.init();
    Sea.init();
    Wind.init();
    this.hasSave = !!this.readSave();
    this.startTitle();
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      this.update(dt);
      this.draw();
      Input.endFrame();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  setState(s) { this.state = s; this.stateTime = 0; },

  // ---------- Gem og hent ----------
  readSave() {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && typeof s.money === 'number' ? s : null; } catch (e) { return null; }
  },
  save() {
    if (!this.player) return;
    const s = { money: this.money, earned: this.earned, cargo: this.cargo, upg: this.upg, rankIdx: this.rankIdx,
      hp: this.player.hp, harbor: (Sea.nearestHarbor(this.player) || {}).id };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); this.hasSave = true; } catch (e) { /* ingen lagring */ }
  },

  // ---------- Opsætning ----------
  startTitle() {
    this.player = null;
    this.ships = []; this.balls = []; Fx.list = [];
    this.rankIdx = 0;
    for (let i = 0; i < 6; i++) this.spawnTrader(Math.random() < 0.7 ? 'merchant' : 'dkmerchant', true);
    this.spawnPirate(true);
    this.menuSel = 0;
    this.setState('title');
  },

  newGame(fromSave) {
    const s = fromSave ? this.readSave() : null;
    this.money = s ? s.money : 0;
    this.earned = s ? s.earned : 0;
    this.cargo = s && Array.isArray(s.cargo) ? s.cargo : [];
    this.upg = Object.assign({ guns: 0, hull: 0, sails: 0, powder: 0, reload: 0 }, s ? s.upg : {});
    this.rankIdx = s ? clamp(s.rankIdx | 0, 0, RANKS.length - 1) : 0;
    const h = (s && Sea.harbors.find((x) => x.id === s.harbor)) || Sea.harbors.find((x) => x.id === 'kbh');
    this.ships = []; this.balls = []; Fx.list = []; this.toasts = [];
    Wind.init();
    const n = Sea.nodes[h.node];
    this.player = new Ship('player', h.x, h.y, Math.atan2(n.y - h.y, n.x - h.x));
    this.applyUpgrades();
    this.player.hp = s && s.hp > 0 ? Math.min(this.player.maxHp, s.hp) : this.player.maxHp;
    this.player.sail = 1;
    this.ships.push(this.player);
    this.aiAim = Math.max(0.6, 1.4 - this.rankIdx * 0.12);
    this.centerCamera(true);
    for (let i = 0; i < 6; i++) this.spawnTrader('merchant', true);
    for (let i = 0; i < 3; i++) this.spawnTrader('dkmerchant', true);
    this.spawnPirate(true);
    this.inHarbor = false;
    this.bigMap = false;
    this.setState('playing');
    if (!s) {
      this.toast('Velkommen om bord på Havørnen, kaptajn!', '#ffe066', 4);
      this.later(3.5, () => this.toast('← → styrer skibet · ↑ ↓ sætter og tager sejl ned', '#fff', 5));
      this.later(8, () => this.toast('Find et skib med GRØNT flag – du har kaperbrev på dem!', '#8ce99a', 5));
      this.later(13, () => this.toast('A skyder til venstre, D til højre · W S hæver og sænker kanonerne', '#fff', 6));
      this.later(19, () => this.toast('Den stiplede bue viser hvor kuglerne lander', '#a5d8ff', 5));
    } else {
      this.toast(`Velkommen tilbage, ${this.rank.name}!`, '#ffe066', 3);
    }
  },

  timers: [],
  later(sec, fn) { this.timers.push({ t: sec, fn }); },

  applyUpgrades() {
    const P = this.player, u = this.upg;
    const oldMax = P.maxHp;
    P.guns = 3 + u.guns;
    P.maxHp = SHIP_TYPES.player.hp + 8 * u.hull;
    P.hp = Math.min(P.maxHp, P.hp + Math.max(0, P.maxHp - oldMax));
    P.maxSpeed = SHIP_TYPES.player.speed * (1 + 0.08 * u.sails);
    P.gunPower = 1 + 0.08 * u.powder;
    P.reloadTime = SHIP_TYPES.player.reload * (1 - 0.13 * u.reload);
  },

  // Et handelsskib sejler fra én havn til en anden
  spawnTrader(type, midway = false) {
    const P = this.player;
    const far = this.player ? Sea.harbors.filter((h) => dist(h, P) > 900) : Sea.harbors;
    const A = pick(far.length ? far : Sea.harbors);
    let B = pick(Sea.harbors);
    while (B === A) B = pick(Sea.harbors);
    const path = Sea.route(A.node, B.node).concat([{ x: B.x, y: B.y }]);
    let start = { x: A.x, y: A.y }, i = 0;
    if (midway && path.length > 2) {
      i = randInt(1, path.length - 2);
      start = path[i - 1];
      if (P && dist(start, P) < 700) { start = { x: A.x, y: A.y }; i = 0; }
    }
    const next = path[i];
    const s = new Ship(type, start.x, start.y, Math.atan2(next.y - start.y, next.x - start.x));
    s.ai = { path, i };
    s.speed = 30;
    if (type === 'merchant' && this.rankIdx >= 2 && Math.random() < 0.4) s.guns = 2;
    this.ships.push(s);
    return s;
  },

  spawnPirate(anywhere = false, type = 'pirate') {
    const P = this.player;
    const keys = Object.keys(Sea.nodes).filter((k) => !P || dist(Sea.nodes[k], P) > 1100);
    const k = pick(keys.length ? keys : Object.keys(Sea.nodes));
    const n = Sea.nodes[k];
    const s = new Ship(type, n.x + rand(-30, 30), n.y + rand(-30, 30), rand(0, TAU));
    if (Sea.isLand(s.x, s.y)) { s.x = n.x; s.y = n.y; }
    s.ai = {};
    AI.newRoam(s);
    s.elev = 12;
    this.ships.push(s);
    return s;
  },

  manageSpawns() {
    const count = (t) => this.ships.filter((s) => s.type === t && !s.sinking && !s.prize).length;
    const r = this.rankIdx;
    if (count('merchant') < 6) this.spawnTrader('merchant');
    if (count('dkmerchant') < 3) this.spawnTrader('dkmerchant');
    if (count('pirate') < Math.min(4, 1 + Math.floor(r / 2))) this.spawnPirate();
    if (count('frigate') < (r >= 5 ? 2 : r >= 3 ? 1 : 0)) this.spawnPirate(false, 'frigate');
  },

  // ---------- Hændelser fra skibe og kugler ----------
  toast(text, color = '#fff', dur = 3.5, size = 24) {
    this.toasts.push({ text, color, t: dur, size });
    if (this.toasts.length > 4) this.toasts.shift();
  },

  onScreen(o, m = 0) {
    const c = this.cam;
    return o.x > c.x - m && o.x < c.x + c.w + m && o.y > c.y - m && o.y < c.y + c.h + m;
  },

  onShipHit(ship, by) {
    const P = this.player;
    if (!P || by !== P) return;
    if (ship.type === 'dkmerchant' || ship.prize) {
      if (ship.prize) return;
      const fine = Math.min(this.money, 25);
      this.money -= fine;
      Sound.bad();
      this.toast(`Hov! Det er et DANSK skib (rødt og hvidt flag). Bøde: ${fine} rd`, '#ff8787', 4);
      ship.ai.scaredT = 15;
    } else if (ship.type === 'merchant') {
      ship.ai.scaredT = 25;
    }
  },

  onSurrender(ship) {
    if (ship.prize) return;
    Sound.surrender();
    Fx.text(ship.x, ship.y - 40, '🏳️ Vi overgiver os!', '#fff', 22);
    this.toast(`${ship.name} stryger flaget! Sejl helt hen til det og tryk ENTER for at entre.`, '#ffe066', 5);
  },

  onShipSunk(ship, by) {
    const P = this.player;
    if (ship === P) { this.playerSunk(); return; }
    if (this.onScreen(ship, 100)) Sound.sink();
    if (!P || by !== P || ship.prize) return;
    if (ship.type === 'pirate' || ship.type === 'frigate') {
      const v = ship.type === 'pirate' ? 80 : 250;
      this.cargo.push({ name: `dusør for ${ship.name.toLowerCase()}`, value: v });
      Sound.coins();
      Fx.text(ship.x, ship.y, `Dusør +${v} rd`, '#ffe066', 26);
      this.toast(`Sænket! Dusøren på ${v} rd udbetales i havnen. (Entrer du dem, får du mere!)`, '#ffe066', 4.5);
    } else if (ship.type === 'merchant') {
      this.toast('Skibet sank – og lasten med det. Skyd mindre, så overgiver det sig!', '#ffb4a2', 4.5);
    } else if (ship.type === 'dkmerchant') {
      const fine = Math.min(this.money, 100);
      this.money -= fine;
      Sound.bad();
      this.toast(`Du sænkede et dansk skib! Kongen giver dig en bøde på ${fine} rd.`, '#ff8787', 5);
    }
  },

  playerSunk() {
    Sound.sink();
    this.player.sinking = 0.001;
    this.setState('sunk');
  },

  rescuePlayer() {
    const P = this.player;
    const h = Sea.nearestHarbor(P);
    const lost = this.cargoValue;
    this.cargo = [];
    const n = Sea.nodes[h.node];
    const fresh = new Ship('player', h.x, h.y, Math.atan2(n.y - h.y, n.x - h.x));
    this.ships = this.ships.filter((s) => s !== P);
    this.player = fresh;
    this.applyUpgrades();
    fresh.hp = fresh.maxHp * 0.6;
    this.ships.push(fresh);
    this.calmNear(h);
    this.centerCamera(true);
    this.enterHarbor(h);
    Harbor.say(lost > 0 ? `Besætningen blev reddet! Lasten (${fmtMoney(lost)}) gik tabt.` : 'Besætningen blev reddet og skibet bjærget!');
  },

  // Sørøvere tæt på en havn sejler væk, så man kan komme i ro ud igen
  calmNear(p) {
    for (const s of this.ships) {
      if (!s.hostile || s.sinking) continue;
      if (dist(s, p) < 700) {
        const keys = Object.keys(Sea.nodes).filter((k) => dist(Sea.nodes[k], p) > 1100);
        const n = Sea.nodes[pick(keys)];
        s.x = n.x; s.y = n.y; AI.newRoam(s);
      }
    }
  },

  enterHarbor(h) {
    const P = this.player;
    P.speed = 0; P.sail = 0;
    P.x = h.x; P.y = h.y;
    this.inHarbor = true;
    this.balls = [];
    this.setState('harbor');
    Harbor.open(h);
  },

  leaveHarbor() {
    const P = this.player, h = Harbor.harbor;
    const n = Sea.nodes[h.node];
    P.heading = Math.atan2(n.y - h.y, n.x - h.x);
    P.sail = 1;
    this.inHarbor = false;
    this.calmNear(h);
    this.save();
    this.setState('playing');
    this.toast(`God vind, ${this.rank.name}!`, '#a5d8ff', 2.5);
  },

  startBoarding(target) {
    this.boardTarget = target;
    this.boardT = 0;
    this.player.speed = 0;
    Sound.board();
    this.setState('boarding');
  },

  finishBoarding() {
    const s = this.boardTarget;
    const T = s.T;
    const total = randInt(T.reward[0], T.reward[1]) + (s.type === 'merchant' && s.guns > 1 ? 40 : 0);
    const loot = [];
    const parts = randInt(1, 3);
    let left = total;
    for (let i = 0; i < parts; i++) {
      const v = i === parts - 1 ? left : Math.round(total / parts);
      left -= v;
      loot.push({ name: `${randInt(2, 9)} ${pick(CARGO_NAMES)}`, value: v });
    }
    if (s.type === 'pirate') loot.push({ name: 'dusør for sørøverne', value: 120 });
    if (s.type === 'frigate') loot.push({ name: 'dusør for fregatten', value: 300 });
    this.cargo.push(...loot);
    const sum = loot.reduce((a, c) => a + c.value, 0);
    Sound.coins();
    Fx.text(s.x, s.y - 30, `+${sum} rd i lasten`, '#ffe066', 28);
    this.toast(`Opbragt! I lasten: ${loot.map((l) => l.name).join(', ')}`, '#ffe066', 5, 20);
    this.toast(`Sejl i havn (⚓) og sælg det for ${fmtMoney(this.cargoValue)}`, '#8ce99a', 5);
    // Prisemandskabet sejler skibet i havn under dansk flag
    s.surrendered = false;
    s.prize = true;
    s.flag = 'dk';
    s.guns = 0;
    s.name = 'Opbragt skib';
    const h = Sea.nearestHarbor(s);
    s.ai = { path: Sea.route(Sea.nearestNode(s), h.node).concat([{ x: h.x, y: h.y }]), i: 0 };
    s.sail = 1;
    this.boardTarget = null;
    this.setState('playing');
  },

  checkRank() {
    while (this.nextRank && this.earned >= this.nextRank.at) {
      this.rankIdx++;
      this.aiAim = Math.max(0.6, 1.4 - this.rankIdx * 0.12);
      Sound.rankUp();
      const last = !this.nextRank;
      this.banner = last
        ? { text: 'Du er nu ADMIRAL!', sub: 'Kongen takker dig for at holde de danske farvande fri for sørøvere!', t: 0, dur: 5 }
        : { text: `Ny rang: ${this.rank.name}!`, sub: 'Nu kommer der flere – og farligere – skibe på havet.', t: 0, dur: 3.5 };
    }
  },

  centerCamera(snap) {
    // Uden spiller (titelskærmen) glider kameraet langsomt hen over Kattegat
    const k0 = Sea.nodes.kattegat;
    const target = this.player || { x: k0.x - 150 + Math.sin(this.t * 0.07) * 260, y: k0.y + 250 + Math.cos(this.t * 0.05) * 200, vx: 0, vy: 0 };
    const look = this.player ? 0.9 : 0.3;
    const cx = target.x + target.vx * look - this.cam.w / 2;
    const cy = target.y + target.vy * look - this.cam.h / 2 + (this.player ? 50 : 0);
    const k = snap ? 1 : 0.06;
    this.cam.x = clamp(lerp(this.cam.x, cx, k), 0, MAP.w - this.cam.w);
    this.cam.y = clamp(lerp(this.cam.y, cy, k), 0, MAP.h - this.cam.h);
  },

  // ---------- Opdatering ----------
  update(dt) {
    this.t += dt;
    this.stateTime += dt;
    if (Input.hit('KeyM')) { Sound.muted = !Sound.muted; this.toast(Sound.muted ? 'Lyd fra' : 'Lyd til', '#fff', 1.2); }

    switch (this.state) {
      case 'title': this.updateTitle(dt); return;
      case 'howto':
        this.updateWorld(dt);
        if (Input.confirm() || Input.hit('Escape')) { Sound.select(); this.setState('title'); }
        return;
      case 'harbor':
        Harbor.update(dt);
        this.updateToasts(dt);
        return;
      case 'paused':
        if (Input.hit('KeyP', 'Escape') || Input.confirm()) this.setState('playing');
        if (Input.hit('KeyQ')) { this.save(); this.startTitle(); }
        return;
      case 'map':
        if (Input.hit('KeyK', 'Escape', 'Tab') || Input.confirm()) this.setState('playing');
        return;
      case 'boarding':
        this.boardT += dt;
        if (this.boardT > 2.6) this.finishBoarding();
        this.updateToasts(dt);
        return;
      case 'sunk':
        this.updateWorld(dt);
        if (this.stateTime > 3.5) this.rescuePlayer();
        return;
      case 'playing':
        this.updatePlaying(dt);
        return;
    }
  },

  updateTitle(dt) {
    this.updateWorld(dt);
    if (this.ships.length < 7 && Math.random() < dt) this.spawnTrader(Math.random() < 0.7 ? 'merchant' : 'dkmerchant', true);
    const items = this.titleItems();
    if (Input.menuUp()) { this.menuSel = (this.menuSel + items.length - 1) % items.length; Sound.tick(); }
    if (Input.menuDown()) { this.menuSel = (this.menuSel + 1) % items.length; Sound.tick(); }
    if (Input.confirm()) {
      Sound.select();
      const it = items[this.menuSel];
      if (it.id === 'new') this.newGame(false);
      else if (it.id === 'cont') this.newGame(true);
      else this.setState('howto');
    }
  },

  titleItems() {
    const items = [];
    if (this.hasSave) items.push({ id: 'cont', label: 'Fortsæt sejladsen' });
    items.push({ id: 'new', label: 'Nyt spil' });
    items.push({ id: 'howto', label: 'Sådan spiller du' });
    return items;
  },

  updateToasts(dt) {
    for (const m of this.toasts) m.t -= dt;
    this.toasts = this.toasts.filter((m) => m.t > 0);
  },

  updatePlaying(dt) {
    const P = this.player;
    if (Input.hit('KeyP')) { this.setState('paused'); return; }
    if (Input.hit('Escape')) { this.save(); this.startTitle(); return; }
    if (Input.hit('KeyK', 'Tab')) { this.setState('map'); return; }
    if (Input.hit('KeyH')) { this.showAim = !this.showAim; this.toast(this.showAim ? 'Sigtehjælp til' : 'Sigtehjælp fra', '#fff', 1.5); }

    for (const tm of this.timers) { tm.t -= dt; if (tm.t <= 0) { tm.fn(); tm.done = true; } }
    this.timers = this.timers.filter((tm) => !tm.done);

    const ctrl = {
      turn: (Input.down('ArrowRight') ? 1 : 0) - (Input.down('ArrowLeft') ? 1 : 0),
      sailUp: Input.hit('ArrowUp'),
      sailDown: Input.hit('ArrowDown'),
      elev: (Input.down('KeyW') ? 1 : 0) - (Input.down('KeyS') ? 1 : 0),
      elevStep: (Input.hit('KeyW') ? 1 : 0) - (Input.hit('KeyS') ? 1 : 0),
      fireL: Input.hit('KeyA', 'KeyZ', 'Space'),
      fireR: Input.hit('KeyD', 'KeyX', 'Space'),
    };
    P.update(dt, ctrl);
    this.updateWorld(dt, true);

    // Hvad kan man gøre lige nu?
    this.prompt = '';
    const target = this.ships.find((s) => s.surrendered && !s.sinking && !s.prize && dist(s, P) < 85);
    const near = target ? null : this.ships.find((s) => s.surrendered && !s.sinking && !s.prize && dist(s, P) < 250);
    const h = Sea.harborAt(P, 80);
    if (target) {
      this.prompt = `ENTER: Entr ${target.name.toLowerCase()}!`;
      if (Input.hit('Enter', 'NumpadEnter')) this.startBoarding(target);
    } else if (h) {
      this.prompt = `ENTER: Gå i havn i ${h.name}`;
      if (Input.hit('Enter', 'NumpadEnter')) this.enterHarbor(h);
    } else if (near) {
      this.prompt = 'Sejl tættere på det overgivne skib';
    }

    this.spawnT -= dt;
    if (this.spawnT <= 0) { this.spawnT = 3; this.manageSpawns(); }
  },

  updateWorld(dt, withPlayer = false) {
    Wind.update(dt, () => {
      if (this.state === 'playing') { Sound.windShift(); this.toast('Vinden drejer!', '#a5d8ff', 2.5); }
    });
    for (const s of this.ships) {
      if (s.isPlayer) { if (!withPlayer && s.sinking) s.update(dt, null); continue; }
      s.update(dt, s.sinking ? null : AI.control(s, dt));
    }
    // Skibe skubber blidt til hinanden i stedet for at sejle igennem
    for (let i = 0; i < this.ships.length; i++) {
      for (let j = i + 1; j < this.ships.length; j++) {
        const a = this.ships[i], b = this.ships[j];
        if (a.sinking || b.sinking) continue;
        const d = dist(a, b), min = (a.len + b.len) * 0.32;
        if (d < min && d > 0.01) {
          const push = (min - d) / 2, nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
          if (!Sea.isLand(a.x - nx * push, a.y - ny * push)) { a.x -= nx * push; a.y -= ny * push; }
          if (!Sea.isLand(b.x + nx * push, b.y + ny * push)) { b.x += nx * push; b.y += ny * push; }
        }
      }
    }
    for (const b of this.balls) b.update(dt, this.ships);
    this.balls = this.balls.filter((b) => b.alive);
    this.ships = this.ships.filter((s) => !s.gone || s.isPlayer);
    Fx.update(dt);
    this.updateToasts(dt);
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    this.centerCamera(false);
  },

  // ---------- Tegning ----------
  draw() {
    ctx.save();
    ctx.scale(ZOOM, ZOOM);
    ctx.translate(-Math.round(this.cam.x * ZOOM) / ZOOM, -Math.round(this.cam.y * ZOOM) / ZOOM);
    Sea.drawWorld(ctx, this.cam, this.t, Wind);
    Fx.drawBelow(ctx);
    if (this.player && this.showAim && (this.state === 'playing' || this.state === 'map')) this.drawAim(ctx, this.player);
    for (const s of this.ships) if (this.onScreen(s, 60)) s.draw(ctx, this.t);
    for (const b of this.balls) b.draw(ctx);
    Fx.drawAbove(ctx);
    if (this.player) this.drawShipLabels(ctx);
    ctx.restore();

    switch (this.state) {
      case 'title': this.drawTitle(); break;
      case 'howto': this.drawHowto(); break;
      case 'playing': HUD.draw(ctx, this); break;
      case 'harbor': Harbor.draw(ctx); break;
      case 'map': HUD.bigMap(ctx, this); break;
      case 'paused':
        HUD.draw(ctx, this);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, 1280, 720);
        outlineText(ctx, 'PAUSE', 640, 300, 72, '#ffe066');
        outlineText(ctx, 'P eller ENTER: sejl videre  ·  Q: gem og gå til menuen', 640, 380, 24, '#fff');
        break;
      case 'boarding': HUD.draw(ctx, this); this.drawBoarding(); break;
      case 'sunk':
        ctx.fillStyle = `rgba(0,10,30,${Math.min(0.6, this.stateTime / 3)})`; ctx.fillRect(0, 0, 1280, 720);
        outlineText(ctx, 'Havørnen er skudt i sænk!', 640, 300, 52, '#ff8787');
        outlineText(ctx, 'Bare rolig – besætningen bliver reddet og skibet slæbt i havn.', 640, 370, 24, '#fff');
        break;
    }
    if (this.banner) {
      const b = this.banner, a = Math.min(1, b.t * 3, (b.dur - b.t) * 2);
      ctx.globalAlpha = Math.max(0, a);
      outlineText(ctx, b.text, 640, 220, 56, '#ffe066');
      outlineText(ctx, b.sub, 640, 275, 22, '#fff');
      ctx.globalAlpha = 1;
    }
  },

  drawAim(ctx, P) {
    for (const side of [-1, 1]) {
      const pts = predictShot(P, side);
      const ready = P.reload[side] <= 0;
      const col = side < 0 ? '255,159,28' : '76,201,240';
      ctx.globalAlpha = ready ? 0.9 : 0.35;
      // skyggen på vandet
      ctx.strokeStyle = `rgba(${col},0.5)`;
      ctx.setLineDash([4, 8]); ctx.lineWidth = 2;
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      // selve buen (løftet op efter højden)
      ctx.strokeStyle = `rgba(${col},1)`;
      ctx.setLineDash([8, 7]); ctx.lineWidth = 3;
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x - p.z * 0.135, p.y - p.z * 0.45) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      ctx.setLineDash([]);
      const e = pts[pts.length - 1];
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(e.x - 9, e.y - 9); ctx.lineTo(e.x + 9, e.y + 9); ctx.moveTo(e.x + 9, e.y - 9); ctx.lineTo(e.x - 9, e.y + 9); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  },

  drawShipLabels(ctx) {
    const P = this.player;
    for (const s of this.ships) {
      if (s.isPlayer || s.sinking || dist(s, P) > 520 || !this.onScreen(s, 0)) continue;
      const y = s.y - s.len * 0.55 - 22;
      let label = s.name, color = '#fff';
      if (s.surrendered) { label = '🏳️ Overgivet – entr den!'; color = '#ffe066'; }
      else if (s.prize) { label = 'Opbragt – sejles i havn'; color = '#c3f0ca'; }
      else if (s.type === 'dkmerchant') color = '#ffc9c9';
      else if (s.type === 'merchant') color = '#8ce99a';
      else color = '#ff8787';
      outlineText(ctx, label, s.x, y, 15, color);
      if (!s.prize) HUD.bar(ctx, s.x - 26, y + 10, 52, 7, s.hp / s.maxHp, s.surrendered ? '#ffe066' : '#ef476f');
    }
  },

  drawBoarding() {
    const a = Math.min(1, this.boardT * 3);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, 1280, 720);
    outlineText(ctx, '⚔️  TIL ENTRING!  ⚔️', 640, 300, 60, '#ffe066');
    const clash = Math.floor(this.boardT * 6) % 2;
    outlineText(ctx, clash ? 'Klang! Klong!' : 'Overgiv jer!', 640, 370, 30, '#fff');
    HUD.bar(ctx, 440, 410, 400, 18, this.boardT / 2.6, '#06d6a0');
    ctx.globalAlpha = 1;
  },

  drawTitle() {
    ctx.fillStyle = 'rgba(5,20,45,0.45)'; ctx.fillRect(0, 0, 1280, 720);
    const bob = Math.sin(this.t * 1.5) * 6;
    outlineText(ctx, '⛵ Havørnen', 640, 150 + bob, 96, '#ffe066');
    outlineText(ctx, 'Kaperfart i de danske farvande', 640, 230, 32, '#fff');
    outlineText(ctx, 'Opbring fremmede handelsskibe, jag sørøverne – og tjen en formue!', 640, 275, 22, '#cfe8ff');
    const items = this.titleItems();
    items.forEach((it, i) => {
      const sel = i === this.menuSel;
      const y = 360 + i * 64;
      roundRect(ctx, 440, y - 26, 400, 52, 16);
      ctx.fillStyle = sel ? '#ffd166' : 'rgba(10,25,50,0.7)'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = sel ? '#8a5a33' : 'rgba(255,255,255,0.3)'; ctx.stroke();
      outlineText(ctx, (sel ? '▶ ' : '') + it.label, 640, y, 28, sel ? '#fff' : '#cfe8ff');
    });
    outlineText(ctx, '↑ ↓ vælg  ·  ENTER eller MELLEMRUM start  ·  M lyd', 640, 640, 20, '#cfe8ff');
  },

  drawHowto() {
    ctx.fillStyle = 'rgba(5,20,45,0.82)'; ctx.fillRect(0, 0, 1280, 720);
    outlineText(ctx, 'Sådan spiller du', 640, 55, 44, '#ffe066');
    const left = [
      ['← →', 'drej skibet'],
      ['↑ ↓', 'sæt flere sejl / tag sejl ned'],
      ['W S', 'hæv / sænk kanonerne'],
      ['A', 'skyd til venstre (bagbord)'],
      ['D', 'skyd til højre (styrbord)'],
      ['MELLEMRUM', 'skyd til begge sider'],
      ['ENTER', 'entr et skib / gå i havn'],
      ['K', 'stort kort'],
      ['H', 'sigtehjælp til/fra'],
      ['P · M · ESC', 'pause · lyd · menu'],
    ];
    left.forEach(([k, t], i) => {
      outlineText(ctx, k, 250, 120 + i * 40, 22, '#ffd166', 'right');
      outlineText(ctx, t, 270, 120 + i * 40, 20, '#fff', 'left', 'normal');
    });
    const right = [
      ['💨 Vinden', 'Du kan ikke sejle lige op mod vinden (rødt felt).', 'Hurtigst med vinden ind fra siden (grønt felt).'],
      ['🎯 Kanonerne', 'Jo højere kanonerne peger, jo længere skud.', 'Vinden skubber kuglen, og skibet krænger!'],
      ['🏳️ Opbring', 'Skyd til skibet hejser hvidt flag.', 'Sejl helt hen til det og tryk ENTER.'],
      ['⚓ Havnen', 'Sælg lasten, reparer skibet,', 'og køb flere kanoner og større sejl.'],
    ];
    right.forEach(([h, a, b], i) => {
      const y = 110 + i * 76;
      outlineText(ctx, h, 620, y, 22, '#a5d8ff', 'left');
      outlineText(ctx, a, 620, y + 25, 16, '#fff', 'left', 'normal');
      outlineText(ctx, b, 620, y + 46, 16, '#fff', 'left', 'normal');
    });
    // flagene
    const flags = [['green', 'Grønt flag: må opbringes'], ['pirate', 'Sørøvere: dusør!'], ['dk', 'Dansk: lad dem sejle']];
    flags.forEach(([f, t], i) => {
      const x = 640 + i * 200, y = 445;
      drawFlag(ctx, f, x, y, 54, 36, Math.sin(this.t * 5 + i) * 4);
      outlineText(ctx, t, x + 27, y + 58, 14, '#fff');
    });
    outlineText(ctx, 'Tjen penge og stig i rang – fra skibsdreng til admiral!', 640, 590, 24, '#ffe066');
    outlineText(ctx, 'ENTER: tilbage', 640, 650, 20, '#cfe8ff');
  },
};

Game.init();
