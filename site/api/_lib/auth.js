/* ============================================================
   INTENSÉ'MANS — Accès au tableau de préparation
   ------------------------------------------------------------
   Le tableau expose des noms, des numéros de réservation et des
   messages personnels. « noindex » empêche Google de le référencer,
   pas un curieux de deviner l'URL. D'où ce mot de passe unique.

   Ce n'est pas un système de comptes : un seul hôte, un seul secret.
   Suffisant ici, à revoir le jour où plusieurs personnes doivent
   avoir leur propre accès.
   ============================================================ */

import { timingSafeEqual } from 'node:crypto';

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
