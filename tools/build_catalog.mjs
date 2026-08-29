/* ============================================================
   Génère site/api/_lib/catalog.js depuis site/assets/js/products.js

   Le serveur ne doit jamais faire confiance au prix envoyé par le
   navigateur. Il lui faut donc sa propre table des prix — mais une
   copie tenue à la main finirait par diverger, et un écart entre le
   prix affiché et le montant débité est un bug qui coûte de l'argent.
   D'où cette extraction : products.js reste la seule source.

   Usage :  node tools/build_catalog.mjs
   ============================================================ */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(ROOT, 'site/assets/js/products.js');
const TARGET = resolve(ROOT, 'site/api/_lib/catalog.js');

/* products.js est un script de navigateur sans dépendance au DOM :
   on l'exécute tel quel dans un bac à sable pour lire les vraies
   valeurs, plutôt que d'essayer de les deviner à l'expression
   régulière. */
const sandbox = { IM_IMAGES: null, Intl };
vm.createContext(sandbox);
/* `const` ne se pose pas sur l'objet global : on relit la liaison
   dans le même contexte, où la portée lexicale persiste. */
vm.runInContext(readFileSync(SOURCE, 'utf8'), sandbox, { filename: SOURCE });
const products = vm.runInContext('IM_PRODUCTS', sandbox);
if (!Array.isArray(products) || !products.length) {
  throw new Error(`Aucun produit lu dans ${SOURCE}`);
}

const entries = products.map((p) => {
  if (!p.id || typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price <= 0) {
    throw new Error(`Produit invalide (id ou prix) : ${JSON.stringify(p.id)}`);
  }
  return [p.id, {
    name: p.name,
    price: p.price,
    alcohol: Boolean(p.alcohol),
    adult: Boolean(p.adult)
  }];
});

const body = entries
  .map(([id, p]) => `  ${JSON.stringify(id)}: ${JSON.stringify(p)}`)
  .join(',\n');

mkdirSync(dirname(TARGET), { recursive: true });

writeFileSync(TARGET, `/* ============================================================
   Table des prix côté serveur — FICHIER GÉNÉRÉ, NE PAS MODIFIER.

   Source : site/assets/js/products.js
   Régénérer : node tools/build_catalog.mjs

   C'est la seule référence de prix qui fait foi. Le total envoyé par
   le navigateur n'est jamais utilisé pour débiter quoi que ce soit.
   ============================================================ */

export const CATALOG = Object.freeze({
${body}
});

/* Recalcule une commande à partir des seuls identifiants et quantités
   reçus. Renvoie les lignes vérifiées et le total en centimes.
   Lève si un identifiant est inconnu : mieux vaut refuser la commande
   que débiter un montant qu'on ne sait pas justifier. */
export function priceOrder(items) {
  if (!Array.isArray(items) || !items.length) {
    throw new Error('Panier vide');
  }
  if (items.length > 40) {
    throw new Error('Panier trop grand');
  }

  const lines = items.map((item) => {
    const product = CATALOG[item && item.id];
    if (!product) throw new Error(\`Produit inconnu : \${item && item.id}\`);

    const qty = Number.parseInt(item.qty, 10);
    if (!Number.isInteger(qty) || qty < 1 || qty > 9) {
      throw new Error(\`Quantité invalide pour \${item.id}\`);
    }

    const unitCents = Math.round(product.price * 100);
    return {
      id: item.id,
      name: product.name,
      qty,
      unitCents,
      totalCents: unitCents * qty,
      total: product.price * qty,
      alcohol: product.alcohol,
      adult: product.adult
    };
  });

  return {
    lines,
    totalCents: lines.reduce((sum, l) => sum + l.totalCents, 0),
    hasAlcohol: lines.some((l) => l.alcohol),
    hasAdult: lines.some((l) => l.adult)
  };
}
`, 'utf8');

console.log(`catalog.js — ${entries.length} produits écrits dans ${TARGET.replace(ROOT + '/', '')}`);
