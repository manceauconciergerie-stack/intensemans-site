/* ============================================================
   INTENSÉ'MANS — La fiche de réservation, posée sur le paiement Stripe
   ------------------------------------------------------------
   Le 3 octobre, aucun mail n'est arrivé : l'hôte n'avait que la page
   du paiement Stripe, presque vide. Elle doit suffire à elle seule
   pour préparer la chambre et appeler le client.

   Trois emplacements, tous remplis :
   - la DESCRIPTION, une ligne de résumé en tête du paiement ;
   - les MÉTADONNÉES, la fiche complète. Clés numérotées pour garder
     l'ordre de lecture, sans accent ni crochet (règles Stripe :
     40 caractères par clé, 500 par valeur, 50 clés au plus) ;
   - le CLIENT Stripe : nom, e-mail, téléphone, réutilisé s'il revient.

   Les métadonnées techniques de la SESSION (ref, checkin…) restent à
   part, inchangées : le webhook s'en sert pour reconstituer.
   ============================================================ */

import { stripe } from './stripe.js';

const euro = (n) => new Intl.NumberFormat('fr-FR', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2
}).format(n);

const jour = (iso, opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', { ...opts, timeZone: 'UTC' });

const SOFTS = 'Offerts avec la nuit : à mettre au réfrigérateur';

const libelleCadeau = (c) => (c ? (c.lot ? `${c.lot} (${c.code})` : `code ${c.code} à vérifier`) : null);

/* Garde l'ordre, retire les vides, coupe à 500 caractères. */
function propre(champs) {
  const out = {};
  for (const [cle, valeur] of champs) {
    if (valeur == null || valeur === '') continue;
    out[cle] = String(valeur).slice(0, 500);
  }
  return out;
}

export function ficheSejour({
  ref, checkin, checkout, chiffrage, guest, extras, promo, pleinCents, totalCents, cadeau, needsConfirmation
}) {
  const nuits = chiffrage.nights;
  const alcool = extras.some((l) => l.alcohol);
  const attentions = extras.length
    ? extras.map((l) => `${l.name}${l.qty > 1 ? ` ×${l.qty}` : ''} (${euro(l.payeCents * l.qty / 100)})`).join(', ')
    : 'aucune';

  const metadata = propre([
    ['01_Reference', ref],
    ['02_Statut', needsConfirmation
      ? 'A CONFIRMER : arrivée proche, vérifier Airbnb puis appeler le client'
      : 'Confirmée, nuits bloquées'],
    ['03_Arrivee', `${jour(checkin)}, à partir de 16 h`],
    ['04_Depart', `${jour(checkout)}, avant 11 h`],
    ['05_Nuits', `${nuits} nuit${nuits > 1 ? 's' : ''} : ${chiffrage.lines
      .map((l) => `${jour(l.date, { weekday: 'short', day: 'numeric', month: 'short' })} ${euro(l.price)}`).join(', ')}`],
    ['06_Client', guest.name],
    ['07_Telephone', guest.phone],
    ['08_Email', guest.email],
    ['09_Attentions', attentions],
    ['10_Cadeau_roue', libelleCadeau(cadeau)],
    ['11_Softs', SOFTS],
    ['12_Alcool', alcool ? 'OUI : vérifier la majorité à l’arrivée' : null],
    ['13_Code_promo', promo
      ? `${promo.code} · apporteur ${promo.apporteur} · −${euro((pleinCents - totalCents) / 100)}` : null],
    ['14_Message_client', guest.message],
    ['15_Total_paye', `${euro(totalCents / 100)}${pleinCents !== totalCents ? ` (plein tarif ${euro(pleinCents / 100)})` : ''}`]
  ]);

  const description = [
    `Nuit du ${jour(checkin)}${nuits > 1 ? ` (${nuits} nuits)` : ''}`,
    `${guest.name} · ${guest.phone}`,
    cadeau ? `Cadeau roue : ${libelleCadeau(cadeau)}` : null,
    extras.length ? `Attentions : ${extras.map((l) => `${l.name}${l.qty > 1 ? ` ×${l.qty}` : ''}`).join(', ')}` : null,
    promo ? `Code ${promo.code} (${promo.apporteur})` : null,
    needsConfirmation ? 'ARRIVÉE PROCHE : à confirmer' : null
  ].filter(Boolean).join(' · ').slice(0, 1000);

  return { description, metadata };
}

export function ficheCommande({ ref, stay, lignes, totalCents, cadeau }) {
  const alcool = lignes.some((l) => l.alcohol);
  const metadata = propre([
    ['01_Reference', ref],
    ['02_Type', 'Attentions pour un séjour réservé ailleurs (Airbnb, Booking…)'],
    ['03_Sejour', stay.date ? `${jour(stay.date)}, arrivée ${stay.arrival || 'non précisée'}` : null],
    ['04_Au_nom_de', stay.name],
    ['05_No_reservation', stay.resa],
    ['06_A_preparer', lignes.map((l) => `${l.name}${l.qty > 1 ? ` ×${l.qty}` : ''} (${euro(l.total)})`).join(', ')],
    ['07_Cadeau_roue', libelleCadeau(cadeau)],
    ['08_Alcool', alcool ? 'OUI : vérifier la majorité à l’arrivée' : null],
    ['09_Message_client', stay.message],
    ['10_Total_paye', euro(totalCents / 100)]
  ]);

  const description = [
    `Attentions pour le séjour du ${stay.date ? jour(stay.date) : '—'} (${stay.name}${stay.resa ? `, résa ${stay.resa}` : ''})`,
    lignes.map((l) => `${l.name}${l.qty > 1 ? ` ×${l.qty}` : ''}`).join(', '),
    cadeau ? `Cadeau roue : ${libelleCadeau(cadeau)}` : null
  ].filter(Boolean).join(' · ').slice(0, 1000);

  return { description, metadata };
}

/* Fiche client Stripe : nom, e-mail, TÉLÉPHONE, visibles sur le
   paiement et dans l'application. Un client qui revient garde sa
   fiche, mise à jour. Stripe injoignable : null, et le paiement
   s'ouvre quand même avec la seule adresse e-mail. */
export async function clientStripe({ name, email, phone, ref }) {
  try {
    const donnees = { name, phone, metadata: { derniere_reservation: ref } };
    const { data } = await stripe().customers.list({ email, limit: 1 });
    const client = data[0]
      ? await stripe().customers.update(data[0].id, donnees)
      : await stripe().customers.create({ email, ...donnees });
    return client.id;
  } catch (e) {
    console.error('Fiche client Stripe impossible', ref, e);
    return null;
  }
}
