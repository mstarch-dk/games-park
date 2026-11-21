// Spillets styring: scener, sæsonernes gang og game loop.
const Game = {
  name: '', scene: null, paused: false, debug: /debug=1/.test(location.search), t: 0,

  scenes() {
    return { title: TitleScreen, heroes: HeroSelect, help: HelpScreen, intro: IntroScreen, map: MapScreen, battle: BattleScene,
      siege: Siege, joust: Joust, fencing: Fencing, cutscene: Cutscene, victory: VictoryScreen, defeat: DefeatScreen };
  },

  init() {
    const canvas = document.getElementById('game');
    this.ctx = canvas.getContext('2d');
    Input.init(canvas);
    Art.init();
    MapData.init();
    this.go('title');
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  go(name, ...args) {
    UI.close();
    UI.fresh = true; // tasten der skiftede scene må ikke også trykke en knap i den nye
    this.name = name;
    this.scene = this.scenes()[name];
    if (name !== 'map') Sound.stopMusic();
    this.scene.enter(...args);
  },

  // ---------- Beskeder ----------
  dialog(d) { UI.open(d); },

  showMessage(title, text, cb, arms) {
    UI.open({ title, lines: [text], arms, buttons: [{ label: 'Videre', onClick: cb }], back: 0 });
  },

  messages(list, done) {
    const next = (i) => {
      if (i >= list.length) { if (this.name === 'cutscene') this.go('map'); if (done) done(); return; }
      const m = list[i];
      if (m.scene) this.go('cutscene', m);
      else if (this.name === 'cutscene') this.go('map');
      const buttons = (m.buttons || [{ label: 'Videre' }]).map((b) => ({ ...b, onClick: () => { if (b.onClick) b.onClick(); next(i + 1); } }));
      UI.open({ title: m.title, lines: m.text.split('\n'), arms: m.arms, buttons, back: buttons.length - 1 });
    };
    next(0);
  },

  // ---------- Spillets gang ----------
  newGame(i) {
    newGame(i);
    G.marched = false;
    this.go('intro');
  },

  continueGame() {
    const g = Save.read();
    if (!g) return;
    G = g;
    this.go('map');
    MapScreen.sel = fac('player').army.at;
  },

  startTurn() {
    G.marched = false;
    const p = fac('player');
    p.gold += Economy.income('player');
    if (Economy.armyEmpty(p.army) && G.regions[p.home].owner === 'player') p.army.at = p.home;
    const ev = Events.startOfTurn();
    if (this.checkEnd()) return;
    const msgs = [];
    if (G.log.length) msgs.push({ title: `Nyt fra riget – ${seasonName(G.turn)}`, text: G.log.slice(-8).join('\n') });
    G.log = [];
    Save.write();
    this.go('map');
    MapScreen.sel = p.army.at;
    this.messages(msgs.concat(ev), () => this.checkEnd());
  },

  endTurn() {
    if (this.checkEnd()) return;
    if (this.name !== 'map') this.go('map');
    UI.toast('Herrerne trækker…');
    AI.run(() => {
      if (this.checkEnd()) return;
      G.turn++;
      this.startTurn();
    });
  },

  checkEnd() {
    if (!G) return false;
    if (!G.over && !regionsOf('player').length) G.over = 'nothing';
    if (G.over) { this.go('defeat'); return true; }
    if (regionsOf('player').length === MapData.order.length) { this.go('victory'); return true; }
    return false;
  },

  // Spilleren angriber et naboområde – med belejring først, hvis der er en borg
  conquer(rid) {
    const p = fac('player'), r = G.regions[rid];
    if (!MapScreen.canAttack(rid)) { Sound.deny(); return; }
    const battle = (wall, killed) => {
      r.gar.f = Math.max(0, r.gar.f - (killed || 0));
      const b = War.newBattle('player', rid, wall);
      this.go('battle', b, (won) => {
        this.go('map');
        if (won) { MapScreen.sel = rid; UI.toast(`${MapData.regions[rid].name} er erobret!`, GOLD); }
        this.endTurn();
      });
    };
    if (r.castle > 0) {
      if (!p.army.c) {
        this.showMessage('Borgen har mure', `${MapData.regions[rid].name} er beskyttet af ${CASTLE_NAMES[r.castle]}. Du skal have mindst én katapult for at belejre den. Køb en under "Køb og byg".`);
        return;
      }
      this.go('siege', { rid, catapults: p.army.c, onDone: (choice, wall, killed) => {
        if (choice === 'retreat') { this.go('map'); UI.toast('Belejringen er opgivet.'); this.endTurn(); return; }
        battle(wall, killed);
      } });
    } else battle(1, 0);
  },

  debugStart(kind) {
    newGame(0);
    G.marched = false;
    const p = fac('player');
    p.army.c = 2; p.gold = 100;
    if (kind === 'siege') {
      G.regions.slesvig.castle = 2;
      this.go('siege', { rid: 'slesvig', catapults: 2, onDone: () => this.go('title') });
    } else if (kind === 'joust') Events.joust('gunder', 'honour');
    else Events.raid('gunder', true);
  },

  // ---------- Game loop ----------
  frame(dt) {
    this.t += dt;
    if (Input.hit('KeyM')) { const m = Sound.toggleMute(); UI.toast(m ? 'Lyd slået fra' : 'Lyd slået til'); if (!m && this.name === 'map') Sound.startMusic(); }
    if (Input.hit('KeyP') && !['title', 'heroes'].includes(this.name)) this.paused = !this.paused;
    if (!this.paused && (!UI.dialog || this.name === 'cutscene')) this.scene.update(dt);
    const ctx = this.ctx;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 960, 600);
    this.scene.draw(Art.lctx);
    Art.present(ctx);
    UI.beginFrame();
    UI.passive = !!UI.dialog;
    this.scene.drawUI(ctx);
    UI.passive = false;
    if (UI.dialog) { UI.buttons = []; UI.drawDialog(ctx); }
    UI.drawToasts(ctx, dt);
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, 960, 600);
      UI.title(ctx, 'Pause', 480, 280, 60);
      UI.text(ctx, 'Tryk P for at spille videre', 480, 340, 22, PARCH, 'center');
    } else {
      const mode = UI.dialog ? 'v' : this.name === 'map' ? 'keys' : this.name === 'battle' ? 'h' : 'v';
      if (UI.fresh) UI.fresh = false; else UI.handleButtons(mode);
    }
    Input.endFrame();
  },
};

Game.init();
