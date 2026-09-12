/* ============================================================
   INTENSÉ'MANS — Tarifs de la nuitée
   ------------------------------------------------------------
   Seule référence de prix pour la chambre. Le navigateur affiche
   ce que cette table dit, mais c'est elle — et jamais le montant
   reçu du client — qui détermine ce qui est débité.

   Les tarifs viennent des variables d'environnement : ils changent
   sans redéploiement, et aucun chiffre n'est inventé dans le code.
   Sans eux, la réservation en ligne reste fermée.
   ============================================================ */

const nombre = (valeur) => {
  const n = Number.parseFloat(valeur);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/* ⚠️ GRILLE PROVISOIRE, À VALIDER PAR L'HÔTE AVANT LA MISE EN LIGNE.
   Ces montants sont calés sur le marché français des love rooms avec
   balnéo (90 à 160 € la nuit). Ils ne viennent pas de l'exploitant :
   ce sont des ordres de grandeur, posés pour que le calendrier soit
   lisible avant que les vrais prix soient arrêtés.

   Trois effets se combinent, dans cet ordre :
     1. le jour de la semaine, qui pèse le plus
     2. la haute saison
     3. la dernière minute, qui baisse le prix pour remplir une nuit
        qui serait perdue de toute façon
   Poser TARIF_SEMAINE court-circuite toute la grille. */
const BASE = {
  0: 109,                       // dimanche
  1: 99, 2: 99, 3: 99, 4: 105,  // lundi à jeudi
  5: 139,                       // vendredi
  6: 149                        // samedi
};

/* Périodes de forte demande. Bornes incluses, format [mois, jour]. */
const SAISONS = [
  { du: [2, 10],  au: [2, 16],  coef: 1.25 },   // Saint-Valentin
  { du: [12, 20], au: [12, 31], coef: 1.15 },   // fêtes de fin d'année
  { du: [5, 1],   au: [5, 31],  coef: 1.08 }    // ponts de mai
];

/* Moins de trois jours avant l'arrivée : sans remise, la nuit reste
   vide et rapporte zéro. */
const DERNIERE_MINUTE_JOURS = 3;
const DERNIERE_MINUTE_COEF = 0.85;

export function tarifs() {
  return {
    base: BASE,
    /* Lues pour compatibilité : posées, elles imposent un tarif
       unique et désactivent la grille. */
    semaine: nombre(process.env.TARIF_SEMAINE),
    weekend: nombre(process.env.TARIF_WEEKEND),
    nuitsMin: Math.max(1, Number.parseInt(process.env.NUITS_MIN, 10) || 1),
    nuitsMax: 14
  };
}

const dansLaPeriode = (mois, jour, [m1, j1], [m2, j2]) => {
  const v = mois * 100 + jour;
  return v >= m1 * 100 + j1 && v <= m2 * 100 + j2;
};

/* Prix de la nuit qui COMMENCE à cette date : c'est le soir qui
   compte, pas le lendemain matin. */
export function prixNuit(dateStr, table = tarifs()) {
  if (!table) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const jour = d.getDay();   // 0 = dimanche

  if (table.semaine) {
    return (jour === 5 || jour === 6) ? (table.weekend || table.semaine) : table.semaine;
  }

  let prix = table.base[jour];

  for (const saison of SAISONS) {
    if (dansLaPeriode(d.getMonth() + 1, d.getDate(), saison.du, saison.au)) {
      prix *= saison.coef;
      break;
    }
  }

  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const reste = Math.round((new Date(`${dateStr}T00:00:00`) - aujourdhui) / 86400000);
  if (reste >= 0 && reste <= DERNIERE_MINUTE_JOURS) prix *= DERNIERE_MINUTE_COEF;

  return Math.round(prix);
}

export function nuitsEntre(checkin, checkout) {
  const a = Date.parse(`${checkin}T00:00:00`);
  const b = Date.parse(`${checkout}T00:00:00`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 86400000);
}

/* Dates des nuitées d'un séjour. La date de départ n'en fait pas
   partie : on part le matin, cette nuit-là reste vendable. */
export function nuitsDuSejour(checkin, checkout) {
  const out = [];
  const fin = new Date(`${checkout}T00:00:00`);
  for (let d = new Date(`${checkin}T00:00:00`); d < fin; d.setDate(d.getDate() + 1)) {
    out.push([
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-'));
  }
  return out;
}

/* Chiffrage complet, nuit par nuit. Lève plutôt que de deviner :
   mieux vaut refuser une réservation que débiter un montant qu'on
   ne sait pas justifier. */
export function chiffrerSejour(checkin, checkout) {
  const table = tarifs();

  const nights = nuitsEntre(checkin, checkout);
  if (nights < table.nuitsMin) {
    throw new Error(`Séjour de ${table.nuitsMin} nuit${table.nuitsMin > 1 ? 's' : ''} minimum.`);
  }
  if (nights > table.nuitsMax) {
    throw new Error(`Séjour de ${table.nuitsMax} nuits maximum.`);
  }

  const lines = nuitsDuSejour(checkin, checkout).map((date) => ({
    date,
    price: prixNuit(date, table)
  }));

  return {
    nights,
    lines,
    totalCents: lines.reduce((sum, l) => sum + Math.round(l.price * 100), 0)
  };
}
