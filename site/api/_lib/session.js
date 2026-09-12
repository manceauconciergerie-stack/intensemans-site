/* ============================================================
   INTENSÉ'MANS — Connexion par lien à usage unique
   ------------------------------------------------------------
   Importé par api/connexion.js (demande et validation du lien) et
   par _lib/auth.js (vérification à chaque appel de orders.js,
   cadeaux.js et synthese.js).

   Il n'y a aucun mot de passe dans ce système, donc rien à voler,
   rien à forcer, rien à faire fuiter. Ce qui protège l'accès est
   la boîte mail de l'hôte, qu'un attaquant ne contrôle pas.

   Deux jetons, deux durées :
     · le lien       15 minutes, à usage unique
     · la session    30 jours, révocable

   Le jeton de session vit dans un cookie HttpOnly : le JavaScript
   de la page ne peut pas le lire, donc une faille d'injection ne
   permet pas de le recopier ailleurs.
   ============================================================ */

import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const LIEN = (t) => `lien:${t}`;
const SESSION = (t) => `session:${t}`;

const DUREE_LIEN = 15 * 60;

/* Sept jours. La durée ne compte que si quelqu'un tient déjà
   l'appareil déverrouillé : un attaquant distant n'obtient jamais
   ce cookie, il est HttpOnly et lié au navigateur.

   Exiger un lien à chaque ouverture ne protégerait quasiment de
   rien de plus (qui a le téléphone a aussi la boîte mail) mais
   rendrait l'outil pénible au point d'être délaissé. Une sécurité
   qu'on contourne protège moins qu'une sécurité qu'on garde. */
const DUREE_SESSION = 7 * 24 * 60 * 60;

export const COOKIE = 'im_session';

/* 32 octets tirés du générateur cryptographique du système. */
const jeton = () => randomBytes(32).toString('base64url');

/* Les adresses autorisées. Une seule en pratique, mais la liste
   permet d'en ajouter une sans toucher au code. */
export function autorisees() {
  return (process.env.ADMIN_EMAILS || process.env.HOST_NOTIFY_EMAIL || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/* Comparaison à durée constante, comme pour un secret : une
   comparaison naïve laisse deviner l'adresse au chronomètre. */
export function estAutorisee(email) {
  const cible = String(email || '').trim().toLowerCase();
  return autorisees().some((a) => {
    const x = Buffer.from(a);
    const y = Buffer.from(cible);
    return x.length === y.length && timingSafeEqual(x, y);
  });
}

export async function creerLien(email) {
  const t = jeton();
  await redis.set(LIEN(t), { email, createdAt: new Date().toISOString() }, { ex: DUREE_LIEN });
  return t;
}

/* Usage unique : GETDEL lit et supprime dans la même opération, donc
   deux clics simultanés sur le même lien n'ouvrent qu'une session.
   Un lien intercepté puis déjà utilisé ne sert plus à rien. */
export async function consommerLien(t) {
  if (!t) return null;
  let donnee = null;
  try {
    donnee = await redis.getdel(LIEN(t));
  } catch (e) {
    /* Serveur sans GETDEL : lecture puis suppression. La fenêtre est
       infime et le lien reste à usage unique dans les faits. */
    donnee = await redis.get(LIEN(t));
    if (donnee) await redis.del(LIEN(t));
  }
  if (!donnee || !estAutorisee(donnee.email)) return null;

  const s = jeton();
  await redis.set(SESSION(s), { email: donnee.email, createdAt: new Date().toISOString() },
                  { ex: DUREE_SESSION });
  return s;
}

const jetonDuCookie = (request) => {
  const brut = request.headers.get('cookie') || '';
  const trouve = brut.split(';')
    .map((c) => c.trim().split('='))
    .find(([nom]) => nom === COOKIE);
  return trouve ? decodeURIComponent(trouve[1] || '') : '';
};

export async function sessionValide(request) {
  const t = jetonDuCookie(request);
  if (!t) return null;
  try {
    return await redis.get(SESSION(t));
  } catch (e) {
    return null;
  }
}

export async function fermerSession(request) {
  const t = jetonDuCookie(request);
  if (!t) return;
  try { await redis.del(SESSION(t)); } catch (e) { /* sans effet */ }
}

export const poserCookie = (t) =>
  `${COOKIE}=${encodeURIComponent(t)}; Path=/; Max-Age=${DUREE_SESSION}; HttpOnly; Secure; SameSite=Lax`;

export const retirerCookie = () =>
  `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
