/* ============================================================
   INTENSÉ'MANS — Retour de paiement Stripe
   ------------------------------------------------------------
   C'est LA source de vérité du paiement. On ne se fie jamais au
   retour du navigateur : le client peut fermer l'onglet juste après
   avoir payé, et la commande serait perdue. Stripe, lui, rappelle
   ici jusqu'à obtenir un 200.

   Corollaire : Stripe peut livrer le même événement plusieurs fois.
   markPaid() ne renvoie la commande qu'au premier passage, ce qui
   évite d'envoyer deux fois le même mail.
   ============================================================ */

import Stripe from 'stripe';
import { markPaid } from './_lib/store.js';
import { notifyHost } from './_lib/email.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  /* Corps BRUT, jamais parsé : la signature porte sur les octets
     exacts envoyés par Stripe. */
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body, signature, process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (e) {
    /* Signature invalide : la requête ne vient pas de Stripe. */
    return new Response(`Signature refusée : ${e.message}`, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return Response.json({ received: true });
  }

  const session = event.data.object;
  const ref = session.client_reference_id;

  if (!ref) {
    console.error('Session sans client_reference_id', session.id);
    return Response.json({ received: true });
  }

  const order = await markPaid(ref, {
    payment: (session.payment_method_types || [])[0] || 'carte',
    stripeSessionId: session.id
  });

  /* Déjà traitée : deuxième livraison du même événement, ou commande
     expirée. On répond 200 pour que Stripe cesse de réessayer. */
  if (!order) return Response.json({ received: true, duplicate: true });

  try {
    await notifyHost(order);
  } catch (e) {
    /* Le paiement est encaissé et la commande enregistrée : elle
       reste visible sur le tableau de préparation même si le mail
       échoue. On journalise sans renvoyer d'erreur à Stripe, sinon
       il rejouerait l'événement et rien ne changerait. */
    console.error('Notification hôte impossible', ref, e);
  }

  return Response.json({ received: true });
}
