/* ============================================================
   INTENSÉ'MANS — Disponibilités et tarifs de la chambre
   ------------------------------------------------------------
   Fusionne les deux sources d'occupation :
     · nos réservations directes (verrous de nuits dans Redis)
     · les réservations Airbnb (son calendrier iCal)

   Une nuit n'est proposée que si elle est libre des DEUX côtés.
   En cas de doute — calendrier Airbnb illisible et rien en cache —
   on répond « unknown » : le site le dit au visiteur au lieu de
   vendre une nuit peut-être déjà prise.
   ============================================================ */

import { nuitsPrises } from './_lib/stays.js';
import { lireAirbnb } from './_lib/ical.js';
import { tarifs, prixNuit, nuitsDuSejour } from './_lib/rates.js';

const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: {
    'content-type': 'application/json',
    /* Court : une nuit qui vient d'être vendue doit disparaître vite. */
    'cache-control': 'public, max-age=60'
  }
});

export async function GET(request) {
  const table = tarifs();
  if (!table) return json({ status: 'unconfigured' });

  const url = new URL(request.url);
  const from = url.searchParams.get('from') || '';
  const to = url.searchParams.get('to') || '';
  const dateOk = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);
  if (!dateOk(from) || !dateOk(to) || from >= to) {
    return json({ status: 'error', error: 'Période invalide.' }, 400);
  }

  const dates = nuitsDuSejour(from, to);
  if (dates.length > 400) {
    return json({ status: 'error', error: 'Période trop longue.' }, 400);
  }

  const [nous, airbnb] = await Promise.all([nuitsPrises(dates), lireAirbnb()]);

  /* Airbnb muet et aucun cache : on ne sait pas ce qui est libre.
     Mieux vaut l'avouer que de tout afficher disponible. */
  if (airbnb.status === 'error') return json({ status: 'unknown' });

  const prises = new Set(airbnb.nuits);
  const days = {};
  for (const date of dates) {
    days[date] = {
      free: !nous[date] && !prises.has(date),
      price: prixNuit(date, table)
    };
  }

  return json({
    status: 'ok',
    days,
    nuitsMin: table.nuitsMin,
    /* Sans lien Airbnb configuré, le calendrier ne montre que nos
       propres réservations : le site doit le signaler. */
    airbnb: airbnb.status === 'ok'
  });
}
