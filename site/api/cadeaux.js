/* ============================================================
   INTENSÉ'MANS — Les adresses collectées par la roue
   ------------------------------------------------------------
   Appelé par assets/js/orders.js, depuis le tableau de préparation,
   avec le même en-tête `x-preparer-secret` que api/orders.js.

   La roue enregistrait les adresses sans qu'aucun écran ne les
   montre : il fallait ouvrir la console Upstash pour les lire.
   Une liste qu'on ne consulte jamais ne sert à rien.

   Lecture seule. Ces données sont nominatives : elles ne sortent
   pas sans le secret.
   ============================================================ */

import { Redis } from '@upstash/redis';
import { verifier } from './_lib/auth.js';

const redis = Redis.fromEnv();

export async function GET(request) {
  const refus = await verifier(request);
  if (refus) return refus;

  const codes = await redis.smembers('cadeaux:index');
  if (!codes.length) return Response.json({ cadeaux: [] });

  const bruts = await redis.mget(...codes.map((c) => `cadeau:${c}`));

  /* Les codes expirés restent dans l'index alors que leur clé a
     disparu : on les écarte à la lecture plutôt que de tenir un
     ménage à part. */
  const cadeaux = bruts
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  return Response.json({ cadeaux });
}
