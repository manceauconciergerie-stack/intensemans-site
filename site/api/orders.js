/* ============================================================
   INTENSÉ'MANS — Le tableau de préparation
   ------------------------------------------------------------
   Seul l'hôte lit ceci : les lignes portent des noms, des numéros
   de réservation et des messages personnels. Chaque appel doit
   présenter une session valide.

   Deux registres alimentent ce tableau, et c'est voulu :

     · les SÉJOURS   une nuit réservée sur le site, avec ou sans
                     attentions, payée en une fois
     · les COMMANDES des attentions seules, pour un client qui a
                     déjà réservé ailleurs (Airbnb)

   Ils vivent dans deux bases distinctes parce qu'ils n'ont ni les
   mêmes contraintes ni le même cycle de vie : un séjour verrouille
   des nuits et nourrit l'export iCal, une commande non. Mais pour
   celui qui prépare la chambre, la distinction n'existe pas : il y
   a des arrivées, et des choses à poser avant. Ce fichier les
   ramène donc à une seule liste, triée par date d'arrivée.
   ============================================================ */

import { listOrders, setPrepared, markAllPrepared, archivePrepared } from './_lib/store.js';
import {
  listerSejours, preparerSejour, preparerTousSejours, archiverSejoursPrepares
} from './_lib/stays.js';
import { verifier } from './_lib/auth.js';

const bad = (message) => new Response(
  JSON.stringify({ error: message }),
  { status: 400, headers: { 'content-type': 'application/json' } }
);

/* Les réservations de nuit portent le préfixe IM-N-, les commandes
   d'attentions IM- seul. C'est ce qui aiguille chaque action vers
   la bonne base, sans avoir à interroger les deux. */
const estSejour = (ref) => String(ref || '').startsWith('IM-N-');

/* Arrivée toujours à 16 h : c'est la règle de la maison, pas un
   choix laissé au client. Le tunnel ne pose donc pas la question. */
const ARRIVEE = '16:00';

const jour = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
};

/* Un séjour vu comme une ligne du tableau. La nuit devient un
   article comme un autre : sans elle, l'hôte verrait « 188 € » en
   face de deux pétales de rose et ne comprendrait pas le total. */
function enLigne(s) {
  const nuits = Number(s.nights) || 1;
  const extras = Array.isArray(s.lines) ? s.lines : [];

  return {
    ref: s.ref,
    kind: 'sejour',
    status: s.status,
    stay: {
      date: s.checkin,
      arrival: ARRIVEE,
      name: (s.guest && s.guest.name) || '',
      /* À la place du numéro de réservation Airbnb, qui n'existe pas
         ici : la durée du séjour, l'information dont l'hôte a besoin
         pour savoir jusqu'à quand la chambre est prise. */
      resa: `${nuits} nuit${nuits > 1 ? 's' : ''} · départ le ${jour(s.checkout)}`,
      message: (s.guest && s.guest.message) || ''
    },
    lines: [
      {
        id: 'nuit',
        name: `Nuit${nuits > 1 ? 's' : ''} en Love Room`,
        qty: nuits,
        total: Number(s.nightsTotal) || 0
      },
      ...extras
    ],
    total: Number(s.total) || 0,
    payment: s.payment || 'carte',
    prepared: Boolean(s.prepared),
    createdAt: s.paidAt || s.createdAt
  };
}

/* Le tri du tableau. Les commandes arrivent déjà ordonnées par leur
   index Redis, les séjours aussi, mais deux listes triées séparément
   ne font pas une liste triée. */
const quand = (o) => Date.parse(`${(o.stay && o.stay.date) || ''}T${(o.stay && o.stay.arrival) || '00:00'}:00`) || 0;

async function tableau() {
  const [commandes, sejours] = await Promise.all([
    listOrders().catch(() => []),
    listerSejours().catch(() => [])
  ]);

  const lignes = sejours
    /* Un séjour refusé a été remboursé et ses nuits sont reparties à
       la vente : il n'y a plus rien à préparer. Un séjour archivé a
       déjà été traité, on garde l'enregistrement pour le calendrier
       mais on ne l'affiche plus. */
    .filter((s) => s.status !== 'declined' && !s.archivedAt)
    .map(enLigne)
    .concat(commandes.map((o) => ({ ...o, kind: 'commande', prepared: Boolean(o.prepared) })));

  return lignes.sort((a, b) => quand(a) - quand(b));
}

export async function GET(request) {
  const refus = await verifier(request);
  if (refus) return refus;
  return Response.json({ orders: await tableau() });
}

export async function PATCH(request) {
  const refus = await verifier(request);
  if (refus) return refus;

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return bad('Requête illisible.');
  }

  switch (payload.action) {
    case 'prepared': {
      const ref = String(payload.ref || '');
      await (estSejour(ref)
        ? preparerSejour(ref, payload.prepared)
        : setPrepared(ref, payload.prepared));
      break;
    }
    case 'all':
      await Promise.all([markAllPrepared(), preparerTousSejours()]);
      break;
    case 'archive':
      await Promise.all([archivePrepared(), archiverSejoursPrepares()]);
      break;
    default:
      return bad('Action inconnue.');
  }

  return Response.json({ orders: await tableau() });
}
