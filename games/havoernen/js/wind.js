// Vinden: retning (hvor den blæser HEN) og styrke 0..1. Drejer langsomt.
const Wind = {
  angle: 0, strength: 0.7, target: 0, targetStrength: 0.7, timer: 30,
  vx: 0, vy: 0,

  init() {
    this.angle = this.target = rand(0, TAU);
    this.strength = this.targetStrength = rand(0.55, 0.85);
    this.timer = rand(35, 60);
    this.sync();
  },

  sync() { this.vx = Math.cos(this.angle) * this.strength; this.vy = Math.sin(this.angle) * this.strength; },

  update(dt, onShift) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = rand(40, 75);
      this.target = this.angle + rand(-1.6, 1.6);
      this.targetStrength = rand(0.45, 1);
      if (onShift) onShift();
    }
    const d = angDiff(this.angle, this.target);
    this.angle += clamp(d, -0.12 * dt, 0.12 * dt);
    this.strength += clamp(this.targetStrength - this.strength, -0.05 * dt, 0.05 * dt);
    this.sync();
  },

  // Hvor vinden kommer FRA (sådan siger sømænd: "vind fra vest")
  get fromName() { return compassName(this.angle + Math.PI); },
  get label() {
    const s = this.strength;
    return s < 0.55 ? 'let brise' : s < 0.8 ? 'frisk vind' : 'hård vind';
  },
};

// Hvor godt sejler skibet i forhold til vinden?
// rel = vinkel mellem skibets kurs og retningen vinden kommer FRA (0 = lige op mod vinden)
function sailFactor(rel) {
  const a = Math.abs(rel) / DEG;
  if (a < 35) return 0.06;                              // i vindøjet – sejlene blafrer
  if (a < 60) return lerp(0.25, 0.8, (a - 35) / 25);    // bidevind
  if (a < 110) return lerp(0.8, 1.0, (a - 60) / 50);    // halvvind
  return lerp(1.0, 0.72, (a - 110) / 70);               // slør og læns
}

function pointOfSail(rel) {
  const a = Math.abs(rel) / DEG;
  if (a < 35) return { name: 'I vindøjet!', tip: 'Drej væk fra vinden', color: '#ff6b6b' };
  if (a < 60) return { name: 'Bidevind', tip: 'Skråt op mod vinden', color: '#ffd166' };
  if (a < 110) return { name: 'Halvvind', tip: 'Vind fra siden – hurtigst!', color: '#06d6a0' };
  if (a < 155) return { name: 'Slør', tip: 'Vind skråt bagfra', color: '#8ce99a' };
  return { name: 'Læns', tip: 'Vind lige bagfra', color: '#a5d8ff' };
}
