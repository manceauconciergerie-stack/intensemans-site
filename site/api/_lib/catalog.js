/* ============================================================
   Table des prix côté serveur — FICHIER GÉNÉRÉ, NE PAS MODIFIER.

   Source : site/assets/js/products.js
   Régénérer : node tools/build_catalog.mjs

   C'est la seule référence de prix qui fait foi. Le total envoyé par
   le navigateur n'est jamais utilisé pour débiter quoi que ce soit.
   ============================================================ */

export const CATALOG = Object.freeze({
  "pack-intense": {"name":"Pack Intense","price":89,"alcohol":true,"adult":true},
  "pack-planche-champagne": {"name":"Pack Planche & Champagne","price":69,"alcohol":true,"adult":false},
  "pack-planche-vin": {"name":"Pack Planche & Vin","price":49,"alcohol":true,"adult":false},
  "pack-double-bulles": {"name":"Pack Double Bulles","price":79,"alcohol":true,"adult":false},
  "pack-anniversaire": {"name":"Pack Anniversaire","price":79,"alcohol":true,"adult":false},
  "champagne-bouteille": {"name":"Bouteille de champagne","price":45,"alcohol":true,"adult":false},
  "planche-apero": {"name":"Planche apéritive","price":34,"alcohol":false,"adult":false},
  "vin-bouteille": {"name":"Bouteille de vin","price":24,"alcohol":true,"adult":false},
  "duo-cocktails": {"name":"Duo de cocktails","price":28,"alcohol":true,"adult":false},
  "selection-softs": {"name":"Sélection de softs","price":12,"alcohol":false,"adult":false},
  "petales-roses": {"name":"Pétales de roses","price":25,"alcohol":false,"adult":false},
  "deco-romantique": {"name":"Décoration romantique","price":39,"alcohol":false,"adult":false},
  "deco-anniversaire": {"name":"Décoration anniversaire","price":45,"alcohol":false,"adult":false},
  "ballons": {"name":"Ballons","price":19,"alcohol":false,"adult":false},
  "deco-demande-mariage": {"name":"Demande en mariage","price":89,"alcohol":false,"adult":false},
  "chocolats": {"name":"Boîte de chocolats","price":18,"alcohol":false,"adult":false},
  "fleurs": {"name":"Bouquet de fleurs","price":32,"alcohol":false,"adult":false},
  "gourmandises": {"name":"Plateau de gourmandises","price":16,"alcohol":false,"adult":false}
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
    if (!product) throw new Error(`Produit inconnu : ${item && item.id}`);

    const qty = Number.parseInt(item.qty, 10);
    if (!Number.isInteger(qty) || qty < 1 || qty > 9) {
      throw new Error(`Quantité invalide pour ${item.id}`);
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
