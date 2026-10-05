#!/usr/bin/env python3
"""
Génère les pages du prototype INTENSÉ'MANS à partir d'un gabarit commun.
L'accueil (index.html) est écrit à la main ; ce script produit les autres pages
pour garantir un en-tête, un pied de page et des métadonnées identiques.

Usage :  python3 tools/build_pages.py
"""

from pathlib import Path
import re

SITE = Path(__file__).resolve().parent.parent / "site"

NAV = [
    ("index.html#parcours", "Réserver", "reserver"),
    ("index.html", "La boutique", "boutique"),
    ("a-propos.html", "À propos", "a-propos"),
    ("contact.html", "Contact", "contact"),
]

FOOTER = """<footer class="im-footer">
  <div class="im-shell">
    <div class="im-footer__grid">
      <div class="im-footer__brand">
        <img src="assets/img/logo.png" alt="" width="62" height="62">
        <p class="im-brand__name" style="font-size:1.2rem">INTENSÉ'MANS</p>
        <p class="im-brand__sub">Love Room</p>
        <p class="im-footer__tag">Votre parenthèse à deux.</p>
      </div>
      <div class="im-footer__links">
        <div>
          <h3>La boutique</h3>
          <ul>
            <li><a href="index.html#parcours">Réserver et composer</a></li>
            <li><a href="contact.html">Une demande sur mesure</a></li>
          </ul>
        </div>
        <div>
          <h3>Informations</h3>
          <ul>
            <li><a href="a-propos.html">À propos</a></li>
            <li><a href="mentions-legales.html">Mentions légales</a></li>
            <li><a href="cgv.html">Conditions générales de vente</a></li>
            <li><a href="confidentialite.html">Confidentialité et cookies</a></li>
            <li><a href="cgv.html#annulation">Annulation et remboursement</a></li>
          </ul>
        </div>
      </div>
    </div>
    <p class="im-alcool">
      La vente d’alcool est interdite aux mineurs de moins de 18 ans (art. L.3342-1 du Code de la santé publique).
      En commandant un produit contenant de l’alcool, vous certifiez avoir 18 ans ou plus.
      L’abus d’alcool est dangereux pour la santé, à consommer avec modération.
    </p>
    <div class="im-footer__legal">
      <span>© <span id="im-year">2026</span> INTENSÉ'MANS Love Room · Le Mans</span>
      <span>Réservé aux adultes · Séjours pour deux personnes</span>
    </div>
  </div>
</footer>"""


def header(active):
    items = []
    for href, label, key in NAV:
        current = ' aria-current="page"' if key == active else ""
        items.append(f'        <li><a href="{href}"{current}>{label}</a></li>')
    links = "\n".join(items)
    return f"""<header class="im-header">
  <div class="im-header__inner">
    <a class="im-brand" href="index.html">
      <img src="assets/img/logo.png" alt="" width="42" height="42">
      <span class="im-brand__txt">
        <span class="im-brand__name">INTENSÉ'MANS</span>
        <span class="im-brand__sub">Love Room</span>
      </span>
    </a>
    <nav class="im-nav" data-nav aria-label="Navigation principale">
      <ul>
{links}
      </ul>
    </nav>
    <div class="im-header__actions">
      <a class="im-cartlink" href="commander.html">
        <span>Mon séjour</span>
        <span class="im-cartlink__count" data-cart-count data-empty="true">0</span>
      </a>
      <button class="im-burger" data-burger type="button" aria-expanded="false" aria-label="Ouvrir le menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>"""


def page(filename, title, description, active, body, stickybar=False, noindex=False,
         scripts=()):
    robots = '\n<meta name="robots" content="noindex">' if noindex else ""
    bar = ""
    extra = "".join(f'\n<script src="assets/js/{s}"></script>' for s in scripts)
    html = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">{robots}
<meta property="og:type" content="website">
<meta property="og:site_name" content="INTENSÉ'MANS Love Room">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:image" content="assets/img/lieu/hero-chambre.webp">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#100c0d">
<link rel="icon" href="assets/img/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/tokens.css">
<link rel="stylesheet" href="assets/css/base.css">
<link rel="stylesheet" href="assets/css/components.css">
</head>
<body>

<a class="im-skip" href="#contenu">Aller au contenu</a>

{header(active)}

<main id="contenu">
{body}
</main>

{FOOTER}{bar}

<script src="assets/js/products-images.js"></script>
<script src="assets/js/products.js"></script>
<script src="assets/js/cart.js"></script>
<script src="assets/js/orders.js"></script>
<script src="assets/js/app.js"></script>{extra}
<!-- Mesure d'audience Vercel. Sans cookie et sans identifiant
     persistant : aucun bandeau de consentement n'est requis, et
     rien de ce fichier ne fonctionne hors de Vercel. -->
<script defer src="/_vercel/insights/script.js"></script>
<script>document.getElementById('im-year').textContent = new Date().getFullYear();</script>
</body>
</html>
"""
    (SITE / filename).write_text(html, encoding="utf-8")
    print(f"  {filename}  ({len(html)} octets)")


def steps(current):
    order = [("Vos attentions", "boutique"), ("Validation", "commander"),
             ("Confirmation", "confirmation")]
    out = []
    seen_current = False
    for label, key in order:
        if key == current:
            seen_current = True
            out.append(f'  <li aria-current="step">{label}</li>')
        elif not seen_current:
            out.append(f'  <li data-done="true">{label}</li>')
        else:
            out.append(f"  <li>{label}</li>")
    return '<ol class="im-steps">\n' + "\n".join(out) + "\n</ol>"


# ============================================================
#  PAGES
# ============================================================

print("Génération des pages :")

# ------------------------------------------------ Séjour confirmé
#  Retour de Stripe après paiement de la nuit. Le rebond naturel est
#  la boutique : c'est le moment où le client est le plus disposé à
#  ajouter du champagne.
page(
    "sejour-confirme.html",
    "Votre séjour est réservé — INTENSÉ'MANS Love Room",
    "Votre nuit à la Love Room INTENSÉ’MANS est réservée.",
    "reserver",
    """
  <section class="im-section im-starfield">
    <div class="im-shell">
      <div data-render="stay-confirmation"></div>
    </div>
  </section>
""",
    noindex=True,
    scripts=("stay-confirmation.js",),
)

# ------------------------------------------------------- Fiche produit
#  Hors du tunnel principal : le client ajoute depuis la boutique.
#  Cette page reste pour les liens directs (mail, réseaux, partage).
page(
    "produit.html",
    "Attention — INTENSÉ'MANS Love Room",
    "Détail de l’attention sélectionnée pour votre séjour à la Love Room INTENSÉ'MANS.",
    "boutique",
    """
  <section class="im-section im-section--tight">
    <div class="im-shell">
      <p class="im-eyebrow im-eyebrow--muted" style="margin-bottom:clamp(26px,3.4vw,44px)">
        <a href="index.html" style="color:inherit">La boutique</a>
        <span aria-hidden="true">&nbsp;·&nbsp;</span><span data-crumb>Attention</span>
      </p>
      <div data-render="product"></div>
    </div>
  </section>
""",
)

# --------------------------------------------------------- Validation
#  Panier et informations de séjour sur un seul écran : une seule
#  page entre le choix et le paiement.
page(
    "commander.html",
    "Valider mon séjour — INTENSÉ'MANS Love Room",
    "Récapitulatif de vos attentions et informations de séjour.",
    "boutique",
    """
  <section class="im-section im-section--tight" data-render="checkout">
    <div class="im-shell">
      """ + steps("commander") + """
      <div class="im-head">
        <span class="im-eyebrow">Dernière étape</span>
        <h1>Dites-nous <span class="im-italic">quand vous arrivez.</span></h1>
        <p class="im-lead">
          Vos attentions seront préparées avec soin avant votre arrivée dans la
          Love Room. Il nous faut juste la date et l’heure.
        </p>
      </div>

      <div class="im-cart">
        <div>
          <h2 class="im-eyebrow">Vos attentions</h2>
          <div data-checkout-lines></div>
          <div data-suggestions style="margin-top:clamp(24px,3.2vw,38px);display:grid;gap:14px"></div>

          <div data-checkout-form>
            <form class="im-form" data-form="stay" novalidate style="margin-top:clamp(34px,4.6vw,60px)">

              <h2 class="im-eyebrow">Votre séjour</h2>

              <div class="im-form__row">
                <div class="im-field" data-required>
                  <label for="f-name">Nom de réservation <span class="im-req" aria-hidden="true">*</span></label>
                  <input id="f-name" name="name" type="text" autocomplete="name" placeholder="Le nom sous lequel la nuit est réservée" required>
                  <p class="im-field__err" hidden>Indiquez le nom de la réservation.</p>
                </div>
                <div class="im-field">
                  <label for="f-resa">N° de réservation</label>
                  <input id="f-resa" name="resa" type="text" placeholder="Facultatif — Airbnb, Booking…">
                </div>
              </div>

              <div class="im-form__row">
                <div class="im-field" data-required>
                  <label for="f-date">Date de votre séjour <span class="im-req" aria-hidden="true">*</span></label>
                  <input id="f-date" name="date" type="date" required>
                  <p class="im-field__err" hidden>Indiquez la date de votre séjour.</p>
                </div>
                <div class="im-field" data-required>
                  <label for="f-arrival">Heure d’arrivée <span class="im-req" aria-hidden="true">*</span></label>
                  <input id="f-arrival" name="arrival" type="time" required>
                  <p class="im-field__err" hidden>Indiquez votre heure d’arrivée.</p>
                </div>
              </div>

              <div class="im-field">
                <label for="f-message">Message personnalisé</label>
                <textarea id="f-message" name="message" placeholder="Une occasion à marquer, un prénom à écrire, une mise en scène à prévoir…"></textarea>
                <p class="im-field__help">Facultatif. C’est ici que se préparent les surprises.</p>
              </div>

              <div class="im-field im-field--check" data-required data-adult-field hidden>
                <label for="f-adult">
                  <input id="f-adult" name="adult" type="checkbox">
                  <span>Je certifie avoir 18 ans ou plus <span class="im-req" aria-hidden="true">*</span></span>
                </label>
                <p class="im-field__help">Votre commande contient de l’alcool ou un article réservé aux adultes.</p>
                <p class="im-field__err" hidden>Cette confirmation est obligatoire.</p>
              </div>

              <p class="im-note">
                <span aria-hidden="true">✦</span>
                <span>Le paiement se fait sur la page sécurisée de Stripe : carte bancaire,
                Apple&nbsp;Pay ou Google&nbsp;Pay. Commande à passer avant 18 h la veille de
                votre séjour.</span>
              </p>

              <p class="im-field__err im-pay-error" data-pay-error hidden role="alert"></p>

              <button class="im-btn im-btn--primary" type="submit">
                Payer <span data-submit-total>—</span> <span aria-hidden="true">❤︎</span>
              </button>
            </form>
          </div>
        </div>

        <aside class="im-summary" data-checkout-summary></aside>
      </div>
    </div>
  </section>
""",
    noindex=True,
)

# --------------------------------------------------- Préparation
#  Écran interne, pas destiné aux clients : la vue « commandes
#  classées par date de séjour » demandée en section 15 du brief.
page(
    "preparer.html",
    "À préparer — INTENSÉ'MANS Love Room",
    "Tableau interne de préparation des commandes, classées par date de séjour.",
    "boutique",
    """
  <section class="im-section im-section--tight">
    <div class="im-shell">
      <div class="im-head">
        <span class="im-eyebrow">Interne · ne pas diffuser</span>
        <h1>Ce qu’il faut préparer, <span class="im-italic">jour par jour.</span></h1>
        <p class="im-lead">
          Les commandes sont classées par date de séjour puis par heure d’arrivée :
          l’ordre dans lequel elles doivent être préparées. Un liseré rouge signale
          une arrivée du jour encore en attente.
        </p>
      </div>

      <!-- Ce qui demande une action aujourd'hui. Masqué quand il n'y
           a rien : un bandeau permanent devient invisible. -->
      <div data-render="alerte"></div>

      <!-- Synthèse du mois. Les chiffres existaient, éparpillés :
           personne ne les additionnait. -->
      <div style="max-width:560px;margin-bottom:clamp(28px,3.6vw,44px)" data-render="synthese"></div>

      <div style="max-width:560px" data-render="board"></div>

      <!-- Les adresses laissées à la roue. Elles étaient enregistrées
           mais invisibles : il fallait ouvrir la console de la base
           pour les lire. -->
      <div style="max-width:560px;margin-top:clamp(34px,4.6vw,56px)" data-render="cadeaux"></div>

      <p class="im-note" style="max-width:560px;margin-top:26px">
        <span aria-hidden="true">✦</span>
        <span>Une commande n’apparaît ici qu’une fois le paiement encaissé. Le même
        tableau s’affiche depuis n’importe quel appareil : téléphone, ordinateur.</span>
      </p>
    </div>
  </section>
""",
    noindex=True,
)

# ------------------------------------------------------- Confirmation
page(
    "confirmation.html",
    "Merci pour votre commande — INTENSÉ'MANS Love Room",
    "Votre commande est confirmée. Vos attentions seront préparées avant votre arrivée.",
    "personnaliser",
    """
  <section class="im-section im-starfield">
    <div class="im-shell">
      """ + steps("confirmation") + """
      <div data-render="confirmation"></div>
      <p style="margin-top:clamp(38px,5vw,60px);text-align:center">
        <a class="im-btn im-btn--ghost" href="index.html">Retour à l’accueil</a>
      </p>
    </div>
  </section>
""",
    noindex=True,
)

# ------------------------------------------------------------ À propos
page(
    "a-propos.html",
    "À propos — INTENSÉ'MANS Love Room",
    "La Love Room INTENSÉ'MANS au Mans : une suite privative pour deux, et des attentions préparées avant votre arrivée.",
    "a-propos",
    """
  <section class="im-section im-glow">
    <div class="im-shell">
      <div class="im-head">
        <span class="im-eyebrow">À propos</span>
        <h1>Une suite pour deux, <span class="im-italic">et rien d’autre à prévoir.</span></h1>
        <div class="im-flourish"><span aria-hidden="true">❤︎</span></div>
      </div>
      <div class="im-product im-reveal">
        <div>
          <img class="im-img im-img--4x5" src="assets/img/lieu/spa-4x5.webp"
               alt="Le balnéo privatif deux places de la Love Room INTENSÉ'MANS, mur en pierre ardoise, peignoirs et linge"
               loading="lazy" decoding="async">
        </div>
        <div>
          <p class="im-lead">
            INTENSÉ'MANS est une Love Room privative au Mans : le logement entier est
            à vous deux. Pas d’horaire à respecter, pas d’accueil à subir,
            personne à croiser.
          </p>
          <p>
            Ce site existe pour une raison simple : les plus belles soirées sont celles où
            tout est déjà prêt. Vous choisissez vos attentions en amont, nous les installons
            avant que vous arriviez. Vous poussez la porte, et la soirée commence déjà.
          </p>
          <p>
            Champagne au frais, planche à partager, pétales sur le lit, décoration
            d’anniversaire ou mise en scène pour une demande : chaque attention est
            préparée le jour de votre arrivée, jamais à l’avance, jamais à la chaîne.
          </p>
          <div class="im-flourish"><span aria-hidden="true">❤︎</span></div>
          <p class="im-italic" style="font-size:1.3rem">Votre parenthèse à deux.</p>
          <p style="margin-top:30px">
            <a class="im-btn im-btn--primary" href="index.html">Retour à la boutique <span aria-hidden="true">❤︎</span></a>
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- L'équipement complet. Il ne vivait que dans la FAQ, donc
       derrière un onglet qu'il fallait penser à ouvrir. Une page
       « à propos » qui ne dit pas ce que contient le logement ne
       dit pas grand-chose. -->
  <section class="im-section">
    <div class="im-shell">
      <div class="im-head">
        <span class="im-eyebrow">L’équipement</span>
        <h2>Tout est déjà là, <span class="im-italic">rien à louer en plus.</span></h2>
        <p class="im-lead">
          Ce qui suit est compris dans la nuit, sans supplément et sans option à cocher.
          Les attentions payantes viennent en plus, jamais à la place.
        </p>
      </div>
      <!-- Une photo avant la liste : les peignoirs et les serviettes
           roulées disent en une image ce que quatre lignes de texte
           peinent à faire sentir. Le fauteuil tantra y est présent
           sans être annoncé, ce qui est le bon dosage à cet endroit. -->
      <img class="im-img im-img--4x5 im-reveal" src="assets/img/lieu/equipement-coin.webp"
           alt="Deux peignoirs noirs suspendus, des serviettes roulées et le fauteuil tantra de la suite"
           style="max-width:420px;margin-bottom:clamp(28px,3.4vw,42px)"
           width="886" height="1107" loading="lazy" decoding="async">

      <dl class="im-assure im-reveal">
        <div><dt>Pour dormir</dt><dd>Un lit king size et une literie haut de gamme. Peignoirs et linge préparés avant votre arrivée.</dd></div>
        <div><dt>Pour se détendre</dt><dd>Un balnéo deux places privatif et une douche à l’italienne, dans la suite, pour vous seuls.</dd></div>
        <div><dt>Pour la soirée</dt><dd>Un vidéoprojecteur, une télévision connectée et une barre de son. Quatre flûtes et quatre verres sont à votre disposition.</dd></div>
        <div><dt>Pour se rafraîchir</dt><dd>Des boissons fraîches sans alcool vous attendent au réfrigérateur, offertes avec la nuit.</dd></div>
        <div><dt>Pour arriver</dt><dd>Une entrée autonome à partir de 16 h, sans croiser personne. Départ le lendemain avant 11 h.</dd></div>
      </dl>

      <!-- Dit franchement plutôt que découvert en poussant la porte.
           Un couple qui ne s'y attend pas a le droit de le savoir
           avant de réserver, pas après. -->
      <p class="im-note im-reveal" style="max-width:80ch">
        <span aria-hidden="true">✦</span>
        <span>
          Un côté de la chambre est aménagé pour ceux qui souhaitent aller plus loin :
          un fauteuil tantra, une croix de Saint-André sur socle, des menottes,
          un fouet et une cravache. Tout est compris dans la nuit.
          Rien n’est imposé pour autant : les accessoires mobiles sont rangés dans un
          coffret fermé par défaut, et une question au moment de réserver vous demande
          simplement si vous préférez qu’ils y restent ou qu’ils soient installés.
          <a href="index.html#faq-equipement" style="color:var(--im-rose-ink);text-decoration:underline;text-underline-offset:3px">Le détail complet dans les questions fréquentes</a>.
        </span>
      </p>
    </div>
  </section>

  <section class="im-section">
    <div class="im-shell">
      <div class="im-head">
        <span class="im-eyebrow">Notre façon de faire</span>
        <h2>Trois règles, <span class="im-italic">jamais négociées.</span></h2>
      </div>
      <dl class="im-assure im-reveal">
        <div><dt>Préparé le jour même</dt><dd>Les planches sont composées et les fleurs achetées le jour de votre arrivée. Jamais la veille.</dd></div>
        <div><dt>Aucune intrusion</dt><dd>Tout est installé avant votre arrivée. Personne n’entre dans la suite pendant votre séjour.</dd></div>
        <div><dt>Discrétion absolue</dt><dd>Rien d’explicite sur votre relevé bancaire, aucun échange avec un tiers.</dd></div>
      </dl>
    </div>
  </section>
""",
)

# -------------------------------------------------------------- Contact
page(
    "contact.html",
    "Contact — INTENSÉ'MANS Love Room",
    "Une question sur vos attentions, une demande particulière ou une surprise à préparer ? Écrivez-nous.",
    "contact",
    """
  <section class="im-section im-glow">
    <div class="im-shell">
      <div class="im-head">
        <span class="im-eyebrow">Contact</span>
        <h1>Une question, <span class="im-italic">une idée à préparer ?</span></h1>
        <div class="im-flourish"><span aria-hidden="true">❤︎</span></div>
        <p class="im-lead">
          Pour une demande particulière, une mise en scène sur mesure ou une commande
          de dernière minute : écrivez-nous, on trouve une solution.
        </p>
      </div>

      <div class="im-cart">
        <form class="im-form" novalidate data-contact>
          <div class="im-form__row">
            <div class="im-field">
              <label for="c-name">Votre nom</label>
              <input id="c-name" name="name" type="text" autocomplete="name" placeholder="Prénom et nom">
            </div>
            <div class="im-field">
              <label for="c-email">Votre e-mail</label>
              <input id="c-email" name="email" type="email" autocomplete="email" placeholder="pour vous répondre">
            </div>
          </div>
          <div class="im-form__row">
            <div class="im-field">
              <label for="c-date">Date de votre séjour</label>
              <input id="c-date" name="date" type="date">
            </div>
            <div class="im-field">
              <label for="c-subject">Votre demande</label>
              <select id="c-subject" name="subject">
                <option>Une question sur les attentions</option>
                <option>Une demande sur mesure</option>
                <option>Une surprise à préparer</option>
                <option>Une commande de dernière minute</option>
                <option>Autre</option>
              </select>
            </div>
          </div>
          <div class="im-field">
            <label for="c-message">Votre message</label>
            <textarea id="c-message" name="message" placeholder="Dites-nous tout."></textarea>
          </div>
          <p class="im-field__help">Le bouton ouvre votre messagerie, avec votre message prêt à partir.</p>
          <p class="im-pc__erreur" data-contact-erreur hidden></p>
          <button class="im-btn im-btn--primary" type="submit">Envoyer <span aria-hidden="true">❤︎</span></button>
        </form>

        <aside class="im-summary">
          <h2>Nous joindre</h2>
          <div class="im-summary__row"><span class="im-quiet">Réponse</span><span>Sous 24 h</span></div>
          <div class="im-summary__row"><span class="im-quiet">Commandes</span><span>Jusqu’à 18 h la veille</span></div>
          <div class="im-summary__row"><span class="im-quiet">Téléphone</span><span><a href="tel:+33640081045">06 40 08 10 45</a></span></div>
          <div class="im-summary__row"><span class="im-quiet">Courriel</span><span><a href="mailto:rbrsci72@gmail.com">rbrsci72@gmail.com</a></span></div>
          <div class="im-summary__row"><span class="im-quiet">Lieu</span><span>Le Mans</span></div>
          <p class="im-summary__legal">
            Pour une demande urgente concernant un séjour du jour, appelez Lenny
            directement.
          </p>
        </aside>
      </div>
    </div>
  </section>
""",
    scripts=("contact.js",),
)

# ============================================================
#  PAGES LÉGALES
# ------------------------------------------------------------
#  Obligatoires pour vendre à des particuliers, et exigées par
#  Stripe pour activer un compte en production : sans CGV,
#  mentions légales et politique de remboursement accessibles,
#  le compte reste bloqué en mode test.
#
#  Les blocs .im-todo sont des trous à combler. Tant qu'il en
#  reste un, ces pages sont FAUSSES et le bandeau rouge doit
#  rester en haut. Chercher « im-todo » pour les lister :
#      grep -c "im-todo" site/*.html
# ============================================================

AVERTISSEMENT = """
      <div class="im-legal__warn" role="note">
        <p>
          <strong>Document non finalisé.</strong> Les mentions surlignées en rouge
          attendent les informations de l’exploitant. Ces pages ne sont pas
          opposables tant qu’elles ne sont pas complétées, relues par un
          professionnel du droit, et que ce bandeau n’a pas été retiré.
        </p>
      </div>"""


def todo(quoi):
    return f'<span class="im-todo">[À COMPLÉTER : {quoi}]</span>'


MAJ = "29 août 2026"


# ------------------------------------------------------ Mentions légales
page(
    "mentions-legales.html",
    "Mentions légales — INTENSÉ'MANS Love Room",
    "Éditeur, hébergeur et informations légales du site INTENSÉ'MANS Love Room au Mans.",
    None,
    f"""
  <section class="im-section im-section--tight">
    <div class="im-shell">
      <div class="im-head im-head--legal">
        <span class="im-eyebrow">Informations</span>
        <h1>Mentions légales</h1>
      </div>
{AVERTISSEMENT}
      <div class="im-legal">
        <p class="im-legal__stamp">Dernière mise à jour : {MAJ}</p>

        <h2>Éditeur du site</h2>
        <dl>
          <div><dt>Dénomination</dt><dd>RBR SAS, exploitant sous l’enseigne INTENSÉ'MANS Love Room</dd></div>
          <div><dt>Forme juridique</dt><dd>Société par actions simplifiée (SAS)</dd></div>
          <div><dt>Capital social</dt><dd>300 €</dd></div>
          <div><dt>Siège social</dt><dd>47 rue Banjan, 72000 Le Mans</dd></div>
          <div><dt>SIRET</dt><dd>990 703 894 00016</dd></div>
          <div><dt>RCS</dt><dd>Le Mans, 990 703 894</dd></div>
          <div><dt>TVA intracommunautaire</dt><dd>
            Non assujetti. La société bénéficie de la franchise en base et
            l’hébergement est exonéré : aucun numéro de TVA n’est à publier
            tant que ce régime s’applique.
          </dd></div>
          <div><dt>Téléphone</dt><dd><a href="tel:+33640081045">06 40 08 10 45</a></dd></div>
          <div><dt>Courriel</dt><dd><a href="mailto:rbrsci72@gmail.com">rbrsci72@gmail.com</a></dd></div>
        </dl>

        <h2>Directeur de la publication</h2>
        <p>
          Lenny Ribbles, en qualité de président de RBR SAS.
        </p>
        <p class="im-quiet">
          Pour une société par actions simplifiée, le directeur de la publication est
          de plein droit le président (art. 6, III de la loi du 21 juin 2004).
        </p>

        <h2>Hébergement du site</h2>
        <p>
          Le site est hébergé par <strong>Vercel Inc.</strong>, 340 S Lemon Ave #4133,
          Walnut, CA 91789, États-Unis. Le support est joignable depuis
          <a href="https://vercel.com/help" rel="noopener">vercel.com/help</a>.
        </p>

        <h2>Activité</h2>
        <p>
          Le site présente et commercialise la location d’un hébergement meublé de
          courte durée situé au Mans, ainsi que des prestations d’agrément préparées
          avant l’arrivée des occupants.
        </p>
        <dl>
          <div><dt>Code APE</dt><dd>55.20Z — Hébergement touristique et autre hébergement de courte durée</dd></div>
          <div><dt>Adresse du logement</dt><dd>1 bis rue Jeanne d’Arc, 72000 Le Mans</dd></div>
        </dl>

        <h2>Propriété intellectuelle</h2>
        <p>
          L’ensemble des contenus de ce site — textes, photographies, identité visuelle,
          mise en page et code — est protégé par le droit d’auteur. Toute reproduction ou
          représentation, totale ou partielle, sans autorisation écrite préalable est
          interdite.
        </p>

        <h2>Données personnelles</h2>
        <p>
          Le traitement des données des visiteurs et des clients est décrit dans la
          <a href="confidentialite.html">politique de confidentialité</a>.
        </p>

        <h2>Médiation de la consommation</h2>
        <p>
          Conformément à l’article L.616-1 du Code de la consommation, tout consommateur
          peut recourir gratuitement à un médiateur de la consommation en vue de la
          résolution amiable d’un litige.
        </p>
        <p>
          Avant toute saisine du médiateur, le client adresse une réclamation écrite à
          l’exploitant, par courriel ou par courrier, aux coordonnées indiquées en tête
          de page.
        </p>

        <h2>Signaler un contenu</h2>
        <p>
          Tout contenu jugé illicite peut être signalé à l’adresse de contact indiquée
          ci-dessus. Le signalement doit préciser la page concernée et le motif.
        </p>

        <p style="margin-top:44px">
          <a class="im-btn im-btn--ghost" href="index.html">Retour à la boutique</a>
        </p>
      </div>
    </div>
  </section>
""",
)

# ------------------------------------------------------------------ CGV
#  Deux produits distincts dans le même contrat : la nuit et les
#  attentions. Ils n'obéissent pas aux mêmes règles d'annulation,
#  d'où deux sections séparées.
page(
    "cgv.html",
    "Conditions générales de vente — INTENSÉ'MANS Love Room",
    "Conditions de réservation de la suite, de commande des attentions, de paiement, d’annulation et de remboursement.",
    None,
    f"""
  <section class="im-section im-section--tight">
    <div class="im-shell">
      <div class="im-head im-head--legal">
        <span class="im-eyebrow">Informations</span>
        <h1>Conditions générales de vente</h1>
      </div>
{AVERTISSEMENT}
      <div class="im-legal">
        <p class="im-legal__stamp">Dernière mise à jour : {MAJ}</p>

        <nav class="im-legal__toc" aria-label="Sommaire">
          <ul>
            <li><a href="#objet">1. Objet et acceptation</a></li>
            <li><a href="#vendeur">2. Le vendeur</a></li>
            <li><a href="#prestations">3. Ce qui est vendu</a></li>
            <li><a href="#prix">4. Prix et taxe de séjour</a></li>
            <li><a href="#commande">5. Commande et paiement</a></li>
            <li><a href="#sejour">6. Déroulement du séjour</a></li>
            <li><a href="#attentions">7. Préparation des attentions</a></li>
            <li><a href="#retractation">8. Droit de rétractation</a></li>
            <li><a href="#annulation">9. Annulation, modification, remboursement</a></li>
            <li><a href="#regles">10. Règles de la maison</a></li>
            <li><a href="#garanties">11. Garanties légales</a></li>
            <li><a href="#litiges">12. Réclamations et litiges</a></li>
          </ul>
        </nav>

        <h2 id="objet">1. Objet et acceptation</h2>
        <p>
          Les présentes conditions régissent la réservation de la suite INTENSÉ'MANS
          et la commande des attentions proposées sur ce site. Elles sont acceptées
          sans réserve au moment du paiement, qui vaut conclusion du contrat.
        </p>
        <p>
          Le site s’adresse exclusivement à des personnes majeures. Le client déclare
          avoir 18 ans révolus et la capacité juridique de contracter.
        </p>

        <h2 id="vendeur">2. Le vendeur</h2>
        <p>
          <strong>RBR SAS</strong>, société par actions simplifiée au capital de
          300 € de capital social, dont le siège est situé 47 rue Banjan, 72000 Le Mans,
          immatriculée au RCS du Mans sous le numéro 990 703 894, exploitant sous
          l’enseigne INTENSÉ'MANS Love Room.
        </p>
        <p>
          Téléphone : 06 40 08 10 45 · Courriel : rbrsci72@gmail.com.
          Les coordonnées complètes figurent dans les
          <a href="mentions-legales.html">mentions légales</a>.
        </p>

        <h2 id="prestations">3. Ce qui est vendu</h2>
        <h3>La nuitée</h3>
        <p>
          Location d’un hébergement meublé privatif au Mans, pour <strong>deux
          personnes majeures</strong>, à une date déterminée. La suite n’est jamais
          partagée avec d’autres clients.
        </p>
        <h3>Les attentions</h3>
        <p>
          Prestations d’agrément — mets, boissons, décoration, mises en scène —
          installées dans la suite avant l’arrivée. Elles peuvent être commandées avec
          la nuitée ou séparément par un client ayant déjà réservé son séjour, y compris
          par un autre canal.
        </p>
        <p>
          Les photographies illustrant les attentions n’ont pas de valeur contractuelle
          quant à la disposition exacte des éléments. En cas d’indisponibilité d’un
          produit frais, il est remplacé par un produit équivalent ou supérieur, ou
          remboursé.
        </p>

        <h2 id="prix">4. Prix et taxe de séjour</h2>
        <p>
          Les prix sont indiqués en euros toutes taxes comprises. Le tarif de la nuit
          varie selon le jour de la semaine, les grands événements du circuit du Mans
          et la Saint-Valentin. Une remise s’applique à une réservation faite moins de
          72 heures avant l’arrivée, sauf pour les nuits de la Saint-Valentin. Le montant
          exact est affiché avant le paiement et c’est celui-ci qui fait foi.
        </p>
        <dl>
          <div><dt>TVA</dt><dd>
            TVA non applicable, article 293 B du code général des impôts.
            La location du logement meublé est exonérée de TVA au titre de
            l’article 261 D 4° du même code, le vendeur ne fournissant pas
            trois des quatre prestations para-hôtelières. Les prix affichés
            sont nets de taxe.
          </dd></div>
          <div><dt>Taxe de séjour</dt><dd>Incluse dans le prix affiché. Aucune somme n’est perçue sur place à ce titre.</dd></div>
          <div><dt>Dépôt de garantie</dt><dd>Aucun. Il n’est demandé ni caution, ni empreinte bancaire.</dd></div>
        </dl>

        <h2 id="commande">5. Commande et paiement</h2>
        <p>
          La commande se fait en ligne. Le paiement est exigible immédiatement et en
          totalité : la réservation n’est ferme qu’une fois le paiement encaissé.
        </p>
        <p>
          Les paiements sont traités par <strong>Stripe Payments Europe, Ltd.</strong>
          Le vendeur n’a jamais accès aux coordonnées bancaires du client, qui ne
          transitent pas par ce site.
        </p>
        <p>
          Le libellé apparaissant sur le relevé bancaire ne comporte aucune mention
          explicite de la nature de la prestation.
        </p>
        <p>
          Un courriel de confirmation, valant reçu, est envoyé à l’adresse indiquée lors
          de la commande.
        </p>
        <h3>Réservations à moins de 72 heures</h3>
        <p>
          Le calendrier de ce site est synchronisé avec les plateformes de réservation
          externes, qui ne le relisent que toutes les trois heures. Une réservation
          passée à moins de trois jours de l’arrivée est
          encaissée puis <strong>confirmée manuellement</strong> par l’exploitant sous
          24 heures. Si la nuit s’avère déjà vendue ailleurs, la commande est
          intégralement remboursée, sous quatorze jours au plus.
        </p>

        <h2 id="sejour">6. Déroulement du séjour</h2>
        <dl>
          <div><dt>Arrivée</dt><dd>À partir de 16 h.</dd></div>
          <div><dt>Départ</dt><dd>Avant 11 h le lendemain.</dd></div>
          <div><dt>Remise des clés</dt><dd>Boîte à clés sécurisée, complétée d’un digicode. Les deux codes sont communiqués par l’exploitant avant l’arrivée, par téléphone ou par message. Aucun rendez-vous n’est nécessaire, personne ne vous attend sur place.</dd></div>
          <div><dt>Capacité maximale</dt><dd>Deux personnes majeures. Aucune personne supplémentaire n’est admise, même temporairement.</dd></div>
        </dl>
        <p>
          Aucune intervention n’a lieu dans la suite pendant le séjour, sauf urgence ou
          demande expresse du client.
        </p>

        <h2 id="attentions">7. Préparation des attentions</h2>
        <p>
          Les attentions sont préparées et installées le jour de l’arrivée. Pour cette
          raison, elles doivent être commandées au plus tard
          la veille de l’arrivée, avant 18 h.
        </p>
        <p>
          Passé ce délai, une commande reste possible sous réserve de disponibilité,
          après accord de l’exploitant.
        </p>

        <h2 id="retractation">8. Droit de rétractation</h2>
        <p>
          <strong>Il n’existe pas de droit de rétractation de quatorze jours sur ces
          prestations.</strong> L’article L.221-28, 12° du Code de la consommation
          écarte ce droit pour les prestations d’hébergement et les services liés à des
          activités de loisirs fournis à une date ou selon une périodicité déterminée.
        </p>
        <p>
          Cette exclusion est portée à la connaissance du client avant la validation du
          paiement. Les conditions d’annulation ci-dessous s’appliquent en lieu et place.
        </p>

        <h2 id="annulation">9. Annulation, modification, remboursement</h2>
        <h3>Annulation par le client</h3>
        <ul>
          <li>Plus de 7 jours avant l’arrivée : remboursement intégral.</li>
          <li>Entre 7 jours et 48 heures avant l’arrivée : remboursement de 50 %.</li>
          <li>Moins de 48 heures avant l’arrivée : aucun remboursement.</li>
        </ul>
        <p>
          Le délai s’apprécie à la date et à l’heure de réception de la demande écrite.
          Les attentions déjà préparées le jour de l’arrivée ne sont pas remboursables,
          quelle que soit la date de l’annulation.
        </p>
        <h3>Report du séjour</h3>
        <p>
          Un report peut être demandé par écrit. Il est accordé sous réserve de
          disponibilité et avec l’accord de l’exploitant ; à défaut, les conditions
          d’annulation ci-dessus s’appliquent.
        </p>
        <h3>Attentions seules</h3>
        <p>
          Une commande d’attentions est remboursée intégralement si l’annulation
          intervient avant le début de la préparation, soit
          jusqu’à la veille de l’arrivée, 18 h. Au-delà, les denrées
          étant achetées et préparées, aucun remboursement n’est possible.
        </p>
        <h3>Annulation par le vendeur</h3>
        <p>
          Si le séjour ne peut être assuré, quelle qu’en soit la cause, l’intégralité des
          sommes versées est remboursée sous
          quatorze jours au plus, sans autre indemnité.
        </p>
        <h3>Modalités</h3>
        <p>
          Toute demande s’effectue par écrit à l’adresse de contact. Le remboursement est
          effectué sur le moyen de paiement utilisé lors de la commande.
        </p>

        <h2 id="regles">10. Règles de la maison</h2>
        <ul>
          <li>Vente et service d’alcool interdits aux mineurs de moins de 18 ans (art. L.3342-1 du Code de la santé publique).</li>
          <li>
            Sont interdits dans le logement : le tabac, le vapotage, les bougies et
            toute flamme nue, les animaux, ainsi que les fêtes et réunions. Le logement
            est réservé à deux personnes : aucun visiteur supplémentaire n’est admis.
          </li>
          <li>Le calme est de rigueur, en particulier en soirée et la nuit : aucun bruit ne doit gêner le voisinage.</li>
          <li>Toute dégradation constatée est facturée au client sur justificatif.</li>
          <li>La captation d’images à des fins de diffusion publique dans le logement est interdite sans accord écrit préalable.</li>
        </ul>

        <h2 id="garanties">11. Garanties légales</h2>
        <p>
          Le client bénéficie des garanties légales de conformité (art. L.217-3 et
          suivants du Code de la consommation) et des vices cachés (art. 1641 et
          suivants du Code civil). Le vendeur répond des défauts de conformité dans les
          conditions prévues par ces textes.
        </p>
        <p>
          La responsabilité du vendeur ne saurait être engagée pour les objets personnels
          laissés dans le logement, ni pour l’usage que le client fait des équipements
          mis à disposition.
        </p>
        <p id="equipement-intime">
          Le logement comporte un équipement intime décrit sur la page
          l’onglet Équipement de la FAQ : croix de Saint-André, attaches, menottes et
          accessoires. Cet équipement est mis à disposition en l’état, sous la seule
          responsabilité des occupants, qui déclarent être majeurs, consentants et
          informés des règles d’usage affichées dans le logement et sur cette page.
          Le vendeur ne répond d’aucun dommage corporel résultant d’un usage non
          conforme à ces règles. Les accessoires mobiles sont rangés dans un coffret fermé
          par défaut ; le client peut demander, sans motif et sans frais, qu'ils
          soient sortis et installés avant son arrivée. Le mobilier de la chambre,
          fauteuil et croix compris, reste en place pendant le séjour.
        </p>

        <h2 id="litiges">12. Réclamations et litiges</h2>
        <p>
          Toute réclamation doit être adressée par écrit à l’adresse de contact figurant
          dans les <a href="mentions-legales.html">mentions légales</a>.
        </p>
        <p>
          À défaut de solution amiable, le client peut recourir gratuitement à un
          médiateur de la consommation (art. L.612-1 du Code de la consommation).
        </p>
        <p>
          Les présentes conditions sont soumises au droit français.
        </p>

        <p style="margin-top:44px">
          <a class="im-btn im-btn--ghost" href="index.html">Retour à la boutique</a>
        </p>
      </div>
    </div>
  </section>
""",
)

# ------------------------------------------------- Confidentialité
#  Le site ne pose aucun cookie de mesure d'audience : le seul
#  stockage local est le panier, strictement nécessaire au service.
#  Pas de bandeau cookies à afficher tant que c'est vrai — si un
#  outil de statistiques est ajouté un jour, cette page ET un
#  bandeau de consentement deviennent obligatoires.
page(
    "confidentialite.html",
    "Confidentialité et cookies — INTENSÉ'MANS Love Room",
    "Quelles données sont collectées, pourquoi, combien de temps, et comment exercer vos droits.",
    None,
    f"""
  <section class="im-section im-section--tight">
    <div class="im-shell">
      <div class="im-head im-head--legal">
        <span class="im-eyebrow">Informations</span>
        <h1>Confidentialité et cookies</h1>
      </div>
{AVERTISSEMENT}
      <div class="im-legal">
        <p class="im-legal__stamp">Dernière mise à jour : {MAJ}</p>

        <p class="im-lead">
          Ce que vous réservez ici relève de votre intimité. Le principe tenu sur ce
          site est simple : ne collecter que ce qui est indispensable pour préparer
          votre séjour, et ne le partager avec personne d’autre.
        </p>

        <h2>Qui traite vos données</h2>
        <p>
          Le responsable de traitement est <strong>RBR SAS</strong>, 47 rue Banjan,
          72000 Le Mans (RCS Le Mans 990 703 894), joignable à
          <a href="mailto:rbrsci72@gmail.com">rbrsci72@gmail.com</a>.
        </p>

        <h2>Ce qui est collecté</h2>
        <ul>
          <li><strong>Identité et contact</strong> : nom, prénom, adresse électronique, numéro de téléphone.</li>
          <li><strong>Séjour</strong> : dates d’arrivée et de départ, heure d’arrivée estimée.</li>
          <li><strong>Commande</strong> : attentions choisies, montant, message éventuel laissé pour la préparation.</li>
          <li><strong>Roue des cadeaux</strong> : adresse électronique, cadeau gagné et, si vous l’avez coché, votre accord pour recevoir nos offres.</li>
          <li><strong>Technique</strong> : journaux de connexion au serveur, conservés par l’hébergeur à des fins de sécurité.</li>
        </ul>
        <p>
          <strong>Aucune coordonnée bancaire n’est collectée ni stockée par ce site.</strong>
          Le paiement se déroule intégralement chez Stripe.
        </p>

        <h2>Pourquoi, et sur quel fondement</h2>
        <dl>
          <div><dt>Exécution du contrat</dt><dd>Traiter la réservation, préparer les attentions, vous adresser la confirmation et les informations d’arrivée.</dd></div>
          <div><dt>Obligation légale</dt><dd>Conserver les pièces comptables et justifier des opérations en cas de contrôle.</dd></div>
          <div><dt>Intérêt légitime</dt><dd>Assurer la sécurité du site, prévenir la fraude au paiement et répondre à vos messages.</dd></div>
          <div><dt>Consentement</dt><dd>Vous adresser nos offres par courriel, uniquement si vous l’avez accepté en tournant la roue. Ce consentement se retire à tout moment, sur simple demande.</dd></div>
        </dl>
        <p>
          Sans cet accord exprès, vos données ne servent à aucune prospection
          commerciale. Elles ne sont ni vendues, ni louées, ni cédées.
        </p>

        <h2>Qui y a accès</h2>
        <p>
          Outre l’exploitant, seuls les prestataires techniques strictement nécessaires
          au service interviennent, chacun lié par un contrat de sous-traitance :
        </p>
        <dl>
          <div><dt>Stripe</dt><dd>Encaissement des paiements. Stripe est responsable des données bancaires, qui ne transitent jamais par ce site.</dd></div>
          <div><dt>Resend</dt><dd>Acheminement des courriels de confirmation et de la notification à l’exploitant.</dd></div>
          <div><dt>Upstash</dt><dd>Base de données hébergeant les commandes.</dd></div>
          <div><dt>Vercel</dt><dd>Hébergement du site et journaux techniques.</dd></div>
        </dl>
        <p>
          Certains de ces prestataires peuvent traiter des données hors de l’Union
          européenne. Ces transferts sont encadrés par les clauses contractuelles types
          de la Commission européenne.
        </p>

        <h2>Combien de temps</h2>
        <dl>
          <div><dt>Commande non payée</dt><dd>Supprimée automatiquement au bout de 48 heures au plus.</dd></div>
          <div><dt>Commande payée</dt><dd>Conservée le temps du séjour, puis archivée pour les besoins comptables.</dd></div>
          <div><dt>Pièces comptables</dt><dd>10 ans, conformément à l’article L.123-22 du Code de commerce.</dd></div>
          <div><dt>Roue des cadeaux</dt><dd>Un an après la participation.</dd></div>
          <div><dt>Messages de contact</dt><dd>Le temps de traiter votre demande, et au plus douze mois après le dernier échange.</dd></div>
        </dl>

        <h2>Cookies et stockage local</h2>
        <p>
          <strong>Ce site ne dépose aucun cookie publicitaire ni de traçage.</strong>
        </p>
        <p>
          La fréquentation est mesurée par Vercel Web Analytics, sans cookie : des
          statistiques globales et anonymes (pages consultées, provenance des visites),
          qui ne permettent ni de vous identifier, ni de vous suivre sur d’autres sites.
        </p>
        <p>
          Le navigateur conserve localement, sans jamais les transmettre à un tiers, ce
          qui est strictement nécessaire au service : votre panier, la réservation en
          cours et le résultat de la roue. L’écran de préparation réservé à l’exploitant
          utilise un cookie de session, valable sept jours, indispensable à sa connexion.
          Vider les données du site efface le tout.
        </p>

        <h2>Vos droits</h2>
        <p>
          Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation,
          d’opposition et de portabilité sur vos données. Ces droits s’exercent auprès de
          l’adresse indiquée en tête de page ; une réponse vous est apportée dans le mois.
        </p>
        <p>
          En cas de désaccord, vous pouvez saisir la Commission nationale de
          l’informatique et des libertés :
          <a href="https://www.cnil.fr/fr/plaintes" rel="noopener">cnil.fr/fr/plaintes</a>,
          3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07.
        </p>

        <h2>Sécurité</h2>
        <p>
          Les échanges avec le site sont chiffrés. L’accès à l’écran de préparation des
          commandes n’est possible que par un lien de connexion personnel, à usage
          unique, envoyé à l’exploitant. Le retour de paiement transmis par
          Stripe est vérifié par signature cryptographique avant d’être enregistré.
        </p>

        <p style="margin-top:44px">
          <a class="im-btn im-btn--ghost" href="index.html">Retour à la boutique</a>
        </p>
      </div>
    </div>
  </section>
""",
)




print("Terminé.")
