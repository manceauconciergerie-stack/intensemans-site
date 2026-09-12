/* ============================================================
   INTENSÉ'MANS — La roue de bienvenue
   ------------------------------------------------------------
   Le navigateur appelait déjà cette adresse, mais elle n'existait
   pas : le POST échouait en silence. Résultat, la roue affichait
   « Nous avons envoyé votre code » alors que rien ne partait, et
   aucune des adresses collectées n'était conservée. Une roue dont
   le seul but est de capter des e-mails n'en captait aucun.

   Deux choses ici, et rien d'autre :
     1. enregistrer le code, pour que l'hôte puisse le vérifier
     2. envoyer le code au client, comme promis à l'écran

   Le tirage reste côté navigateur : rien à gagner à le déplacer,
   tout le monde gagne de toute façon.
   ============================================================ */

import { Redis } from '@upstash/redis';
import { envoyerCodeCadeau } from './_lib/email.js';

const redis = Redis.fromEnv();

const CLE = (code) => `cadeau:${code}`;
const INDEX = 'cadeaux:index';

/* Un an : au-delà, un code de bienvenue n'a plus lieu d'être, et
   conserver une adresse sans raison n'est pas permis. */
const DUREE = 60 * 60 * 24 * 365;

const bad = (message) => new Response(JSON.stringify({ error: message }), {
  status: 400, headers: { 'content-type': 'application/json' }
});

const propre = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return bad('Requête illisible.');
  }

  const email = propre(payload.email, 160).toLowerCase();
  const code = propre(payload.code, 20).toUpperCase();
  const lot = propre(payload.lot, 80);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad('Adresse invalide.');
  if (!/^IM-[A-Z0-9]{4,12}$/.test(code)) return bad('Code invalide.');
  if (!lot) return bad('Lot manquant.');

  const cadeau = {
    code,
    email,
    lot,
    /* Le consentement est stocké avec l'adresse : sans lui, on n'a
       pas le droit d'écrire à cette personne plus tard. */
    accord: payload.accord === true,
    createdAt: new Date().toISOString()
  };

  try {
    /* NX : un même code ne peut pas être réécrit. Sans ça, quelqu'un
       pourrait réattribuer à son adresse un code déjà donné. */
    const pose = await redis.set(CLE(code), cadeau, { nx: true, ex: DUREE });
    if (pose) await redis.sadd(INDEX, code);
  } catch (e) {
    /* Base indisponible : on tente quand même l'envoi. Mieux vaut un
       client qui reçoit son code sans trace côté hôte que l'inverse. */
    console.error('Cadeau non enregistré', code, e);
  }

  try {
    await envoyerCodeCadeau(cadeau);
  } catch (e) {
    console.error('Envoi du code impossible', code, e);
    return new Response(
      JSON.stringify({ ok: false, error: 'Envoi impossible.' }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    );
  }

  return Response.json({ ok: true });
}
