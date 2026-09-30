/* ============================================================
   INTENSÉ'MANS — Interface
   Rendu du catalogue, du panier, et les quelques interactions.
   ============================================================ */

(() => {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  /* Jeu d'icônes propre au projet : quatre tracés, une seule épaisseur
     de trait. Les émojis couleur juraient avec la palette. */
  const ICONS = {
    coffret: '<path d="M3.5 9h17v11.5h-17zM3.5 9l1.6-3.5h13.8L20.5 9M12 9v11.5M9.4 5.5C9.4 7.4 10.6 9 12 9M14.6 5.5C14.6 7.4 13.4 9 12 9"/>',
    coupe:   '<path d="M7.2 3.2h9.6l-1 6.1a3.9 3.9 0 0 1-7.6 0zM12 15.3v5.5M8.6 20.8h6.8"/>',
    rose:    '<path d="M12 21V9.6M12 21c0-4.4-2.2-6.6-5.2-6.9M12 21c0-4.4 2.2-6.6 5.2-6.9M12 9.6a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4"/>',
    pochon:  '<path d="M6.2 8.6h11.6l1.1 11.9H5.1zM9.2 8.6V6.4a2.8 2.8 0 0 1 5.6 0v2.2"/>',
    cloche:  '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'
  };

  function icon(name, size) {
    const d = ICONS[name] || ICONS.cloche;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"
      stroke-linecap="round" stroke-linejoin="round"${size ? ` width="${size}" height="${size}"` : ''}
      aria-hidden="true">${d}</svg>`;
  }

  const ARROW = '<svg viewBox="0 0 16 8" fill="none" aria-hidden="true"><path d="M0 4h14M11 1l3 3-3 3" stroke="currentColor" stroke-width="1"/></svg>';

  /* ----------------------------------------------------------
     Fragments de balisage
     ---------------------------------------------------------- */

  function placeholder(text, ratio = '4x5') {
    return `<div class="im-ph im-ph--${ratio}" data-ph="${esc(text)}" role="img" aria-label="${esc(text)}"></div>`;
  }

  /* Une vraie photo si elle existe, sinon le placeholder qui affiche la
     consigne de cadrage. C'est le seul point de bascule : dès qu'un produit
     reçoit un champ `img` dans products.js, la photo remplace le carton. */
  function media(text, ratio = '4x5', img = null, alt = null) {
    if (!img) return placeholder(text, ratio);
    return `<img class="im-img im-img--${ratio}" src="${imgUrl(img)}"
      alt="${esc(alt || text)}" loading="lazy" decoding="async">`;
  }

  /* Version des visuels produits, écrite par tools/process_images.py.
     Sans elle, un visiteur garde en cache l'ancienne photo d'un produit
     après un changement d'image. */
  function imgUrl(path) {
    const v = (typeof IM_IMG_V === 'string') ? `?v=${IM_IMG_V}` : '';
    return `assets/img/${path}${v}`;
  }

  /* Une entrée de galerie est soit une consigne de cadrage (chaîne),
     soit un objet { ph, img } quand la photo est livrée. */
  function galleryItem(entry) {
    if (typeof entry === 'string') return media(entry, '1x1', null);
    return media(entry.ph, '1x1', entry.img, entry.alt);
  }

  function categoryCard(cat) {
    const n = IM.byCat(cat.id).length;
    return `
      <a class="im-cat" href="index.html#${cat.id}">
        ${media(cat.ph, '3x4', cat.img, cat.alt)}
        <div class="im-cat__body">
          <span class="im-cat__glyph">${icon(cat.icon)}</span>
          <p class="im-cat__name">${esc(cat.name)}</p>
          <p class="im-cat__desc">${esc(cat.desc)}</p>
          <p class="im-cat__count">${n} attention${n > 1 ? 's' : ''}</p>
        </div>
      </a>`;
  }

  function productCard(p) {
    const flags = [];
    if (p.badge) flags.push(`<span class="im-badge im-badge--${p.badge.kind}">${esc(p.badge.label)}</span>`);
    else if (p.signature) flags.push('<span class="im-badge im-badge--signature">Pack signature</span>');
    const qty = IMCart.qtyOf(p.id);
    return `
      <article class="im-card im-reveal" data-product="${p.id}"${p.signature ? ' data-feature="true"' : ''}>
        <a class="im-card__media" href="produit.html?id=${p.id}" aria-label="Voir ${esc(p.name)} en détail">
          ${media(p.ph, '4x5', p.img, p.alt)}
          ${flags.length ? `<div class="im-card__flags">${flags.join('')}</div>` : ''}
        </a>
        <div class="im-card__body">
          <p class="im-card__kicker">${esc(p.kicker)}</p>
          <h3 class="im-card__name">${esc(p.name)}</h3>
          <p class="im-card__desc">${esc(p.short)}</p>

          <details class="im-card__more">
            <summary>Ce qui est inclus</summary>
            <ul>${p.includes.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
            ${p.alcohol ? '<p class="im-card__legal">Contient de l’alcool. Vente interdite aux mineurs de 18 ans.</p>' : ''}
          </details>

          <div class="im-card__foot">
            ${prix(p)}
            ${qty
              ? `<div class="im-qty im-qty--sm">
                   <button type="button" data-line-minus="${p.id}" aria-label="Retirer une unité de ${esc(p.name)}">−</button>
                   <output aria-live="polite">${qty}</output>
                   <button type="button" data-line-plus="${p.id}" aria-label="Ajouter une unité de ${esc(p.name)}">+</button>
                 </div>`
              : `<button class="im-add" type="button" data-add="${p.id}">
                   <span aria-hidden="true">+</span><span>Ajouter</span>
                 </button>`}
          </div>
        </div>
      </article>`;
  }

  function bump(p, kicker) {
    return `
      <div class="im-bump" data-product="${p.id}">
        <div class="im-bump__media">${media(p.ph, '1x1', p.img, p.alt)}</div>
        <div class="im-bump__body">
          <p class="im-bump__kicker">${esc(kicker)}</p>
          <p class="im-bump__name">${esc(p.name)}</p>
          <p class="im-bump__desc">${esc(p.short)}</p>
        </div>
        <div class="im-bump__side">
          <span class="im-price">${IM.euro(p.price)}</span>
          <button class="im-btn im-btn--ghost im-btn--sm" type="button" data-add="${p.id}">Ajouter</button>
        </div>
      </div>`;
  }

  /* ----------------------------------------------------------
     Notification d'ajout
     ---------------------------------------------------------- */

  let toastEl = null;
  let toastTimer = null;

  function toast(name) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'im-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = `
      <span class="im-toast__glyph" aria-hidden="true">❤︎</span>
      <p class="im-toast__txt">${esc(name)} ajouté à votre séjour<small>${IMCart.count()} attention${IMCart.count() > 1 ? 's' : ''} · ${IM.euro(IMCart.total())}</small></p>
      <a class="im-arrow" href="commander.html">Voir${ARROW}</a>`;
    requestAnimationFrame(() => toastEl.setAttribute('data-show', 'true'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.setAttribute('data-show', 'false'), 4200);
  }

  /* Le prix, et ce que les mêmes articles coûteraient séparément.
     L'économie affichée vaut mieux qu'un argument : le client la
     calcule tout seul, et plus vite que nous. */
  function prix(p) {
    const economie = (typeof p.value === 'number' && p.value > p.price)
      ? `<span class="im-card__valeur"><s>${IM.euro(p.value)}</s> séparément</span>` : '';
    return `<span class="im-card__prix">
      <span class="im-price im-card__price">${IM.euro(p.price)}</span>${economie}
    </span>`;
  }

  function footMarkup(p) {
    const qty = IMCart.qtyOf(p.id);
    return `
      ${prix(p)}
      ${qty
        ? `<div class="im-qty im-qty--sm">
             <button type="button" data-line-minus="${p.id}" aria-label="Retirer une unité de ${esc(p.name)}">−</button>
             <output aria-live="polite">${qty}</output>
             <button type="button" data-line-plus="${p.id}" aria-label="Ajouter une unité de ${esc(p.name)}">+</button>
           </div>`
        : `<button class="im-add" type="button" data-add="${p.id}">
             <span aria-hidden="true">+</span><span>Ajouter</span>
           </button>`}`;
  }

  function syncCards() {
    $$('.im-card[data-product]').forEach((card) => {
      const p = IM.byId(card.getAttribute('data-product'));
      const foot = $('.im-card__foot', card);
      if (!p || !foot) return;
      const next = footMarkup(p);
      if (foot.dataset.state !== next) {
        foot.innerHTML = next;
        foot.dataset.state = next;
      }
      card.setAttribute('data-in-cart', String(IMCart.has(p.id)));
    });
  }

  /* Barre de panier permanente : le total et le bouton de paiement
     restent sous les yeux pendant tout le parcours. */
  function renderCartBar() {
    let bar = $('[data-cartbar]');
    /* Le tableau de préparation est l'écran de l'hôte : le panier
       d'un client n'a rien à y faire. */
    const n = $('[data-render="board"]') ? 0 : IMCart.count();

    if (!n) {
      if (bar) bar.setAttribute('data-show', 'false');
      document.body.removeAttribute('data-has-cartbar');
      return;
    }

    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'im-cartbar';
      bar.setAttribute('data-cartbar', '');
      document.body.appendChild(bar);
    }

    const onCheckout = /commander\.html$/.test(location.pathname);
    bar.innerHTML = `
      <div class="im-cartbar__inner">
        <div class="im-cartbar__info">
          <p class="im-cartbar__label">${n} attention${n > 1 ? 's' : ''}</p>
          <p class="im-price im-cartbar__total">${IM.euro(IMCart.total())}</p>
        </div>
        ${onCheckout
          ? '<span class="im-cartbar__hint">Complétez vos informations ci-dessous</span>'
          : '<a class="im-btn im-btn--primary" href="commander.html">Valider mon séjour <span aria-hidden="true">❤︎</span></a>'}
      </div>`;
    bar.setAttribute('data-show', 'true');
    document.body.setAttribute('data-has-cartbar', 'true');
  }

  /* ----------------------------------------------------------
     En-tête
     ---------------------------------------------------------- */

  function initHeader() {
    const burger = $('[data-burger]');
    const nav = $('[data-nav]');
    if (burger && nav) {
      burger.addEventListener('click', () => {
        const open = burger.getAttribute('aria-expanded') === 'true';
        burger.setAttribute('aria-expanded', String(!open));
        nav.setAttribute('data-open', String(!open));
      });
      $$('a', nav).forEach((a) => a.addEventListener('click', () => {
        burger.setAttribute('aria-expanded', 'false');
        nav.setAttribute('data-open', 'false');
      }));
    }

    IMCart.onChange(() => {
      const n = IMCart.count();
      $$('[data-cart-count]').forEach((el) => {
        el.textContent = n;
        el.setAttribute('data-empty', String(n === 0));
      });
      $$('[data-cart-total]').forEach((el) => { el.textContent = IM.euro(IMCart.total()); });
      syncCards();
      syncFlow();
      renderCartBar();
    });
  }

  /* ----------------------------------------------------------
     Entrée du hero et en-tête flottant
     Équivalent d'AnimatedGroup : les éléments portent leur rang
     dans --i, la CSS calcule le décalage. Une seule levée de
     classe, pas d'observateur : le hero est au-dessus du pli.
     ---------------------------------------------------------- */

  function initHeroAnim() {
    const items = $$('.im-anim');
    if (!items.length) return;
    /* Deux trames d'attente : les polices ont le temps de se poser,
       sinon on anime un texte qui va encore changer de métrique. */
    requestAnimationFrame(() => requestAnimationFrame(() => {
      items.forEach((el) => el.classList.add('is-in'));
    }));
  }

  /* ----------------------------------------------------------
     Ce qui est compris
     Un atout à la fois : le menu bascule la photo et le masque qui
     la découpe. L'animation des formes est en CSS ; ici on se
     contente de la relancer, en forçant un reflow entre le retrait
     et la repose de la classe — sans quoi le navigateur regroupe
     les deux et l'animation ne repart pas.
     ---------------------------------------------------------- */

  const ATOUTS = [
    { img: 'lieu/tour-douche.webp', clip: 'im-clip-bandes',   titre: 'La douche à l’italienne' },
    { img: 'lieu/tour-balneo.webp', clip: 'im-clip-mosaique', titre: 'Le balnéo deux places' },
    { img: 'lieu/tour-lit.webp',    clip: 'im-clip-carres',   titre: 'Le lit king size' }
  ];

  function initAtouts() {
    const host = $('[data-atouts]');
    if (!host) return;

    const boutons = $$('[data-atout]', host);
    const groupe = $('[data-atout-groupe]', host);
    const image = $('[data-atout-image]', host);
    const titre = $('[data-atout-titre]', host);
    if (!boutons.length || !groupe || !image) return;

    let actif = 0;

    /* L'instant où le masque de l'atout affiché a (re)démarré son
       cycle : c'est la référence de phase du minuteur d'enchaînement. */
    let ancre = performance.now();

    const montrer = (i) => {
      if (i === actif) return;
      actif = i;
      const a = ATOUTS[i];

      boutons.forEach((b, n) => b.setAttribute('aria-pressed', String(n === i)));
      image.setAttribute('href', `assets/img/${a.img}`);
      groupe.setAttribute('clip-path', `url(#${a.clip})`);
      if (titre) titre.textContent = a.titre;

      /* Les formes du nouveau masque reprennent leur cycle au début,
         sinon on les découvre au milieu de leur respiration. */
      const formes = $$(`#${a.clip} .im-path`, host);
      formes.forEach((f) => { f.style.animation = 'none'; });
      void host.offsetWidth;
      formes.forEach((f) => { f.style.animation = ''; });
      ancre = performance.now();
    };

    boutons.forEach((b, i) => {
      b.addEventListener('mouseenter', () => montrer(i));
      b.addEventListener('focus', () => montrer(i));
      b.addEventListener('click', () => montrer(i));
    });

    /* --- Enchaînement automatique, calé sur la phase du masque ---

       Sur téléphone il n'y a pas de survol : sans ceci, la photo
       restait figée sur la douche pour toujours.

       Pas d'évènement d'animation ici : les formes vivent dans un
       <clipPath>, un contexte que Safari ne rend pas directement, et
       leurs évènements d'itération n'y sont pas fiables (constaté :
       l'enchaînement ne partait jamais sur iPhone). On calcule donc
       l'instant de bascule : chaque réarmement du masque pose une
       ancre, le cycle dure 6,2 s, et les formes sont toutes refermées
       de 74 % à 100 % du cycle. À 5,5 s de phase, l'écran est noir :
       c'est là qu'on change de photo, hors champ. Le minuteur se
       recale à chaque tour sur la phase réelle, donc il ne dérive pas,
       et un tour raté (section hors écran, onglet caché) se retente
       un cycle plus tard, toujours dans le noir. */
    {
      const CYCLE = 6200;
      const FERME = 5500;
      let enVue = false;
      let manuel = false;
      let reprise = null;
      let prochain = null;

      const caler = () => {
        const phase = (performance.now() - ancre) % CYCLE;
        let attente = FERME - phase;
        while (attente < 200) attente += CYCLE;
        clearTimeout(prochain);
        prochain = setTimeout(avancer, attente);
      };

      const avancer = () => {
        if (enVue && !manuel && !document.hidden) montrer((actif + 1) % ATOUTS.length);
        caler();
      };

      /* Visibilité lue dans la boucle de trames, pour la même raison
         que le rotateur : l'observateur est muet sur ce document. */
      IMFrame.add(() => {
        const h = window.innerHeight || document.documentElement.clientHeight;
        const r = host.getBoundingClientRect();
        enVue = r.top < h * 0.7 && r.bottom > h * 0.3;
      });

      /* Quand le visiteur prend la main (survol ou tap sur un bouton),
         l'automatique s'efface, puis reprend après douze secondes sans
         nouveau contact. Un arrêt définitif punirait un simple tap
         curieux : la vitrine redeviendrait morte pour toute la visite. */
      boutons.forEach((b) => b.addEventListener('pointerenter', () => {
        manuel = true;
        clearTimeout(reprise);
        reprise = setTimeout(() => { manuel = false; }, 12000);
      }));

      caler();
    }
  }

  function initHeaderScroll() {
    const header = $('.im-header');
    if (!header) return;
    /* Ni écouteur de défilement ni observateur : sur ce document, ni l'un
       ni l'autre n'est fiable (`overflow-x: hidden` sur le body déplace le
       conteneur de défilement). On lit la position dans la boucle unique. */
    let last = null;
    IMFrame.add(() => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const scrolled = y > 40;
      if (scrolled !== last) {
        header.setAttribute('data-scrolled', String(scrolled));
        last = scrolled;
      }
    });
  }


  /* ----------------------------------------------------------
     Mot qui défile dans le hero
     Équivalent du composant framer-motion fourni : un index qui
     avance, trois états de position, la transition est en CSS.
     Les mots sont lus dans le DOM pour rester indexables.
     ---------------------------------------------------------- */

  function initRotator() {
    const host = $('[data-rotator]');
    if (!host) return;

    const words = $$('span', host);
    if (words.length < 2) return;

    const delay = parseInt(host.getAttribute('data-rotator-delay'), 10) || 2400;
    let index = 0;

    const paint = () => {
      words.forEach((w, i) => {
        w.setAttribute('data-pos',
          i === index ? 'current' : (i < index ? 'previous' : 'next'));
        w.setAttribute('aria-hidden', String(i !== index));
      });
    };

    paint();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let timer = null;
    const tick = () => {
      index = (index + 1) % words.length;
      /* Au retour à zéro, les mots sortis par le haut sont replacés
         en bas sans transition, sinon ils traverseraient le cadre. */
      if (index === 0) {
        words.forEach((w) => {
          w.style.transition = 'none';
          w.setAttribute('data-pos', 'next');
        });
        void host.offsetHeight;
        words.forEach((w) => { w.style.transition = ''; });
      }
      paint();
    };

    const start = () => { if (!timer) timer = setInterval(tick, delay); };
    const stop = () => { clearInterval(timer); timer = null; };

    /* On n'anime pas dans un onglet en arrière-plan ni quand le hero
       est sorti de l'écran. */
    document.addEventListener('visibilitychange', () => {
      document.hidden ? stop() : start();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((e) => (e.isIntersecting ? start() : stop()));
      }, { threshold: 0.1 }).observe(host);
    } else {
      start();
    }
  }

  /* ----------------------------------------------------------
     Apparition au scroll
     ---------------------------------------------------------- */

  function initReveal() {
    const items = $$('.im-reveal');
    if (!items.length) return;

    items.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i % 4, 3) * 70}ms`;
    });

    /* Ni écouteur de défilement ni IntersectionObserver : même verdict
       que pour l'en-tête, quelques lignes plus bas. Sur ce document le
       body est le conteneur de défilement, et sur iPhone ces signaux ne
       se déclenchaient pas — les sections restaient invisibles ou
       surgissaient sans fondu. On lit donc la position à chaque trame,
       dans la boucle unique déjà payée par l'en-tête.

       Le sens de panne est choisi : un élément au rectangle nul (bloc
       replié, mise en page pas encore posée) se révèle immédiatement.
       Au pire le fondu manque ; jamais un contenu ne reste caché. */
    let restants = items.slice();
    IMFrame.add(() => {
      if (!restants.length) return;
      const seuil = (window.innerHeight || document.documentElement.clientHeight) * 0.92;
      restants = restants.filter((el) => {
        if (el.getBoundingClientRect().top >= seuil) return true;
        el.classList.add('is-in');
        return false;
      });
    });
  }

  /* ----------------------------------------------------------
     Ajout au panier — délégation globale
     ---------------------------------------------------------- */

  function initAddButtons() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-add]');
      if (!btn) return;
      e.preventDefault();
      const id = btn.getAttribute('data-add');
      const product = IM.byId(id);
      if (!product) return;
      const qty = parseInt(btn.getAttribute('data-qty') || '1', 10) || 1;
      IMCart.add(id, qty);
      toast(product.name);

      /* Sur l'écran de validation, les lignes doivent être reconstruites.
         Ailleurs, syncCards() a déjà fait le travail via onChange. */
      if ($('[data-render="checkout"]')) {
        renderCheckout();
        return;
      }
      renderSuggestions();
    });
  }

  /* ----------------------------------------------------------
     Catalogue
     ---------------------------------------------------------- */

  function renderCatalogue() {
    const host = $('[data-render="catalogue"]');
    if (!host) return;

    /* Deux systèmes coexistaient — un carrousel pour les packs, trois
       grilles de vignettes pour le reste — et on ne savait plus où
       chercher quoi. Il n'en reste qu'un seul point d'achat : le
       compositeur, qui couvre les 17 attentions. Le carrousel garde
       son rôle de vitrine au-dessus. */
    host.innerHTML = '<div data-flow-host></div><div data-compose-host></div>';

    const flowHost = $('[data-flow-host]', host);
    if (flowHost) initFlow(flowHost, IM.byCat('packs'));

    const composeHost = $('[data-compose-host]', host);
    if (composeHost) initCompose(composeHost);
  }


  /* ----------------------------------------------------------
     Boucle d'animation unique
     Une seule requestAnimationFrame pour tout ce qui suit le
     défilement. Les événements `scroll` et les observateurs
     d'intersection ne sont pas fiables sur ce document : la boucle
     mesure elle-même, à chaque trame, et se met en pause quand
     l'onglet passe en arrière-plan.
     ---------------------------------------------------------- */

  const IMFrame = (() => {
    const jobs = [];
    let running = false;

    const tick = () => {
      if (document.hidden) { running = false; return; }
      for (let i = 0; i < jobs.length; i++) jobs[i]();
      requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || !jobs.length) return;
      running = true;
      requestAnimationFrame(tick);
    };

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) start();
    });

    return {
      add(fn) { jobs.push(fn); start(); }
    };
  })();

  /* ----------------------------------------------------------
     Vitrine des packs
     Une grande photo à gauche, le pack en clair à droite : un seul
     pack lisible à la fois, sans texte plaqué sur l'image. Les photos
     restent toutes montées (empilées, en fondu) pour une transition
     douce ; le panneau de texte est reconstruit à chaque changement.
     Autoplay suspendu au survol, au focus et hors écran. Glissé
     tactile et flèches du clavier quand la section est visible.
     ---------------------------------------------------------- */

  const CHEV_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 19l-7-7 7-7"/></svg>';
  const CHEV_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  const PLUS   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

  function flowPhoto(p, i) {
    const badge = p.badge
      ? `<span class="im-badge im-badge--${p.badge.kind}">${esc(p.badge.label)}</span>`
      : (p.signature ? '<span class="im-badge im-badge--signature">Pack signature</span>' : '');
    /* Léger angle propre à chaque pack, alterné et non aléatoire :
       la pile de photos garde un rendu stable d'un rendu à l'autre. */
    const tilt = (i % 2 === 0 ? 1 : -1) * (3 + (i % 3));
    return `
      <div class="im-flow__photo" data-flow-photo="${i}" data-pos="hidden" style="--tilt:${tilt}deg">
        ${media(p.ph, '4x5', p.img, p.alt)}
        <div class="im-flow__tag">${badge}</div>
      </div>`;
  }

  function flowPanelHTML(p) {
    return `
      <p class="im-flow__kicker">${esc(p.kicker)}</p>
      <h3 class="im-flow__name">${esc(p.name)}</h3>
      <span class="im-flow__rule" aria-hidden="true"></span>
      <p class="im-flow__desc">${esc(p.short)}</p>
      <div class="im-flow__actions">
        <button class="im-flow__cta" type="button" data-add="${p.id}" data-flow-cta="${p.id}">
          ${PLUS}<span>Ajouter · ${IM.euro(p.price)}</span>
        </button>
        <a class="im-flow__detail" href="#composer" data-compose-select="${p.id}">Voir le détail</a>
      </div>`;
  }

  function initFlow(host, list) {
    const total = list.length;

    host.innerHTML = `
      <section class="im-flow" id="packs" aria-roledescription="carrousel" aria-label="Nos packs">
        <div class="im-flow__inner">
          <p class="im-flow__label">Nos packs</p>
          <div class="im-flow__grid">
            <div class="im-flow__media" data-flow-stage>
              ${list.map(flowPhoto).join('')}
            </div>
            <div class="im-flow__content">
              <div class="im-flow__panel" data-flow-panel></div>
              <div class="im-flow__controls">
                <div class="im-flow__dots" data-flow-dots>
                  ${list.map((p, i) => `<button type="button" data-flow-dot="${i}" aria-label="Aller au ${esc(p.name)}"></button>`).join('')}
                </div>
                <div class="im-flow__arrows">
                  <button class="im-flow__nav" type="button" data-flow-prev aria-label="Pack précédent">${CHEV_L}</button>
                  <button class="im-flow__nav" type="button" data-flow-next aria-label="Pack suivant">${CHEV_R}</button>
                </div>
              </div>
            </div>
          </div>
          <span data-flow-live aria-live="polite" class="im-sr"></span>
        </div>
      </section>`;

    const photos = $$('[data-flow-photo]', host);
    const dots = $$('[data-flow-dot]', host);
    const panel = $('[data-flow-panel]', host);
    const live = $('[data-flow-live]', host);
    const section = $('.im-flow', host);
    let index = 0;

    const paint = () => {
      photos.forEach((el, i) => el.setAttribute('data-pos', i === index ? 'active' : 'hidden'));
      dots.forEach((d, i) => d.setAttribute('aria-current', String(i === index)));

      const p = list[index];
      panel.classList.remove('im-flow__panel--in');
      panel.innerHTML = flowPanelHTML(p);
      void panel.offsetWidth; /* force le reflow pour rejouer l'animation d'entrée */
      panel.classList.add('im-flow__panel--in');

      if (live) live.textContent = `${p.name}, ${index + 1} sur ${total}`;
      syncFlow();
    };

    const go = (n) => { index = (n + total) % total; paint(); };

    /* --- Défilement automatique --- */
    let timer = null;
    let visible = false;
    let paused = false;
    const tick = () => go(index + 1);
    const sync = () => {
      /* Le fondu croisé des photos ne bouge rien : il reste actif
         sous « réduire les animations », comme le rotateur. */
      const run = visible && !paused && total > 1 && !document.hidden;
      if (run && !timer) timer = setInterval(tick, 5600);
      if (!run && timer) { clearInterval(timer); timer = null; }
    };

    section.addEventListener('mouseenter', () => { paused = true; sync(); });
    section.addEventListener('mouseleave', () => { paused = false; sync(); });
    section.addEventListener('focusin', () => { paused = true; sync(); });
    section.addEventListener('focusout', () => { paused = false; sync(); });
    document.addEventListener('visibilitychange', sync);

    /* Visibilité lue dans la boucle de trames — dernier des quatre
       morceaux accrochés à IntersectionObserver, muet sur iPhone
       avec ce document dont le body est le conteneur de défilement. */
    IMFrame.add(() => {
      const h = window.innerHeight || document.documentElement.clientHeight;
      const r = section.getBoundingClientRect();
      const d = r.top < h * 0.75 && r.bottom > h * 0.25;
      if (d !== visible) { visible = d; sync(); }
    });

    /* --- Commandes --- */
    $('[data-flow-prev]', host).addEventListener('click', () => go(index - 1));
    $('[data-flow-next]', host).addEventListener('click', () => go(index + 1));
    dots.forEach((d, i) => d.addEventListener('click', () => go(i)));

    /* Flèches du clavier, seulement quand le carrousel est à l'écran. */
    document.addEventListener('keydown', (e) => {
      if (!visible) return;
      if (e.target.matches('input, textarea, select')) return;
      if (e.key === 'ArrowLeft') { go(index - 1); }
      if (e.key === 'ArrowRight') { go(index + 1); }
    });

    /* Glissé tactile. */
    let startX = null;
    section.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    section.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const d = e.changedTouches[0].clientX - startX;
      if (Math.abs(d) > 45) go(index + (d < 0 ? 1 : -1));
      startX = null;
    }, { passive: true });

    paint();
  }

  /* Les boutons du coverflow reflètent le panier comme les cartes. */
  function syncFlow() {
    $$('[data-flow-cta]').forEach((btn) => {
      const id = btn.getAttribute('data-flow-cta');
      const p = IM.byId(id);
      if (!p) return;
      const qty = IMCart.qtyOf(id);
      const label = qty
        ? `Au panier · ${qty} × ${IM.euro(p.price)}`
        : `Ajouter · ${IM.euro(p.price)}`;
      const span = $('span', btn);
      if (span && span.textContent !== label) span.textContent = label;
      btn.setAttribute('data-state', qty ? 'added' : 'idle');
    });
  }

  /* ----------------------------------------------------------
     Compositeur
     Une seule interface d'achat : deux menus déroulants à droite,
     le panier qui se remplit à gauche. Remplace les grilles de
     vignettes — le client a déjà réservé, il compose une commande.
     ---------------------------------------------------------- */

  function composeMarkup() {
    return `
      <section class="im-section im-section--tight" id="composer">
        <div class="im-shell">
          <div class="im-head im-head--row">
            <div>
              <span class="im-eyebrow">Composez votre soirée</span>
              <h2>Choisissez, tout arrive dans votre séjour.</h2>
            </div>
          </div>

          <div class="im-compose__grid">
            <aside class="im-compose__cart" data-compose-cart aria-live="polite"></aside>

            <div class="im-compose__picker">
              <div class="im-compose__selects">
                <div class="im-field">
                  <label for="cp-cat">Catégorie</label>
                  <select id="cp-cat" data-compose-cat></select>
                </div>
                <div class="im-field">
                  <label for="cp-prod">Attention</label>
                  <select id="cp-prod" data-compose-prod></select>
                </div>
              </div>
              <div data-compose-preview></div>
            </div>
          </div>
        </div>
      </section>`;
  }

  function initCompose(host) {
    host.innerHTML = composeMarkup();

    const selCat = $('[data-compose-cat]', host);
    const selProd = $('[data-compose-prod]', host);
    const preview = $('[data-compose-preview]', host);
    const cartBox = $('[data-compose-cart]', host);
    let qty = 1;
    let dernierAjout = null;

    /* --- Menus --- */

    selCat.innerHTML = IM.categories
      .filter((c) => IM.byCat(c.id).length)
      .map((c) => `<option value="${c.id}">${esc(c.name)} · ${IM.byCat(c.id).length}</option>`)
      .join('');

    const remplirProduits = (catId, choisir) => {
      const list = IM.byCat(catId);
      selProd.innerHTML = list
        .map((p) => `<option value="${p.id}">${esc(p.name)}, ${IM.euro(p.price)}</option>`)
        .join('');
      if (choisir && list.some((p) => p.id === choisir)) selProd.value = choisir;
      renderPreview();
    };

    /* --- Aperçu --- */

    function renderPreview() {
      const p = IM.byId(selProd.value);
      if (!p) { preview.innerHTML = ''; return; }
      qty = 1;
      preview.innerHTML = `
        <div class="im-compose__preview">
          <div class="im-compose__shot">${media(p.ph, '4x5', p.img, p.alt)}</div>
          <div>
            <p class="im-compose__kicker">${esc(p.kicker)}</p>
            <h3 class="im-compose__name">${esc(p.name)}</h3>
            <p class="im-compose__desc">${esc(p.desc)}</p>
            <ul class="im-compose__incl">
              ${p.includes.map((i) => `<li>${esc(i)}</li>`).join('')}
            </ul>
            ${p.alcohol ? '<p class="im-card__legal">Contient de l’alcool. Vente interdite aux mineurs de 18 ans.</p>' : ''}
            <div class="im-compose__buy">
              <span class="im-price im-compose__price">${IM.euro(p.price)}</span>
              <div class="im-qty">
                <button type="button" data-cp-minus aria-label="Retirer une unité">−</button>
                <output data-cp-qty aria-live="polite">1</output>
                <button type="button" data-cp-plus aria-label="Ajouter une unité">+</button>
              </div>
              <button class="im-btn im-btn--primary" type="button" data-cp-add="${p.id}">
                Ajouter à mon séjour <span aria-hidden="true">❤︎</span>
              </button>
            </div>
          </div>
        </div>`;
    }

    /* --- Panier --- */

    function renderCart() {
      const lines = IMCart.lines();
      const n = IMCart.count();

      if (!lines.length) {
        cartBox.innerHTML = `
          <h3>Votre séjour <span class="im-compose__count">vide</span></h3>
          <p class="im-compose__vide">
            Rien encore. Choisissez une catégorie, puis une attention :
            elle viendra se poser ici.
          </p>`;
        return;
      }

      cartBox.innerHTML = `
        <h3>Votre séjour <span class="im-compose__count">${n} attention${n > 1 ? 's' : ''}</span></h3>
        <ul class="im-compose__lines">
          ${lines.map((l) => `
            <li data-fresh="${String(l.product.id === dernierAjout)}">
              <span class="im-compose__lname">${esc(l.product.name)}</span>
              <span class="im-price im-compose__lsum">${IM.euro(l.total)}</span>
              <span class="im-compose__ltools">
                <span class="im-qty im-qty--sm">
                  <button type="button" data-line-minus="${l.product.id}" aria-label="Retirer une unité de ${esc(l.product.name)}">−</button>
                  <output aria-live="polite">${l.qty}</output>
                  <button type="button" data-line-plus="${l.product.id}" aria-label="Ajouter une unité de ${esc(l.product.name)}">+</button>
                </span>
                <button class="im-compose__drop" type="button" data-line-remove="${l.product.id}">Retirer</button>
              </span>
            </li>`).join('')}
        </ul>
        <p class="im-compose__total"><span>Total</span><span class="im-price">${IM.euro(IMCart.total())}</span></p>
        <a class="im-btn im-btn--primary im-btn--block" href="commander.html">
          Valider mon séjour <span aria-hidden="true">❤︎</span>
        </a>
        <p class="im-compose__legal">
          Vos attentions seront préparées avant votre arrivée.
          Commande à passer avant 18 h la veille.
        </p>`;

      dernierAjout = null;
    }

    /* --- Interactions --- */

    selCat.addEventListener('change', () => remplirProduits(selCat.value));
    selProd.addEventListener('change', renderPreview);

    preview.addEventListener('click', (e) => {
      const moins = e.target.closest('[data-cp-minus]');
      const plus = e.target.closest('[data-cp-plus]');
      const add = e.target.closest('[data-cp-add]');
      if (moins || plus) {
        qty = Math.min(9, Math.max(1, qty + (plus ? 1 : -1)));
        const out = $('[data-cp-qty]', preview);
        if (out) out.textContent = qty;
        return;
      }
      if (add) {
        const id = add.getAttribute('data-cp-add');
        IMCart.add(id, qty);
        dernierAjout = id;
        toast(IM.byId(id).name);
        renderCart();
        qty = 1;
        const out = $('[data-cp-qty]', preview);
        if (out) out.textContent = '1';
      }
    });

    /* Les +/− et « Retirer » du panier passent par le gestionnaire
       global ; on se contente de redessiner après coup. */
    cartBox.addEventListener('click', (e) => {
      if (e.target.closest('[data-line-plus], [data-line-minus], [data-line-remove]')) {
        setTimeout(renderCart, 0);
      }
    });

    /* Le coverflow envoie ici avec un pack présélectionné. */
    document.addEventListener('click', (e) => {
      const lien = e.target.closest('[data-compose-select]');
      if (!lien) return;
      e.preventDefault();
      const p = IM.byId(lien.getAttribute('data-compose-select'));
      if (!p) return;
      selCat.value = p.cat;
      remplirProduits(p.cat, p.id);
      host.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    remplirProduits(selCat.value);
    renderCart();
    IMCart.onChange(renderCart);
  }

  /* ----------------------------------------------------------
     Fiche produit
     ---------------------------------------------------------- */

  function renderProduct() {
    const host = $('[data-render="product"]');
    if (!host) return;

    const id = new URLSearchParams(location.search).get('id');
    const p = id ? IM.byId(id) : null;

    if (!p) {
      host.innerHTML = `
        <div class="im-empty">
          <h2>Cette attention n’existe pas</h2>
          <p class="im-quiet">Le lien est peut-être expiré. Retrouvez toutes nos attentions disponibles.</p>
          <a class="im-btn im-btn--primary" href="index.html">Retour à la boutique</a>
        </div>`;
      return;
    }

    document.title = `${p.name}, INTENSÉ'MANS Love Room`;
    const crumb = $('[data-crumb]');
    if (crumb) crumb.textContent = p.name;

    const cat = IM.category(p.cat);
    const flags = [];
    if (p.badge) flags.push(`<span class="im-badge im-badge--${p.badge.kind}">${esc(p.badge.label)}</span>`);
    else if (p.signature) flags.push('<span class="im-badge im-badge--signature">Pack signature</span>');

    host.innerHTML = `
      <div class="im-product">
        <div class="im-product__gallery im-reveal">
          <div style="position:relative">
            ${media(p.ph, '4x5', p.img, p.alt)}
            ${flags.length ? `<div class="im-card__flags">${flags.join('')}</div>` : ''}
          </div>
          <div class="im-product__thumbs">
            ${(p.gallery || []).map(galleryItem).join('')}
          </div>
        </div>

        <div class="im-product__panel im-reveal">
          <span class="im-eyebrow">${esc(cat.name)} · ${esc(p.kicker)}</span>
          <h1>${esc(p.name)}</h1>
          <div class="im-flourish"><span aria-hidden="true">❤︎</span></div>
          <p class="im-lead">${esc(p.desc)}</p>

          <p class="im-product__price">
            <span class="im-price">${IM.euro(p.price)}</span>
            <small>Ajouté au tarif de votre nuit</small>
          </p>

          <h2 class="im-sr">Ce qui est inclus</h2>
          <ul class="im-includes">
            ${p.includes.map((i) => `<li>${esc(i)}</li>`).join('')}
          </ul>

          <div class="im-product__actions">
            <div class="im-qty">
              <button type="button" data-qty-minus aria-label="Retirer une unité">−</button>
              <output data-qty-value aria-live="polite">1</output>
              <button type="button" data-qty-plus aria-label="Ajouter une unité">+</button>
            </div>
            <button class="im-btn im-btn--primary" type="button" data-add="${p.id}" data-qty="1">
              Ajouter à mon séjour <span aria-hidden="true">❤︎</span>
            </button>
          </div>

          <p class="im-note">
            <span aria-hidden="true">✦</span>
            <span>Vos attentions seront préparées avec soin avant votre arrivée dans la Love Room. À commander avant 18 h la veille de votre séjour.</span>
          </p>

          ${p.alcohol ? '<p class="im-alcool">Contient de l’alcool. Vente interdite aux mineurs de moins de 18 ans. L’abus d’alcool est dangereux pour la santé, à consommer avec modération.</p>' : ''}
        </div>
      </div>

      ${renderCrossSell(p)}`;

    /* Sélecteur de quantité */
    const out = $('[data-qty-value]', host);
    const addBtn = $(`[data-add="${p.id}"][data-qty]`, host);
    let qty = 1;
    const sync = () => {
      out.textContent = qty;
      addBtn.setAttribute('data-qty', String(qty));
    };
    $('[data-qty-minus]', host).addEventListener('click', () => { qty = Math.max(1, qty - 1); sync(); });
    $('[data-qty-plus]', host).addEventListener('click', () => { qty = Math.min(9, qty + 1); sync(); });

  }

  function renderCrossSell(p) {
    const list = (p.upsell || []).map(IM.byId).filter(Boolean);
    if (!list.length) return '';
    return `
      <section class="im-section im-section--tight" style="border-top:1px solid var(--im-hairline);margin-top:var(--im-section-y)">
        <div class="im-head">
          <span class="im-eyebrow">Souvent ajouté ensemble</span>
          <h2>Pour aller plus loin</h2>
        </div>
        <div class="im-grid">${list.map(productCard).join('')}</div>
      </section>`;
  }

  /* ----------------------------------------------------------
     Écran de validation — panier et informations réunis
     Le formulaire vit dans le HTML de la page : on ne le régénère
     jamais, sinon on effacerait ce que le client vient de taper.
     ---------------------------------------------------------- */

  function renderCheckout() {
    const host = $('[data-render="checkout"]');
    if (!host) return;

    const lines = IMCart.lines();
    const linesHost = $('[data-checkout-lines]', host);
    const sumHost = $('[data-checkout-summary]', host);
    const formWrap = $('[data-checkout-form]', host);

    if (!lines.length) {
      if (formWrap) formWrap.hidden = true;
      if (sumHost) sumHost.hidden = true;
      linesHost.innerHTML = `
        <div class="im-empty">
          <h2>Rien de prévu <span class="im-italic">pour l’instant.</span></h2>
          <p class="im-quiet">Choisissez d’abord ce qui vous attendra dans la suite.</p>
          <a class="im-btn im-btn--primary" href="index.html#packs">Voir les attentions <span aria-hidden="true">❤︎</span></a>
        </div>`;
      return;
    }

    if (formWrap) formWrap.hidden = false;
    if (sumHost) sumHost.hidden = false;

    linesHost.innerHTML = lines.map((l) => `
      <div class="im-line" data-line="${l.product.id}">
        <div>${media(l.product.ph, '1x1', l.product.img, l.product.alt)}</div>
        <div>
          <p class="im-line__name">${esc(l.product.name)}</p>
          <p class="im-line__meta">${IM.euro(l.product.price)} l’unité</p>
          <div class="im-line__ctrl">
            <div class="im-qty im-qty--sm">
              <button type="button" data-line-minus="${l.product.id}" aria-label="Retirer une unité de ${esc(l.product.name)}">−</button>
              <output aria-live="polite">${l.qty}</output>
              <button type="button" data-line-plus="${l.product.id}" aria-label="Ajouter une unité de ${esc(l.product.name)}">+</button>
            </div>
            <button class="im-line__remove" type="button" data-line-remove="${l.product.id}">Retirer</button>
          </div>
        </div>
        <div class="im-line__side"><span class="im-price">${IM.euro(l.total)}</span></div>
      </div>`).join('');

    sumHost.innerHTML = `
      <h2>Votre séjour</h2>
      ${lines.map((l) => `
        <div class="im-summary__row">
          <span>${esc(l.product.name)}${l.qty > 1 ? ` <span class="im-quiet">× ${l.qty}</span>` : ''}</span>
          <span class="im-price">${IM.euro(l.total)}</span>
        </div>`).join('')}
      <div class="im-summary__row im-summary__row--total">
        <span>Total</span>
        <span class="im-price">${IM.euro(IMCart.total())}</span>
      </div>
      <p class="im-summary__legal">
        Vos attentions seront préparées avec soin avant votre arrivée dans la Love Room.
        Commande à passer avant 18 h la veille de votre séjour.
      </p>
      ${IMCart.hasAlcohol() ? '<p class="im-alcool">Votre commande contient de l’alcool. Vente interdite aux mineurs de moins de 18 ans. L’abus d’alcool est dangereux pour la santé.</p>' : ''}`;

    const submitTotal = $('[data-submit-total]', host);
    if (submitTotal) submitTotal.textContent = IM.euro(IMCart.total());

    /* La majorité n'est demandée que si elle est due : cocher une
       case sans objet apprend au client à cocher sans lire. */
    const adultField = $('[data-adult-field]', host);
    if (adultField) {
      const due = IMCart.hasAlcohol() || IMCart.hasAdult();
      adultField.hidden = !due;
      if (!due) {
        const box = $('[name="adult"]', adultField);
        if (box) box.checked = false;
        adultField.setAttribute('data-invalid', 'false');
      }
    }

    renderSuggestions();
  }

  function renderSuggestions() {
    const host = $('[data-suggestions]');
    if (!host) return;
    const list = IMCart.suggestions(2);
    host.innerHTML = list.length
      ? `<p class="im-eyebrow" style="margin-bottom:14px">Souvent ajouté avec votre sélection</p>
         ${list.map((p) => bump(p, 'Une attention de plus')).join('')}`
      : '';
  }

  /* Les +, − et « Retirer » agissent depuis n'importe où : une carte de
     la boutique comme une ligne de l'écran de validation. */
  function initCartControls() {
    document.addEventListener('click', (e) => {
      const plus = e.target.closest('[data-line-plus]');
      const minus = e.target.closest('[data-line-minus]');
      const rm = e.target.closest('[data-line-remove]');
      if (!plus && !minus && !rm) return;
      e.preventDefault();
      if (plus) IMCart.setQty(plus.getAttribute('data-line-plus'), IMCart.qtyOf(plus.getAttribute('data-line-plus')) + 1);
      if (minus) IMCart.setQty(minus.getAttribute('data-line-minus'), IMCart.qtyOf(minus.getAttribute('data-line-minus')) - 1);
      if (rm) IMCart.remove(rm.getAttribute('data-line-remove'));
      if ($('[data-render="checkout"]')) renderCheckout();
    });
  }

  /* ----------------------------------------------------------
     Formulaire du séjour
     ---------------------------------------------------------- */

  function initStayForm() {
    const form = $('[data-form="stay"]');
    if (!form) return;

    const dateInput = $('[name="date"]', form);
    if (dateInput) {
      const today = new Date();
      dateInput.min = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0')
      ].join('-');
    }

    const saved = IMCart.stay();
    Object.keys(saved).forEach((k) => {
      const field = $(`[name="${k}"]`, form);
      if (field && saved[k]) field.value = saved[k];
    });

    const submit = $('button[type="submit"]', form);
    const errBox = $('[data-pay-error]', form);

    const fail = (message) => {
      if (errBox) {
        errBox.textContent = message;
        errBox.hidden = false;
      }
      if (submit) {
        submit.disabled = false;
        submit.removeAttribute('data-busy');
      }
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!IMCart.lines().length) return;
      if (submit && submit.disabled) return;

      let ok = true;
      $$('[data-required]', form).forEach((field) => {
        if (field.hidden) return;
        const input = $('input, select, textarea', field);
        const valid = input.type === 'checkbox' ? input.checked : input.value.trim() !== '';
        field.setAttribute('data-invalid', String(!valid));
        const err = $('.im-field__err', field);
        if (err) err.hidden = valid;
        if (!valid && ok) { input.focus(); ok = false; }
      });
      if (!ok) return;

      const data = {};
      ['name', 'date', 'arrival', 'resa', 'message'].forEach((k) => {
        const input = $(`[name="${k}"]`, form);
        if (input) data[k] = input.value.trim();
      });
      IMCart.saveStay(data);

      if (errBox) errBox.hidden = true;
      if (submit) {
        submit.disabled = true;
        submit.setAttribute('data-busy', 'true');
      }

      const adultBox = $('[name="adult"]', form);
      const payload = {
        stay: data,
        adult: Boolean(adultBox && adultBox.checked),
        items: IMCart.lines().map((l) => ({ id: l.product.id, qty: l.qty }))
      };

      let result;
      try {
        const res = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
        result = await res.json().catch(() => ({}));
        if (!res.ok || !result.url) {
          fail(result.error || 'Le paiement n’a pas pu être ouvert. Réessayez dans un instant.');
          return;
        }
      } catch (err) {
        fail('Connexion impossible. Vérifiez votre réseau, puis réessayez.');
        return;
      }

      /* Le récapitulatif est posé avant de partir chez Stripe : au
         retour, la confirmation l'affiche sans interroger le serveur.
         Ce qui fait foi pour le paiement, c'est le webhook — jamais
         ce que le navigateur rapporte. */
      try {
        sessionStorage.setItem('im_order', JSON.stringify({
          ref: result.ref,
          stay: data,
          lines: IMCart.lines().map((l) => ({ name: l.product.name, qty: l.qty, total: l.total })),
          total: IMCart.total()
        }));
      } catch (err) { /* rien de bloquant */ }

      location.href = result.url;
    });
  }

  /* ----------------------------------------------------------
     Tableau de préparation
     Portage du composant NotificationCenter : lignes groupées,
     liseré d'urgence, point « non préparé », corps dépliable,
     actions groupées en tête. Une ligne = une commande à préparer.
     ---------------------------------------------------------- */

  const TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  function renderBoard() {
    const host = $('[data-render="board"]');
    if (!host) return;

    const orders = IMOrders.all();
    const pending = IMOrders.pending();

    const head = `
      <header class="im-notif__head">
        <h2 class="im-notif__title">
          À préparer
          ${pending ? `<span class="im-notif__count">${pending}</span>` : ''}
        </h2>
        <div class="im-notif__actions">
          ${orders.length ? `
            ${pending ? '<button type="button" data-board-all>Tout marquer préparé</button>' : ''}
            <button type="button" data-board-archive data-danger>Archiver les séjours passés</button>` : ''}
          <button type="button" data-board-logout>Se déconnecter</button>
        </div>
      </header>`;

    if (!orders.length) {
      host.innerHTML = `
        <section class="im-notif">
          ${head}
          <div class="im-notif__empty">
            ${TICK}
            <p>Aucune arrivée. Rien à préparer.</p>
          </div>
          <footer class="im-notif__foot">En attente de commandes</footer>
        </section>`;
      return;
    }

    /* Regroupement par date de séjour : c'est la vue que le brief
       demande explicitement en section 15. */
    const groups = [];
    orders.forEach((o) => {
      const label = IMOrders.groupLabel(o.stay.date);
      let g = groups.find((x) => x.label === label);
      if (!g) { groups.push(g = { label, orders: [] }); }
      g.orders.push(o);
    });

    let row = 0;
    const body = groups.map((g) => {
      const restants = g.orders.filter((o) => !o.prepared).length;
      return `
        <div class="im-notif__group">
          <span style="color:inherit;letter-spacing:inherit">${esc(g.label)}</span>
          <span>${restants ? `${restants} à préparer` : 'tout est prêt'}</span>
        </div>
        <ul class="im-notif__list">
          ${g.orders.map((o) => {
            const delay = (row++) * 50;
            const items = (o.lines || []).map((l) =>
              `<li><span>${esc(l.name)}${l.qty > 1 ? ` × ${l.qty}` : ''}</span><span class="im-price">${IM.euro(l.total)}</span></li>`).join('');
            const resume = (o.lines || []).map((l) => l.name + (l.qty > 1 ? ` ×${l.qty}` : '')).join(' · ');
            return `
              <li class="im-notif__row"
                  data-board-row="${o.ref}"
                  data-tone="${IMOrders.tone(o)}"
                  data-prepared="${o.prepared}"
                  style="animation-delay:${delay}ms">
                <span class="im-notif__glyph">${icon(IMOrders.emoji(o))}</span>
                <div class="im-notif__body">
                  <p class="im-notif__source">
                    ${o.kind === 'sejour'
                      ? '<span class="im-notif__tag">Réservé sur le site</span>'
                      : '<span class="im-notif__tag" data-ton="neutre">Attentions seules</span>'}
                    ${o.status === 'a-confirmer'
                      ? '<span class="im-notif__tag" data-ton="urgent">À valider</span>'
                      : ''}
                    Arrivée ${esc(o.stay.arrival || '—')}${o.stay.resa ? ` · ${esc(o.stay.resa)}` : ''}
                  </p>
                  <div class="im-notif__line">
                    <p class="im-notif__name">${esc(o.stay.name || 'Sans nom')}, ${IM.euro(o.total)}</p>
                    <time class="im-notif__time">${esc(IMOrders.relative(o))}</time>
                  </div>
                  <p class="im-notif__text">${esc(o.stay.message || resume)}</p>

                  <div class="im-notif__detail">
                    <ul class="im-notif__items">${items}</ul>
                    ${o.stay.message ? `<p class="im-notif__msg"><strong>Message du client</strong>${esc(o.stay.message)}</p>` : ''}
                    <p class="im-notif__meta">
                      <span>Commande <b>${esc(o.ref)}</b></span>
                      <span>Paiement <b>${esc({ carte: 'Carte', applepay: 'Apple Pay', googlepay: 'Google Pay' }[o.payment] || 'Carte')}</b></span>
                      <span>Total <b>${IM.euro(o.total)}</b></span>
                    </p>
                  </div>
                </div>
                <span class="im-notif__side">
                  ${o.prepared ? '<span></span>' : '<span class="im-notif__dot" aria-label="Pas encore préparé"></span>'}
                  <button class="im-notif__tick" type="button"
                          data-board-toggle="${o.ref}"
                          aria-label="${o.prepared ? 'Marquer à préparer' : 'Marquer préparé'}, ${esc(o.stay.name || '')}"
                          aria-pressed="${o.prepared}">${TICK}</button>
                </span>
              </li>`;
          }).join('')}
        </ul>`;
    }).join('');

    host.innerHTML = `
      <section class="im-notif">
        ${head}
        ${body}
        <footer class="im-notif__foot">
          ${orders.length} arrivée${orders.length > 1 ? 's' : ''} ·
          ${pending ? `${pending} en attente` : 'tout est préparé'} ·
          cliquez une ligne pour la déplier
        </footer>
      </section>`;
  }

  /* Le tableau expose des noms, des numéros de réservation et des
     messages personnels. Il n'y a pourtant aucun mot de passe ici :
     l'hôte saisit son adresse, reçoit un lien valable un quart
     d'heure, et le clic ouvre la session.

     Rien à retenir, rien à voler, rien à forcer. Ce qui protège
     l'accès est sa boîte mail, qu'un attaquant ne contrôle pas. */
  function renderBoardGate(message, ton) {
    const host = $('[data-render="board"]');
    if (!host) return;
    host.innerHTML = `
      <section class="im-notif">
        <header class="im-notif__head"><h2 class="im-notif__title">Accès réservé</h2></header>
        <form class="im-form" data-board-gate style="padding:22px" novalidate>
          <div class="im-field">
            <label for="f-mail">Votre adresse e-mail</label>
            <input id="f-mail" name="mail" type="email" autocomplete="email"
                   inputmode="email" placeholder="vous@exemple.fr" required>
            ${message ? `<p class="${ton === 'ok' ? 'im-field__note' : 'im-field__err'}">${esc(message)}</p>` : ''}
          </div>
          <button class="im-btn im-btn--primary" type="submit">Recevoir mon lien</button>
          <p class="im-note" style="margin-top:16px">
            <span aria-hidden="true">✦</span>
            <span>Un lien vous est envoyé, valable quinze minutes et utilisable une
            seule fois. Aucun mot de passe à retenir.</span>
          </p>
        </form>
      </section>`;
    if (ton !== 'ok') $('[name="mail"]', host).focus();
  }

  function loadBoard() {
    IMOrders.load()
      .then(renderBoard)
      .catch((err) => {
        if (err.code === 401) renderBoardGate('');
        else renderBoardGate('Impossible de joindre le serveur. Réessayez.');
      });
  }

  function initBoard() {
    if (!$('[data-render="board"]')) return;

    /* On tente d'emblée : si le cookie de session est encore valide,
       l'hôte n'a rien à saisir. Le formulaire n'apparaît qu'au refus. */
    loadBoard();

    /* Retour d'un lien périmé ou déjà cliqué. Le paramètre est retiré
       de la barre d'adresse pour qu'un rechargement ne réaffiche pas
       le message une fois le lien redemandé. */
    if (new URLSearchParams(location.search).get('lien') === 'expire') {
      renderBoardGate('Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.');
      history.replaceState(null, '', location.pathname);
    }

    document.addEventListener('submit', (e) => {
      const gate = e.target.closest('[data-board-gate]');
      if (!gate) return;
      e.preventDefault();

      const champ = $('[name="mail"]', gate);
      const mail = champ.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
        renderBoardGate('Cette adresse ne semble pas valide.');
        return;
      }

      const bouton = $('button[type="submit"]', gate);
      bouton.disabled = true;
      bouton.textContent = 'Envoi…';

      IMOrders.demanderLien(mail)
        .then(() => renderBoardGate(
          'Si cette adresse est autorisée, le lien vient de partir. Ouvrez votre boîte mail.', 'ok'))
        .catch(() => renderBoardGate('Envoi impossible. Réessayez dans un instant.'));
    });

    document.addEventListener('click', (e) => {
      const toggle = e.target.closest('[data-board-toggle]');
      if (toggle) {
        e.preventDefault();
        e.stopPropagation();
        const ref = toggle.getAttribute('data-board-toggle');
        const order = IMOrders.all().find((o) => o.ref === ref);
        IMOrders.setPrepared(ref, !(order && order.prepared)).then(renderBoard).catch(loadBoard);
        renderBoard();
        return;
      }

      if (e.target.closest('[data-board-all]')) {
        IMOrders.markAllPrepared().then(renderBoard).catch(loadBoard);
        renderBoard();
        return;
      }

      if (e.target.closest('[data-board-archive]')) {
        IMOrders.archivePrepared().then(renderBoard).catch(loadBoard);
        return;
      }

      if (e.target.closest('[data-board-logout]')) {
        /* Rechargement plutôt que redessin : la synthèse, le bandeau
           et les adresses ont leurs propres hôtes, et les vider un
           par un laisserait forcément un chiffre affiché au prochain
           écran ajouté. */
        IMOrders.deconnecter().then(() => location.reload());
        return;
      }

      /* Clic sur la ligne : on déplie. On ne régénère pas, sinon
         l'ouverture serait perdue à chaque clic. */
      const row = e.target.closest('[data-board-row]');
      if (row) {
        row.setAttribute('data-open', String(row.getAttribute('data-open') !== 'true'));
      }
    });
  }

  /* ----------------------------------------------------------
     Confirmation
     ---------------------------------------------------------- */

  function renderConfirmation() {
    const host = $('[data-render="confirmation"]');
    if (!host) return;

    /* Seul Stripe redirige ici, et seulement après un paiement
       réussi : c'est la référence dans l'URL qui atteste du passage.
       Sans elle, on n'affiche rien et surtout on ne vide pas le
       panier — sinon un retour arrière depuis la page de paiement
       effacerait la sélection sans que rien n'ait été payé. */
    const paidRef = new URLSearchParams(location.search).get('ref');

    let order = null;
    try { order = JSON.parse(sessionStorage.getItem('im_order') || 'null'); } catch (e) { order = null; }
    if (order && paidRef && order.ref !== paidRef) order = null;

    if (!paidRef || !order) {
      host.innerHTML = `
        <div class="im-empty">
          <h2>${paidRef ? 'Votre commande est bien enregistrée' : 'Aucune commande à afficher'}</h2>
          <p class="im-quiet">${paidRef
            ? `Le détail n’est plus disponible sur cet appareil, mais tout est transmis. Référence ${esc(paidRef)}.`
            : 'Cette page s’affiche après le paiement de vos attentions.'}</p>
          <a class="im-btn im-btn--primary" href="index.html">Voir les attentions <span aria-hidden="true">❤︎</span></a>
        </div>`;
      if (paidRef) IMCart.clear();
      return;
    }

    const dateFr = order.stay.date
      ? new Date(order.stay.date + 'T12:00:00').toLocaleDateString('fr-FR', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        })
      : '—';

    host.innerHTML = `
      <div class="im-head im-head--center">
        <span class="im-eyebrow">Commande confirmée</span>
        <h1>Merci pour votre commande <span aria-hidden="true">❤︎</span></h1>
        <div class="im-flourish im-flourish--center"><span aria-hidden="true">❤︎</span></div>
        <p class="im-lead">Votre séjour INTENSÉ’MANS se prépare. Vos attentions seront préparées avec soin avant votre arrivée.</p>
      </div>

      <div class="im-summary" style="position:static;max-width:620px;margin-inline:auto">
        <div class="im-summary__row">
          <span class="im-quiet">Numéro de commande</span>
          <span class="im-price">${esc(order.ref)}</span>
        </div>
        <div class="im-summary__row">
          <span class="im-quiet">Nom de réservation</span>
          <span>${esc(order.stay.name || '—')}</span>
        </div>
        <div class="im-summary__row">
          <span class="im-quiet">Date du séjour</span>
          <span>${esc(dateFr)}</span>
        </div>
        <div class="im-summary__row">
          <span class="im-quiet">Heure d’arrivée</span>
          <span>${esc(order.stay.arrival || '—')}</span>
        </div>
        ${order.stay.resa ? `
        <div class="im-summary__row">
          <span class="im-quiet">N° de réservation</span>
          <span>${esc(order.stay.resa)}</span>
        </div>` : ''}
        ${order.stay.message ? `
        <div class="im-summary__row">
          <span class="im-quiet">Votre message</span>
          <span style="max-width:60%;text-align:right">${esc(order.stay.message)}</span>
        </div>` : ''}

        <h2 style="margin:28px 0 14px;font-size:1.2rem">Vos attentions</h2>
        ${order.lines.map((l) => `
          <div class="im-summary__row">
            <span>${esc(l.name)}${l.qty > 1 ? ` <span class="im-quiet">× ${l.qty}</span>` : ''}</span>
            <span class="im-price">${IM.euro(l.total)}</span>
          </div>`).join('')}
        <div class="im-summary__row im-summary__row--total">
          <span>Total payé</span>
          <span class="im-price">${IM.euro(order.total)}</span>
        </div>
        <p class="im-summary__legal">
          Votre reçu de paiement vous est envoyé par e-mail. Une question sur votre
          commande ? Écrivez-nous en rappelant votre numéro, nous vous répondons
          avant votre arrivée.
        </p>
      </div>`;

    IMCart.clear();
  }

  /* ----------------------------------------------------------
     Amorçage
     ---------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initAddButtons();
    initCartControls();
    renderCatalogue();
    renderProduct();
    renderCheckout();
    initStayForm();
    renderConfirmation();
    initBoard();
    initReveal();
    initRotator();
    initHeroAnim();
    initHeaderScroll();
    initAtouts();

    /* Ancre de catégorie après rendu du catalogue */
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: 'auto', block: 'start' }));
    }
  });
})();

/* ============================================================
   Les adresses collectées par la roue
   ------------------------------------------------------------
   Affichées sur le tableau de l'hôte, sous les commandes. Sans
   cet écran, elles restaient dans la base sans que personne ne
   les voie : autant ne pas les collecter.
   ============================================================ */
(() => {
  'use strict';

  const hote = document.querySelector('[data-render="cadeaux"]');
  if (!hote || typeof IMOrders === 'undefined' || !IMOrders.cadeaux) return;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const quand = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—'
      : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  IMOrders.cadeaux().catch(() => null).then((liste) => {
    /* Pas connecté : on n'affiche rien du tout. Le formulaire de
       connexion du tableau parle déjà pour toute la page. */
    if (!liste) { hote.innerHTML = ''; return; }

    if (!liste.length) {
      hote.innerHTML = `
        <section class="im-notif">
          <header class="im-notif__head"><h2 class="im-notif__title">Adresses collectées</h2></header>
          <div class="im-notif__empty"><p>Aucune adresse pour l’instant.</p></div>
        </section>`;
      return;
    }

    /* Le consentement conditionne le droit d'écrire à ces personnes
       autrement que pour leur cadeau : il doit se voir. */
    const optIn = liste.filter((c) => c.accord).length;

    hote.innerHTML = `
      <section class="im-notif">
        <header class="im-notif__head">
          <h2 class="im-notif__title">
            Adresses collectées <span class="im-notif__count">${liste.length}</span>
          </h2>
          <div class="im-notif__actions">
            <button type="button" data-cadeaux-copier>Copier les adresses</button>
          </div>
        </header>
        <p style="padding:0 clamp(16px,2vw,22px);font-size:0.83rem;color:var(--im-fg-muted)">
          ${optIn} sur ${liste.length} acceptent de recevoir vos offres. N’écrivez qu’à celles-là.
        </p>
        <ul class="im-notif__list">
          ${liste.map((c) => `
            <li class="im-notif__row" data-tone="${c.accord ? 'success' : 'default'}">
              <div style="padding:13px clamp(16px,2vw,22px);display:grid;gap:3px">
                <span style="font-size:0.95rem;color:var(--im-fg)">${esc(c.email)}</span>
                <span style="font-size:0.8rem;color:var(--im-fg-muted)">
                  ${esc(c.lot)} · ${esc(c.code)} · ${esc(quand(c.createdAt))}${c.accord ? '' : ' · sans accord'}
                </span>
              </div>
            </li>`).join('')}
        </ul>
      </section>`;

    hote.querySelector('[data-cadeaux-copier]').addEventListener('click', (e) => {
      /* Seules celles qui ont donné leur accord : copier les autres
         reviendrait à les mettre dans une liste de diffusion. */
      const adresses = liste.filter((c) => c.accord).map((c) => c.email).join(', ');
      navigator.clipboard.writeText(adresses).then(() => {
        e.target.textContent = `${liste.filter((c) => c.accord).length} adresses copiées`;
      });
    });
  });
})();

/* ============================================================
   La synthèse du mois
   ------------------------------------------------------------
   Ce que l'hôte veut savoir en ouvrant son tableau : combien
   c'est entré, ce qui arrive, et ce qui l'attend. Les virements
   ne sont pas ici : Stripe les présente déjà mieux.
   ============================================================ */
(() => {
  'use strict';

  const hote = document.querySelector('[data-render="synthese"]');
  if (!hote || typeof IMOrders === 'undefined' || !IMOrders.synthese) return;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const moisLong = (ym) => {
    const d = new Date(ym + '-01T12:00:00');
    return Number.isNaN(d.getTime()) ? ym
      : d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const jourCourt = (iso) => {
    const d = new Date(iso + 'T12:00:00');
    return Number.isNaN(d.getTime()) ? iso
      : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  IMOrders.synthese().then((s) => {
    if (!s) return;

    const chiffre = (valeur, libelle, alerte) => `
      <div class="im-synth__case"${alerte ? ' data-alerte="true"' : ''}>
        <span class="im-synth__val">${esc(valeur)}</span>
        <span class="im-synth__lib">${esc(libelle)}</span>
      </div>`;

    hote.innerHTML = `
      <section class="im-synth">
        <header class="im-synth__tete">
          <h2>${esc(moisLong(s.mois))}</h2>
          ${s.prochaine
            ? `<p>Prochaine arrivée : <strong>${esc(jourCourt(s.prochaine.checkin))}</strong>${
                s.prochaine.nom ? `, ${esc(s.prochaine.nom)}` : ''}</p>`
            : '<p>Aucune arrivée prévue.</p>'}
        </header>
        <div class="im-synth__grille">
          ${chiffre(IM.euro(s.ca.total), 'encaissé ce mois')}
          ${chiffre(s.nuitsReservees, s.nuitsReservees > 1 ? 'nuits réservées' : 'nuit réservée')}
          ${chiffre(s.commandes, s.commandes > 1 ? 'commandes' : 'commande')}
          ${chiffre(s.adresses, s.adresses > 1 ? 'adresses' : 'adresse')}
          ${s.aValider ? chiffre(s.aValider, 'à valider', true) : ''}
          ${s.aPreparer ? chiffre(s.aPreparer, 'à préparer', true) : ''}
        </div>
        <p class="im-synth__note">
          Dont ${esc(IM.euro(s.ca.nuits))} de nuits et ${esc(IM.euro(s.ca.attentions))} d’attentions.
          Les virements se consultent dans <a href="https://dashboard.stripe.com/payouts" target="_blank" rel="noopener">Stripe</a>.
        </p>
      </section>`;
  });
})();

/* Le bandeau d'alerte du tableau de bord. Il réutilise la synthèse
   déjà chargée plus haut, donc aucun appel réseau de plus. */
(() => {
  'use strict';

  const hote = document.querySelector('[data-render="alerte"]');
  if (!hote || typeof IMOrders === 'undefined' || !IMOrders.synthese) return;

  const CROIX = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  IMOrders.synthese().then((s) => {
    if (!s) return;

    const points = [];
    if (s.aValider) points.push(`<strong>${s.aValider}</strong> réservation${s.aValider > 1 ? 's' : ''} à valider`);
    /* « arrivées » et non « commandes » : depuis que les nuits
       réservées sur le site rejoignent le tableau, une ligne peut
       être un séjour entier et pas seulement des attentions. */
    if (s.aPreparer) points.push(`<strong>${s.aPreparer}</strong> arrivée${s.aPreparer > 1 ? 's' : ''} à préparer`);
    if (!points.length) return;

    /* La clé porte le contenu : une alerte fermée hier ne doit pas
       masquer une alerte différente aujourd'hui. */
    const cle = `im_alerte_${s.aValider}_${s.aPreparer}`;
    try { if (localStorage.getItem(cle) === 'lu') return; } catch (e) { /* mode privé */ }

    hote.innerHTML = `
      <div class="im-alerte" role="status" data-ton="${s.aValider ? 'urgent' : 'normal'}">
        <span>${points.join(' · ')}</span>
        <button class="im-alerte__fermer" type="button" data-alerte-fermer aria-label="Masquer">${CROIX}</button>
      </div>`;

    hote.querySelector('[data-alerte-fermer]').addEventListener('click', () => {
      try { localStorage.setItem(cle, 'lu'); } catch (e) { /* mode privé */ }
      hote.innerHTML = '';
    });
  });
})();
