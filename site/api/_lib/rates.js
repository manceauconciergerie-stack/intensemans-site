/* ============================================================
   INTENSÉ'MANS — Tarifs de la nuitée
   ------------------------------------------------------------
   Seule référence de prix pour la chambre. Le navigateur affiche
   ce que cette table dit, mais c'est elle — et jamais le montant
   reçu du client — qui détermine ce qui est débité.

   Les montants sont dans grille.js, validés par l'hôte. Un tarif
   unique peut encore être imposé par TARIF_SEMAINE / TARIF_WEEKEND
   (variables d'environnement), qui désactivent alors la grille.
   ============================================================ */

import { BASE, prixGrille } from './grille.js';

const nombre = (valeur) => {
  const n = Number.parseFloat(valeur);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/* La grille elle-même (jours, événements, Saint-Valentin, remise
   de dernière minute) vit dans grille.js, recopiée telle quelle dans
   le navigateur. Ici : ce qui dépend de l'environnement.
   Poser TARIF_SEMAINE court-circuite toute la grille. */
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

/* Prix de la nuit qui COMMENCE à cette date : c'est le soir qui
   compte, pas le lendemain matin. `arrivee` (jour d'arrivée du
   séjour) décide de la remise de dernière minute. */
export function prixNuit(dateStr, table = tarifs(), { arrivee = dateStr, maintenant = Date.now() } = {}) {
  if (!table) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) return null;

  if (table.semaine) {
    const jour = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
    return (jour === 5 || jour === 6) ? (table.weekend || table.semaine) : table.semaine;
  }

  return prixGrille(dateStr, { arrivee, maintenant });
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
    price: prixNuit(date, table, { arrivee: checkin })
  }));

  return {
    nights,
    lines,
    totalCents: lines.reduce((sum, l) => sum + Math.round(l.price * 100), 0)
  };
}
