// Togene kører: ét skridt (ét felt) pr. tik. Ingen tegning her, kun regler.
function createRun(b, opts) {
  opts = opts || {};
  var run = {
    trains: [], pass: [], cows: [], p: 0.5, tick: 0,
    won: false, over: false, loop: false, free: !!opts.free, seen: {}
  };
  b.depots.forEach(function (dp, i) {
    var cap = opts.wagons || 1;
    var hist = [];
    for (var k = 0; k <= cap; k++) {
      hist.push({ cx: dp.x - DX[dp.dir] * k, cy: dp.y - DY[dp.dir] * k, e: opp(dp.dir), o: dp.dir, virt: k > 0 });
    }
    run.trains.push({ id: i, hist: hist, cap: cap, cargo: [], halted: null, waiting: false, moved: false });
  });
  b.cells.forEach(function (c, idx) {
    var x = idx % b.w, y = Math.floor(idx / b.w);
    if (c.pass >= 0) run.pass.push({ x: x, y: y, color: c.pass, state: 'wait', train: -1 });
    if (c.cow) run.cows.push({ x: x, y: y, fx: x, fy: y, gone: false });
  });
  return run;
}

function cowAt(run, x, y) {
  for (var i = 0; i < run.cows.length; i++) {
    var c = run.cows[i];
    if (!c.gone && c.x === x && c.y === y) return c;
  }
  return null;
}

function bodiesOverlap(a, z) {
  for (var i = 0; i < a.length; i++) {
    if (a[i].virt) continue;
    for (var j = 0; j < z.length; j++) {
      if (!z[j].virt && a[i].cx === z[j].cx && a[i].cy === z[j].cy) return true;
    }
  }
  return false;
}

function stepRun(run, b) {
  var ev = [];
  run.tick++;
  var plans = run.trains.map(function (t) {
    if (t.halted) return null;
    var h = t.hist[0];
    var nx = h.cx + DX[h.o], ny = h.cy + DY[h.o];
    var c = cellAt(b, nx, ny);
    if (!c || !c.piece) { t.halted = 'end'; ev.push({ type: 'halt', train: t, why: 'end' }); return null; }
    var e = opp(h.o);
    if (!pieceHas(c.piece, e)) { t.halted = 'wrong'; ev.push({ type: 'halt', train: t, why: 'wrong' }); return null; }
    if (cowAt(run, nx, ny)) {
      if (!t.waiting) ev.push({ type: 'cow', train: t, x: nx, y: ny });
      t.waiting = true;
      return null;
    }
    t.waiting = false;
    return { cx: nx, cy: ny, e: e, o: pieceExit(c.piece, e), virt: false };
  });

  // Støder togene sammen, stopper de begge (venligt).
  var bodies = run.trains.map(function (t, i) {
    return plans[i] ? [plans[i]].concat(t.hist.slice(0, t.cap)) : t.hist.slice(0, t.cap + 1);
  });
  for (var i = 0; i < run.trains.length; i++) {
    for (var j = i + 1; j < run.trains.length; j++) {
      if (bodiesOverlap(bodies[i], bodies[j])) {
        [i, j].forEach(function (k) {
          plans[k] = null;
          var t = run.trains[k];
          if (!t.halted) { t.halted = 'bump'; ev.push({ type: 'halt', train: t, why: 'bump' }); }
        });
      }
    }
  }

  run.trains.forEach(function (t, k) {
    t.moved = !!plans[k];
    if (!plans[k]) return;
    t.hist.unshift(plans[k]);
    t.hist.length = t.cap + 1;
    arrive(run, b, t, plans[k], ev);
  });

  if (run.pass.length && run.pass.every(function (p) { return p.state === 'done'; })) {
    run.won = true;
    ev.push({ type: 'win' });
    return ev;
  }
  if (run.trains.every(function (t) { return t.halted; })) { run.over = true; ev.push({ type: 'over' }); return ev; }

  if (!run.free) {
    var key = run.trains.map(function (t) { var h = t.hist[0]; return h.cx + ',' + h.cy + ',' + h.o + (t.halted ? 'h' : '') + (t.waiting ? 'w' : ''); }).join('|') +
      '#' + run.pass.map(function (p) { return p.state[0] + p.train; }).join('') +
      '#' + run.cows.map(function (c) { return c.x + ',' + c.y; }).join(';');
    var waiting = run.trains.some(function (t) { return t.waiting; });
    if (run.seen[key] && !waiting) {
      run.loop = true; run.over = true;
      ev.push({ type: 'loop' });
    }
    run.seen[key] = true;
  }
  if (run.tick > 4000 && !run.free) { run.over = true; run.loop = true; ev.push({ type: 'loop' }); }
  return ev;
}

function arrive(run, b, t, seg, ev) {
  var c = cellAt(b, seg.cx, seg.cy);
  if (c.station >= 0) {
    var stay = [];
    t.cargo.forEach(function (pi) {
      var p = run.pass[pi];
      if (p.color === c.station) {
        p.state = 'done'; p.train = -1; p.x = seg.cx; p.y = seg.cy;
        ev.push({ type: 'deliver', x: seg.cx, y: seg.cy, color: p.color });
      } else stay.push(pi);
    });
    t.cargo = stay;
  }
  run.pass.forEach(function (p, pi) {
    if (p.state !== 'wait' || p.x !== seg.cx || p.y !== seg.cy) return;
    if (t.cargo.length < t.cap) {
      p.state = 'ride'; p.train = t.id;
      t.cargo.push(pi);
      ev.push({ type: 'pickup', x: seg.cx, y: seg.cy, color: p.color });
    } else {
      ev.push({ type: 'full', x: seg.cx, y: seg.cy, train: t });
    }
  });
}

// Dyt med hornet: køer foran eller ved siden af et tog går væk fra sporet.
function dyt(run, b) {
  var moved = 0;
  run.cows.forEach(function (cow) {
    if (cow.gone) return;
    var near = run.trains.some(function (t) {
      var h = t.hist[0];
      return Math.abs(h.cx - cow.x) + Math.abs(h.cy - cow.y) <= 2;
    });
    if (!near) return;
    moveCow(run, b, cow);
    moved++;
  });
  return moved;
}

function moveCow(run, b, cow) {
  var good = [], ok = [];
  for (var d = 0; d < 4; d++) {
    var x = cow.x + DX[d], y = cow.y + DY[d];
    var c = cellAt(b, x, y);
    if (!c || c.t !== 'grass' || cowAt(run, x, y)) continue;
    if (!c.piece && c.station < 0 && c.pass < 0 && c.depot < 0) good.push([x, y]);
    else if (!c.piece) ok.push([x, y]);
  }
  var list = good.length ? good : ok;
  if (!list.length) { cow.gone = true; return; }
  var pick = list[Math.floor(Math.random() * list.length)];
  cow.x = pick[0]; cow.y = pick[1];
}

// Til test: kør en hel tur. autoDyt flytter køer med det samme.
function simulate(b, opts) {
  var run = createRun(b, opts);
  for (var i = 0; i < 5000 && !run.won && !run.over; i++) {
    stepRun(run, b);
    if (opts.autoDyt && run.trains.some(function (t) { return t.waiting; })) dyt(run, b);
  }
  return run;
}
