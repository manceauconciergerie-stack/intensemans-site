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
    ("index.html", "La boutique", "boutique"),
    ("index.html#packs", "Packs", "packs"),
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
            <li><a href="index.html#packs">Nos packs</a></li>
            <li><a href="index.html#deguster">À déguster</a></li>
            <li><a href="index.html#decorer">À décorer</a></li>
            <li><a href="index.html#attentions">Petites attentions</a></li>
            <li><a href="contact.html">Une demande sur mesure</a></li>
          </ul>
        </div>
        <div>
          <h3>Informations</h3>
          <ul>
            <li><a href="a-propos.html">À propos</a></li>
            <li><a href="#">Mentions légales</a></li>
            <li><a href="#">Conditions générales de vente</a></li>
            <li><a href="#">Confidentialité et cookies</a></li>
            <li><a href="#">Remboursement</a></li>
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


def page(filename, title, description, active, body, stickybar=False, noindex=False):
    robots = '\n<meta name="robots" content="noindex">' if noindex else ""
    bar = ""
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
<script src="assets/js/app.js"></script>
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

              <fieldset style="border:0;padding:0;margin:0">
                <legend class="im-eyebrow" style="margin-bottom:14px">Paiement</legend>
                <div class="im-pay">
                  <label><input type="radio" name="payment" value="carte" checked><span>Carte bancaire</span></label>
                  <label><input type="radio" name="payment" value="applepay"><span>Apple Pay</span></label>
                  <label><input type="radio" name="payment" value="googlepay"><span>Google Pay</span></label>
                </div>
                <p class="im-field__help" style="margin-top:12px">
                  Prototype : aucun paiement réel n’est déclenché.
                </p>
              </fieldset>

              <p class="im-note">
                <span aria-hidden="true">✦</span>
                <span>En validant, vous confirmez avoir 18 ans ou plus pour les produits
                contenant de l’alcool. Commande à passer avant 18 h la veille de votre séjour.</span>
              </p>

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

      <div style="max-width:560px" data-render="board"></div>

      <p class="im-note" style="max-width:560px;margin-top:26px">
        <span aria-hidden="true">✦</span>
        <span>Prototype : les commandes vivent dans le navigateur. Cinq exemples sont
        posés à la première ouverture, et toute commande passée depuis la boutique
        apparaît ici immédiatement.</span>
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
    "La Love Room INTENSÉ'MANS au Mans : une suite privative pensée pour les couples, et des attentions préparées avant votre arrivée.",
    "a-propos",
    """
  <section class="im-section im-glow">
    <div class="im-shell">
      <div class="im-head">
        <span class="im-eyebrow">À propos</span>
        <h1>Une suite, un couple, <span class="im-italic">et rien d’autre à prévoir.</span></h1>
        <div class="im-flourish"><span aria-hidden="true">❤︎</span></div>
      </div>
      <div class="im-product">
        <div>
          <img class="im-img im-img--4x5" src="assets/img/lieu/spa-4x5.webp"
               alt="Le jacuzzi deux places de la Love Room INTENSÉ'MANS, mur en pierre ardoise, peignoirs et linge"
               loading="lazy" decoding="async">
        </div>
        <div>
          <p class="im-lead">
            INTENSÉ'MANS est une Love Room privative au Mans, réservée à un seul couple à la fois.
            Pas d’espace partagé, pas d’horaire à respecter, pas d’accueil à subir.
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

  <section class="im-section">
    <div class="im-shell">
      <div class="im-head">
        <span class="im-eyebrow">Notre façon de faire</span>
        <h2>Trois règles, <span class="im-italic">jamais négociées.</span></h2>
      </div>
      <dl class="im-assure">
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
        <form class="im-form" novalidate>
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
          <p class="im-field__help">Prototype : ce formulaire n’envoie encore rien.</p>
          <button class="im-btn im-btn--primary" type="submit">Envoyer <span aria-hidden="true">❤︎</span></button>
        </form>

        <aside class="im-summary">
          <h2>Nous joindre</h2>
          <div class="im-summary__row"><span class="im-quiet">Réponse</span><span>Sous 24 h</span></div>
          <div class="im-summary__row"><span class="im-quiet">Commandes</span><span>Jusqu’à 18 h la veille</span></div>
          <div class="im-summary__row"><span class="im-quiet">Lieu</span><span>Le Mans</span></div>
          <p class="im-summary__legal">
            Pour une demande urgente concernant un séjour du jour, précisez-le en objet :
            nous traitons ces messages en priorité.
          </p>
        </aside>
      </div>
    </div>
  </section>
""",
)

print("Terminé.")
