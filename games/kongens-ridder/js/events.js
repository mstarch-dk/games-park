// Begivenheder: turneringer i Roskilde, den bortførte prinsesse, høst, oprør og lejesvende.
const PRINCESS = 'Prinsesse Ellen af Gurre';

const Events = {
  // Kaldes ved starten af spillerens sæson. Returnerer beskeder [{title, text, arms, buttons}]
  startOfTurn() {
    const out = [];
    const p = fac('player');

    // Turnering
    G.tourney--;
    if (G.tourney === 1) out.push({ title: 'Budbringer fra Roskilde', text: 'Næste sæson holdes der turnering på kongens tumleplads i Roskilde. Riddere fra hele riget er indbudt!' });
    if (G.tourney === 0) out.push({ title: 'Turnering i Roskilde!', text: 'Trompeterne kalder. Vil du ride med, så vælg "Turnering" denne sæson.' });
    if (G.tourney < 0) G.tourney = randi(3, 4);

    // Prinsessen
    const pr = G.princess;
    if (pr.state === 'free' && G.turn >= pr.kidnapTurn) {
      const lords = LORDS.map((l) => l.id).filter((id) => fac(id).alive);
      if (lords.length) {
        pr.state = 'captive'; pr.holder = pick(lords); pr.timer = 10;
        out.push({ title: 'Prinsessen er bortført!', scene: 'princess',
          text: `${PRINCESS}, kongens unge kusine, er bortført af ${fac(pr.holder).name} og holdes fanget i borgen i ${MapData.regions[fac(pr.holder).home].name}. Kun et dristigt togt kan befri hende!`,
          arms: fac(pr.holder).arms });
      }
    } else if (pr.state === 'captive') {
      pr.timer--;
      if (pr.timer === 3) out.push({ title: 'Tiden løber', text: `${PRINCESS} skal tvinges til at gifte sig med ${fac(pr.holder).short} om 3 sæsoner!` });
      if (pr.timer <= 0) {
        pr.state = 'lost';
        fac(pr.holder).princess = true;
        out.push({ title: 'For sent…', text: `${PRINCESS} er gift med ${fac(pr.holder).name}. Hans folk jubler, og hans hær er blevet stærkere.`, arms: fac(pr.holder).arms });
      }
    }

    // Høst og vejr
    const roll = Math.random();
    if (roll < 0.08) {
      const loss = Math.min(p.gold, randi(5, 10));
      p.gold -= loss;
      out.push({ title: 'Uvejr!', text: `Storm og hagl har ødelagt høsten. Du mister ${loss} guld.` });
    } else if (roll < 0.16) {
      const gain = randi(6, 12);
      p.gold += gain;
      out.push({ title: 'God høst', text: `Kornet står højt på markerne. Bønderne giver ${gain} guld ekstra.` });
    } else if (roll < 0.23 && p.gold >= 10) {
      out.push({ title: 'Lejesvende', text: 'En flok tyske lejesvende tilbyder deres tjeneste: 10 fodfolk for 10 guld.',
        buttons: [{ label: 'Hyr dem (10 guld)', onClick: () => { if (p.gold >= 10) { p.gold -= 10; p.army.f += 10; Sound.coin(); } } }, { label: 'Nej tak' }] });
    }

    // Oprør i områder uden vagt
    MapData.order.forEach((rid) => {
      const r = G.regions[rid];
      if (!r.owner) return;
      const f = fac(r.owner);
      if (f.home === rid || r.gar.f + r.gar.k > 0 || f.army.at === rid) return;
      if (Math.random() < 0.1) {
        const prev = r.owner;
        r.owner = null; r.gar = { f: 3, k: 0 };
        onRegionLost(prev, rid, null);
        if (prev === 'player') out.push({ title: 'Oprør!', text: `Bønderne i ${MapData.regions[rid].name} har gjort oprør, fordi der ikke var nogen vagt. Området er tabt.` });
        else G.log.push(`Oprør i ${MapData.regions[rid].name} mod ${f.short}.`);
      }
    });
    return out;
  },

  freePrincess() {
    const p = fac('player');
    G.princess.state = 'rescued'; G.princess.holder = null;
    p.princess = true;
    p.gold += 30;
    p.lead = Math.min(4, p.lead + 1);
  },

  // ---------- Togt: snig dig ind i en herres borg ----------
  raidMenu() {
    const p = fac('player');
    const lords = LORDS.map((l) => l.id).filter((id) => fac(id).alive && G.regions[fac(id).home].owner === id);
    const buttons = lords.map((id) => {
      const f = fac(id);
      const princess = G.princess.state === 'captive' && G.princess.holder === id;
      return { label: princess ? `Befri prinsessen hos ${f.short}` : `Skatkammeret hos ${f.short} (${f.gold} guld)`, onClick: () => this.raid(id, princess) };
    });
    buttons.push({ label: 'Tilbage' });
    Game.dialog({ title: 'Togt', lines: [`Med en lille flok trofaste mænd sniger du dig ind i en fjendtlig borg om natten. Tab du duellen, bliver du taget til fange og må betale løsepenge.`, `Din fægtning: ${stars(p.sword)}`], buttons, back: buttons.length - 1 });
  },

  raid(id, princess) {
    const f = fac(id);
    const guardName = pick(['Vagtkaptajnen', 'Borgfogeden', 'Livvagten']);
    const foes = princess
      ? [{ name: 'Tårnvagten', sword: Math.max(1, f.sword - 1), color: f.color === '#2a2a2a' ? '#555' : f.color }, { name: f.short, sword: f.sword + 1, color: f.color === '#2a2a2a' ? '#555' : f.color }]
      : [{ name: guardName, sword: f.sword, color: f.color === '#2a2a2a' ? '#555' : f.color }];
    Game.go('fencing', {
      title: princess ? `Tårnet i ${MapData.regions[f.home].name}` : `Natligt togt mod ${f.short}`,
      foes,
      onDone: (win) => {
        const p = fac('player');
        Game.go('map');
        if (win && princess) {
          this.freePrincess();
          Game.messages([{ title: 'Prinsessen er fri!', scene: 'princess', rescued: true,
            text: `${PRINCESS} rækker dig hånden: "Jeg vidste, en af kongens tro riddere ville komme." Hun slutter sig til din sag og medbringer 30 guld. Dit folk følger dig nu med større mod (+1 lederskab, +3 guld pr. sæson).` }], () => Game.endTurn());
        } else if (win) {
          const loot = Math.min(f.gold, 15 + Math.floor(f.gold * 0.5));
          f.gold -= loot; p.gold += loot;
          Sound.coin();
          Game.messages([{ title: 'Togtet lykkedes', text: `Du sniger dig ud med ${loot} guld fra ${f.short}s skatkammer.` }], () => Game.endTurn());
        } else {
          const ransom = Math.min(p.gold, 10 + Math.floor(p.gold * 0.4));
          p.gold -= ransom; f.gold += ransom;
          Game.messages([{ title: 'Taget til fange!', arms: f.arms, text: `${f.name} lader dig gå – mod en løsesum på ${ransom} guld.` }], () => Game.endTurn());
        }
      },
    });
  },

  // ---------- Turnering ----------
  tourneyMenu() {
    const lords = LORDS.map((l) => l.id).filter((id) => fac(id).alive);
    const buttons = [{ label: 'Rid om ære og guld', onClick: () => this.joust(pick(lords) || null, 'honour') }];
    lords.forEach((id) => {
      const others = regionsOf(id).filter((r) => r !== fac(id).home);
      buttons.push({ label: `Rid om land mod ${fac(id).short}`, enabled: others.length > 0 && regionsOf('player').length > 1, onClick: () => this.joust(id, 'land') });
    });
    buttons.push({ label: 'Tilbage' });
    Game.dialog({ title: 'Turneringen i Roskilde', lines: ['Om ære: vinder du, får du 20 guld og berømmelse. Taber du, koster det 10 guld.', 'Om land: vinderen tager et område fra taberen!', `Din lanseføring: ${stars(fac('player').lance)}`], buttons, back: buttons.length - 1 });
  },

  joust(oppId, stake) {
    Game.go('joust', {
      opponent: oppId, stake,
      onDone: (res) => {
        Game.go('map');
        const p = fac('player');
        const o = oppId ? fac(oppId) : null;
        let text = '';
        if (res === 'draw') text = 'Ingen vandt. I skilles med et nik.';
        else if (stake === 'honour') {
          if (res === 'win') {
            p.gold += 20; p.fame = (p.fame || 0) + 1;
            text = 'Folket jubler! Du får 20 guld.';
            if (p.fame % 2 === 0 && p.lead < 4) { p.lead++; text += ' Din berømmelse vokser: +1 lederskab!'; }
          } else { const l = Math.min(p.gold, 10); p.gold -= l; text = `Du ligger i sandet. Det koster ${l} guld.`; }
        } else if (res === 'win') {
          const cand = regionsOf(oppId).filter((r) => r !== o.home);
          const rid = pick(cand);
          G.regions[rid].owner = 'player';
          G.regions[rid].gar = { f: 2, k: 0 };
          if (o.army.at === rid) o.army.at = o.home;
          onRegionLost(oppId, rid, 'player');
          text = `${o.short} må give dig ${MapData.regions[rid].name}!`;
        } else {
          const cand = regionsOf('player').filter((r) => r !== p.home);
          const rid = pick(cand);
          G.regions[rid].owner = oppId;
          G.regions[rid].gar = { f: 2, k: 0 };
          if (p.army.at === rid) p.army.at = p.home;
          text = `Du må give ${MapData.regions[rid].name} til ${o.short}.`;
        }
        G.tourney = randi(4, 5);
        Game.messages([{ title: res === 'win' ? 'Sejr på tumlepladsen' : res === 'lose' ? 'Nederlag' : 'Uafgjort', text }], () => Game.endTurn());
      },
    });
  },
};
