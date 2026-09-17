/* ============================================================
   INTENSÉ'MANS — Accès Stripe partagé
   ------------------------------------------------------------
   Les clés sont nettoyées de TOUT caractère blanc, y compris au
   milieu. Une clé Stripe n'en contient jamais, et un simple retour
   à la ligne collé par mégarde suffit à faire lever Node à la
   construction de l'en-tête « Authorization » (ERR_INVALID_CHAR).
   Le SDK maquille ensuite l'incident en « erreur de connexion à
   Stripe », ce qui envoie chercher un problème réseau là où il n'y
   a qu'un caractère invisible.

   S'il reste malgré tout un caractère interdit (guillemet
   typographique, espace fine, caractère de contrôle), on le
   signale par sa POSITION et son code, jamais par sa valeur : un
   log ne doit pas laisser fuiter une clé secrète.

   Le client est construit au premier appel, jamais au chargement
   du module : une clé absente ne doit casser que la fonction qui
   s'en sert, pas tout ce qui importe ce fichier.
   ============================================================ */

import Stripe from 'stripe';

function cle(nom) {
  const brut = String(process.env[nom] == null ? '' : process.env[nom]);
  const propre = brut.replace(/\s+/g, '');

  if (!propre) {
    console.error(`Variable ${nom} absente ou vide.`);
    return '';
  }

  /* Une clé Stripe n'est faite que de lettres et de chiffres après
     son préfixe. Tout le reste trahit un copier-coller du MASQUE
     affiché par le tableau de bord (sk_test_51Ab•••••yIiM), qui a
     la bonne longueur et le bon début mais pas le bon milieu. */
  const forme = /^(sk|rk|whsec)_[A-Za-z0-9_]+$/;
  if (!forme.test(propre)) {
    const intrus = [...new Set(propre.replace(/[A-Za-z0-9_]/g, ''))];
    const codes = intrus.map(
      (c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')
    );
    console.error(
      `${nom} n'a pas la forme d'une clé Stripe : ${propre.length} caractères, ` +
      `dont ${intrus.length} type(s) de caractère interdit (${codes.join(' ')}). ` +
      `C'est la signature d'une clé MASQUÉE copiée à la souris. ` +
      `Utiliser l'icône de copie du tableau de bord Stripe.`
    );
  }

  return propre;
}

let client = null;

export function stripe() {
  if (!client) client = new Stripe(cle('STRIPE_SECRET_KEY'));
  return client;
}

export const webhookSecret = () => cle('STRIPE_WEBHOOK_SECRET');
