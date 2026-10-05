/* ============================================================
   INTENSÉ'MANS — Vérification d'un code promo
   ------------------------------------------------------------
   GET ?code=VANESSA10 → { valide, code, apporteur, remise }

   Sert seulement à afficher le bon total avant la page Stripe. Le
   montant débité, lui, est recalculé par create-stay-session.js :
   un navigateur qui mentirait sur la remise n'y gagnerait rien.
   ============================================================ */

import { trouverPromo } from './_lib/promos.js';

export function GET(request) {
  const promo = trouverPromo(new URL(request.url).searchParams.get('code'));
  if (!promo) return Response.json({ valide: false }, { status: 404 });
  return Response.json({
    valide: true, code: promo.code, apporteur: promo.apporteur, remise: promo.remise
  });
}
