/* ============================================================
   INTENSÉ'MANS — Calendrier partagé avec Airbnb
   ------------------------------------------------------------
   Airbnb sait exporter son calendrier et en importer un autre,
   gratuitement. C'est tout ce dont on a besoin pour tenir un
   planning commun : aucun channel manager, aucun abonnement.

     lireAirbnb()  → les nuits déjà vendues sur Airbnb
     ecrireIcs()   → nos réservations directes, pour qu'Airbnb
                     les bloque de son côté

   Limite connue et assumée : Airbnb ne relit le calendrier importé
   que toutes les 3 heures environ. Pendant ce délai, la même nuit
   pourrait partir des deux côtés — c'est pourquoi les arrivées
   proches passent par une validation de l'hôte.
   ============================================================ */

const jourIso = (compact) =>
  `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;

/* Les fichiers iCal replient les lignes longues : une ligne qui
   commence par une espace ou une tabulation continue la précédente. */
function deplier(texte) {
  return texte.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

/* Nuits occupées d'après un flux iCal. On ne prend que les dates :
   Airbnb exporte des évènements d'une journée entière, et la nuit
   de départ reste vendable. */
export function nuitsDuFlux(texte) {
  const nuits = new Set();
  const blocs = deplier(texte).split('BEGIN:VEVENT').slice(1);

  for (const bloc of blocs) {
    const debut = bloc.match(/DTSTART[^:]*:(\d{8})/);
    const fin = bloc.match(/DTEND[^:]*:(\d{8})/);
    if (!debut || !fin) continue;

    const d = new Date(`${jourIso(debut[1])}T00:00:00`);
    const f = new Date(`${jourIso(fin[1])}T00:00:00`);
    if (Number.isNaN(d.getTime()) || Number.isNaN(f.getTime())) continue;

    /* Garde-fou : un flux corrompu ne doit pas faire tourner une
       boucle sans fin ni bloquer le calendrier sur des années. */
    let tours = 0;
    for (let j = new Date(d); j < f && tours < 400; j.setDate(j.getDate() + 1), tours++) {
      nuits.add([
        j.getFullYear(),
        String(j.getMonth() + 1).padStart(2, '0'),
        String(j.getDate()).padStart(2, '0')
      ].join('-'));
    }
  }
  return [...nuits];
}

/* Cache : le calendrier Airbnb ne bouge pas à la seconde, et cette
   fonction est appelée à chaque affichage de la page. */
const CACHE_MS = 10 * 60 * 1000;
let cache = null;

export async function lireAirbnb() {
  const url = process.env.AIRBNB_ICAL_URL;
  if (!url) return { status: 'unconfigured', nuits: [] };

  if (cache && Date.now() - cache.at < CACHE_MS) {
    return { status: 'ok', nuits: cache.nuits };
  }

  try {
    const res = await fetch(url, { headers: { accept: 'text/calendar' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const nuits = nuitsDuFlux(await res.text());
    cache = { nuits, at: Date.now() };
    return { status: 'ok', nuits };
  } catch (e) {
    /* Airbnb injoignable : on garde le dernier calendrier connu
       plutôt que d'ouvrir à la vente des nuits peut-être prises.
       Sans rien en mémoire, on le dit plutôt que de tout ouvrir. */
    console.error('Calendrier Airbnb illisible', e);
    if (cache) return { status: 'ok', nuits: cache.nuits, perime: true };
    return { status: 'error', nuits: [] };
  }
}

const horodatage = () => new Date().toISOString().replace(/[-:]|\.\d{3}/g, '');
const compact = (date) => date.replace(/-/g, '');

/* Notre calendrier, au format qu'Airbnb sait importer. Aucun nom ni
   détail de client : ce flux est accessible par son adresse, il ne
   doit rien révéler de plus que « cette nuit est prise ». */
export function ecrireIcs(sejours) {
  const lignes = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//INTENSE MANS Love Room//Reservations//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:INTENSE MANS - reservations directes'
  ];

  for (const s of sejours) {
    lignes.push(
      'BEGIN:VEVENT',
      `UID:${s.ref}@intensemans`,
      `DTSTAMP:${horodatage()}`,
      `DTSTART;VALUE=DATE:${compact(s.checkin)}`,
      `DTEND;VALUE=DATE:${compact(s.checkout)}`,
      'SUMMARY:Reserve (site)',
      'TRANSP:OPAQUE',
      'END:VEVENT'
    );
  }

  lignes.push('END:VCALENDAR');
  return lignes.join('\r\n');
}
