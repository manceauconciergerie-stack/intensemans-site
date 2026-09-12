/* ============================================================
   INTENSÉ'MANS — La synthèse du tableau de bord
   ------------------------------------------------------------
   Appelé par assets/js/app.js depuis preparer.html, avec le même
   en-tête `x-preparer-secret` que orders.js et cadeaux.js.

   Les chiffres existaient déjà, éparpillés : les commandes d'un
   côté, les nuits de l'autre, les adresses ailleurs. Personne ne
   les additionnait, donc l'hôte ne savait pas ce qu'il gagnait.

   Ce qui n'est PAS ici, volontairement : les virements. Stripe
   les présente déjà mieux que nous ne le ferions, avec les dates
   de versement, les remboursements et l'export comptable. Les
   recopier créerait deux chiffres d'argent qui divergent.
   ============================================================ */

import { listOrders } from './_lib/store.js';
import { listerSejours } from './_lib/stays.js';
import { verifier } from './_lib/auth.js';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const moisDe = (iso) => String(iso || '').slice(0, 7);

export async function GET(request) {
  const refus = await verifier(request);
  if (refus) return refus;

  const [commandes, sejours, codes] = await Promise.all([
    listOrders().catch(() => []),
    listerSejours().catch(() => []),
    redis.smembers('cadeaux:index').catch(() => [])
  ]);

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const mois = aujourdhui.slice(0, 7);

  /* Un séjour refusé a été remboursé : il ne compte pas. */
  const sejoursValides = sejours.filter((s) => s.status !== 'declined');

  const duMois = (liste, champ) => liste.filter((x) => moisDe(x[champ]) === mois);
  const somme = (liste) => liste.reduce((t, x) => t + (Number(x.total) || 0), 0);

  const nuitsDuMois = duMois(sejoursValides, 'checkin');
  const commandesDuMois = duMois(commandes, 'createdAt');

  /* Le total d'un séjour inclut déjà ses attentions : les compter
     à part les ferait apparaître deux fois. */
  const caNuits = somme(nuitsDuMois);
  const caAttentions = somme(commandesDuMois);

  const aVenir = sejoursValides
    .filter((s) => s.checkin >= aujourdhui)
    .sort((a, b) => String(a.checkin).localeCompare(String(b.checkin)));

  return Response.json({
    mois,
    ca: { nuits: caNuits, attentions: caAttentions, total: caNuits + caAttentions },
    nuitsReservees: nuitsDuMois.length,
    commandes: commandesDuMois.length,
    adresses: codes.length,
    aValider: sejoursValides.filter((s) => s.status === 'a-confirmer').length,
    /* Les deux registres alimentent le tableau de préparation : ne
       compter que les commandes d'attentions laisserait le bandeau
       annoncer « rien à faire » un soir d'arrivée. */
    aPreparer: commandes.filter((c) => !c.prepared).length
             + sejoursValides.filter((s) => !s.prepared && !s.archivedAt).length,
    prochaine: aVenir.length
      ? { checkin: aVenir[0].checkin, nom: (aVenir[0].guest && aVenir[0].guest.name) || '' }
      : null
  });
}
