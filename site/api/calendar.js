/* ============================================================
   INTENSÉ'MANS — Notre calendrier, pour Airbnb
   ------------------------------------------------------------
   Adresse à coller UNE FOIS dans Airbnb :
     Calendrier > Disponibilités > Synchroniser les calendriers
     > Importer un calendrier
     →  https://<le-domaine>/api/calendar

   Airbnb la relit tout seul toutes les 3 heures environ et bloque
   les nuits qu'on lui annonce. C'est la moitié « sortante » du
   planning commun ; la moitié entrante est dans _lib/ical.js.

   Ce flux est accessible à qui connaît l'adresse : il ne contient
   donc aucun nom, aucun montant, rien d'autre que des nuits prises.
   ============================================================ */

import { listerSejours } from './_lib/stays.js';
import { ecrireIcs } from './_lib/ical.js';

export async function GET() {
  const sejours = await listerSejours();

  /* Un séjour refusé par l'hôte a rendu ses nuits à la vente :
     il ne doit plus rien bloquer sur Airbnb. */
  const actifs = sejours.filter((s) => s.status !== 'declined' && s.checkin && s.checkout);

  return new Response(ecrireIcs(actifs), {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'inline; filename="intensemans.ics"',
      /* Airbnb ne repasse que toutes les 3 h : inutile de laisser
         un cache long masquer une réservation qui vient d'entrer. */
      'cache-control': 'public, max-age=60'
    }
  });
}
