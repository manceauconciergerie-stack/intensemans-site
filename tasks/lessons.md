# Leçons — projet INTENSÉ'MANS

| Date | Ce qui a mal tourné | Règle pour l'éviter |
|---|---|---|
| 2026-08-25 | J'ai analysé loveroomspa.com comme référence d'un site de *réservation* alors que le brief décrit une *boutique d'extras pré-arrivée*. Le plan validé portait sur la mauvaise architecture. | Lire le brief présent dans le dossier projet **avant** de partir en recherche de références. Le brief définit l'architecture ; la recherche externe ne sert qu'au niveau d'exigence visuel. |
| 2026-08-25 | J'ai construit un site-brochure (hero plein écran, page catalogue séparée, fiche produit, panier, page informations) pour un client qui avait déjà réservé et payé sa nuit : quatre chargements de page avant de pouvoir payer 30 €. | Avant de choisir une arborescence, écrire en une phrase l'état du visiteur à l'arrivée et ce qu'il veut faire. Un client qui a déjà payé n'a pas besoin d'être séduit : il faut lui faire gagner des clics, pas lui vendre le lieu. |
| 2026-08-25 | Palette bâtie sur du noir absolu avec du texte gris : sur mobile, illisible, et les cartes se confondaient avec le fond. | Sur fond sombre, échelonner les surfaces (fond ≠ carte ≠ carte survolée) et ne jamais descendre le texte courant sous ~#d0c0b5. Vérifier sur un vrai écran à 375 px, pas sur une capture. |
| 2026-08-25 | Même attribut `data-cartbar` posé sur un élément et sur `body` : `querySelector` renvoyait `body` et le rendu suivant écrasait la page entière. | Un attribut qui sert de sélecteur JS ne doit jamais être posé aussi sur un ancêtre. Préfixer les drapeaux d'état du `body` autrement (`data-has-*`). |
| 2026-08-25 | Deux composants React m'ont été proposés pour un projet en HTML statique. La tentation était soit de migrer la stack, soit de coller le composant là où il ne sert à rien (un centre de notifications sur une boutique client). | Face à un composant fourni : d'abord chercher quel **besoin réel du brief** il couvre, ensuite seulement décider de la stack. Ici il couvrait la section 15 (vue des commandes par date de séjour) qui manquait entièrement — pas la boutique. |
| 2026-08-26 | « Trop sombre » signalé deux fois ; les deux fois j'ai remonté le contraste **à l'intérieur** du noir au lieu de remettre en cause le registre. Il a fallu un troisième retour, plus dur, pour que je change de fond. | Quand un même reproche revient après correction, c'est que la correction s'est trompée de niveau. Remonter d'un cran : ce n'est pas le réglage qui est mauvais, c'est le choix qu'il ajuste. |
| 2026-08-26 | J'ai enchaîné trois versions du site sans jamais ouvrir les skills de design disponibles, alors qu'un audit existait tout prêt. Il a fallu que l'utilisateur me le demande. | Avant une passe visuelle, vérifier la liste des skills. `redesign-skill` a nommé en une page huit motifs génériques que j'avais produits sans les voir. |
| 2026-08-26 | Fichier `components.css` devenu ingérable à force d'ajouts en fin de fichier : correctifs empilés, règles qui s'annulent. | Au troisième correctif appendu sur la même feuille, réécrire le fichier proprement au lieu d'ajouter une ligne de plus. |
| 2026-08-26 | Palette basculée, page inchangée à l'écran : le cache du navigateur servait les anciennes feuilles. J'ai cru à un bug de CSS et cherché au mauvais endroit. | Avant de douter du code sur un changement visuel invisible, vérifier ce qui est **réellement servi** (`getComputedStyle` sur une variable, version du fichier). Poser un tampon de version sur les assets dès le début du projet. |
| 2026-08-26 | Les noms de jetons portaient le registre (`--im-paper`, `--im-ink`). Repasser en sombre a demandé un renommage sur 1900 lignes. | Nommer les jetons par leur rôle (`bg`, `fg`, `rule`), jamais par leur valeur ni par le thème. Un changement de thème doit se limiter au fichier de jetons. |
| 2026-08-26 | 27 couleurs codées en dur traînaient dans la feuille de composants, dont cinq rouges différents pour le même usage. | Aucune couleur littérale hors du fichier de jetons. Un `grep` de `#[0-9a-f]{6}\|rgba(` sur la feuille de composants doit revenir vide. |
| 2026-08-30 | J'ai truffé le site de tirets cadratins en incise (« Tout le monde repart avec quelque chose — il n'y a rien à perdre »). 89 occurrences dans le texte visible avant que l'utilisateur ne pose la règle. | **Règle du site : jamais de tiret au milieu d'une phrase.** Virgule, deux-points ou point selon le cas. Le tiret en incise est un tic d'écriture : il évite de choisir la vraie ponctuation. Vaut pour tout le texte visible ; les commentaires du code ne sont pas concernés. |
| 2026-08-29 | Le tableau de préparation a été livré comme fonctionnalité terminée alors qu'il lisait le `localStorage` : les commandes vivaient dans le navigateur du **client**, donc l'hôte n'aurait jamais rien vu sur son propre téléphone. Le défaut est resté invisible parce que tout a été testé dans un seul navigateur. | Pour toute fonctionnalité où deux personnes différentes lisent la même donnée, se demander **sur quel appareil** elle est stockée avant de la déclarer terminée. Un test dans un seul navigateur ne prouve rien d'un échange entre deux acteurs. |
| 2026-08-29 | La page de confirmation vidait le panier dès son affichage. Une fois le vrai paiement branché, un simple retour arrière depuis la page Stripe effaçait la sélection du client sans qu'un centime ait été encaissé. | Une page « succès » atteignable par simple navigation ne doit rien détruire. Exiger une preuve venue du prestataire de paiement (référence dans l'URL de redirection) avant tout effet irréversible. |
| 2026-08-29 | Le parcours facturait les extras via `create-checkout-session` sur les deux voies. Sur « pas encore réservé », le client payait donc son champagne **sans que sa nuit soit ni facturée ni verrouillée** — et le bouton était même désactivé s'il n'avait pris aucun extra, rendant impossible de réserver seulement la chambre. | Quand un tunnel a deux voies, dérouler chacune jusqu'au bout ligne à ligne. Un seul appel réseau partagé par deux parcours métier différents est presque toujours un bug : vérifier que chaque voie touche l'endpoint qui correspond à ce qu'elle vend. |
| 2026-08-29 | Le catalogue affichait un badge « Best-seller » sur le pack signature d'un site qui n'a jamais été mis en ligne et n'a donc jamais vendu. J'avais lu ce badge plusieurs fois sans le questionner. | Traiter les affirmations commerciales comme des affirmations factuelles : « best-seller », « le plus choisi », « des centaines de clients » doivent être vérifiables. Sur un site qui n'a pas encore ouvert, aucune ne l'est. |
| 2026-08-29 | J'ai construit toute l'intégration Beds24 (15,50 €/mois) sans avoir cherché si Airbnb savait faire le travail seul. Il le sait : export et import iCal, gratuits, intégrés. Il a fallu que l'utilisateur demande « il y a pas moins cher ? » pour que je regarde. | Avant d'intégrer un service payant, vérifier ce que les plateformes déjà en place font nativement. Poser la question « de quoi ai-je *réellement* besoin ? » — ici, d'un planning commun, pas d'un channel manager. Un outil résout souvent dix problèmes quand on n'en a qu'un. |
| 2026-08-29 | Formulaire de réservation écrit avec des `required` mais sans `novalidate` : le navigateur bloquait l'envoi avec sa propre bulle, l'événement `submit` ne partait jamais, et mes messages d'erreur personnalisés n'auraient jamais pu s'afficher. Le formulaire de `commander.html` avait pourtant déjà `novalidate`. | En ajoutant un formulaire dans un projet existant, relire un formulaire déjà en place avant d'en écrire un nouveau. Ici, un seul attribut séparait le fonctionnel du silencieusement cassé. |
| 2026-08-29 | J'ai présenté le passage d'Airbnb au « host-only fee » comme une perte de ~2 500 €/an capable de rendre le projet déficitaire, et j'ai insisté trois fois. En réalité mon calcul figeait le prix affiché de l'hôte — or son premier réflexe est de l'ajuster, ce qui rend le basculement neutre à ~1,5 % près. C'est l'utilisateur qui l'a vu. | Avant d'annoncer un chiffre comme bloquant, expliciter les hypothèses qu'il contient et se demander laquelle l'acteur changerait immédiatement. Un modèle où un prix reste fixe alors que quelqu'un a tout intérêt à le bouger n'est pas un modèle. Et un chiffre répété avec insistance mérite d'être revérifié plus, pas moins. |
| 2026-08-29 | J'ai écrit `var(--im-serif)` dans trois règles CSS en supposant le nom du jeton de police. Il s'appelle `--im-display` : les titres du calendrier seraient tombés sur la police par défaut, sans erreur ni avertissement. | Un `var()` qui pointe vers un jeton inexistant échoue en silence. Avant d'écrire une règle, vérifier le nom dans `tokens.css` — un `grep -- "--nom:"` coûte trois secondes. Vaut pour tout ce qui échoue sans bruit. |
| 2026-08-29 | Un composant React de calendrier a été proposé pour « faire un système de réservation ». La tentation était de traiter la demande d'habillage alors que le vrai sujet était la disponibilité et la concurrence entre deux clients. | Devant une demande formulée comme un composant d'interface, nommer d'abord le mode d'échec le plus coûteux du système sous-jacent (ici : deux clients réservant la même nuit). Si le composant ne l'adresse pas, il ne répond pas à la demande. Deuxième occurrence du même piège — voir la ligne du 2026-08-25. |
| 2026-08-30 | Il m'a demandé « comment présenter ça, sous forme de chat ? ». J'ai failli concevoir l'interface au lieu de nommer ce que le chat produirait : un journal de préférences sexuelles rattaché à un client identifié, soit des données de l'article 9 du RGPD, pour répondre à une liste fermée de quatre objets. | Devant une demande d'interface conversationnelle, décrire d'abord la **donnée que la conversation crée** et la nature de l'ensemble des réponses possibles. Si l'ensemble est fermé et court, aucune conversation n'est justifiée : un champ de formulaire suffit et ne conserve rien de sensible. |
| 2026-08-30 | J'ai posé la question de l'espace Intense en trois pavés radio de 80 px sur l'étape de paiement, qui portait déjà le récapitulatif, un message, une case de majorité et le bouton. Il a fallu qu'il dise « ça fait mastock » pour que je regarde l'écran entier. | Le poids visuel d'un composant se juge à la place qu'il prend **dans l'écran qui l'accueille**, jamais isolément. Sur un écran déjà chargé, une question secondaire prend un champ d'une ligne. Regarder la capture complète de l'étape avant de choisir la forme du contrôle. |
| 2026-08-30 | La page a d'abord affiché la photo de la balnéo à côté du texte décrivant la croix et les menottes, faute de photo de l'espace Intense. | Une image approximative ment plus qu'une absence d'image. Quand la bonne photo n'existe pas, poser un emplacement `.im-ph` qui énonce la prise de vue attendue, et non la moins mauvaise image disponible. |

- **2026-08-30** | J'avais « corrigé » la case vide de la synthèse en passant
  `auto-fill` à `auto-fit`, et déclaré la chose vérifiée sur un affichage qui
  comptait justement six chiffres. Avec cinq, le trou est revenu.
  `auto-fit` replie les COLONNES vides, jamais une cellule manquante en bout
  de ligne. **Règle : ne jamais valider une mise en page sur un seul jeu de
  données ; tester le cas qui ne tombe pas juste.** Pour une rangée dont le
  nombre d'éléments varie, `flex-wrap` plutôt que `grid`.

- **2026-08-30** | `new Resend(process.env.RESEND_API_KEY)` était appelé au
  niveau du module. Sans clé, le constructeur lève, l'IMPORT de `email.js`
  échoue, et tout ce qui en dépend tombe avec lui, dont le webhook Stripe :
  paiement encaissé, commande jamais enregistrée. **Règle : jamais de client
  externe instancié au chargement d'un module. Instanciation différée, pour
  qu'une clé absente ne casse que la fonction concernée.**

- **2026-08-30** | Le tableau de préparation ne lisait que le registre des
  commandes. Les nuits réservées sur le site, c'est-à-dire le produit
  principal, vivaient dans un autre registre et n'apparaissaient nulle part.
  Un commentaire du webhook affirmait pourtant « elle apparaît au tableau ».
  **Règle : deux registres alimentant un même écran, c'est une jointure à
  écrire explicitement. Et un commentaire qui affirme un comportement doit
  être vérifié comme du code.**

- **2026-08-30** | `scrollIntoView({ behavior: 'auto' })` ne veut PAS dire
  « immédiat » : `auto` signifie « suivre la CSS », et la page déclare
  `scroll-behavior: smooth`. Le défilement partait donc en douceur, et ma
  mesure prise juste après lisait toujours 0, ce qui m'a fait croire à un
  code cassé. Deuxième couche : le navigateur restaure la position d'avant
  le rechargement **après** l'évènement `load` et écrasait le résultat.
  **Règle : pour atterrir sur une ancre, `behavior: 'instant'` et
  `history.scrollRestoration = 'manual'`. Et une mesure de défilement se
  lit après un délai, jamais dans la foulée de l'appel.**

- **2026-08-30** | Une ancre gérée en JavaScript ne marche qu'au chargement.
  Cliquée depuis la page elle-même, l'adresse change sans rien recharger et
  le script ne rejoue pas. **Règle : toute logique d'ancre maison a besoin
  d'une écoute `hashchange` en plus du démarrage.**

- **2026-08-31** | Trois hypothèses fausses avant de trouver, parce que je
  mesurais dans un volet de navigateur non affiché : `requestAnimationFrame`
  ne s'y déclenche pas et `window.scrollTo` n'y fait rien. J'ai failli
  annoncer « hero à opacité 0 » comme la cause alors que c'était l'artefact.
  **Règle : avant toute mesure d'animation ou de défilement, vérifier
  `document.visibilityState`. Si c'est `hidden`, la mesure ne vaut rien.
  Les mesures de dimensions (`getBoundingClientRect`), elles, restent
  valables.** Et une capture d'écran de l'utilisateur vaut mieux que dix
  simulations : c'est elle qui a donné la réponse en une seconde.

- **2026-08-31** | `grid-template-columns: 1fr` vaut `minmax(auto, 1fr)`, et
  ce `auto` interdit à la colonne de descendre sous la largeur de son contenu
  insécable. Une rangée de pastilles imposait 540 px de colonne dans une carte
  de 346 px, rognée ensuite par un `overflow: hidden` : texte coupé, illisible,
  non défilable. La règle de bureau juste au-dessus utilisait pourtant déjà
  `minmax(0, …)`. **Règle : `minmax(0, 1fr)` par défaut dans une grille. Et
  quand on corrige une règle, corriger TOUTES ses variantes en media query.**

- **2026-08-31** | Sur écran tactile, `:hover` reste collé après le tap.
  Deux dégâts réels ici : le survol écrasait le contour de l'atout actif
  (lettres crème + contour brun de 1,4 px, les « traits marron »), et il
  écrasait le fond rose du jour choisi dans le calendrier, parce que
  `:hover:not(:disabled)` pèse plus lourd que `[data-plage]`.
  **Règle : tout `:hover` qui touche un composant à état sélectionné va sous
  `@media (hover: hover)` ET exclut explicitement l'état sélectionné.**

- **2026-08-31** | « Aucune animation sur téléphone » n'était pas un bug mais
  un manque STRUCTUREL : la page d'accueil comptait 0 élément d'apparition au
  défilement, et toute sa vie venait de 48 effets de survol, inexistants sur
  tactile. J'ai chassé des bugs pendant trois tours au lieu de compter ce que
  la page donnait à animer. **Règle : quand "rien ne bouge" sur un appareil,
  inventorier D'ABORD ce qui est censé bouger sur cet appareil (éléments
  observés, minuteurs, survols exclus). Un site peut être sans bug et sans
  animation.**

- **2026-08-31** | Complément à la leçon du volet caché : IntersectionObserver
  ne s'y déclenche pas non plus (vérifié empiriquement), et une transition n'y
  avance pas — lire l'opacité juste après avoir posé la classe renvoie la
  valeur de départ, pas la cible. **Pour prouver un état d'arrivée : couper la
  transition inline, poser la classe, lire, remettre.** La géométrie
  (getBoundingClientRect, scrollWidth) reste fiable, y compris dans des
  iframes cachées — c'est l'outil d'audit multi-pages le moins cher.

- **2026-08-31** | Un pseudo-élément qui déborde (`.im-glow::before`,
  `inset: -10% -20%`) élargissait la page à 450 px sur un écran de 375 sans
  qu'AUCUN élément réel ne dépasse : getBoundingClientRect ne voit pas les
  pseudo-éléments. Symptôme réel : page qu'on fait glisser latéralement,
  en-tête « poussé à gauche ». **Règle : un décor positionné qui sort de sa
  boîte impose `overflow: hidden` sur son parent, et un débordement sans
  coupable visible dans le DOM est presque toujours un pseudo-élément.**

- **2026-08-31** | Le rotateur du hero restait figé sur « le champagne » sur
  iPhone, et les apparitions surgissaient sans fondu. La réponse dormait dans
  notre propre code : initHeaderScroll portait déjà le commentaire « ni
  écouteur de défilement ni observateur : sur ce document, ni l'un ni l'autre
  n'est fiable » — le body est le conteneur de défilement (`overflow: hidden
  auto`), et l'en-tête avait été corrigé en lisant la position à chaque trame.
  Or rotateur, apparitions, atouts et vitrine étaient TOUS accrochés à un
  IntersectionObserver. **Règle : quand un contournement a été nécessaire
  quelque part, chercher immédiatement qui d'autre dépend du mécanisme
  contourné. Un signal jugé non fiable pour un composant l'est pour tous.**
  Corollaire : le déclencheur d'animation choisit son sens de panne — au
  pire un contenu apparaît sans fondu, jamais un contenu ne reste caché.

- **2026-08-31** | Cinq allers-retours avec l'utilisateur faute d'un contrôle
  de version : rien ne prouvait que le déploiement Netlify testé contenait le
  travail du jour. **Règle : tout diagnostic distant commence par vérifier CE
  QUI est déployé (compter un marqueur du jour dans les fichiers servis)
  avant de mesurer COMMENT ça se comporte.** Le diagnostic v2 le fait
  désormais en premier.

- **2026-08-31** | La cause était le réglage iOS « Réduire les animations »,
  écartée à tort au premier tour : mon carré-témoin animait dans TOUS les cas
  (sa page n'honorait pas le réglage), donc « le carré bouge » ne prouvait
  rien — et je n'ai jamais demandé à lire le verdict affiché. **Règle : une
  sonde ne vaut que si ses deux issues discriminent l'hypothèse testée. Et
  quand un outil de diagnostic affiche un verdict, demander LE VERDICT, pas
  un indice latéral.** Corollaire produit : « réduire les animations » ≠
  « site mort » — les changements de contenu (rotateur en fondu, diaporamas
  en coupe franche) continuent, seuls les déplacements s'éteignent. Le JS ne
  doit jamais couper ce que la CSS du mode réduit prévoit déjà en douceur.

- **2026-08-31** | Le défilement automatique des atouts « gelait » : les trois
  masques animent depuis le chargement sur la même grille de 6,2 s, donc leurs
  trois `animationiteration` tombent dans la même trame. Le garde `i === actif`
  ne protégeait pas — chaque évènement voyait l'`actif` déjà mis à jour par le
  précédent : triple bascule en une trame, retour à la photo de départ, gel
  apparent. **Règle : quand plusieurs horloges partagent une grille temporelle,
  leurs évènements coïncident ; un état lu-puis-écrit dans chaque handler
  cascade. Verrouiller par le temps (« un seul pas par cycle »), pas par
  l'état.** Et rejouer la chronologie multi-acteurs sur papier avant de livrer
  un mécanisme événementiel.

- **2026-08-31** | Deux réglages ratés du rotateur du hero avant de comprendre
  la géométrie : le mot sortant est ROGNÉ par le cadre (overflow hidden). Une
  courbe qui décélère fait ramper ses derniers pixels au bord — « le texte
  part puis se fige avant de disparaître ». La courbe d'origine, jugée trop
  vive sur le papier, était en fait la bonne : sa phase rapide expédie le mot
  hors du cadre et sa queue lente se joue hors champ. **Règle : pour un
  élément qui sort d'un cadre qui le rogne, la décélération doit être hors
  champ — sortie rapide, jamais d'ease-out visible au bord. Et avant de
  régler une sensation, regarder OÙ se joue chaque phase de la courbe à
  l'écran.** Le rebouclage (mot visible déplacé sans transition une fois par
  tour) reste corrigé : c'était un défaut distinct.

- **2026-08-31** | L'enchaînement des atouts accroché à `animationiteration`
  ne partait jamais sur iPhone : les formes vivent dans un <clipPath>, un
  contexte que Safari ne rend pas directement, et il n'y dispatche pas
  fiablement les évènements d'animation. Troisième mécanisme dépendant du
  navigateur à lâcher sur ce projet (scroll, IntersectionObserver, puis
  animation events). **Règle : sur ce site, tout séquencement se calcule —
  ancre de temps posée au réarmement + phase modulo la durée du cycle —
  plutôt que d'écouter des évènements que WebKit peut ne pas émettre. Un
  calcul de phase ne dépend d'aucun navigateur et se recale tout seul.**

- **2026-08-31** | Résolution finale du rotateur, après cinq réglages de
  courbes : la glissade était structurellement ingrate — dans un cadre qui
  rogne, toute décélération visible rampe au bord (gel) et toute sortie assez
  vive se lit comme un fouet. Il n'existait pas de « bonne courbe ». Passé en
  FONDU : un mot qui s'efface sur place n'a aucun trajet à finir, donc aucun
  gel possible ; sortie plus rapide que l'entrée pour éviter la superposition.
  **Règle : quand deux réglages opposés d'un même paramètre échouent chacun à
  leur façon, le paramètre n'est pas en cause — c'est le mécanisme. Changer de
  mécanisme, pas de valeur. Et écouter l'utilisateur qui le demande.**

- **2026-08-31** | Fin de la saga du rotateur : le « code préfait » que
  l'utilisateur préférait (hero Tailark, retrouvé dans le transcript de la
  session d'origine) n'a AUCUN mot qui tourne — son titre est fixe, et ce qui
  plaisait était son ENTRÉE : opacité 0 + flou 12 px + montée 12 px, ressort
  ~1,5 s (bounce 0.3). Le défilement de mots était un ajout maison qui n'a
  jamais partagé cette ADN. **Règle : quand l'utilisateur dit « la référence
  faisait mieux », rouvrir la référence et en extraire les VALEURS (durées,
  distances, courbes) au lieu de régler à l'oreille. La signature du site est
  désormais : flou qui se dissipe + petite montée + ressort doux — tout
  nouveau mouvement doit puiser là.**

- **2026-09-12** | Les premières photos étaient prises en plein jour ; tout
  l'étalonnage (warmth 1.12, vignette 0.40) servait à fabriquer une nuit qui
  n'existait pas à la prise de vue. Les nouvelles sont déjà nocturnes :
  appliquer la même recette les aurait sur-cuites. **Règle : une recette de
  traitement d'image encode les défauts de SA source. À chaque nouvelle
  livraison, réétalonner depuis zéro, et REGARDER chaque sortie au lieu de
  supposer que le pipeline a bien fait son travail.** Trois défauts n'ont été
  vus qu'à l'œil : une bouteille en plastique oubliée sur la baignoire, un
  tiers de sol nu sous le sujet, et le sommet de la croix décapité par le
  cadre.

- **2026-09-12** | Le site affirmait six fois, dont dans les CGV, que la croix
  était « fixée au mur » et « ne peut pas être démontée ». La photo montre une
  croix autoportante sur socle. Cette affirmation fausse servait d'argument
  pour refuser de la retirer de la chambre. **Règle : une caractéristique
  physique du lieu écrite dans un document contractuel doit être vérifiée sur
  photo ou sur place, jamais déduite d'une conversation.**

- **2026-09-12** | Un lot de la roue annonçait « arrivée anticipée : 17 h au
  lieu de 19 h ». Il avait DÉJÀ été recalé une fois lors d'un changement
  d'horaire, et le passage à 16 h l'a cassé une seconde fois. **Règle : un
  contenu qui cite une valeur définie ailleurs (horaire, tarif, délai) est une
  dépendance cachée. Quand cette valeur change, la chercher dans les textes
  autant que dans le code.** Découvert au passage : la roue dessine quatre
  tranches égales alors que les poids sont inégaux, ce qui laisse croire à un
  quart de chance pour chacun. Poids resserrés autour de 25 en attendant un
  dessin au prorata.
