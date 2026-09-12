/* ============================================================
   INTENSÉ'MANS — Demande et validation du lien de connexion
   ------------------------------------------------------------
   POST  { email }        envoie le lien si l'adresse est autorisée
   GET   ?t=<jeton>       consomme le lien et ouvre la session
   DELETE                 ferme la session

   La réponse au POST est toujours la même, que l'adresse soit
   autorisée ou non : sinon la page dirait à un curieux quelle
   adresse administre le site.
   ============================================================ */

import { creerLien, consommerLien, fermerSession, estAutorisee,
         poserCookie, retirerCookie } from './_lib/session.js';
import { envoyerLienConnexion } from './_lib/email.js';

const memeReponse = () => Response.json({ ok: true });

export async function POST(request) {
  let email = '';
  try {
    email = String((await request.json()).email || '').trim().toLowerCase();
  } catch (e) { /* corps illisible : même réponse */ }

  if (!estAutorisee(email)) return memeReponse();

  try {
    const t = await creerLien(email);
    const origin = new URL(request.url).origin;
    await envoyerLienConnexion(email, `${origin}/api/connexion?t=${encodeURIComponent(t)}`);
  } catch (e) {
    console.error('Lien de connexion non envoyé', e);
  }
  return memeReponse();
}

export async function GET(request) {
  const t = new URL(request.url).searchParams.get('t');
  const session = await consommerLien(t);

  /* Lien expiré ou déjà utilisé : on renvoie sur la page, qui
     proposera d'en redemander un. */
  if (!session) {
    return new Response(null, { status: 302, headers: { location: '/preparer.html?lien=expire' } });
  }

  return new Response(null, {
    status: 302,
    headers: { location: '/preparer.html', 'set-cookie': poserCookie(session) }
  });
}

export async function DELETE(request) {
  await fermerSession(request);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json', 'set-cookie': retirerCookie() }
  });
}
