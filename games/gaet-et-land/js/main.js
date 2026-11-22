// Gæt et Land – runder, ledetråde, point, menu og "Opdag verden".
var ROUNDS = 10;
var REGION_BOX = {
  Europa: { minX: -25, maxX: 45, minY: 34, maxY: 71 },
  Afrika: { minX: -20, maxX: 52, minY: -36, maxY: 38 },
  Asien: { minX: 25, maxX: 150, minY: -10, maxY: 55 },
  Nordamerika: { minX: -170, maxX: -50, minY: 5, maxY: 75 },
  Sydamerika: { minX: -85, maxX: -33, minY: -56, maxY: 13 },
  Oceanien: { minX: 110, maxX: 200, minY: -48, maxY: 12 }
};

var Store = {
  get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ingen lagring */ } },
  json: function (k, def) { try { var v = JSON.parse(this.get(k)); return v == null ? def : v; } catch (e) { return def; } }
};

var $ = function (id) { return document.getElementById(id); };
function esc(s) {
  return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; });
}
function shuffle(a) {
  for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function flagSrc(c) { return 'flags/' + c.c.toLowerCase() + '.svg'; }
function fmtKm(km) { return km < 10 ? 'under 10 km' : Math.round(km).toLocaleString('da-DK') + ' km'; }

var Game = {
  state: 'menu', // menu | round | result | end | explore
  opts: { level: 'normal', region: '', pool: '1' },
  queue: [], i: 0, score: 0, stars: 0, results: [],
  cur: null, steps: [], shown: 0, hints: 0, pin: null,
  best: {}, found: {},
  map: null, kbUsed: false,

  init: function () {
    Geo.init();
    var o = Store.json('gaetetland-opts', null);
    if (o && typeof o === 'object') {
      if (['let', 'normal', 'svaer'].indexOf(o.level) >= 0) this.opts.level = o.level;
      if (o.region === '' || REGION_BOX[o.region]) this.opts.region = o.region;
      if (['1', '2', '3'].indexOf(o.pool) >= 0) this.opts.pool = o.pool;
    }
    this.best = Store.json('gaetetland-best', {}) || {};
    this.found = Store.json('gaetetland-found', {}) || {};
    Sound.muted = Store.get('gaetetland-muted') === '1';

    var self = this;
    this.map = new MapView($('map'), {
      onClick: function (lon, lat) { self.mapClick(lon, lat); },
      onHover: function (g, p) { self.mapHover(g, p); }
    });
    this.map.home(true);
    Sheet.init();
    this.bindUi();
    this.showMenu();

    window.addEventListener('resize', function () {
      self.map.resize();
      if (self.cur) Outline.draw($('outline'), self.cur);
    });
    var last = performance.now();
    var loop = function (now) {
      var dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      self.map.update(dt);
      self.map.draw();
      Sheet.update(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  // ---------- Knapper og taster ----------
  bindUi: function () {
    var self = this;
    var choice = function (id, key) {
      Array.prototype.forEach.call($(id).querySelectorAll('button'), function (b) {
        b.addEventListener('click', function () {
          Sound.unlock(); Sound.click();
          self.opts[key] = b.getAttribute('data-v');
          Store.set('gaetetland-opts', JSON.stringify(self.opts));
          self.refreshMenu();
        });
      });
    };
    choice('opt-level', 'level'); choice('opt-region', 'region'); choice('opt-pool', 'pool');
    $('btn-start').addEventListener('click', function () { Sound.unlock(); self.startGame(); });
    $('btn-explore').addEventListener('click', function () { Sound.unlock(); self.startExplore(); });
    $('btn-menu').addEventListener('click', function () { Sound.unlock(); Sheet.close(); self.showMenu(); });
    $('btn-sound').addEventListener('click', function () { Sound.unlock(); self.toggleSound(); });
    $('btn-hint').addEventListener('click', function () { self.hint(); });
    $('btn-guess').addEventListener('click', function () { self.guess(); });
    $('z-in').addEventListener('click', function () { self.map.zoomAt(self.map.w / 2, self.map.h / 2, 1.6); });
    $('z-out').addEventListener('click', function () { self.map.zoomAt(self.map.w / 2, self.map.h / 2, 1 / 1.6); });
    $('z-home').addEventListener('click', function () { self.viewHome(); });
    this.updateSoundBtn();

    window.addEventListener('keydown', function (e) { self.key(e); });
  },

  key: function (e) {
    var k = e.key, m = this.map;
    Sound.unlock();
    if (k === 'm' || k === 'M') { this.toggleSound(); return; }
    if (k === 'Escape') {
      if (Sheet.isOpen()) Sheet.close();
      else if (this.state !== 'menu') this.showMenu();
      e.preventDefault();
      return;
    }
    if (Sheet.isOpen()) {
      if (k === 'Enter' || k === 'f' || k === 'F') { Sheet.close(); e.preventDefault(); }
      return;
    }
    var onButton = document.activeElement && document.activeElement.tagName === 'BUTTON';
    if (this.state === 'menu' || this.state === 'end') {
      if (k === 'Enter' && !onButton) { e.preventDefault(); if (this.state === 'menu') this.startGame(); else this.showMenu(); }
      return;
    }
    var step = 70;
    if (k === 'ArrowLeft') { m.pan(step, 0); this.kb(); e.preventDefault(); }
    else if (k === 'ArrowRight') { m.pan(-step, 0); this.kb(); e.preventDefault(); }
    else if (k === 'ArrowUp') { m.pan(0, step); this.kb(); e.preventDefault(); }
    else if (k === 'ArrowDown') { m.pan(0, -step); this.kb(); e.preventDefault(); }
    else if (k === '+' || k === '=') m.zoomAt(m.w / 2, m.h / 2, 1.5);
    else if (k === '-' || k === '_') m.zoomAt(m.w / 2, m.h / 2, 1 / 1.5);
    else if (k === '0') this.viewHome();
    else if (k === ' ') {
      e.preventDefault();
      if (this.state === 'round' || this.state === 'explore') {
        var g = m.toGeo(m.w / 2, m.h / 2);
        this.mapClick(g[0], g[1]);
      } else if (this.state === 'result') this.next();
    } else if (k === 'Enter') {
      if (onButton) return;
      e.preventDefault();
      if (this.state === 'round' && this.pin) this.guess();
      else if (this.state === 'result') this.next();
    } else if (k === 'h' || k === 'H') this.hint();
    else if (k === 'f' || k === 'F') { if (this.state === 'result') this.openSheet(this.cur); }
  },

  kb: function () { this.kbUsed = true; this.map.crosshair = this.state === 'round' || this.state === 'explore'; },

  toggleSound: function () {
    Sound.muted = !Sound.muted;
    Store.set('gaetetland-muted', Sound.muted ? '1' : '0');
    this.updateSoundBtn();
  },
  updateSoundBtn: function () { $('btn-sound').textContent = Sound.muted ? '🔇' : '🔊'; },

  viewHome: function () {
    var r = this.state !== 'explore' && this.opts.region;
    if (r && REGION_BOX[r]) this.map.flyTo(REGION_BOX[r], false, 1.05);
    else this.map.home();
  },

  // ---------- Menu ----------
  showMenu: function () {
    this.state = 'menu';
    this.cur = null;
    this.map.pins = []; this.map.line = null; this.map.highlight = null; this.map.hover = null;
    this.map.dim = null; this.map.crosshair = false;
    $('menu').classList.remove('hidden');
    $('end').classList.add('hidden');
    $('result').classList.add('hidden');
    $('guessbar').classList.add('hidden');
    $('hovername').style.display = 'none';
    $('status').innerHTML = '';
    this.refreshMenu();
    this.map.home();
    setTimeout(function () { $('btn-start').focus(); }, 50);
  },

  refreshMenu: function () {
    var o = this.opts;
    [['opt-level', o.level], ['opt-region', o.region], ['opt-pool', o.pool]].forEach(function (p) {
      Array.prototype.forEach.call($(p[0]).querySelectorAll('button'), function (b) {
        b.classList.toggle('on', b.getAttribute('data-v') === p[1]);
      });
    });
    var n = this.pickPool().length;
    $('btn-start').innerHTML = '▶ Start – ' + Math.min(ROUNDS, n) + ' lande <small>(ENTER)</small>';
    var foundN = Object.keys(this.found).length;
    var b = this.best[o.level];
    $('best').innerHTML = '🗺️ Du har fundet <b>' + foundN + '</b> af ' + Geo.list.length + ' lande' +
      (b ? ' &nbsp;·&nbsp; 🏆 Bedste spil på ' + this.levelName(o.level) + ': <b>' + b.toLocaleString('da-DK') + '</b> point' : '');
  },

  levelName: function (l) { return { let: 'Let', normal: 'Normal', svaer: 'Svær' }[l]; },

  pickPool: function () {
    var o = this.opts, tier = +o.pool;
    var inReg = Geo.list.filter(function (c) { return !o.region || c.cont === o.region; });
    var pool = inReg.filter(function (c) { return c.tier <= tier; });
    // Er der for få kendte lande i en verdensdel, så tag de næste med.
    for (var t = tier + 1; pool.length < ROUNDS && t <= 3; t++) {
      pool = inReg.filter(function (c) { return c.tier <= t; });
    }
    return pool;
  },

  // ---------- Spillet ----------
  startGame: function () {
    var self = this;
    var pool = shuffle(this.pickPool().slice());
    // Mest lande man ikke har fundet endnu, men også nogle man kender.
    var fresh = pool.filter(function (c) { return !self.found[c.c]; });
    var known = pool.filter(function (c) { return self.found[c.c]; });
    var q = fresh.slice(0, 7);
    q = q.concat(known.slice(0, ROUNDS - q.length));
    if (q.length < ROUNDS) q = q.concat(fresh.slice(7, 7 + ROUNDS - q.length));
    this.queue = shuffle(q);
    this.i = 0; this.score = 0; this.stars = 0; this.results = [];
    $('menu').classList.add('hidden');
    $('end').classList.add('hidden');
    $('clues').classList.remove('hidden');
    this.map.dim = this.opts.region ? { cont: this.opts.region } : null;
    Sound.click();
    this.startRound();
  },

  buildSteps: function (c) {
    var L = this.opts.level, cl = c.clues.map(function (t) { return { kind: 'clue', text: t }; });
    var cont = { kind: 'cont', text: '🌍 Landet ligger i ' + c.cont + '.' };
    var nb;
    if (c.nb.length) {
      var n = shuffle(c.nb.slice()).slice(0, 3);
      nb = { kind: 'nb', text: '🧭 Landet har grænse til ' + (n.length > 1 ? n.slice(0, -1).join(', ') + ' og ' + n[n.length - 1] : n[0]) + (c.nb.length > 3 ? ' (og flere)' : '') + '.' };
    } else {
      nb = { kind: 'nb', text: '🌊 Landet har ingen grænse til andre lande – der er hav hele vejen rundt.' };
    }
    var cap = c.cap ? { kind: 'cap', text: '🏛️ Hovedstaden begynder med »' + c.cap.charAt(0) + '« og har ' + c.cap.replace(/[^A-Za-zÀ-ÿ]/g, '').length + ' bogstaver.' } : null;
    var flag = { kind: 'flag' };
    var s;
    if (L === 'let') s = [cont, nb, cl[3], cl[2]];
    else if (L === 'normal') s = [flag, cl[0], cl[1], cont, cl[2], nb, cl[3], cap];
    else s = [cl[0], cl[1], flag, cont, cl[2], nb, cl[3], cap];
    return s.filter(Boolean);
  },

  startRound: function () {
    var c = this.queue[this.i];
    this.cur = c;
    this.state = 'round';
    this.pin = null;
    this.hints = 0;
    this.steps = this.buildSteps(c);
    // Hvor meget er vist fra start?
    this.shown = { let: 1, normal: 2, svaer: 0 }[this.opts.level];
    var m = this.map;
    m.pins = []; m.line = null; m.highlight = null; m.hover = null;
    m.crosshair = this.kbUsed;
    $('result').classList.add('hidden');
    $('guessbar').classList.add('hidden');
    $('cluelist').innerHTML = '';
    var ask = this.opts.level === 'let'
      ? 'Find <span class="name">' + esc(c.n) + '</span>'
      : 'Hvilket land er det?<span class="name">❓</span>';
    $('ask').innerHTML = '<small>Land ' + (this.i + 1) + ' af ' + this.queue.length + '</small><br>' + ask;
    $('flag').src = flagSrc(c);
    $('flag-card').classList.toggle('lock', this.opts.level !== 'let');
    Outline.draw($('outline'), c);
    for (var i = 0; i < this.shown; i++) this.showStep(this.steps[i], true);
    this.refreshHint();
    this.status();
    this.viewHome();
  },

  showStep: function (st, quiet) {
    if (!st) return;
    if (st.kind === 'flag') { $('flag-card').classList.remove('lock'); return; }
    var li = document.createElement('li');
    li.className = 'kind-' + st.kind;
    li.textContent = st.text;
    $('cluelist').appendChild(li);
    if (!quiet) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  },

  maxPts: function () {
    if (this.opts.level === 'let') return 1000;
    return Math.max(400, 1000 - 100 * this.hints);
  },

  refreshHint: function () {
    var left = this.steps.length - this.shown;
    var b = $('btn-hint');
    b.disabled = left <= 0 || this.state !== 'round';
    b.innerHTML = left > 0 ? '💡 Ny ledetråd <small>(H) · ' + left + ' tilbage</small>' : '💡 Ikke flere ledetråde';
    $('maxpts').innerHTML = this.opts.level === 'let'
      ? 'Ledetråde er gratis på Let.'
      : 'Du kan få op til <b>' + this.maxPts() + '</b> point' + (left > 0 ? ' (en ledetråd koster 100)' : '');
  },

  hint: function () {
    if (this.state !== 'round' || this.shown >= this.steps.length) return;
    this.showStep(this.steps[this.shown]);
    this.shown++;
    if (this.opts.level !== 'let') this.hints++;
    Sound.hint();
    this.refreshHint();
    this.status();
  },

  status: function () {
    if (this.state === 'explore') {
      $('status').innerHTML = '🔎 <span>Opdag verden – klik på et land for at lære om det</span>';
      return;
    }
    $('status').innerHTML = '<span>Land <b>' + Math.min(this.i + 1, this.queue.length) + '</b>/' + this.queue.length + '</span>' +
      '<span>Point <b>' + this.score.toLocaleString('da-DK') + '</b></span>' +
      '<span>⭐ <b>' + this.stars + '</b></span>';
  },

  mapClick: function (lon, lat) {
    $('tip').style.opacity = '0';
    if (this.state === 'round') {
      this.pin = { lon: lon, lat: lat };
      this.map.pins = [this.pin];
      this.map.dirty = true;
      $('guessbar').classList.remove('hidden');
      Sound.pin();
    } else if (this.state === 'explore') {
      var c = Geo.countryAt(lon, lat, 14 / this.map.s * 111);
      if (c) this.openSheet(c, true);
      else Sound.nope();
    }
  },

  mapHover: function (g, p) {
    var hn = $('hovername');
    if (this.state !== 'explore' || !g || Sheet.isOpen()) { hn.style.display = 'none'; if (this.map.hover) { this.map.hover = null; this.map.dirty = true; } return; }
    var c = Geo.countryAt(g[0], g[1], 10 / this.map.s * 111);
    if (c !== this.map.hover) { this.map.hover = c; this.map.dirty = true; }
    if (c) {
      hn.textContent = c.n;
      hn.style.display = 'block';
      hn.style.left = (p[0] + 16) + 'px';
      hn.style.top = (p[1] + 10) + 'px';
    } else hn.style.display = 'none';
  },

  scoreFor: function (km) {
    var f = km <= 150 ? 1 : Math.exp(-(km - 150) / 1500);
    return Math.round(this.maxPts() * f / 10) * 10;
  },
  starsFor: function (km) { return km <= 150 ? 3 : km <= 1000 ? 2 : km <= 3000 ? 1 : 0; },

  guess: function () {
    if (this.state !== 'round' || !this.pin) return;
    var c = this.cur, pin = this.pin;
    var near = Geo.nearest(c, pin.lon, pin.lat);
    var km = near.km, pts = this.scoreFor(km), st = this.starsFor(km);
    this.score += pts; this.stars += st;
    var clicked = Geo.countryAt(pin.lon, pin.lat, 0);
    this.results.push({ c: c, km: km, pts: pts, stars: st });
    if (st >= 2) { this.found[c.c] = 1; Store.set('gaetetland-found', JSON.stringify(this.found)); }
    this.state = 'result';
    var m = this.map;
    m.highlight = { c: c, color: '#ff6b35' };
    m.line = km > 0 ? [[pin.lon, pin.lat], [near.lon, near.lat]] : null;
    m.crosshair = false;
    // Vis både nålen og landet.
    var b = c.pbox, box = { minX: b.minX, maxX: b.maxX, minY: b.minY, maxY: b.maxY };
    if (km < 6000) {
      var plon = pin.lon, mid = (b.minX + b.maxX) / 2;
      while (plon - mid > 180) plon -= 360;
      while (mid - plon > 180) plon += 360;
      box.minX = Math.min(box.minX, plon); box.maxX = Math.max(box.maxX, plon);
      box.minY = Math.min(box.minY, pin.lat); box.maxY = Math.max(box.maxY, pin.lat);
    }
    box.minY -= (box.maxY - box.minY) * 0.6 + 1; // plads til resultat-boksen nederst
    m.flyTo(box, false, 1.4);
    $('guessbar').classList.add('hidden');
    $('flag-card').classList.remove('lock');
    $('ask').innerHTML = '<small>Land ' + (this.i + 1) + ' af ' + this.queue.length + '</small><br>Det var<span class="name">' + esc(c.n) + '</span>';
    this.refreshHint();
    this.status();

    var praise = ['Langt væk – men nu ved du, hvor det ligger! 💪', 'Godt forsøg! 👍', 'Tæt på! 😃', 'Fuldt hit! 🎯'][st];
    var where;
    if (near.inside) where = 'Du klikkede lige i landet!';
    else if (km <= 150) where = 'Du var kun ' + fmtKm(km) + ' fra landet – det tæller som et hit!';
    else where = 'Du var ' + fmtKm(km) + ' fra landet' + (clicked && clicked !== c ? ' – du klikkede på ' + esc(clicked.n) : '') + '.';
    var last = this.i >= this.queue.length - 1;
    var h = '<div class="res-head"><img src="' + flagSrc(c) + '" alt="">' +
      '<div><div class="res-name">' + esc(c.n) + '</div><div class="res-sub">' + praise + '</div></div>' +
      '<div class="res-stars">' + '⭐'.repeat(st) + '<span style="opacity:.25">' + '⭐'.repeat(3 - st) + '</span></div></div>' +
      '<div class="res-pts">' + where + ' &nbsp;<b>+' + pts + '</b> point</div>' +
      '<div class="res-btns"><button class="big soft" id="btn-more">📖 Vis mere om landet <small>(F)</small></button>' +
      '<button class="big go" id="btn-next">' + (last ? '🏁 Se resultat' : 'Næste land ▶') + ' <small>(ENTER)</small></button></div>';
    var r = $('result');
    r.innerHTML = h;
    r.classList.remove('hidden');
    var self = this;
    $('btn-more').addEventListener('click', function () { self.openSheet(c); });
    $('btn-next').addEventListener('click', function () { self.next(); });
    Sound.result(st);
  },

  next: function () {
    if (this.state !== 'result') return;
    this.i++;
    if (this.i >= this.queue.length) this.endGame();
    else { Sound.click(); this.startRound(); }
  },

  endGame: function () {
    this.state = 'end';
    var lv = this.opts.level, rec = false;
    if (!this.best[lv] || this.score > this.best[lv]) {
      rec = this.score > 0; this.best[lv] = this.score;
      Store.set('gaetetland-best', JSON.stringify(this.best));
    }
    $('result').classList.add('hidden');
    this.map.highlight = null; this.map.line = null; this.map.pins = [];
    var maxS = this.queue.length * 3;
    var title = this.stars >= maxS * 0.8 ? '🏆 Du er en verdensmester!' : this.stars >= maxS * 0.5 ? '🎉 Flot klaret!' : '🌱 Godt gået – øvelse gør mester!';
    var h = '<h2 class="endtitle">' + title + '</h2>' +
      '<p class="endscore"><b>' + this.score.toLocaleString('da-DK') + '</b> point &nbsp;·&nbsp; ⭐ ' + this.stars + ' af ' + maxS +
      (rec ? '<br>✨ Ny rekord på ' + this.levelName(lv) + '!' : '') + '</p>' +
      '<div class="endlist">';
    this.results.forEach(function (r, i) {
      h += '<button data-i="' + i + '"><img src="' + flagSrc(r.c) + '" alt=""><span>' + esc(r.c.n) + '</span>' +
        '<span class="p">' + '⭐'.repeat(r.stars) + (r.stars ? '' : '·') + ' ' + r.pts + '</span></button>';
    });
    h += '</div><p class="endhint">Tryk på et land for at læse mere om det.</p>' +
      '<div class="startrow"><button class="big go" id="btn-again">🔁 Spil igen</button>' +
      '<button class="big soft" id="btn-tomenu">☰ Menu <small>(ENTER)</small></button></div>';
    $('endpanel').innerHTML = h;
    $('end').classList.remove('hidden');
    var self = this;
    Array.prototype.forEach.call($('endpanel').querySelectorAll('[data-i]'), function (b) {
      b.addEventListener('click', function () {
        var idx = +b.getAttribute('data-i');
        var open = function (k) {
          idx = (k + self.results.length) % self.results.length;
          Sheet.open(self.results[idx].c, function (d) { open(idx + d); });
        };
        open(idx);
      });
    });
    $('btn-again').addEventListener('click', function () { self.startGame(); });
    $('btn-tomenu').addEventListener('click', function () { self.showMenu(); });
    this.status();
    this.map.home();
    Sound.win();
  },

  // ---------- Opdag verden ----------
  startExplore: function () {
    this.state = 'explore';
    this.cur = null;
    $('menu').classList.add('hidden');
    $('end').classList.add('hidden');
    $('clues').classList.add('hidden');
    $('result').classList.add('hidden');
    $('guessbar').classList.add('hidden');
    var m = this.map;
    m.pins = []; m.line = null; m.highlight = null; m.dim = null; m.crosshair = this.kbUsed;
    this.map.resize();
    $('tip').textContent = 'Klik på et land for at se dets fakta-ark. Træk for at flytte kortet, rul eller knib for at zoome.';
    $('tip').style.opacity = '1';
    this.status();
    this.map.home();
    Sound.click();
  },

  openSheet: function (c, nav) {
    if (nav) {
      var list = Geo.list, self = this;
      var go = function (cc) {
        self.map.highlight = { c: cc, color: '#ff6b35' };
        Sheet.open(cc, function (d) { go(list[(cc.idx + d + list.length) % list.length]); });
      };
      go(c);
    } else Sheet.open(c);
  }
};

// Klue-panelet skal vises igen, når man forlader Opdag verden.
var _showMenu = Game.showMenu;
Game.showMenu = function () {
  $('clues').classList.remove('hidden');
  $('tip').textContent = 'Klik på kortet, hvor du tror landet ligger. Træk for at flytte kortet, rul eller knib for at zoome.';
  _showMenu.call(this);
  this.map.resize();
};

Game.init();
