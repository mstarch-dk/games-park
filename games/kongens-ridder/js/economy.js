// Penge: indtægter pr. sæson og hvad tingene koster.
const SHOP = [
  { id: 'foot', label: '5 fodfolk', price: 8, about: 'Billige og mange. Styrke 1 hver.' },
  { id: 'knight', label: '1 ridder', price: 6, about: 'Til hest, i rustning. Styrke 3.' },
  { id: 'cat', label: '1 katapult', price: 14, about: 'Skal bruges for at belejre en borg.' },
  { id: 'castle', label: 'Byg borg (+1 mur)', price: 22, about: 'Gør området meget sværere at erobre.', region: true },
  { id: 'farm', label: 'Ryd en gård (+1 guld)', price: 10, about: 'Giver 1 guld mere hver sæson.', region: true },
  { id: 'market', label: 'Byg et marked (+2 guld)', price: 18, about: 'Giver 2 guld mere hver sæson.', region: true },
];
const MAX_CASTLE = 3, MAX_FARM = 2, MAX_MARKET = 1;

const Economy = {
  regionIncome(rid) {
    const r = G.regions[rid];
    return MapData.regions[rid].baseIncome + r.farm + r.market * 2;
  },

  income(fid) {
    const f = fac(fid);
    const incs = regionsOf(fid).map((rid) => this.regionIncome(rid)).sort((a, b) => b - a);
    // Herrernes lensmænd stikker en del i egen lomme, når riget bliver stort
    let sum = incs.reduce((s, v, i) => s + (f.ai && i >= 4 ? v * 0.6 : v), 0);
    sum = Math.round(sum);
    if (f.princess) sum += 3;
    if (fid === 'player' && incs.length <= 3) sum += 3; // kongens venner sender sølv, mens riget er lille
    if (G.turn % 4 === 3) sum = Math.round(sum * 0.75); // vinter: mindre høst
    return sum;
  },

  armyPower(a) { return a.f + a.k * 3; },
  armyEmpty(a) { return a.f + a.k <= 0; },

  canBuy(fid, item, rid) {
    const f = fac(fid);
    if (f.gold < item.price) return false;
    if (!item.region) return true;
    const r = G.regions[rid];
    if (!r || r.owner !== fid) return false;
    if (item.id === 'castle') return r.castle < MAX_CASTLE;
    if (item.id === 'farm') return r.farm < MAX_FARM;
    if (item.id === 'market') return r.market < MAX_MARKET;
    return true;
  },

  buy(fid, itemId, rid) {
    const item = SHOP.find((s) => s.id === itemId);
    if (!this.canBuy(fid, item, rid)) return false;
    const f = fac(fid);
    f.gold -= item.price;
    const a = f.army;
    if (!item.region && this.armyEmpty(a) && G.regions[f.home].owner === fid) a.at = f.home;
    if (!item.region && G.regions[a.at].owner !== fid) a.at = regionsOf(fid)[0] || a.at;
    switch (itemId) {
      case 'foot': a.f += 5; break;
      case 'knight': a.k += 1; break;
      case 'cat': a.c += 1; break;
      case 'castle': G.regions[rid].castle++; break;
      case 'farm': G.regions[rid].farm++; break;
      case 'market': G.regions[rid].market++; break;
      default: break;
    }
    return true;
  },

  // Flyt soldater mellem hæren og områdets garnison (hæren skal stå i området)
  garrison(fid, rid, dir) {
    const f = fac(fid), r = G.regions[rid];
    if (f.army.at !== rid || r.owner !== fid) return false;
    if (dir > 0) {
      const n = Math.min(5, f.army.f);
      if (!n) return false;
      f.army.f -= n; r.gar.f += n;
    } else {
      if (!r.gar.f && !r.gar.k) return false;
      const n = Math.min(5, r.gar.f);
      r.gar.f -= n; f.army.f += n;
      if (!n && r.gar.k) { r.gar.k--; f.army.k++; }
    }
    return true;
  },
};
