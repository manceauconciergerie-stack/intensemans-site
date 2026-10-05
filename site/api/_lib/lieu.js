/* ============================================================
   INTENSÉ'MANS — Coordonnées du lieu et de l'hôte
   ------------------------------------------------------------
   Seul endroit côté serveur qui les porte : mails, page de paiement
   Stripe, description du paiement. Un changement de numéro se fait
   ici (ou par CONTACT_TEL), PLUS dans les copies navigateur, qui ne
   lisent pas le serveur : assets/js/stay-confirmation.js (LIEU) et
   assets/js/app.js (confirmation des attentions), ainsi que les
   pages légales (mentions-legales.html, cgv.html, build_pages.py).

   Le code de la boîte à clés n'y figure PAS volontairement : il est
   communiqué plus tard, de la main de l'hôte.
   ============================================================ */

export const LIEU = {
  adresse: '1 bis rue Jeanne d’Arc, 72000 Le Mans',
  tel: process.env.CONTACT_TEL || '06 40 08 10 45',
  telLien: 'tel:+33640081045'
};
