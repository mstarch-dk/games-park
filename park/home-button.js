// Spilleparken – lille 🏠-knap som spil kan inkludere for at komme tilbage til parken.
// Brug i et spils index.html (sidst i <body>):
//   <script src="../../park/home-button.js"></script>
// Knappen bruger kun mus/touch – ingen taster – så spillets egne taster (ESC, P, M …) er urørte.
(function () {
  if (window.top !== window.self) return; // ikke inde i en iframe
  var a = document.createElement('a');
  a.href = '../../index.html';
  a.title = 'Tilbage til Spilleparken';
  a.setAttribute('aria-label', 'Tilbage til Spilleparken');
  a.textContent = '🏠';
  a.style.cssText = [
    'position:fixed', 'top:10px', 'left:10px', 'z-index:9999',
    'width:44px', 'height:44px', 'border-radius:50%',
    'display:flex', 'align-items:center', 'justify-content:center',
    'font-size:24px', 'text-decoration:none',
    'background:rgba(255,255,255,0.85)', 'box-shadow:0 3px 10px rgba(0,0,0,0.4)',
    'opacity:0.55', 'transition:opacity .2s, transform .2s', 'cursor:pointer'
  ].join(';');
  a.addEventListener('mouseenter', function () { a.style.opacity = '1'; a.style.transform = 'scale(1.12)'; });
  a.addEventListener('mouseleave', function () { a.style.opacity = '0.55'; a.style.transform = ''; });
  // Undgå at knappen stjæler tastatur-fokus fra spillet.
  a.tabIndex = -1;
  a.addEventListener('mousedown', function (e) { e.preventDefault(); });
  function add() { document.body.appendChild(a); }
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
})();
