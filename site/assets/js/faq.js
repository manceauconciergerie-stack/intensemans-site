/* ============================================================
   QUESTIONS FRÉQUENTES
   Onglets de catégories + questions dépliables.
   Le balisage est déjà complet dans la page : ce script ne fait
   que basculer des attributs. Sans JS, tout reste lisible —
   les panneaux masqués sont révélés au chargement seulement si
   le script tourne (voir le retrait de `hidden` plus bas).
   ============================================================ */
(function () {
  'use strict';

  var racine = document.querySelector('[data-qr]');
  if (!racine) return;

  var onglets  = Array.prototype.slice.call(racine.querySelectorAll('[role="tab"]'));
  var panneaux = Array.prototype.slice.call(racine.querySelectorAll('[role="tabpanel"]'));
  if (!onglets.length || onglets.length !== panneaux.length) return;

  var doux = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var actif = 0;
  var enCours = null;

  /* ------------------------------------------------ Onglets */

  function afficher(panneau) {
    panneau.hidden = false;
    panneau.setAttribute('data-etat', 'entree');
    // Un reflow forcé, sinon le navigateur regroupe les deux
    // changements et l'état de départ n'est jamais peint.
    void panneau.offsetHeight;
    panneau.removeAttribute('data-etat');
  }

  function choisir(index) {
    if (index === actif) return;

    var sortant = panneaux[actif];
    var entrant = panneaux[index];

    onglets.forEach(function (o, i) {
      var vise = i === index;
      o.setAttribute('aria-selected', vise ? 'true' : 'false');
      o.tabIndex = vise ? 0 : -1;
    });

    actif = index;

    if (enCours) { clearTimeout(enCours); enCours = null; }

    if (doux) {
      sortant.hidden = true;
      entrant.hidden = false;
      return;
    }

    // L'ancien panneau s'efface, puis le nouveau entre :
    // l'équivalent d'AnimatePresence mode="wait".
    sortant.setAttribute('data-etat', 'sortie');
    enCours = setTimeout(function () {
      sortant.hidden = true;
      sortant.removeAttribute('data-etat');
      afficher(entrant);
      enCours = null;
    }, 200);
  }

  onglets.forEach(function (onglet, i) {
    onglet.tabIndex = i === 0 ? 0 : -1;
    onglet.addEventListener('click', function () { choisir(i); });
  });

  // Navigation au clavier attendue d'un groupe d'onglets.
  racine.addEventListener('keydown', function (e) {
    var depuis = onglets.indexOf(document.activeElement);
    if (depuis === -1) return;

    var vers = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') vers = (depuis + 1) % onglets.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') vers = (depuis - 1 + onglets.length) % onglets.length;
    else if (e.key === 'Home') vers = 0;
    else if (e.key === 'End') vers = onglets.length - 1;
    if (vers === null) return;

    e.preventDefault();
    choisir(vers);
    onglets[vers].focus();
  });

  /* --------------------------------------------- Accordéon */

  racine.addEventListener('click', function (e) {
    var bouton = e.target.closest('.im-qr__q');
    if (!bouton || !racine.contains(bouton)) return;

    var item = bouton.closest('.im-qr__item');
    var ouvert = item.getAttribute('data-ouvert') === 'true';
    item.setAttribute('data-ouvert', ouvert ? 'false' : 'true');
    bouton.setAttribute('aria-expanded', ouvert ? 'false' : 'true');
  });

  /* ------------------------------------------- Amorçage */

  /* Lien direct vers un onglet : « #faq-equipement » ouvre l'onglet
     Équipement, « #faq-paiement » celui du paiement.

     Sans ça, un lien venu d'ailleurs dans le site déposerait le
     visiteur sur le premier onglet, c'est-à-dire à côté de sa
     question, et il devrait chercher lui-même. */
  function vise() {
    var m = location.hash.match(/^#faq-([a-z-]+)$/);
    if (!m) return -1;
    for (var i = 0; i < onglets.length; i++) {
      if (onglets[i].id === 'qr-o-' + m[1]) return i;
    }
    return -1;
  }

  /* Le fragment ne correspond à l'identifiant d'aucun élément : le
     navigateur ne fait donc défiler nulle part, on s'en charge.
     `scroll-padding-top`, déclaré sur la racine, tient déjà compte
     de l'en-tête collant.

     « instant » et non « auto » : `auto` veut dire « suivre la CSS »,
     et la page déclare `scroll-behavior: smooth`. Venu de la page à
     propos, le visiteur se serait tapé le défilement de toute la page
     d'accueil avant d'arriver à sa réponse. Il a cliqué pour arriver
     ici, pas pour voir le voyage. */
  function amener() {
    racine.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  var depart = vise();
  if (depart < 0) depart = 0;

  onglets.forEach(function (o, i) {
    o.setAttribute('aria-selected', i === depart ? 'true' : 'false');
    o.tabIndex = i === depart ? 0 : -1;
  });
  actif = depart;

  // Sans JS, aucun panneau n'est masqué : c'est ici qu'on cache
  // tout sauf celui qui doit s'afficher.
  panneaux.forEach(function (p, i) { p.hidden = i !== depart; });
  racine.setAttribute('data-qr', 'prêt');

  if (vise() >= 0) {
    /* Le navigateur restaure la position de défilement d'avant le
       rechargement, et il le fait APRÈS `load` : sans ça il annulait
       notre positionnement une fraction de seconde plus tard. */
    try { history.scrollRestoration = 'manual'; } catch (e) { /* vieux navigateur */ }

    /* Après `load` et non tout de suite : les images n'ont pas encore
       leur hauteur quand ce script tourne, la mise en page bouge, et
       un défilement lancé trop tôt atterrit à côté. */
    window.addEventListener('load', amener);
  }

  /* Le même lien cliqué DEPUIS la page d'accueil ne recharge rien :
     l'adresse change, le script ne retourne pas au démarrage. Sans
     cette écoute, le bloc des atouts renvoyait vers la FAQ et la
     laissait sur son premier onglet. */
  window.addEventListener('hashchange', function () {
    var cible = vise();
    if (cible < 0) return;
    choisir(cible);
    amener();
  });
})();
