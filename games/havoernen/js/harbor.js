// Havnen: sælg lasten, reparer skibet og køb forbedringer.
const UPGRADES = [
  { key: 'guns', name: 'Flere kanoner', desc: '+1 kanon på hver side', prices: [200, 400, 650, 900] },
  { key: 'hull', name: 'Stærkere skrog', desc: 'skibet kan tåle 8 skud mere', prices: [150, 300, 500, 750] },
  { key: 'sails', name: 'Større sejl', desc: 'sejler 8 % hurtigere', prices: [180, 350, 550, 800] },
  { key: 'powder', name: 'Bedre krudt', desc: 'kuglerne flyver længere', prices: [150, 300, 500] },
  { key: 'reload', name: 'Øvet kanonmandskab', desc: 'kanonerne lades hurtigere', prices: [150, 300, 500] },
];

const Harbor = {
  harbor: null,
  sel: 0,
  items: [],
  msg: '',
  msgT: 0,

  open(h) {
    this.harbor = h;
    this.sel = 0;
    this.msg = '';
    Sound.bell();
    Game.save();
    this.build();
  },

  build() {
    const G = Game, P = G.player;
    const cargo = G.cargoValue;
    const items = [];
    if (cargo > 0) items.push({ id: 'sell', label: `Sælg lasten`, right: `+${fmtMoney(cargo)}`, color: '#8ce99a' });
    const missing = Math.ceil(P.maxHp - P.hp);
    if (missing > 0) {
      const cost = missing * 2;
      items.push({ id: 'repair', label: `Reparer skibet (${missing} skader)`, right: G.money >= cost ? fmtMoney(cost) : 'det du har råd til', color: '#ffd166' });
    }
    for (const u of UPGRADES) {
      const lvl = G.upg[u.key];
      if (lvl >= u.prices.length) items.push({ id: 'none', label: `${u.name} – færdig!`, right: '⭐'.repeat(lvl), dim: true });
      else items.push({ id: 'up', up: u, label: `${u.name}: ${u.desc}`, right: fmtMoney(u.prices[lvl]), stars: lvl, cost: u.prices[lvl] });
    }
    items.push({ id: 'leave', label: '⛵ Sejl ud igen', right: '', color: '#a5d8ff' });
    this.items = items;
    this.sel = clamp(this.sel, 0, items.length - 1);
  },

  say(text) { this.msg = text; this.msgT = 2.5; },

  update(dt) {
    const G = Game;
    this.msgT = Math.max(0, this.msgT - dt);
    if (Input.menuUp()) { this.sel = (this.sel + this.items.length - 1) % this.items.length; Sound.tick(); }
    if (Input.menuDown()) { this.sel = (this.sel + 1) % this.items.length; Sound.tick(); }
    if (Input.hit('Escape')) { this.leave(); return; }
    if (!Input.confirm()) return;
    const it = this.items[this.sel];
    const P = G.player;
    if (it.id === 'sell') {
      const v = G.cargoValue;
      G.money += v; G.earned += v; G.cargo = [];
      Sound.coins();
      this.say(`Købmændene betaler ${fmtMoney(v)} for lasten!`);
      G.checkRank();
    } else if (it.id === 'repair') {
      const missing = Math.ceil(P.maxHp - P.hp);
      const can = Math.min(missing, Math.floor(G.money / 2));
      if (can <= 0 && G.money < 2) {
        // Tilgivende: er man helt flad, lapper tømrerne skibet gratis op til det halve
        P.hp = Math.max(P.hp, P.maxHp * 0.5);
        this.say('Tømrerne lapper skibet gratis – kom igen, når du har penge!');
      } else {
        P.hp = Math.min(P.maxHp, P.hp + can);
        G.money -= can * 2;
        this.say('Tømrerne har repareret skibet.');
      }
      Sound.select();
    } else if (it.id === 'up') {
      if (G.money < it.cost) { Sound.bad(); this.say('Du har ikke penge nok endnu. Opbring flere skibe!'); }
      else {
        G.money -= it.cost;
        G.upg[it.up.key]++;
        G.applyUpgrades();
        Sound.fanfare();
        this.say(`${it.up.name}: købt!`);
      }
    } else if (it.id === 'leave') { this.leave(); return; }
    Game.save();
    this.build();
  },

  leave() {
    Sound.select();
    Game.leaveHarbor();
  },

  draw(ctx) {
    const G = Game, W = 1280, H = 720;
    ctx.fillStyle = 'rgba(8,20,40,0.6)';
    ctx.fillRect(0, 0, W, H);
    const x = 250, y = 70, w = 780, h = 580;
    roundRect(ctx, x, y, w, h, 24);
    ctx.fillStyle = '#f4e4c1'; ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = '#8a5a33'; ctx.stroke();
    outlineText(ctx, `⚓ ${this.harbor.name} havn`, W / 2, y + 45, 40, '#fff4c2');
    ctx.font = 'bold 22px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'center'; ctx.fillStyle = '#5b3a1e';
    ctx.fillText(`Pengekiste: ${fmtMoney(G.money)}   ·   Last: ${fmtMoney(G.cargoValue)}   ·   Skrog: ${Math.ceil(G.player.hp)}/${G.player.maxHp}`, W / 2, y + 92);

    let iy = y + 125;
    this.items.forEach((it, i) => {
      const sel = i === this.sel;
      roundRect(ctx, x + 30, iy, w - 60, 46, 12);
      ctx.fillStyle = sel ? '#ffd166' : 'rgba(138,90,51,0.12)';
      ctx.fill();
      if (sel) { ctx.lineWidth = 3; ctx.strokeStyle = '#8a5a33'; ctx.stroke(); }
      ctx.font = `bold ${sel ? 23 : 21}px "Comic Sans MS", sans-serif`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = it.dim ? '#9a8466' : '#3b2412';
      ctx.fillText((sel ? '▶ ' : '   ') + it.label, x + 45, iy + 24);
      ctx.textAlign = 'right';
      const affordable = it.cost === undefined || G.money >= it.cost;
      ctx.fillStyle = affordable ? '#2b6e2b' : '#b23a48';
      ctx.fillText(it.right + (it.stars ? '  ' + '⭐'.repeat(it.stars) : ''), x + w - 45, iy + 24);
      iy += 52;
    });
    if (this.msgT > 0) outlineText(ctx, this.msg, W / 2, y + h - 30, 24, '#fff');
    else {
      ctx.font = '18px "Comic Sans MS", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#7a5a3a';
      ctx.fillText('↑ ↓ vælg  ·  ENTER køb  ·  ESC sejl ud', W / 2, y + h - 30);
    }
  },
};
