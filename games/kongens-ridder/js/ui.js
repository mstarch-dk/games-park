// Knapper, dialoger og tekst i fuld opløsning (960x600) oven på den pixelerede scene.
const FONT = 'Georgia, "Times New Roman", serif';
const INK = '#3a2410', PARCH = '#ecd9a8', GOLD = '#f0c838';

const UI = {
  buttons: [],   // knapper der er tegnet denne frame (bygges om hver frame)
  focus: 0,      // hvilken knap tastaturet står på
  dialog: null,  // { title, lines, buttons:[{label,onClick,enabled}], arms, wide }

  text(ctx, s, x, y, size = 20, color = INK, align = 'left', bold = false) {
    ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  },

  // Tekst med mørk skygge – til overskrifter oven på scener
  title(ctx, s, x, y, size = 40, color = GOLD) {
    ctx.font = `bold ${size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillText(s, x + 3, y + 3);
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  },

  wrap(ctx, s, maxW, size) {
    ctx.font = `${size}px ${FONT}`;
    const words = s.split(' '), lines = [];
    let cur = '';
    words.forEach((w) => {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  },

  panel(ctx, x, y, w, h, dark) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    ctx.fillStyle = dark ? 'rgba(30,20,40,0.85)' : Shade.lin(ctx, x, y, x, y + h, ['#fbf0d4', '#ecd3a0']);
    rrect(ctx, x, y, w, h, 14); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = dark ? 'rgba(255,204,61,0.6)' : '#c99a2e'; ctx.lineWidth = 2;
    rrect(ctx, x + 5, y + 5, w - 10, h - 10, 10); ctx.stroke();
  },

  // Billedtekst nederst – som i de gamle "film-spil"
  caption(ctx, s) {
    ctx.fillStyle = Shade.lin(ctx, 0, 540, 0, 600, ['rgba(20,12,30,0)', 'rgba(20,12,30,0.85)']);
    ctx.fillRect(0, 530, 960, 70);
    this.text(ctx, s, 480, 576, 22, PARCH, 'center');
  },

  beginFrame() { this.buttons = []; },

  // Tegn og registrér en knap. Returnerer true hvis den blev aktiveret med musen.
  button(ctx, x, y, w, h, label, opts = {}) {
    const idx = this.buttons.length;
    const b = { x, y, w, h, label, enabled: opts.enabled !== false, onClick: opts.onClick, key: opts.key };
    this.buttons.push(b);
    const m = Input.mouse;
    const hover = m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
    // Knapper bag en åben dialog (passive) må hverken fange musen eller vise markering
    if (hover && m.moved && b.enabled && !this.passive) this.focus = idx;
    const focused = !this.passive && this.focus === idx;
    const base = !b.enabled ? ['#b8aa90', '#a0927a'] : focused ? ['#e65560', '#b82830'] : ['#7a5230', '#5a3a1e'];
    ctx.save();
    if (b.enabled) { ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = focused ? 12 : 5; ctx.shadowOffsetY = 3; }
    ctx.fillStyle = Shade.lin(ctx, x, y, x, y + h, base);
    rrect(ctx, x, y, w, h, Math.min(12, h / 2.5)); ctx.fill();
    ctx.restore();
    if (focused && b.enabled) { ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; rrect(ctx, x + 1, y + 1, w - 2, h - 2, Math.min(11, h / 2.5)); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; rrect(ctx, x + 3, y + 2, w - 6, h * 0.4, Math.min(9, h / 3)); ctx.fill();
    const size = opts.size || Math.min(20, h * 0.5);
    this.text(ctx, label, x + w / 2, y + h / 2 + 1, size, b.enabled ? '#f8ecd0' : '#cbbf9f', 'center', focused);
    if (opts.keyHint) this.text(ctx, opts.keyHint, x + 8, y + h / 2, 13, '#d8c8a0', 'left');
    return b;
  },

  // Behandl tastatur/mus for de knapper der blev tegnet i denne frame.
  // mode: 'v' (pile op/ned), 'h' (pile venstre/højre) eller 'keys' (kun mus og genvejstaster)
  handleButtons(mode = 'v') {
    const bs = this.buttons;
    if (!bs.length) return;
    if (this.focus >= bs.length) this.focus = 0;
    const horizontal = mode === 'h';
    const move = (d) => {
      for (let i = 1; i <= bs.length; i++) {
        const j = (this.focus + d * i + bs.length * 4) % bs.length;
        if (bs[j].enabled) { this.focus = j; Sound.tick(); return; }
      }
    };
    if (mode !== 'keys') {
      if (horizontal ? Input.left() : Input.up()) move(-1);
      if (horizontal ? Input.right() : Input.dn()) move(1);
      if (!horizontal && (Input.left() || Input.right()) && bs.length > 1) move(Input.left() ? -1 : 1);
    }
    bs.forEach((b) => { if (b.key && Input.hit(...[].concat(b.key)) && b.enabled && b.onClick) { Sound.select(); b.onClick(); } });
    const m = Input.mouse;
    if (m.clicked) {
      const b = bs.find((bb) => m.x >= bb.x && m.x <= bb.x + bb.w && m.y >= bb.y && m.y <= bb.y + bb.h);
      if (b) { m.clicked = false; if (b.enabled && b.onClick) { Sound.select(); b.onClick(); } else Sound.deny(); return; }
    }
    if (mode !== 'keys' && Input.confirm()) {
      const b = bs[this.focus];
      if (b && b.enabled && b.onClick) { Sound.select(); b.onClick(); } else Sound.deny();
    }
  },

  // ---------- Dialogboks ----------
  open(d) {
    this.dialog = d;
    this.focus = d.focus || 0;
    this.fresh = true; // tasten der åbnede dialogen må ikke også lukke den
  },
  close() { this.dialog = null; this.focus = 0; },

  drawDialog(ctx) {
    const d = this.dialog;
    if (!d) return;
    if (d.build) Object.assign(d, d.build());
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, 960, 600);
    const w = d.wide ? 720 : 560;
    const lines = [];
    (d.lines || []).forEach((l) => { if (l === '') lines.push(''); else this.wrap(ctx, l, w - 80, 20).forEach((ll) => lines.push(ll)); });
    const btnH = 44, gap = 10;
    const cols = d.cols || 1;
    const rows = Math.ceil(d.buttons.length / cols);
    const h = 90 + lines.length * 28 + rows * (btnH + gap) + (d.arms ? 30 : 0) + 10;
    const x = (960 - w) / 2, y = Math.max(10, (600 - h) / 2);
    this.panel(ctx, x, y, w, h);
    if (d.arms) Art.shield(ctx, x + 50, y + 52, 46, d.arms);
    this.text(ctx, d.title, 480, y + 42, 28, '#701018', 'center', true);
    lines.forEach((l, i) => this.text(ctx, l, x + 40, y + 88 + i * 28, 20, INK));
    const by = y + 88 + lines.length * 28 + (d.arms ? 20 : 4);
    const bw = (w - 80 - (cols - 1) * gap) / cols;
    d.buttons.forEach((b, i) => {
      const cx = i % cols, cy = Math.floor(i / cols);
      this.button(ctx, x + 40 + cx * (bw + gap), by + cy * (btnH + gap), bw, btnH, b.label, {
        enabled: b.enabled, size: 19,
        onClick: () => { if (!b.keep) this.close(); if (b.onClick) b.onClick(); },
      });
    });
    if (d.back !== undefined && !this.fresh && Input.back()) {
      const b = d.buttons[d.back];
      this.close();
      if (b && b.onClick) b.onClick();
    }
  },

  // Kort besked der fader ud
  toasts: [],
  toast(s, color = PARCH) { this.toasts.push({ s, t: 3.2, color }); if (this.toasts.length > 4) this.toasts.shift(); },
  drawToasts(ctx, dt) {
    this.toasts.forEach((t, i) => {
      t.t -= dt;
      ctx.globalAlpha = clamp(t.t, 0, 1);
      ctx.fillStyle = 'rgba(20,10,4,0.85)';
      ctx.font = `20px ${FONT}`;
      const w = ctx.measureText(t.s).width + 30;
      ctx.fillRect(320 - w / 2, 20 + i * 38, w, 32);
      this.text(ctx, t.s, 320, 37 + i * 38, 20, t.color, 'center');
      ctx.globalAlpha = 1;
    });
    this.toasts = this.toasts.filter((t) => t.t > 0);
  },
};
