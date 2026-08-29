# État des photos — INTENSÉ'MANS

Mise à jour après la livraison du dossier `image/` (7 photos + 1 vidéo).

## Ce qui est intégré

| Photo source | Usage sur le site | Traitement |
|---|---|---|
| `PHOTO-…-49.jpg` — pochons satin de la marque | Visuel principal du **Pack Intense** + ses 3 vignettes + carte de la catégorie « Nos packs » | Recadrage hors des barres du screenshot, **débouchage des ombres** (l'original a une luminance moyenne de 8/255 : sur fond de page noir les pochons étaient invisibles), léger réchauffement, vignettage, extension du cadre avec la couleur de fond réelle |
| `PHOTO-…-47.jpg` — la chambre | **Photo du hero** de la page d'accueil | Recadrage 16:9, étalonnage chaud léger, vignettage. Les voiles sombres du hero ont été allégés en conséquence |
| `PHOTO-…-46 4.jpg` — le jacuzzi | Visuel de la page **À propos** | Recadrage serré 4:5 pour sortir le sol nu et la plinthe non finie, étalonnage chaud |
| `PHOTO-…-46.jpg` — le logo | Favicon, en-tête, pied de page, hero | Exports 512 et 160 px |

Tout est reproductible : `python3 tools/process_images.py`

## Ce qui n'est pas exploitable

**Ce sont des photos de chantier prises au téléphone, pas des photos produit.**
Aucun étalonnage ne rattrape ce qui suit :

| Photo | Pourquoi |
|---|---|
| `PHOTO-…-46 2.jpg` — salle de bain | Abattant des WC relevé, carton d'emballage et panière de produits d'entretien dans la douche, sacs plastique |
| `PHOTO-…-46 3.jpg` — cuisine | Cartons, chiffons, film plastique, bouteille d'eau, grille de four posée au sol, égouttoir encombré |
| `PHOTO-…-46 5.jpg` — le couloir | Carton d'outillage ouvert en bas à droite, visseuse visible, cache-prise démonté |
| `VIDEO-…-48.mp4` | Panoramique vertical au téléphone, flou de bougé. Inutilisable en fond de hero |

## Ce qui reste à faire

**17 produits sur 18 n'ont pas de photo.** Chaque emplacement vide affiche déjà
sa consigne de cadrage sur le site : il suffit de lire les cartons.

Le plan de prise de vue complet est dans [`plan-photos.md`](plan-photos.md).
Priorité absolue, dans l'ordre :

1. **Les 4 packs restants** — Planche & Champagne, Planche & Vin, Double Bulles, Anniversaire. Ce sont eux qui portent le panier moyen.
2. **Pétales de roses et Décoration romantique** — les deux options les plus achetées sur ce marché.
3. **Le champagne seul et la planche seule.**
4. Le reste.

## Trois remarques sur la photo de la chambre

Elle tient dans le hero parce que le voile sombre en couvre une partie, mais
trois défauts resteront visibles sur un grand écran :

- **Le lit est défait.** C'est le problème le plus grave : sur un site de Love Room, un lit froissé lit « pas nettoyé ». À refaire au carré, drap satin tiré.
- **Une bouteille d'eau en plastique** est posée derrière le fauteuil de gauche, et **un câble nu pend du plafond** au-dessus du lit.
- **La fenêtre est brûlée** en haut à droite : la photo est prise en plein jour. Une Love Room se photographie de nuit, volets fermés, aux lumières d'ambiance.

Une seule reprise de cette photo, de nuit, lit fait, néon allumé, table
débarrassée, et le hero passe de « acceptable » à « vendeur ».

## Un point à trancher

Les pochons portent une accroche imprimée : **« Les détails font les grands
souvenirs… »**. Le brief, lui, écrit pour la page catalogue : « Parce que les
plus beaux souvenirs se cachent dans les détails. » J'ai gardé la version du
brief sur le site et n'ai rien changé, mais les deux disent la même chose de
deux façons. L'accroche imprimée sur le produit physique est celle que le
client tient dans les mains — c'est probablement elle qu'il faut garder
partout. À valider.


---

# Série des packs — état et enseignements

Mise à jour après quatre tirages Nano Banana relus un par un.

## État

| Pack | Verdict | Reste à faire |
|---|---|---|
| Pack Intense | ✅ vraie photo (pochons satin de la marque) | — |
| Planche & Champagne | ✅ validé | déposer le fichier |
| Double Bulles | ✅ validé | déposer le fichier |
| Planche & Vin | ⚠️ acceptable, un tirage de plus recommandé | cierge jaune + flaque rouge sur le verre |
| Anniversaire | ❌ à photographier en vrai | le produit *est* la pièce, pas les accessoires |

## Ce que les relectures ont appris, et qui est maintenant dans le prompt

Ces cinq règles sont inscrites dans le bloc de style commun de
`tools/generate_product_photos.py`, donc elles s'appliquent aux 20 visuels.

1. **« Sans étiquette » ne suffit pas.** Le modèle comprend « étiquette sans
   marque » et pose un rectangle blanc, qui devient la zone la plus lumineuse
   du cadre. Formulation retenue : *bouteille en verre sombre entièrement nue,
   aucune étiquette — ni imprimée, ni vierge, ni blanche*.
2. **Le rideau rouge sur un seul côté.** En symétrique, la pièce devient un
   fond de studio et l'effet « vrai lieu » disparaît.
3. **Les bougies sont des veilleuses**, dans un simple verre, basses au premier
   plan, hors mise au point. Jamais de cierge ni de bougeoir laiton : la bougie
   ne doit jamais être l'objet le plus clair du cadre.
4. **Aucun reflet coloré étalé** sur le plateau de verre. Une flaque rouge lit
   « gélatine de studio », pas « bougie ».
5. **Le bas du cadre est fermé** par le plateau de la table : ni étagère
   inférieure, ni reflet inversé, ni sol vide. C'est là que la carte du
   coverflow affiche le nom, le prix et le bouton.

## La limite qui ne se corrige pas par un prompt

Trois tirages sur quatre ont inventé du mobilier ou une pièce qui n'existe pas
dans l'Airbnb. En plan serré ce n'est pas un problème : le sujet est la planche,
la pièce n'est qu'un flou. Dès que le cadre s'ouvre — cas du Pack Anniversaire,
dont le produit est la chambre décorée — un client qui a réservé sur les photos
de l'annonce verra une autre chambre. Ce pack doit être photographié pour de
vrai.
