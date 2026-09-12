/* ============================================================
   INTENSÉ'MANS — Accès au tableau de préparation
   ------------------------------------------------------------
   Le tableau expose des noms, des numéros de réservation et des
   messages personnels. « noindex » empêche Google de le référencer,
   pas un curieux de deviner l'URL.

   Deux chemins, dans cet ordre :

     1. la session ouverte par lien magique, seule voie utilisée par
        le navigateur ; le cookie est HttpOnly, donc invisible au
        JavaScript de la page
     2. un secret partagé en en-tête, repli de dépannage : utile pour
        interroger l'API en ligne de commande, ou le jour où Resend
        ne part plus. Laisser PREPARER_SECRET vide le désactive.

   Le repli est compté et limité comme un mot de passe, parce qu'il
   en est un.
   ============================================================ */

import { timingSafeEqual } from 'node:crypto';
import { Redis } from '@upstash/redis';
import { sessionValide } from './session.js';

const redis = Redis.fromEnv();

/* Le mot de passe seul ne protège de rien si on peut le tester sans
   limite : un programme en essaie des milliers par seconde. Au-delà
   de ce nombre d'échecs, l'adresse est écartée pour un quart d'heure.

   Le compteur est porté par la base, pas par la mémoire de la
   fonction : chaque appel peut tourner sur une machine différente,
   un compteur local ne compterait rien. */
const ESSAIS_MAX = 8;
const BLOCAGE = 15 * 60;

const cleEssais = (ip) => `essais:${ip}`;

function adresse(request) {
  /* Vercel place l'adresse réelle du client en tête de cette liste. */
  const xff = request.headers.get('x-forwarded-for') || '';
  return xff.split(',')[0].trim() || 'inconnue';
}

/* Renvoie null si l'accès est accordé, sinon la réponse à retourner.
   À préférer à isAuthorized() : elle compte les échecs. */
export async function verifier(request) {
  /* Une session ouverte par lien magique suffit : c'est le chemin
     normal. Le secret partagé reste accepté en repli, le temps que
     Resend soit branché et que la connexion par mail fonctionne. */
  if (await sessionValide(request)) return null;

  const ip = adresse(request);

  let essais = 0;
  try {
    essais = Number(await redis.get(cleEssais(ip))) || 0;
  } catch (e) {
    /* Base injoignable : on ne bloque pas l'hôte pour autant, mais
       on perd le comptage. Le secret long reste la protection. */
    console.error('Comptage des essais indisponible', e);
  }

  if (essais >= ESSAIS_MAX) return trop();

  if (isAuthorized(request)) {
    /* Succès : on remet le compteur à zéro. */
    try { await redis.del(cleEssais(ip)); } catch (e) { /* sans effet */ }
    return null;
  }

  try {
    const n = await redis.incr(cleEssais(ip));
    if (n === 1) await redis.expire(cleEssais(ip), BLOCAGE);
  } catch (e) { /* sans effet */ }

  return denied();
}

export function isAuthorized(request) {
  const expected = process.env.PREPARER_SECRET;
  if (!expected) return false;

  const given = request.headers.get('x-preparer-secret') || '';

  /* Comparaison à durée constante : une comparaison naïve laisse
     deviner le secret caractère par caractère au chronomètre. */
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const denied = () => new Response(
  JSON.stringify({ error: 'Accès refusé' }),
  { status: 401, headers: { 'content-type': 'application/json' } }
);

export const trop = () => new Response(
  JSON.stringify({ error: 'Trop de tentatives. Réessayez dans un quart d’heure.' }),
  { status: 429, headers: { 'content-type': 'application/json', 'retry-after': String(BLOCAGE) } }
);
