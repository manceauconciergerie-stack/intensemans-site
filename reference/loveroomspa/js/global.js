(() => {
  const staticMobile = window.matchMedia('(max-width: 820px)').matches;
  const sections = [...document.querySelectorAll('.lrs-celestial')];

  if (!staticMobile) {
    sections.forEach((section, index) => {
      section.dataset.celestialVariant = String((index % 4) + 1);
    });
  }

  const header = document.querySelector('.lrs-site-header');
  const primaryNavigation = header?.querySelector('.lrs-primary-navigation');
  const primaryList = primaryNavigation?.querySelector('.wp-block-navigation__container');

  if (primaryList && !staticMobile) {
    let bookingItem = primaryList.querySelector('.lrs-menu-booking');

    if (!bookingItem) {
      bookingItem = document.createElement('li');
      bookingItem.className = 'wp-block-navigation-item wp-block-navigation-link lrs-menu-booking';
      bookingItem.innerHTML = '<a class="wp-block-navigation-item__content" href="/#reserver"><span class="wp-block-navigation-item__label">Dates &amp; prix</span></a>';
      primaryList.append(bookingItem);
    }

    const descriptions = [
      'Love Room Spa à Vernon',
      'La suite en détail',
      'Les couples racontent',
      'Les attentions avant votre arrivée',
      'Choisir la Normandie',
      'Partir sans perdre son temps',
      'Préparer votre arrivée',
      'Offrir la nuit',
      'Calendrier et tarif direct',
    ];

    [...primaryList.children].forEach((item, index) => {
      const link = item.querySelector('.wp-block-navigation-item__content');
      if (!link) return;
      link.dataset.lrsMenuDescription = descriptions[index] || '';
      item.style.setProperty('--lrs-menu-index', `'${String(index + 1).padStart(2, '0')}'`);
    });
  }

  const responsiveContainer = primaryNavigation?.querySelector('.wp-block-navigation__responsive-container');
  const openMenuButton = primaryNavigation?.querySelector('.wp-block-navigation__responsive-container-open');
  const closeMenuButton = responsiveContainer?.querySelector('.wp-block-navigation__responsive-container-close');

  const setMenuOpen = (isOpen) => {
    if (!responsiveContainer || !openMenuButton) return;

    responsiveContainer.classList.toggle('is-menu-open', isOpen);
    responsiveContainer.classList.toggle('has-modal-open', isOpen);
    responsiveContainer.dataset.lrsMenuOpen = String(isOpen);
    document.documentElement.classList.toggle('has-modal-open', isOpen);
    openMenuButton.setAttribute('aria-expanded', String(isOpen));
    responsiveContainer.setAttribute('aria-hidden', String(!isOpen));

    const dialog = responsiveContainer.querySelector('.wp-block-navigation__responsive-dialog');
    if (dialog) {
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', String(isOpen));
      dialog.setAttribute('aria-label', 'Menu');
    }

    if (isOpen) closeMenuButton?.focus({ preventScroll: true });
  };

  openMenuButton?.addEventListener('click', () => {
    window.requestAnimationFrame(() => {
      if (!responsiveContainer?.classList.contains('is-menu-open')) setMenuOpen(true);
    });
  });

  closeMenuButton?.addEventListener('click', () => {
    window.requestAnimationFrame(() => {
      if (responsiveContainer?.dataset.lrsMenuOpen === 'true') setMenuOpen(false);
    });
  });

  responsiveContainer?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenuOpen(false));
  });

  document.addEventListener('keydown', (event) => {
    if (
      event.key === 'Escape'
      && (
        responsiveContainer?.classList.contains('is-menu-open')
        || responsiveContainer?.dataset.lrsMenuOpen === 'true'
      )
    ) {
      setMenuOpen(false);
      openMenuButton?.focus({ preventScroll: true });
    }
  });

  let headerFrame = 0;
  const syncHeader = () => {
    headerFrame = 0;
    header?.classList.toggle('is-scrolled', window.scrollY > 24);
  };

  if (header) {
    window.addEventListener('scroll', () => {
      if (!headerFrame) headerFrame = window.requestAnimationFrame(syncHeader);
    }, { passive: true });
    if (window.scrollY > 24) syncHeader();
  }
})();
