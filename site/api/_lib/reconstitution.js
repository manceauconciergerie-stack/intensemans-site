/* ============================================================
   INTENSÉ'MANS — Reconstitution d'un paiement orphelin
   ------------------------------------------------------------
   Stripe confirme un paiement dont l'enregistrement n'existe plus
   (expiré avant le paiement, ou webhook rejoué trop tard). Avant ce
   module, le webhook le prenait pour un doublon et se taisait :
   l'argent était encaissé, l'hôte ne savait rien.

   Tout ce qu'il faut est chez Stripe : la session porte une copie
   de la réservation dans ses métadonnées, et ses lignes d'achat.
   On reconstruit donc un enregistrement au même format que celui
   de la création, marqué `reconstitue`.

   Une nuit reconstituée est toujours « à confirmer » : son verrou
   a pu tomber, la nuit a pu être revendue entre-temps. C'est l'hôte
   qui tranche, comme pour une arrivée proche.
   ============================================================ */

import { stripe } from './stripe.js';
import { CATALOG } from './catalog.js';
import { nuitsDuSejour } from './rates.js';

const PAR_NOM = new Map(
  Object.entries(CATALOG).map(([id, p]) => [p.name, { id, ...p }])
);

/* Libellé de la ligne « nuit », posé par create-stay-session.js.
   On repère la nuit par lui, et non les attentions par le catalogue :
   un article retiré depuis (les softs, devenus offerts) doit rester
   une attention, pas gonfler le prix de la nuit. */
const LIGNE_NUIT = 'Love Room INTENSE MANS';

/* Lignes d'achat relues chez Stripe. Une erreur Stripe remonte à
   l'appelant, qui répond 500 : Stripe rejouera, rien n'a encore été
   écrit. */
async function lignesAchetees(sessionId) {
  const { data } = await stripe().checkout.sessions.listLineItems(sessionId, { limit: 100 });
  return data.map((li) => {
    const produit = PAR_NOM.get(li.description);
    return {
      id: produit ? produit.id : null,
      name: li.description,
      qty: li.quantity,
      total: li.amount_total / 100,
      alcohol: produit ? produit.alcohol : false,
      cents: li.amount_total
    };
  });
}

const sansCents = ({ cents, ...ligne }) => ligne;

function client(session) {
  const cd = session.customer_details || {};
  return {
    email: cd.email || session.customer_email || '',
    name: cd.name || '',
    phone: cd.phone || ''
  };
}

export async function reconstituerSejour(session, patch) {
  const m = session.metadata || {};
  const c = client(session);
  const lignes = await lignesAchetees(session.id);
  const extras = lignes.filter((l) => !l.name.startsWith(LIGNE_NUIT));
  const extrasCents = extras.reduce((s, l) => s + l.cents, 0);
  const dates = (m.checkin && m.checkout) ? nuitsDuSejour(m.checkin, m.checkout) : [];

  return {
    ref: session.client_reference_id,
    status: 'a-confirmer',
    checkin: m.checkin || '',
    checkout: m.checkout || '',
    nights: dates.length,
    nightDates: dates,
    guest: {
      name: m.name || c.name,
      email: c.email,
      phone: m.phone || c.phone,
      message: m.message || ''
    },
    nightsTotal: (session.amount_total - extrasCents) / 100,
    lines: extras.map(sansCents),
    total: session.amount_total / 100,
    needsConfirmation: true,
    reconstitue: true,
    createdAt: new Date(session.created * 1000).toISOString(),
    paidAt: new Date().toISOString(),
    ...patch
  };
}

export async function reconstituerCommande(session, patch) {
  const m = session.metadata || {};
  const c = client(session);
  const lignes = await lignesAchetees(session.id);

  return {
    ref: session.client_reference_id,
    status: 'paid',
    stay: {
      name: m.name || c.name,
      date: m.stayDate || '',
      arrival: m.arrival || '',
      resa: m.resa || '',
      message: m.message || ''
    },
    lines: lignes.map(sansCents),
    total: session.amount_total / 100,
    prepared: false,
    reconstitue: true,
    createdAt: new Date(session.created * 1000).toISOString(),
    paidAt: new Date().toISOString(),
    ...patch
  };
}
