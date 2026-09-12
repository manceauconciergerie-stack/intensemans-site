/* ============================================================
   INTENSÉ'MANS — Grille tarifaire, copie navigateur

   ⚠️ FICHIER GÉNÉRÉ. Ne pas modifier à la main.
      Source : site/api/_lib/rates.js
      Régénérer : node tools/build_rates.mjs

   Sert uniquement à afficher des prix quand /api/availability ne
   répond pas (aperçu local sans backend). Dès que l'API répond, ce
   sont ses prix qui s'affichent, et c'est le serveur qui débite.
   ============================================================ */

const IM_TARIFS = (() => {
  const BASE = {
  0: 109,                       // dimanche
  1: 99, 2: 99, 3: 99, 4: 105,  // lundi à jeudi
  5: 139,                       // vendredi
  6: 149                        // samedi
};

  const SAISONS = [
  { du: [2, 10],  au: [2, 16],  coef: 1.25 },   // Saint-Valentin
  { du: [12, 20], au: [12, 31], coef: 1.15 },   // fêtes de fin d'année
  { du: [5, 1],   au: [5, 31],  coef: 1.08 }    // ponts de mai
];

  const DERNIERE_MINUTE_JOURS = 3;
  const DERNIERE_MINUTE_COEF = 0.85;

  const dansLaPeriode = (mois, jour, [m1, j1], [m2, j2]) => {
    const v = mois * 100 + jour;
    return v >= m1 * 100 + j1 && v <= m2 * 100 + j2;
  };

  function prixNuit(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return null;

    let prix = BASE[d.getDay()];

    for (const saison of SAISONS) {
      if (dansLaPeriode(d.getMonth() + 1, d.getDate(), saison.du, saison.au)) {
        prix *= saison.coef;
        break;
      }
    }

    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const reste = Math.round((new Date(dateStr + 'T00:00:00') - aujourdhui) / 86400000);
    if (reste >= 0 && reste <= DERNIERE_MINUTE_JOURS) prix *= DERNIERE_MINUTE_COEF;

    return Math.round(prix);
  }

  return { prixNuit };
})();
