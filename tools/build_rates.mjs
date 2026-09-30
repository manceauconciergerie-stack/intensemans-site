/* ============================================================
   Génère site/assets/js/rates-public.js depuis site/api/_lib/grille.js

   Le calendrier n'affiche un prix que si /api/availability le lui
   donne : c'est la règle, et elle protège du cas le plus coûteux,
   afficher un montant et en débiter un autre.

   Mais sans backend (aperçu local, page ouverte sans `vercel dev`),
   l'API ne répond pas et le calendrier reste muet. Ce fichier fournit
   alors une grille de secours, annoncée comme indicative.

   grille.js ne dépend de rien : on le recopie tel quel, sans ses
   `export`, dans une fonction qui ne publie que prixNuit. Les
   montants et les règles n'existent donc qu'une seule fois. Le
   serveur reste seul juge au moment de débiter.

   Usage :  node tools/build_rates.mjs
   ============================================================ */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(ROOT, 'site/api/_lib/grille.js');
const TARGET = resolve(ROOT, 'site/assets/js/rates-public.js');

const src = readFileSync(SOURCE, 'utf8');
if (/^\s*import\s/m.test(src)) {
  throw new Error('grille.js ne doit rien importer : il est recopié dans le navigateur.');
}
const corps = src.replace(/^export\s+/gm, '');
if (!/function prixGrille\(/.test(corps)) throw new Error('prixGrille introuvable dans grille.js');

const sortie = `/* ============================================================
   INTENSÉ'MANS — Grille tarifaire, copie navigateur

   ⚠️ FICHIER GÉNÉRÉ. Ne pas modifier à la main.
      Source : site/api/_lib/grille.js
      Régénérer : node tools/build_rates.mjs

   Sert uniquement à afficher des prix quand /api/availability ne
   répond pas (aperçu local sans backend). Dès que l'API répond, ce
   sont ses prix qui s'affichent, et c'est le serveur qui débite.
   ============================================================ */

const IM_TARIFS = (() => {
${corps.split('\n').map((l) => (l ? `  ${l}` : l)).join('\n')}
  return { prixNuit: (iso) => prixGrille(iso) };
})();
`;

writeFileSync(TARGET, sortie, 'utf8');
console.log('rates-public.js écrit depuis site/api/_lib/grille.js');
