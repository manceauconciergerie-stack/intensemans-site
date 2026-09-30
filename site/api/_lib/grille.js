/* ============================================================
   INTENSÉ'MANS — Grille tarifaire (source unique)
   ------------------------------------------------------------
   Grille validée par l'hôte le 30/09/2026. Priorité, de haut en bas :

     1. Saint-Valentin (nuits du 13 et du 14 février) : 350 €, fixe,
        aucune remise
     2. Grand événement du circuit : 300 €
     3. Vendredi, samedi : 150 €
     4. Dimanche à jeudi : 115 €

   Remise de dernière minute, si la réservation est faite moins de
   72 h avant l'arrivée (16 h, heure de Paris) : −5 % en semaine,
   −10 % le week-end et pendant les événements. Elle sert à remplir
   une nuit qui resterait vide, pas à baisser le prix de tous.

   Pas de remise « longue durée » : la grille la cite sans la
   chiffrer. On ne l'invente pas.

   Ce fichier ne dépend de rien (ni process.env, ni import) : il est
   recopié tel quel dans le navigateur par tools/build_rates.mjs, pour
   que le calendrier affiche exactement ce que le serveur débitera.
   ============================================================ */

export const BASE = {
  0: 115,                         // dimanche
  1: 115, 2: 115, 3: 115, 4: 115, // lundi à jeudi
  5: 150,                         // vendredi
  6: 150                          // samedi
};

/* Nuits concernées : du premier au dernier jour INCLUS (la nuit qui
   commence le dernier jour est au tarif événement). Dates ISO.
   24 Heures Camions 2027 : dates pas encore annoncées. Ajouter la
   ligne ici dès qu'elles le sont, puis `node tools/build_rates.mjs`. */
export const EVENEMENTS = [
  { nom: '24 Heures Motos',           du: '2027-04-08', au: '2027-04-11', prix: 300 },
  { nom: 'Grand Prix de France Moto', du: '2027-05-14', au: '2027-05-16', prix: 300 },
  { nom: '24 Heures du Mans',         du: '2027-06-09', au: '2027-06-13', prix: 300 }
];

/* Chaque année, [mois, jour]. */
export const SAINT_VALENTIN = { nuits: [[2, 13], [2, 14]], prix: 350 };

export const REMISE = { semaine: 0.05, weekend: 0.10, evenement: 0.10 };
export const DERNIERE_MINUTE_HEURES = 72;
export const HEURE_ARRIVEE = 16;

const decoupe = (iso) => iso.split('-').map((n) => Number.parseInt(n, 10));

/* Décalage de Paris par rapport à UTC à cet instant, en minutes.
   Le serveur tourne en UTC : sans ce calcul, « 72 h avant 16 h »
   glisserait de deux heures en été. */
function decalageParis(ts) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).formatToParts(new Date(ts)).map((x) => [x.type, x.value]));
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - ts) / 60000;
}

/* Instant d'arrivée : ce jour-là, 16 h à Paris. */
export function instantArrivee(iso) {
  const [a, m, j] = decoupe(iso);
  const approx = Date.UTC(a, m - 1, j, HEURE_ARRIVEE);
  return approx - decalageParis(approx) * 60000;
}

export function derniereMinute(arrivee, maintenant) {
  return instantArrivee(arrivee) - maintenant < DERNIERE_MINUTE_HEURES * 3600000;
}

/* Prix de la nuit qui COMMENCE à `iso`. `arrivee` est le jour
   d'arrivée du séjour : c'est lui qui décide de la dernière minute,
   pour toutes les nuits du séjour. Arrondi au centime (109,25 €). */
export function prixGrille(iso, { arrivee = iso, maintenant = Date.now() } = {}) {
  const [a, m, j] = decoupe(iso);
  if (!a || !m || !j) return null;

  if (SAINT_VALENTIN.nuits.some(([mm, jj]) => mm === m && jj === j)) {
    return SAINT_VALENTIN.prix;
  }

  const jour = new Date(Date.UTC(a, m - 1, j)).getUTCDay();   // 0 = dimanche
  const evenement = EVENEMENTS.find((e) => iso >= e.du && iso <= e.au);

  const prix = evenement ? evenement.prix : BASE[jour];
  const remise = evenement ? REMISE.evenement
    : (jour === 5 || jour === 6) ? REMISE.weekend
      : REMISE.semaine;

  const final = derniereMinute(arrivee, maintenant) ? prix * (1 - remise) : prix;
  return Math.round(final * 100) / 100;
}
