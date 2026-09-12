/* ============================================================
   INTENSÉ'MANS — Roue de bienvenue
   ------------------------------------------------------------
   Le client laisse son e-mail, tourne la roue, et repart avec une
   attention offerte à son arrivée.

   Deux partis pris :

   1. Tout le monde gagne. Une roue où l'on peut perdre devient un
      jeu-concours, avec règlement à publier et lots à déclarer.
      Ici c'est un cadeau de bienvenue : aucune obligation, et ça
      convertit mieux.

   2. Les lots coûtent peu à l'hôte et se voient beaucoup. Un départ
      retardé ne coûte rien un jour de semaine ; une boule pour la
      douche coûte deux euros et se raconte.
   ============================================================ */

(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const FLECHE = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 8h10M9.5 4.5 13 8l-3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ----------------------------------------------------------
     Les lots
     `poids` règle la fréquence de sortie : les plus coûteux
     tombent moins souvent, sans jamais être absents.
     ---------------------------------------------------------- */

  /* Règle absolue : aucun lot ne doit exister au catalogue.
     Sinon la roue cannibalise l'upsell — pourquoi payer 25 € des
     pétales si elle les offre. Ces attentions ne sont vendues nulle
     part : elles ajoutent sans remplacer.

     La boule est destinée à la DOUCHE, pas au balnéo : huiles,
     colorants et résidus se logent dans les canalisations et la
     pompe d'un bain à jets, et ressortent en dépôt au bain suivant.
     La plupart des fabricants l'interdisent. Ne pas déplacer ce lot
     vers le balnéo sans accord écrit du fabricant.

     `poids` règle la fréquence : les deux qui ne coûtent rien
     sortent le plus souvent. */
  /* Ordre d'affichage : les objets d'abord. « Départ à 12 h » ne dit
     rien à qui ignore l'heure normale ; « Départ retardé » se comprend
     sans contexte, et la phrase complète donne les horaires.

     Ce lot a déjà été recalé une fois, quand l'arrivée est passée de
     17 h à 19 h. L'arrivée est désormais fixée à 16 h, et « arrivée
     anticipée » tomberait à 14 h : il ne resterait que trois heures
     entre le départ des uns et l'arrivée des autres pour remettre à
     neuf une chambre avec balnéo, qu'il faut vidanger et remplir.
     Promesse intenable, donc lot remplacé par un objet.

     ATTENTION, défaut connu et non corrigé : le disque dessine quatre
     tranches ÉGALES (`part = 360 / LOTS.length`) alors que les poids
     ci-dessous sont inégaux. La roue laisse donc croire à un quart de
     chance pour chacun. Les poids sont volontairement resserrés autour
     de 25 pour que l'écart reste négligeable ; si un jour ils
     s'écartent franchement, il faudra dessiner les tranches au
     prorata des poids plutôt que de les couper en parts égales. */
  const LOTS = [
    { court: 'Boule pour la douche', gain: 'Une boule effervescente parfumée, posée dans la douche', cout: 2, poids: 25 },
    { court: 'Huile de massage',     gain: 'Un flacon d’huile de massage, à vous deux',              cout: 3, poids: 20 },
    { court: 'Départ retardé',       gain: 'Le départ retardé : 12 h au lieu de 11 h',               cout: 0, poids: 30 },
    { court: 'Masque de soie',       gain: 'Un masque de soie, à découvrir dans la suite',           cout: 4, poids: 25 }
  ];


  const CLE = 'im_roue_v1';

  function dejaJoue() {
    try { return JSON.parse(localStorage.getItem(CLE) || 'null'); } catch (e) { return null; }
  }
  function retenir(donnee) {
    try { localStorage.setItem(CLE, JSON.stringify(donnee)); } catch (e) { /* mode privé */ }
  }

  function tirer() {
    const total = LOTS.reduce((s, l) => s + l.poids, 0);
    let n = Math.random() * total;
    for (let i = 0; i < LOTS.length; i++) {
      n -= LOTS[i].poids;
      if (n <= 0) return i;
    }
    return 0;
  }

  const codeCadeau = () => 'IM-' + Math.random().toString(36).slice(2, 7).toUpperCase();

  /* ----------------------------------------------------------
     Rendu
     ---------------------------------------------------------- */

  let hote = null;

  function vueFormulaire() {
    return `
      <div>
        <h2 class="im-roue__titre">Un cadeau vous attend dans la suite.</h2>
        <p class="im-roue__texte">
          Laissez votre e-mail, tournez la roue, et découvrez laquelle de ces
          quatre attentions vous sera préparée avant votre arrivée. Aucune
          n’est vendue sur le site. Tout le monde gagne.
        </p>
        <ul class="im-roue__lots">
          ${LOTS.map((l) => `<li>${esc(l.court)}</li>`).join('')}
        </ul>
      </div>

      <form class="im-roue__form" data-roue-form novalidate>
        <div class="im-roue__champs">
          <input type="email" name="email" placeholder="Votre adresse e-mail"
                 aria-label="Votre adresse e-mail" autocomplete="email" required>
          <button type="submit">Tourner la roue ${FLECHE}</button>
        </div>
        <label class="im-roue__accord">
          <input type="checkbox" name="accord">
          <span>J’accepte de recevoir mon cadeau et les offres d’INTENSÉ’MANS par e-mail.
          Désinscription en un clic. <a href="confidentialite.html">Politique de confidentialité</a>.</span>
        </label>
        <p class="im-roue__err" data-roue-err hidden></p>
      </form>`;
  }

  const CROIX = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  /* Le disque : une tranche par lot en dégradé conique, les libellés
     posés par-dessus, un par tranche. */
  function vueDisque() {
    const part = 360 / LOTS.length;
    const tranches = LOTS.map((l, i) => {
      const ton = i % 2 ? 'rgba(217,139,136,0.92)' : 'rgba(246,236,228,0.92)';
      return `${ton} ${i * part}deg ${(i + 1) * part}deg`;
    }).join(', ');
    /* Le dégradé conique compte les angles depuis midi ; l'étiquette,
       elle, part de 3 heures (transform-origin à gauche, largeur vers
       la droite). D'où les 90° à retrancher : sans eux, chaque libellé
       se posait sur la tranche suivante et la roue annonçait un lot
       différent de celui qu'elle désignait. */
    const etiquettes = LOTS.map((l, i) =>
      `<span style="transform: rotate(${i * part + part / 2 - 90}deg)">${esc(l.court)}</span>`
    ).join('');

    return `
      <div class="im-roue__disque">
        <div class="im-roue__plateau" data-plateau
             style="background: conic-gradient(${tranches})">${etiquettes}</div>
        <span class="im-roue__moyeu" aria-hidden="true">IM</span>
      </div>`;
  }

  /* La fenêtre, construite à la demande puis réutilisée. */
  function fenetre() {
    let dlg = $('.im-roue__modale');
    if (dlg) return dlg;

    dlg = document.createElement('dialog');
    dlg.className = 'im-roue__modale';
    dlg.setAttribute('aria-labelledby', 'roue-modale-titre');
    dlg.innerHTML = `
      <div class="im-roue__mtete">
        <div>
          <h2 class="im-roue__mtitre" id="roue-modale-titre">La roue tourne…</h2>
          <p class="im-roue__mnote">Ce qu’elle désigne vous sera préparé dans la suite.</p>
        </div>
        <button class="im-roue__fermer" type="button" data-fermer aria-label="Fermer">${CROIX}</button>
      </div>
      <div class="im-roue__mcorps" data-mcorps></div>`;

    document.body.appendChild(dlg);
    $('[data-fermer]', dlg).addEventListener('click', () => dlg.close());
    /* Clic sur le fond : on ferme, comme on s'y attend. */
    dlg.addEventListener('click', (ev) => { if (ev.target === dlg) dlg.close(); });
    return dlg;
  }

  function vueGagne(lot, code, email) {
    return `
      <div>
        <h2 class="im-roue__titre">C’est à vous.</h2>
        <p class="im-roue__texte">
          Nous avons envoyé votre code à ${esc(email)}. Indiquez-le au moment de
          composer votre séjour, ou mentionnez-le simplement dans votre message.
        </p>
      </div>
      <div class="im-roue__jeu">
        <div class="im-roue__resultat">
          <p class="im-roue__gain">${esc(lot.gain)}</p>
          <span class="im-roue__code">${esc(code)}</span>
          <p class="im-roue__suite">Valable pour un séjour, non cumulable avec un autre cadeau.</p>
          <a class="im-btn im-btn--primary" href="#parcours">Composer mon séjour</a>
        </div>
      </div>`;
  }

  /* ----------------------------------------------------------
     Enchaînement
     ---------------------------------------------------------- */

  function lancer(email) {
    const index = tirer();
    const lot = LOTS[index];
    const code = codeCadeau();

    const dlg = fenetre();
    const corps = $('[data-mcorps]', dlg);
    const titre = $('.im-roue__mtitre', dlg);
    const note = $('.im-roue__mnote', dlg);

    titre.textContent = 'La roue tourne…';
    note.textContent = 'Ce qu’elle désigne vous sera préparé dans la suite.';
    corps.innerHTML = vueDisque() + '<div class="im-roue__resultat" data-resultat aria-live="polite"></div>';

    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');

    const plateau = $('[data-plateau]', dlg);
    const part = 360 / LOTS.length;
    /* La pointe est en haut : on amène le centre de la tranche
       gagnante sous elle, après cinq tours complets. */
    const cible = 360 * 5 - (index * part + part / 2);
    const doux = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    requestAnimationFrame(() => {
      plateau.style.transform = `rotate(${doux ? cible % 360 : cible}deg)`;
    });

    setTimeout(() => {
      titre.textContent = 'C’est à vous.';
      note.textContent = `Votre code part à ${email}.`;
      $('[data-resultat]', dlg).innerHTML = `
        <p class="im-roue__gain">${esc(lot.gain)}</p>
        <span class="im-roue__code">${esc(code)}</span>
        <p class="im-roue__suite">Valable pour un séjour, non cumulable avec un autre cadeau.</p>
        <a class="im-btn im-btn--primary" href="#parcours" data-composer>Composer mon séjour</a>`;
      const lien = $('[data-composer]', dlg);
      if (lien) lien.addEventListener('click', () => dlg.close());
    }, doux ? 200 : 4700);

    /* Une fois la fenêtre fermée, la carte affiche le cadeau obtenu. */
    dlg.addEventListener('close', () => {
      hote.innerHTML = vueGagne(lot, code, email);
    }, { once: true });

    retenir({ email, lot: lot.court, gain: lot.gain, code, date: new Date().toISOString() });
    enregistrer({ email, lot: lot.court, code });
  }

  /* L'e-mail part vers le serveur s'il existe un point d'entrée.
     Sinon on n'invente rien : le cadeau reste valable côté client
     et il restera à brancher l'envoi. */
  async function enregistrer(donnee) {
    try {
      await fetch('/api/roue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(donnee)
      });
    } catch (e) {
      /* Point d'entrée absent : rien à signaler au client. */
    }
  }

  function brancher() {
    hote.addEventListener('submit', (ev) => {
      const form = ev.target.closest('[data-roue-form]');
      if (!form) return;
      ev.preventDefault();

      const email = form.email.value.trim();
      const accord = form.accord.checked;
      const err = $('[data-roue-err]', hote);
      const dire = (m) => { err.textContent = m; err.hidden = !m; };

      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return dire('Indiquez une adresse e-mail valide.');
      if (!accord) return dire('Cochez la case pour recevoir votre cadeau.');
      dire('');
      lancer(email);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const section = $('[data-roue]');
    if (!section) return;
    hote = $('.im-roue__corps', section);
    if (!hote) return;

    const passe = dejaJoue();
    if (passe && passe.code) {
      const lot = LOTS.find((l) => l.court === passe.lot) || { gain: passe.gain };
      hote.innerHTML = vueGagne(lot, passe.code, passe.email);
      return;
    }

    hote.innerHTML = vueFormulaire();
    brancher();
  });
})();
