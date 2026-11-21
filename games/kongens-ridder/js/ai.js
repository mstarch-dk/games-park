// De tre herrers træk: de køber, bygger og angriber svage naboer – også hinanden.
const AI = {
  queue: [], onDone: null,

  run(onDone) {
    this.onDone = onDone;
    this.queue = LORDS.map((l) => l.id).filter((id) => fac(id).alive);
    this.next();
  },

  next() {
    if (G.over) { this.onDone(); return; }
    const id = this.queue.shift();
    if (!id) { this.neutralsGrow(); this.onDone(); return; }
    this.turn(id);
  },

  // Hvor svært er det at tage et område? (gæt ud fra forsvar og mur)
  defence(rid, catapults) {
    const info = War.gatherDefence(rid);
    const r = G.regions[rid];
    const wall = r.castle ? (catapults ? Math.max(0.1, 1 - 0.4 * catapults) : 1) : 0;
    return Economy.armyPower(info.units) * War.leadMul(r.owner) * (1 + 0.55 * r.castle * wall) * (1 + 0.2 * r.castle * wall) + 0.5;
  },

  spend(f) {
    const a = f.army;
    const targets = this.targets(f);
    const needCat = !a.c && targets.some((t) => G.regions[t].castle > 0);
    if (needCat && f.gold >= 14) Economy.buy(f.id, 'cat');
    // Lidt opbygning når der er overskud
    const home = G.regions[f.home];
    if (home && home.owner === f.id) {
      if (f.gold > 45 && home.castle < 3 && Math.random() < 0.4) Economy.buy(f.id, 'castle', f.home);
      const rich = regionsOf(f.id).find((rid) => G.regions[rid].farm < MAX_FARM);
      if (f.gold > 35 && rich && Math.random() < 0.5) Economy.buy(f.id, 'farm', rich);
    }
    let guard = 40;
    while (f.gold >= 6 && guard-- > 0) {
      if (Math.random() < 0.45 && Economy.buy(f.id, 'knight')) continue;
      if (!Economy.buy(f.id, 'foot')) Economy.buy(f.id, 'knight');
    }
  },

  targets(f) {
    const at = f.army.at;
    if (!MapData.regions[at]) return [];
    return MapData.regions[at].nb.filter((n) => G.regions[n].owner !== f.id);
  },

  turn(id) {
    const f = fac(id);
    f.gold += Economy.income(id);
    if (Economy.armyEmpty(f.army) && G.regions[f.home].owner === id) f.army.at = f.home;
    if (G.regions[f.army.at].owner !== id) f.army.at = regionsOf(id)[0] || f.army.at;
    this.spend(f);

    // Sørg for en vagt i hjemborgen
    const home = G.regions[f.home];
    if (f.army.at === f.home && home.gar.f < 4 && f.army.f > 8) { f.army.f -= 4; home.gar.f += 4; }

    const power = Economy.armyPower(f.army) * War.leadMul(id);
    const aggression = 1.35 - Math.min(0.35, G.turn * 0.01); // bliver dristigere med tiden
    let best = null, bestScore = 0;
    this.targets(f).forEach((rid) => {
      const d = this.defence(rid, f.army.c);
      const r = G.regions[rid];
      if (r.owner === 'player' && G.turn < 3) return; // de første sæsoner lader herrerne dig være
      let score = power / (d * aggression);
      if (r.owner === 'player') score *= 1.15 + G.turn * 0.01;
      if (r.owner && fac(r.owner).home === rid) score *= 0.9;
      score *= 1 + Economy.regionIncome(rid) * 0.04;
      if (score > bestScore) { bestScore = score; best = rid; }
    });

    if (best && bestScore > 1) {
      this.attack(id, best);
      return;
    }
    // Intet at angribe lige her: ryk mod grænsen
    this.advance(f);
    this.next();
  },

  advance(f) {
    const at = f.army.at;
    const own = MapData.regions[at].nb.filter((n) => G.regions[n].owner === f.id);
    const borders = own.filter((n) => MapData.regions[n].nb.some((m) => G.regions[m].owner !== f.id));
    if (borders.length && Math.random() < 0.7) f.army.at = pick(borders);
  },

  attack(id, rid) {
    const f = fac(id), r = G.regions[rid];
    const victim = r.owner;
    let wall = 1;
    if (r.castle) wall = f.army.c ? clamp(1 - 0.35 * f.army.c - Math.random() * 0.3, 0, 1) : 1;
    const name = MapData.regions[rid].name;
    const p = fac('player');
    // Står spillerens hær i området, kæmper spilleren selv
    if (victim === 'player' && p.army.at === rid && !Economy.armyEmpty(p.army)) {
      const b = War.newBattle(id, rid, wall);
      Game.showMessage(`${f.name} angriber ${name}!`, 'Din hær står klar. Forsvar landet!', () => {
        Game.go('battle', b, () => {
          G.log.push(b.def.f + b.def.k > 0 ? `Du forsvarede ${name} mod ${f.short}.` : `${f.short} tog ${name} fra dig.`);
          Game.go('map');
          this.next();
        });
      }, f.arms);
      return;
    }
    const { result } = War.auto(id, rid, wall);
    const vName = victim ? (victim === 'player' ? 'dig' : fac(victim).short) : 'lenets folk';
    if (result === 'atk') G.log.push(`${f.short} erobrede ${name} fra ${vName}.`);
    else if (victim === 'player') G.log.push(`${f.short} angreb ${name}, men din garnison holdt stand!`);
    else if (Math.random() < 0.5) G.log.push(`${f.short} angreb ${name} forgæves.`);
    this.next();
  },

  neutralsGrow() {
    MapData.order.forEach((rid) => {
      const r = G.regions[rid];
      if (!r.owner && G.turn % 3 === 2 && r.gar.f < 12) r.gar.f += 1;
    });
  },
};
