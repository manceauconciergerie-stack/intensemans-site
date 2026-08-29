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
            <span class="im-price im-card__price">${IM.euro(p.price)}</span>
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

  function footMarkup(p) {
    const qty = IMCart.qtyOf(p.id);
    return `
      <span class="im-price im-card__price">${IM.euro(p.price)}</span>
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
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i % 4, 3) * 70}ms`;
      io.observe(el);
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

    const cats = IM.categories.filter((c) => IM.byCat(c.id).length);

    const nav = `
      <nav class="im-catnav" aria-label="Catégories">
        <div class="im-catnav__inner">
          ${cats.map((c) => `
            <a href="#${c.id}" data-catlink="${c.id}">
              ${icon(c.icon)} ${esc(c.name)}
              <em>${IM.byCat(c.id).length}</em>
            </a>`).join('')}
        </div>
      </nav>`;

    host.innerHTML = nav + cats.map((cat) => {
      /* Les packs passent par le coverflow : ce sont les cinq produits
         qui portent le panier moyen, ils méritent une mise en scène.
         Le conteneur est rempli juste après par initFlow(). */
      if (cat.id === 'packs') return '<div data-flow-host></div>';
      return `
      <section class="im-section im-section--tight" id="${cat.id}">
        <div class="im-shell">
          <div class="im-head im-head--row">
            <div>
              <span class="im-eyebrow">${esc(cat.name)}</span>
              <h2>${esc(cat.desc)}</h2>
            </div>
          </div>
          <div class="im-grid">${IM.byCat(cat.id).map(productCard).join('')}</div>
        </div>
      </section>`;
    }).join('');

    const flowHost = $('[data-flow-host]', host);
    if (flowHost) initFlow(flowHost, IM.byCat('packs'));

    initCatnav();
  }

  /* Souligne la catégorie en cours de lecture dans le filtre collant. */
  function initCatnav() {
    const links = $$('[data-catlink]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((l) => l.removeAttribute('aria-current'));
        const active = links.find((l) => l.getAttribute('data-catlink') === e.target.id);
        if (active) active.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    links.forEach((l) => {
      const section = document.getElementById(l.getAttribute('data-catlink'));
      if (section) io.observe(section);
    });
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
     Visite au défilement
     Portage du composant scroll-choreography. La progression est
     lissée par interpolation à chaque trame — c'est l'équivalent
     du ressort de framer-motion sans la bibliothèque.
     ---------------------------------------------------------- */

  /* Interpolation linéaire par paliers, comme useTransform. */
  function track(p, stops, values) {
    if (p <= stops[0]) return values[0];
    for (let i = 1; i < stops.length; i++) {
      if (p <= stops[i]) {
        const t = (p - stops[i - 1]) / (stops[i] - stops[i - 1]);
        return values[i - 1] + (values[i] - values[i - 1]) * t;
      }
    }
    return values[values.length - 1];
  }

  function initTour() {
    const section = $('[data-tour]');
    if (!section) return;

    const card = (k) => $(`[data-tour-card="${k}"]`, section);
    const tl = card('tl'), br = card('br'), bl = card('bl'), hero = card('hero');
    const caption = $('.im-tour__caption', section);
    const wide = $('[data-tour-wide]', section);
    if (!tl || !br || !bl || !hero) return;

    /* Sans le script ou sans animation, la grille statique prend le
       relais : les quatre photos restent visibles. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      section.setAttribute('data-static', 'true');
      return;
    }

    let X = 20, Y = 14, W = 36, H = 24;
    const readVars = () => {
      const cs = getComputedStyle(section);
      const n = (name, fallback) => {
        const v = parseFloat(cs.getPropertyValue(name));
        return Number.isFinite(v) ? v : fallback;
      };
      X = n('--tour-x', 20); Y = n('--tour-y', 14);
      W = n('--tour-w', 36); H = n('--tour-h', 24);
    };
    readVars();

    /* Les trois phases du composant d'origine :
       0 à 0.30  les deux diagonales se croisent
       0.35 à 0.65  tout converge au centre
       0.70 à 0.90  la chambre s'ouvre en plein écran */
    const S = [0, 0.3, 0.35, 0.65, 1];

    const apply = (p) => {
      const move = (el, xs, ys) =>
        (el.style.transform =
          `translate3d(${track(p, S, xs).toFixed(2)}vw, ${track(p, S, ys).toFixed(2)}vh, 0)`);

      move(tl, [-X, -X, -X, 0, 0], [-Y,  Y,  Y, 0, 0]);
      move(br, [ X,  X,  X, 0, 0], [ Y, -Y, -Y, 0, 0]);
      move(bl, [-X, -X, -X, 0, 0], [ Y,  Y,  Y, 0, 0]);
      move(hero, [X, X, X, 0, 0], [-Y, -Y, -Y, 0, 0]);

      hero.style.width  = track(p, [0.65, 0.7, 0.9, 1], [W, W, 100, 100]).toFixed(2) + 'vw';
      hero.style.height = track(p, [0.65, 0.7, 0.9, 1], [H, H, 100, 100]).toFixed(2) + 'vh';
      hero.style.borderRadius = track(p, [0.7, 0.9], [14, 0]).toFixed(1) + 'px';

      /* Les trois autres s'effacent sous la chambre qui s'ouvre. */
      const o = track(p, [0.75, 0.85], [1, 0]).toFixed(3);
      tl.style.opacity = br.style.opacity = bl.style.opacity = o;

      /* Le cadrage panoramique remplace le portrait pendant l'ouverture. */
      if (wide) wide.style.opacity = track(p, [0.68, 0.86], [0, 1]).toFixed(3);
      if (caption) caption.style.opacity = track(p, [0.88, 0.97], [0, 1]).toFixed(3);
    };

    const measure = () => {
      const r = section.getBoundingClientRect();
      const course = section.offsetHeight - window.innerHeight;
      target = course > 0 ? Math.min(1, Math.max(0, -r.top / course)) : 0;
    };

    /* On mesure à chaque trame et on ne travaille que lorsque la section
       approche de l'écran. Aucune dépendance aux événements ni aux
       observateurs. */
    let target = 0, current = 0, largeurConnue = window.innerWidth;

    let trames = 0;

    IMFrame.add(() => {
      trames++;
      const r = section.getBoundingClientRect();
      const marge = window.innerHeight;
      if (r.bottom < -marge || r.top > window.innerHeight + marge) return;
      if (window.innerWidth !== largeurConnue) { largeurConnue = window.innerWidth; readVars(); }
      measure();
      current += (target - current) * 0.13;
      apply(current);
    });

    /* Filet de sécurité : si aucune trame n'est arrivée, la chorégraphie
       ne tournera pas et les quatre cartes resteraient empilées dans les
       coins. On bascule alors sur la grille statique, qui reste lisible. */
    setTimeout(() => {
      if (trames === 0) {
        section.setAttribute('data-static', 'true');
        [tl, br, bl, hero].forEach((el) => {
          el.style.transform = '';
          el.style.width = '';
          el.style.height = '';
          el.style.opacity = '';
          el.style.borderRadius = '';
        });
      }
    }, 900);

    measure();
    current = target;
    apply(current);
  }

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
        <a class="im-flow__detail" href="produit.html?id=${p.id}">Voir le détail</a>
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
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const tick = () => go(index + 1);
    const sync = () => {
      const run = visible && !paused && !reduced && total > 1 && !document.hidden;
      if (run && !timer) timer = setInterval(tick, 5600);
      if (!run && timer) { clearInterval(timer); timer = null; }
    };

    section.addEventListener('mouseenter', () => { paused = true; sync(); });
    section.addEventListener('mouseleave', () => { paused = false; sync(); });
    section.addEventListener('focusin', () => { paused = true; sync(); });
    section.addEventListener('focusout', () => { paused = false; sync(); });
    document.addEventListener('visibilitychange', sync);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((e) => { visible = e.isIntersecting; sync(); });
      }, { threshold: 0.25 }).observe(section);
    } else {
      visible = true; sync();
    }

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

    document.title = `${p.name} — INTENSÉ'MANS Love Room`;
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
        ${orders.length ? `
          <div class="im-notif__actions">
            ${pending ? '<button type="button" data-board-all>Tout marquer préparé</button>' : ''}
            <button type="button" data-board-archive data-danger>Archiver les séjours passés</button>
          </div>` : ''}
      </header>`;

    if (!orders.length) {
      host.innerHTML = `
        <section class="im-notif">
          ${head}
          <div class="im-notif__empty">
            ${TICK}
            <p>Aucune commande. Rien à préparer.</p>
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
                  <p class="im-notif__source">Arrivée ${esc(o.stay.arrival || '—')}${o.stay.resa ? ` · ${esc(o.stay.resa)}` : ''}</p>
                  <div class="im-notif__line">
                    <p class="im-notif__name">${esc(o.stay.name || 'Sans nom')} — ${IM.euro(o.total)}</p>
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
                          aria-label="${o.prepared ? 'Marquer à préparer' : 'Marquer préparé'} — ${esc(o.stay.name || '')}"
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
          ${orders.length} commande${orders.length > 1 ? 's' : ''} ·
          ${pending ? `${pending} en attente` : 'tout est préparé'} ·
          cliquez une ligne pour la déplier
        </footer>
      </section>`;
  }

  /* Le tableau expose des noms, des numéros de réservation et des
     messages personnels : il demande le mot de passe de l'hôte, gardé
     ensuite sur l'appareil. */
  function renderBoardGate(message) {
    const host = $('[data-render="board"]');
    if (!host) return;
    host.innerHTML = `
      <section class="im-notif">
        <header class="im-notif__head"><h2 class="im-notif__title">Accès réservé</h2></header>
        <form class="im-form" data-board-gate style="padding:22px">
          <div class="im-field">
            <label for="f-secret">Mot de passe</label>
            <input id="f-secret" name="secret" type="password" autocomplete="current-password" required>
            ${message ? `<p class="im-field__err">${esc(message)}</p>` : ''}
          </div>
          <button class="im-btn im-btn--primary" type="submit">Ouvrir le tableau</button>
        </form>
      </section>`;
    $('[name="secret"]', host).focus();
  }

  function loadBoard() {
    IMOrders.load()
      .then(renderBoard)
      .catch((err) => {
        if (err.code === 401) {
          IMOrders.forgetSecret();
          renderBoardGate(IMOrders.hasSecret() ? 'Mot de passe refusé.' : '');
        } else {
          renderBoardGate('Impossible de joindre le serveur. Réessayez.');
        }
      });
  }

  function initBoard() {
    if (!$('[data-render="board"]')) return;

    if (!IMOrders.hasSecret()) renderBoardGate('');
    else loadBoard();

    document.addEventListener('submit', (e) => {
      const gate = e.target.closest('[data-board-gate]');
      if (!gate) return;
      e.preventDefault();
      IMOrders.setSecret($('[name="secret"]', gate).value);
      loadBoard();
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
    initTour();

    /* Ancre de catégorie après rendu du catalogue */
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: 'auto', block: 'start' }));
    }
  });
})();
