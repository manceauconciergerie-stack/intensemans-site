/* ============================================================
   INTENSÉ'MANS — Catalogue
   ------------------------------------------------------------
   ⚠️  PRIX PROVISOIRES. Le brief indique « prix à définir » pour
   tous les produits. Les montants ci-dessous sont des propositions
   calibrées sur le marché français des love rooms (options entre
   19 et 55 €, packs entre 49 et 95 €). Un seul endroit à modifier.

   Tous les produits listés sont issus du brief : les 4 packs de la
   section 7-10, et les articles annoncés en section 11 « évolution
   future du site ». Rien n'a été inventé.
   ============================================================ */

const IM_CATEGORIES = [
  {
    id: 'packs',
    icon: 'coffret',
    name: 'Nos packs',
    desc: 'Des expériences complètes pour profiter pleinement de votre séjour.',
    img: 'produits/pack-intense-1.webp',
    alt: 'Pochon satin noir INTENSÉ’MANS Love Room',
    ph: 'Photo livrée — pochon satin de la marque'
  },
  {
    id: 'deguster',
    icon: 'coupe',
    name: 'À déguster',
    desc: 'Champagne, vin et planches apéritives.',
    ph: 'Photo à faire — planche et bouteille au frais, lumière de bougie, contre-jour'
  },
  {
    id: 'decorer',
    icon: 'rose',
    name: 'À décorer',
    desc: 'Pétales de roses et décorations romantiques.',
    ph: 'Photo à faire — pétales sur le lit vus de haut, éclairage rasant'
  },
  {
    id: 'attentions',
    icon: 'pochon',
    name: 'Petites attentions',
    desc: 'Cadeaux, gourmandises et surprises.',
    ph: 'Photo à faire — coffret ouvert sur la table de nuit, halo chaud'
  }
];

const IM_PRODUCTS = [

  /* ---------------- NOS PACKS ---------------- */

  {
    id: 'pack-intense',
    cat: 'packs',
    name: 'Pack Intense',
    kicker: 'Notre pack signature',
    price: 89,
    badge: { label: 'Best-seller', kind: 'rose' },
    signature: true,
    alcohol: true,
    adult: true,
    short: 'Tout ce qu’il faut pour profiter pleinement de votre parenthèse à deux.',
    desc: 'Une ambiance romantique, quelques bulles et de quoi pimenter votre soirée. Le Pack Intense rassemble tout ce qu’il faut pour profiter pleinement de votre parenthèse à deux.',
    includes: [
      'Pétales de roses disposés avant votre arrivée',
      '1 bouteille de champagne au frais',
      '1 accessoire intime, sous emballage scellé',
      '1 jeu de cartes coquin'
    ],
    img: 'produits/pack-intense.webp',
    alt: 'Pétales de roses, champagne au frais et pochon satin noir disposés sur un drap de satin anthracite',
    ph: 'Photo à faire — pétales sur satin, champagne au frais, pochon fermé, cartes en éventail',
    gallery: [
      { ph: 'Le pochon fermé', img: 'produits/pack-intense-1.webp',
        alt: 'Pochon en satin noir fermé par son ruban, posé sur un drap de satin' },
      { ph: 'Le champagne au frais', img: 'produits/pack-intense-2.webp',
        alt: 'Bouteille de champagne dans un seau à glace noir et deux flûtes servies' },
      { ph: 'Les cartes et les pétales', img: 'produits/pack-intense-3.webp',
        alt: 'Jeu de cartes noir étalé en éventail parmi des pétales de roses' }
    ],
    upsell: ['pack-double-bulles', 'deco-romantique']
  },

  {
    id: 'pack-planche-champagne',
    cat: 'packs',
    name: 'Pack Planche & Champagne',
    kicker: 'Planche pour deux + champagne',
    price: 69,
    alcohol: true,
    short: 'Quelques bulles, quelques gourmandises, et il ne reste plus qu’à profiter.',
    desc: 'Une planche raffinée à partager à deux, accompagnée d’une bouteille de champagne. Quelques bulles, quelques gourmandises et il ne reste plus qu’à profiter.',
    includes: [
      'Sélection de charcuteries',
      'Fromages affinés',
      'Accompagnements apéritifs',
      'Une petite touche gourmande',
      '1 bouteille de champagne'
    ],
    ph: 'Photo à faire — planche garnie et champagne dans le seau, vue 3/4, bougies au premier plan',
    gallery: [
      'Détail — charcuteries et fromages',
      'Détail — champagne au frais',
      'Ambiance — table dressée pour deux'
    ],
    upsell: ['petales-roses', 'pack-double-bulles']
  },

  {
    id: 'pack-planche-vin',
    cat: 'packs',
    name: 'Pack Planche & Vin',
    kicker: 'Planche pour deux + vin',
    price: 49,
    alcohol: true,
    short: 'L’idéal pour commencer votre soirée autour d’un moment convivial.',
    desc: 'Une planche généreuse à partager à deux, accompagnée d’une bouteille de vin soigneusement sélectionnée. L’idéal pour commencer votre soirée autour d’un moment convivial et gourmand.',
    includes: [
      'Sélection de charcuteries',
      'Fromages affinés',
      'Accompagnements apéritifs',
      'Une petite touche gourmande',
      '1 bouteille de vin'
    ],
    ph: 'Photo à faire — planche généreuse et bouteille de vin débouchée, deux verres, lumière chaude',
    gallery: [
      'Détail — la planche vue de haut',
      'Détail — le vin servi',
      'Ambiance — apéritif à deux'
    ],
    upsell: ['pack-planche-champagne', 'petales-roses']
  },

  {
    id: 'pack-double-bulles',
    cat: 'packs',
    name: 'Pack Double Bulles',
    kicker: 'Deux bouteilles de champagne',
    price: 79,
    alcohol: true,
    short: 'Parce qu’une bouteille peut parfois ne pas suffire.',
    desc: 'Parce qu’une bouteille peut parfois ne pas suffire… Prolongez votre soirée avec deux bouteilles de champagne à déguster à deux.',
    includes: [
      '2 bouteilles de champagne',
      'Mises au frais avant votre arrivée',
      '2 coupes préparées dans la suite'
    ],
    ph: 'Photo à faire — deux bouteilles dans un grand seau à glace, buée sur le verre, fond noir',
    gallery: [
      'Détail — les deux bouteilles',
      'Détail — coupes et glace',
      'Ambiance — seau posé près du bain'
    ],
    upsell: ['petales-roses', 'gourmandises']
  },

  {
    id: 'pack-anniversaire',
    cat: 'packs',
    name: 'Pack Anniversaire',
    kicker: 'Marquer la date',
    price: 79,
    alcohol: true,
    short: 'La suite décorée et le champagne au frais quand vous poussez la porte.',
    desc: 'Une décoration d’anniversaire installée avant votre arrivée, une bouteille de champagne au frais et une touche sucrée. Vous n’avez rien à préparer : tout est en place quand vous poussez la porte.',
    includes: [
      'Décoration d’anniversaire installée dans la suite',
      'Ballons et lettrage',
      '1 bouteille de champagne',
      'Une touche sucrée'
    ],
    ph: 'Photo à faire — décoration anniversaire installée, ballons noirs et rose poudré, champagne',
    gallery: [
      'Détail — le lettrage',
      'Détail — ballons et bougies',
      'Ambiance — la suite décorée'
    ],
    upsell: ['fleurs', 'chocolats']
  },

  /* ---------------- À DÉGUSTER ---------------- */

  {
    id: 'champagne-bouteille',
    cat: 'deguster',
    name: 'Bouteille de champagne',
    kicker: 'Au frais à votre arrivée',
    price: 45,
    alcohol: true,
    short: 'Mise au frais avant que vous arriviez, deux coupes prêtes.',
    desc: 'Une bouteille de champagne mise au frais avant votre arrivée, avec deux coupes préparées dans la suite. Rien à demander, rien à attendre.',
    includes: ['1 bouteille de champagne', 'Seau et glace', '2 coupes préparées'],
    ph: 'Photo à faire — bouteille dans le seau, buée, reflets de bougie',
    gallery: ['Détail — le col givré', 'Détail — les coupes', 'Ambiance — champagne près du bain'],
    upsell: ['petales-roses', 'planche-apero']
  },

  {
    id: 'planche-apero',
    cat: 'deguster',
    name: 'Planche apéritive',
    kicker: 'À partager à deux',
    price: 34,
    short: 'Charcuteries, fromages et accompagnements, prêts à partager.',
    desc: 'Une planche généreuse composée le jour de votre arrivée : charcuteries, fromages affinés, accompagnements et une petite touche gourmande.',
    includes: ['Sélection de charcuteries', 'Fromages affinés', 'Accompagnements apéritifs', 'Une touche gourmande'],
    ph: 'Photo à faire — planche vue de haut sur ardoise, cadrage serré, lumière latérale',
    gallery: ['Détail — charcuteries', 'Détail — fromages', 'Ambiance — planche et verres'],
    upsell: ['champagne-bouteille', 'vin-bouteille']
  },

  {
    id: 'vin-bouteille',
    cat: 'deguster',
    name: 'Bouteille de vin',
    kicker: 'Sélection de la maison',
    price: 24,
    alcohol: true,
    short: 'Un rouge ou un blanc choisi pour accompagner la planche.',
    desc: 'Une bouteille sélectionnée par nos soins, rouge ou blanc selon votre préférence, ouverte et prête à être servie.',
    includes: ['1 bouteille de vin', 'Rouge ou blanc, à préciser en commande', '2 verres préparés'],
    ph: 'Photo à faire — bouteille et deux verres servis, lumière chaude rasante',
    gallery: ['Détail — le verre servi', 'Détail — l’étiquette', 'Ambiance — vin et planche'],
    upsell: ['planche-apero', 'gourmandises']
  },

  {
    id: 'duo-cocktails',
    cat: 'deguster',
    name: 'Duo de cocktails',
    kicker: 'Préparés pour deux',
    price: 28,
    alcohol: true,
    short: 'Deux cocktails préparés et laissés au frais avant votre arrivée.',
    desc: 'Deux cocktails maison préparés le jour de votre arrivée et laissés au frais dans la suite, avec les verres et la glace.',
    includes: ['2 cocktails au choix', 'Verres et glace fournis', 'Préparés le jour de votre arrivée'],
    ph: 'Photo à faire — deux cocktails sur plateau miroir, glace, éclairage rose',
    gallery: ['Détail — le verre givré', 'Détail — le zeste', 'Ambiance — plateau près du bain'],
    upsell: ['gourmandises', 'petales-roses']
  },

  {
    id: 'selection-softs',
    cat: 'deguster',
    name: 'Sélection de softs',
    kicker: 'Sans alcool',
    price: 12,
    short: 'Boissons fraîches sans alcool, prêtes dans le réfrigérateur.',
    desc: 'Une sélection de boissons fraîches sans alcool placée dans le réfrigérateur de la suite avant votre arrivée.',
    includes: ['Eaux plates et pétillantes', 'Sodas et jus', 'Placés au frais avant votre arrivée'],
    ph: 'Photo à faire — bouteilles alignées dans le frigo ouvert, lumière froide contrastée',
    gallery: ['Détail — les bouteilles', 'Détail — verre et glace', 'Ambiance — le coin cuisine'],
    upsell: ['planche-apero', 'gourmandises']
  },

  /* ---------------- À DÉCORER ---------------- */

  {
    id: 'petales-roses',
    cat: 'decorer',
    name: 'Pétales de roses',
    kicker: 'Disposés avant votre arrivée',
    price: 25,
    short: 'Sur le lit et au sol. La première chose que vous voyez.',
    desc: 'Des pétales de roses disposés sur le lit et au sol avant votre arrivée. La première chose que vous voyez en poussant la porte.',
    includes: ['Pétales frais', 'Disposition sur le lit et au sol', 'Installés avant votre arrivée'],
    ph: 'Photo à faire — pétales sur draps satin, vue de haut légèrement inclinée, ombres douces',
    gallery: ['Détail — pétales sur l’oreiller', 'Détail — chemin de pétales', 'Ambiance — le lit complet'],
    upsell: ['champagne-bouteille', 'deco-romantique']
  },

  {
    id: 'deco-romantique',
    cat: 'decorer',
    name: 'Décoration romantique',
    kicker: 'La suite mise en scène',
    price: 39,
    short: 'Pétales, bougies et mise en scène complète de la suite.',
    desc: 'La suite entièrement mise en scène avant votre arrivée : pétales, bougies, lumières tamisées et détails soignés. Vous n’avez qu’à entrer.',
    includes: ['Pétales de roses', 'Bougies disposées dans la suite', 'Mise en lumière tamisée', 'Installation complète avant votre arrivée'],
    ph: 'Photo à faire — plan large de la suite décorée, bougies allumées, lumière rose tamisée',
    gallery: ['Détail — bougies', 'Détail — coin lit', 'Ambiance — plan large'],
    upsell: ['champagne-bouteille', 'fleurs']
  },

  {
    id: 'deco-anniversaire',
    cat: 'decorer',
    name: 'Décoration anniversaire',
    kicker: 'Installée avant votre arrivée',
    price: 45,
    short: 'Ballons, lettrage et bougies, installés sans que vous ayez rien à faire.',
    desc: 'Une décoration d’anniversaire installée dans la suite avant votre arrivée : ballons, lettrage et bougies, dans les tons de la maison.',
    includes: ['Ballons noirs et rose poudré', 'Lettrage personnalisable', 'Bougies', 'Installation avant votre arrivée'],
    ph: 'Photo à faire — mur de ballons et lettrage, tons noir et rose poudré',
    gallery: ['Détail — le lettrage', 'Détail — les ballons', 'Ambiance — la suite décorée'],
    upsell: ['champagne-bouteille', 'chocolats']
  },

  {
    id: 'ballons',
    cat: 'decorer',
    name: 'Ballons',
    kicker: 'Tons de la maison',
    price: 19,
    short: 'Une composition de ballons noirs et rose poudré.',
    desc: 'Une composition de ballons dans les tons de la maison, installée dans la suite avant votre arrivée.',
    includes: ['Composition de ballons', 'Noir et rose poudré', 'Installés avant votre arrivée'],
    ph: 'Photo à faire — grappe de ballons contre mur sombre, léger flou d’arrière-plan',
    gallery: ['Détail — reflets sur le ballon', 'Détail — la grappe', 'Ambiance — coin de la suite'],
    upsell: ['deco-anniversaire', 'petales-roses']
  },

  {
    id: 'deco-demande-mariage',
    cat: 'decorer',
    name: 'Demande en mariage',
    kicker: 'Une mise en scène sur mesure',
    price: 89,
    short: 'On prépare le décor. Vous n’avez qu’à poser la question.',
    desc: 'Une mise en scène préparée avec vous en amont : pétales, bougies, lettrage et champagne au frais. Nous installons tout avant votre arrivée. Vous n’avez qu’à poser la question.',
    includes: [
      'Échange préalable pour caler la mise en scène',
      'Pétales, bougies et lettrage',
      '1 bouteille de champagne au frais',
      'Installation complète avant votre arrivée'
    ],
    ph: 'Photo à faire — mise en scène demande en mariage, bougies au sol, lettrage, champagne',
    gallery: ['Détail — bougies au sol', 'Détail — le lettrage', 'Ambiance — plan large de la scène'],
    upsell: ['fleurs', 'pack-double-bulles']
  },

  /* ---------------- PETITES ATTENTIONS ---------------- */

  {
    id: 'chocolats',
    cat: 'attentions',
    name: 'Boîte de chocolats',
    kicker: 'Posée sur la table de nuit',
    price: 18,
    short: 'Une boîte de chocolats fins, déposée avec discrétion.',
    desc: 'Une boîte de chocolats fins déposée dans la suite avant votre arrivée, sur la table de nuit.',
    includes: ['Assortiment de chocolats fins', 'Déposée avant votre arrivée'],
    ph: 'Photo à faire — boîte ouverte sur table de nuit, halo chaud, arrière-plan sombre',
    gallery: ['Détail — les chocolats', 'Détail — la boîte fermée', 'Ambiance — table de nuit'],
    upsell: ['fleurs', 'champagne-bouteille']
  },

  {
    id: 'fleurs',
    cat: 'attentions',
    name: 'Bouquet de fleurs',
    kicker: 'Frais du jour',
    price: 32,
    short: 'Un bouquet frais, en vase, prêt dans la suite.',
    desc: 'Un bouquet composé le jour de votre arrivée, mis en vase et disposé dans la suite.',
    includes: ['Bouquet frais du jour', 'Vase fourni', 'Disposé avant votre arrivée'],
    ph: 'Photo à faire — bouquet en vase, lumière latérale douce, fond noir',
    gallery: ['Détail — une rose', 'Détail — le bouquet en pied', 'Ambiance — bouquet dans la suite'],
    upsell: ['chocolats', 'petales-roses']
  },

  {
    id: 'gourmandises',
    cat: 'attentions',
    name: 'Plateau de gourmandises',
    kicker: 'Pour la fin de soirée',
    price: 16,
    short: 'Un plateau sucré à picorer quand la soirée s’étire.',
    desc: 'Un petit plateau sucré préparé pour la fin de soirée, à picorer à deux quand la nuit s’étire.',
    includes: ['Assortiment sucré', 'Préparé le jour de votre arrivée', 'Déposé dans la suite'],
    ph: 'Photo à faire — plateau sucré en lumière basse, cadrage serré',
    gallery: ['Détail — le plateau', 'Détail — une bouchée', 'Ambiance — plateau et coupes'],
    upsell: ['champagne-bouteille', 'chocolats']
  }
];

/* ------------------------------------------------------------
   Fusion des visuels produits par tools/process_images.py.
   Un produit qui a déjà une photo écrite à la main n'est pas touché.
   ------------------------------------------------------------ */

if (typeof IM_IMAGES === 'object' && IM_IMAGES) {
  IM_PRODUCTS.forEach((p) => {
    const entry = IM_IMAGES[p.id];
    if (!entry || p.img) return;
    p.img = entry.img;
    p.amb = entry.amb || null;
    p.alt = `${p.name} — ${p.short}`;
    if (entry.gallery && entry.gallery.length) {
      p.gallery = entry.gallery.map((img, i) => ({
        ph: (p.gallery && typeof p.gallery[i] === 'string') ? p.gallery[i] : `${p.name} — détail`,
        img,
        alt: `${p.name}, détail`
      }));
    }
  });
  IM_CATEGORIES.forEach((c) => {
    const entry = IM_IMAGES[`cat-${c.id}`];
    if (!entry || c.img) return;
    c.img = entry.img;
    c.alt = `${c.name} — ${c.desc}`;
  });
}

/* ------------------------------------------------------------
   Accès
   ------------------------------------------------------------ */

const IM = {
  categories: IM_CATEGORIES,
  products: IM_PRODUCTS,
  byId: (id) => IM_PRODUCTS.find((p) => p.id === id),
  byCat: (cat) => IM_PRODUCTS.filter((p) => p.cat === cat),
  category: (id) => IM_CATEGORIES.find((c) => c.id === id),
  euro: (n) => new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2
  }).format(n)
};
