// Titelskærm, pause, game over og sejr.
const Menu = {
  choice: 0, // 0 = 1 spiller, 1 = 2 spillere

  updateTitle() {
    if (Input.hit('ArrowUp', 'KeyW', 'ArrowLeft', 'KeyA')) { this.choice = 0; Sound.tick(); }
    if (Input.hit('ArrowDown', 'KeyS', 'ArrowRight', 'KeyD')) { this.choice = 1; Sound.tick(); }
    if (Input.hit('Digit1', 'Numpad1')) { this.choice = 0; Game.startGame(1); return; }
    if (Input.hit('Digit2', 'Numpad2')) { this.choice = 1; Game.startGame(2); return; }
    if (Input.confirm() || Input.hit('KeyF', 'KeyL')) { Sound.select(); Game.startGame(this.choice + 1); }
  },

  panel(x, y, w, h, alpha = 0.55) {
    Draw.roundRect(x, y, w, h, 20);
    ctx.fillStyle = `rgba(10,30,60,${alpha})`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
  },

  drawTitle() {
    const t = Game.t;
    // titel der vipper lidt
    ctx.save();
    ctx.translate(W / 2, 130);
    ctx.rotate(Math.sin(t * 1.5) * 0.03);
    Draw.text('Himmel-Heltene', 0, 0, 72, '#ffd166', 'center', '#123056');
    ctx.restore();
    Draw.text('Skyd de gnavne fly ned – piloterne hopper ud i faldskærm!', W / 2, 200, 21, '#fff');

    // to fly der flyver på titelskærmen
    drawPlaneShadow(W / 2 - 90, 330 + Math.sin(t * 2) * 10, 0, 1.3);
    drawPlane({ x: W / 2 - 90, y: 330 + Math.sin(t * 2) * 10, scale: 1.3, look: PLAYER_LOOKS[0], prop: t * 45, bank: Math.sin(t) * 0.3 });
    if (this.choice === 1) {
      drawPlaneShadow(W / 2 + 90, 340 + Math.sin(t * 2 + 1) * 10, 0, 1.3);
      drawPlane({ x: W / 2 + 90, y: 340 + Math.sin(t * 2 + 1) * 10, scale: 1.3, look: PLAYER_LOOKS[1], prop: t * 45, bank: Math.sin(t + 1) * 0.3 });
    }
    drawPlane({ x: W / 2 + (this.choice ? 230 : 140), y: 260 + Math.sin(t * 3) * 6, angle: Math.PI, scale: 0.6, look: ENEMY_LOOKS.purple,
      prop: t * 40, eyes: { x: Math.sin(t), y: -1 } });

    // vælg antal spillere
    const opts = ['1 spiller', '2 spillere (sammen)'];
    opts.forEach((o, i) => {
      const y = 450 + i * 64, sel = this.choice === i;
      this.panel(W / 2 - 200, y - 26, 400, 52, sel ? 0.75 : 0.35);
      Draw.text((sel ? '▶ ' : '') + o, W / 2, y, sel ? 32 : 26, sel ? '#ffd166' : '#dfefff');
    });

    // taster
    this.panel(40, 590, W - 80, 250);
    if (this.choice === 0) {
      Draw.text('Sådan flyver du', W / 2, 620, 26, '#ffd166');
      KEY_HELP.solo.forEach((s, i) => Draw.text(s, W / 2, 662 + i * 38, 26, '#fff'));
    } else {
      Draw.text('Spiller 1 (rød)', W / 2 - 160, 620, 24, '#ff8f98');
      Draw.text('Spiller 2 (blå)', W / 2 + 160, 620, 24, '#8fc2ff');
      KEY_HELP.p1.forEach((s, i) => Draw.text(s, W / 2 - 160, 662 + i * 38, 22, '#fff'));
      KEY_HELP.p2.forEach((s, i) => Draw.text(s, W / 2 + 160, 662 + i * 38, 22, '#fff'));
    }
    Draw.text('Fang power-ups: bedre skud · hjerter · skjold · magnet · venne-fly', W / 2, 790, 18, '#dfefff');
    Draw.text('P pause · M lyd · ESC menu', W / 2, 818, 17, '#b8d4ee');

    if (Math.floor(t * 2) % 2 === 0) Draw.text('Tryk MELLEMRUM eller ENTER for at flyve!', W / 2, 880, 26, '#fff');
    if (Game.highscore) Draw.text(`Rekord: ${Game.highscore.toLocaleString('da-DK')}`, W / 2, 925, 20, '#ffd166');
  },

  drawPause() {
    ctx.fillStyle = 'rgba(10,30,60,0.5)';
    ctx.fillRect(0, 0, W, H);
    Draw.text('Pause', W / 2, H / 2 - 30, 70, '#ffd166');
    Draw.text('Tryk P for at flyve videre', W / 2, H / 2 + 40, 26);
    Draw.text('ESC = tilbage til menuen', W / 2, H / 2 + 80, 20, '#cfe8ff');
  },

  drawGameOver() {
    ctx.fillStyle = 'rgba(10,30,60,0.45)';
    ctx.fillRect(0, 0, W, H);
    this.panel(70, 290, W - 140, 360, 0.7);
    Draw.text('Godt fløjet!', W / 2, 350, 60, '#ffd166');
    Draw.text(`Du nåede bane ${Game.level + 1}`, W / 2, 420, 28);
    Draw.text(`${Game.score.toLocaleString('da-DK')} point`, W / 2, 475, 40, '#fff');
    if (Game.newHigh) Draw.text('NY REKORD!', W / 2, 530, 34, '#7cff9e');
    if (Game.stateTime > 1.2 && Math.floor(Game.t * 2) % 2 === 0) Draw.text('ENTER = prøv igen · ESC = menu', W / 2, 600, 24, '#fff');
  },

  drawLevelClear() {
    if (Game.stateTime < 0.4) return;
    Draw.text('Bane klaret!', W / 2, H / 2 - 60, 66, '#ffd166');
    Draw.text(`Bonus +${(5000 * (Game.loop + 1)).toLocaleString('da-DK')}`, W / 2, H / 2 + 10, 32, '#fff');
    Draw.text('Alle fly får 2 hjerter igen', W / 2, H / 2 + 56, 24, '#ff8fab');
  },

  drawVictory() {
    ctx.fillStyle = 'rgba(10,30,60,0.35)';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2 - 120);
    const s = 1 + Math.sin(Game.t * 4) * 0.04;
    ctx.scale(s, s);
    Draw.text(Game.players.length > 1 ? 'I er Himmel-Helte!' : 'Du er en Himmel-Helt!', 0, 0, 56, '#ffd166');
    ctx.restore();
    Draw.text('Alle fem Brumle-Zeppelinere er besejret!', W / 2, H / 2 - 40, 26);
    Draw.text(`${Game.score.toLocaleString('da-DK')} point`, W / 2, H / 2 + 20, 40);
    if (Game.newHigh) Draw.text('NY REKORD!', W / 2, H / 2 + 72, 32, '#7cff9e');
    if (Game.stateTime > 2 && Math.floor(Game.t * 2) % 2 === 0) {
      Draw.text('ENTER = flyv videre (sværere!)', W / 2, H / 2 + 140, 26);
      Draw.text('ESC = menu', W / 2, H / 2 + 180, 20, '#cfe8ff');
    }
  },
};
