(() => {
  "use strict";

  const body = document.body;
  const isBookingJourneyPage = body?.classList.contains("lrs-booking-page");
  const hasDirectBookingForm = Boolean(document.querySelector(".mphb-booking-form--direct-booking"));
  if (!isBookingJourneyPage && !hasDirectBookingForm) return;

  const slug = location.pathname.split("/").filter(Boolean).pop() || "reservation";
  const progressBySlug = {
    reservation: 1,
    disponibilites: 1,
    "finaliser-reservation": 2,
    "reservation-confirmee": 3,
    "paiement-reussi": 3,
    "paiement-echoue": 3,
  };
  const currentStep = progressBySlug[slug] || 1;
  const content = document.querySelector(".lrs-main > .wp-block-post-content");
  const directBookingStorageKey = "lrs.direct-booking-state.v1";

  const normalizeText = (value) => (value || "").replace(/\s+/g, " ").trim();

  const parseBookingDate = (value) => {
    const match = normalizeText(value).match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return date;
  };

  const bookingDateToIso = (date) => [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");

  const clearDirectBookingState = () => {
    try {
      sessionStorage.removeItem(directBookingStorageKey);
    } catch (_error) {
      // Storage can be unavailable in strict/private browser contexts.
    }
  };

  const persistDirectBookingState = (form) => {
    const checkInDisplay = form.querySelector(".mphb-check-in-date-wrapper .mphb-datepick")?.value || "";
    const checkOutDisplay = form.querySelector(".mphb-check-out-date-wrapper .mphb-datepick")?.value || "";
    const checkIn = form.querySelector('input[name="mphb_check_in_date"]')?.value || "";
    const checkOut = form.querySelector('input[name="mphb_check_out_date"]')?.value || "";
    if (!checkInDisplay || !checkOutDisplay || !checkIn || !checkOut) return;

    try {
      sessionStorage.setItem(
        directBookingStorageKey,
        JSON.stringify({
          checkInDisplay,
          checkOutDisplay,
          checkIn,
          checkOut,
          adults: form.querySelector('select[name="mphb_adults"]')?.value || "2",
          savedAt: Date.now(),
        }),
      );
    } catch (_error) {
      // The booking flow must remain functional when storage is unavailable.
    }
  };

  const restoreDirectBookingState = () => {
    if (slug !== "reservation") return;
    const form = document.querySelector(".mphb-booking-form--direct-booking");
    if (!form) return;

    const checkInField = form.querySelector(".mphb-check-in-date-wrapper .mphb-datepick");
    const checkOutField = form.querySelector(".mphb-check-out-date-wrapper .mphb-datepick");
    const checkInHidden = form.querySelector('input[name="mphb_check_in_date"]');
    const checkOutHidden = form.querySelector('input[name="mphb_check_out_date"]');
    if (!checkInField || !checkOutField || !checkInHidden || !checkOutHidden) return;
    if (checkInField.value || checkOutField.value || checkInHidden.value || checkOutHidden.value) return;

    let state;
    try {
      state = JSON.parse(sessionStorage.getItem(directBookingStorageKey) || "null");
    } catch (_error) {
      clearDirectBookingState();
      return;
    }

    const checkInDate = parseBookingDate(state?.checkInDisplay);
    const checkOutDate = parseBookingDate(state?.checkOutDisplay);
    const isFresh = Number.isFinite(state?.savedAt) && Date.now() - state.savedAt < 2 * 60 * 60 * 1000;
    const isConsistent = checkInDate && checkOutDate
      && bookingDateToIso(checkInDate) === state.checkIn
      && bookingDateToIso(checkOutDate) === state.checkOut
      && checkOutDate > checkInDate;
    if (!isFresh || !isConsistent) {
      clearDirectBookingState();
      return;
    }

    checkInField.value = state.checkInDisplay;
    checkOutField.value = state.checkOutDisplay;
    checkInHidden.value = state.checkIn;
    checkOutHidden.value = state.checkOut;

    const adults = form.querySelector('select[name="mphb_adults"]');
    if (adults && Array.from(adults.options).some((option) => option.value === state.adults)) {
      adults.value = state.adults;
    }

    [checkInField, checkOutField, adults].filter(Boolean).forEach((field) => {
      field.dispatchEvent(new Event("change", { bubbles: true }));
    });
    form.dataset.lrsRestoredDates = "true";
  };

  const directBookingDateKey = (form) => {
    const checkIn = form.querySelector(".mphb-check-in-date-wrapper .mphb-datepick")?.value || "";
    const checkOut = form.querySelector(".mphb-check-out-date-wrapper .mphb-datepick")?.value || "";
    return `${normalizeText(checkIn)}|${normalizeText(checkOut)}`;
  };

  const setDirectBookingDefaults = (form) => {
    const adults = form.querySelector('select[name="mphb_adults"]');
    if (
      adults
      && adults.dataset.lrsDefaultApplied !== "true"
      && form.dataset.lrsRestoredDates !== "true"
      && Array.from(adults.options).some((option) => option.value === "2")
    ) {
      adults.value = "2";
      adults.dataset.lrsDefaultApplied = "true";
      adults.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  const setNextDayCheckout = (form) => {
    if (form.dataset.lrsSyncingCheckout === "true") return;
    const checkInField = form.querySelector(".mphb-check-in-date-wrapper .mphb-datepick");
    const checkOutField = form.querySelector(".mphb-check-out-date-wrapper .mphb-datepick");
    const checkOutHidden = form.querySelector('input[name="mphb_check_out_date"]');
    const checkIn = parseBookingDate(checkInField?.value || "");
    if (!checkInField || !checkOutField || !checkOutHidden || !checkIn) return;

    const nextDay = new Date(checkIn.getTime());
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const displayValue = [
      String(nextDay.getUTCDate()).padStart(2, "0"),
      String(nextDay.getUTCMonth() + 1).padStart(2, "0"),
      nextDay.getUTCFullYear(),
    ].join("/");

    form.dataset.lrsSyncingCheckout = "true";
    try {
      if (window.jQuery?.fn?.datepick) {
        window.jQuery(checkOutField).datepick("setDate", displayValue);
      }
    } catch (_error) {
      // The visible and hidden values below keep the form functional without the widget API.
    }
    checkOutField.value = displayValue;
    checkOutHidden.value = bookingDateToIso(nextDay);
    delete form.dataset.lrsSyncingCheckout;
    checkOutField.dispatchEvent(new Event("input", { bubbles: true }));
    checkOutField.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const validateDirectBookingDates = (form) => {
    const checkInValue = form.querySelector(".mphb-check-in-date-wrapper .mphb-datepick")?.value || "";
    const checkOutValue = form.querySelector(".mphb-check-out-date-wrapper .mphb-datepick")?.value || "";
    const checkIn = parseBookingDate(checkInValue);
    const checkOut = parseBookingDate(checkOutValue);

    if (!checkIn || !checkOut) return "Renseignez des dates valides.";
    if (checkOut <= checkIn) return "La date de départ doit être postérieure à la date d’arrivée.";
    return "";
  };

  const showDirectBookingDateError = (form, message) => {
    let error = form.querySelector(".lrs-direct-date-error");
    if (!error) {
      error = document.createElement("p");
      error.className = "lrs-direct-date-error";
      error.setAttribute("role", "alert");
      form.querySelector(".mphb-reserve-btn-wrapper")?.insertAdjacentElement("beforebegin", error);
    }
    error.textContent = message;
  };

  const invalidateDirectBookingResult = (form) => {
    const currentKey = directBookingDateKey(form);
    const previousKey = form.dataset.lrsAvailabilityKey;
    if (!previousKey || previousKey === currentKey) return;

    form.dataset.lrsAvailabilityDirty = "true";
    form.querySelector(".lrs-direct-date-error")?.remove();
    form.querySelector(".mphb-period-price")?.classList.add("mphb-hide");
    form.querySelector(".mphb-available-rooms-count")?.classList.add("mphb-hide");
    form.querySelector(".mphb-reserve-btn-wrapper")?.classList.remove("mphb-hide");

    const confirmButton = form.querySelector(".mphb-confirm-reservation");
    if (confirmButton) {
      confirmButton.hidden = true;
      confirmButton.disabled = true;
    }
  };

  const prepareDirectBookingCheck = (form, event) => {
    const message = validateDirectBookingDates(form);
    if (message) {
      event.preventDefault();
      event.stopImmediatePropagation();
      invalidateDirectBookingResult(form);
      showDirectBookingDateError(form, message);
      return false;
    }

    form.dataset.lrsPendingAvailabilityKey = directBookingDateKey(form);
    form.querySelector(".lrs-direct-date-error")?.remove();
    return true;
  };

  const createProgress = () => {
    if (!content || content.querySelector(".lrs-booking-progress")) return;

    let heading = content.querySelector("h1");
    if (!heading && slug === "reservation") {
      heading = document.createElement("h1");
      heading.textContent = "Réservez La Duchesse 1976";
      content.prepend(heading);
    }

    if (heading && !content.querySelector(".lrs-booking-lead")) {
      const lead = document.createElement("p");
      lead.className = "lrs-booking-lead";
      lead.textContent =
        currentStep === 1
          ? "Choisissez vos dates et découvrez immédiatement le prix exact de votre séjour pour deux."
          : currentStep === 2
            ? "Vérifiez votre séjour, choisissez vos attentions puis renseignez vos coordonnées."
            : "Votre réservation est enregistrée. Retrouvez ici son statut et les prochaines étapes.";
      heading.insertAdjacentElement("afterend", lead);
    }

    const progress = document.createElement("ol");
    progress.className = "lrs-booking-progress";
    progress.setAttribute("aria-label", "Étapes de réservation");

    ["Dates", "Finaliser", "Confirmation"].forEach((label, index) => {
      const step = index + 1;
      const item = document.createElement("li");
      item.textContent = label;
      if (step < currentStep) item.classList.add("is-complete");
      if (step === currentStep) {
        item.classList.add("is-current");
        item.setAttribute("aria-current", "step");
      }
      progress.append(item);
    });

    (content.querySelector(".lrs-booking-lead") || heading)?.insertAdjacentElement(
      "afterend",
      progress,
    );
  };

  const enhanceDirectBooking = () => {
    document.querySelectorAll(".mphb-booking-form--direct-booking").forEach((form) => {
      const availabilityButton = form.querySelector(".mphb-reserve-btn");
      const confirmButton = form.querySelector(".mphb-confirm-reservation");
      const price = normalizeText(form.querySelector(".mphb-period-price .mphb-price")?.textContent);
      const error = form.querySelector(".mphb-errors-wrapper .mphb-error");

      setDirectBookingDefaults(form);

      if (availabilityButton && availabilityButton.value !== "Voir le prix") {
        availabilityButton.value = "Voir le prix";
      }

      if (confirmButton) {
        const priceWrapper = form.querySelector(".mphb-period-price");
        const pendingKey = form.dataset.lrsPendingAvailabilityKey;
        const currentKey = directBookingDateKey(form);
        const responseIsReady = price && priceWrapper && !priceWrapper.classList.contains("mphb-hide");

        if (responseIsReady && (!form.dataset.lrsAvailabilityKey || pendingKey === currentKey)) {
          form.dataset.lrsAvailabilityKey = currentKey;
          delete form.dataset.lrsPendingAvailabilityKey;
          delete form.dataset.lrsAvailabilityDirty;
          confirmButton.hidden = false;
          confirmButton.disabled = false;
        }

        confirmButton.value = price ? `Continuer — ${price}` : "Continuer";
        confirmButton.setAttribute(
          "aria-label",
          price ? `Continuer la réservation pour ${price}` : "Continuer la réservation",
        );
      }

      if (form.dataset.lrsDateGuard !== "true") {
        form.dataset.lrsDateGuard = "true";
        const checkInField = form.querySelector(".mphb-check-in-date-wrapper .mphb-datepick");
        let lastCheckInValue = checkInField?.value || "";
        const syncCheckoutFromArrival = () => {
          const currentValue = checkInField?.value || "";
          if (!currentValue || currentValue === lastCheckInValue) return;
          lastCheckInValue = currentValue;
          setNextDayCheckout(form);
        };

        checkInField?.addEventListener("input", syncCheckoutFromArrival);
        checkInField?.addEventListener("change", syncCheckoutFromArrival);

        // MotoPress Datepick updates the input property without always emitting a
        // native input/change event. This lightweight watcher keeps the promised
        // one-night default reliable for mouse, touch and keyboard selections.
        const arrivalWatcher = window.setInterval(() => {
          if (!form.isConnected) {
            window.clearInterval(arrivalWatcher);
            return;
          }
          syncCheckoutFromArrival();
        }, 250);
        form.querySelectorAll(".mphb-datepick").forEach((field) => {
          field.addEventListener("input", () => {
            invalidateDirectBookingResult(form);
            persistDirectBookingState(form);
          });
          field.addEventListener("change", () => {
            invalidateDirectBookingResult(form);
            persistDirectBookingState(form);
          });
        });
        form.querySelector('select[name="mphb_adults"]')?.addEventListener(
          "change",
          () => persistDirectBookingState(form),
        );
        form.addEventListener(
          "click",
          (event) => {
            if (event.target.matches(".mphb-reserve-btn")) prepareDirectBookingCheck(form, event);
          },
          true,
        );
        form.addEventListener(
          "submit",
          (event) => {
            persistDirectBookingState(form);
            if (event.submitter?.matches(".mphb-reserve-btn")) prepareDirectBookingCheck(form, event);
          },
          true,
        );
      }

      if (error && !error.closest(".lrs-availability-message")) {
        const message = document.createElement("div");
        message.className = "lrs-availability-message";
        message.setAttribute("role", "alert");

        const title = document.createElement("strong");
        title.textContent = "Ces dates ne sont pas disponibles.";

        const details = document.createElement("span");
        details.className = "lrs-availability-message__details";
        details.textContent = normalizeText(error.textContent);

        const retry = document.createElement("button");
        retry.type = "button";
        retry.className = "lrs-change-dates-button";
        retry.textContent = "Choisir d’autres dates";
        retry.addEventListener("click", () => {
          form.querySelector(".mphb-check-in-date-wrapper .mphb-datepick")?.focus();
        });

        error.replaceWith(message);
        message.append(title, details, retry);
      }
    });
  };

  const setAutocomplete = () => {
    const attributes = {
      mphb_first_name: ["given-name", "text"],
      mphb_last_name: ["family-name", "text"],
      mphb_email: ["email", "email"],
      mphb_phone: ["tel", "tel"],
      mphb_address1: ["address-line1", "text"],
      mphb_city: ["address-level2", "text"],
      mphb_state: ["address-level1", "text"],
      mphb_zip: ["postal-code", "text"],
      mphb_country: ["country", null],
    };

    Object.entries(attributes).forEach(([name, [autocomplete, type]]) => {
      const field = document.querySelector(`[name="${name}"]`);
      if (!field) return;
      field.autocomplete = autocomplete;
      if (type && field instanceof HTMLInputElement) field.type = type;
      if (name === "mphb_phone" && field instanceof HTMLInputElement) {
        field.inputMode = "tel";
        field.pattern = "[0-9+().\\s-]{6,20}";
        field.title = "Saisissez un numéro de téléphone valide.";
      }
    });
  };

  const syncGuestName = () => {
    const guestName = document.querySelector('input[name$="[guest_name]"]');
    if (!guestName) return;
    const firstName = document.querySelector('input[name="mphb_first_name"]')?.value;
    const lastName = document.querySelector('input[name="mphb_last_name"]')?.value;
    guestName.value = normalizeText([firstName, lastName].filter(Boolean).join(" "));
  };

  const validateCheckoutFields = (form) => {
    const phone = form.querySelector('input[name="mphb_phone"]');
    if (phone) {
      const value = phone.value.trim();
      const digitCount = value.replace(/\D/g, "").length;
      const validPhone = /^[0-9+().\s-]+$/.test(value)
        && digitCount >= 6
        && digitCount <= 15
        && value.length <= 20;
      phone.setCustomValidity(validPhone ? "" : "Saisissez un numéro de téléphone valide.");
    }

    return form.checkValidity();
  };

  const wrapCheckoutSummary = (form) => {
    if (form.querySelector(".lrs-checkout-summary")) return;

    const stay = form.querySelector(".lrs-checkout-stay");
    const breakdown = form.querySelector("#mphb-price-details");
    const total = form.querySelector(".mphb-total-price");
    if (!stay || !breakdown || !total) return;

    const summary = document.createElement("aside");
    summary.className = "lrs-checkout-summary";
    summary.setAttribute("aria-label", "Récapitulatif de la réservation");
    stay.insertAdjacentElement("beforebegin", summary);
    summary.append(stay, breakdown, total);
  };

  const wrapCoupon = (form) => {
    const section = form.querySelector("#mphb-coupon-details");
    if (!section || section.querySelector(".lrs-coupon-disclosure")) return;

    const disclosure = document.createElement("details");
    disclosure.className = "lrs-coupon-disclosure";
    const summary = document.createElement("summary");
    summary.textContent = "J’ai un code avantage";
    const inner = document.createElement("div");
    inner.className = "lrs-coupon-disclosure__body";

    while (section.firstChild) inner.append(section.firstChild);
    disclosure.append(summary, inner);
    section.append(disclosure);
  };

  const updateServiceCards = (form) => {
    form.querySelectorAll(".lrs-service-card").forEach((card) => {
      const checkbox = card.querySelector('input[type="checkbox"]');
      const state = card.querySelector(".lrs-service-card__state");
      const selected = Boolean(checkbox?.checked);
      if (card.classList.contains("is-selected") !== selected) {
        card.classList.toggle("is-selected", selected);
      }
      const stateLabel = selected ? "Ajouté" : "Ajouter";
      if (state && state.textContent !== stateLabel) state.textContent = stateLabel;
    });
  };

  const updateCheckoutCta = (form) => {
    const submit = form.querySelector('.mphb_sc_checkout-submit-wrapper input[type="submit"]');
    const total = normalizeText(form.querySelector(".mphb-total-price-field")?.textContent);
    if (!submit || submit.dataset.lrsSubmitting === "true") return;
    submit.value = total ? `Confirmer et payer — ${total}` : "Confirmer et payer";
  };

  const addPreproductionNotice = (form) => {
    if (!location.hostname.startsWith("preprod-") || form.querySelector(".lrs-test-payment-notice")) return;
    const submitWrapper = form.querySelector(".mphb_sc_checkout-submit-wrapper");
    if (!submitWrapper) return;
    const notice = document.createElement("p");
    notice.className = "lrs-test-payment-notice";
    notice.textContent = "Paiement de test en préproduction — aucun débit réel.";
    submitWrapper.insertAdjacentElement("beforebegin", notice);
  };

  const enhanceCheckout = () => {
    const form = document.querySelector(".mphb_sc_checkout-form");
    if (!form) return;

    wrapCheckoutSummary(form);
    wrapCoupon(form);
    setAutocomplete();
    syncGuestName();
    updateServiceCards(form);
    updateCheckoutCta(form);
    addPreproductionNotice(form);

    if (form.dataset.lrsEnhanced === "true") return;
    form.dataset.lrsEnhanced = "true";

    form.addEventListener("input", (event) => {
      syncGuestName();
      if (event.target.matches('input[name="mphb_phone"]')) validateCheckoutFields(form);
    });
    form.addEventListener("change", (event) => {
      if (event.target.matches(".mphb_checkout-service, .mphb_checkout-service-quantity, .mphb_checkout-service-adults")) {
        updateServiceCards(form);
      }
    });

    form.addEventListener(
      "click",
      (event) => {
        if (!event.target.matches('.mphb_sc_checkout-submit-wrapper input[type="submit"]')) return;
        syncGuestName();
        if (validateCheckoutFields(form)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        form.reportValidity();
      },
      true,
    );

    form.addEventListener("submit", (event) => {
      syncGuestName();
      if (!validateCheckoutFields(form)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        form.reportValidity();
        return;
      }
      const submit = form.querySelector('.mphb_sc_checkout-submit-wrapper input[type="submit"]');
      if (!submit || submit.dataset.lrsSubmitting === "true") return;
      submit.dataset.lrsSubmitting = "true";
      submit.disabled = true;
      submit.setAttribute("aria-disabled", "true");
      submit.value = "Traitement en cours…";
    }, true);
  };

  const reenableSubmitAfterError = () => {
    const form = document.querySelector(".mphb_sc_checkout-form");
    const submit = form?.querySelector('.mphb_sc_checkout-submit-wrapper input[type="submit"]');
    const visibleError = form?.querySelector(
      ".mphb-errors-wrapper:not(.mphb-hide), .mphb-validation-error, .mphb-error",
    );
    if (!submit || !visibleError) return;
    delete submit.dataset.lrsSubmitting;
    submit.disabled = false;
    submit.removeAttribute("aria-disabled");
    updateCheckoutCta(form);
  };

  if (currentStep === 3) clearDirectBookingState();
  restoreDirectBookingState();
  if (isBookingJourneyPage) createProgress();
  enhanceDirectBooking();
  enhanceCheckout();

  window.addEventListener("pageshow", () => {
    restoreDirectBookingState();
    enhanceDirectBooking();
  });

  document.querySelectorAll(".mphb-booking-form--direct-booking").forEach((form) => {
    const directObserver = new MutationObserver(() => enhanceDirectBooking());
    directObserver.observe(form, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  });

  const checkoutForm = document.querySelector(".mphb_sc_checkout-form");
  const checkoutTotal = checkoutForm?.querySelector(".mphb-total-price-field");
  if (checkoutForm && checkoutTotal) {
    const totalObserver = new MutationObserver(() => updateCheckoutCta(checkoutForm));
    totalObserver.observe(checkoutTotal, { childList: true, subtree: true });

    const checkoutErrors = checkoutForm.querySelector(".mphb-errors-wrapper");
    if (checkoutErrors) {
      const errorObserver = new MutationObserver(reenableSubmitAfterError);
      errorObserver.observe(checkoutErrors, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    }
  }
})();
