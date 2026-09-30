/* ============================================================
   INTENSÉ'MANS — Réservation de la chambre
   ------------------------------------------------------------
   Ordre des opérations, et il n'est pas négociable :

     1. vérifier les dates
     2. recalculer le prix ici (jamais celui du navigateur)
     3. relire le calendrier Airbnb
     4. VERROUILLER les nuits — atomique, c'est ce qui empêche
        deux clients de payer la même nuit
     5. seulement ensuite, ouvrir le paiement

   Si le verrou échoue, personne n'est débité : le client voit que
   la nuit vient de partir et choisit d'autres dates.

   Les arrivées proches sont marquées « à confirmer » : le
   calendrier Airbnb n'étant relu que toutes les 3 heures, une nuit
   toute proche peut avoir été vendue là-bas sans qu'on le sache
   encore. Sur ces dates-là, c'est l'hôte qui tranche.
   ============================================================ */

import { stripe } from './_lib/stripe.js';
import { chiffrerSejour, nuitsDuSejour, tarifs } from './_lib/rates.js';
import { priceOrder } from './_lib/catalog.js';
import { verrouiller, liberer, creerSejour } from './_lib/stays.js';
import { lireAirbnb } from './_lib/ical.js';

const MAX = { name: 120, email: 160, phone: 30, message: 800 };
const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

const bad = (message, extra = {}) => new Response(
  JSON.stringify({ error: message, ...extra }),
  { status: 400, headers: { 'content-type': 'application/json' } }
);

/* En deçà de ce délai, l'hôte valide à la main. Le défaut de 3 jours
   couvre largement les 3 heures de latence du calendrier Airbnb. */
const delaiConfirmation = () =>
  Math.max(0, Number.parseInt(process.env.DELAI_CONFIRMATION_JOURS, 10) || 3);

export async function POST(request) {
  if (!tarifs()) return bad('La réservation en ligne n’est pas encore ouverte.');

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return bad('Requête illisible.');
  }

  const checkin = clean(payload.checkin, 10);
  const checkout = clean(payload.checkout, 10);
  const dateOk = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);
  if (!dateOk(checkin) || !dateOk(checkout) || checkin >= checkout) {
    return bad('Dates invalides.');
  }

  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const arrivee = new Date(`${checkin}T00:00:00`);
  if (arrivee < aujourdhui) return bad('Cette date est déjà passée.');

  const guest = {
    name: clean(payload.guest && payload.guest.name, MAX.name),
    email: clean(payload.guest && payload.guest.email, MAX.email),
    phone: clean(payload.guest && payload.guest.phone, MAX.phone),
    message: clean(payload.guest && payload.guest.message, MAX.message)
  };
  if (!guest.name) return bad('Votre nom est nécessaire.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guest.email)) return bad('Adresse e-mail invalide.');

  let chiffrage;
  try {
    chiffrage = chiffrerSejour(checkin, checkout);
  } catch (e) {
    return bad(e.message);
  }

  /* La nuit et les attentions se règlent en une fois : le client ne
     doit pas payer deux fois, et l'hôte reçoit un seul message. Les
     prix des extras sont recalculés ici comme ceux des nuits. */
  let extras = null;
  if (Array.isArray(payload.items) && payload.items.length) {
    try {
      extras = priceOrder(payload.items);
    } catch (e) {
      return bad(e.message);
    }
    if ((extras.hasAlcohol || extras.hasAdult) && payload.adult !== true) {
      return bad('Confirmation de majorité requise.');
    }
  }

  const dates = nuitsDuSejour(checkin, checkout);

  /* Le calendrier Airbnb d'abord : inutile de verrouiller une nuit
     déjà vendue là-bas. Illisible et sans cache, on préfère refuser. */
  const airbnb = await lireAirbnb();
  if (airbnb.status === 'error') {
    return bad('Impossible de vérifier les disponibilités pour l’instant. Réessayez dans un moment.');
  }
  const prisesAirbnb = new Set(airbnb.nuits);
  const conflitAirbnb = dates.find((d) => prisesAirbnb.has(d));
  if (conflitAirbnb) {
    return bad('Ces dates viennent d’être réservées.', { conflit: conflitAirbnb });
  }

  const ref = `IM-N-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${
    String(Math.floor(Math.random() * 9000) + 1000)}`;

  /* Le verrou. Tout ce qui précède n'était que de la préparation. */
  const verrou = await verrouiller(dates, ref);
  if (!verrou.ok) {
    return bad('Ces dates viennent d’être réservées.', { conflit: verrou.conflit });
  }

  const jours = Math.round((arrivee - aujourdhui) / 86400000);
  const needsConfirmation = jours <= delaiConfirmation();

  const totalCents = chiffrage.totalCents + (extras ? extras.totalCents : 0);

  const sejour = {
    ref,
    status: 'pending',
    checkin,
    checkout,
    nights: chiffrage.nights,
    nightDates: dates,
    guest,
    nightsTotal: chiffrage.totalCents / 100,
    lines: extras
      ? extras.lines.map((l) => ({ id: l.id, name: l.name, qty: l.qty, total: l.total, alcohol: l.alcohol }))
      : [],
    total: totalCents / 100,
    needsConfirmation,
    createdAt: new Date().toISOString()
  };

  try {
    await creerSejour(sejour);

    const origin = new URL(request.url).origin;
    const nuitLibelle = `${chiffrage.nights} nuit${chiffrage.nights > 1 ? 's' : ''}`;

    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      client_reference_id: ref,
      customer_email: guest.email,
      locale: 'fr',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: chiffrage.totalCents,
            product_data: {
              name: `Love Room INTENSE MANS — ${nuitLibelle}`,
              description: `Arrivee le ${checkin} a partir de 16h, depart le ${checkout} avant 11h`
            }
          }
        },
        ...(extras ? extras.lines.map((l) => ({
          quantity: l.qty,
          price_data: {
            currency: 'eur',
            unit_amount: l.unitCents,
            product_data: { name: l.name }
          }
        })) : [])
      ],
      success_url: `${origin}/sejour-confirme.html?ref=${encodeURIComponent(ref)}`,
      cancel_url: `${origin}/#parcours`,
      /* La page de paiement se ferme avant que le verrou des nuits
         tombe (45 min, stays.js). 31 min : Stripe refuse moins de 30. */
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      /* Copie de la réservation chez Stripe. Si l'enregistrement se
         perd, le webhook la reconstitue d'ici : l'hôte reçoit quand
         même le détail. 500 caractères au plus par valeur. */
      metadata: {
        ref, type: 'sejour', checkin, checkout,
        name: guest.name,
        phone: guest.phone,
        message: guest.message.slice(0, 500)
      }
    });

    return Response.json({ url: session.url, ref, needsConfirmation });
  } catch (e) {
    /* Le paiement n'a pas pu s'ouvrir : on rend les nuits tout de
       suite plutôt que d'attendre les 45 minutes du verrou. */
    console.error('Stripe séjour', e);
    await liberer(dates, ref);
    return new Response(
      JSON.stringify({ error: 'Le paiement n’a pas pu être ouvert.' }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    );
  }
}
