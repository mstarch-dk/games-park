// Gem spillet i browseren hver sæson, så man kan fortsætte en anden dag.
// Man kan også gemme til en fil og indlæse den igen – så overlever spillet,
// selv om browseren glemmer alt, og det kan flyttes til en anden computer.
const SAVE_KEY = 'kongensridder-save';
const SAVE_GAME_ID = 'kongens-ridder';
const SAVE_VERSION = 1;

const Save = {
  valid(g) { return !!(g && typeof g === 'object' && g.factions && g.regions); },

  write() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { /* ingen lager – spil videre */ }
  },
  read() {
    try {
      const s = localStorage.getItem(SAVE_KEY);
      if (!s) return null;
      const g = JSON.parse(s);
      return this.valid(g) ? g : null;
    } catch (e) { return null; }
  },
  exists() { return !!this.read(); },
  clear() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignorer */ } },

  // ---------- Gem til fil / indlæs fra fil ----------
  fileName() {
    const season = seasonName(G.turn).toLowerCase()
      .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `kongens-ridder-${season}.json`;
  },

  exportFile() {
    try {
      const data = { game: SAVE_GAME_ID, version: SAVE_VERSION, savedAt: new Date().toISOString(), state: G };
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.fileName();
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } catch (e) { return false; }
  },

  // Læs tekst fra en fil og giv et gyldigt spil tilbage (eller null).
  parse(text) {
    try {
      const d = JSON.parse(text);
      if (d && d.game === SAVE_GAME_ID && this.valid(d.state)) return d.state;
      if (this.valid(d)) return d; // rå spiltilstand
    } catch (e) { /* ikke JSON */ }
    return null;
  },

  importFile(onOk, onFail) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      input.remove();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { const g = this.parse(reader.result); if (g) onOk(g); else onFail(); };
      reader.onerror = () => onFail();
      reader.readAsText(file);
    });
    document.body.appendChild(input);
    input.click();
  },
};
