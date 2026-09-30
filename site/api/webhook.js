/* ============================================================
   INTENSÉ'MANS — Retour de paiement Stripe
   ------------------------------------------------------------
   C'est LA source de vérité du paiement. On ne se fie jamais au
   retour du navigateur : le client peut fermer l'onglet juste après
   avoir payé, et la commande serait perdue. Stripe, lui, rappelle
   ici jusqu'à obtenir un 200 (pendant 3 jours).

   Deux garanties, et le reste en découle :

   1. Un paiement n'est JAMAIS ignoré. Si son enregistrement a
      disparu, on le reconstitue depuis Stripe au lieu de le prendre
      pour un doublon. C'était le trou : argent encaissé, silence.

   2. Tant que l'hôte n'a pas reçu son mail, on répond 500. Stripe
      réessaie, et prévient le titulaire du compte que le webhook
      échoue : une panne d'envoi se voit au lieu de se taire.
      Chaque envoi réussi est noté (hostNotifiedAt, clientNotifiedAt),
      un nouvel essai ne renvoie donc que ce qui manque.
   ============================================================ */

import { stripe, webhookSecret } from './_lib/stripe.js';
import { markPaid, getOrder, recoverOrder, patchOrder } from './_lib/store.js';
import { marquerPaye, lireSejour, recupererSejour, noterSejour } from './_lib/stays.js';
import { reconstituerSejour, reconstituerCommande } from './_lib/reconstitution.js';
import { notifyHost, notifyStay, confirmerAuClient, confirmerCommandeAuClient } from './_lib/email.js';

/* Renvoie l'enregistrement payé, ou null s'il n'y a rien à faire
   (séjour refusé par l'hôte, ou encore en attente — impossible en
   pratique, marquerPaye l'aurait pris). */
async function enregistrer(session, estSejour, patch) {
  const ref = session.client_reference_id;

  const paye = estSejour ? await marquerPaye(ref, patch) : await markPaid(ref, patch);
  if (paye) return paye;

  /* Déjà payé : deuxième livraison. On le rend quand même, pour
     finir les envois qu'un premier passage aurait ratés. */
  const existant = estSejour ? await lireSejour(ref) : await getOrder(ref);
  if (existant) {
    return ['pending', 'declined'].includes(existant.status) ? null : existant;
  }

  console.error('Paiement sans enregistrement, reconstitué depuis Stripe', ref, session.id);
  return estSejour
    ? recupererSejour(await reconstituerSejour(session, patch))
    : recoverOrder(await reconstituerCommande(session, patch));
}

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
  let enregistre;
  try {
    enregistre = await enregistrer(session, estSejour, {
      payment: paiement, stripeSessionId: session.id
    });
  } catch (e) {
    /* Base ou Stripe injoignable : rien n'est perdu, Stripe rejouera. */
    console.error('Enregistrement du paiement impossible', ref, e);
    return new Response('Enregistrement impossible', { status: 500 });
  }

  if (!enregistre) return Response.json({ received: true, duplicate: true });

  const noter = estSejour ? noterSejour : patchOrder;
  const maintenant = () => new Date().toISOString();

  /* Deux destinataires, deux besoins. L'hôte doit préparer, le
     client doit avoir une trace écrite de ce qu'il a payé et de ses
     horaires. Les envois sont indépendants : si l'un échoue, l'autre
     doit partir quand même. */
  let hoteSansMail = false;
  if (!enregistre.hostNotifiedAt) {
    try {
      await (estSejour ? notifyStay(enregistre) : notifyHost(enregistre));
      await noter(ref, { hostNotifiedAt: maintenant() });
    } catch (e) {
      hoteSansMail = true;
      console.error('Notification hôte impossible', ref, e);
    }
  }

  if (!enregistre.clientNotifiedAt) {
    const clientEmail = estSejour
      ? (enregistre.guest && enregistre.guest.email)
      : ((session.customer_details && session.customer_details.email) || session.customer_email);
    try {
      await (estSejour
        ? confirmerAuClient(enregistre)
        : confirmerCommandeAuClient(enregistre, clientEmail));
      await noter(ref, { clientNotifiedAt: maintenant() });
    } catch (e) {
      /* Pas de 500 pour le client seul : l'hôte a le détail et son
         e-mail, et rejouer n'y changerait rien tant que l'envoi vers
         l'extérieur n'est pas ouvert chez Resend. */
      console.error('Confirmation client impossible', ref, e);
    }
  }

  /* La réservation est enregistrée et visible au tableau ; seul le
     mail à l'hôte manque. Le 500 fait rejouer Stripe jusqu'à ce
     qu'il parte. */
  if (hoteSansMail) {
    return new Response('Réservation enregistrée, mail à l’hôte non parti', { status: 500 });
  }

  return Response.json({ received: true });
}
