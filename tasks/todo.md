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

## Phase 6 — Paiement réel et notification  ✅ code terminé, en attente des comptes

Décidé avec l'utilisateur : mail seul (pas de SMS — coût par message et compte
Twilio à créer, injustifié à ce volume), hébergement Vercel, Stripe créé par
Lenny de son côté.

### Le défaut de fond qui n'avait pas été vu
Le panier **et** le registre des commandes vivaient dans le `localStorage`,
c'est-à-dire dans le navigateur du **client**. Le tableau de préparation ne
pouvait donc structurellement rien montrer à l'hôte : deux appareils, deux
stockages. Ajouter un bouton de paiement sans backend n'aurait rien réglé.

- [x] `site/api/` : trois fonctions Vercel (Web Handler, pas `(req, res)`)
- [x] Commandes dans Redis (Upstash), triées à l'écriture par moment d'arrivée
- [x] Stripe Checkout : carte / Apple Pay / Google Pay gérés par Stripe
      → les trois boutons radio de la maquette supprimés
- [x] `_lib/catalog.js` **généré** depuis `products.js` par `tools/build_catalog.mjs`
      → le prix envoyé par le navigateur est ignoré, tout est recalculé
- [x] Webhook comme unique source de vérité, idempotent (pas de second mail)
- [x] Mail à l'hôte écrit pour être **transféré** à la femme de ménage :
      tout dans le corps, aucun lien à ouvrir
- [x] `orders.js` bascule sur l'API en gardant son interface synchrone
      (cache + mise à jour optimiste) → `renderBoard()` inchangé
- [x] `preparer.html` protégé par mot de passe (comparaison à durée constante)
- [x] Case de majorité obligatoire, affichée seulement si le panier le justifie
- [x] Message d'erreur si le paiement ne peut pas s'ouvrir

### Bugs trouvés en vérifiant
- [x] La confirmation vidait le panier **sans preuve de paiement** : un retour
      arrière depuis la page Stripe effaçait la sélection. Elle exige
      maintenant la référence posée par la redirection Stripe.
- [x] Elle affichait un moyen de paiement qui n'était plus connu du navigateur
- [x] Elle promettait au client un e-mail que personne ne lui envoie

### Vérifié
- 10 assertions sur le calcul des prix, dont un panier trafiqué à 1 € qui
  facture bien 89 €, et le refus des produits inconnus et quantités hors bornes
- 7 refus de validation (date passée, format, alcool sans majorité…)
- 4 refus d'accès au tableau, mot de passe vide ou de bonne longueur inclus
- Parcours navigateur : case de majorité qui apparaît et disparaît selon le
  panier, blocage sans confirmation, erreur réseau propre, 375 px sans débordement

### Reste à faire par Lenny, avant d'encaisser
- [ ] Créer Stripe, Resend, Upstash ; poser les variables (voir `.env.example`)
- [ ] **Vérifier un domaine chez Resend.** Sans lui, l'expéditeur reste
      `onboarding@resend.dev` et Resend n'envoie qu'à l'adresse du compte :
      les mails à l'hôte passent, **aucun mail client n'arrive**. Or le site
      en promet trois (confirmation de nuit, confirmation d'attentions, code
      de la roue). Bloquant avant l'ouverture.
- [ ] **Pages légales : mentions, CGV, confidentialité, remboursement, cookies**
      — obligatoire pour vendre en ligne, aujourd'hui liens vides
- [ ] Prix définitifs à valider (toujours « à définir » dans le brief)
- [ ] Activer l'envoi des reçus dans Stripe

## Phase 9 — Choisir en un coup d'œil  ✅ terminée

Retour utilisateur : « on est obligé de descendre la page pour choisir ».
Mesuré avant de toucher quoi que ce soit, en 375 px :

| | Avant | Après |
|---|---|---|
| Hauteur d'une offre | 414 px | **85 px** |
| Défilement pour atteindre la dernière offre | 3753 px | **0** |
| Du haut du parcours à la dernière offre | — | **806 px (un écran)** |
| Début du parcours dans la page | 1987 px | **745 px** |
| Page entière | 9 écrans | 6,8 écrans |

### Les deux causes, dont une que je n'avais pas vue
- [x] **Les cartes déroulaient toute la liste des ingrédients** avant même
      qu'on ait choisi. Passées en lignes compactes : nom, promesse, prix.
      Le détail ne s'ouvre que sur l'offre retenue. Un clic choisit, un
      second revient en arrière.
- [x] **Le parcours était enterré sous 2000 px** de hero, d'atouts et de roue.
      Remonté juste après le hero. C'était la vraie cause : compacter les
      cartes sans déplacer la section n'aurait réglé qu'un tiers du problème.

### Bug trouvé au passage
- [x] Les liens « Voir les attentions » du hero et les quatre liens du pied de
      page pointaient vers `#packs` et `#composer` — **des ancres qui
      n'existent plus** depuis que le catalogue est devenu le parcours. Six
      liens morts sur neuf pages. Redirigés vers `#parcours`.

### Confort de mise au point
- [x] Toute actualisation ramène à la première étape.
      **À RETIRER AVANT LA MISE EN LIGNE** — signalé en commentaire dans
      `parcours.js` : en production, un client qui rafraîchit par mégarde
      perdrait son panier et ce qu'il a saisi.

## Phase 8 — Lisibilité de l'offre  ✅ terminée

Demande : « qu'un top sale marketing me dise okay tes offres sont hyper
compréhensibles ». Diagnostic : 18 produits sur un seul plan, deux axes de
décision mélangés, et surtout les offres enfermées dans **deux menus
déroulants** — on ne vend pas ce qu'il faut aller chercher.

- [x] **Un seul axe pour les formules** : L'Apéritif 49 € → Le Champagne 69 €
      → L'Intense 89 €. Renommées : les anciens noms étaient des listes
      d'ingrédients (« Pack Planche & Vin »), pas des niveaux.
- [x] **Les occasions sortent des packs** : Anniversaire et Demande en mariage
      forment leur propre groupe. On ne compare pas une planche à une demande
      en mariage.
- [x] **Demande en mariage remontée** : elle était rangée dans « À décorer »
      entre les ballons à 19 € et les pétales à 25 €. C'est le produit le plus
      chargé émotionnellement du catalogue.
- [x] **Les économies s'affichent** : `value` sur les packs, valeur barrée à
      côté du prix. L'Anniversaire fait économiser **27 €** et rien ne le
      disait — la meilleure affaire du catalogue était invisible.
- [x] **Double Bulles n'est plus un pack** : devenu « Une seconde bouteille »
      à 35 €, proposé en upsell des formules qui contiennent du champagne.
      Il faisait doublon de prix avec l'Anniversaire (79 €) et n'ajoutait
      qu'un choix de plus à l'entrée.
- [x] **Les formules sont visibles**, cartes côte à côte dans le parcours ;
      la composition à la carte passe derrière un dépliant.
- [x] **Un seul ruban par groupe** : deux mises en avant n'en font aucune.

### Retiré : le badge « Best-seller »
Il était posé sur le Pack Intense alors que le site n'a jamais vendu une seule
fois. Un argument invérifiable se retourne au premier client qui pose la
question ; le prix le plus haut et la liste la plus longue suffisent.

### Vérifié
- Ordre croissant 49 → 69 → 89, économies affichées (9 €, 10 €, 27 €)
- Deux rubans seulement, un par groupe
- Ajout et quantité depuis les cartes : total 69 € puis 138 €
- Aucun upsell cassé, aucun produit ne se propose lui-même
- 375 px : une colonne, ruban dans le cadre, aucun débordement

## Phase 7 — Réservation directe de la chambre  ✅ code terminé, tarifs à poser

Beds24 d'abord retenu, puis **écarté** : l'utilisateur a demandé s'il existait
moins cher pour tenir un planning commun. Oui — Airbnb sait exporter et
importer un calendrier iCal, gratuitement. Un channel manager ne se justifie
qu'à partir d'un troisième canal.

### L'architecture
Tout le parcours reste sur le site : notre calendrier, notre Stripe, notre
design — et la possibilité de proposer les extras dans la foulée, au lieu
d'envoyer le client sur une page externe puis de le faire revenir.

- [x] `_lib/rates.js` — tarifs semaine / week-end depuis l'environnement,
      chiffrage nuit par nuit. Aucun prix écrit en dur dans le code.
- [x] `_lib/stays.js` — **le verrou** : une clé Redis par nuit posée avec `NX`,
      donc atomique. Relâchement de ce qui a été pris si une nuit résiste,
      expiration à 30 min si le paiement n'aboutit pas.
- [x] `_lib/ical.js` — lecture du calendrier Airbnb + génération du nôtre
- [x] `api/calendar.js` — flux à coller une fois dans Airbnb. Aucun nom,
      aucun montant : l'adresse est publique.
- [x] `api/availability.js` — fusionne nos nuits et celles d'Airbnb, renvoie
      le prix de chaque nuit
- [x] `api/create-stay-session.js` — vérifie, chiffre, relit Airbnb,
      **verrouille**, puis seulement ouvre le paiement
- [x] `booking.js` — calendrier avec prix par nuit, puis coordonnées
- [x] `sejour-confirme.html` — rebond vers la boutique d'extras
- [x] Mail à l'hôte, avec objet « À VALIDER » quand l'arrivée est proche

### La fenêtre des 3 heures
Airbnb ne relit un calendrier importé que toutes les 3 h. En deçà de
`DELAI_CONFIRMATION_JOURS` (3), la réservation est encaissée mais marquée
« à valider » : l'hôte vérifie puis confirme, et le client le sait. Le risque
est fermé là où il existe, sans imposer d'attente à ceux qui réservent tôt.

### Vérifié
- Verrou, contre un vrai serveur Redis simulé : conflit exact et partiel
  refusés, aucune nuit laissée derrière un échec, impossible de libérer les
  nuits d'un autre, et **8 clients simultanés sur la même nuit → 1 seul passe**
- Tarifs : vendredi et samedi au tarif week-end, nuit de départ non facturée,
  séjours de 0 et de 30 nuits refusés
- iCal : aller-retour cohérent, nuit de départ laissée libre, flux vide ou
  corrompu sans effet, aucune donnée client dans le flux publié
- 7 refus de validation (dates, nom, e-mail)
- Parcours navigateur : prix affichés, total 250 € (samedi 140 + dimanche 110),
  deux étapes, retour au calendrier, 375 px avec cibles de 44 px

### Bugs trouvés en vérifiant
- [x] Jeton CSS `--im-serif` inventé (le bon est `--im-display`) : les titres
      seraient tombés sur la police par défaut, sans erreur.
- [x] Formulaire de réservation sans `novalidate` : le navigateur bloquait
      l'envoi avec sa propre bulle et l'événement `submit` ne partait jamais —
      mes messages d'erreur n'auraient jamais pu s'afficher.

### Reste à faire
- [ ] **Valider la grille tarifaire provisoire** de `api/_lib/rates.js`.
      99 € semaine, 139 € vendredi, 149 € samedi, +25 % Saint-Valentin,
      +15 % fêtes, +8 % mai, −15 % à moins de 3 jours. Ce sont des ordres
      de grandeur du marché, pas les prix de Lenny. **Ne pas ouvrir la
      billetterie avant qu'il les ait arrêtés.**
- [ ] Coller l'adresse d'export Airbnb dans `AIRBNB_ICAL_URL`
- [ ] Coller `https://<domaine>/api/calendar` dans l'import d'Airbnb
- [ ] Écran d'annulation / remboursement : aujourd'hui à la main dans Stripe

### À savoir avant de connecter Airbnb
- [ ] **Remonter le prix affiché d'environ 15 % le jour de la connexion.**
      Brancher un channel manager fait basculer en « host-only fee » (15,5 %
      HT à la charge de l'hôte, le voyageur ne payant plus rien en plus).
      Le basculement est **neutre à ~1,5 % près** si le prix affiché est
      ajusté ; c'est seulement en l'oubliant que Lenny perdrait ~12,50 € par
      nuit à 100 €. Airbnb affichant le prix total frais compris depuis
      avril 2025, un prix par nuit plus élevé ne pénalise pas l'annonce.
- [ ] **Google Maps** : une location de vacances n'a pas droit à une fiche
      Google Business Profile (contact en personne requis). Le trafic espéré
      depuis Maps n'existera pas sous cette forme. La voie réaliste est Google
      Vacation Rentals via un partenaire, et le vrai levier reste le SEO sur
      « love room [ville] ».
- [ ] Décider qui possède la transaction : widget Beds24 (~15,50 €/mois,
      aucun risque de double réservation à porter) contre calendrier maison
      sur l'API (contrôle du design, mais verrou de concurrence à écrire
      soi-même — Beds24 ne documente aucune atomicité)

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

## Phase 5 — Prix provisoires et pages légales  ✅ posé, ⏸ à compléter

### Tarifs de la nuitée (provisoires, dans `site/.env.local`)
- [x] Relevé du marché love room au Mans (août 2026) : plancher 140 €,
      peloton 150-180 €, premium 230-549 €. Moyenne Sarthe avec spa : 110-180 €
- [x] `TARIF_SEMAINE=139` · `TARIF_WEEKEND=169` · `NUITS_MIN=1`
      Entrée juste sous le peloton : sans avis clients, on prend d'abord
      la réservation. À remonter après les 20 premiers avis.
- [ ] **À trancher avec le propriétaire** avant mise en ligne
- [ ] Prix des 18 attentions toujours inventés (`site/assets/js/products.js`)

### Pages légales
- [x] `mentions-legales.html`, `cgv.html`, `confidentialite.html` écrites
      dans `tools/build_pages.py` (pas en HTML direct : le gabarit est la
      source de vérité, une édition à la main serait écrasée)
- [x] Liens du pied de page branchés sur les 12 pages, plus aucun `href="#"`
- [x] Styles `.im-legal`, `.im-todo`, `.im-legal__warn` dans `components.css`
- [x] Rétractation : exclusion art. L.221-28 12° du Code de la consommation
      (hébergement à date déterminée) — écrite noir sur blanc
- [x] Aucun cookie de mesure d'audience sur le site → pas de bandeau de
      consentement. Si un outil de stats est ajouté un jour, bandeau obligatoire
- [x] Identité de l'exploitant remplie depuis la base publique (SIRET donné
      le 29/08/2026) : **RBR SAS**, SAS, 47 rue Banjan 72000 Le Mans,
      SIRET 990 703 894 00016, RCS Le Mans 990 703 894, APE 55.20Z,
      président Lenny Ribbles → directeur de la publication
- [x] TVA intracommunautaire calculée depuis le SIREN : FR 72 990 703 894
      — **à confirmer sur le Kbis**, valable seulement si assujettie
- [ ] **31 trous restants** (`grep -c im-todo site/*.html`) : capital social,
      téléphone, courriel, déclaration meublé de tourisme, assurance RC pro,
      médiateur agréé, barème d'annulation, horaires, taxe de séjour
- [ ] **Relecture par un juriste** — ces textes sont un squelette conforme,
      pas un avis juridique
- [ ] Retirer le bandeau rouge `AVERTISSEMENT` dans `build_pages.py` une fois
      les trous comblés et le texte relu

### Rappel : Stripe bloque le passage en production
Sans CGV, mentions légales, coordonnées et politique de remboursement
accessibles publiquement, le compte Stripe reste en mode test.

---

## FAQ « Ce qu'il faut savoir avant de commander » — 29/08/2026

Refonte au motif `faq-tabs` : catégories en pastilles + accordéon.
Portage vanilla, comme les autres composants React reçus (aucune migration).

- [x] `site/assets/css/faq.css` — bloc `im-qr`, nom distinct de l'ancien
      `im-faq` pour ne pas dépendre de `components.css` (fichier partagé
      avec l'autre session)
- [x] `site/assets/js/faq.js` — bascule des onglets (tabindex mobile +
      flèches / Début / Fin) et dépliage des questions
- [x] 15 questions réparties en 4 catégories : Commander, Sur place,
      Discrétion, Paiement et imprévus
- [x] Équivalents CSS des effets framer-motion : fond d'onglet qui remonte
      (`cubic-bezier(0.31, 0.01, 0.66, -0.59)` = `backIn`), enchaînement
      sortie → entrée des panneaux (= `AnimatePresence mode="wait"`),
      dépliage par `grid-template-rows: 0fr → 1fr` (aucune mesure JS)
- [x] Ancien bloc `.im-faq` retiré de `components.css` (plus aucun usage)
- [x] Lien de la politique de confidentialité branché dans `roue.js`
      (il pointait encore sur `#`)
- [x] Vérifié à 1280 px et à 390 px : aucun débordement horizontal,
      aucune erreur console, ARIA sans référence cassée

### À faire confirmer par Lenny (réponses écrites de mémoire)
- [ ] « Les produits frais sont placés au réfrigérateur de la suite »
      → y a-t-il bien un réfrigérateur dans la suite ?
- [ ] « Le seau et les flûtes préparés à côté » → fournis ou non ?
- [ ] « Repassez une commande au même nom, les deux sont regroupées »
      → confirmer que c'est bien la procédure côté préparation
- [ ] Barème d'annulation : la FAQ annonce report sans frais jusqu'à 48 h.
      Les CGV portent encore un `im-todo` sur ce point → les deux doivent
      dire la même chose
- [ ] Libellé exact sur le relevé bancaire (paramétrable dans Stripe)

---

## Page « La suite » et espace Intense — 30/08/2026

Demande : annoncer l'équipement intime AVANT l'arrivée, et laisser le
client choisir à la réservation. L'idée initiale d'un chat où le client
écrit sa demande a été écartée : réponses en langage libre sur du
matériel sexuel, sous le nom et la date de séjour d'un client identifié,
cela produit des données de l'article 9 du RGPD (vie sexuelle) pour
répondre à une liste fermée de quatre objets.

- [x] `site/la-suite.html` (générée) — équipement de la suite, espace
      Intense, hygiène, règles d'usage. `noindex` : le lieu n'a pas à
      ressortir sur ces mots-clés
- [x] Entrée « La suite » dans l'en-tête et le pied de page
- [x] CGV : clause `#equipement-intime` (mise à disposition en l'état,
      majorité, retrait sur demande sans frais)
- [x] Choix à la réservation dans `parcours.js` : rangé (défaut),
      installé, retiré. Transporté dans le champ `message` déjà relayé
      jusqu'au mail et à l'écran de préparation, aucune API modifiée
- [x] Le mot « couple » retiré du site : il excluait sans rien apporter.
      Capacité inchangée à deux personnes
- [x] FAQ : verrerie (4 flûtes, 4 verres) et contenu de la suite
- [x] Vérifié : le choix arrive bien dans le corps de la requête
      (`Espace Intense : installez tout dans la chambre.`), aucune
      erreur console, pas de débordement horizontal à 375 px

### À faire confirmer par Lenny
- [ ] Protocole d'hygiène exact du matériel de contention, et produits
      utilisés (`im-todo` en place sur la page)
- [ ] Housses de poignets : remplacées ou lavées à chaque séjour ?
- [ ] Charge maximale de la croix annoncée par le fabricant
- [ ] Photo de l'espace Intense : cadrage serré, lumière tamisée,
      jamais explicite. Emplacement réservé sur la page
- [ ] **Stripe** : faire valider l'activité par écrit avant la mise en
      ligne. Rien n'est vendu sur cette page, mais un site associé à du
      matériel BDSM peut déclencher une revue de compte
- [ ] **Assurance** : vérifier que la RC pro couvre l'équipement de
      contention et la croix murale

---

## Tableau de bord — mesure (plan, non implémenté)

Objectif énoncé : savoir **où s'arrêtent les gens**, si les adresses
captées finissent en vente, ce qui se vend, le panier moyen, le taux
de remplissage et la part site contre Airbnb.

### Ce qui est déjà mesurable, sans rien ajouter

Les données existent en base, personne ne les additionne.

| Chiffre | Source | Exactitude |
|---|---|---|
| Meilleures ventes | `lines[]` des commandes et séjours | exacte |
| Panier moyen | totaux, séparés site / attentions seules | exacte |
| Panier moyen des attentions par séjour | séjours avec `lines` | exacte |
| Part des séjours avec au moins une attention | séjours | exacte |
| Taux de remplissage | nuits occupées / nuits du mois | exacte |
| Part site contre Airbnb | `stays:index` contre l'iCal importé | à vérifier (voir réserve) |
| Roue → vente | adresses de `cadeaux:index` croisées aux acheteurs | **plancher, pas vérité** |

Deux réserves à ne pas masquer :

1. **Roue → vente.** Le croisement ne voit que ceux qui achètent avec
   la même adresse que celle laissée à la roue. Ceux qui en donnent une
   autre sont invisibles. Le chiffre est donc un minimum. Le **code
   cadeau utilisé** est le seul signal certain : quand il apparaît dans
   une commande, l'attribution ne se discute pas. Afficher les deux.
2. **Part site contre Airbnb.** L'export iCal d'Airbnb mêle les nuits
   réservées et les nuits que l'hôte a bloquées à la main. Sans filtrer
   sur le libellé de l'événement, une semaine de vacances de Lenny
   compterait comme des ventes Airbnb. À caler sur son flux réel avant
   d'afficher le chiffre.

### Ce qui demande une instrumentation

**Où s'arrêtent les gens.** Rien ne l'enregistre aujourd'hui. Vercel
Analytics compte des pages vues, pas des étapes à l'intérieur d'une
même page : le tunnel se joue entièrement dans `parcours.js`, sans
changement d'URL.

Proposition : des compteurs à nous, `POST /api/etape`, un `INCR` par
étape et par mois.

    stat:2026-08:vue          la section des offres est apparue
    stat:2026-08:formule      une formule a été choisie
    stat:2026-08:dates        des dates ont été choisies
    stat:2026-08:coordonnees  le formulaire a été rempli
    stat:2026-08:paiement     redirection vers Stripe
    stat:2026-08:paye         webhook encaissé

Six compteurs, aucun identifiant, aucun cookie : ce ne sont pas des
données personnelles, donc pas de bandeau de consentement à ajouter.
Le taux de chute se lit entre deux lignes consécutives.

Même principe pour la roue : `roue:vue`, `roue:tourne`, `roue:mail`.

### Ordre de construction

1. `api/_lib/mesures.js` — tous les calculs sur les données existantes
2. `api/etape.js` + appels dans `parcours.js` et `roue.js`
3. `api/mesures.js` — lecture, protégée par la session
4. Un écran dans `preparer.html` : entonnoir en haut, ventes en bas
5. Caler le filtre iCal sur le vrai flux Airbnb de Lenny

### Hors périmètre

Le nombre de visites brutes : Vercel Analytics le donne déjà et le
recopier créerait deux chiffres qui divergent. On garde l'entonnoir,
qui commence à la première étape du tunnel.

- [ ] **Supprimer `site/diagnostic.html` avant la mise en ligne.** Page de
      dépannage temporaire pour l'absence d'animations sur mobile. En
      `noindex`, mais elle n'a rien à faire en production.

- [x] Animations mobiles : 7 blocs d'apparition au défilement sur l'accueil,
      4 sur à propos, défilement automatique des atouts (4,5 s, s'arrête au
      premier contact), états enfoncés au toucher, halo im-glow rogné
      (débordement 450 px corrigé). À confirmer visuellement sur le téléphone
      après redéploiement Netlify.

- [x] Animations iPhone, cause racine : IntersectionObserver non fiable sur ce
      document (body = conteneur de défilement). Rotateur, apparitions, atouts
      et vitrine basculés sur la boucle de trames IMFrame, comme l'en-tête
      l'était déjà. Plus aucun observateur actif dans les scripts du site.
      diagnostic.html v2 vérifie d'abord la version déployée, puis minuteurs,
      transitions, rotateur et apparitions, sur l'appareil réel.

- [x] Cause racine confirmée par diagnostic sur l'appareil : iOS « Réduire
      les animations » activé. Le mode réduit devient « apaisé » au lieu de
      « mort » : rotateur en fondu croisé, vitrine en fondu, atouts en coupe
      franche. L'utilisateur peut aussi désactiver le réglage pour l'
      expérience complète.

---

## Nouvelles photos du 7 septembre (6 clichés de nuit)

### Constat
Les anciennes sources étaient prises **en plein jour** : fenêtre brûlée, lit
défait, bouteille d'eau, néon éteint, câbles apparents. D'où un étalonnage
très agressif dans `process_images.py` (warmth 1.12, vignette 0.4,
highlight_rolloff 0.6) pour fabriquer une ambiance nocturne qui n'existait pas
à la prise de vue. **Les nouvelles photos sont déjà des photos de nuit** :
appliquer la même recette les sur-cuirait. Recettes à refaire, plus douces.

Deuxième constat : seules **cinq images** sont réellement affichées.
`chambre-4x5`, `spa-16x9`, `tour-salon`, `ambiance-amb`, `hero-chambre-mobile`,
`tour-jacuzzi` et `tour-vasque` sont générées et n'apparaissent nulle part.

### Correspondances
| Nouvelle photo | Destination | Ce qu'on y voit |
|---|---|---|
| `15.jpg` | `tour-lit` + `hero-chambre` (aperçu réseaux) | lit fait, néon « love » allumé, rideaux rouges |
| `15 2.jpg` | `tour-balneo` + `spa-4x5` | balnéo, mur ardoise, serviettes |
| `16 2.jpg` | `tour-douche` | douche italienne, marbre, vasque noire |
| `16.jpg` | `equipement-coin` (nouveau) | peignoirs, serviettes, fauteuil tantra |
| `15 4.jpg` | `equipement-croix` (nouveau) | la croix de Saint-André |
| `15 3.jpg` | réserve | coin intime, rose sous cloche, jeu |

### ⚠️ Contradiction factuelle découverte
La photo montre une croix **autoportante, sur pied triangulaire**. Le site
affirme six fois qu'elle est « fixée au mur », dont **dans les CGV** :
« Le mobilier fixé au mur reste en place et ne peut pas être démonté. »
C'était l'argument qui justifiait de ne pas proposer de la retirer.
À corriger partout ; la question de savoir si elle est *déplaçable* revient
à Lenny.

### Étapes
1. [x] Inventorier les photos et les usages réels
2. [ ] Réécrire les recettes d'étalonnage pour des sources nocturnes
3. [ ] Régénérer et **regarder** chaque sortie
4. [ ] Publier la croix dans l'onglet Équipement de la FAQ
5. [ ] Corriger « fixée au mur » (6 emplacements, dont CGV)
6. [ ] Tampons de cache, vérification à 375 px

---

## Données légales du 12 septembre — intégrées

Renseigné : capital social (300 €), téléphone (06 40 08 10 45), courriel
(rbrsci72@gmail.com), taxe de séjour incluse, aucun dépôt de garantie,
boîte à clés + digicode, commande la veille avant 18 h, barème d'annulation
(intégral > 7 j / 50 % entre 7 j et 48 h / rien en deçà), interdits (tabac,
vapotage, bougies, animaux, fêtes, pas de visiteur).

### ⚠️ En attente d'arbitrage : l'heure d'arrivée
Le site entier est bâti sur **19 h** (constante `ARRIVEE_MIN` du tunnel,
`ARRIVEE` de l'API, calendrier, FAQ, CGV, page à propos). La fiche du
12 septembre indique **16 h**. Non appliqué tant que ce n'est pas confirmé,
car la bascule casse un lot de la roue : « Arrivée anticipée : 17 h au lieu
de 19 h » n'a plus de sens si l'arrivée standard est déjà 16 h.

### ⚠️ Deux risques signalés à Lenny
1. **SCI + meublé de courte durée** : activité commerciale par nature. Au-delà
   de 10 % de recettes commerciales, bascule automatique et rétroactive à
   l'impôt sur les sociétés, et perte du régime des plus-values des
   particuliers à la revente. À valider par un comptable avant la mise en
   ligne.
2. **Médiateur de la consommation** : obligatoire quelle que soit la forme
   juridique. Sans adhésion, les CGV restent incomplètes et une amende
   administrative est encourue.

### Reste bloquant
- Numéro de déclaration en mairie (Cerfa 14004)
- Nom, adresse et site du médiateur agréé
- Assureur RC pro : nom, numéro de contrat
- Adresse du logement, ou mention « communiquée après réservation »
