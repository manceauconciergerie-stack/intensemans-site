/* ============================================================
   INTENSÉ'MANS — Codes promo d'apporteurs
   ------------------------------------------------------------
   Un code = une personne qui nous envoie des clients. Le client
   gagne la remise, l'hôte apprend qui l'a envoyé (mail, tableau,
   métadonnées Stripe).

   Règles, validées le 03/10/2026 :
   - réservation d'une nuit sur le site uniquement (nuit + attentions
     payées ensemble), pas les attentions seules d'un client Airbnb ;
   - se cumule avec la remise de dernière minute : la remise porte
     sur ce que le client paierait de toute façon ;
   - jamais sur les nuits de la Saint-Valentin, « aucune promotion »
     dans la grille (grille.js) ; les attentions restent remisées.

   Ajouter un apporteur : une ligne ci-dessous. La saisie du client
   est mise en majuscules, espaces retirés : « Vanessa10 » marche.
   ============================================================ */

export const CODES_PROMO = {
  VANESSA10: { apporteur: 'Vanessa', remise: 0.10 }
};

export const normaliser = (code) => String(code == null ? '' : code).replace(/\s+/g, '').toUpperCase();

export function trouverPromo(code) {
  const cle = normaliser(code);
  const promo = CODES_PROMO[cle];
  return promo ? { code: cle, ...promo } : null;
}

/* Remise en centimes sur un montant en centimes. Arrondie ligne par
   ligne, côté serveur comme dans le navigateur : le total affiché et
   le total débité tombent au même centime. */
export const remiseCents = (cents, remise) => Math.round(cents * remise);
