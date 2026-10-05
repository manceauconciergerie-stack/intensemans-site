/* ============================================================
   INTENSÉ'MANS — Séjour réservé
   ------------------------------------------------------------
   Page de retour après paiement de la nuit.

   Deux messages très différents selon le cas : la nuit est acquise,
   ou l'arrivée était trop proche pour qu'on ait pu vérifier le
   calendrier Airbnb et l'hôte doit confirmer. Le second cas doit
   être dit clairement — laisser croire à une réservation ferme
   qui n'en est pas une serait pire que tout.
   ============================================================ */

(() => {
  'use strict';

  const hote = document.querySelector('[data-render="stay-confirmation"]');
  if (!hote) return;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const euro = (n) => new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2
  }).format(n);

  const longue = (isoStr) => {
    const ts = Date.parse(`${isoStr}T12:00:00`);
    if (!Number.isFinite(ts)) return isoStr || '—';
    return new Date(ts).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  /* Seul Stripe redirige ici, et seulement après un paiement réussi :
     c'est la référence dans l'URL qui atteste du passage. */
  const ref = new URLSearchParams(location.search).get('ref');

  let sejour = null;
  try { sejour = JSON.parse(sessionStorage.getItem('im_stay') || 'null'); } catch (e) { sejour = null; }
  if (sejour && ref && sejour.ref !== ref) sejour = null;

  if (!ref) {
    hote.innerHTML = `
      <div class="im-empty">
        <h2>Aucune réservation à afficher</h2>
        <p class="im-quiet">Cette page s’affiche après le paiement de votre nuit.</p>
        <a class="im-btn im-btn--primary" href="index.html#parcours">Voir les disponibilités</a>
      </div>`;
    return;
  }

  const aValider = sejour && sejour.needsConfirmation;

  /* Copie de site/api/_lib/lieu.js (le navigateur ne lit pas le
     serveur). Cette page est la seule chose que le client voit à coup
     sûr : le 3 octobre, aucun mail n'est arrivé, et il n'avait aucun
     numéro pour joindre l'hôte. */
  const LIEU = {
    adresse: '1 bis rue Jeanne d’Arc, 72000 Le Mans',
    tel: '06 40 08 10 45',
    telLien: 'tel:+33640081045'
  };

  const contact = `
      <div class="im-summary" style="position:static;max-width:620px;margin:22px auto 0">
        <div class="im-summary__row">
          <span class="im-quiet">Adresse</span>
          <span>${esc(LIEU.adresse)}</span>
        </div>
        <div class="im-summary__row">
          <span class="im-quiet">Votre hôte</span>
          <span>Lenny · <a href="${LIEU.telLien}">${esc(LIEU.tel)}</a></span>
        </div>
        <p class="im-summary__legal">
          Une question d’ici là : appelez Lenny directement. Le détail de
          votre réservation vous est aussi envoyé par e-mail ; pensez à
          garder cette page.
        </p>
      </div>`;

  const detail = sejour ? `
      <div class="im-summary" style="position:static;max-width:620px;margin-inline:auto">
        <div class="im-summary__row">
          <span class="im-quiet">Référence</span>
          <span class="im-price">${esc(sejour.ref)}</span>
        </div>
        <div class="im-summary__row">
          <span class="im-quiet">Arrivée</span>
          <span>${esc(longue(sejour.checkin))}</span>
        </div>
        <div class="im-summary__row">
          <span class="im-quiet">Départ</span>
          <span>${esc(longue(sejour.checkout))}</span>
        </div>
        <div class="im-summary__row im-summary__row--total">
          <span>Total payé</span>
          <span class="im-price">${esc(euro(sejour.total))}</span>
        </div>
        <p class="im-summary__legal">
          Votre reçu de paiement vous est envoyé par e-mail.
        </p>
      </div>` : `
      <p class="im-lead" style="text-align:center">
        Référence ${esc(ref)}. Le détail n’est plus disponible sur cet appareil,
        mais votre réservation est bien enregistrée.
      </p>`;

  hote.innerHTML = `
    <div class="im-head im-head--center">
      <span class="im-eyebrow">${aValider ? 'Paiement reçu' : 'Séjour réservé'}</span>
      <h1>${aValider
        ? 'Nous vous confirmons <span class="im-italic">très vite.</span>'
        : 'À très bientôt <span aria-hidden="true">❤︎</span>'}</h1>
      <div class="im-flourish im-flourish--center"><span aria-hidden="true">❤︎</span></div>
      <p class="im-lead">${aValider
        ? 'Votre arrivée est proche : nous vérifions une dernière fois nos disponibilités.'
        : 'Votre nuit à la Love Room INTENSÉ’MANS est réservée.'}
        <strong>Lenny va prendre contact avec vous${sejour && sejour.phone ? ` au ${esc(sejour.phone)}` : ''}</strong>
        ${aValider
          ? 'dans les prochaines heures pour vous confirmer votre nuit. En cas d’imprévu, vous seriez intégralement remboursé.'
          : 'avant votre arrivée, pour vous indiquer l’accès et vous communiquer les codes.'}</p>
    </div>

    ${detail}
    ${contact}

    <div class="im-head im-head--center" style="margin-top:clamp(48px,6vw,80px)">
      <span class="im-eyebrow">Et pour rendre la soirée mémorable</span>
      <h2>Ajoutez <span class="im-italic">quelques attentions.</span></h2>
      <p class="im-lead">
        Champagne au frais, pétales sur le lit, décoration : tout est préparé
        dans la suite avant votre arrivée.
      </p>
      <p style="margin-top:26px">
        <a class="im-btn im-btn--primary" href="index.html">Voir les attentions <span aria-hidden="true">❤︎</span></a>
      </p>
    </div>`;
})();
