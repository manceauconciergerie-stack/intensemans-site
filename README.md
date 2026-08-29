# INTENSÉ'MANS Love Room — prototype de la boutique d'extras

Prototype statique de la boutique de suppléments pré-arrivée décrite dans
`INTENSE MANS SITE.docx`. Le client a déjà réservé la Love Room, reçoit le lien
avec sa confirmation, choisit ses attentions et paie en ligne. L'hôte prépare
tout avant l'arrivée.

## Lancer le site

```bash
python3 -m http.server 4321 --directory site
```

Puis ouvrir http://localhost:4321

## Ce qui fonctionne

Le tunnel tient en deux écrans, parce que le client a déjà réservé sa nuit et
vient seulement ajouter des attentions :

`boutique (accueil) → validation → confirmation`

- Panier persistant (localStorage), quantités, retrait de ligne
- Ajout direct depuis la carte, détails dépliables sur place, sélecteur de quantité en ligne
- Barre de panier permanente : total et bouton de paiement toujours visibles
- Filtre de catégories collant qui suit la section lue
- Hero centré : entrée en fondu-flou décalée, photo encadrée, en-tête qui se
  resserre en pastille au défilement, mot qui défile (chaque mot est un produit)
- Packs en coverflow 3D : autoplay suspendu au survol et hors écran, glissé
  tactile, flèches clavier, ajout au panier depuis la carte centrale
- Upsells : « souvent ajouté ensemble » sur la fiche produit, suggestions dans la validation
- Formulaire séjour avec validation : nom de réservation, date, heure d'arrivée, n° de résa, message personnalisé
- Écran de confirmation avec numéro de commande
- Mention légale alcool affichée dès qu'un produit alcoolisé est au panier
- Mobile-first, vérifié à 375 px

## Le tableau de préparation

`/preparer.html` — **écran interne, aucun lien depuis le site public** et
`noindex`. C'est la vue demandée en section 15 du brief : les commandes
classées par date de séjour puis par heure d'arrivée, c'est-à-dire l'ordre
dans lequel l'hôte les prépare.

- Groupes : séjours passés, aujourd'hui, demain, puis chaque date
- Liseré de couleur par urgence : rouge pour une arrivée du jour non préparée,
  doré pour demain, bleu pour plus tard, vert pour préparé
- Point rose sur les commandes pas encore préparées, compteur en tête
- Clic sur une ligne : détail des articles, message du client, n° de commande,
  moyen de paiement
- Coche par ligne, « Tout marquer préparé », « Archiver les séjours passés »
  — l'archivage ne touche que ce qui est **passé et préparé**, jamais une
  commande à venir
- Cinq commandes d'exemple sont posées à la première ouverture ; toute commande
  passée depuis la boutique y apparaît immédiatement

En production, `orders.js` est la seule pièce à remplacer par un appel API.

## Ce qui n'est pas branché

C'est un prototype de validation. Volontairement absents :

- **Paiement réel.** Les boutons carte / Apple Pay / Google Pay sont une maquette.
- **Back-office produits.** Pas d'écran d'administration du catalogue (les prix et les produits se modifient dans `products.js`). Le tableau de préparation, lui, existe.
- **E-mails.** Ni confirmation client, ni notification à l'hôte.
- **Pages légales.** Mentions, CGV, confidentialité, remboursement, cookies : liens présents, contenu à rédiger.
- **Vérification d'âge.** Obligatoire pour la vente d'alcool, à mettre en place avec le paiement.

## Arborescence

```
site/
├── index.html              LA BOUTIQUE : ouverture + catalogue complet + FAQ
├── commander.html          panier, informations de séjour et paiement sur un écran
├── confirmation.html       confirmation de commande
├── produit.html            fiche détaillée (?id=…) — hors tunnel, pour les liens directs
├── preparer.html           TABLEAU DE PRÉPARATION — écran interne de l'hôte
├── a-propos.html
├── contact.html
└── assets/
    ├── css/
    │   ├── tokens.css      palette et échelles — échantillonnées sur le logo
    │   ├── base.css        reset, typographie, atmosphère
    │   └── components.css  tous les composants
    ├── js/
    │   ├── products.js     LE CATALOGUE — un seul endroit à modifier
    │   ├── cart.js         panier (à remplacer en production)
    │   ├── orders.js       registre des commandes (à remplacer en production)
    │   └── app.js          rendu et interactions
    └── img/logo.png

tools/build_pages.py            régénère les pages depuis un gabarit commun
tools/process_images.py         recadre, étalonne et exporte les photos en WebP
tools/stamp_assets.py           tampon de version sur les liens CSS/JS (anti-cache)
tools/generate_product_photos.py  génère les photos manquantes (Nano Banana 2)
docs/plan-photos.md         plan de prises de vue à donner au photographe
docs/migration-react.md     chemin Next.js + shadcn si la stack doit changer
docs/photos-etat.md         ce qui est intégré, ce qui est inexploitable, ce qui manque
image/                      photos sources livrées
reference/                  brief extrait + design system de loveroomspa.com
tasks/                      todo et leçons
```

## Ajouter des photos

Déposer les fichiers dans `image/`, déclarer le recadrage dans
`tools/process_images.py`, puis :

```bash
python3 tools/process_images.py
```

Les photos sortent en WebP dans `site/assets/img/`. Il reste à ajouter le champ
`img` au produit concerné dans `products.js` : la photo remplace alors
automatiquement le carton de consigne. Tant qu'un produit n'a pas de champ
`img`, le site affiche la consigne de cadrage à sa place — c'est voulu, ça sert
de liste de courses.

État actuel : **1 produit sur 18 est photographié**. Détail dans
[`docs/photos-etat.md`](docs/photos-etat.md).

## Modifier les prix ou les produits

Tout est dans `site/assets/js/products.js`. **Les prix actuels sont des
propositions**, le brief indiquait « à définir » partout. Ils sont calibrés sur
le marché français des love rooms (options 19-55 €, packs 49-95 €).

Après modification d'un gabarit de page, régénérer :

```bash
python3 tools/build_pages.py
```

`index.html` est écrit à la main et n'est pas régénéré par le script.

## Identité

Registre sombre. Le brief donne quatre couleurs — noir profond, rose poudré,
blanc cassé, crème — et les trois premières versions du site n'utilisaient que
la première. Ici le papier porte la page, l'encre porte le texte, le rose est
le seul accent, le noir sert de ponctuation.

| Rôle | Valeur | Contraste sur le fond |
|---|---|---|
| Fond | `#100c0d` → `#2d2425` (4 degrés chauds, jamais `#000`) | — |
| Texte de titre | `#f6ece4` | 16.7:1 |
| Texte courant | `#ddcfc6` | 12.8:1 |
| Texte atténué | `#a2938c` | 6.6:1 (5.1:1 sur le fond le plus élevé) |
| Rose lisible | `#e5a7a4` | 9.6:1 |
| Rose d'aplat (logo) | `#d98b88` | réservé aux fonds et aux accents |
| Laiton | `#d0ae72` | 9.2:1 |

Les jetons sont nommés par leur rôle (`--im-bg-*`, `--im-fg-*`, `--im-rule`),
pas par leur valeur : rebasculer en clair ne demande de toucher que
`tokens.css`. Aucune couleur littérale ne doit apparaître ailleurs.

Typographie : Cormorant Garamond (400/500/600, titres et sur-titres en
italique) + Jost (400/500/600, texte et interface). Chiffres en chasse
tabulaire partout où il y a des prix.

Aucun émoji dans l'interface : cinq icônes SVG dessinées pour le projet,
épaisseur de trait unique.

## Sur la référence

`reference/loveroomspa/` contient le design system de loveroomspa.com, scrapé
comme référence de niveau d'exigence : échelle typographique, rythme
d'espacement, patterns de sections. Aucun texte, aucune image et aucune couleur
de ce site n'a été reprise — la palette vient du logo INTENSÉ'MANS et les textes
sont originaux. C'est délibéré : reprendre leurs contenus serait une
contrefaçon, et dupliquer leurs textes ferait perdre tout bénéfice SEO.
