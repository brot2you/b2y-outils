/* BROT2YOU — module de sauvegarde commun (export / import de la progression)
   Usage, en PREMIER dans le <head> de l'appli :
   <script src="https://brot2you.github.io/BROT2YOU-the-blog/b2y-sauvegarde.js"
           data-app="Nom de l'appli" data-keys="cle1, prefixe*"></script>
   data-keys : clés localStorage de l'appli ; une clé finissant par * = toutes les clés qui commencent ainsi.
   data-position (facultatif) : bl (défaut), br, tl, tr = coin du bouton.
   data-offset (facultatif) : hauteur en px à laisser libre en bas (barre d'onglets non détectée). */
(function () {
  var me = document.currentScript;
  if (!me) return;
  var APP = me.getAttribute('data-app') || document.title || 'appli';
  var PATTERNS = (me.getAttribute('data-keys') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  var POS = me.getAttribute('data-position') || 'bl';
  var OFFSET = parseInt(me.getAttribute('data-offset'), 10) || 0;
  var PENDING = 'b2y-import-en-attente:' + APP;
  var FORMAT = 'brot2you-sauvegarde';

  function matches(k) {
    return PATTERNS.some(function (p) { return p.slice(-1) === '*' ? k.indexOf(p.slice(0, -1)) === 0 : k === p; });
  }
  function appKeys() {
    var out = [];
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (matches(k)) out.push(k); } } catch (e) {}
    return out;
  }
  function slug(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  }

  /* 1. Import en attente : appliqué AVANT le démarrage de l'appli (sinon l'appli réécrirait ses anciennes données en se fermant). */
  try {
    var pend = sessionStorage.getItem(PENDING);
    if (pend) {
      sessionStorage.removeItem(PENDING);
      var d = JSON.parse(pend);
      appKeys().forEach(function (k) { localStorage.removeItem(k); });
      Object.keys(d).forEach(function (k) { if (matches(k)) localStorage.setItem(k, d[k]); });
      window.__b2yImportOk = true;
    }
  } catch (e) {}
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}

  /* 2. Export */
  function exporter() {
    var data = {};
    appKeys().forEach(function (k) { data[k] = localStorage.getItem(k); });
    if (!Object.keys(data).length) { toast('Aucune progression à exporter pour le moment.'); return; }
    var file = { format: FORMAT, app: APP, date: new Date().toISOString(), data: data };
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: 'application/json' }));
    a.download = slug(APP) + '-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    toast('Fichier enregistré dans tes téléchargements.');
  }

  /* 3. Import : vérifie le fichier, demande confirmation, applique au rechargement. */
  function importer(f) {
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      var file;
      try { file = JSON.parse(r.result); } catch (e) { toast('Ce fichier n’est pas une sauvegarde lisible.'); return; }
      if (!file || file.format !== FORMAT || !file.data) { toast('Ce fichier n’est pas une sauvegarde BROT2YOU.'); return; }
      if (file.app !== APP) { toast('Cette sauvegarde vient de « ' + file.app + ' », pas de « ' + APP + ' ».'); return; }
      var d = {};
      Object.keys(file.data).forEach(function (k) { if (matches(k) && typeof file.data[k] === 'string') d[k] = file.data[k]; });
      if (!Object.keys(d).length) { toast('Cette sauvegarde est vide.'); return; }
      var quand = new Date(file.date).toLocaleDateString('fr-FR');
      if (!confirm('Remplacer ta progression actuelle par la sauvegarde du ' + quand + ' ?\nTa progression actuelle sera effacée.')) return;
      try { sessionStorage.setItem(PENDING, JSON.stringify(d)); } catch (e) { toast('Import impossible : stockage du navigateur indisponible.'); return; }
      location.reload();
    };
    r.readAsText(f);
  }

  /* 4. Interface : un bouton discret dans un coin, isolé du style de l'appli. */
  var toastFn = null;
  function toast(m) { if (toastFn) toastFn(m); else alert(m); }

  function ui() {
    var host = document.createElement('div');
    host.setAttribute('data-b2y-sauvegarde', '');
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    var v = POS.charAt(0) === 't' ? 'top' : 'bottom', h = POS.charAt(1) === 'r' ? 'right' : 'left';
    root.innerHTML =
      '<style>' +
      ':host{all:initial}' +
      '.w{position:fixed;' + v + ':calc(12px + env(safe-area-inset-' + v + ',0px));' + h + ':calc(12px + env(safe-area-inset-' + h + ',0px));z-index:2147483000;font:15px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1d2433}' +
      '.b{width:44px;height:44px;border-radius:50%;border:1px solid rgba(0,0,0,.15);background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.2);font-size:20px;cursor:pointer;opacity:.85}' +
      '.b:hover,.b:focus-visible{opacity:1}' +
      '.p{position:absolute;' + (v === 'top' ? 'top' : 'bottom') + ':54px;' + h + ':0;width:250px;background:#fff;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.25);padding:14px;display:none}' +
      '.p.o{display:block}' +
      '.t{font-weight:700;margin:0 0 4px}.s{margin:0 0 12px;font-size:13px;color:#5a6378}' +
      '.a{display:block;width:100%;box-sizing:border-box;margin:6px 0 0;padding:10px;border-radius:8px;border:0;background:#2d5bd7;color:#fff;font:inherit;font-weight:600;cursor:pointer;text-align:center}' +
      '.a.g{background:#e9edf5;color:#1d2433}' +
      '.m{margin:10px 0 0;font-size:13px;color:#1f7a45;min-height:1em}' +
      'button:focus-visible{outline:3px solid #f4b400;outline-offset:2px}' +
      '@media (prefers-color-scheme:dark){.w{color:#e8ecf4}.b,.p{background:#232a38;border-color:rgba(255,255,255,.15)}.s{color:#a9b2c4}.a.g{background:#343d50;color:#e8ecf4}.m{color:#7ddc9f}}' +
      '</style>' +
      '<div class="w"><button class="b" aria-label="Sauvegarder ou récupérer ma progression" aria-expanded="false">💾</button>' +
      '<div class="p" role="dialog" aria-label="Sauvegarde"><p class="t">Ma progression</p>' +
      '<p class="s">Elle reste dans ce navigateur. Exporte-la pour la garder ou la retrouver sur un autre appareil.</p>' +
      '<button class="a" data-x="exp">Exporter ma progression</button>' +
      '<button class="a g" data-x="imp">Importer une sauvegarde</button>' +
      '<input type="file" accept=".json,application/json" hidden>' +
      '<p class="m" aria-live="polite"></p></div></div>';
    var btn = root.querySelector('.b'), pan = root.querySelector('.p'), inp = root.querySelector('input'), msg = root.querySelector('.m');
    function open(o) { pan.classList.toggle('o', o); btn.setAttribute('aria-expanded', o); }
    btn.addEventListener('click', function () { open(!pan.classList.contains('o')); });
    root.querySelector('[data-x=exp]').addEventListener('click', exporter);
    root.querySelector('[data-x=imp]').addEventListener('click', function () { inp.click(); });
    inp.addEventListener('change', function () { importer(inp.files[0]); inp.value = ''; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') open(false); });
    toastFn = function (m) { msg.textContent = m; open(true); };
    document.body.appendChild(host);
    /* Si l'appli a une barre fixe en bas (onglets), le bouton se place juste au-dessus. */
    if (v === 'bottom') {
      var w = root.querySelector('.w');
      var lift = function () {
        var hgt = 0;
        [[20, 4], [innerWidth / 2, 4], [innerWidth / 2, 24], [innerWidth / 2, 44]].forEach(function (pt) {
          var el = document.elementFromPoint(pt[0], innerHeight - pt[1]);
          while (el && el !== document.body && el !== document.documentElement) {
            if (el === host) break;
            var cs = getComputedStyle(el);
            if (cs.position === 'fixed' || cs.position === 'sticky') {
              var rc = el.getBoundingClientRect();
              if (rc.top > innerHeight / 2) hgt = Math.max(hgt, innerHeight - rc.top);
              break;
            }
            el = el.parentElement;
          }
        });
        w.style.bottom = 'calc(' + (12 + Math.max(hgt, OFFSET)) + 'px + env(safe-area-inset-bottom,0px))';
      };
      lift(); addEventListener('resize', lift); setInterval(lift, 2000);
    }
    if (window.__b2yImportOk) toastFn('Sauvegarde importée : ta progression est à jour.');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ui); else ui();
})();
