/* ============================================================
   INTENSÉ'MANS — La roue de bienvenue
   ------------------------------------------------------------
   POST { email, accord } → { ok, code, lot, gain, envoye }

   Le TIRAGE se fait ici. Il se faisait dans le navigateur, qui nous
   annonçait ensuite son lot et son code : impossible de plafonner un
   lot, et n'importe qui pouvait s'attribuer la planche. En novembre
   2026, deux planches sont sorties d'affilée. Le navigateur n'anime
   plus que le résultat qu'on lui renvoie.

   Règles :
   - plafond mensuel par lot (lots.js), tenu par un compteur Redis
     atomique : deux tours simultanés ne donnent pas deux planches ;
   - une adresse = une participation : rejouer renvoie le même code ;
   - le consentement aux offres est enregistré tel que coché.
   ============================================================ */

import { Redis } from '@upstash/redis';
import { randomInt } from 'node:crypto';
import { envoyerCodeCadeau } from './_lib/email.js';
import { LOTS, tirer, moisDeParis } from './_lib/lots.js';

const redis = Redis.fromEnv();

const CLE = (code) => `cadeau:${code}`;
const INDEX = 'cadeaux:index';
const PAR_EMAIL = (email) => `roue:email:${email}`;
const PLAFOND = (court, mois) => `roue:plafond:${court}:${mois}`;

/* Un an : au-delà, un code de bienvenue n'a plus lieu d'être, et
   conserver une adresse sans raison n'est pas permis. */
const DUREE = 60 * 60 * 24 * 365;
const DUREE_COMPTEUR = 60 * 60 * 24 * 40;

/* Sans 0/O ni 1/I/L : le code se recopie à la main. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const nouveauCode = () => `IM-${Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')}`;

const json = (corps, status = 200) => Response.json(corps, { status });
const propre = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const gainDe = (court) => (LOTS.find((l) => l.court === court) || {}).gain || court;
const reponse = (c, extra) => json({ ok: true, code: c.code, lot: c.lot, gain: gainDe(c.lot), ...extra });

/* Combien de fois ce lot est déjà sorti ce mois-ci, d'après les
   cadeaux enregistrés. Sert à amorcer le compteur la première fois :
   les planches données avant ce code comptent. */
async function dejaSortis(court, mois) {
  const codes = await redis.smembers(INDEX);
  if (!codes.length) return 0;
  const cadeaux = await redis.mget(...codes.map(CLE));
  return cadeaux.filter((c) => c && c.lot === court && moisDeParis(Date.parse(c.createdAt)) === mois).length;
}

/* Réserve une sortie de ce lot pour le mois. INCR est atomique : sur
   deux demandes simultanées, une seule passe sous le plafond. */
async function reserver(lot) {
  const mois = moisDeParis();
  const cle = PLAFOND(lot.court, mois);
  if ((await redis.get(cle)) === null) {
    await redis.set(cle, await dejaSortis(lot.court, mois), { nx: true, ex: DUREE_COMPTEUR });
  }
  return (await redis.incr(cle)) <= lot.plafondMensuel;
}

async function tirage() {
  let disponibles = [...LOTS];
  for (;;) {
    const lot = tirer(disponibles, randomInt(1_000_000) / 1_000_000);
    if (!lot.plafondMensuel || (await reserver(lot))) return lot;
    disponibles = disponibles.filter((l) => l !== lot);
  }
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return json({ error: 'Requête illisible.' }, 400);
  }

  const email = propre(payload.email, 160).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Adresse invalide.' }, 400);

  let cadeau;
  try {
    /* Déjà joué : on rend le même cadeau, sans nouveau tirage. */
    const dejaCode = await redis.get(PAR_EMAIL(email));
    const deja = dejaCode && await redis.get(CLE(dejaCode));
    if (deja) return reponse(deja, { envoye: false, deja: true });

    const code = nouveauCode();
    /* NX : sur deux demandes simultanées pour la même adresse, la
       seconde reçoit le code de la première. */
    if (!(await redis.set(PAR_EMAIL(email), code, { nx: true, ex: DUREE }))) {
      const autre = await redis.get(PAR_EMAIL(email));
      const c = autre && await redis.get(CLE(autre));
      if (c) return reponse(c, { envoye: false, deja: true });
    }

    const lot = await tirage();
    cadeau = {
      code,
      email,
      lot: lot.court,
      /* Le consentement est stocké avec l'adresse : sans lui, on n'a
         pas le droit d'écrire à cette personne plus tard. */
      accord: payload.accord === true,
      createdAt: new Date().toISOString()
    };
    await redis.set(CLE(code), cadeau, { nx: true, ex: DUREE });
    await redis.sadd(INDEX, code);
  } catch (e) {
    /* Sans base, ni plafond ni code vérifiable : on ne tourne pas. */
    console.error('Roue indisponible', e);
    return json({ error: 'La roue ne peut pas tourner pour l’instant. Réessayez dans un moment.' }, 503);
  }

  /* L'envoi peut échouer (Resend) : le code s'affiche de toute façon
     à l'écran, et le client est invité à le noter. */
  let envoye = true;
  try {
    await envoyerCodeCadeau(cadeau);
  } catch (e) {
    envoye = false;
    console.error('Envoi du code impossible', cadeau.code, e);
  }

  return reponse(cadeau, { envoye });
}
