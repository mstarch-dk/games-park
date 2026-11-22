// "Vis mere om landet": et fakta-ark med flag, kort, tal og sjove fakta.
var Sheet = (function () {
  var el, body, miniMap = null, cur = null, onNav = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; });
  }
  function num(n, d) { return n.toLocaleString('da-DK', { maximumFractionDigits: d || 0 }); }

  function popText(p) {
    if (!p) return '?';
    if (p >= 1000) return 'ca. ' + num(p / 1000, 2) + ' milliarder';
    if (p >= 1) return 'ca. ' + num(p, p < 10 ? 1 : 0) + ' mio.';
    var n = p * 1e6;
    var r = n >= 100000 ? Math.round(n / 10000) * 10000 : n >= 10000 ? Math.round(n / 1000) * 1000 : Math.round(n / 100) * 100;
    return 'ca. ' + num(r);
  }
  function areaText(a) {
    if (!a) return '?';
    var dk = 42933, s = num(Math.round(a)) + ' km²', f = a / dk;
    if (f >= 1.5) s += ' <small>(' + num(f, f < 10 ? 1 : 0) + ' × Danmark)</small>';
    else if (f <= 0.67) s += ' <small>(' + num(1 / f, 1 / f < 10 ? 1 : 0) + ' gange mindre end Danmark)</small>';
    else s += ' <small>(næsten som Danmark)</small>';
    return s;
  }
  function list(a) { return a && a.length ? a.join(', ') : '–'; }

  function fact(k, v) { return '<div class="fact"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>'; }

  function render(c) {
    var h = '';
    h += '<div class="sh-head"><img src="flags/' + c.c.toLowerCase() + '.svg" alt="">';
    h += '<div><h2>' + esc(c.n) + '</h2><div class="sub">' + esc(c.cont) + (c.land ? ' · uden kyst' : '') + '</div></div></div>';
    h += '<div class="sh-grid"><canvas class="sh-map" id="sh-map"></canvas><canvas class="sh-outline" id="sh-outline"></canvas></div>';
    h += '<div class="sh-facts">';
    h += fact('🏛️ Hovedstad', esc(c.cap || '–'));
    h += fact('👪 Indbyggere', popText(c.pop));
    h += fact('📏 Størrelse', areaText(c.area));
    h += fact('🗣️ Sprog', esc(list(c.langs)));
    h += fact('💰 Penge', esc(list(c.cur)));
    h += fact('🧭 Naboer', c.nb.length ? esc(c.nb.join(', ')) : (c.land ? '–' : 'Ingen landgrænser – kun hav'));
    h += '</div>';
    if (c.facts.length) {
      h += '<div class="sh-fun"><h3>Sjove fakta</h3><ul>';
      c.facts.forEach(function (f) { h += '<li>' + esc(f) + '</li>'; });
      h += '</ul></div>';
    }
    h += '<div class="sh-chips">';
    if (c.hello) h += '<span class="chip">👋 Sig hej: <b>' + esc(c.hello) + '</b></span>';
    if (c.food) h += '<span class="chip">🍽️ Smag: <b>' + esc(c.food) + '</b></span>';
    if (c.animal) h += '<span class="chip">🐾 Dyr: <b>' + esc(c.animal) + '</b></span>';
    h += '</div>';
    if (onNav) {
      h += '<div class="sh-nav"><button class="big soft" data-nav="-1">◀ Forrige</button>' +
        '<button class="big soft" data-nav="1">Næste ▶</button></div>';
    }
    body.innerHTML = h;
    Array.prototype.forEach.call(body.querySelectorAll('[data-nav]'), function (b) {
      b.addEventListener('click', function () { Sound.page(); onNav(+b.getAttribute('data-nav')); });
    });

    var mc = document.getElementById('sh-map');
    miniMap = new MapView(mc, { interactive: false });
    miniMap.highlight = { c: c, color: '#e63946' };
    if (c.capLL) miniMap.dot = { lat: c.capLL[0], lon: c.capLL[1], label: c.cap };
    var b = c.pbox, pad = 6;
    miniMap.flyTo({ minX: b.minX - pad, maxX: b.maxX + pad, minY: b.minY - pad, maxY: b.maxY + pad }, true, 1.15);
    Outline.draw(document.getElementById('sh-outline'), c, { fill: '#ffb703' });
  }

  return {
    init: function () {
      el = document.getElementById('sheet');
      body = document.getElementById('sheet-body');
      document.getElementById('sheet-close').addEventListener('click', function () { Sheet.close(); });
      el.addEventListener('pointerdown', function (e) { if (e.target === el) Sheet.close(); });
    },
    // nav(dir) er valgfri: viser Forrige/Næste-knapper.
    open: function (c, nav) {
      cur = c; onNav = nav || null;
      el.classList.remove('hidden');
      el.querySelector('.sheet-box').scrollTop = 0;
      render(c);
      Sound.page();
    },
    close: function () { el.classList.add('hidden'); miniMap = null; cur = null; },
    isOpen: function () { return !el.classList.contains('hidden'); },
    update: function (dt) { if (miniMap) { miniMap.update(dt); miniMap.draw(); } },
    popText: popText
  };
})();
