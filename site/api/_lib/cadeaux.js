/* ============================================================
   INTENSÉ'MANS — Cadeau de la roue, relu au moment de payer
   ------------------------------------------------------------
   Le client tape son code (IM-XXXX) dans le parcours. Jusqu'ici, il
   ne partait qu'au milieu du message libre : le 3 octobre, l'hôte n'a
   vu dans Stripe aucune trace de la planche gagnée par son client.

   Le code est relu ici dans la base (écrit par api/roue.js), et le
   lot remonte en clair partout : mail, tableau, paiement Stripe.
   Introuvable (expiré, ou mal recopié) : on garde le code, lot à
   null, et l'hôte voit « à vérifier » au lieu de rien.
   ============================================================ */

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function lireCadeau(saisi) {
  const code = String(saisi == null ? '' : saisi).replace(/\s+/g, '').toUpperCase().slice(0, 20);
  if (!code) return null;
  let trouve = null;
  if (/^IM-[A-Z0-9]{4,12}$/.test(code)) {
    try {
      trouve = await redis.get(`cadeau:${code}`);
    } catch (e) {
      /* Base injoignable : la réservation passe, le code reste signalé. */
      console.error('Lecture du cadeau impossible', code, e);
    }
  }
  return { code, lot: (trouve && trouve.lot) || null };
}

/* « Planche apéritive (IM-AB12C) », ou « code IM-AB12C à vérifier ». */
export const libelleCadeau = (c) => (c
  ? (c.lot ? `${c.lot} (${c.code})` : `code ${c.code} à vérifier`)
  : null);
