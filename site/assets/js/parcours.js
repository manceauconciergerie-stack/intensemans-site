/* ============================================================
   INTENSÉ'MANS — Parcours de commande
   ------------------------------------------------------------
   Un seul tunnel, deux chemins :

     nuit déjà réservée   →  réservation · attentions · paiement
     nuit à réserver      →  votre nuit · coordonnées · attentions · paiement

   Fichier autonome, volontairement séparé de app.js : plusieurs
   sessions écrivent dans les fichiers partagés et le travail s'y
   écrase. Ce module ne dépend que de `IM` (le catalogue) et pose
   une prise nommée pour le calendrier, fourni ailleurs.
   ============================================================ */

(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const euro = (n) => new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2
  }).format(n);

  const FLECHE = '<svg viewBox="0 0 16 8" fill="none" aria-hidden="true"><path d="M0 4h13M10 1l3 3-3 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ----------------------------------------------------------
     Personnages au trait
     ---------------------------------------------------------- */

  const PERSO_RESERVE = `
    <svg class="im-pc__perso" viewBox="0 0 120 116" aria-hidden="true">
      <rect data-trait x="68" y="20" width="42" height="84" rx="3"/>
      <circle data-trait cx="76" cy="64" r="2.2"/>
      <circle data-trait cx="36" cy="36" r="11"/>
      <path data-trait d="M36 47v28"/>
      <path data-trait d="M36 55 22 66"/>
      <path data-trait d="M36 55l17-7"/>
      <path data-trait d="M36 75 26 102"/>
      <path data-trait d="M36 75l10 27"/>
      <circle data-accent cx="57" cy="45" r="4.2"/>
      <path data-accent d="M61 45h11m-4 0v4m4-4v5"/>
    </svg>`;

  const PERSO_A_RESERVER = `
    <svg class="im-pc__perso" viewBox="0 0 120 116" aria-hidden="true">
      <rect data-trait x="58" y="26" width="52" height="48" rx="4"/>
      <path data-trait d="M58 40h52"/>
      <path data-trait d="M70 20v10M98 20v10"/>
      <path data-trait d="M66 50h8M82 50h8M66 60h8"/>
      <rect data-plein x="80" y="55" width="11" height="10" rx="2.5"/>
      <circle data-trait cx="30" cy="42" r="11"/>
      <path data-trait d="M30 53v24"/>
      <path data-trait d="M30 60 19 70"/>
      <path data-accent d="M30 60l20-6"/>
      <path data-trait d="M30 77 21 102"/>
      <path data-trait d="M30 77l9 25"/>
    </svg>`;

  /* ----------------------------------------------------------
     État
     ---------------------------------------------------------- */

  const CLE = 'im_parcours_v1';

  /* Horaires du lieu. La nuit se prend à partir de 16 h et se rend
     avant 11 h : ce n'est pas un réglage, c'est le fonctionnement de
     la suite. Une arrivée annoncée à 14 h serait une promesse qu'on
     ne peut pas tenir. */
  const ARRIVEE_MIN = '16:00';

  /* Les attentions se commandent jusqu'à 18 h la veille : certains
     produits sont achetés frais le matin même. Ce n'est pas un
     argument de vente, c'est une contrainte — elle doit donc
     apparaître au moment où la date se choisit, pas ailleurs.

     Renvoie null si la date est encore ouverte, sinon le texte à
     afficher. On avertit plutôt que de bloquer : la nuit reste
     réservable, ce sont les attentions qui ne suivent plus. */
  function delaiAttentions(dateISO) {
    if (!dateISO) return null;
    const arrivee = new Date(dateISO + 'T00:00:00');
    if (Number.isNaN(arrivee.getTime())) return null;
    const limite = new Date(arrivee);
    limite.setDate(limite.getDate() - 1);
    limite.setHours(18, 0, 0, 0);
    if (new Date() <= limite) return null;
    return 'Passé 18 h la veille, nous ne pouvons plus garantir la préparation '
         + 'des attentions : certains produits sont achetés frais le matin même. '
         + 'La nuit reste réservable, écrivez-nous et on fait au mieux.';
  }

  /* Remplace la note de délai sans toucher au reste : la date vient
     de changer, et l'avertissement en dépend. */
  function rafraichirDelai() {
    const zone = $('.im-pc__delai', hote);
    if (!zone) return;
    const provisoire = document.createElement('div');
    provisoire.innerHTML = noteDelai();
    zone.replaceWith(provisoire.firstElementChild);
  }

  function noteDelai() {
    const alerte = delaiAttentions(etat.nuit.date);
    return alerte
      ? `<p class="im-pc__delai" data-alerte="true" role="status">${esc(alerte)}</p>`
      : '<p class="im-pc__delai">Attentions à commander jusqu’à 18 h la veille de votre arrivée.</p>';
  }

  const vierge = () => ({
    voie: null,          // 'reserve' | 'a-reserver'
    etape: 0,
    nuit: { date: '', arrival: ARRIVEE_MIN },
    client: { name: '', email: '', tel: '' },
    resa: { name: '', numero: '' },
    message: '',
    intense: 'range',  // 'range' | 'installe' | 'retire'
    code: '',
    items: []            // [{ id, qty }]
  });

  let etat = lire();

  function lire() {
    try {
      const brut = sessionStorage.getItem(CLE);
      if (!brut) return vierge();
      return Object.assign(vierge(), JSON.parse(brut));
    } catch (e) {
      return vierge();
    }
  }

  function ecrire() {
    try { sessionStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) { /* mode privé */ }
  }

  /* ----------------------------------------------------------
     Panier du parcours
     ---------------------------------------------------------- */

  const lignes = () => etat.items
    .map((l) => {
      const p = IM.byId(l.id);
      return p ? { p, qty: l.qty, total: p.price * l.qty } : null;
    })
    .filter(Boolean);

  /* Sur la voie « pas encore réservé », la nuit fait partie du total :
     le client règle la chambre et ses attentions en une seule fois. */
  const prixNuit = () => (etat.voie === 'a-reserver' && etat.nuit.price ? etat.nuit.price : 0);
  const totalExtras = () => lignes().reduce((s, l) => s + l.total, 0);
  const total = () => prixNuit() + totalExtras();
  const nbArticles = () => etat.items.reduce((n, l) => n + l.qty, 0);
  const contientAlcool = () => lignes().some((l) => l.p.alcohol || l.p.adult);

  function ajouter(id, qty) {
    if (!IM.byId(id)) return;
    const ligne = etat.items.find((l) => l.id === id);
    if (ligne) ligne.qty = Math.min(9, ligne.qty + qty);
    else etat.items.push({ id, qty: Math.min(9, Math.max(1, qty)) });
    ecrire();
  }

  function changerQte(id, delta) {
    const ligne = etat.items.find((l) => l.id === id);
    if (!ligne) return;
    ligne.qty += delta;
    if (ligne.qty < 1) etat.items = etat.items.filter((l) => l.id !== id);
    else ligne.qty = Math.min(9, ligne.qty);
    ecrire();
  }

  const retirer = (id) => { etat.items = etat.items.filter((l) => l.id !== id); ecrire(); };

  /* ----------------------------------------------------------
     Étapes selon la voie
     ---------------------------------------------------------- */

  const ETAPES = {
    'a-reserver': [
      { cle: 'nuit',    nom: 'Votre nuit' },
      { cle: 'client',  nom: 'Vos coordonnées' },
      { cle: 'options', nom: 'Vos attentions' },
      { cle: 'payer',   nom: 'Paiement' }
    ],
    'reserve': [
      { cle: 'resa',    nom: 'Votre réservation' },
      { cle: 'options', nom: 'Vos attentions' },
      { cle: 'payer',   nom: 'Paiement' }
    ]
  };

  const etapes = () => (etat.voie ? ETAPES[etat.voie] : []);
  const etapeCourante = () => etapes()[etat.etape];

  /* ----------------------------------------------------------
     Rendu
     ---------------------------------------------------------- */

  let hote = null;
  let dernierAjout = null;

  function rendre() {
    if (!hote) return;
    hote.innerHTML = etat.voie ? vueEtape() : vueChoix();
    if (etat.voie) placerLampe();
    brancher();
  }

  /* --- Le choix d'entrée --- */

  function vueChoix() {
    return `
      <div class="im-shell">
        <div class="im-head">
          <span class="im-eyebrow">Commencer</span>
          <h2>Votre nuit est-elle déjà réservée ?</h2>
          <p class="im-lead">
            Deux minutes suffisent dans les deux cas. On s’adapte à votre situation.
          </p>
        </div>
        <div class="im-pc__choix">
          <button class="im-pc__carte" type="button" data-voie="reserve">
            ${PERSO_RESERVE}
            <h3>Oui, elle est réservée</h3>
            <p>Donnez-nous le nom et la date de votre réservation, puis choisissez ce qui vous attendra dans la suite.</p>
            <span class="im-pc__fleche">Ajouter mes attentions ${FLECHE}</span>
          </button>
          <button class="im-pc__carte" type="button" data-voie="a-reserver">
            ${PERSO_A_RESERVER}
            <h3>Pas encore</h3>
            <p>Choisissez votre date, laissez vos coordonnées, et composez votre soirée dans la foulée.</p>
            <span class="im-pc__fleche">Réserver ma nuit ${FLECHE}</span>
          </button>
        </div>
      </div>`;
  }

  /* --- Le fil « tubelight » --- */

  function vueFil() {
    return `
      <nav class="im-pc__fil" data-fil aria-label="Étapes de la commande">
        <span class="im-pc__lampe" data-lampe aria-hidden="true"><i></i><i></i><i></i></span>
        ${etapes().map((e, i) => {
          const etat_ = i < etat.etape ? 'faite' : (i === etat.etape ? 'courante' : 'avenir');
          return `<button class="im-pc__etape" type="button" data-aller="${i}"
                    data-etat="${etat_}"${i === etat.etape ? ' aria-current="step"' : ''}>
                    <span class="im-pc__num">${String(i + 1).padStart(2, '0')}</span>
                    <span class="im-pc__nom">${esc(e.nom)}</span>
                  </button>`;
        }).join('')}
      </nav>`;
  }

  function placerLampe() {
    const fil = $('[data-fil]', hote);
    const lampe = $('[data-lampe]', hote);
    const actif = $('[data-etat="courante"]', hote);
    if (!fil || !lampe || !actif) return;
    const f = fil.getBoundingClientRect();
    const a = actif.getBoundingClientRect();
    lampe.style.width = `${a.width}px`;
    lampe.style.transform = `translateX(${a.left - f.left + fil.scrollLeft}px)`;
  }

  /* --- Panier latéral --- */

  /* Ce qui est compris dans la nuit, sans supplément. Le client paie
     149 € une chambre : s'il ne voit que « L'Essentiel 39 € » en face
     d'un total de 188 €, il ne sait pas ce qu'il achète. */
  const COMPRIS = [
    'Lit king size, literie haut de gamme',
    'Balnéo deux places, privatif',
    'Douche à l’italienne',
    'Peignoirs et linge préparés',
    'Entrée autonome, sans croiser personne'
  ];

  function ligneNuit() {
    if (etat.voie !== 'a-reserver' || !etat.nuit.date) return '';
    const d = new Date(etat.nuit.date + 'T12:00:00');
    const quand = Number.isNaN(d.getTime())
      ? etat.nuit.date
      : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    return `
      <li class="im-pc__lnuit">
        <span class="im-pc__lnom">Nuit du ${esc(quand)}</span>
        <span class="im-price">${etat.nuit.price ? euro(etat.nuit.price) : '—'}</span>
        <span class="im-pc__lnote">Arrivée à partir de 16 h, départ avant 11 h</span>
        <ul class="im-pc__compris">
          ${COMPRIS.map((c) => `<li>${esc(c)}</li>`).join('')}
        </ul>
      </li>`;
  }

  /* Le code de la roue. On ne peut pas le vérifier ici : il a été tiré
     dans le navigateur du visiteur, et rien ne prouve côté client qu'il
     vient bien de nous. On le transmet donc à l'hôte, qui tranche. Le
     reconnaître quand il est dans ce navigateur est un simple confort. */
  function cadeauLocal(code) {
    try {
      const passe = JSON.parse(localStorage.getItem('im_roue_v1') || 'null');
      return passe && passe.code === code ? passe : null;
    } catch (e) { return null; }
  }

  function champCode() {
    if (etat.code) {
      const su = cadeauLocal(etat.code);
      return `
        <div class="im-pc__code" data-pose="true">
          <p class="im-pc__codeok">
            <strong>Offert</strong>
            ${su ? esc(su.gain) : 'Cadeau signalé à l’hôte, qui vous le confirmera.'}
          </p>
          <button type="button" class="im-pc__retirer" data-code-retirer>Retirer</button>
        </div>`;
    }
    return `
      <div class="im-pc__code">
        <label for="pc-code">Code cadeau</label>
        <div class="im-pc__codeligne">
          <input id="pc-code" type="text" inputmode="latin" autocapitalize="characters"
                 placeholder="IM-XXXXX" data-code-champ>
          <button type="button" data-code-valider>Ajouter</button>
        </div>
      </div>`;
  }

  function vueCote() {
    const l = lignes();
    const n = nbArticles();
    const nuit = ligneNuit();

    if (!l.length && !nuit) {
      return `
        <aside class="im-pc__cote">
          <h3>Votre séjour <span>vide</span></h3>
          <p class="im-pc__vide">Rien encore. Choisissez une formule : elle viendra se poser ici.</p>
        </aside>`;
    }

    return `
      <aside class="im-pc__cote" aria-live="polite">
        <h3>Votre séjour <span>${n ? `${n} attention${n > 1 ? 's' : ''}` : 'la nuit'}</span></h3>
        <ul class="im-pc__lignes">
          ${nuit}
          ${l.map((x) => `
            <li data-neuf="${String(x.p.id === dernierAjout)}">
              <span class="im-pc__lnom">${esc(x.p.name)}</span>
              <span class="im-price">${euro(x.total)}</span>
              ${(x.p.includes || []).length ? `
                <ul class="im-pc__compris">
                  ${x.p.includes.map((i) => `<li>${esc(i)}</li>`).join('')}
                </ul>` : ''}
              <span class="im-pc__louts">
                <span class="im-qty im-qty--sm">
                  <button type="button" data-moins="${x.p.id}" aria-label="Retirer une unité de ${esc(x.p.name)}">−</button>
                  <output>${x.qty}</output>
                  <button type="button" data-plus="${x.p.id}" aria-label="Ajouter une unité de ${esc(x.p.name)}">+</button>
                </span>
                <button class="im-pc__retirer" type="button" data-retirer="${x.p.id}">Retirer</button>
              </span>
            </li>`).join('')}
        </ul>
        ${champCode()}
        <p class="im-pc__total"><span>Total</span><span class="im-price">${euro(total())}</span></p>
      </aside>`;
  }

  /* --- Panneaux --- */

  function vueEtape() {
    const e = etapeCourante();
    const corps = {
      nuit: panneauNuit,
      client: panneauClient,
      resa: panneauResa,
      options: panneauOptions,
      payer: panneauPayer
    }[e.cle]();

    return `<div class="im-shell">${vueFil()}${corps}</div>`;
  }

  function nav(labelSuivant, actionSuivant, desactive) {
    return `
      <div class="im-pc__nav">
        <button class="im-pc__retour" type="button" data-retour>Revenir en arrière</button>
        <button class="im-btn im-btn--primary" type="button" data-suivant="${actionSuivant}"${desactive ? ' disabled' : ''}>
          ${esc(labelSuivant)} <span aria-hidden="true">❤︎</span>
        </button>
      </div>`;
  }

  /* Étape « votre nuit » — le calendrier vient d'un autre module. */
  function panneauNuit() {
    return `
      <div class="im-pc__panneau">
        <h2>Quelle nuit voulez-vous ?</h2>
        <p class="im-pc__intro">
          Choisissez votre date. Une seule réservation par nuit : la suite entière
          vous appartient. Arrivée à partir de 16 h, départ le lendemain avant 11 h.
        </p>
        <div class="im-pc__calendrier" data-calendrier>
          <p class="im-pc__attente">Chargement du calendrier…</p>
        </div>
        ${noteDelai()}
        <p class="im-pc__erreur" data-erreur hidden></p>
        ${nav('Continuer', 'nuit')}
      </div>`;
  }

  /* La suite comporte un équipement intime. Le poser en question ici
     plutôt qu'en champ libre : le client répond d'un clic au lieu
     d'avoir à formuler une demande gênante, et l'hôte reçoit une
     consigne exploitable pour la préparation. Le défaut ne présume
     rien : tout reste rangé dans son coffret. */
  /* Deux choix seulement. « Retirer de la chambre » a existé ici et a
     été retiré : c'était une promesse qu'on ne savait pas tenir entre
     deux séjours. La croix est autoportante, sur socle, mais c'est un
     meuble lourd : tant que Lenny n'a pas confirmé qu'il peut la
     déplacer, on ne le promet pas. Ne proposer que ce qu'on sait
     tenir. */
  const INTENSE = [
    ['range', 'Rangés dans leur coffret, hors de vue'],
    ['installe', 'Sortis et installés dans la chambre']
  ];

  const INTENSE_LIB = Object.fromEntries(INTENSE);

  function choixIntense() {
    return `
      <div class="im-field">
        <label for="pc-intense">L’espace Intense</label>
        <select id="pc-intense" name="intense">
          ${INTENSE.map(([id, lib]) =>
            `<option value="${id}"${etat.intense === id ? ' selected' : ''}>${lib}</option>`).join('')}
        </select>
        <p class="im-field__help">
          La suite comporte un équipement intime : croix de Saint-André, menottes, fouet, cravache.
          <a href="index.html#faq-equipement" target="_blank" rel="noopener">Voir ce que c’est</a>.
        </p>
      </div>`;
  }

  function panneauClient() {
    return `
      <div class="im-pc__panneau">
        <h2>À quel nom ?</h2>
        <p class="im-pc__intro">Nous vous envoyons la confirmation et le code d’accès sur cette adresse.</p>
        <div class="im-form">
          <div class="im-form__row">
            <div class="im-field">
              <label for="pc-nom">Nom et prénom <span class="im-req" aria-hidden="true">*</span></label>
              <input id="pc-nom" name="name" type="text" autocomplete="name" value="${esc(etat.client.name)}">
            </div>
            <div class="im-field">
              <label for="pc-mail">E-mail <span class="im-req" aria-hidden="true">*</span></label>
              <input id="pc-mail" name="email" type="email" autocomplete="email" value="${esc(etat.client.email)}">
            </div>
          </div>
          <div class="im-field">
            <label for="pc-tel">Téléphone</label>
            <input id="pc-tel" name="tel" type="tel" autocomplete="tel" value="${esc(etat.client.tel)}">
            <p class="im-field__help">Facultatif. Uniquement en cas d’imprévu le jour même.</p>
          </div>
        </div>
        <p class="im-pc__erreur" data-erreur hidden></p>
        ${nav('Continuer', 'client')}
      </div>`;
  }

  function panneauResa() {
    return `
      <div class="im-pc__panneau">
        <h2>Retrouvons votre réservation.</h2>
        <p class="im-pc__intro">Le nom sous lequel la nuit est réservée et la date suffisent.</p>
        <div class="im-form">
          <div class="im-form__row">
            <div class="im-field">
              <label for="pc-rnom">Nom de réservation <span class="im-req" aria-hidden="true">*</span></label>
              <input id="pc-rnom" name="name" type="text" autocomplete="name" value="${esc(etat.resa.name)}">
            </div>
            <div class="im-field">
              <label for="pc-rnum">N° de réservation</label>
              <input id="pc-rnum" name="numero" type="text" placeholder="Facultatif, Airbnb, Booking…" value="${esc(etat.resa.numero)}">
            </div>
          </div>
          <div class="im-form__row">
            <div class="im-field">
              <label for="pc-rdate">Date du séjour <span class="im-req" aria-hidden="true">*</span></label>
              <input id="pc-rdate" name="date" type="date" value="${esc(etat.nuit.date)}">
            </div>
          </div>
        </div>
        ${noteDelai()}
        <p class="im-pc__erreur" data-erreur hidden></p>
        ${nav('Choisir mes attentions', 'resa')}
      </div>`;
  }

  function panneauOptions() {
    const cats = IM.categories.filter((c) => IM.byCat(c.id).length);
    return `
      <div class="im-pc__panneau">
        <h2>Une belle nuit. Ou une nuit dont vous parlerez encore dans dix ans.</h2>
        <p class="im-pc__intro">
          Tout est installé avant votre arrivée : vous ne portez rien, vous ne
          cachez rien, vous n’organisez rien.
        </p>
        <div class="im-pc__deux">
          <div class="im-pc__principal">
            ${formules('packs')}
            ${formules('occasions')}

            <details class="im-pc__carte">
              <summary>Ou composez vous-même</summary>
              <div class="im-pc__selects">
                <div class="im-field">
                  <label for="pc-cat">Catégorie</label>
                  <select id="pc-cat" data-cat>
                    ${cats.filter((c) => !GROUPES.includes(c.id))
                      .map((c) => `<option value="${c.id}">${esc(c.name)} · ${IM.byCat(c.id).length}</option>`).join('')}
                  </select>
                </div>
                <div class="im-field">
                  <label id="pc-prod-label">Attention</label>
                  <div class="im-pc__chips" data-prod-chips role="listbox" aria-labelledby="pc-prod-label"></div>
                </div>
              </div>
              <div data-apercu></div>
            </details>
            ${nav('Passer au paiement', 'options', !etat.items.length)}
          </div>
          ${vueCote()}
        </div>
      </div>`;
  }

  function panneauPayer() {
    const l = lignes();
    const nom = etat.voie === 'reserve' ? etat.resa.name : etat.client.name;
    const dateFr = etat.nuit.date
      ? new Date(etat.nuit.date + 'T12:00:00').toLocaleDateString('fr-FR',
          { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    const nuitAPayer = etat.voie === 'a-reserver';

    return `
      <div class="im-pc__panneau">
        <h2>Tout est prêt.</h2>
        <p class="im-pc__intro">Vérifiez, puis réglez en ligne. Vos attentions seront installées avant votre arrivée.</p>
        <div class="im-pc__deux">
          <div class="im-pc__principal">
            <dl class="im-pc__recap">
              <div><dt>${nuitAPayer ? 'Au nom de' : 'Nom de réservation'}</dt><dd>${esc(nom || '—')}</dd></div>
              <div><dt>Date du séjour</dt><dd>${esc(dateFr)}</dd></div>
              <div><dt>Horaires</dt><dd>Arrivée à partir de 16 h, départ avant 11 h</dd></div>
              ${nuitAPayer && etat.nuit.price
                ? `<div><dt>La nuit</dt><dd class="im-price">${euro(etat.nuit.price)}</dd></div>` : ''}
              ${etat.voie === 'reserve' && etat.resa.numero
                ? `<div><dt>N° de réservation</dt><dd>${esc(etat.resa.numero)}</dd></div>` : ''}
              ${etat.voie === 'a-reserver'
                ? `<div><dt>E-mail</dt><dd>${esc(etat.client.email || '—')}</dd></div>` : ''}
              ${l.map((x) => `<div><dt>${esc(x.p.name)}${x.qty > 1 ? ` × ${x.qty}` : ''}</dt><dd class="im-price">${euro(x.total)}</dd></div>`).join('')}
            </dl>

            ${choixIntense()}

            <div class="im-field">
              <label for="pc-msg">Message personnalisé</label>
              <textarea id="pc-msg" name="message" placeholder="Une occasion à marquer, un prénom à écrire, une mise en scène à prévoir…">${esc(etat.message)}</textarea>
              <p class="im-field__help">Facultatif. C’est ici que se préparent les surprises.</p>
            </div>

            ${contientAlcool() ? `
              <label class="im-pc__majeur im-note">
                <input type="checkbox" data-majeur>
                <span>Je certifie avoir 18 ans ou plus. Votre commande contient de l’alcool ou un article réservé aux adultes.</span>
              </label>` : ''}

            <p class="im-pc__erreur" data-erreur hidden></p>
            ${nav(`Payer ${euro(total())}`, 'payer', !l.length && !nuitAPayer)}
          </div>
          ${vueCote()}
        </div>
      </div>`;
  }

  /* ----------------------------------------------------------
     Aperçu d'un article
     ---------------------------------------------------------- */

  let qteCourante = 1;
  let idProduitCourant = null;

  /* Les formules se montrent, elles ne se cherchent pas dans un menu.
     Trois niveaux côte à côte, le prix, ce que ça contient, et ce que
     les mêmes articles coûteraient séparément : le client compare en
     un coup d'œil au lieu de dérouler une liste. */
  const GROUPES = ['packs', 'occasions'];

  const TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  function formules(catId) {
    const cat = IM.category(catId);
    const liste = IM.byCat(catId);
    if (!cat || !liste.length) return '';

    return `
      <section class="im-pc__formules" aria-label="${esc(cat.name)}">
        <h3 class="im-pc__groupe">${esc(cat.name)}</h3>
        <ul class="im-pc__offres">
          ${liste.map((p) => {
            const qty = (etat.items.find((l) => l.id === p.id) || {}).qty || 0;
            const eco = (typeof p.value === 'number' && p.value > p.price)
              ? `<s>${euro(p.value)}</s>` : '';
            return `
            <li class="im-pc__offre"${p.badge ? ' data-phare="true"' : ''}${qty ? ' data-prise="true"' : ''}>
              ${p.badge ? `<span class="im-pc__ruban">${esc(p.badge.label)}</span>` : ''}
              <button class="im-pc__ligne" type="button" data-fajouter="${p.id}"
                      aria-pressed="${qty ? 'true' : 'false'}">
                <span class="im-pc__coche" aria-hidden="true">${qty ? TICK : ''}</span>
                <span class="im-pc__otxt">
                  <span class="im-pc__onom">${esc(p.name)}</span>
                  <span class="im-pc__oshort">${esc(p.kicker)}</span>
                </span>
                <span class="im-pc__oprix">
                  <span class="im-price">${euro(p.price)}</span>${eco}
                </span>
              </button>
              ${qty ? `
                <div class="im-pc__detail">
                  <ul class="im-pc__incl">${p.includes.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
                  <div class="im-qty im-qty--sm">
                    <button type="button" data-fmoins="${p.id}" aria-label="Retirer ${esc(p.name)}">−</button>
                    <output aria-live="polite">${qty}</output>
                    <button type="button" data-fplus="${p.id}" aria-label="Ajouter ${esc(p.name)}">+</button>
                  </div>
                </div>` : ''}
            </li>`;
          }).join('')}
        </ul>
      </section>`;
  }

  function rendreApercu() {
    const cible = $('[data-apercu]', hote);
    if (!cible) return;
    const p = IM.byId(idProduitCourant);
    if (!p) { cible.innerHTML = ''; return; }
    qteCourante = 1;

    const visuel = p.img
      ? `<img class="im-img im-img--4x5" src="assets/img/${p.img}${typeof IM_IMG_V === 'string' ? `?v=${IM_IMG_V}` : ''}" alt="${esc(p.alt || p.name)}" loading="lazy" decoding="async">`
      : `<div class="im-ph im-ph--4x5" data-ph="${esc(p.ph)}" role="img" aria-label="${esc(p.ph)}"></div>`;

    cible.innerHTML = `
      <div class="im-pc__apercu">
        <div class="im-pc__shot">${visuel}</div>
        <div>
          <p class="im-pc__kicker">${esc(p.kicker)}</p>
          <h3 class="im-pc__nomprod">${esc(p.name)}</h3>
          <p class="im-pc__desc">${esc(p.desc)}</p>
          <ul class="im-pc__incl">${p.includes.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
          ${p.alcohol ? '<p class="im-field__help">Contient de l’alcool. Vente interdite aux mineurs de 18 ans.</p>' : ''}
          <div class="im-pc__acheter">
            <span class="im-price im-pc__prix">${euro(p.price)}</span>
            <div class="im-qty">
              <button type="button" data-qmoins aria-label="Retirer une unité">−</button>
              <output data-qte aria-live="polite">1</output>
              <button type="button" data-qplus aria-label="Ajouter une unité">+</button>
            </div>
            <button class="im-btn im-btn--primary" type="button" data-ajouter="${p.id}">
              Ajouter à mon séjour <span aria-hidden="true">❤︎</span>
            </button>
          </div>
        </div>
      </div>`;
  }

  function remplirProduits(catId) {
    const chips = $('[data-prod-chips]', hote);
    if (!chips) return;
    const liste = IM.byCat(catId);
    idProduitCourant = liste[0] ? liste[0].id : null;
    chips.innerHTML = liste.map((p, i) => `
      <button type="button" class="im-pc__chip" data-prodchip="${p.id}"
              role="option" aria-selected="${i === 0 ? 'true' : 'false'}">
        <span class="im-pc__chipnom">${esc(p.name)}</span>
        <span class="im-pc__chipprix">${euro(p.price)}</span>
      </button>`).join('');
    rendreApercu();
  }

  /* Change juste la sélection et son aperçu, sans passer par rendre() :
     un rendu complet fermerait le <details> « Ou composez vous-même »
     que le client vient d'ouvrir. */
  function selectionnerProduit(id) {
    if (id === idProduitCourant) return;
    idProduitCourant = id;
    const chips = $('[data-prod-chips]', hote);
    if (chips) {
      $$('[data-prodchip]', chips).forEach((b) => {
        b.setAttribute('aria-selected', b.getAttribute('data-prodchip') === id ? 'true' : 'false');
      });
    }
    rendreApercu();
  }

  /* ----------------------------------------------------------
     Calendrier — prise pour le module externe
     ------------------------------------------------------------
     Contrat attendu :

        window.IMCalendrier.mount(element, {
          min: 'AAAA-MM-JJ',
          valeur: 'AAAA-MM-JJ' | '',
          onSelect(dateISO) { … }
        })

     Tant qu'il n'est pas là, on affiche un champ date natif : le
     parcours reste utilisable de bout en bout.
     ---------------------------------------------------------- */

  function monterCalendrier() {
    const zone = $('[data-calendrier]', hote);
    if (!zone) return;

    const aujourdhui = new Date();
    const min = [
      aujourdhui.getFullYear(),
      String(aujourdhui.getMonth() + 1).padStart(2, '0'),
      String(aujourdhui.getDate()).padStart(2, '0')
    ].join('-');

    if (window.IMCalendrier && typeof window.IMCalendrier.mount === 'function') {
      zone.innerHTML = '';
      zone.setAttribute('data-monte', 'true');
      window.IMCalendrier.mount(zone, {
        min,
        valeur: etat.nuit.date,
        onSelect(dateISO, prix) {
          etat.nuit.date = dateISO;
          /* Le prix de la nuit vient du serveur avec les disponibilités.
             Il sert à afficher le bon total ; c'est le serveur qui le
             recalculera au moment de débiter. */
          etat.nuit.price = (typeof prix === 'number') ? prix : null;
          ecrire();
          /* Pas de rendu complet ici : il remonterait le calendrier à
             chaque clic. Seule la note de délai dépend de la date, on
             la remplace sur place. */
          rafraichirDelai();
        }
      });
      return;
    }

    zone.innerHTML = `
      <div class="im-field">
        <label for="pc-date">Date de votre nuit <span class="im-req" aria-hidden="true">*</span></label>
        <input id="pc-date" type="date" min="${min}" value="${esc(etat.nuit.date)}" data-date-repli>
        <p class="im-field__help">Le calendrier des disponibilités arrive ; ce champ fait le lien en attendant.</p>
      </div>`;
  }

  /* ----------------------------------------------------------
     Validation et navigation
     ---------------------------------------------------------- */

  function erreur(message) {
    const zone = $('[data-erreur]', hote);
    if (!zone) return;
    zone.textContent = message || '';
    zone.hidden = !message;
  }

  function valider(cle) {
    if (cle === 'nuit') {
      const repli = $('[data-date-repli]', hote);
      if (repli) etat.nuit.date = repli.value;
      if (!etat.nuit.date) return 'Choisissez la date de votre nuit.';
    }

    if (cle === 'client') {
      etat.client.name = ($('[name="name"]', hote) || {}).value || '';
      etat.client.email = ($('[name="email"]', hote) || {}).value || '';
      etat.client.tel = ($('[name="tel"]', hote) || {}).value || '';
      if (!etat.client.name.trim()) return 'Indiquez votre nom.';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(etat.client.email)) return 'Indiquez un e-mail valide.';
    }

    if (cle === 'resa') {
      etat.resa.name = ($('[name="name"]', hote) || {}).value || '';
      etat.resa.numero = ($('[name="numero"]', hote) || {}).value || '';
      etat.nuit.date = ($('[name="date"]', hote) || {}).value || '';
      if (!etat.resa.name.trim()) return 'Indiquez le nom de la réservation.';
      if (!etat.nuit.date) return 'Indiquez la date de votre séjour.';
    }

    if (cle === 'options' && !etat.items.length) {
      return 'Choisissez au moins une attention.';
    }

    ecrire();
    return null;
  }

  /* Tout ce que l'hôte doit lire avant de préparer la chambre, en une
     seule chaîne : elle est déjà relayée jusqu'au mail et à l'écran de
     préparation, inutile d'ouvrir un champ de plus dans les API. */
  function messageHote() {
    return [
      etat.code ? `Code cadeau : ${etat.code}.` : '',
      etat.intense && etat.intense !== 'range'
        ? `Espace Intense : ${INTENSE_LIB[etat.intense].toLowerCase()}.` : '',
      etat.message
    ].filter(Boolean).join(' ');
  }

  async function payer() {
    const msg = $('[name="message"]', hote);
    if (msg) { etat.message = msg.value; }
    const choix = $('[name="intense"]', hote);
    if (choix) { etat.intense = choix.value; }
    ecrire();

    const majeur = $('[data-majeur]', hote);
    if (contientAlcool() && majeur && !majeur.checked) {
      return erreur('Confirmez votre majorité pour les produits contenant de l’alcool.');
    }

    const bouton = $('[data-suivant]', hote);
    if (bouton) { bouton.disabled = true; bouton.textContent = 'Ouverture du paiement…'; }
    erreur('');

    /* Deux produits, deux endpoints. Réserver la nuit passe par celui
       qui VERROUILLE les nuits avant d'ouvrir le paiement — sans quoi
       le client réglerait sa chambre sans qu'elle soit bloquée. */
    const reserveLaNuit = etat.voie === 'a-reserver';

    const lendemain = (d) => {
      const x = new Date(d + 'T00:00:00');
      x.setDate(x.getDate() + 1);
      return [x.getFullYear(), String(x.getMonth() + 1).padStart(2, '0'),
              String(x.getDate()).padStart(2, '0')].join('-');
    };

    const corps = reserveLaNuit
      ? {
          checkin: etat.nuit.date,
          checkout: lendemain(etat.nuit.date),
          guest: {
            name: etat.client.name,
            email: etat.client.email,
            phone: etat.client.tel,
            /* L'heure d'arrivée est la même pour tous : l'ajouter au
               message ne dirait rien à l'hôte. */
            message: messageHote()
          },
          items: etat.items,
          adult: true
        }
      : {
          stay: {
            name: etat.resa.name,
            date: etat.nuit.date,
            arrival: etat.nuit.arrival,
            resa: etat.resa.numero,
            message: messageHote()
          },
          items: etat.items,
          adult: true
        };

    try {
      const reponse = await fetch(
        reserveLaNuit ? '/api/create-stay-session' : '/api/create-checkout-session',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(corps)
        }
      );
      const data = await reponse.json();
      if (!reponse.ok || !data.url) throw new Error(data.error || 'Paiement indisponible.');

      if (reserveLaNuit) {
        try {
          sessionStorage.setItem('im_stay', JSON.stringify({
            ref: data.ref,
            checkin: corps.checkin,
            checkout: corps.checkout,
            nights: 1,
            total: total(),
            needsConfirmation: Boolean(data.needsConfirmation)
          }));
        } catch (e2) { /* rien de bloquant */ }
      }

      location.href = data.url;
    } catch (e) {
      erreur(`${e.message} Réessayez, ou écrivez-nous si cela persiste.`);
      if (bouton) { bouton.disabled = false; bouton.innerHTML = `Payer ${euro(total())} <span aria-hidden="true">❤︎</span>`; }
    }
  }

  /* ----------------------------------------------------------
     Écouteurs
     ---------------------------------------------------------- */

  /* Rebranché à chaque rendu : uniquement ce qui vit dans le panneau
     courant. Le gestionnaire de clics, lui, est posé une seule fois. */
  function brancher() {
    if (!etat.voie) return;

    const e = etapeCourante();
    if (e.cle === 'nuit') monterCalendrier();

    if (e.cle === 'options') {
      const cat = $('[data-cat]', hote);
      remplirProduits(cat.value);
      cat.addEventListener('change', () => remplirProduits(cat.value));
      $('[data-prod-chips]', hote).addEventListener('click', (ev) => {
        const chip = ev.target.closest('[data-prodchip]');
        if (chip) selectionnerProduit(chip.getAttribute('data-prodchip'));
      });
    }
  }

  /* Un seul écouteur pour toute la section, posé à l'amorçage.
     L'attacher dans brancher() en créait un par rendu : au troisième,
     un clic sur « Ajouter » mettait trois articles au panier. */
  function brancherUneFois() {
    hote.addEventListener('click', (ev) => {
      const voie = ev.target.closest('[data-voie]');
      if (voie) {
        etat.voie = voie.getAttribute('data-voie');
        etat.etape = 0;
        ecrire();
        rendre();
        hote.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      const aller = ev.target.closest('[data-aller]');
      const retour = ev.target.closest('[data-retour]');
      const suivant = ev.target.closest('[data-suivant]');
      const ajout = ev.target.closest('[data-ajouter]');
      const qplus = ev.target.closest('[data-qplus]');
      const qmoins = ev.target.closest('[data-qmoins]');
      const plus = ev.target.closest('[data-plus]');
      const moins = ev.target.closest('[data-moins]');
      const oter = ev.target.closest('[data-retirer]');

      if (qplus || qmoins) {
        qteCourante = Math.min(9, Math.max(1, qteCourante + (qplus ? 1 : -1)));
        const out = $('[data-qte]', hote);
        if (out) out.textContent = qteCourante;
        return;
      }

      /* La ligne entière est le bouton : un clic choisit, un second
         revient en arrière. Le détail ne s'ouvre que sur l'offre
         retenue — sinon la page fait neuf écrans de haut. */
      const fajout = ev.target.closest('[data-fajouter]');
      if (fajout) {
        const id = fajout.getAttribute('data-fajouter');
        if (etat.items.some((l) => l.id === id)) {
          retirer(id);
          rendre();
          return;
        }
        ajouter(id, 1);
        dernierAjout = id;
        rendre();
        dernierAjout = null;
        return;
      }

      /* Code cadeau : posé ou retiré, sans quitter la page. */
      if (ev.target.closest('[data-code-valider]')) {
        const champ = $('[data-code-champ]', hote);
        const saisi = (champ && champ.value || '').trim().toUpperCase();
        if (saisi) { etat.code = saisi; ecrire(); rendre(); }
        return;
      }
      if (ev.target.closest('[data-code-retirer]')) {
        etat.code = '';
        ecrire();
        rendre();
        return;
      }

      const fplus = ev.target.closest('[data-fplus]');
      const fmoins = ev.target.closest('[data-fmoins]');
      if (fplus || fmoins) {
        changerQte((fplus || fmoins).getAttribute(fplus ? 'data-fplus' : 'data-fmoins'), fplus ? 1 : -1);
        rendre();
        return;
      }

      if (ajout) {
        const id = ajout.getAttribute('data-ajouter');
        ajouter(id, qteCourante);
        dernierAjout = id;
        rendre();
        dernierAjout = null;
        return;
      }

      if (plus || moins) { changerQte((plus || moins).getAttribute(plus ? 'data-plus' : 'data-moins'), plus ? 1 : -1); rendre(); return; }
      if (oter) { retirer(oter.getAttribute('data-retirer')); rendre(); return; }

      if (aller) {
        const cible = Number(aller.getAttribute('data-aller'));
        if (cible < etat.etape) { etat.etape = cible; ecrire(); rendre(); }
        return;
      }

      if (retour) {
        if (etat.etape === 0) { etat.voie = null; }
        else etat.etape -= 1;
        ecrire();
        rendre();
        return;
      }

      if (suivant) {
        const cle = suivant.getAttribute('data-suivant');
        if (cle === 'payer') { payer(); return; }
        const souci = valider(cle);
        if (souci) return erreur(souci);
        erreur('');
        etat.etape = Math.min(etapes().length - 1, etat.etape + 1);
        ecrire();
        rendre();
        hote.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  /* ----------------------------------------------------------
     Amorçage
     ---------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', () => {
    hote = $('[data-parcours]');
    if (!hote || typeof IM === 'undefined') return;
    brancherUneFois();
    rendre();

    /* La section est vide dans le HTML : le navigateur qui suit
       « #parcours » saute donc vers un bloc de hauteur nulle et ne
       bouge pas. On rejoint l'ancre une fois le contenu posé. */
    if (location.hash === '#parcours') {
      requestAnimationFrame(() => hote.scrollIntoView({ block: 'start' }));
    }

    /* Les deux entrées du hero ouvrent directement leur voie. La
       question « votre nuit est-elle déjà réservée ? » existait bien,
       mais deux mille pixels plus bas : un visiteur qui n'avait rien
       réservé lisait « Votre nuit est réservée » en haut de page et
       se croyait au mauvais endroit. */
    document.addEventListener('click', (ev) => {
      const entree = ev.target.closest('[data-voie-directe]');
      if (!entree) return;
      ev.preventDefault();
      etat.voie = entree.getAttribute('data-voie-directe');
      etat.etape = 0;
      ecrire();
      rendre();
      hote.scrollIntoView({ block: 'start' });
    });

    window.addEventListener('resize', placerLampe, { passive: true });
  });

  /* Le module calendrier peut arriver après nous : il le signale. */
  window.addEventListener('im:calendrier-pret', () => {
    if (hote && etat.voie && etapeCourante() && etapeCourante().cle === 'nuit') monterCalendrier();
  });
})();
