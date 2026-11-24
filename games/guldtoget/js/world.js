// Verdenen for én bane: dit tog, modkørende tog, køer og guld. Ren simulation – ingen tegning.
// opts: { seed, hard, auto: 'dodge' | 'late' | 'stay', god }
class World {
  constructor(def, opts = {}) {
    this.def = def;
    this.n = def.lanes;
    this.opts = opts;
    this.seed = opts.seed || ((Math.random() * 1e9) | 0);
    this.rnd = seeded(this.seed);
    const mul = opts.hard ? 1.12 : 1;
    this.baseV = def.speed * mul;
    this.onV = def.onSpeed * mul;
    const mid = Math.floor(this.n / 2);
    this.player = { p: 0, lane: mid, path: newPath(mid), arm: 0, used: null };
    this.track = new Track(def, this.rnd);
    // Gæt på hvilket spor spilleren kører i, når nye skiftepunkter nås (bruges til dobbelt-skifter).
    this.track.hint = () => {
      const th = this.threat, pl = this.player;
      return th && th.L === pl.lane ? th.L + th.safe : pl.lane;
    };
    this.track.ensure(VIEW + 200);
    this.trains = [];
    this.cows = [];
    this.gold = [];
    this.events = [];
    this.threat = null;
    this.plan = null;
    this.calmEnd = 75;
    this.goldNextZ = 28;
    this.goldTotal = 0;
    this.gemTotal = 0;
    this.carried = 0;
    this.gems = 0;
    this.hearts = 3;
    this.crashes = 0;
    this.recover = 0;
    this.speedK = 1;
    this.arrived = false;
    this.over = false;
    this.t = 0;
    this.apT = 0;
    this.stats = { threats: 0, dodged: 0, crashes: 0, verifyFail: 0, kinds: {} };
  }

  get v() { return this.baseV * this.speedK; }
  emit(type, data) { this.events.push(Object.assign({ type }, data)); }
  px(z) { return pathX(this.player.path, z, this.n); }
  crossing() {
    const last = this.player.path.segs[this.player.path.segs.length - 1];
    return !!last && this.player.p < last.z0 + XL;
  }
  goldX(g) { return g.hop ? lerp(g.hop.from, laneX(g.lane, this.n), smooth(g.hop.t)) : laneX(g.lane, this.n); }

  update(dt) {
    if (this.arrived || this.over) return;
    this.t += dt;
    if (this.opts.auto) this.autopilot(dt);
    const pl = this.player;

    // Fart: fast – undtagen lige efter et bump og når vi bremser ved stationen.
    if (this.recover > 0) {
      this.recover = Math.max(0, this.recover - dt);
      this.speedK = 1 - 0.75 * (this.recover / 1.5);
    } else this.speedK = 1;
    const toEnd = this.def.len - pl.p;
    if (toEnd < BRAKE) this.speedK = Math.min(this.speedK, Math.max(0.2, toEnd / BRAKE));

    const oldP = pl.p;
    pl.p += this.v * dt;
    this.track.ensure(pl.p + VIEW + 10);
    this.handleSwitches(oldP);
    this.moveThings(dt);
    this.collide();
    this.pickup();
    Director.step(this);
    Director.resolve(this);
    this.spawnGold();
    this.cleanup();
    if (pl.p >= this.def.len - 0.3) {
      pl.p = Math.min(pl.p, this.def.len);
      this.arrived = true;
      this.emit('arrive', {});
    }
  }

  // Når lokomotivet når et skiftepunkt, og der er valgt en retning, som skiftet tillader, kører vi over.
  handleSwitches(oldP) {
    const pl = this.player;
    for (const pt of this.track.points) {
      if (pt.z > pl.p) break;
      if (pt.z < oldP - GRACE || pt === pl.used || pl.p - pt.z > GRACE) continue;
      const last = pl.path.segs[pl.path.segs.length - 1];
      if (last && last.z0 + XL > pt.z) continue;
      if (!pl.arm) continue;
      const exits = this.track.exitsAt(pt, pl.lane);
      if (!exits.includes(pl.arm)) continue;
      const z0 = oldP < pt.z ? pt.z : oldP;   // sent tryk: start krydsningen hvor vi er
      pl.path.segs.push({ z0, from: pl.lane, to: pl.lane + pl.arm });
      pl.lane += pl.arm;
      pl.arm = 0;
      pl.used = pt;
      this.emit('switch', { z: pt.z });
    }
  }

  moveThings(dt) {
    const pl = this.player;
    for (const tr of this.trains) {
      if (tr.dead) continue;
      tr.q -= tr.v * dt;
      const gap = tr.q - pl.p;
      if (!tr.whistled && gap > 0 && gap < (tr.v + this.v) * 1.6) {
        tr.whistled = true;
        this.emit('whistle', { lane: tr.lane, z: tr.q });
      }
      if (!tr.passed && tr.q < pl.p - LOCO_LEN) {
        tr.passed = true;
        const near = Math.abs(laneX(tr.lane, this.n) - this.px(pl.p - LOCO_LEN)) < LANE_W * 1.5;
        this.emit('pass', { lane: tr.lane, z: pl.p, near });
      }
    }
    for (const c of this.cows) {
      c.t += dt;
      if (c.state === 'enter' && c.t >= 1) { c.state = 'stand'; c.t = 0; }
      else if (c.state === 'leave' && c.t >= 1.3) c.state = 'gone';
    }
    for (const g of this.gold) {
      if (g.hop) { g.hop.t += dt * 1.4; if (g.hop.t >= 1) g.hop = null; }
    }
  }

  collide() {
    const pl = this.player;
    if (this.recover > 1.0) return;   // et kort øjeblik efter et bump
    for (const tr of this.trains) {
      if (!tr.dead && hitsBox(pl.path, pl.p, this.n, tr.lane, tr.q, tr.q + tr.len)) { this.crash(tr); return; }
    }
    for (const c of this.cows) {
      if (c.state === 'stand' && hitsBox(pl.path, pl.p, this.n, c.lane, c.z - COW_HALF, c.z + COW_HALF)) { this.crash(c); return; }
    }
  }

  crash(obj) {
    const pl = this.player;
    this.crashes++;
    this.stats.crashes++;
    if (!this.opts.god) this.hearts--;
    this.recover = 1.5;
    this.speedK = 0.25;
    const lost = Math.min(2, this.carried);
    this.carried -= lost;
    const th = this.threat;
    const victims = th ? th.trains.concat(th.cows) : [];
    if (!victims.includes(obj)) victims.push(obj);
    for (const o of victims) {
      if (o.len) { o.dead = true; this.emit('poof', { lane: o.lane, z: Math.max(o.q, pl.p - 2) }); }
      else { o.state = 'gone'; this.emit('poof', { lane: o.lane, z: o.z, cow: true }); }
    }
    this.emit('crash', { z: pl.p, lost, cow: !obj.len });
    if (th) Director.finish(this, false);
    pl.arm = 0;
    if (this.hearts <= 0) this.over = true;
  }

  pickup() {
    const pl = this.player;
    for (const g of this.gold) {
      if (g.taken || g.gone) continue;
      if (g.z > pl.p) continue;
      if (g.z < pl.p - LOCO_LEN - 1) { g.gone = true; continue; }
      if (Math.abs(this.px(g.z) - this.goldX(g)) < 1.7) {
        g.taken = true;
        if (g.kind === 'gem') { this.gems++; this.emit('gem', { x: this.goldX(g), z: g.z }); }
        else { this.carried++; this.emit('gold', { x: this.goldX(g), z: g.z }); }
      }
    }
  }

  honk() {
    const pl = this.player;
    this.emit('horn', {});
    for (const c of this.cows) {
      if ((c.state === 'stand' || c.state === 'enter') && c.z > pl.p - 2 && c.z - pl.p < 110) {
        c.state = 'leave';
        c.t = 0;
        this.emit('cowAway', { lane: c.lane, z: c.z });
      }
    }
    const th = this.threat;
    if (th && th.kind === 'cow' && th.cows.every((c) => c.state !== 'stand' && c.state !== 'enter')) Director.finish(this, true);
  }

  spawnGold() {
    const pl = this.player, r = this.rnd;
    while (this.goldNextZ < pl.p + GOLD_AT && this.goldNextZ < this.def.len - 70) {
      const z = this.goldNextZ;
      if (r() < (this.def.gemP || 0)) {
        let lane = Math.floor(r() * (this.n - 1));
        if (lane >= pl.lane) lane++;
        this.gold.push({ kind: 'gem', lane, z });
        this.gemTotal++;
      } else {
        const lane = Math.floor(r() * this.n);
        const count = 1 + Math.floor(r() * 3);
        for (let i = 0; i < count; i++) this.gold.push({ kind: 'sack', lane, z: z + i * 5, bob: r() * 6 });
        this.goldTotal += count;
      }
      this.goldNextZ += 26 + r() * 34;
    }
  }

  cleanup() {
    const pl = this.player, tail = pl.p - TRAIN_LEN;
    this.trains = this.trains.filter((t) => !t.dead && t.q + t.len > tail - 60);
    this.cows = this.cows.filter((c) => c.state !== 'gone' && c.z > pl.p - 40);
    this.gold = this.gold.filter((g) => !g.taken && !g.gone);
    const segs = pl.path.segs;
    while (segs.length && segs[0].z0 + XL < tail - 5) { pl.path.start = segs[0].to; segs.shift(); }
    this.track.prune(pl.p - 45);
  }

  // Let-tilstand: hvilken vej er fri lige nu? (0 = ingen hjælp nødvendig)
  hint() {
    const th = this.threat, pl = this.player;
    if (!th || pl.lane !== th.L || pl.p > th.s + GRACE) return 0;
    if (pl.arm && th.exits.includes(pl.arm)) return 0;
    return th.safe;
  }

  // Test-autopilot: 'dodge' tager altid udvejen, 'late' trykker først lige efter skiftet, 'stay' skifter aldrig.
  autopilot(dt) {
    const mode = this.opts.auto, pl = this.player, th = this.threat;
    if (mode === 'stay') { pl.arm = 0; return; }
    if (th && pl.lane === th.L && pl.p < th.s + GRACE) {
      if (mode === 'late') pl.arm = pl.p > th.s + 0.4 ? th.safe : 0;
      else pl.arm = th.safe;
      return;
    }
    if (th) return;
    this.apT -= dt;
    if (this.apT <= 0) {
      this.apT = 1 + this.rnd() * 2;
      pl.arm = this.rnd() < 0.45 ? (this.rnd() < 0.5 ? -1 : 1) : 0;
    }
  }
}
