/* ============================================================
   INTENSÉ'MANS — Séjours et verrouillage des nuits
   ------------------------------------------------------------
   Le point sensible de tout le site. Deux clients peuvent viser
   la même nuit à la même seconde : sans verrou, les deux paient
   et l'un des deux arrive devant une chambre occupée.

   Le verrou est une clé par nuit, posée avec NX — Redis ne crée
   la clé que si elle n'existe pas, et cette vérification-création
   est atomique. Le second client se voit donc refuser la nuit,
   même arrivé une milliseconde plus tard.

   Les nuits d'un séjour sont prises une par une ; si l'une d'elles
   résiste, on relâche celles déjà obtenues. Deux clients qui se
   marchent dessus échouent tous les deux et peuvent réessayer —
   c'est gênant, jamais dangereux.
   ============================================================ */

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const nuit = (date) => `night:${date}`;
const cle = (ref) => `stay:${ref}`;
const INDEX = 'stays:index';

/* Durée du verrou avant paiement : le temps d'un passage sur la
   page Stripe. Au-delà, la nuit se relibère d'elle-même — un
   panier abandonné ne doit pas bloquer un samedi soir. */
const VERROU_TTL = 30 * 60;

const score = (date) => Math.round(Date.parse(`${date}T00:00:00`) / 86400000);

/* Pose le verrou sur toutes les nuits, ou sur aucune.
   Renvoie { ok: true } ou { ok: false, conflit: 'AAAA-MM-JJ' }. */
export async function verrouiller(dates, ref) {
  const prises = [];
  for (const date of dates) {
    const pose = await redis.set(nuit(date), ref, { nx: true, ex: VERROU_TTL });
    if (!pose) {
      /* Nuit déjà tenue par quelqu'un d'autre : on rend tout ce
         qu'on avait pris pour ne pas bloquer un séjour voisin. */
      await liberer(prises, ref);
      return { ok: false, conflit: date };
    }
    prises.push(date);
  }
  return { ok: true };
}

/* Ne relâche que les nuits qu'on tient soi-même : sans cette
   vérification, un abandon pourrait libérer la nuit d'un autre. */
export async function liberer(dates, ref) {
  await Promise.all(dates.map(async (date) => {
    const tenu = await redis.get(nuit(date));
    if (tenu === ref) await redis.del(nuit(date));
  }));
}

/* Paiement encaissé : le verrou perd son expiration. */
export async function confirmerNuits(dates, ref) {
  await Promise.all(dates.map((date) => redis.set(nuit(date), ref)));
}

export async function nuitsPrises(dates) {
  if (!dates.length) return {};
  const valeurs = await redis.mget(...dates.map(nuit));
  const out = {};
  dates.forEach((date, i) => { if (valeurs[i]) out[date] = true; });
  return out;
}

export async function creerSejour(sejour) {
  await redis.set(cle(sejour.ref), sejour, { ex: VERROU_TTL });
}

export async function lireSejour(ref) {
  return redis.get(cle(ref));
}

/* Passage en payé, idempotent : renvoie null si le séjour n'était
   plus en attente, ce qui empêche le webhook Stripe d'envoyer deux
   fois le même message quand il rejoue un événement. */
export async function marquerPaye(ref, patch = {}) {
  const sejour = await redis.get(cle(ref));
  if (!sejour || sejour.status !== 'pending') return null;

  const paye = {
    ...sejour,
    ...patch,
    status: sejour.needsConfirmation ? 'a-confirmer' : 'paid',
    paidAt: new Date().toISOString()
  };
  await redis.set(cle(ref), paye);           // sans ex : plus d'expiration
  await redis.zadd(INDEX, { score: score(paye.checkin), member: ref });
  await confirmerNuits(paye.nightDates || [], ref);
  return paye;
}

export async function listerSejours() {
  const refs = await redis.zrange(INDEX, 0, -1);
  if (!refs.length) return [];
  const sejours = await redis.mget(...refs.map(cle));
  return sejours.filter(Boolean);
}

/* Refus par l'hôte d'une arrivée proche : les nuits repartent à la
   vente. Le remboursement se fait dans Stripe, pas ici. */
export async function refuserSejour(ref) {
  const sejour = await redis.get(cle(ref));
  if (!sejour) return null;
  await liberer(sejour.nightDates || [], ref);
  const refuse = { ...sejour, status: 'declined', declinedAt: new Date().toISOString() };
  await redis.set(cle(ref), refuse);
  return refuse;
}

export async function confirmerSejour(ref) {
  const sejour = await redis.get(cle(ref));
  if (!sejour) return null;
  const ok = { ...sejour, status: 'paid', confirmedAt: new Date().toISOString() };
  await redis.set(cle(ref), ok);
  return ok;
}

/* ------------------------------------------------------------------
   Le séjour au tableau de préparation

   Une nuit réservée sur le site demande autant de préparation qu'une
   commande d'attentions : elle porte les mêmes bouteilles, les mêmes
   pétales. Elle a donc besoin des mêmes marqueurs.

   Différence avec les commandes : on ne supprime jamais un séjour.
   Son enregistrement alimente aussi l'export iCal et la synthèse du
   mois ; l'effacer trouerait le calendrier. « Archiver » ne fait donc
   que le retirer du tableau, pas de la base.
   ------------------------------------------------------------------ */

export async function preparerSejour(ref, prepared) {
  const sejour = await redis.get(cle(ref));
  if (!sejour) return null;
  const suivant = { ...sejour, prepared: Boolean(prepared) };
  await redis.set(cle(ref), suivant);
  return suivant;
}

export async function preparerTousSejours() {
  const sejours = await listerSejours();
  await Promise.all(
    sejours
      .filter((s) => !s.prepared && !s.archivedAt)
      .map((s) => redis.set(cle(s.ref), { ...s, prepared: true }))
  );
}

/* Même garde-fou que pour les commandes : passé ET préparé. Retirer
   du tableau une arrivée à venir serait la pire panne possible. */
export async function archiverSejoursPrepares() {
  const sejours = await listerSejours();
  const limite = Date.now() - 86400000;

  const vieux = sejours.filter((s) => {
    if (!s.prepared || s.archivedAt) return false;
    const ts = Date.parse(`${s.checkin}T00:00:00`);
    return Number.isFinite(ts) && ts < limite;
  });

  await Promise.all(
    vieux.map((s) => redis.set(cle(s.ref), { ...s, archivedAt: new Date().toISOString() }))
  );
}
