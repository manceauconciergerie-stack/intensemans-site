/* ============================================================
   INTENSÉ'MANS — Calendrier des nuits
   ------------------------------------------------------------
   Composant autonome, monté par le parcours :

     IMCalendrier.mount(zone, { min, valeur, onSelect })

   Une nuit, pas un séjour : on arrive à partir de 16 h et
   on repart le lendemain avant 11 h. Le visiteur choisit donc UNE
   date, et le calendrier lui rappelle ces horaires au moment du
   choix — c'est là qu'ils comptent.

   Le calendrier n'affiche que ce que le serveur lui dit. Les nuits
   déjà prises — chez nous comme sur Airbnb — arrivent déjà fusionnées
   par /api/availability. Quand cette réponse manque, on le dit au
   lieu de laisser croire que tout est libre.
   ============================================================ */

window.IMCalendrier = (() => {
  'use strict';

  const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const NOMS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const MOIS_AFFICHES = 12;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const euro = (n) => new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2
  }).format(n);

  const iso = (d) => [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');

  const auMatin = (d) => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; };
  const plusJours = (d, n) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };
  const depuisIso = (s) => {
    const [a, m, j] = String(s || '').split('-').map(Number);
    return (a && m && j) ? new Date(a, m - 1, j) : null;
  };
  const longue = (d) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  /* Une seule requête par page, quel que soit le nombre de montages :
     le parcours remonte le calendrier à chaque retour sur l'étape. */
  let promesse = null;

  function disponibilites(from, to) {
    if (!promesse) {
      promesse = fetch(`/api/availability?from=${from}&to=${to}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .catch(() => ({ status: 'unknown' }));
    }
    return promesse;
  }

  function mount(zone, options = {}) {
    const onSelect = typeof options.onSelect === 'function' ? options.onSelect : () => {};
    const plancher = depuisIso(options.min) || auMatin(new Date());
    const debut = auMatin(plancher);
    const limite = plusJours(debut, MOIS_AFFICHES * 30);

    const etat = {
      choisie: depuisIso(options.valeur),
      mois: new Date(debut.getFullYear(), debut.getMonth(), 1),
      jours: null,           // { 'AAAA-MM-JJ': { free, price } }
      statut: 'chargement',  // chargement | ok | inconnu
      airbnb: false
    };

    /* Sans réponse de l'API, on retombe sur la grille générée depuis
       le fichier serveur : le visiteur voit des prix au lieu d'un
       calendrier muet. La disponibilité, elle, reste inconnue : on ne
       l'invente pas, et le bandeau le dit. */
    const infos = (d) => {
      if (etat.jours) return etat.jours[iso(d)];
      if (typeof IM_TARIFS === 'undefined') return null;
      const prix = IM_TARIFS.prixNuit(iso(d));
      return prix === null ? null : { free: true, price: prix, indicatif: true };
    };

    function libre(jour) {
      if (jour < debut || jour > limite) return false;
      const j = infos(jour);
      /* Sans données réelles, on laisse choisir : le parcours doit
         rester utilisable, et le bandeau prévient que rien n'est
         confirmé. */
      if (!j) return etat.statut !== 'ok';
      return j.free === true;
    }

    /* Le meilleur prix du mois affiché. Le repérer sert à quelque
       chose de concret : quelqu'un dont les dates sont souples déplace
       sa nuit d'un jour et paie 50 € de moins. Calculé sur les seules
       nuits encore libres, sinon on met en avant une nuit invendable. */
    function meilleurPrixDuMois(base) {
      const annee = base.getFullYear();
      const mois = base.getMonth();
      const nbJours = new Date(annee, mois + 1, 0).getDate();
      let mini = null;
      for (let n = 1; n <= nbJours; n++) {
        const jour = new Date(annee, mois, n);
        if (!libre(jour)) continue;
        const info = infos(jour);
        if (!info || typeof info.price !== 'number') continue;
        if (mini === null || info.price < mini) mini = info.price;
      }
      return mini;
    }

    function grille(base) {
      const annee = base.getFullYear();
      const mois = base.getMonth();
      const mini = meilleurPrixDuMois(base);
      /* Semaine commençant le lundi : getDay() renvoie 0 pour dimanche. */
      const decalage = (new Date(annee, mois, 1).getDay() + 6) % 7;
      const nbJours = new Date(annee, mois + 1, 0).getDate();

      const cases = [];
      for (let i = 0; i < decalage; i++) cases.push('<td></td>');

      for (let n = 1; n <= nbJours; n++) {
        const jour = new Date(annee, mois, n);
        const cle = iso(jour);
        const dispo = libre(jour);
        const info = infos(jour);
        const active = etat.choisie && cle === iso(etat.choisie);

        const prix = (dispo && info && info.price)
          ? `<span class="im-cal__prix">${esc(euro(info.price))}</span>` : '';
        const auMeilleurPrix = dispo && info && mini !== null && info.price === mini;

        const dit = dispo
          ? (info && info.price
              ? `, ${esc(euro(info.price))}${auMeilleurPrix ? ', meilleur prix du mois' : ''}`
              : '')
          : ', indisponible';

        cases.push(`<td><button type="button" class="im-cal__jour"
          ${active ? 'data-bord="debut"' : ''}${dispo ? '' : ' data-pris="true"'}${auMeilleurPrix ? ' data-mini="true"' : ''}
          data-jour="${cle}"${dispo ? '' : ' disabled'}
          aria-label="${esc(longue(jour))}${dit}"
          ${active ? 'aria-pressed="true"' : ''}><span>${n}</span>${prix}</button></td>`);
      }

      const lignes = [];
      for (let i = 0; i < cases.length; i += 7) {
        lignes.push(`<tr>${cases.slice(i, i + 7).join('')}</tr>`);
      }

      return `
        <div class="im-cal__mois">
          <p class="im-cal__titre">${esc(base.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))}</p>
          <table class="im-cal__grille">
            <thead><tr>${JOURS.map((j, i) => `<th><abbr title="${NOMS[i]}">${j}</abbr></th>`).join('')}</tr></thead>
            <tbody>${lignes.join('')}</tbody>
          </table>
        </div>`;
    }

    function legende() {
      return `<p class="im-cal__legende">
        <span class="im-cal__pastille" aria-hidden="true"></span>
        En vert, la nuit la moins chère du mois.
      </p>`;
    }

    function bandeau() {
      if (etat.statut === 'chargement') {
        return '<p class="im-cal__note" role="status">Chargement des disponibilités…</p>';
      }
      if (etat.statut === 'ok' && etat.airbnb) return '';
      if (etat.statut !== 'ok') {
        return `<p class="im-cal__note" role="status">
          Prix indicatifs. Vos dates et le montant exact vous sont confirmés
          juste après votre réservation.
        </p>`;
      }
      return `<p class="im-cal__note" role="status">
        Vos dates vous sont confirmées par e-mail juste après votre réservation.
      </p>`;
    }

    function choix() {
      if (!etat.choisie) {
        return '<p class="im-cal__aide">Choisissez la nuit qui vous convient.</p>';
      }
      const info = infos(etat.choisie);
      const lendemain = plusJours(etat.choisie, 1);
      return `
        <div class="im-cal__choix">
          <div>
            <p class="im-cal__dates">Nuit du ${esc(longue(etat.choisie))}</p>
            <p class="im-cal__nuits">
              Arrivée à partir de 16 h · départ le ${esc(longue(lendemain))} avant 11 h${
                info && info.price ? ` · <span class="im-price">${esc(euro(info.price))}</span>` : ''}
            </p>
          </div>
        </div>`;
    }

    function rendre() {
      const suivant = new Date(etat.mois.getFullYear(), etat.mois.getMonth() + 1, 1);
      const peutReculer = etat.mois > new Date(debut.getFullYear(), debut.getMonth(), 1);

      zone.innerHTML = `
        <div class="im-cal">
          ${bandeau()}
          <div class="im-cal__mois-lot">
            <button type="button" class="im-cal__fleche im-cal__fleche--prec" data-mois="-1"
              ${peutReculer ? '' : 'disabled'} aria-label="Mois précédent">‹</button>
            <button type="button" class="im-cal__fleche im-cal__fleche--suiv" data-mois="1"
              aria-label="Mois suivant">›</button>
            ${grille(etat.mois)}
            ${grille(suivant)}
          </div>
          ${legende()}
          ${choix()}
        </div>`;
    }

    zone.addEventListener('click', (e) => {
      const jour = e.target.closest('[data-jour]');
      if (jour) {
        e.preventDefault();
        etat.choisie = depuisIso(jour.getAttribute('data-jour'));
        rendre();
        const info = infos(etat.choisie);
        onSelect(iso(etat.choisie), info ? info.price : null);
        return;
      }
      const fleche = e.target.closest('[data-mois]');
      if (fleche) {
        e.preventDefault();
        etat.mois = new Date(etat.mois.getFullYear(), etat.mois.getMonth() + Number(fleche.getAttribute('data-mois')), 1);
        rendre();
      }
    });

    rendre();

    disponibilites(iso(debut), iso(limite)).then((data) => {
      if (data && data.status === 'ok' && data.days) {
        etat.jours = data.days;
        etat.airbnb = Boolean(data.airbnb);
        etat.statut = 'ok';
      } else {
        etat.statut = 'inconnu';
      }
      rendre();
    });

    return {
      valeur: () => (etat.choisie ? iso(etat.choisie) : ''),
      prix: () => {
        const info = etat.choisie && infos(etat.choisie);
        return info ? info.price : null;
      }
    };
  }

  return { mount };
})();
