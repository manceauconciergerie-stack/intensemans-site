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

import { stripe, webhookSecret } from './_lib/stripe.js';
import { markPaid } from './_lib/store.js';
import { marquerPaye } from './_lib/stays.js';
import { notifyHost, notifyStay, confirmerAuClient, confirmerCommandeAuClient } from './_lib/email.js';

export async function POST(request) {
  /* Corps BRUT, jamais parsé : la signature porte sur les octets
     exacts envoyés par Stripe. */
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe().webhooks.constructEvent(
      body, signature, webhookSecret()
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

  const paiement = (session.payment_method_types || [])[0] || 'carte';
  const estSejour = (session.metadata && session.metadata.type) === 'sejour';

  /* Deux produits passent par le même webhook : une nuit dans la
     chambre, ou des attentions pour un séjour déjà réservé. Le type
     posé à la création de la session les distingue. */
  const enregistre = estSejour
    ? await marquerPaye(ref, { payment: paiement, stripeSessionId: session.id })
    : await markPaid(ref, { payment: paiement, stripeSessionId: session.id });

  /* Déjà traité : deuxième livraison du même événement, ou commande
     expirée. On répond 200 pour que Stripe cesse de réessayer. */
  if (!enregistre) return Response.json({ received: true, duplicate: true });

  /* Deux destinataires, deux besoins. L'hôte doit préparer, le
     client doit avoir une trace écrite de ce qu'il a payé et de ses
     horaires. Les envois sont indépendants : si l'un échoue, l'autre
     doit partir quand même. */
  const clientEmail = estSejour
    ? (enregistre.guest && enregistre.guest.email)
    : ((session.customer_details && session.customer_details.email) || session.customer_email);

  try {
    await (estSejour ? notifyStay(enregistre) : notifyHost(enregistre));
  } catch (e) {
    /* Le paiement est encaissé et la réservation enregistrée : les
       nuits sont verrouillées et elle apparaît au tableau même si le
       mail échoue. On journalise sans renvoyer d'erreur à Stripe,
       sinon il rejouerait l'événement et rien ne changerait. */
    console.error('Notification hôte impossible', ref, e);
  }

  try {
    await (estSejour
      ? confirmerAuClient(enregistre)
      : confirmerCommandeAuClient(enregistre, clientEmail));
  } catch (e) {
    /* Le paiement est encaissé : on ne renvoie pas d'erreur à Stripe,
       il rejouerait l'événement et l'hôte recevrait un second mail. */
    console.error('Confirmation client impossible', ref, e);
  }

  return Response.json({ received: true });
}
