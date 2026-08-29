# TODO — INTENSÉ'MANS LOVE ROOM

## Contexte
Boutique de suppléments pré-arrivée pour la Love Room INTENSÉ'MANS (Le Mans).
Le client a déjà réservé (Airbnb/Booking) → reçoit le lien dans son mail de confirmation
→ commande ses attentions → paie → l'hôte prépare avant l'arrivée.

Référence de craft visuel : loveroomspa.com (scrapée dans `reference/loveroomspa/`).
Palette imposée par le logo : noir / rose poudré #D98B88 / crème #EAD2C1 / doré discret.

## Décisions actées
- [x] Prototype statique d'abord, boutique branchée après validation du pote
- [x] Pas de photos produits disponibles → placeholders élégants + shot list à fournir
- [x] Palette dérivée du logo, pas de celle de la référence
- [x] Ajout d'upsells dans le tunnel (absents du brief)

## Phase 2 — Lisibilité et restructuration du tunnel  ✅ terminée

Retour utilisateur : « trop sombre, on ne voit rien » + « la structure ne va pas ».

### Lisibilité
- [x] Fond de page passé du noir absolu (#000) à #0a0809, surfaces échelonnées jusqu'à #221b1d
      — sans écart entre le fond et les cartes, tout se confondait
- [x] Texte éclairci : corps #cbb9ac → #e0d1c7, atténué #8e8078 → #ab9c93
- [x] Filets remontés de 0.14 à 0.20 d'opacité
- [x] Corps de texte 0.95 → 1 rem, descriptions 0.86 → 0.92 rem
- [x] Prix 1.02 → 1.3 rem en crème, nom de produit 1.28 → 1.42 rem
- [x] Cartes produit matérialisées : bordure, fond propre, survol
- [x] Bouton « Ajouter » en contour rose plein au lieu d'un contour gris
- [x] Placeholders éclaircis : ils tenaient des trous noirs dans la grille

### Structure — six étapes ramenées à deux
Le client a déjà réservé et payé sa nuit. Il arrive d'un mail de confirmation
sur son téléphone pour ajouter deux ou trois attentions. L'ancien parcours
lui imposait quatre chargements de page avant de pouvoir payer.

- [x] La boutique devient la page d'accueil (page catalogue séparée supprimée)
- [x] Ouverture raccourcie : 62 vh au lieu d'un hero plein écran, le catalogue
      est visible en un défilement
- [x] Ajout direct depuis la carte, détails dépliables sur place
      → la fiche produit sort du chemin critique (conservée pour les liens directs)
- [x] Panier + informations fusionnés en un seul écran `commander.html`
- [x] Barre de panier permanente : total et bouton de paiement toujours visibles
- [x] Filtre de catégories collant, avec suivi de la section lue
- [x] Sélecteur de quantité directement sur la carte dès qu'un produit est au panier
- [x] Navigation resserrée : La boutique / Packs / À propos / Contact

### Bug trouvé en vérifiant
- [x] `data-cartbar` était posé sur la barre **et** sur `body` : `querySelector`
      renvoyait `body`, et le deuxième changement de panier écrasait toute la page.
      Attribut du corps renommé en `data-has-cartbar`.

## Phase 1.5 — Intégration des photos livrées  ✅ terminée
- [x] Pipeline `tools/process_images.py` : recadrage aux ratios du site, étalonnage, export WebP
- [x] Bascule photo/placeholder dans le rendu (champ `img` sur un produit → la photo remplace le carton)
- [x] Pochons satin → Pack Intense + vignettes + carte catégorie
- [x] Chambre → hero de l'accueil, voiles du hero réajustés (ils écrasaient la photo)
- [x] Jacuzzi → page À propos
- [x] Débouchage des ombres sur les visuels noir sur noir (luminance moyenne 8/255 à l'origine)
- [x] Tri des sources : 4 photos sur 8 écartées, motifs documentés

## Phase 1 — Prototype statique  ✅ terminée
- [x] Design system (tokens, typo, composants)
- [x] Accueil — visuel immersif + « PERSONNALISER MON SÉJOUR »
- [x] Catalogue par catégories (À déguster / À décorer / Nos packs / Petites attentions)
- [x] Fiche produit (photo, description, inclus, prix, upsell « souvent ajouté ensemble »)
- [x] Panier (récap, quantités, order bump)
- [x] Informations séjour (nom, date, heure d'arrivée, n° résa, message)
- [x] Confirmation de commande
- [x] Mobile-first vérifié à 375px
- [x] Shot list photos → `docs/plan-photos.md`
- [x] Pages À propos et Contact (menu du brief)

Vérifié dans le navigateur : tunnel complet cliquable, aucune erreur console.
Bugs trouvés et corrigés pendant la vérification :
- récapitulatif du panier périmé après ajout d'un upsell
- en-tête débordant sous 560px (burger hors écran)
- marge basse du fil d'étapes écrasée par une règle de reset

## Phase 2 — Après validation (hors périmètre actuel)
- [ ] Choix stack définitif (WooCommerce vs Next.js)
- [ ] Paiement réel (Stripe : CB / Apple Pay / Google Pay)
- [ ] Back-office : produits + commandes triées par date de séjour
- [ ] Mail auto client + hôte
- [ ] Vérification d'âge (alcool), CGV, mentions légales, cookies
- [ ] Prix définitifs à valider avec le pote

## Phase 2.5 — Hero animé  ✅ terminée
Reprise de l'idée du composant React `animated-hero` fourni, sans migrer la stack.
- [x] Mot qui défile verticalement, débordement masqué, trois états de position
- [x] Transition avec dépassement `cubic-bezier(0.24, 1.4, 0.4, 1)` en place du
      ressort framer-motion (`stiffness: 50`)
- [x] Les 5 mots sont des produits du catalogue, pas des adjectifs décoratifs
- [x] Tous les mots dans le DOM, `aria-hidden` sur les inactifs
- [x] Animation stoppée hors écran et en onglet arrière-plan
- [x] `prefers-reduced-motion` : premier mot figé, aucune animation
- [x] Puce d'accroche + deux CTA avec icônes SVG en ligne
- [x] Image de fond : la vraie photo du lieu, art direction 16:9 / 3:4
- [x] Vérifié : cycle complet des 5 mots, bouclage propre, aucun débordement
      horizontal à 360 px, hauteur du titre stable (pas de saut de mise en page)
- [x] Chemin de migration React documenté dans `docs/migration-react.md`

## Phase 2.6 — Tableau de préparation  ✅ terminée
Portage du composant React `NotificationCenter` fourni, sans migrer la stack.
Répond à la section 15 du brief, qui n'était pas couverte.

- [x] `orders.js` : registre des commandes, tri par date de séjour puis heure d'arrivée
- [x] `preparer.html` : écran interne, `noindex`, aucun lien depuis le site public
- [x] Lignes groupées par jour (passés / aujourd'hui / demain / dates suivantes)
- [x] Liseré d'urgence : rouge arrivée du jour non préparée, doré demain, bleu plus tard, vert préparé
- [x] Point « non préparé », compteur en tête, corps dépliable au clic
- [x] Détail déplié : articles chiffrés, message du client, n° de commande, paiement
- [x] Actions groupées : coche par ligne, tout marquer préparé, archiver
- [x] Garde-fou : l'archivage ne supprime que ce qui est **passé et préparé**
- [x] Délai exprimé comme l'hôte y pense (« dans 40 min », « dans 3 jours », « hier »)
- [x] Pictogramme dérivé de la catégorie dominante de la commande
- [x] Boucle complète vérifiée : commande passée sur la boutique → apparaît
      aussitôt sur le tableau, ton rouge, message et articles corrects

## Phase 4 — Refonte visuelle  ✅ terminée
Retour utilisateur : « moche, pas harmonieux, trop sombre » — deuxième fois
sur le « trop sombre ». Passage par le skill `redesign-skill` plutôt que
d'ajuster encore le contraste à l'intérieur du noir.

### Le vrai diagnostic
Le site tenait sur **une seule valeur** du haut en bas. Aucun rythme entre
les sections, aucune respiration. Ce n'était pas un problème de contraste,
c'était le registre.

### Bascule sur le registre crème
- [x] Fond papier `#f7f1ea`, quatre degrés d'une même famille (jamais de saut de valeur)
- [x] Encre `#191113` pour le texte, rose et laiton en accents uniques
- [x] Le noir devient un accent : photo du hero, pied de page, boutons pleins
- [x] Ratios de contraste calculés : rose porté de 4.39:1 à **5.48:1**,
      laiton de 3.48:1 à **5.47:1** — les deux échouaient en petit corps
- [x] Ombres teintées chaud, source de lumière unique

### Motifs génériques supprimés (grille du skill)
- [x] Sur-titres en capitales espacées partout → italique serif en bas de casse
- [x] Carte générique bordure + fond + ombre → image portée par une ombre teintée, sans cadre
- [x] Grille de boîtes identiques → le pack signature occupe deux colonnes en format horizontal
- [x] Badges en pilule → fanions carrés à filet
- [x] Deux fanions empilés disant la même chose → un seul
- [x] Un bouton plein + un bouton fantôme → un plein + un lien texte souligné
- [x] FAQ en accordéon → liste en deux colonnes, tout lisible d'un coup d'œil
- [x] Pied de page en 4 colonnes → 2 blocs
- [x] Rayon de bordure uniforme → échelle de 4 rayons
- [x] Poids 300/400 seulement → 400/500/600 sur les deux familles
- [x] Émojis couleur des catégories → jeu de 5 icônes SVG dessinées, épaisseur unique
- [x] `z-index` au hasard → échelle nommée dans les jetons
- [x] `100vh` → `100dvh`
- [x] Cœur émoji noir dans les titres → glyphe texte rose

### Oublis comblés
- [x] Lien d'évitement clavier sur toutes les pages
- [x] `og:title`, `og:description`, `og:image`, `twitter:card`
- [x] `text-wrap: balance` sur les titres, `pretty` sur les paragraphes

### Bug trouvé en vérifiant
- [x] La barre de panier client s'affichait sur le tableau interne de l'hôte
- [x] La carte signature étirée sur deux colonnes faisait 939 px de haut et
      cassait la grille → format horizontal contraint en 1:1

## Phase 5 — Hero premium et coverflow des packs  ✅ terminée

### Retour à un thème sombre, correctement étagé
Le registre crème avait réglé la lisibilité mais le client veut le noir.
Reprise du sombre **sans** refaire l'erreur du noir plat.
- [x] Jetons renommés `bg-*` / `fg-*` : basculer clair ↔ sombre ne touche
      plus qu'un seul fichier. Les noms « papier / encre » étaient liés au registre.
- [x] Quatre degrés de fond chauds `#100c0d → #2d2425`, jamais `#000`
- [x] Toutes les couleurs codées en dur de `components.css` remplacées par des
      jetons (27 valeurs éparpillées, dont 5 rouges différents)
- [x] Nouveaux jetons : `--im-glass`, `--im-glass-2`, `--im-edge`,
      `--im-danger`, `--im-success`, `--im-info`
- [x] Contrastes recalculés : 16 paires vérifiées, la plus basse à **5.10:1**
- [x] Bouton principal inversé : crème plein, texte sombre

### Hero (composant Tailark)
- [x] Composition centrée, entrée en fondu-flou décalée (`--i` porte le rang)
- [x] Puce d'accroche avec la double flèche qui glisse au survol
- [x] Photo présentée dans un cadre matelassé, fondu vers le fond
- [x] Bouton principal dans un cadre à double liseré
- [x] En-tête qui se resserre en pastille flottante au-delà de 40 px
- [x] Rais de lumière en dégradés radiaux, rose et laiton
- [x] Marques de confiance typographiques au lieu de faux logos partenaires
- [x] Mot qui défile conservé, recentré

### Coverflow des packs (composant 3D)
- [x] Scène en perspective 1400 px, cartes latérales inclinées et assombries
- [x] Décalages en variables CSS : 4 paliers d'écran, rien en dur dans le JS
- [x] Fond d'ambiance flouté tiré de la carte courante
- [x] Sur-titre au laiton entre deux filets, pastilles de pagination
- [x] Défilement auto 5,6 s, suspendu au survol, au focus, hors écran et en
      onglet arrière-plan
- [x] Glissé tactile, flèches du clavier limitées à la section visible
- [x] Clic sur une carte latérale pour la ramener au centre
- [x] **Bouton d'ajout fonctionnel** : « Ajouter · 49 € » → « Au panier · 2 × 49 € »
- [x] Région `aria-live` annonçant « Pack X, n sur 5 », cartes latérales `aria-hidden`
- [x] `prefers-reduced-motion` : pas de perspective, une seule carte, navigation intacte
- [x] Lien de repli vers la liste pour ceux qui veulent tout voir d'un coup

### Outillage
- [x] `tools/stamp_assets.py` : tampon de version sur les liens CSS/JS.
      Le cache navigateur masquait les changements de palette pendant
      le développement — deux fois.

### Bugs trouvés en vérifiant
- [x] Cache navigateur servant les anciennes feuilles → tampon de version
- [x] Consigne de cadrage du placeholder passant derrière le nom sur les
      cartes du coverflow → remontée en haut de carte

## Phase 3 — Photos générées  ⏸ bloquée
- [x] 20 prompts écrits dans `tools/generate_product_photos.py` (17 produits + 3 catégories)
- [x] Chaîne d'intégration automatique : un PNG nommé `<id>.png` dans `image/generees/`
      suffit, `process_images.py` recadre, découpe les vignettes et écrit
      `products-images.js` que le catalogue fusionne au chargement
- [x] Chaîne testée à blanc avec un faux visuel, sans consommer d'appel API
- [ ] **BLOQUÉ** : la clé Gemini est sur le palier gratuit et
      `gemini-3.1-flash-image` y est à `limit: 0` sur les trois compteurs.
      Il faut activer la facturation sur le projet Google AI Studio.
      Ensuite : `python3 tools/generate_product_photos.py && python3 tools/process_images.py`

## Bloqué / en attente — à valider avec le pote
- **Prix définitifs** : tous « à définir » dans le brief. Le prototype propose
  packs 49-89 €, options 12-89 €. Un seul fichier à modifier :
  `site/assets/js/products.js`
- **Photos** : 1 produit sur 18 est photographié (les pochons satin).
  Les 3 photos de lieu exploitables sont intégrées (hero, à propos).
  4 sources sur 8 sont inexploitables (cartons, outillage, emballages visibles).
  État complet : `docs/photos-etat.md`, plan de tournage : `docs/plan-photos.md`
- **Reprendre la photo de la chambre de nuit** : lit fait, table débarrassée,
  câble du plafond retiré, volets fermés. C'est la seule photo que 100 % des
  visiteurs verront
- **Accroche à trancher** : « Les détails font les grands souvenirs… »
  (imprimée sur les pochons) contre la formule du brief
- Nom de domaine et hébergement
