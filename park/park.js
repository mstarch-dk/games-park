// Spilleparken – vælg et spil.
// Læser window.PARK_GAMES fra games/games.js og bygger én "forlystelse" pr. spil.
(function () {
  'use strict';

  var GAMES = (window.PARK_GAMES || []).slice();
  var STORE_LAST = 'park-last-game';
  var STORE_SOUND = 'park-sound';

  var ridesEl = document.getElementById('rides');
  var parkEl = document.getElementById('park');
  var pathEl = document.getElementById('path');
  var mascot = document.getElementById('mascot');
  var curtain = document.getElementById('curtain');
  var soundBtn = document.getElementById('sound');

  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function save(key, v) { try { localStorage.setItem(key, v); } catch (e) { /* ingen lagring */ } }

  // ---------- lyd ----------
  var audio = null;
  var soundOn = load(STORE_SOUND) !== 'off';
  function ctx() {
    if (!audio) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audio = new AC();
    }
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }
  function beep(freq, dur, type, when, vol) {
    if (!soundOn) return;
    var a = ctx(); if (!a) return;
    var t = a.currentTime + (when || 0);
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol || 0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  var sfx = {
    move: function () { beep(520, 0.08, 'square'); beep(780, 0.08, 'square', 0.06); },
    nope: function () { beep(180, 0.15, 'sawtooth'); },
    go: function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.16, 'triangle', i * 0.09, 0.12); }); }
  };
  function paintSound() {
    soundBtn.textContent = soundOn ? '🔊' : '🔇';
    soundBtn.setAttribute('aria-pressed', String(soundOn));
  }
  soundBtn.addEventListener('click', function () {
    soundOn = !soundOn; save(STORE_SOUND, soundOn ? 'on' : 'off'); paintSound(); sfx.move();
  });
  paintSound();

  // ---------- byg forlystelser ----------
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  var rides = GAMES.map(function (g, i) {
    var li = el('li');
    var btn = el('button', 'ride');
    btn.type = 'button';
    btn.style.setProperty('--c', g.color || '#ff5d73');
    btn.setAttribute('aria-label', g.title + ' – ' + (g.tagline || ''));
    btn.appendChild(el('div', 'roof'));
    btn.appendChild(el('div', 'scallop'));
    var booth = el('div', 'booth');
    var img = el('img');
    img.src = 'games/' + g.id + '/cover.svg';
    img.alt = '';
    img.onerror = function () { img.style.visibility = 'hidden'; };
    booth.appendChild(img);
    var name = el('p', 'name');
    name.appendChild(el('span', 'emoji', g.emoji || '🎮'));
    name.appendChild(document.createTextNode(' ' + g.title));
    booth.appendChild(name);
    booth.appendChild(el('p', 'tag', g.tagline || ''));
    var meta = el('p', 'meta');
    meta.appendChild(el('span', 'pill', '👤 ' + (g.players || '1') + ' spiller' + (g.players === '1' ? '' : 'e')));
    if (isNew(g.added)) meta.appendChild(el('span', 'pill', '✨ Ny!'));
    booth.appendChild(meta);
    if (g.keys && g.keys.length) booth.appendChild(el('p', 'keys', '⌨️ ' + g.keys.join(' · ')));
    btn.appendChild(booth);
    btn.addEventListener('click', function () {
      if (sel === i) enter(i); else select(i, true);
    });
    btn.addEventListener('mouseenter', function () { if (sel !== i && !entering) select(i, true); });
    li.appendChild(btn);
    ridesEl.appendChild(li);
    return btn;
  });

  // "Kommer snart"-bod – viser at parken vokser.
  (function () {
    var li = el('li');
    var b = el('div', 'ride soon');
    b.style.setProperty('--c', '#b8a07a');
    b.appendChild(el('div', 'roof'));
    b.appendChild(el('div', 'scallop'));
    var booth = el('div', 'booth');
    booth.appendChild(el('div', 'placeholder', '🚧'));
    booth.appendChild(el('p', 'name', 'Kommer snart'));
    booth.appendChild(el('p', 'tag', 'Her bygger vi en ny forlystelse. Hvad skal den være?'));
    b.appendChild(booth);
    li.appendChild(b);
    ridesEl.appendChild(li);
  })();

  function isNew(dateStr) {
    if (!dateStr) return false;
    var d = new Date(dateStr);
    return !isNaN(d) && (Date.now() - d.getTime()) < 1000 * 60 * 60 * 24 * 21;
  }

  if (!GAMES.length) {
    document.querySelector('.hint').textContent = 'Parken er tom endnu – tilføj et spil i games/games.js.';
  }

  // ---------- sti + maskot ----------
  function centers() {
    var pr = parkEl.getBoundingClientRect();
    return Array.prototype.map.call(ridesEl.children, function (li) {
      var r = li.firstChild.getBoundingClientRect();
      return { x: r.left - pr.left + r.width / 2, top: r.top - pr.top, bottom: r.bottom - pr.top, w: r.width, h: r.height };
    });
  }

  function drawPath() {
    var c = centers();
    if (c.length < 2) { pathEl.innerHTML = ''; return; }
    var pts = c.map(function (p) { return { x: p.x, y: p.bottom - 10 }; });
    var d = 'M' + pts[0].x + ' ' + pts[0].y;
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      var my = (a.y + b.y) / 2 + 30;
      d += ' C' + a.x + ' ' + (my + 20) + ' ' + b.x + ' ' + (my + 20) + ' ' + b.x + ' ' + b.y;
    }
    pathEl.innerHTML = '<path class="road" d="' + d + '"/><path class="dots" d="' + d + '"/>';
  }

  function placeMascot() {
    if (sel < 0) { mascot.style.display = 'none'; return; }
    var c = centers()[sel];
    mascot.style.display = '';
    // Maskotten står på stien ved bodens nederste venstre hjørne.
    mascot.style.left = (c.x - c.w / 2 + 34) + 'px';
    mascot.style.top = (c.bottom + 58) + 'px';
  }

  // ---------- valg ----------
  var sel = -1;
  var entering = false;

  function select(i, withSound) {
    if (!rides.length) return;
    i = (i + rides.length) % rides.length;
    if (i === sel) return;
    if (sel >= 0) rides[sel].classList.remove('selected');
    sel = i;
    rides[sel].classList.add('selected');
    rides[sel].focus({ preventScroll: true });
    if (withSound) sfx.move();
    mascot.classList.remove('hop'); void mascot.offsetWidth; mascot.classList.add('hop');
    placeMascot();
    var r = rides[sel].getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) rides[sel].scrollIntoView({ behavior: 'smooth', block: 'center' });
    save(STORE_LAST, GAMES[sel].id);
  }

  function columns() {
    var c = centers().slice(0, rides.length);
    if (!c.length) return 1;
    var n = 1;
    while (n < c.length && Math.abs(c[n].top - c[0].top) < 5) n++;
    return n;
  }

  function enter(i) {
    if (entering || !GAMES[i]) return;
    entering = true;
    select(i, false);
    sfx.go();
    confetti(rides[i]);
    mascot.classList.remove('hop'); mascot.classList.add('cheer');
    document.getElementById('curtain-title').textContent = GAMES[i].emoji + ' ' + GAMES[i].title;
    setTimeout(function () { curtain.classList.add('closed'); }, 450);
    setTimeout(function () { window.location.href = 'games/' + GAMES[i].id + '/index.html'; }, 1250);
  }

  function confetti(target) {
    var r = target.getBoundingClientRect();
    var colors = ['#ff5d73', '#ffd23f', '#3bceac', '#7b5cff', '#5ee0ff', '#ff9f1c'];
    for (var k = 0; k < 60; k++) {
      var p = el('div', 'confetti');
      p.style.background = colors[k % colors.length];
      p.style.left = (r.left + r.width / 2) + 'px';
      p.style.top = (r.top + r.height / 3) + 'px';
      document.body.appendChild(p);
      var ang = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 260;
      var dx = Math.cos(ang) * sp, dy = Math.sin(ang) * sp - 180;
      p.animate([
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + (dy + 320) + 'px) rotate(' + (Math.random() * 720) + 'deg)', opacity: 0 }
      ], { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' });
    }
  }

  // ---------- input ----------
  document.addEventListener('keydown', function (e) {
    if (entering || !rides.length) return;
    var cols = columns();
    switch (e.code) {
      case 'ArrowRight': case 'KeyD': select(sel + 1, true); break;
      case 'ArrowLeft': case 'KeyA': select(sel - 1, true); break;
      case 'ArrowDown': case 'KeyS':
        if (sel + cols < rides.length) select(sel + cols, true); else sfx.nope();
        break;
      case 'ArrowUp': case 'KeyW':
        if (sel - cols >= 0) select(sel - cols, true); else sfx.nope();
        break;
      case 'Enter': case 'Space': case 'NumpadEnter':
        if (document.activeElement === soundBtn || document.activeElement === randomBtn) return;
        enter(sel); break;
      case 'KeyR': randomGo(); break;
      default: return;
    }
    e.preventDefault();
  });

  var randomBtn = document.getElementById('random');
  function randomGo() {
    if (entering || !rides.length) return;
    // Lille "lykkehjul": hop hurtigt mellem bodene og land på en tilfældig.
    var target = Math.floor(Math.random() * rides.length);
    var steps = rides.length * 2 + target - Math.max(sel, 0);
    var n = 0;
    entering = true;
    (function spin() {
      entering = false;
      select((sel < 0 ? 0 : sel) + 1, true);
      entering = true;
      n++;
      if (n < steps) setTimeout(spin, 70 + n * 12);
      else { entering = false; setTimeout(function () { enter(sel); }, 350); }
    })();
  }
  randomBtn.addEventListener('click', randomGo);

  // Kommer man tilbage via browserens "tilbage", skal tæppet være åbent.
  window.addEventListener('pageshow', function () {
    curtain.classList.remove('closed');
    mascot.classList.remove('cheer');
    entering = false;
  });

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { drawPath(); placeMascot(); }, 80);
  });

  // ---------- start ----------
  function start() {
    drawPath();
    var last = load(STORE_LAST);
    var idx = GAMES.findIndex(function (g) { return g.id === last; });
    mascot.style.transition = 'none';
    select(idx >= 0 ? idx : 0, false);
    void mascot.offsetWidth;
    mascot.style.transition = '';
  }
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
})();
