// Gem spillet i browseren hver sæson, så man kan fortsætte en anden dag.
const SAVE_KEY = 'kongensridder-save';

const Save = {
  write() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { /* ingen lager – spil videre */ }
  },
  read() {
    try {
      const s = localStorage.getItem(SAVE_KEY);
      if (!s) return null;
      const g = JSON.parse(s);
      return g && g.factions && g.regions ? g : null;
    } catch (e) { return null; }
  },
  exists() { return !!this.read(); },
  clear() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignorer */ } },
};
