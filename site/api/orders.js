/* ============================================================
   INTENSÉ'MANS — Commandes, pour le tableau de préparation
   ------------------------------------------------------------
   Seul l'hôte lit ceci : les commandes portent des noms, des
   numéros de réservation et des messages personnels. Chaque appel
   doit présenter le secret.
   ============================================================ */

import { listOrders, setPrepared, markAllPrepared, archivePrepared } from './_lib/store.js';
import { isAuthorized, denied } from './_lib/auth.js';

const bad = (message) => new Response(
  JSON.stringify({ error: message }),
  { status: 400, headers: { 'content-type': 'application/json' } }
);

export async function GET(request) {
  if (!isAuthorized(request)) return denied();
  return Response.json({ orders: await listOrders() });
}

export async function PATCH(request) {
  if (!isAuthorized(request)) return denied();

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return bad('Requête illisible.');
  }

  switch (payload.action) {
    case 'prepared':
      await setPrepared(String(payload.ref || ''), payload.prepared);
      break;
    case 'all':
      await markAllPrepared();
      break;
    case 'archive':
      await archivePrepared();
      break;
    default:
      return bad('Action inconnue.');
  }

  return Response.json({ orders: await listOrders() });
}
