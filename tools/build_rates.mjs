/* ============================================================
   Génère site/assets/js/rates-public.js depuis site/api/_lib/rates.js

   Le calendrier n'affiche un prix que si /api/availability le lui
   donne : c'est la règle, et elle protège du cas le plus coûteux,
   afficher un montant et en débiter un autre.

   Mais sans backend (aperçu local, page ouverte sans `vercel dev`),
   l'API ne répond pas et le calendrier reste muet. Ce fichier fournit
   alors une grille de secours, annoncée comme indicative.

   Elle est GÉNÉRÉE, jamais écrite à la main : les montants et les
   coefficients n'existent qu'une seule fois, dans rates.js. Le serveur
   reste seul juge au moment de débiter.

   Usage :  node tools/build_rates.mjs
   ============================================================ */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(ROOT, 'site/api/_lib/rates.js');
const TARGET = resolve(ROOT, 'site/assets/js/rates-public.js');

const src = readFileSync(SOURCE, 'utf8');

/* On extrait les littéraux plutôt que d'importer le module : celui-ci
   lit process.env et n'a rien à faire dans un navigateur. */
function bloc(nom, ouvrant, fermant) {
  const debut = src.indexOf(`const ${nom} = ${ouvrant}`);
  if (debut < 0) throw new Error(`${nom} introuvable dans rates.js`);
  let profondeur = 0;
  for (let i = debut; i < src.length; i++) {
    if (src[i] === ouvrant) profondeur++;
    else if (src[i] === fermant) {
      profondeur--;
      if (profondeur === 0) return src.slice(src.indexOf(ouvrant, debut), i + 1);
    }
  }
  throw new Error(`${nom} : littéral non refermé`);
}

function nombre(nom) {
  const m = src.match(new RegExp(`const ${nom} = ([0-9.]+);`));
  if (!m) throw new Error(`${nom} introuvable dans rates.js`);
  return m[1];
}

const sortie = `/* ============================================================
   INTENSÉ'MANS — Grille tarifaire, copie navigateur

   ⚠️ FICHIER GÉNÉRÉ. Ne pas modifier à la main.
      Source : site/api/_lib/rates.js
      Régénérer : node tools/build_rates.mjs

   Sert uniquement à afficher des prix quand /api/availability ne
   répond pas (aperçu local sans backend). Dès que l'API répond, ce
   sont ses prix qui s'affichent, et c'est le serveur qui débite.
   ============================================================ */

const IM_TARIFS = (() => {
  const BASE = ${bloc('BASE', '{', '}')};

  const SAISONS = ${bloc('SAISONS', '[', ']')};

  const DERNIERE_MINUTE_JOURS = ${nombre('DERNIERE_MINUTE_JOURS')};
  const DERNIERE_MINUTE_COEF = ${nombre('DERNIERE_MINUTE_COEF')};

  const dansLaPeriode = (mois, jour, [m1, j1], [m2, j2]) => {
    const v = mois * 100 + jour;
    return v >= m1 * 100 + j1 && v <= m2 * 100 + j2;
  };

  function prixNuit(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return null;

    let prix = BASE[d.getDay()];

    for (const saison of SAISONS) {
      if (dansLaPeriode(d.getMonth() + 1, d.getDate(), saison.du, saison.au)) {
        prix *= saison.coef;
        break;
      }
    }

    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const reste = Math.round((new Date(dateStr + 'T00:00:00') - aujourdhui) / 86400000);
    if (reste >= 0 && reste <= DERNIERE_MINUTE_JOURS) prix *= DERNIERE_MINUTE_COEF;

    return Math.round(prix);
  }

  return { prixNuit };
})();
`;

writeFileSync(TARGET, sortie, 'utf8');
console.log('rates-public.js écrit depuis site/api/_lib/rates.js');
