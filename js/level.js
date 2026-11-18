// En bane bygget ud fra et tekst-kort (se levels.js).
class Level {
  constructor(def) {
    this.def = def;
    this.theme = THEMES[def.theme] || THEMES.jungle;
    const rows = def.map;
    this.h = rows.length;
    this.w = Math.max(...rows.map((r) => r.length));
    this.grid = [];
    this.bananas = [];
    this.items = [];
    this.cannons = [];
    this.checkpoints = [];
    this.movers = [];
    this.finish = null;
    this.start = { x: 80, y: 100 };

    for (let r = 0; r < this.h; r++) {
      const row = [];
      for (let c = 0; c < this.w; c++) {
        const ch = rows[r][c] || ' ';
        const x = c * TILE;
        const y = r * TILE;
        let tile = ' ';
        switch (ch) {
          case '=': case '-': case 'L': case '~':
            tile = ch; break;
          case 'B':
            tile = 'B';
            this.cannons.push({ x, y, w: TILE, h: TILE, timer: 1 + Math.random() * 1.5, dir: -1, puff: 0 });
            break;
          case 'P': this.start = { x: x + 7, y: y + TILE - 36 }; break;
          case 'F': this.finish = { x, y: y + TILE - 120, w: TILE, h: 120 }; break;
          case 'o': this.bananas.push({ x: x + 20, y: y + 20, taken: false }); break;
          case 'C': this.checkpoints.push({ x, y, reached: false, wave: 0 }); break;
          case 'M': this.movers.push({ x0: x, x, y, w: TILE * 3, h: 16, dx: 0, t: rnd(c) * 6 }); break;
          case 'H': case 'S': case 'W':
            this.items.push({ type: ch, x: x + 20, y: y + 20, taken: false }); break;
        }
        row.push(tile);
      }
      this.grid.push(row);
    }
  }

  tile(c, r) {
    if (c < 0 || c >= this.w) return '=';
    if (r < 0 || r >= this.h) return ' ';
    return this.grid[r][c];
  }

  solidAt(c, r) {
    const t = this.tile(c, r);
    return t === '=' || t === 'B';
  }

  update(dt) {
    for (const m of this.movers) {
      m.t += dt;
      const nx = m.x0 + Math.sin(m.t * 1.1) * TILE * 2;
      m.dx = nx - m.x;
      m.x = nx;
    }
  }

  // Flytter en krop (abe eller tønde) og stopper den ved vægge og gulve.
  moveBody(b, dt) {
    b.onGround = false;
    b.hitWall = 0;
    b.landVy = 0;
    b.riding = null;

    // Vandret
    b.x += b.vx * dt;
    const top = Math.floor(b.y / TILE);
    const bot = Math.floor((b.y + b.h - 0.01) / TILE);
    if (b.vx > 0) {
      const c = Math.floor((b.x + b.w) / TILE);
      for (let r = top; r <= bot; r++) {
        if (this.solidAt(c, r)) { b.x = c * TILE - b.w - 0.01; b.hitWall = 1; break; }
      }
    } else if (b.vx < 0) {
      const c = Math.floor(b.x / TILE);
      for (let r = top; r <= bot; r++) {
        if (this.solidAt(c, r)) { b.x = (c + 1) * TILE + 0.01; b.hitWall = -1; break; }
      }
    }

    // Lodret
    const prevBottom = b.y + b.h;
    b.y += b.vy * dt;
    const l = Math.floor(b.x / TILE);
    const rr = Math.floor((b.x + b.w - 0.01) / TILE);
    if (b.vy > 0) {
      const r = Math.floor((b.y + b.h) / TILE);
      for (let c = l; c <= rr; c++) {
        const ch = this.tile(c, r);
        if (ch === '=' || ch === 'B' || (ch === '-' && prevBottom <= r * TILE + 1)) {
          b.landVy = b.vy;
          b.y = r * TILE - b.h;
          b.vy = 0;
          b.onGround = true;
          break;
        }
      }
    } else if (b.vy < 0) {
      const r = Math.floor(b.y / TILE);
      for (let c = l; c <= rr; c++) {
        if (this.solidAt(c, r)) { b.y = (r + 1) * TILE; b.vy = 0; break; }
      }
    }

    // Bevægelige platforme
    if (!b.onGround && b.vy >= 0) {
      for (const m of this.movers) {
        if (b.x + b.w > m.x + 2 && b.x < m.x + m.w - 2 && prevBottom <= m.y + 2 && b.y + b.h >= m.y) {
          b.landVy = b.vy;
          b.y = m.y - b.h;
          b.vy = 0;
          b.onGround = true;
          b.riding = m;
          break;
        }
      }
    }
  }

  // Rører kroppen lava eller vand?
  hazardAt(b) {
    const l = Math.floor((b.x + 4) / TILE);
    const r = Math.floor((b.x + b.w - 4) / TILE);
    const row = Math.floor((b.y + b.h - 2) / TILE);
    for (let c = l; c <= r; c++) {
      const ch = this.tile(c, row);
      if ((ch === 'L' || ch === '~') && b.y + b.h > row * TILE + 14) return ch;
    }
    return null;
  }

  isTop(c, r) {
    const above = this.tile(c, r - 1);
    return above !== '=' && above !== 'B';
  }

  // ---------- Tegning ----------
  drawTiles(ctx, camX, t) {
    const th = this.theme;
    const c0 = Math.max(0, Math.floor(camX / TILE) - 1);
    const c1 = Math.min(this.w - 1, Math.floor((camX + W) / TILE) + 1);
    for (let r = 0; r < this.h; r++) {
      for (let c = c0; c <= c1; c++) {
        const ch = this.grid[r][c];
        const x = c * TILE;
        const y = r * TILE;
        if (ch === '=') this.drawSolid(ctx, x, y, c, r, th, t);
        else if (ch === '-') this.drawThin(ctx, x, y, c, th, t);
        else if (ch === 'L') this.drawLiquid(ctx, x, y, c, t, ['#ff4a1a', '#ffb02e', '#ffe36b'], 'rgba(255,120,30,0.35)');
        else if (ch === '~') this.drawLiquid(ctx, x, y, c, t, ['#1f7fd1', '#4fb6ff', '#c9f0ff'], null);
      }
    }
  }

  drawSolid(ctx, x, y, c, r, th, t) {
    const top = this.isTop(c, r);
    if (th.cloudy) {
      // Fast sky: hvid med gul-lyserød kant, så den skiller sig ud fra baggrunden
      ctx.fillStyle = '#ffe3f1';
      ctx.fillRect(x, y + (top ? 8 : 0), TILE, TILE - (top ? 8 : 0));
      ctx.fillStyle = th.ground;
      ctx.fillRect(x, y + (top ? 10 : 0), TILE, TILE - (top ? 14 : 4));
      if (top) {
        circle(ctx, x + 10, y + 14, 12, '#ffc6e2');
        circle(ctx, x + 28, y + 12, 14, '#ffc6e2');
        circle(ctx, x + 10, y + 15, 10, '#ffffff');
        circle(ctx, x + 28, y + 13, 12, '#ffffff');
      }
      return;
    }
    ctx.fillStyle = th.ground;
    ctx.fillRect(x, y, TILE, TILE);
    if (th.bricks) {
      ctx.strokeStyle = th.groundDark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + 20); ctx.lineTo(x + 40, y + 20);
      ctx.moveTo(x, y + 39); ctx.lineTo(x + 40, y + 39);
      ctx.moveTo(x + 20, y); ctx.lineTo(x + 20, y + 20);
      ctx.moveTo(x + 1, y + 20); ctx.lineTo(x + 1, y + 40);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x + 3, y + 3, 14, 4);
    } else {
      ctx.fillStyle = th.groundDark;
      for (let i = 0; i < 3; i++) {
        const px = x + 4 + rnd(c * 7 + r * 13 + i) * 30;
        const py = y + 6 + rnd(c * 3 + r * 17 + i * 5) * 28;
        ctx.fillRect(px, py, 5, 4);
      }
    }
    if (top) {
      ctx.fillStyle = th.top;
      ctx.fillRect(x, y, TILE, 10);
      if (th.grass) {
        for (let i = 0; i < 4; i++) {
          const gx = x + 4 + i * 10;
          ctx.beginPath();
          ctx.moveTo(gx, y + 10);
          ctx.lineTo(gx + 3 + Math.sin(t * 2 + c + i) * 1.5, y + 2 - rnd(c * 4 + i) * 6);
          ctx.lineTo(gx + 6, y + 10);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(x, y, TILE, 3);
      }
    }
  }

  drawThin(ctx, x, y, c, th, t) {
    if (th.cloudy) {
      circle(ctx, x + 8, y + 10, 11, '#ffc6e2');
      circle(ctx, x + 22, y + 7, 13, '#ffc6e2');
      circle(ctx, x + 34, y + 10, 10, '#ffc6e2');
      circle(ctx, x + 8, y + 12, 10, '#ffffff');
      circle(ctx, x + 22, y + 9, 12, '#ffffff');
      circle(ctx, x + 34, y + 12, 9, '#ffffff');
      ctx.fillStyle = '#dcebfb';
      ctx.fillRect(x, y + 14, TILE, 6);
      return;
    }
    ctx.fillStyle = th.plat;
    roundRect(ctx, x, y, TILE, 16, 4);
    ctx.fill();
    ctx.fillStyle = th.platTop;
    ctx.fillRect(x + 2, y + 2, TILE - 4, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + TILE - 3, y + 2, 2, 12);
    circle(ctx, x + 8, y + 10, 2, 'rgba(0,0,0,0.35)');
    circle(ctx, x + 32, y + 10, 2, 'rgba(0,0,0,0.35)');
  }

  drawLiquid(ctx, x, y, c, t, cols, glow) {
    const surf = y + 12;
    ctx.fillStyle = cols[0];
    ctx.fillRect(x, surf, TILE, TILE - 12);
    ctx.fillStyle = cols[1];
    ctx.beginPath();
    ctx.moveTo(x, y + TILE);
    for (let i = 0; i <= 8; i++) {
      const wx = x + i * 5;
      ctx.lineTo(wx, surf + Math.sin(t * 3 + wx * 0.08) * 3);
    }
    ctx.lineTo(x + TILE, y + TILE);
    ctx.fill();
    ctx.fillStyle = cols[2];
    const bx = x + ((t * 20 + c * 13) % TILE);
    ctx.fillRect(bx, surf + 2 + Math.sin(t * 3 + bx * 0.08) * 3, 6, 3);
    if (glow) {
      ctx.fillStyle = glow;
      ctx.fillRect(x, y - 10, TILE, 22);
    }
  }

  drawMovers(ctx, t) {
    for (const m of this.movers) {
      if (this.theme.cloudy) {
        for (let i = 0; i < 4; i++) circle(ctx, m.x + 15 + i * 30, m.y + 7, 14, '#ffc6e2');
        for (let i = 0; i < 4; i++) circle(ctx, m.x + 15 + i * 30, m.y + 9, 12, '#ffffff');
        continue;
      }
      ctx.fillStyle = '#5b4636';
      roundRect(ctx, m.x, m.y, m.w, m.h, 5);
      ctx.fill();
      ctx.fillStyle = '#ffcc33';
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(m.x + 6 + i * 19, m.y + 4, 9, 8);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(m.x + 3, m.y + 1, m.w - 6, 2);
    }
  }

  drawCheckpoints(ctx, t) {
    for (const cp of this.checkpoints) {
      const px = cp.x + 20;
      const base = cp.y + TILE;
      ctx.fillStyle = '#ddd';
      ctx.fillRect(px - 2, base - 80, 4, 80);
      circle(ctx, px, base - 82, 5, '#ffd700');
      const fy = cp.reached ? base - 78 : base - 30;
      const col = cp.reached ? '#3ddc5a' : '#e33b3b';
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(px + 2, fy);
      const wave = Math.sin(t * 6) * 4;
      ctx.quadraticCurveTo(px + 16, fy + 4 + wave, px + 30, fy + 10);
      ctx.lineTo(px + 2, fy + 22);
      ctx.fill();
      if (cp.reached) drawBanana(ctx, px + 13, fy + 12, t, 0.5);
    }
  }

  drawFinish(ctx, t) {
    const f = this.finish;
    if (!f) return;
    const px = f.x + 20;
    // stang
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(px - 4, f.y + 10, 8, f.h - 10);
    ctx.fillStyle = '#6b4220';
    ctx.fillRect(px - 14, f.y + f.h - 8, 28, 8);
    // flag
    ctx.fillStyle = '#ff5bb0';
    ctx.beginPath();
    ctx.moveTo(px + 4, f.y + 20);
    for (let i = 0; i <= 10; i++) {
      ctx.lineTo(px + 4 + i * 5, f.y + 20 + Math.sin(t * 6 + i * 0.7) * 4);
    }
    for (let i = 10; i >= 0; i--) {
      ctx.lineTo(px + 4 + i * 5, f.y + 52 + Math.sin(t * 6 + i * 0.7) * 4);
    }
    ctx.fill();
    text(ctx, 'MÅL', px + 30, f.y + 37 + Math.sin(t * 6 + 5) * 3, 14, '#fff', 'center', '#a0206a');
    // stor bananklase på toppen
    const bob = Math.sin(t * 4) * 3;
    for (let i = -2; i <= 2; i++) {
      ctx.save();
      ctx.translate(px + i * 6, f.y + 6 + bob);
      ctx.rotate(i * 0.35);
      drawBanana(ctx, 0, 0, 0, 1.1);
      ctx.restore();
    }
    // glimt
    const s = (t * 2) % 1;
    drawStarShape(ctx, px - 22 + s * 10, f.y - 8, 6 * (1 - s), t * 3, '#fff8b0');
  }
}
