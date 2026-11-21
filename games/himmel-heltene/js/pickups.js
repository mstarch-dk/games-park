// Power-ups og mønter. Store, tydelige og langsomme – og de trækkes lidt hen mod flyet, så de er lette at fange.
const PICKUP_INFO = {
  weapon: { color: '#ffd166', r: 24 },
  heart: { color: '#ff8fab', r: 24 },
  shield: { color: '#9bf6ff', r: 24 },
  magnet: { color: '#ffadad', r: 24 },
  special: { color: '#b9fbc0', r: 24 },
  rescue: { color: '#ffffff', r: 26 },
  coin: { color: '#ffd23f', r: 11, value: 50 },
  medal: { color: '#ffd23f', r: 15, value: 500 },
};

const Pickups = {
  list: [],

  clear() { this.list = []; },

  spawn(type, x, y, vx = 0, vy = 0) {
    this.list.push({ type, x: clamp(x, 30, W - 30), y, vx, vy, t: rand(0, TAU), r: PICKUP_INFO[type].r, dead: false });
  },

  coins(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(40, 140);
      this.spawn(i === 0 && n >= 10 ? 'medal' : 'coin', x, y, Math.cos(a) * s, Math.sin(a) * s - 40);
    }
  },

  has(type) { return this.list.some((p) => p.type === type); },

  // Vælg et power-up der passer til hvad spillerne mangler
  dropPowerUp(x, y) {
    const ps = Game.players.filter((p) => p.alive);
    const bag = ['weapon', 'weapon', 'shield', 'magnet', 'special'];
    if (ps.some((p) => p.weapon < 3)) bag.push('weapon', 'weapon');
    if (ps.some((p) => p.hp <= 3)) bag.push('heart', 'heart', 'heart');
    else bag.push('heart');
    this.spawn(pick(bag), x, y);
  },

  update(dt) {
    const players = Game.players.filter((p) => p.alive);
    for (const it of this.list) {
      it.t += dt;
      const isCoin = it.type === 'coin' || it.type === 'medal';
      // bremser og falder roligt med havet
      it.vx *= 0.94;
      it.vy = it.vy * 0.94 + (isCoin ? Background.speed + 20 : 75) * 0.06;
      it.x += it.vx * dt + (isCoin ? 0 : Math.sin(it.t * 2) * 30 * dt);
      it.y += it.vy * dt;
      for (const p of players) {
        const d = dist(it.x, it.y, p.x, p.y);
        const pull = (p.magnetT > 0 && isCoin && d < 340) ? 520 : d < 110 ? 220 : 0;
        if (pull) {
          it.x += ((p.x - it.x) / d) * pull * dt;
          it.y += ((p.y - it.y) / d) * pull * dt;
        }
        if (d < it.r + 30) { this.collect(p, it); break; }
      }
      if (it.y > H + 40) it.dead = true;
    }
    this.list = this.list.filter((it) => !it.dead);
  },

  collect(p, it) {
    it.dead = true;
    const say = (s, c = '#fff') => Particles.text(p.x, p.y - 50, s, c, 26);
    switch (it.type) {
      case 'coin':
      case 'medal':
        Game.addScore(PICKUP_INFO[it.type].value, it.x, it.y, it.type === 'medal');
        Sound.coin();
        return;
      case 'weapon':
        if (p.weapon < MAX_WEAPON) { p.weapon++; say(p.weapon === MAX_WEAPON ? 'REGNBUESKUD!' : 'Bedre skud!', '#ffd166'); }
        else { Game.addScore(1000, p.x, p.y); say('Super! +1000', '#ffd166'); }
        Sound.powerUp();
        break;
      case 'heart':
        p.heal(2); say('+2 hjerter', '#ff8fab'); Sound.heal();
        break;
      case 'shield':
        p.shieldT = 8; say('Skjold!', '#9bf6ff'); Sound.shield();
        break;
      case 'magnet':
        p.magnetT = 12; say('Mønt-magnet!', '#ffd166'); Sound.pickup();
        break;
      case 'special':
        p.specials = Math.min(MAX_SPECIALS, p.specials + 1); say('+1 venne-fly', '#b9fbc0'); Sound.pickup();
        break;
      case 'rescue':
        Game.rescue(p);
        break;
    }
    Particles.sparks(it.x, it.y, 10, PICKUP_INFO[it.type].color);
  },

  drawIcon(type, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.5;
    switch (type) {
      case 'weapon':
        Draw.star(0, 0, 15, '#ff9f1c');
        Draw.text('P', 0, 1, 17, '#fff', 'center', OUTLINE);
        break;
      case 'heart':
        Draw.heart(0, 2, 26, '#ff4d6d');
        break;
      case 'shield':
        ctx.beginPath();
        ctx.moveTo(0, -14); ctx.lineTo(12, -9); ctx.lineTo(10, 5); ctx.quadraticCurveTo(6, 12, 0, 15);
        ctx.quadraticCurveTo(-6, 12, -10, 5); ctx.lineTo(-12, -9); ctx.closePath();
        ctx.fillStyle = '#3a86ff'; ctx.fill(); ctx.stroke();
        break;
      case 'magnet':
        ctx.lineWidth = 8; ctx.lineCap = 'butt';
        ctx.strokeStyle = '#e63946';
        ctx.beginPath(); ctx.arc(0, -1, 9, Math.PI, 0, true); ctx.stroke();
        ctx.strokeStyle = '#f1f1f1';
        ctx.beginPath(); ctx.moveTo(-9, -1); ctx.lineTo(-9, -12); ctx.moveTo(9, -1); ctx.lineTo(9, -12); ctx.stroke();
        break;
      case 'special':
        drawPlane({ x: 0, y: 2, scale: 0.3, look: { body: '#2a9d8f', wing: '#ffffff', stripe: '#2a9d8f', nose: '#ffd166' }, prop: Game.t * 40 });
        break;
      case 'rescue':
        ctx.lineWidth = 9;
        for (let i = 0; i < 4; i++) {
          ctx.strokeStyle = i % 2 ? '#ffffff' : '#ff4d4d';
          ctx.beginPath(); ctx.arc(0, 0, 14, (i * TAU) / 4, ((i + 1) * TAU) / 4); ctx.stroke();
        }
        break;
    }
    ctx.restore();
  },

  draw() {
    for (const it of this.list) {
      if (it.type === 'coin' || it.type === 'medal') {
        const w = Math.abs(Math.cos(it.t * 5)) * it.r + 2;
        Draw.ellipse(it.x, it.y, w, it.r, '#ffd23f');
        ctx.strokeStyle = '#b5838d'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(it.x, it.y, w, it.r, 0, 0, TAU); ctx.stroke();
        if (it.type === 'medal') Draw.star(it.x, it.y, 8, '#fff3b0');
        continue;
      }
      const bob = Math.sin(it.t * 4) * 3;
      ctx.globalAlpha = 0.35 + Math.sin(it.t * 6) * 0.15;
      Draw.circle(it.x, it.y + bob, it.r + 10, PICKUP_INFO[it.type].color);
      ctx.globalAlpha = 1;
      Draw.circle(it.x, it.y + bob, it.r, '#ffffff');
      ctx.strokeStyle = PICKUP_INFO[it.type].color === '#ffffff' ? '#ff4d4d' : PICKUP_INFO[it.type].color;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(it.x, it.y + bob, it.r, 0, TAU); ctx.stroke();
      this.drawIcon(it.type, it.x, it.y + bob);
    }
  },
};
