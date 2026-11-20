// Stjernehimmel i flere lag. Stjerner langt væk flytter sig langsomt,
// støv tæt på flytter sig lige så hurtigt som skibene – det giver dybde.
const Starfield = {
  layers: [],
  nebulae: [],

  init() {
    const mk = (p, tile, n, sizeMin, sizeMax, colors) => {
      const stars = [];
      for (let i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * tile, y: Math.random() * tile,
          r: rand(sizeMin, sizeMax), c: pick(colors), tw: Math.random() * TAU,
        });
      }
      return { p, tile, stars };
    };
    this.layers = [
      mk(0.05, 1400, 220, 0.6, 1.4, ['#ffffff', '#cfe0ff', '#ffe9c4']),
      mk(0.15, 1400, 120, 0.8, 1.8, ['#ffffff', '#aac8ff', '#ffd0a0']),
      mk(0.35, 1600, 70, 1.2, 2.4, ['#ffffff', '#ffe08a', '#9ad0ff']),
      mk(1.0, 1000, 40, 1, 2, ['rgba(160,180,255,0.45)', 'rgba(255,255,255,0.35)']), // rumstøv
    ];
    const colors = [[120, 60, 200], [40, 120, 200], [200, 60, 140], [40, 160, 140]];
    this.nebulae = [];
    for (let i = 0; i < 7; i++) {
      const c = pick(colors);
      this.nebulae.push({ x: Math.random() * 2400, y: Math.random() * 2400, r: rand(250, 520), c });
    }
  },

  draw(ctx, t) {
    const cam = Camera;
    // Mørk baggrund med en svag farvetone
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#070818');
    g.addColorStop(1, '#0d0620');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Tåger
    const np = 0.03, ntile = 2400;
    const ns = lerp(1, cam.zoom, 0.1);
    for (const n of this.nebulae) {
      const lx = wrapCoord(n.x - cam.ux * np + ntile / 2, ntile) - ntile / 2;
      const ly = wrapCoord(n.y - cam.uy * np + ntile / 2, ntile) - ntile / 2;
      const sx = W / 2 + lx * ns, sy = H / 2 + ly * ns, r = n.r * ns;
      if (sx < -r || sx > W + r || sy < -r || sy > H + r) continue;
      const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      rg.addColorStop(0, `rgba(${n.c[0]},${n.c[1]},${n.c[2]},0.16)`);
      rg.addColorStop(1, `rgba(${n.c[0]},${n.c[1]},${n.c[2]},0)`);
      ctx.fillStyle = rg;
      ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    }

    for (const L of this.layers) {
      const s = lerp(1, cam.zoom, L.p); // fjerne stjerner zoomer næsten ikke
      const T = L.tile * s;
      const reps = Math.ceil(Math.max(W, H) / T / 2) + 1;
      for (const st of L.stars) {
        const lx = wrapCoord(st.x - cam.ux * L.p, L.tile) * s;
        const ly = wrapCoord(st.y - cam.uy * L.p, L.tile) * s;
        const tw = 0.65 + 0.35 * Math.sin(t * 2 + st.tw);
        ctx.globalAlpha = tw;
        ctx.fillStyle = st.c;
        const r = Math.max(0.6, st.r * (L.p === 1 ? cam.zoom : 1));
        for (let i = -reps; i <= reps; i++) {
          const x = W / 2 + lx + i * T;
          if (x < -3 || x > W + 3) continue;
          for (let j = -reps; j <= reps; j++) {
            const y = H / 2 + ly + j * T;
            if (y < -3 || y > H + 3) continue;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
          }
        }
      }
    }
    ctx.globalAlpha = 1;
  },
};
