/* ============================================================
   INTENSÉ'MANS — Lots de la roue (source qui fait foi)
   ------------------------------------------------------------
   Le tirage se fait ICI, côté serveur. Il se faisait dans le
   navigateur, qui annonçait ensuite son lot : impossible de tenir un
   plafond, et n'importe qui pouvait s'attribuer la planche. En
   novembre 2026, deux planches sont sorties d'affilée.

   `poids` : fréquence de sortie, sur 100.
   `plafondMensuel` : nombre maximal de fois où ce lot peut sortir
   dans le mois (heure de Paris). Atteint, on tire parmi les autres.

   Copie d'affichage dans site/assets/js/roue.js (le disque est dessiné
   au prorata des poids). Les deux tables doivent rester identiques :
   tests/roue.test.mjs le vérifie.
   ============================================================ */

export const LOTS = [
  { court: 'Boule effervescente', gain: 'Une boule effervescente parfumée, à faire fondre dans le bain', poids: 38 },
  /* 15 → 5 le 25/11/2026, et une par mois au plus : elle coûte, et
     elle existe au catalogue à 34 €. */
  { court: 'Planche apéritive', gain: 'Une planche apéritive, dressée pour votre arrivée', poids: 5, plafondMensuel: 1 },
  { court: 'Mignardises', gain: 'Quelques mignardises, déposées dans la suite', poids: 7 },
  { court: 'Départ retardé', gain: 'Le départ retardé : 12 h au lieu de 11 h', poids: 50 }
];

/* Tirage pondéré parmi les lots encore disponibles. `alea` dans [0, 1[. */
export function tirer(disponibles, alea) {
  const total = disponibles.reduce((s, l) => s + l.poids, 0);
  let n = alea * total;
  for (const lot of disponibles) {
    n -= lot.poids;
    if (n < 0) return lot;
  }
  return disponibles[disponibles.length - 1];
}

/* « 2026-11 », à l'heure de Paris : le mois change à minuit en
   France, pas à minuit UTC. */
export function moisDeParis(ts = Date.now()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit'
  }).formatToParts(new Date(ts)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}`;
}
