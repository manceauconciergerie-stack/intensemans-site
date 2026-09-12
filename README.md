# INTENSÉ'MANS Love Room — prototype de la boutique d'extras

Prototype statique de la boutique de suppléments pré-arrivée décrite dans
`INTENSE MANS SITE.docx`. Le client a déjà réservé la Love Room, reçoit le lien
avec sa confirmation, choisit ses attentions et paie en ligne. L'hôte prépare
tout avant l'arrivée.

## Lancer le site

Pour travailler sur l'apparence seulement (les paiements ne fonctionnent pas) :

```bash
python3 -m http.server 4321 --directory site
```

Pour tester le tunnel complet, il faut les fonctions serveur :

```bash
cd site && npx vercel dev
```

Et dans un second terminal, pour recevoir les retours de paiement en local :

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

Copier `.env.example` en `site/.env.local` et le remplir avant de commencer.

## Mise en ligne

1. **Stripe** — créer le compte, récupérer la clé secrète. Rester en mode test
   tant que tout n'est pas vérifié : la carte `4242 4242 4242 4242` permet de
   payer sans encaisser.
2. **Vercel** — importer le dépôt, régler **Root Directory sur `site`**
   (c'est là que sont `package.json` et `api/`).
3. **Base des commandes** — Vercel > Storage > ajouter Upstash Redis. Les
   variables `KV_REST_API_*` sont injectées automatiquement.
4. **Resend** — créer le compte et la clé. Tant qu'aucun domaine n'est vérifié,
   Resend n'accepte d'écrire qu'à l'adresse du compte : `HOST_NOTIFY_EMAIL`
   doit donc être exactement celle-là. Pour écrire ailleurs, vérifier un
   domaine (SPF + DKIM).
5. **Variables d'environnement** — les saisir dans Vercel d'après
   `.env.example`.
6. **Webhook Stripe** — Développeurs > Webhooks > ajouter
   `https://<le-domaine>/api/webhook`, événement `checkout.session.completed`.
   Coller le secret obtenu dans `STRIPE_WEBHOOK_SECRET`, puis redéployer.
7. **Reçus client** — dans Stripe, activer l'envoi automatique des reçus de
   paiement, sinon la page de confirmation promet un e-mail que personne
   n'envoie.
8. **Vérifier en test**, puis remplacer les clés Stripe par celles du mode
   live — et recréer le webhook, son secret est différent en live.

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

`/preparer.html` — **écran interne, aucun lien depuis le site public**,
`noindex`, et protégé par le mot de passe `PREPARER_SECRET` : il affiche des
noms, des numéros de réservation et des messages personnels, et `noindex`
n'empêche que le référencement, pas quelqu'un qui devine l'URL.

C'est la vue demandée en section 15 du brief : les commandes classées par date
de séjour puis par heure d'arrivée, c'est-à-dire l'ordre dans lequel l'hôte les
prépare.

- Groupes : séjours passés, aujourd'hui, demain, puis chaque date
- Liseré de couleur par urgence : rouge pour une arrivée du jour non préparée,
  doré pour demain, bleu pour plus tard, vert pour préparé
- Point rose sur les commandes pas encore préparées, compteur en tête
- Clic sur une ligne : détail des articles, message du client, n° de commande,
  moyen de paiement
- Coche par ligne, « Tout marquer préparé », « Archiver les séjours passés »
  — l'archivage ne touche que ce qui est **passé et préparé**, jamais une
  commande à venir
- Une commande n'apparaît qu'une fois le paiement encaissé

Les commandes vivent sur le serveur, pas dans le navigateur : c'est ce qui
permet à l'hôte de les consulter depuis son téléphone alors qu'elles ont été
passées depuis celui du client.

## Le paiement et la notification

Le tunnel encaisse réellement et prévient l'hôte. Trois fonctions dans
`site/api/` :

| Fichier | Rôle |
|---|---|
| `create-checkout-session.js` | Ouvre le paiement. **Recalcule tous les prix** depuis `_lib/catalog.js` : le total envoyé par le navigateur n'est jamais utilisé. |
| `webhook.js` | Appelé par Stripe après paiement. Enregistre la commande et envoie le mail. |
| `orders.js` | Lit et met à jour les commandes pour le tableau de préparation. Protégé par mot de passe. |

Trois principes valent d'être retenus avant de toucher à ce code :

**Le webhook fait foi, pas le navigateur.** Un client peut fermer l'onglet
juste après avoir payé : la redirection vers la page de confirmation n'arrive
alors jamais. Stripe, lui, rappelle le webhook jusqu'à obtenir un 200. C'est
donc là, et nulle part ailleurs, que la commande est enregistrée et le mail
envoyé. Stripe pouvant livrer deux fois le même événement, `markPaid()` ne
renvoie la commande qu'au premier passage — ce qui évite deux mails.

**Les prix ne viennent jamais du client.** `site/api/_lib/catalog.js` est
généré depuis `products.js` par `tools/build_catalog.mjs`. Une copie tenue à
la main aurait fini par diverger, et un écart entre le prix affiché et le
montant débité coûte de l'argent. **Après toute modification de prix dans
`products.js`, relancer :**

```bash
node tools/build_catalog.mjs
```

**Le mail est écrit pour être transféré.** Tout est dans le corps du message —
date, heure d'arrivée, nom, articles, message du client — pour que l'hôte le
fasse suivre tel quel à la personne qui prépare la chambre, sans lien à ouvrir
ni compte à créer.

## La réservation de la chambre

`/reserver.html` — la seule page écrite pour un visiteur qui **ne connaît pas
encore le lieu**. C'est elle que Google indexe, et le point d'entrée de la
réservation en direct.

**Aucun channel manager, aucun abonnement.** Airbnb sait exporter son
calendrier et en importer un autre : cela suffit à tenir un planning commun.

| | Sens | Fichier |
|---|---|---|
| Airbnb → site | les nuits vendues sur Airbnb se grisent | `_lib/ical.js` (`lireAirbnb`) |
| Site → Airbnb | Airbnb bloque nos réservations directes | `api/calendar.js` |

### Le verrou, et pourquoi il existe
Deux clients peuvent viser la même nuit à la même seconde. Chaque nuit est
donc une clé Redis posée avec `NX` : Redis ne la crée que si elle n'existe
pas, et cette vérification-création est **atomique**. Le second client est
refusé même arrivé une milliseconde plus tard, avant tout débit.

Les nuits d'un séjour sont prises une par une ; si l'une résiste, celles déjà
obtenues sont relâchées. Deux clients qui se marchent dessus échouent tous les
deux — gênant, jamais dangereux. Le verrou expire au bout de 30 minutes si le
paiement n'aboutit pas : un panier abandonné ne bloque pas un samedi soir.

Vérifié : sur 8 clients simultanés visant la même nuit, un seul passe.

### La fenêtre des 3 heures, et comment elle est fermée
Airbnb ne relit le calendrier importé que toutes les 3 heures environ. Une
nuit vendue là-bas peut donc rester affichée libre chez nous pendant ce délai.

C'est pour ça que **les arrivées proches sont encaissées mais marquées « à
valider »** (`DELAI_CONFIRMATION_JOURS`, 3 par défaut) : l'hôte reçoit un mail
qui le dit en objet, vérifie Airbnb, puis confirme. Le client, lui, voit
clairement sur la page de confirmation que son séjour reste à valider et qu'il
serait remboursé en cas d'imprévu. Le risque est ainsi fermé là où il existe,
sans imposer d'attente aux clients qui réservent à l'avance.

### Mise en route
1. Poser `TARIF_SEMAINE` (et `TARIF_WEEKEND`) sur Vercel. Sans eux, la
   réservation reste fermée et le calendrier renvoie vers la page contact —
   aucun prix n'est inventé dans le code.
2. Dans Airbnb : Calendrier > Disponibilités > Synchroniser les calendriers.
   **Exporter** l'adresse et la poser dans `AIRBNB_ICAL_URL`.
3. Toujours au même endroit, **Importer un calendrier** et coller
   `https://<le-domaine>/api/calendar`.
4. Vérifier qu'une réservation de test apparaît bien côté Airbnb — le premier
   passage peut demander quelques heures.

### En connectant Airbnb : remonter le prix affiché
Brancher un channel manager fait basculer l'hôte du partage de commission
(~3 % à sa charge, ~14 % à celle du voyageur) vers le « host-only fee » de
15,5 % HT prélevé sur son versement, le voyageur ne payant alors plus rien
en plus.

**Ce basculement est à peu près neutre — à condition de remonter le prix
affiché d'environ 15 % le même jour.** Sinon, et seulement dans ce cas, Lenny
perd ~12,50 € sur chaque nuit à 100 €.

Pour qu'il touche 100 € net, la TVA de 20 % sur les frais Airbnb comprise :

| | Le voyageur paie au total | L'hôte touche |
|---|---|---|
| Partage de commission | ~121 € | 100 € |
| Host-only | ~123 € | 100 € |

Environ 1,5 % d'écart. Et depuis avril 2025, Airbnb affiche partout le prix
total frais compris : le voyageur compare des totaux, donc un prix par nuit
plus élevé ne pénalise pas l'annonce dans les résultats.

### Ce qui justifie vraiment la réservation directe
Pour que l'hôte touche 100 €, le voyageur en débourse ~121 sur Airbnb — ~21 €
partent à la plateforme. En direct, cet écart est disponible : afficher 110 €
fait économiser 11 € au voyageur et rapporte ~108 € à l'hôte. C'est là qu'est
le gain, pas dans les 3 % de commission hôte du système actuel.

À savoir aussi : une location de vacances n'a pas droit à une fiche Google
Business Profile (la politique exige un accueil physique du public). Le trafic
espéré depuis Google Maps n'existera pas sous cette forme ; le levier est le
référencement naturel sur « love room + ville », d'où le soin donné au titre
et à la description de `reserver.html`.

## Le tableau de bord de l'hôte

`/preparer.html` n'est pas un fichier sur l'ordinateur de l'hôte : c'est une
page du site, en `noindex`, protégée par un mot de passe. Il l'ouvre depuis
son téléphone, tape le secret une fois, et voit tout.

Le trajet d'une réservation, de bout en bout :

```
Le client paie          →  Stripe
Stripe prévient le site →  /api/webhook        (fonction Vercel)
Le webhook enregistre   →  Upstash             (la base)
Le webhook écrit        →  Resend              (mail hôte + mail client)
              ⋮
L'hôte ouvre /preparer.html
La page interroge       →  /api/synthese, /api/orders, /api/cadeaux
Ces fonctions lisent    →  Upstash
                        →  la page affiche
```

Le mot de passe voyage dans chaque requête (`x-preparer-secret`) : sans lui,
les fonctions refusent de répondre. Rien n'est installé, rien n'est
synchronisé.

Ce qu'il y voit : le chiffre d'affaires du mois, les nuits et commandes,
la prochaine arrivée, ce qui reste à valider ou à préparer, les commandes
triées par date de séjour, et les adresses collectées par la roue avec leur
consentement.

**Les virements ne sont pas repris ici.** Stripe les présente déjà mieux
(dates de versement, remboursements, litiges, export comptable) ; les
recopier créerait deux chiffres d'argent qui finiraient par diverger. Le
tableau renvoie vers Stripe.

**L'hébergement doit être Vercel, pas Netlify.** Les fonctions de `site/api/`
sont écrites au format Vercel (Web Handlers) ; Netlify attend une autre
convention et rien ne fonctionnerait sans réécriture.

La fréquentation est mesurée par Vercel Analytics : sans cookie, donc sans
bandeau de consentement, et lisible dans le tableau de bord Vercel.

## Ce qui n'est pas branché

- **Back-office produits.** Pas d'écran d'administration du catalogue (les prix et les produits se modifient dans `products.js`). Le tableau de préparation, lui, existe.
- **Mail de confirmation au client.** Stripe envoie le reçu de paiement ; aucun message de la Love Room ne part vers le client.
- **Pages légales.** Mentions, CGV, confidentialité, remboursement, cookies : liens présents, contenu à rédiger. **Obligatoire avant d'encaisser réellement.**
- **Les tarifs de la nuitée.** Le calendrier reste fermé tant que `TARIF_SEMAINE` n'est pas posé.
- **L'annulation par le client.** Aucun parcours d'annulation en libre-service : le remboursement se fait à la main dans Stripe, et `refuserSejour()` rend les nuits à la vente.
- **Pricing dynamique.** Les tarifs sont fixes (semaine / week-end). Un outil comme PriceLabs se justifierait sur un parc, pas sur un logement atypique unique où il risque de comparer une love room à des studios ordinaires.
- **Channel manager.** Utile seulement si un troisième canal s'ajoute (Booking.com). À deux canaux, le calendrier iCal suffit.

## Arborescence

```
site/
├── api/                    LE SERVEUR (fonctions Vercel)
│   ├── create-checkout-session.js  ouvre le paiement, recalcule les prix
│   ├── webhook.js                  retour Stripe : enregistre + prévient l'hôte
│   ├── orders.js                   commandes du tableau de préparation
│   ├── create-stay-session.js      RÉSERVATION : verrouille les nuits, ouvre le paiement
│   ├── availability.js             nuits libres et tarifs (nos résas + Airbnb)
│   ├── calendar.js                 notre calendrier, à importer dans Airbnb
│   └── _lib/
│       ├── catalog.js      GÉNÉRÉ — prix des extras (build_catalog.mjs)
│       ├── rates.js        tarifs de la nuitée, semaine / week-end
│       ├── stays.js        séjours + VERROU atomique sur les nuits
│       ├── ical.js         calendrier partagé avec Airbnb, dans les deux sens
│       ├── store.js        registre des commandes (Redis)
│       ├── email.js        les mails transférables à la femme de ménage
│       └── auth.js         mot de passe du tableau de préparation
├── sejour-confirme.html    retour de paiement d'une nuit
├── reserver.html           RÉSERVER LA CHAMBRE : calendrier + coordonnées
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
