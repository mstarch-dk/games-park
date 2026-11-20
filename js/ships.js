// De seks rumskibe man kan vælge – og fjendernes skibe.
// Alle skibe tegnes med næsen mod højre (+x). Tal:
//   hp      = hvor meget skibet kan tåle
//   speed   = max-fart (pixels i sekundet)
//   accel   = hvor hårdt motoren skubber (thrust)
//   turn    = drejehastighed (radianer i sekundet)
//   energy  = energi til våben, regen = hvor hurtigt den lader op
//   mass    = tunge skibe skubbes mindre, når de støder sammen
//   stats   = søjlerne på skib-vælgeren (1-5)

const SHIP_DEFS = [
  {
    id: 'lynet', name: 'Lynet', color: '#ffd23f',
    tagline: 'Lynhurtig og spinkel',
    strong: 'Hurtigst af alle, laser der skyder hurtigt',
    weak: 'Kan ikke tåle ret mange skud',
    specialName: 'Turbo – ekstra fart i et sekund',
    hp: 15, speed: 520, accel: 600, turn: 4.4, energy: 18, regen: 6.5, radius: 16, mass: 0.8,
    stats: { fart: 5, drej: 4, liv: 1, vaaben: 2, energi: 3 },
    flame: ['#aff', '#4cf', '#fff'], engines: [[-18, 0]],
    ai: { shotSpeed: 950, range: 700, style: 'gun' },
    fire: {
      cost: 1.4, cd: 0.13,
      fn(s, G) {
        s.gunSide = -(s.gunSide || 1);
        shoot(s, G, { speed: 950, kind: 'laser', dmg: 2, life: 0.75, r: 4, color: '#7ff', side: s.gunSide * 5 });
        Sound.laser();
      },
    },
    special: {
      cost: 8, cd: 2,
      fn(s) { s.boost = 1.3; Sound.turbo(); Fx.text(s.x, s.y - 30, 'TURBO!', '#ffe35a', 26); },
    },
    draw(c, s, t) {
      poly(c, [-14, -4, -8, -17, 4, -6], '#2b6cff', '#0b1a4a');
      poly(c, [-14, 4, -8, 17, 4, 6], '#2b6cff', '#0b1a4a');
      poly(c, [24, 0, 4, -7, -14, -6, -19, 0, -14, 6, 4, 7], '#ffd23f', '#5a3a00');
      const fl = Math.sin(t * 30) > 0.3;
      poly(c, [16, -1, 6, -4, 7, -1, -6, -3, -1, 1, -2, 0, 9, 2], fl ? '#ffffff' : '#ff8a00');
      ellipse(c, 7, 0, 6, 3.5, 0, '#6fe3ff', '#0b3a5a', 1.5);
      circle(c, 8.5, -1.2, 1.2, '#fff');
      circle(c, -18, 0, 3, s.thrusting ? '#dff' : '#4aa');
    },
  },
  {
    id: 'boef', name: 'Kampbøffen', color: '#8fa36a',
    tagline: 'Tyk, tung og pansret',
    strong: 'Kan tåle rigtig meget, store kanonkugler',
    weak: 'Langsom og drejer tungt',
    specialName: 'Skjold – kan ikke tage skade i 2 sekunder',
    hp: 26, speed: 270, accel: 240, turn: 2.3, energy: 20, regen: 4, radius: 30, mass: 2.2,
    stats: { fart: 1, drej: 1, liv: 5, vaaben: 4, energi: 3 },
    flame: ['#ffb030', '#ff6020', '#ffe080'], engines: [[-30, -22], [-30, 22]],
    ai: { shotSpeed: 520, range: 650, style: 'gun' },
    fire: {
      cost: 3, cd: 0.55,
      fn(s, G) {
        shoot(s, G, { speed: 520, kind: 'ball', dmg: 4, life: 1.8, r: 9, grav: 0.6, fwd: 40, color: '#ffb84a' });
        // Rekyl: når kuglen skydes fremad, skubbes skibet lidt baglæns (Newtons 3. lov)
        s.vx -= Math.cos(s.angle) * 35;
        s.vy -= Math.sin(s.angle) * 35;
        s.recoil = 1;
        Sound.cannon();
        Fx.smoke(s.x + Math.cos(s.angle) * 40, s.y + Math.sin(s.angle) * 40, 3, 8);
      },
    },
    special: {
      cost: 12, cd: 3.5,
      fn(s) { s.shield = 2.2; Sound.shield(); Fx.text(s.x, s.y - 44, 'SKJOLD!', '#8ff0ff', 26); },
    },
    draw(c, s, t) {
      for (const y of [-22, 22]) {
        roundRect(c, -32, y - 7, 30, 14, 6);
        c.fillStyle = '#5c6b4a'; c.fill();
        c.strokeStyle = '#232a18'; c.lineWidth = 2.5; c.stroke();
        circle(c, -32, y, 4, s.thrusting ? '#ffd080' : '#553');
      }
      const rc = (s.recoil || 0) * 8;
      c.fillStyle = '#3c3c44';
      c.fillRect(16 - rc, -6, 24, 12);
      c.strokeStyle = '#111'; c.lineWidth = 2;
      c.strokeRect(16 - rc, -6, 24, 12);
      c.fillStyle = '#26262c';
      c.fillRect(36 - rc, -8, 6, 16);
      roundRect(c, -24, -20, 46, 40, 14);
      c.fillStyle = '#7d8f5c'; c.fill();
      c.strokeStyle = '#2c3520'; c.lineWidth = 3; c.stroke();
      c.fillStyle = '#6b7b4e';
      c.fillRect(-18, -4, 26, 8);
      for (const [x, y] of [[-18, -14], [-6, -16], [6, -16], [-18, 14], [-6, 16], [6, 16]]) circle(c, x, y, 1.8, '#c8d0b0');
      // Sure øjne
      for (const sy of [-1, 1]) {
        ellipse(c, 12, sy * 8, 5, 4, 0, '#fff', '#222', 1.5);
        circle(c, 14, sy * 8, 2.2, '#111');
        c.strokeStyle = '#222'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(6, sy * 13); c.lineTo(17, sy * 4); c.stroke();
      }
    },
  },
  {
    id: 'snurre', name: 'Snurretoppen', color: '#c25ae8',
    tagline: 'En snurrende UFO med en lille pilot',
    strong: 'Drejer lynhurtigt rundt',
    weak: 'Skuddene når ikke så langt',
    specialName: 'Stjerne-ring – skud hele vejen rundt',
    hp: 18, speed: 380, accel: 420, turn: 7.5, energy: 18, regen: 6, radius: 22, mass: 1,
    stats: { fart: 3, drej: 5, liv: 2, vaaben: 3, energi: 3 },
    flame: ['#f8f', '#c6f', '#fff'], engines: [[-20, 0]],
    ai: { shotSpeed: 720, range: 440, style: 'gun' },
    fire: {
      cost: 1, cd: 0.17,
      fn(s, G) {
        for (const side of [-9, 9]) shoot(s, G, { speed: 720, kind: 'bolt', dmg: 2, life: 0.55, r: 5, color: '#ff8cf0', side });
        Sound.zap();
      },
    },
    special: {
      cost: 10, cd: 1.4,
      fn(s, G) {
        const n = 16;
        for (let i = 0; i < n; i++) {
          shoot(s, G, { speed: 600, kind: 'bolt', dmg: 2, life: 0.6, r: 5, color: '#ffe066', spread: (i / n) * TAU, fwd: 0, side: 0 });
        }
        Sound.ring();
        Fx.ring(s.x, s.y, 10, 120, '#ffe066', 0.4, 4);
      },
    },
    draw(c, s, t) {
      poly(c, [27, 0, 18, -6, 18, 6], '#ffde59', '#6a4a00', 1.5);
      ellipse(c, 0, 0, 23, 23, 0, '#b04ad8', '#3a0a5a', 3);
      ellipse(c, 0, 0, 18, 18, 0, '#8a2fb0');
      const spin = t * 5;
      for (let i = 0; i < 8; i++) {
        const a = spin + (i / 8) * TAU;
        const on = (Math.floor(t * 6) + i) % 2 === 0;
        circle(c, Math.cos(a) * 19, Math.sin(a) * 19, 2.6, on ? '#ffee55' : '#55e8ff');
      }
      circle(c, 0, 0, 11, 'rgba(160,255,220,0.45)', '#e0fff4', 1.5);
      circle(c, 0, 0, 6.5, '#7be05a', '#2a6a1a', 1.5);
      for (const sy of [-1, 1]) {
        circle(c, 2.5, sy * 2.6, 2.1, '#fff');
        circle(c, 3.3, sy * 2.6, 1.1, '#000');
      }
      c.strokeStyle = '#2a6a1a'; c.lineWidth = 1.2;
      for (const sy of [-1, 1]) {
        c.beginPath(); c.moveTo(-3, sy * 4); c.lineTo(-8, sy * 8); c.stroke();
        circle(c, -8, sy * 8, 1.6, '#ff5a8a');
      }
      circle(c, -3, -3, 2, 'rgba(255,255,255,0.7)');
    },
  },
  {
    id: 'blaek', name: 'Blæksprutten', color: '#e04ab8',
    tagline: 'Et levende rumvæsen med vrikkende arme',
    strong: 'Skyder tre bobler i en vifte',
    weak: 'Ikke specielt hurtig',
    specialName: 'Blæksky – skjuler den og bremser fjendens skud',
    hp: 20, speed: 340, accel: 340, turn: 3.5, energy: 20, regen: 5, radius: 24, mass: 1.1,
    stats: { fart: 2, drej: 3, liv: 3, vaaben: 3, energi: 4 },
    flame: ['#f6b2ff', '#c070ff', '#fff'], engines: [[-24, 0]],
    ai: { shotSpeed: 560, range: 520, style: 'gun' },
    fire: {
      cost: 3, cd: 0.45,
      fn(s, G) {
        for (const a of [-0.22, 0, 0.22]) shoot(s, G, { speed: 560, kind: 'bubble', dmg: 1.5, life: 0.9, r: 7, spread: a, color: '#f6b2ff' });
        Sound.bubble();
      },
    },
    special: {
      cost: 10, cd: 3,
      fn(s, G) {
        G.clouds.push(new Cloud({ x: s.x, y: s.y, vx: s.vx * 0.3, vy: s.vy * 0.3, r: 210, life: 5, team: s.team, owner: s, kind: 'ink' }));
        Sound.ink();
        Fx.text(s.x, s.y - 40, 'BLÆK!', '#d9a0ff', 26);
      },
    },
    draw(c, s, t) {
      const wig = s.thrusting ? 14 : 6;
      for (let i = 0; i < 6; i++) {
        const y0 = -11 + i * 4.4;
        c.strokeStyle = i % 2 ? '#c03aa0' : '#a82a8c';
        c.lineWidth = 5;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(-4, y0);
        for (let k = 1; k <= 6; k++) {
          const x = -4 - k * 6;
          const y = y0 * (1 + k * 0.12) + Math.sin(t * wig + i * 1.3 + k * 0.9) * k * 1.3;
          c.lineTo(x, y);
        }
        c.stroke();
      }
      ellipse(c, 8, 0, 19, 15, 0, '#e04ab8', '#5a0a40', 2.5);
      for (const [x, y, r] of [[0, -8, 2.5], [-2, 7, 3], [16, -10, 1.8], [4, 11, 2]]) circle(c, x, y, r, '#ff9ae0');
      const blink = Math.sin(t * 1.7) > 0.97;
      for (const sy of [-1, 1]) {
        if (blink) {
          c.strokeStyle = '#3a0030'; c.lineWidth = 2;
          c.beginPath(); c.moveTo(10, sy * 7); c.lineTo(18, sy * 7); c.stroke();
        } else {
          circle(c, 14, sy * 7, 5.5, '#fff', '#3a0030', 1.5);
          circle(c, 16, sy * 7, 2.8, '#111');
          circle(c, 17, sy * 7 - 1, 1, '#fff');
        }
      }
    },
  },
  {
    id: 'gris', name: 'Rumgrisen', color: '#ff9ec4', flip: true,
    tagline: 'En flyvende gris med jetpakke',
    strong: 'Lægger miner bag sig, der jager fjenden',
    weak: 'Har ingen kanon fremad',
    specialName: 'PRUT! – kæmpe fart fremad og en giftig sky bagud',
    hp: 20, speed: 370, accel: 380, turn: 3.7, energy: 22, regen: 5.5, radius: 22, mass: 1,
    stats: { fart: 3, drej: 3, liv: 3, vaaben: 3, energi: 4 },
    flame: ['#ffd080', '#ff8040', '#fff'], engines: [[-22, -6]],
    ai: { shotSpeed: 0, range: 450, style: 'mines' },
    fire: {
      cost: 4, cd: 0.5,
      fn(s, G) {
        const mines = G.projectiles.filter((p) => p.owner === s && p.kind === 'mine');
        if (mines.length >= 8) mines[0].expire(G);
        shoot(s, G, { speed: -50, inherit: 0.3, kind: 'mine', dmg: 6, life: 14, r: 11, arm: 0.7, hp: 1, fwd: -s.r - 12, color: '#ff9ec4' });
        Sound.mine();
      },
    },
    special: {
      cost: 9, cd: 1.6,
      fn(s, G) {
        s.vx += Math.cos(s.angle) * 480;
        s.vy += Math.sin(s.angle) * 480;
        s.boost = 0.8;
        const bx = s.x - Math.cos(s.angle) * 40, by = s.y - Math.sin(s.angle) * 40;
        G.clouds.push(new Cloud({ x: bx, y: by, vx: -Math.cos(s.angle) * 90, vy: -Math.sin(s.angle) * 90, r: 120, life: 2.5, team: s.team, owner: s, kind: 'fart', dmg: 3 }));
        Sound.prut();
        Fx.text(bx, by - 30, 'PRUUUT!', '#b6ff6a', 34);
      },
    },
    draw(c, s, t) {
      // Jetpakke
      roundRect(c, -18, -18, 16, 10, 3);
      c.fillStyle = '#8a8fa0'; c.fill(); c.strokeStyle = '#333'; c.lineWidth = 1.5; c.stroke();
      // Lille vinge der basker
      c.save();
      c.translate(-2, -12);
      c.rotate(-0.5 + Math.sin(t * 22) * 0.6);
      ellipse(c, -6, 0, 9, 4, 0, '#ffffff', '#b0b0c8', 1.2);
      c.restore();
      // Ben
      for (let i = 0; i < 4; i++) {
        const x = -12 + i * 7;
        const k = Math.sin(t * 10 + i * 1.6) * 2;
        c.fillStyle = '#e07aa0';
        c.fillRect(x + k * 0.5, 10, 4, 7);
      }
      // Krøllet hale
      c.strokeStyle = '#e07aa0'; c.lineWidth = 2.2;
      c.beginPath();
      for (let i = 0; i <= 20; i++) {
        const a = i * 0.6 + t * 4;
        const r = 2 + i * 0.25;
        const x = -24 + Math.cos(a) * r - i * 0.4, y = -2 + Math.sin(a) * r;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
      ellipse(c, 0, 0, 21, 14, 0, '#ff9ec4', '#a0406a', 2.5);
      ellipse(c, -4, 4, 12, 6, 0, 'rgba(255,200,220,0.6)');
      // Øre
      poly(c, [7, -11, 12, -21, 16, -9], '#ff8ab4', '#a0406a', 2);
      // Tryne
      ellipse(c, 21, 2, 5.5, 6.5, 0, '#ff7aa8', '#a0406a', 2);
      circle(c, 21, 0, 1.4, '#7a2040');
      circle(c, 21, 4.5, 1.4, '#7a2040');
      circle(c, 12, -4, 3.2, '#fff', '#5a2040', 1);
      circle(c, 13, -4, 1.7, '#111');
      // Rosa kinder
      circle(c, 12, 4, 3, 'rgba(255,90,140,0.5)');
    },
  },
  {
    id: 'haj', name: 'Hajen', color: '#8fa3b8', flip: true,
    tagline: 'En rum-haj med skarpe tænder',
    strong: 'Missiler der selv finder fjenden',
    weak: 'Skyder ikke så tit',
    specialName: 'BID! – kort turbo hvor den bider hårdt',
    hp: 22, speed: 340, accel: 330, turn: 3.1, energy: 22, regen: 4.5, radius: 25, mass: 1.3,
    stats: { fart: 3, drej: 2, liv: 4, vaaben: 4, energi: 3 },
    flame: ['#aef', '#6af', '#fff'], engines: [[-30, 0]],
    ai: { shotSpeed: 450, range: 800, style: 'missile' },
    fire: {
      cost: 5, cd: 0.85,
      fn(s, G) {
        shoot(s, G, { speed: 260, inherit: 0.6, kind: 'missile', dmg: 3.5, life: 3.4, r: 7, homing: 3.3, maxSpeed: 540, hp: 1, color: '#ffb030', fwd: 10, side: 18 * (s.gunSide = -(s.gunSide || 1)) });
        Sound.missile();
      },
    },
    special: {
      cost: 10, cd: 2.8,
      fn(s) { s.bite = 1.3; s.boost = 1.3; Sound.chomp(); Fx.text(s.x, s.y - 40, 'BID!', '#ff5a5a', 30); },
    },
    draw(c, s, t) {
      const tail = Math.sin(t * (s.thrusting ? 14 : 5)) * 3;
      c.beginPath();
      c.moveTo(32, 0);
      c.quadraticCurveTo(20, -14, -10, -10);
      c.lineTo(-24, -4);
      c.lineTo(-38, -17 + tail);
      c.lineTo(-33, 0);
      c.lineTo(-38, 15 + tail);
      c.lineTo(-24, 4);
      c.lineTo(-10, 10);
      c.quadraticCurveTo(20, 13, 32, 0);
      c.fillStyle = '#7f93a8'; c.fill();
      c.strokeStyle = '#26323f'; c.lineWidth = 2.5; c.lineJoin = 'round'; c.stroke();
      ellipse(c, 6, 6, 20, 4.5, 0, '#e8f0f5');
      poly(c, [-2, -11, -12, -27, -15, -10], '#6a7e93', '#26323f', 2);
      poly(c, [4, 8, -5, 20, -9, 8], '#6a7e93', '#26323f', 2);
      c.strokeStyle = '#3a4a5a'; c.lineWidth = 1.5;
      for (const x of [6, 9, 12]) { c.beginPath(); c.moveTo(x, -6); c.lineTo(x - 2, 1); c.stroke(); }
      circle(c, 20, -4, 2.8, '#111');
      circle(c, 20.8, -4.8, 0.9, '#fff');
      if (s.bite > 0) {
        const open = 5 + Math.abs(Math.sin(t * 18)) * 6;
        poly(c, [33, -1, 14, 2, 33, open + 2], '#8a1a2a', '#26323f', 1.5);
        for (let i = 0; i < 4; i++) {
          const x = 30 - i * 4.5;
          poly(c, [x, 0, x - 2, 3, x - 4, 0], '#fff');
          poly(c, [x, open + 1 - i * 0.6, x - 2, open - 2.5 - i * 0.6, x - 4, open + 1 - i * 0.6], '#fff');
        }
      } else {
        c.strokeStyle = '#26323f'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(30, 2); c.quadraticCurveTo(22, 5, 15, 3); c.stroke();
        for (let i = 0; i < 3; i++) poly(c, [27 - i * 4, 3, 25 - i * 4, 5.5, 23 - i * 4, 3.4], '#fff');
      }
    },
  },
];

// Fjender i bølge-spillet. De styres altid af computeren.
const ENEMY_DEFS = {
  drone: {
    id: 'drone', name: 'Øje-drone', color: '#ff4a4a', score: 100,
    hp: 3, speed: 240, accel: 260, turn: 3, energy: 10, regen: 3, radius: 15, mass: 0.6,
    flame: ['#f84', '#fa4'], engines: [[-14, 0]],
    ai: { shotSpeed: 420, range: 520, style: 'gun' },
    fire: {
      cost: 2, cd: 1.1,
      fn(s, G) { shoot(s, G, { speed: 420, kind: 'enemy', dmg: 1, life: 1.4, r: 4, color: '#ff5050' }); Sound.zap(); },
    },
    draw(c, s, t) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + t;
        poly(c, [Math.cos(a - 0.25) * 12, Math.sin(a - 0.25) * 12, Math.cos(a) * 18, Math.sin(a) * 18, Math.cos(a + 0.25) * 12, Math.sin(a + 0.25) * 12], '#7a1a1a');
      }
      circle(c, 0, 0, 13, '#d83a3a', '#4a0a0a', 2);
      circle(c, 3, 0, 7.5, '#fff');
      circle(c, 5.5, 0, 3.8, '#111');
      circle(c, 6.5, -1.3, 1.2, '#fff');
    },
  },
  jaeger: {
    id: 'jaeger', name: 'Jæger', color: '#ff7a2a', score: 200,
    hp: 6, speed: 360, accel: 420, turn: 4, energy: 12, regen: 4, radius: 17, mass: 0.8,
    flame: ['#f84', '#ff4'], engines: [[-16, -6], [-16, 6]],
    ai: { shotSpeed: 650, range: 600, style: 'gun' },
    fire: {
      cost: 2, cd: 0.55,
      fn(s, G) {
        for (const side of [-7, 7]) shoot(s, G, { speed: 650, kind: 'enemy', dmg: 1, life: 1, r: 3.5, color: '#ff9a3a', side });
        Sound.zap();
      },
    },
    draw(c, s, t) {
      poly(c, [22, 0, 0, -8, -6, -18, -16, -14, -12, -4, -16, 0, -12, 4, -16, 14, -6, 18, 0, 8], '#9a1a1a', '#2a0505', 2);
      poly(c, [14, 0, 0, -4, -8, 0, 0, 4], '#ff4a2a');
      const glow = 0.6 + Math.sin(t * 8) * 0.4;
      circle(c, 4, -3, 2.2, `rgba(255,240,80,${glow})`);
      circle(c, 4, 3, 2.2, `rgba(255,240,80,${glow})`);
    },
  },
  minelaegger: {
    id: 'minelaegger', name: 'Mine-krabbe', color: '#c24ad8', score: 250,
    hp: 9, speed: 210, accel: 200, turn: 2.2, energy: 12, regen: 3, radius: 22, mass: 1.4,
    flame: ['#c6f', '#f8f'], engines: [[-20, 0]],
    ai: { shotSpeed: 0, range: 500, style: 'mines' },
    fire: {
      cost: 5, cd: 2.4,
      fn(s, G) { shoot(s, G, { speed: -40, inherit: 0.3, kind: 'mine', dmg: 3, life: 12, r: 10, arm: 1, hp: 1, fwd: -s.r - 10, color: '#c24ad8' }); Sound.mine(); },
    },
    draw(c, s, t) {
      const snap = Math.sin(t * 6) * 0.25;
      for (const sy of [-1, 1]) {
        c.save();
        c.translate(12, sy * 14);
        c.rotate(sy * (0.3 + snap));
        poly(c, [0, 0, 14, sy * -2, 18, sy * 4, 10, sy * 3, 14, sy * 9, 2, sy * 6], '#8a2a9a', '#2a0a30', 2);
        c.restore();
        for (let i = 0; i < 3; i++) {
          c.strokeStyle = '#6a1a7a'; c.lineWidth = 3;
          c.beginPath(); c.moveTo(-6 + i * 7, sy * 12); c.lineTo(-10 + i * 7 + Math.sin(t * 8 + i) * 2, sy * 24); c.stroke();
        }
      }
      ellipse(c, 0, 0, 20, 16, 0, '#b03ac8', '#2a0a30', 2.5);
      for (const sy of [-1, 1]) {
        circle(c, 14, sy * 5, 4, '#fff', '#2a0a30', 1);
        circle(c, 15.5, sy * 5, 2, '#111');
      }
    },
  },
};
