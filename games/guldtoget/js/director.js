// Instruktøren: bygger banen løbende, mens man kører, ud fra hvilket spor man rent faktisk er i.
//
// Fordi dit tog kører med fast fart, kan instruktøren regne præcist. For hver udfordring:
//   1. Find det NÆSTE skiftepunkt s, hvor dit spor L kan skifte (der er ingen udvej før).
//   2. Sæt forhindringen i L, så den når krydsningen netop `margin` sekunder efter din sidste vogn
//      er kørt ud af L. Bliver du i L, støder du sammen; skifter du ved s, suser den lige forbi.
//   3. Tjek med "spøgelses-tog" (en lille simulation), at det passer:
//        - bliver du stående i L  ⇒ sammenstød         (forhindringen er ægte)
//        - tager du en fri udvej  ⇒ intet sammenstød   (banen kan gennemføres)
//        - ved dobbelt-tog: den spærrede udvej ⇒ sammenstød (kun ét rigtigt valg)
//      Fejler tjekket, bliver udfordringen forkastet.
// Der er højst én aktiv udfordring ad gangen, så en fri udvej altid forbliver fri.
const Director = {
  step(w) {
    if (w.threat || w.recover > 0 || w.arrived || w.over) return;
    const pl = w.player, def = w.def;
    const last = pl.path.segs[pl.path.segs.length - 1];
    if (last && pl.p < last.z0 + XL) return;          // midt i en krydsning
    const nx = w.track.nextFor(pl.lane, pl.p + 0.5);
    if (!nx) return;
    const s = nx.pt.z;
    if (s < w.calmEnd || s > def.len - 140) return;
    if (!w.plan || w.plan.pt !== nx.pt || w.plan.L !== pl.lane) {
      w.plan = { pt: nx.pt, L: pl.lane, kind: this.pickKind(w, nx), skip: false };
    }
    if (w.plan.skip) return;
    const dist = s - pl.p, v = w.v;
    if (dist < v * def.warn) { w.plan.skip = true; return; }   // for kort varsel – vent på det næste
    if (w.plan.kind === 'cow') {
      if (dist > Math.max(v * 3.6, v * def.warn + 6)) return;
    } else if (this.trainQ(w, s, w.onV) - pl.p > SPAWN_AT) return;
    this.spawn(w, nx, w.plan.kind);
  },

  pickKind(w, nx) {
    // Dobbelt-tog kræver et skifte med udvej til begge sider – når det findes, er det ekstra sandsynligt.
    const mix = Object.assign({}, w.def.mix);
    if (mix.double) mix.double *= nx.exits.length === 2 ? 2.5 : 0;
    let total = 0;
    for (const k in mix) total += mix[k];
    let x = w.rnd() * total, kind = 'train';
    for (const k in mix) { x -= mix[k]; if (x <= 0) { kind = k; break; } }
    if (kind === 'double' && nx.exits.length < 2) kind = 'train';
    return kind;
  },

  // Hvor skal et modkørende tog (fart vo) starte, for at suse forbi lige efter skiftet ved s?
  trainQ(w, s, vo) {
    const zStar = s + U_CLEAR * XL;                           // her er din sidste vogn fri af det gamle spor
    const tClear = (zStar + TRAIN_LEN - w.player.p) / w.v;    // ... på dette tidspunkt
    return zStar + vo * (tClear + w.def.margin);
  },

  spawn(w, nx, kind) {
    const pl = w.player, L = pl.lane, s = nx.pt.z, r = w.rnd;
    let exits = nx.exits.slice();
    const blocked = [L];
    if (kind === 'double') {
      const bad = exits[Math.floor(r() * exits.length)];
      blocked.push(L + bad);
      exits = exits.filter((d) => d !== bad);
    }
    // Helst en udvej ind mod midten – derfra er der flere veje videre (og plads til dobbelt-tog).
    const mid = (w.n - 1) / 2;
    const inward = exits.filter((e) => Math.abs(L + e - mid) < Math.abs(L - mid));
    const safe = inward.length && r() < 0.7 ? inward[0] : exits[Math.floor(r() * exits.length)];
    const zStar = s + U_CLEAR * XL;
    const trains = [], cows = [];
    if (kind === 'cow') {
      const side = L < (w.n - 1) / 2 ? -1 : L > (w.n - 1) / 2 ? 1 : (r() < 0.5 ? -1 : 1);
      // En ko står stille, så den skal stå lidt længere fremme end GRACE – så et sent tryk også når at undvige.
      cows.push({ lane: L, z: zStar + COW_HALF + GRACE + 0.3, state: 'enter', t: 0, side });
    } else {
      const col = TRAIN_COLORS[Math.floor(r() * TRAIN_COLORS.length)];
      for (const b of blocked) {
        const vo = w.onV * (0.92 + r() * 0.16);
        trains.push({ lane: b, v: vo, q: this.trainQ(w, s, vo), len: ON_LEN, col, whistled: false, passed: false, dead: false });
      }
    }

    // Invariant-tjek med spøgelses-tog.
    const allTrains = w.trains.filter((t) => !t.dead).concat(trains);
    const allCows = w.cows.filter((c) => c.state === 'stand' || c.state === 'enter').concat(cows);
    const stayHits = this.ghost(w, allTrains, allCows, s, 0);
    const exitsFree = exits.every((d) => !this.ghost(w, allTrains, allCows, s, d));
    const badHits = blocked.slice(1).every((b) => this.ghost(w, allTrains, allCows, s, b - L));
    if (!stayHits || !exitsFree || !badHits) {
      w.stats.verifyFail++;
      w.plan.skip = true;
      if (typeof console !== 'undefined') console.warn('Guldtoget: udfordring forkastet', { kind, s, L, stayHits, exitsFree, badHits });
      return;
    }

    w.trains.push(...trains);
    w.cows.push(...cows);
    w.threat = { kind, s, pt: nx.pt, L, blocked, exits, safe, trains, cows };
    w.stats.threats++;
    w.stats.kinds[kind] = (w.stats.kinds[kind] || 0) + 1;

    // Guld i de spærrede spor hopper over i det frie spor – så det stadig kan samles (og viser vejen).
    for (const g of w.gold) {
      if (g.taken || g.gone || g.hop) continue;
      if (blocked.includes(g.lane) && g.z >= s + 3 && g.z <= s + 75) {
        g.hop = { from: laneX(g.lane, w.n), t: 0 };
        g.lane = L + safe;
        g.z = Math.max(g.z, s + XL + 3);
      }
    }
    w.emit(kind === 'cow' ? 'cow' : 'spawn', { kind, lane: L, s });
  },

  // Kør et spøgelse af dit tog frem i tiden: bliv i sporet (dir 0) eller skift ved s. Rammer det noget?
  ghost(w, trains, cows, s, dir) {
    const pl = w.player, n = w.n, v = w.v;
    const path = { start: pl.path.start, segs: pl.path.segs.slice() };
    let p = pl.p, switched = !dir;
    const tr = trains.map((t) => ({ lane: t.lane, q: t.q, v: t.v, len: t.len }));
    const dt = 1 / 240;
    for (let i = 0; i < 240 * 15; i++) {
      p += v * dt;
      for (const t of tr) t.q -= t.v * dt;
      if (!switched && p >= s) {
        path.segs.push({ z0: s, from: pl.lane, to: pl.lane + dir });
        switched = true;
      }
      for (const t of tr) if (hitsBox(path, p, n, t.lane, t.q, t.q + t.len)) return true;
      for (const c of cows) if (hitsBox(path, p, n, c.lane, c.z - COW_HALF, c.z + COW_HALF)) return true;
      if (switched && p - TRAIN_LEN > s + 40 && tr.every((t) => t.q + t.len < p - TRAIN_LEN)) return false;
    }
    return false;
  },

  // Er udfordringen overstået?
  resolve(w) {
    const th = w.threat;
    if (!th) return;
    const pl = w.player;
    if (th.kind === 'cow' && th.cows.every((c) => c.state === 'leave' || c.state === 'gone')) { this.finish(w, true); return; }
    if (pl.p > th.s + XL + 1 && !th.blocked.includes(pl.lane)) { this.finish(w, true); return; }
    if (pl.p > th.s + 400) this.finish(w, false);   // nødudgang – burde aldrig ske
  },

  finish(w, dodged) {
    if (dodged) { w.stats.dodged++; w.emit('dodged', { kind: w.threat.kind }); }
    w.calmEnd = w.player.p + w.def.calm;
    w.threat = null;
    w.plan = null;
  },
};
