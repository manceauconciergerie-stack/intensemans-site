# Plan de prises de vue — INTENSÉ'MANS

Le brief est clair : **pas de photos catalogue**. Tout doit être photographié
dans la Love Room, lumière tamisée, ambiance nocturne. Ces photos sont le
premier levier de conversion du site — devant les prix, devant les textes.

Chaque placeholder du prototype affiche déjà la consigne de cadrage attendue.
Le texte de chaque consigne est dans `site/assets/js/products.js`, champ `ph`
pour la photo principale et `gallery` pour les trois vignettes.

## Réglages communs

| | |
|---|---|
| Moment | Après la tombée de la nuit, volets fermés |
| Lumière | Deux sources maximum : une bougie ou lampe chaude en amorce, une source rasante latérale. Jamais de flash, jamais de plafonnier. |
| Balance des blancs | Chaude, ~3000 K. Les rouges vifs tirent vite sur le kitsch — rester sur le rose poudré et l'ambre. |
| Ouverture | f/1.8 à f/2.8, arrière-plan flou. C'est ce qui sépare une photo de love room d'une photo d'Airbnb. |
| Orientation | **Portrait 4:5** pour les photos principales, **carré 1:1** pour les vignettes. Le site est construit sur ces deux ratios. |
| Format de livraison | JPEG qualité 90, 2000 px sur le grand côté. La conversion en WebP se fera à l'intégration. |
| À exclure du cadre | Prises électriques, télécommandes, extincteur, étiquettes de prix, marques d'alcool identifiables en gros plan. |

## Liste de prises de vue

19 photos principales + 3 vignettes par produit. Pour aller vite : shooter les
5 packs en priorité, ils représentent l'essentiel du panier moyen.

### Priorité 1 — les packs (5 produits)

| Produit | Photo principale | Vignettes |
|---|---|---|
| Pack Intense | Mise en scène complète sur le lit : pétales, seau à champagne, coffret **fermé**, lumière rasante | Pétales et coupes · Coffret fermé · Lit satin en pied |
| Pack Planche & Champagne | Planche garnie + champagne dans le seau, vue 3/4, bougies au premier plan | Charcuteries et fromages · Champagne au frais · Table dressée |
| Pack Planche & Vin | Planche généreuse, bouteille débouchée, deux verres | Planche vue de haut · Vin servi · Apéritif à deux |
| Pack Double Bulles | Deux bouteilles dans un grand seau à glace, buée sur le verre, fond noir | Les deux bouteilles · Coupes et glace · Seau près du bain |
| Pack Anniversaire | Décoration installée, ballons noirs et rose poudré, champagne | Le lettrage · Ballons et bougies · La suite décorée |

### Priorité 2 — à déguster et à décorer (10 produits)

Champagne · Planche apéritive · Vin · Duo de cocktails · Softs
Pétales de roses · Décoration romantique · Décoration anniversaire · Ballons · Demande en mariage

### Priorité 3 — petites attentions (3 produits)

Chocolats · Fleurs · Plateau de gourmandises

### Plus la photo d'ambiance du hero

Plan large de la Love Room de nuit : lit satin, lumière tamisée rose, bougies,
jacuzzi en amorce. **Format paysage**, elle occupe tout le haut de la page
d'accueil. C'est la seule photo que 100 % des visiteurs verront.

## Le point sur lequel ne pas se tromper

Le Pack Intense contient un accessoire intime. Il doit apparaître **emballé et
fermé** sur la photo. Le brief interdit explicitement l'aspect vulgaire ou
pornographique, et une photo explicite ferait basculer le site d'un côté dont
il ne revient pas — en plus de poser un problème avec les processeurs de
paiement et les régies publicitaires.

## Intégration

Déposer les fichiers dans `site/assets/img/produits/` en respectant la
nomenclature de l'identifiant produit :

```
pack-intense.jpg
pack-intense-1.jpg  pack-intense-2.jpg  pack-intense-3.jpg
petales-roses.jpg
...
```

Une fois les photos livrées, les placeholders sont remplacés en une passe :
c'est la fonction `placeholder()` dans `site/assets/js/app.js` qui bascule sur
de vraies balises `<img>`.


---

# Pack Anniversaire — brief de tournage

Ce pack est le seul qui ne peut pas être généré : son produit **est** la chambre
décorée, pas un accessoire posé sur une table. Quatre tirages successifs ont
tous inventé du mobilier — lampadaire, parquet, tapis, corniche. Un client qui
a réservé sur les photos de l'annonce verrait une autre chambre.

Le tirage généré sert donc de référence de mise en scène. Voici ce qu'il faut
acheter et comment l'installer pour reproduire la même image dans la vraie
pièce.

## Achats

| Élément | Détail |
|---|---|
| Ballons | Environ 35 à 40, **latex mat** uniquement — noir et rose poudré. Tailles mélangées : 12 cm, 25 cm, 30 cm. Aucun ballon métallisé, aucun chiffre, aucune lettre. |
| Bande à arche | Ruban perforé pour arche organique, 5 m |
| Guirlande | Guirlande à ampoules type Edison, lumière chaude (2200 à 2700 K), 10 m, câble noir |
| Bougies | 2 bougies cierges + 2 piliers, cire **blanc cassé** jamais jaune, sur bougeoirs laiton |
| Macarons | 8 à 10, rose pâle uniforme, sur une petite assiette à liseré doré |
| Seau | Le seau noir mat déjà utilisé pour les autres packs |

## Installation

L'arche part du **bas à gauche** du mur noir et monte en diagonale vers la
droite, en grappe irrégulière — jamais une arche symétrique. La guirlande passe
derrière, en deux ou trois festons lâches, pour poser des points de lumière
flous derrière les ballons.

La table dorée se place au **premier plan à droite**, avec le seau, la
bouteille, les deux flûtes, l'assiette de macarons et les bougies groupées.

## Prise de vue

- **Portrait 4:5**, appareil à hauteur de la table, léger recul
- Le **rideau de velours rouge en amorce sur le bord gauche** seulement
- Volets fermés, plafonnier éteint : uniquement la guirlande et les bougies
- 50 mm à f/2,8 — un peu plus fermé que les plans serrés, pour garder les
  ballons lisibles
- **Cadrer serré sur l'arche et la table.** Ne pas laisser entrer le lit, le
  sol ni le plafond : ce sont eux qui trahissent le lieu sur les tirages générés
- Vérifier avant de déclencher : aucune prise électrique, aucun bloc
  d'alimentation de guirlande, aucun emballage de ballons dans le cadre

## Ce que ça débloque

Une fois cette photo faite, elle sert aussi pour le produit **Décoration
anniversaire** (45 €) et, en recadrage serré sur les ballons, pour **Ballons**
(19 €). Une seule séance couvre trois articles du catalogue.
