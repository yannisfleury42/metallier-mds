/* ===========================================================
   MDS — Lightbox mutualisée
   Un seul module pour les 6 pages qui ont des photos.
   Remplace la lightbox dupliquée de realisations.html.

   Accroche : .mds-gallery-item (pages gammes, atelier)
              .reals-item       (realisations, avec filtres)

   - clavier : Entrée/Espace pour ouvrir, Échap, ←/→, Début/Fin
   - tactile : balayage horizontal (seuil 50 px, rejet si vertical)
   - légende + compteur « 3 / 6 »
   - piège de focus, focus restitué à la fermeture
   =========================================================== */
(function () {
  'use strict';

  var SEL = '.mds-gallery-item, .reals-item';
  var items = Array.prototype.slice.call(document.querySelectorAll(SEL));
  if (!items.length) return;

  // ---------- Données d'une vignette ----------
  function srcOf(el) {
    var img = el.querySelector('img');
    return el.getAttribute('data-full') ||
           el.getAttribute('data-src') ||
           (img ? img.getAttribute('src') : '');
  }
  function labelOf(el) {
    if (el.getAttribute('data-label')) return el.getAttribute('data-label');
    var cap = el.querySelector('.mds-gallery-cap, .reals-item-title');
    if (cap) return cap.textContent.trim();
    var img = el.querySelector('img');
    return img ? (img.getAttribute('alt') || '') : '';
  }
  function altOf(el) {
    var img = el.querySelector('img');
    return (img && img.getAttribute('alt')) || labelOf(el);
  }

  // Sur realisations.html les vignettes filtrées sont masquées :
  // on ne navigue que dans celles qui sont réellement visibles.
  function visibleItems() {
    var v = items.filter(function (el) { return el.offsetParent !== null; });
    return v.length ? v : items;
  }

  // ---------- Construction du calque ----------
  var lb = document.createElement('div');
  lb.className = 'mds-lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Photo en grand');
  lb.setAttribute('aria-hidden', 'true');
  lb.innerHTML =
    '<div class="mds-lb-stage">' +
      '<img class="mds-lb-img" alt="">' +
      '<button type="button" class="mds-lb-btn mds-lb-close" aria-label="Fermer">&times;</button>' +
      '<button type="button" class="mds-lb-btn mds-lb-prev" aria-label="Photo précédente">&#8249;</button>' +
      '<button type="button" class="mds-lb-btn mds-lb-next" aria-label="Photo suivante">&#8250;</button>' +
    '</div>' +
    '<div class="mds-lb-bar">' +
      '<p class="mds-lb-cap"></p>' +
      '<span class="mds-lb-count" aria-live="polite"></span>' +
    '</div>' +
    '<div class="mds-lb-nav-mobile"></div>';
  document.body.appendChild(lb);

  var elImg   = lb.querySelector('.mds-lb-img');
  var elCap   = lb.querySelector('.mds-lb-cap');
  var elCount = lb.querySelector('.mds-lb-count');
  var btClose = lb.querySelector('.mds-lb-close');
  var btPrev  = lb.querySelector('.mds-lb-prev');
  var btNext  = lb.querySelector('.mds-lb-next');
  var navMob  = lb.querySelector('.mds-lb-nav-mobile');

  // Sous 560 px les flèches passent dans la barre du bas : on les y déplace
  // réellement pour qu'elles restent dans l'ordre de tabulation.
  var mq = window.matchMedia('(max-width: 560px)');
  function placeArrows() {
    if (mq.matches) { navMob.appendChild(btPrev); navMob.appendChild(btNext); }
    else { lb.querySelector('.mds-lb-stage').appendChild(btPrev);
           lb.querySelector('.mds-lb-stage').appendChild(btNext); }
  }
  placeArrows();
  if (mq.addEventListener) mq.addEventListener('change', placeArrows);
  else if (mq.addListener) mq.addListener(placeArrows);

  // ---------- État ----------
  var group = [];
  var idx = 0;
  var opener = null;
  var scrollY = 0;

  function preload(i) {
    var el = group[i];
    if (!el) return;
    var im = new Image();
    im.src = srcOf(el);
  }

  function show(i) {
    if (!group.length) return;
    idx = (i + group.length) % group.length;
    var el = group[idx];
    elImg.src = srcOf(el);
    elImg.alt = altOf(el);
    elCap.textContent = labelOf(el);
    elCount.textContent = (idx + 1) + ' / ' + group.length;
    var solo = group.length < 2;
    btPrev.hidden = solo;
    btNext.hidden = solo;
    preload(idx + 1);
    preload(idx - 1);
  }

  function open(el) {
    group = visibleItems();
    var i = group.indexOf(el);
    if (i < 0) { group = items; i = items.indexOf(el); }
    opener = el;
    scrollY = window.scrollY || window.pageYOffset;
    show(i);
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    btClose.focus();
  }

  function close() {
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    elImg.removeAttribute('src');
    if (opener) {
      opener.focus();
      // Safari iOS peut sauter en haut de page à la restitution du focus
      window.scrollTo(0, scrollY);
      opener = null;
    }
  }

  function isOpen() { return lb.getAttribute('aria-hidden') === 'false'; }

  // ---------- Vignettes : rendues focusables et actionnables ----------
  items.forEach(function (el) {
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', 'Agrandir : ' + labelOf(el));
    el.addEventListener('click', function () { open(el); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        open(el);
      }
    });
  });

  // ---------- Contrôles ----------
  btClose.addEventListener('click', close);
  btPrev.addEventListener('click', function () { show(idx - 1); });
  btNext.addEventListener('click', function () { show(idx + 1); });
  lb.addEventListener('click', function (e) {
    if (e.target === lb || e.target.classList.contains('mds-lb-stage')) close();
  });

  document.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'Escape')     { e.preventDefault(); close(); }
    else if (e.key === 'ArrowLeft')  { e.preventDefault(); show(idx - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); }
    else if (e.key === 'Home')  { e.preventDefault(); show(0); }
    else if (e.key === 'End')   { e.preventDefault(); show(group.length - 1); }
    else if (e.key === 'Tab') {
      // piège de focus : on cycle entre les boutons visibles du calque
      var f = [btClose, btPrev, btNext].filter(function (b) { return !b.hidden; });
      var pos = f.indexOf(document.activeElement);
      e.preventDefault();
      if (e.shiftKey) f[(pos - 1 + f.length) % f.length].focus();
      else            f[(pos + 1) % f.length].focus();
    }
  });

  // ---------- Balayage tactile ----------
  var x0 = null, y0 = null;
  var stage = lb.querySelector('.mds-lb-stage');
  stage.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { x0 = null; return; }
    x0 = e.touches[0].clientX;
    y0 = e.touches[0].clientY;
  }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (x0 === null || !e.changedTouches.length) return;
    var dx = e.changedTouches[0].clientX - x0;
    var dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    // on ne vole pas le défilement vertical
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
    show(dx < 0 ? idx + 1 : idx - 1);
  }, { passive: true });
})();
