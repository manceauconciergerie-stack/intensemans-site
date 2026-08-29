(() => {
  "use strict";

  const body = document.body;
  const staticMobile = window.matchMedia("(max-width: 1150px)").matches;
  const header = document.querySelector(".lrs-unified-header");
  const toggle = header?.querySelector(".lrs-unified-header__toggle");
  const navigation = header?.querySelector(".lrs-unified-header__nav");
  const bookingModal = document.querySelector(".lrs-global-booking");
  const bookingPanel = bookingModal?.querySelector(".lrs-global-booking__panel");
  const bookingClose = bookingModal?.querySelector(".lrs-global-booking__close");
  const backToTop = document.querySelector(".lrs-back-to-top");
  let bookingTrigger = null;

  const outboundTrackingExcludedHosts = [
    "paypal.com",
    "paypalobjects.com",
    "stripe.com",
    "mypos.com",
    "mypos.eu",
    "woocommerce.com",
    "woocommercepayments.com",
  ];

  const isExcludedOutboundHost = (hostname) => outboundTrackingExcludedHosts.some(
    (excludedHost) => hostname === excludedHost || hostname.endsWith(`.${excludedHost}`),
  );

  const hasSensitiveQuery = (url) => [
    "signature",
    "sig",
    "token",
    "nonce",
    "payment_intent",
    "client_secret",
  ].some((parameter) => url.searchParams.has(parameter));

  const addOutboundReferral = (link, target) => {
    if (link.hasAttribute("data-lrs-no-utm")) return;
    if (isExcludedOutboundHost(target.hostname.toLowerCase()) || hasSensitiveQuery(target)) return;

    if (!target.searchParams.has("utm_source")) {
      target.searchParams.set("utm_source", "loveroomspa.com");
    }
    if (!target.searchParams.has("utm_medium")) {
      target.searchParams.set("utm_medium", "referral");
    }
    link.href = target.href;
  };

  const secureExternalLink = (link) => {
    if (!(link instanceof HTMLAnchorElement)) return;
    let target;
    try {
      target = new URL(link.href, window.location.href);
    } catch (_error) {
      return;
    }
    if (!["http:", "https:"].includes(target.protocol) || target.origin === window.location.origin) return;
    addOutboundReferral(link, target);
    link.target = "_blank";
    link.relList.add("noopener", "noreferrer");
  };

  const cueExcluded = (link) => link.matches([
    ".lrs-unified-header__brand",
    ".lrs-unified-header a",
    ".lrs-context-nav a",
    ".lrs-unified-footer a",
    ".lrs-unified-footer__socials a",
    ".lrs-unified-footer__credit",
    ".lrs-back-to-top",
    ".satellite-booking",
    ".skip-link",
    ".lrs-option-card > .lrs-line-link a",
    ".datepick a",
    ".datepick-popup a",
    ".mphb-calendar a",
    ".ui-datepicker a",
    ".flatpickr-calendar a",
    "#cookie-law-info-bar a",
    ".cli-modal a",
    ".cky-consent-container a",
    ".cli_action_button",
    ".cli_settings_button",
    ".wt-cli-element",
    ".cky-btn",
    "[aria-hidden='true']",
  ].join(",")) || Boolean(link.querySelector("img, svg"));

  const removeLegacyArrow = (link) => {
    const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    for (let index = textNodes.length - 1; index >= 0; index -= 1) {
      const node = textNodes[index];
      if (!node.nodeValue.trim()) continue;
      node.nodeValue = node.nodeValue.replace(/[\s\u00a0]*(?:↗|→|➡|➜|➝|➞|⟶|↓|⇣)\s*$/u, "");
      break;
    }
  };

  const prepareLink = (link) => {
    secureExternalLink(link);
    if (!(link instanceof HTMLAnchorElement)) return;
    removeLegacyArrow(link);
    if (cueExcluded(link) || !link.textContent.trim()) return;
    link.classList.add("lrs-link-cue");
  };

  /* Le traitement de tous les liens pouvait monopoliser le thread principal
     pendant le premier rendu. Il est fractionné en petites séries pendant les
     temps morts. La sécurisation d'un lien cliqué reste synchrone et ne change
     jamais sa géométrie, ce qui préserve le comportement tactile de Safari. */
  const pendingLinks = [];
  const queuedLinks = new WeakSet();
  let linkWorkScheduled = false;

  const runLinkWork = (deadline) => {
    linkWorkScheduled = false;
    let processed = 0;

    while (pendingLinks.length && processed < 12) {
      const link = pendingLinks.shift();
      if (link?.isConnected) prepareLink(link);
      processed += 1;
    }

    if (pendingLinks.length) scheduleLinkWork();
  };

  const scheduleLinkWork = () => {
    if (linkWorkScheduled) return;
    linkWorkScheduled = true;

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(runLinkWork, { timeout: 2500 });
    } else {
      window.setTimeout(
        () => runLinkWork({ didTimeout: true, timeRemaining: () => 0 }),
        32,
      );
    }
  };

  const queueLink = (link) => {
    if (!(link instanceof HTMLAnchorElement) || queuedLinks.has(link)) return;
    queuedLinks.add(link);
    pendingLinks.push(link);
    scheduleLinkWork();
  };

  document.querySelectorAll("a[href]").forEach(queueLink);

  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[href]");
    if (link) secureExternalLink(link);
  }, true);

  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches("a[href]")) queueLink(node);
        node.querySelectorAll?.("a[href]").forEach(queueLink);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

  const updateBackToTop = () => {
    if (!backToTop) return;
    const visible = window.scrollY > Math.max(480, window.innerHeight * 0.65);
    backToTop.classList.toggle("is-visible", visible);
    backToTop.setAttribute("aria-hidden", String(!visible));
    backToTop.tabIndex = visible ? 0 : -1;
  };

  backToTop?.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  });

  window.addEventListener("scroll", updateBackToTop, { passive: true });
  if (window.scrollY > 0) updateBackToTop();

  const isMobileMenu = () => window.matchMedia("(max-width: 1150px)").matches;

  const closeMenuGroups = (exception = null) => {
    header?.querySelectorAll(".lrs-unified-header__group[open]").forEach((detail) => {
      if (detail !== exception) detail.removeAttribute("open");
    });
  };

  const setMenuOpen = (open) => {
    if (!toggle || !navigation) return;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute(
      "aria-label",
      open
        ? (window.lrsSearchConfig?.labels?.menuClose || "Fermer le menu")
        : (window.lrsSearchConfig?.labels?.menuOpen || "Ouvrir le menu"),
    );
    navigation.hidden = isMobileMenu() ? !open : false;
    body.classList.toggle("lrs-menu-open", open && isMobileMenu());
    if (!open) header.querySelectorAll("details[open]").forEach((detail) => detail.removeAttribute("open"));
  };

  /* Le HTML garde la navigation masquée par défaut pour éviter son flash sur
     mobile. L'initialisation la rétablit immédiatement sur grand écran. */
  if (staticMobile) {
    if (navigation) navigation.hidden = true;
  } else {
    setMenuOpen(false);
  }

  toggle?.addEventListener("click", () => {
    setMenuOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  header?.querySelectorAll(".lrs-unified-header__group").forEach((detail) => {
    detail.addEventListener("toggle", () => {
      if (detail.open) closeMenuGroups(detail);
    });
  });

  navigation?.addEventListener("click", (event) => {
    if (event.target.closest("a") && isMobileMenu()) setMenuOpen(false);
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".lrs-unified-header__group")) closeMenuGroups();
  });

  window.addEventListener("resize", () => {
    if (!navigation) return;
    if (isMobileMenu()) {
      navigation.hidden = toggle?.getAttribute("aria-expanded") !== "true";
    } else {
      navigation.hidden = false;
      body.classList.remove("lrs-menu-open");
    }
  }, { passive: true });

  const focusableElements = (container) => [...container.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((element) => element.offsetParent !== null);

  const closeBooking = () => {
    if (!bookingModal || bookingModal.hidden) return;
    bookingModal.hidden = true;
    body.classList.remove("lrs-global-booking-open");
    bookingTrigger?.focus({ preventScroll: true });
    bookingTrigger = null;
  };

  const openBooking = (trigger) => {
    if (!bookingModal) return false;
    bookingTrigger = trigger || null;
    bookingModal.hidden = false;
    body.classList.add("lrs-global-booking-open");
    window.requestAnimationFrame(() => bookingClose?.focus({ preventScroll: true }));
    return true;
  };

  const parseIsoDate = (value) => {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const isoDate = (date) => [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");

  const displayDate = (date) => [
    String(date.getUTCDate()).padStart(2, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    date.getUTCFullYear(),
  ].join("/");

  const setMotoPressDate = (form, kind, date) => {
    const wrapper = kind === "in" ? ".mphb-check-in-date-wrapper" : ".mphb-check-out-date-wrapper";
    const visible = form.querySelector(`${wrapper} .mphb-datepick`);
    const hidden = form.querySelector(`input[name="mphb_check_${kind}_date"]`);
    if (!visible || !hidden || !date) return;
    try {
      if (window.jQuery?.fn?.datepick) window.jQuery(visible).datepick("setDate", displayDate(date));
    } catch (_error) {
      // MotoPress still reads the synchronized visible and hidden values below.
    }
    visible.value = displayDate(date);
    hidden.value = isoDate(date);
    visible.dispatchEvent(new Event("input", { bubbles: true }));
    visible.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const transferDatesToMotoPress = (sourceForm) => {
    const targetForm = bookingModal?.querySelector(".mphb-booking-form--direct-booking");
    if (!targetForm) return;
    const arrival = parseIsoDate(sourceForm.querySelector('[name="arrival"]')?.value);
    let departure = parseIsoDate(sourceForm.querySelector('[name="departure"]')?.value);
    if (arrival && (!departure || departure <= arrival)) {
      departure = new Date(arrival.getTime());
      departure.setUTCDate(departure.getUTCDate() + 1);
    }
    setMotoPressDate(targetForm, "in", arrival);
    setMotoPressDate(targetForm, "out", departure);
    const adults = targetForm.querySelector('select[name="mphb_adults"]');
    if (adults && [...adults.options].some((option) => option.value === "2")) {
      adults.value = "2";
      adults.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  const hasBookingIntent = (element) => {
    if (!(element instanceof HTMLElement)) return false;
    if (element.closest(".lrs-global-booking, form")) return false;
    if (element.matches("[data-lrs-booking-trigger]")) return true;

    const link = element.closest("a[href]");
    if (link) {
      const target = new URL(link.href, window.location.href);
      if (target.origin === window.location.origin && ["#reserver", "#reservation"].includes(target.hash)) return true;
      if (target.origin === window.location.origin && /\/(reservation|disponibilites)\/?$/.test(target.pathname)) return true;
    }

    return false;
  };

  if (bookingModal) {
    bookingModal.id ||= "lrs-global-booking";
    document.querySelectorAll(
      'a[href$="#reserver"], a[href$="#reservation"], a[href*="/reservation"], a[href*="/disponibilites"], [data-lrs-booking-trigger]'
    ).forEach((element) => {
      if (!hasBookingIntent(element)) return;
      element.dataset.lrsBookingTrigger = "";
      element.setAttribute("aria-haspopup", "dialog");
      element.setAttribute("aria-controls", bookingModal.id);
    });
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("a, button");
    if (!target || !hasBookingIntent(target) || !bookingModal) return;
    event.preventDefault();
    event.stopPropagation();
    openBooking(target);
  }, true);

  document.addEventListener("submit", (event) => {
    const form = event.target.closest?.("form[data-availability-form]");
    if (!form || !bookingModal) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!form.reportValidity()) return;
    transferDatesToMotoPress(form);
    openBooking(form.querySelector('button[type="submit"], input[type="submit"]') || form);
  }, true);

  bookingClose?.addEventListener("click", closeBooking);
  bookingModal?.addEventListener("click", (event) => {
    if (event.target === bookingModal) closeBooking();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (bookingModal && !bookingModal.hidden) {
        closeBooking();
      } else if (header?.querySelector(".lrs-unified-header__group[open]")) {
        closeMenuGroups();
      } else if (toggle?.getAttribute("aria-expanded") === "true") {
        setMenuOpen(false);
        toggle.focus({ preventScroll: true });
      }
      return;
    }

    if (event.key !== "Tab" || !bookingModal || bookingModal.hidden || !bookingPanel) return;
    const focusable = focusableElements(bookingPanel);
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

  if (navigation && !staticMobile) navigation.hidden = false;

  const searchForm = document.querySelector("[data-lrs-search]");
  const searchInput = searchForm?.querySelector('input[type="search"]');
  const searchResults = searchForm?.querySelector(".lrs-site-search__results");
  const searchClose = searchForm?.querySelector(".lrs-site-search__close");
  const searchToggle = searchForm?.querySelector(".lrs-site-search__toggle");
  let searchTimer = 0;
  let searchController = null;

  const normalizeSearch = (value) => String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  const instantSearch = (query) => {
    const normalizedQuery = normalizeSearch(query);
    const terms = normalizedQuery.split(" ").filter((term) => term.length >= 2);
    if (!terms.length) return [];
    return (window.lrsSearchConfig?.instant || []).map((item) => {
      const title = normalizeSearch(item.title);
      const text = normalizeSearch(`${item.title} ${item.excerpt}`);
      let score = title.includes(normalizedQuery) ? 80 : (text.includes(normalizedQuery) ? 35 : 0);
      terms.forEach((term) => { score += title.includes(term) ? 18 : (text.includes(term) ? 5 : 0); });
      return { ...item, score };
    }).filter((item) => item.score >= 10).sort((a, b) => b.score - a.score).slice(0, 6);
  };

  const escapeSearchText = (value) => {
    const span = document.createElement("span");
    span.textContent = String(value || "");
    return span.innerHTML;
  };

  const closeSearch = () => {
    if (!searchResults || !searchInput) return;
    searchResults.hidden = true;
    searchResults.innerHTML = "";
    searchInput.setAttribute("aria-expanded", "false");
    if (searchClose) searchClose.hidden = true;
  };

  const showSearchMessage = (message) => {
    if (!searchResults || !searchInput) return;
    searchResults.innerHTML = `<p class="lrs-site-search__message">${escapeSearchText(message)}</p>`;
    searchResults.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
    if (searchClose) searchClose.hidden = false;
  };

  const renderSearchResults = (results) => {
    if (!searchResults || !searchInput) return;
    if (!results.length) {
      showSearchMessage(window.lrsSearchConfig?.labels?.empty || "Aucun résultat trouvé.");
      return;
    }
    searchResults.innerHTML = results.map((result) => `
      <a class="lrs-site-search__result" role="option" href="${escapeSearchText(result.url)}">
        <span class="lrs-site-search__type">${escapeSearchText(result.type)}${result.parent ? ` · ${escapeSearchText(result.parent)}` : ""}</span>
        <strong>${escapeSearchText(result.title)}</strong>
        <small>${escapeSearchText(result.excerpt)}</small>
      </a>
    `).join("");
    searchResults.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
    if (searchClose) searchClose.hidden = false;
  };

  const runSearch = async () => {
    const query = searchInput?.value.trim() || "";
    const minimum = Number(window.lrsSearchConfig?.minimum || 2);
    if (query.length < minimum) {
      closeSearch();
      return;
    }
    const instantResults = instantSearch(query);
    if (instantResults.length) renderSearchResults(instantResults);
    else showSearchMessage(window.lrsSearchConfig?.labels?.loading || "Recherche en cours");
    searchController?.abort();
    searchController = new AbortController();
    const url = new URL(window.lrsSearchConfig.endpoint, window.location.href);
    url.searchParams.set("action", window.lrsSearchConfig.action);
    url.searchParams.set("q", query);
    try {
      const response = await fetch(url, { credentials: "same-origin", signal: searchController.signal });
      if (!response.ok) throw new Error("search-http");
      const payload = await response.json();
      renderSearchResults(payload?.data?.results || []);
    } catch (error) {
      if (error.name !== "AbortError") showSearchMessage(window.lrsSearchConfig?.labels?.error || "Recherche indisponible.");
    }
  };

  searchInput?.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    const query = searchInput.value.trim();
    const instantResults = instantSearch(query);
    if (query.length >= Number(window.lrsSearchConfig?.minimum || 2)) {
      if (instantResults.length) renderSearchResults(instantResults);
      else showSearchMessage(window.lrsSearchConfig?.labels?.loading || "Recherche en cours");
    } else {
      closeSearch();
    }
    searchTimer = window.setTimeout(runSearch, 260);
  });

  searchToggle?.addEventListener("click", () => {
    searchInput?.focus();
  });

  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSearch();
      searchInput.blur();
    } else if (event.key === "ArrowDown" && !searchResults?.hidden) {
      event.preventDefault();
      searchResults.querySelector("a")?.focus();
    }
  });

  searchForm?.addEventListener("submit", (event) => {
    if ((searchInput?.value.trim() || "").length >= 2) {
      event.preventDefault();
      runSearch();
    }
  });

  searchClose?.addEventListener("click", () => {
    searchInput.value = "";
    searchController?.abort();
    closeSearch();
    searchInput.focus();
  });

  document.addEventListener("click", (event) => {
    if (searchForm && !searchForm.contains(event.target)) closeSearch();
  });

  const revealHashTarget = () => {
    if (!window.location.hash) return;
    let target = null;
    try {
      target = document.querySelector(window.location.hash);
    } catch (_error) {
      return;
    }
    if (target instanceof HTMLDetailsElement) target.open = true;
  };
  window.addEventListener("hashchange", revealHashTarget);
  revealHashTarget();
})();
