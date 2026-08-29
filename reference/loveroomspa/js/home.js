(() => {
  const home = document.querySelector('.lrs-home');

  if (!home) {
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const staticMobile = window.matchMedia('(max-width: 820px)').matches;
  const starHosts = [
    '.lrs-home-hero',
    '.lrs-home-quote',
    '.lrs-evening-moments',
    '.lrs-home-suite',
    '.lrs-spa-atmosphere',
    '.lrs-home-comparison',
    '.lrs-home-options',
    '.lrs-paris-section',
    '.lrs-faq-section',
    '.lrs-final-cta'
  ];

  const hashSeed = (value) => {
    let hash = 2166136261;

    [...value].forEach((character) => {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    });

    return hash >>> 0;
  };

  const seededRandom = (initialSeed) => {
    let seed = initialSeed || 1;

    return () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 4294967296;
    };
  };

  const starHostNodes = staticMobile ? [] : home.querySelectorAll(starHosts.join(','));

  starHostNodes.forEach((host, hostIndex) => {
    if (host.querySelector(':scope > .lrs-star-field')) {
      return;
    }

    const random = seededRandom(hashSeed(`${host.id || host.className}-${hostIndex}`));
    const field = document.createElement('div');
    const starCount = window.innerWidth <= 520 ? 24 : 38;

    field.className = 'lrs-star-field';
    field.setAttribute('aria-hidden', 'true');

    for (let index = 0; index < starCount; index += 1) {
      const star = document.createElement('span');
      const size = 1 + random() * 2.4;

      star.className = `lrs-star-field__star${index % 9 === 0 ? ' is-bright' : ''}`;
      star.style.setProperty('--lrs-star-x', `${(2 + random() * 96).toFixed(2)}%`);
      star.style.setProperty('--lrs-star-y', `${(2 + random() * 96).toFixed(2)}%`);
      star.style.setProperty('--lrs-star-size', `${size.toFixed(2)}px`);
      star.style.setProperty('--lrs-star-alpha', (0.48 + random() * 0.5).toFixed(2));
      star.style.setProperty('--lrs-star-speed', `${(3.2 + random() * 3.8).toFixed(2)}s`);
      star.style.setProperty('--lrs-star-delay', `${(-random() * 6).toFixed(2)}s`);
      field.append(star);
    }

    for (let index = 0; index < 2; index += 1) {
      const shootingStar = document.createElement('b');

      shootingStar.className = 'lrs-star-field__shoot';
      shootingStar.style.setProperty('--lrs-shoot-y', `${12 + random() * 68}%`);
      shootingStar.style.setProperty('--lrs-shoot-speed', `${16 + index * 5 + random() * 4}s`);
      shootingStar.style.setProperty('--lrs-shoot-delay', `${-4 - index * 8 - random() * 5}s`);
      field.append(shootingStar);
    }

    host.classList.add('lrs-stars-host');
    host.prepend(field);
  });

  const revealSelectors = [
    '.lrs-evening-intro',
    '.lrs-home-quote',
    '.lrs-home-suite > .lrs-eyebrow',
    '.lrs-home-suite > h2',
    '.lrs-home-suite > .lrs-section-lead',
    '.lrs-suite-gallery > *',
    '.lrs-spa-atmosphere .wp-block-cover__inner-container > :not(.lrs-colour-chips)',
    '.lrs-home-comparison > *',
    '.lrs-booking-layout > *',
    '.lrs-options-heading',
    '.lrs-paris-copy',
    '.lrs-access-section .wp-block-column',
    '.lrs-reviews-section .wp-block-column',
  ];
  const revealTargets = [...home.querySelectorAll(revealSelectors.join(','))];

  if (!staticMobile) {
    revealTargets.forEach((element, index) => {
      element.classList.add('lrs-reveal');
      element.style.setProperty('--lrs-reveal-delay', `${Math.min(index % 4, 3) * 70}ms`);

      if (element.matches('figure, .lrs-option-card, .lrs-review-visual')) {
        element.classList.add('lrs-reveal--visual');
      }
    });
  }

  const quote = home.querySelector('.lrs-home-quote p');

  if (quote && !reducedMotion.matches && window.innerWidth > 820) {
    const quoteText = quote.textContent.trim();
    const words = quoteText.split(/\s+/);

    quote.textContent = '';
    quote.setAttribute('aria-label', quoteText);

    words.forEach((word, index) => {
      const span = document.createElement('span');

      span.className = 'lrs-quote-word';
      span.setAttribute('aria-hidden', 'true');
      span.style.setProperty('--lrs-word-index', String(index));
      span.textContent = word;
      quote.append(span);

      if (index < words.length - 1) {
        quote.append(document.createTextNode(' '));
      }
    });
  }

  if (!staticMobile) {
    document.documentElement.classList.add('lrs-home-motion-ready');
  }

  if (staticMobile) {
    // Le contenu reste visible par défaut, sans mutations ni animations d'entrée.
  } else if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    revealTargets.forEach((element) => element.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      },
      {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.12
      }
    );

    revealTargets.forEach((element) => revealObserver.observe(element));
  }

  const eveningFlow = home.querySelector('.lrs-evening-flow');
  const eveningMoments = [...home.querySelectorAll('.lrs-evening-moment')];
  const eveningImages = [...home.querySelectorAll('.lrs-evening-stage-image')];
  const eveningCurrent = home.querySelector('.lrs-evening-current');
  const eveningProgress = home.querySelector('.lrs-evening-progress b');
  let activeEveningIndex = -1;
  let eveningFrame = 0;

  const setEveningIndex = (index) => {
    if (index === activeEveningIndex || index < 0 || index >= eveningMoments.length) {
      return;
    }

    activeEveningIndex = index;
    eveningMoments.forEach((moment, itemIndex) => {
      moment.classList.toggle('is-active', itemIndex === index);
    });
    eveningImages.forEach((image, itemIndex) => {
      image.classList.toggle('is-active', itemIndex === index);
    });

    if (eveningCurrent) {
      eveningCurrent.textContent = String(index + 1).padStart(2, '0');
    }

    if (eveningProgress) {
      eveningProgress.style.width = `${((index + 1) / eveningMoments.length) * 100}%`;
    }
  };

  const syncEvening = () => {
    eveningFrame = 0;

    if (!eveningFlow || !eveningMoments.length || window.innerWidth <= 820) {
      setEveningIndex(0);
      return;
    }

    const viewportTarget = window.innerHeight * 0.5;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    eveningMoments.forEach((moment, index) => {
      const rectangle = moment.getBoundingClientRect();
      const momentCenter = rectangle.top + rectangle.height / 2;
      const distance = Math.abs(momentCenter - viewportTarget);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setEveningIndex(closestIndex);
  };

  const queueEveningSync = () => {
    if (!eveningFrame) {
      eveningFrame = window.requestAnimationFrame(syncEvening);
    }
  };

  if (eveningFlow && eveningMoments.length === eveningImages.length) {
    window.addEventListener('scroll', queueEveningSync, { passive: true });
    window.addEventListener('resize', queueEveningSync);
    setEveningIndex(0);
  }

  const spaAtmosphere = home.querySelector('.lrs-spa-atmosphere');
  const colourLabels = spaAtmosphere
    ? [...spaAtmosphere.querySelectorAll('.lrs-colour-chips p')]
    : [];
  const colourNames = ['blue', 'violet', 'red'];
  const colourMessages = {
    blue: 'Bleu nuit. Une lumière profonde qui laisse le ciel étoilé prendre le dessus.',
    violet: 'Violet. Une teinte plus enveloppante, entre reflets, bulles et pénombre.',
    red: 'Rouge. Une lumière plus intense quand la soirée change de rythme.'
  };
  const colourCopy = spaAtmosphere?.querySelector('.lrs-section-lead');

  colourLabels.forEach((label, index) => {
    const button = document.createElement('button');
    const colourName = colourNames[index] || 'blue';
    const colourDot = document.createElement('i');
    const colourText = document.createElement('span');
    const colourIndex = document.createElement('small');

    button.type = 'button';
    button.className = 'lrs-colour-choice';
    button.dataset.colour = colourName;
    button.dataset.spaColourChoice = colourName;
    button.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
    colourDot.setAttribute('aria-hidden', 'true');
    colourText.textContent = label.textContent.replace(/^[●\s]+/, '');
    colourIndex.textContent = String(index + 1).padStart(2, '0');
    button.append(colourDot, colourText, colourIndex);
    label.replaceWith(button);

    button.addEventListener('click', () => {
      spaAtmosphere.dataset.lrsColour = colourName;
      if (colourCopy) {
        colourCopy.textContent = colourMessages[colourName];
      }
      spaAtmosphere.querySelectorAll('.lrs-colour-choice').forEach((choice) => {
        choice.setAttribute('aria-pressed', choice === button ? 'true' : 'false');
      });
    });
  });

  if (spaAtmosphere && colourLabels.length) {
    spaAtmosphere.dataset.lrsColour = 'blue';
  }

  const galleryLinks = [...home.querySelectorAll('.lrs-suite-gallery a[href]')];

  if (galleryLinks.length && typeof HTMLDialogElement !== 'undefined') {
    const lightbox = document.createElement('dialog');
    const lightboxClose = document.createElement('button');
    const lightboxImage = document.createElement('img');
    const lightboxCaption = document.createElement('p');
    let lightboxTrigger = null;

    lightbox.className = 'lrs-lightbox';
    lightbox.setAttribute('aria-label', 'Galerie de La Duchesse');
    lightboxClose.type = 'button';
    lightboxClose.className = 'lrs-lightbox__close';
    lightboxClose.setAttribute('aria-label', 'Fermer la photo');
    lightboxClose.textContent = 'Fermer ×';
    lightboxImage.alt = '';
    lightboxCaption.className = 'lrs-lightbox__caption';
    lightbox.append(lightboxClose, lightboxImage, lightboxCaption);
    document.body.append(lightbox);

    const closeLightbox = () => {
      if (!lightbox.open) {
        return;
      }

      lightbox.close();
      lightboxTrigger?.focus();
    };

    galleryLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        const image = link.querySelector('img');
        const caption = link.closest('figure')?.querySelector('figcaption');

        event.preventDefault();
        lightboxTrigger = link;
        lightboxImage.src = link.href;
        lightboxImage.alt = image?.alt || '';
        lightboxCaption.textContent = caption?.textContent || image?.alt || '';
        lightbox.showModal();
        lightboxClose.focus();
      });
    });

    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeLightbox();
    });
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });
  }

  const bookingSection = home.querySelector('#reserver');
  const bookingEngine = bookingSection?.querySelector('.lrs-booking-engine');
  let quickBooking = null;

  if (bookingEngine) {
    const bookingMarker = document.createComment('lrs-booking-engine');
    const quickPanel = document.createElement('section');
    const quickHead = document.createElement('header');
    const quickTitle = document.createElement('p');
    const quickSubtitle = document.createElement('small');
    const quickClose = document.createElement('button');
    const quickBody = document.createElement('div');
    let quickTrigger = null;

    bookingEngine.before(bookingMarker);
    quickBooking = document.createElement('div');
    quickBooking.className = 'lrs-quick-booking';
    quickBooking.id = 'lrs-quick-booking';
    quickBooking.hidden = true;
    quickBooking.setAttribute('role', 'dialog');
    quickBooking.setAttribute('aria-modal', 'true');
    quickBooking.setAttribute('aria-labelledby', 'lrs-quick-booking-title');
    quickPanel.className = 'lrs-quick-booking__panel lrs-booking-section';
    quickHead.className = 'lrs-quick-booking__head';
    quickTitle.id = 'lrs-quick-booking-title';
    quickTitle.textContent = 'Choisir votre nuit';
    quickSubtitle.textContent = 'Disponibilités et tarif direct';
    quickClose.type = 'button';
    quickClose.className = 'lrs-quick-booking__close';
    quickClose.setAttribute('aria-label', 'Fermer les dates');
    quickClose.textContent = '×';
    quickBody.className = 'lrs-quick-booking__body';
    quickTitle.append(quickSubtitle);
    quickHead.append(quickTitle, quickClose);
    quickPanel.append(quickHead, quickBody);
    quickBooking.append(quickPanel);
    document.body.append(quickBooking);

    const returnBookingEngine = () => {
      if (bookingMarker.parentNode) {
        bookingMarker.parentNode.insertBefore(bookingEngine, bookingMarker.nextSibling);
      }
    };

    const closeQuickBooking = () => {
      if (quickBooking.hidden) return;
      returnBookingEngine();
      quickBooking.hidden = true;
      document.body.classList.remove('lrs-quick-booking-open');
      quickTrigger?.focus();
      quickTrigger = null;
    };

    const openQuickBooking = (trigger = null) => {
      if (!quickBooking.hidden) return;
      quickTrigger = trigger;
      quickBody.append(bookingEngine);
      quickBooking.hidden = false;
      document.body.classList.add('lrs-quick-booking-open');
      home.querySelector('.lrs-mobile-booking')?.classList.remove('is-visible');
      window.requestAnimationFrame(() => quickClose.focus());
    };

    const isBookingLink = (link) => {
      const target = new URL(link.href, window.location.href);
      if (target.origin !== window.location.origin) return false;
      if (['#reserver', '#reservation'].includes(target.hash)) return true;
      return /\/(reservation|disponibilites)\/?$/.test(target.pathname);
    };

    document.querySelectorAll('a[href]').forEach((link) => {
      if (!isBookingLink(link)) return;
      link.dataset.lrsBookingTrigger = '';
      link.setAttribute('aria-haspopup', 'dialog');
      link.setAttribute('aria-controls', quickBooking.id);
      link.addEventListener('click', (event) => {
        event.preventDefault();
        openQuickBooking(link);
      });
    });

    quickClose.addEventListener('click', closeQuickBooking);
    quickBooking.addEventListener('click', (event) => {
      if (event.target === quickBooking) closeQuickBooking();
    });
    quickBooking.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeQuickBooking();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = [...quickBooking.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    if (window.location.hash === '#reserver') {
      window.requestAnimationFrame(() => openQuickBooking());
    }
  }

  const mobileBooking = home.querySelector('.lrs-mobile-booking');
  const hero = home.querySelector('.lrs-home-hero');

  if (mobileBooking && hero) {
    const suppressedSections = [
      ...home.querySelectorAll('#reserver, .lrs-final-cta'),
      document.querySelector('.lrs-site-footer'),
    ].filter(Boolean);
    let bookingFrame = 0;

    const intersectsViewport = (element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.bottom > 0 && bounds.top < window.innerHeight;
    };

    const syncMobileBooking = () => {
      bookingFrame = 0;
      const heroHasPassed = hero.getBoundingClientRect().bottom <= 0;
      const bookingAreaVisible = suppressedSections.some(intersectsViewport);
      const quickBookingOpen = quickBooking && !quickBooking.hidden;
      mobileBooking.classList.toggle('is-visible', heroHasPassed && !bookingAreaVisible && !quickBookingOpen);
    };

    const queueMobileBookingSync = () => {
      if (!bookingFrame) {
        bookingFrame = window.requestAnimationFrame(syncMobileBooking);
      }
    };

    window.addEventListener('scroll', queueMobileBookingSync, { passive: true });
    window.addEventListener('resize', queueMobileBookingSync, { passive: true });
    window.addEventListener('orientationchange', queueMobileBookingSync, { passive: true });
    window.addEventListener('pageshow', queueMobileBookingSync);

    if ('ResizeObserver' in window) {
      const bookingResizeObserver = new ResizeObserver(queueMobileBookingSync);
      [hero, ...suppressedSections].forEach((section) => bookingResizeObserver.observe(section));
    }

    queueMobileBookingSync();
  } else if (mobileBooking) {
    mobileBooking.classList.add('is-visible');
  }

  const header = document.querySelector('.lrs-site-header');
  let headerFrame = 0;

  const syncHeader = () => {
    headerFrame = 0;
    header?.classList.toggle('is-scrolled', window.scrollY > 24);
  };

  const queueHeaderSync = () => {
    if (!headerFrame) {
      headerFrame = window.requestAnimationFrame(syncHeader);
    }
  };

  if (header) {
    window.addEventListener('scroll', queueHeaderSync, { passive: true });
    syncHeader();
  }

  queueEveningSync();
})();
