/* ============================================================
   INTENSÉ'MANS — Ouverture d'une session de paiement
   ------------------------------------------------------------
   Le navigateur envoie ce que le client a choisi et quand il arrive.
   Il n'envoie PAS de prix : tout est recalculé ici depuis catalog.js.
   Un panier trafiqué ne peut donc rien débiter d'autre que le tarif
   réel du catalogue.
   ============================================================ */

import { stripe } from './_lib/stripe.js';
import { priceOrder } from './_lib/catalog.js';
import { putPending } from './_lib/store.js';

const MAX = { name: 120, resa: 60, message: 800 };

const clean = (value, max) => String(value == null ? '' : value).trim().slice(0, max);

const bad = (message) => new Response(
  JSON.stringify({ error: message }),
  { status: 400, headers: { 'content-type': 'application/json' } }
);

/* Le séjour doit être à venir : une commande pour hier n'a aucun
   sens et signale soit un bug, soit une tentative de bricolage. */
function validStay(stay) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(stay.date)) return 'Date de séjour invalide.';
  if (!/^\d{2}:\d{2}$/.test(stay.arrival)) return 'Heure d’arrivée invalide.';
  if (!stay.name) return 'Nom de réservation manquant.';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (Date.parse(`${stay.date}T00:00:00`) < today.getTime()) {
    return 'La date de séjour est déjà passée.';
  }
  return null;
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return bad('Requête illisible.');
  }

  const stay = {
    name: clean(payload.stay && payload.stay.name, MAX.name),
    date: clean(payload.stay && payload.stay.date, 10),
    arrival: clean(payload.stay && payload.stay.arrival, 5),
    resa: clean(payload.stay && payload.stay.resa, MAX.resa),
    message: clean(payload.stay && payload.stay.message, MAX.message)
  };

  const stayError = validStay(stay);
  if (stayError) return bad(stayError);

  let priced;
  try {
    priced = priceOrder(payload.items);
  } catch (e) {
    return bad(e.message);
  }

  /* La majorité doit être affirmée explicitement dès qu'il y a de
     l'alcool ou un produit réservé aux adultes. */
  if ((priced.hasAlcohol || priced.hasAdult) && payload.adult !== true) {
    return bad('Confirmation de majorité requise.');
  }

  const ref = `IM-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${
    String(Math.floor(Math.random() * 9000) + 1000)}`;

  const order = {
    ref,
    status: 'pending',
    stay,
    lines: priced.lines.map((l) => ({
      id: l.id, name: l.name, qty: l.qty, total: l.total, alcohol: l.alcohol
    })),
    total: priced.totalCents / 100,
    prepared: false,
    createdAt: new Date().toISOString()
  };

  await putPending(order);

  const origin = new URL(request.url).origin;

  try {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      client_reference_id: ref,
      locale: 'fr',
      line_items: priced.lines.map((l) => ({
        quantity: l.qty,
        price_data: {
          currency: 'eur',
          unit_amount: l.unitCents,
          product_data: { name: l.name }
        }
      })),
      success_url: `${origin}/confirmation.html?ref=${encodeURIComponent(ref)}`,
      cancel_url: `${origin}/commander.html`,
      /* Copie de la commande chez Stripe : si l'enregistrement se
         perd, le webhook la reconstitue d'ici. 500 caractères au
         plus par valeur. */
      metadata: {
        ref, stayDate: stay.date, arrival: stay.arrival,
        name: stay.name,
        resa: stay.resa,
        message: stay.message.slice(0, 500)
      }
    });

    return Response.json({ url: session.url, ref });
  } catch (e) {
    console.error('Stripe checkout', e);
    return new Response(
      JSON.stringify({ error: 'Le paiement n’a pas pu être ouvert.' }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    );
  }
}
