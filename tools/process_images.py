#!/usr/bin/env python3
"""
Prépare les photos du dossier `image/` pour le site.

Recadre aux ratios utilisés par le site (16:9 pour le hero, 4:5 pour les
visuels principaux, 1:1 pour les vignettes), applique un étalonnage nocturne
cohérent avec la charte (noir profond, dominante chaude rose/ambre) et exporte
en WebP.

Relancer après chaque nouvelle livraison de photos :

    python3 tools/process_images.py
"""

from pathlib import Path
import subprocess
from PIL import Image, ImageEnhance
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "image"
OUT = ROOT / "site" / "assets" / "img"


# ------------------------------------------------------------------
#  Étalonnage
# ------------------------------------------------------------------

def grade(im, warmth=1.0, lift=0.0, contrast=1.0, vignette=0.0,
          highlight_rolloff=0.0, desaturate=0.0,
          shadow_gamma=1.0, black_point=0.0):
    """Étalonnage nocturne. Tous les paramètres sont neutres à leur défaut."""
    a = np.asarray(im.convert("RGB")).astype(np.float32) / 255.0

    # Compression des hautes lumières : rattrape une fenêtre brûlée
    # ou un plafonnier trop present sans écraser le reste de l'image.
    if highlight_rolloff > 0:
        k = highlight_rolloff
        a = a / (1.0 + k * np.clip(a - 0.55, 0, None))

    # Déboucher les ombres. Indispensable sur les visuels noir sur noir :
    # sans ça le satin ne se lit pas du tout sur un fond de page noir.
    if shadow_gamma != 1.0:
        a = a ** (1.0 / shadow_gamma)
    if black_point > 0:
        a = np.clip((a - black_point) / (1.0 - black_point), 0, 1)

    # Courbe : noirs plus profonds, milieux préservés.
    if contrast != 1.0:
        a = np.clip((a - 0.5) * contrast + 0.5, 0, 1)
    if lift != 0.0:
        a = np.clip(a + lift, 0, 1)

    # Balance des blancs vers l'ambre : ces photos sont prises en
    # lumière du jour ou en néon froid, la charte est chaude.
    if warmth != 1.0:
        w = warmth - 1.0
        a[..., 0] = np.clip(a[..., 0] * (1 + 0.85 * w), 0, 1)
        a[..., 1] = np.clip(a[..., 1] * (1 + 0.12 * w), 0, 1)
        a[..., 2] = np.clip(a[..., 2] * (1 - 1.15 * w), 0, 1)

    if desaturate > 0:
        lum = (a * np.array([0.2126, 0.7152, 0.0722], np.float32)).sum(-1, keepdims=True)
        a = a * (1 - desaturate) + lum * desaturate

    # Vignette : concentre le regard, c'est ce qui donne l'impression
    # de lumière tamisée plutôt que d'éclairage général.
    if vignette > 0:
        h, w_ = a.shape[:2]
        yy, xx = np.mgrid[0:h, 0:w_]
        cy, cx = (h - 1) / 2, (w_ - 1) / 2
        r = np.sqrt(((yy - cy) / cy) ** 2 + ((xx - cx) / cx) ** 2) / np.sqrt(2)
        mask = np.clip(1 - vignette * np.clip(r - 0.28, 0, None) / 0.72, 0, 1)
        a = a * mask[..., None]

    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


def crop_ratio(im, ratio, anchor=0.5):
    """Recadre au ratio demandé (largeur/hauteur), sans jamais déformer.
    `anchor` positionne la fenêtre : 0 = haut/gauche, 1 = bas/droite."""
    w, h = im.size
    target = ratio
    if w / h > target:            # trop large : on rogne sur les côtés
        new_w = int(round(h * target))
        x = int(round((w - new_w) * anchor))
        return im.crop((x, 0, x + new_w, h))
    new_h = int(round(w / target))
    y = int(round((h - new_h) * anchor))
    return im.crop((0, y, w, y + new_h))


def pad_ratio(im, ratio, anchor=0.5, fill=(0, 0, 0)):
    """Étend le cadre au ratio demandé en ajoutant du fond.
    Utilisé seulement quand le fond est un noir uni : rien n'est inventé."""
    w, h = im.size
    if w / h > ratio:
        new_h = int(round(w / ratio))
        canvas = Image.new("RGB", (w, new_h), fill)
        canvas.paste(im, (0, int(round((new_h - h) * anchor))))
        return canvas
    new_w = int(round(h * ratio))
    canvas = Image.new("RGB", (new_w, h), fill)
    canvas.paste(im, (int(round((new_w - w) * anchor)), 0))
    return canvas


def crop_detail(im, fraction, cx, cy):
    """Découpe un carré de `fraction` du plus petit côté, centré sur (cx, cy)
    exprimés en proportion de l'image. Sert à fabriquer les vignettes
    « détail » à partir du visuel principal."""
    w, h = im.size
    side = int(round(min(w, h) * fraction))
    x = int(round(cx * w - side / 2))
    y = int(round(cy * h - side / 2))
    x = max(0, min(w - side, x))
    y = max(0, min(h - side, y))
    return im.crop((x, y, x + side, y + side))

def save(im, rel, width):
    """Redimensionne et écrit un WebP."""
    dest = OUT / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    w, h = im.size
    if w > width:
        im = im.resize((width, int(round(h * width / w))), Image.LANCZOS)
    tmp = dest.with_suffix(".png")
    im.save(tmp)
    subprocess.run(["cwebp", "-q", "82", "-quiet", str(tmp), "-o", str(dest)], check=True)
    tmp.unlink()
    print(f"  {rel:<44} {im.size[0]}x{im.size[1]}  {dest.stat().st_size // 1024} Ko")


print("Traitement des photos :\n")

# ------------------------------------------------------------------
#  Pochons satin de la marque
#  Remplacés par un visuel généré depuis le 28/08/2026. La photo
#  d'origine — le seul vrai visuel produit de la marque — est archivée
#  dans image/reelles/. Pour la remettre en service, supprimer
#  image/generees/pack-intense.jpg et rétablir ce bloc.
# ------------------------------------------------------------------

# ==================================================================
#  LES PHOTOS DU LIEU — livraison du 7 septembre 2026
#
#  Changement de nature, pas seulement de qualité : les premières
#  photos étaient prises EN PLEIN JOUR (fenêtre brûlée, néon éteint,
#  lit défait). L'étalonnage devait donc fabriquer la nuit de toutes
#  pièces : warmth 1.12, vignette 0.40, rolloff 0.60.
#
#  Celles-ci sont déjà des photos de nuit, chaudes, lit fait, néon
#  allumé. Leur appliquer l'ancienne recette les sur-cuirait : orange
#  saturé, noirs bouchés. D'où deux recettes bien plus douces, selon
#  que la source est chaude (chambre, croix, peignoirs) ou neutre
#  (balnéo et salle d'eau, éclairés en blanc).
# ==================================================================

#  Sources chaudes : on ne fait qu'accentuer ce qui est déjà là.
NUIT = dict(warmth=1.03, contrast=1.05, lift=-0.012,
            vignette=0.22, highlight_rolloff=0.18, desaturate=0.02)

#  Sources neutres : le gris de l'ardoise et le blanc de la baignoire
#  tirent vers le froid, il faut les ramener vers l'ambre de la charte.
FROID = dict(warmth=1.10, contrast=1.07, lift=-0.028,
             vignette=0.30, highlight_rolloff=0.38, desaturate=0.06)

#  Le marbre blanc de la salle d'eau part très haut en luminance et
#  éblouirait sur un fond de page noir : compression plus appuyée.
#  Desserré après examen de la sortie : le premier réglage éteignait
#  le marbre, qui doit au contraire rayonner. Le projet a déjà reçu
#  deux fois le reproche « trop sombre », on ne le reprend pas.
MARBRE = dict(warmth=1.06, contrast=1.04, lift=0.012,
              vignette=0.20, highlight_rolloff=0.45, desaturate=0.04)

NEW = SRC / "NEW PHOTO"


def c45(im, x, y, w):
    """Découpe un cadre 4:5 à partir d'un coin haut-gauche et d'une largeur."""
    h = int(w * 1.25)
    W, H = im.size
    x = max(0, min(W - w, x))
    y = max(0, min(H - h, y))
    return im.crop((x, y, x + w, y + h))


# ------------------------------------------------------------------
#  La chambre : lit fait, néon « love » allumé, rideaux rouges.
#  Le cadre part au-dessus du néon pour qu'il entre dans l'image :
#  c'est lui qui signe la Love Room en un coup d'œil.
# ------------------------------------------------------------------
chambre = Image.open(NEW / "PHOTO-2026-09-07-17-44-15.jpg").convert("RGB")
chambre_g = grade(chambre, **NUIT)

save(c45(chambre_g, 300, 466, 786), "lieu/tour-lit.webp", 1000)

#  Aperçu pour les réseaux sociaux (Open Graph). Il n'est jamais
#  affiché sur le site : seulement dans les vignettes de partage.
#  Bande horizontale prise sur le néon et le lit.
save(crop_ratio(chambre_g.crop((0, 560, 1086, 1260)), 16 / 9, anchor=0.5),
     "lieu/hero-chambre.webp", 1086)

# ------------------------------------------------------------------
#  Le balnéo deux places, mur en pierre ardoise.
# ------------------------------------------------------------------
balneo = Image.open(NEW / "PHOTO-2026-09-07-17-44-15 2.jpg").convert("RGB")
balneo_g = grade(balneo, **FROID)

#  Le cadre démarre à droite d'une bouteille en plastique oubliée sur
#  le rebord de la baignoire (x 335 à 395 dans l'original), et coupe
#  bas : le premier essai laissait un tiers de carrelage nu sous le
#  sujet. Il reste le mur en ardoise, la baignoire et les serviettes.
save(c45(balneo_g, 410, 420, 760), "lieu/tour-balneo.webp", 1000)
save(c45(balneo_g, 390, 400, 800), "lieu/spa-4x5.webp", 1200)

# ------------------------------------------------------------------
#  La salle d'eau : douche à l'italienne, vasque noire, miroir
#  rétroéclairé. Le cadre écarte les WC, à gauche dans l'original.
# ------------------------------------------------------------------
eau = Image.open(NEW / "PHOTO-2026-09-07-17-44-16 2.jpg").convert("RGB")
eau_g = grade(eau, **MARBRE)

save(c45(eau_g, 330, 180, 756), "lieu/tour-douche.webp", 1000)

# ------------------------------------------------------------------
#  L'équipement, annoncé avant l'arrivée plutôt que découvert en
#  poussant la porte. Ces deux visuels sont nouveaux : jusqu'ici la
#  FAQ décrivait l'équipement intime sans jamais le montrer.
# ------------------------------------------------------------------
coin = Image.open(NEW / "PHOTO-2026-09-07-17-44-16.jpg").convert("RGB")
save(grade(c45(coin, 200, 340, 886), **NUIT), "lieu/equipement-coin.webp", 1000)

croix = Image.open(NEW / "PHOTO-2026-09-07-17-44-15 4.jpg").convert("RGB")
#  La croix mesure près de toute la hauteur de l'original : un cadre
#  de 900 de large la décapitait. À 1000, elle tient entière, du bras
#  haut jusqu'au socle.
save(grade(c45(croix, 40, 190, 1000), **NUIT), "lieu/equipement-croix.webp", 1000)

# ------------------------------------------------------------------
#  Le logo, en plusieurs tailles
# ------------------------------------------------------------------
logo = Image.open(SRC / "PHOTO-2026-08-25-22-26-46.jpg").convert("RGB")
save(logo, "logo-512.webp", 512)
save(logo, "logo-160.webp", 160)


# ------------------------------------------------------------------
#  Photos générées (Nano Banana) — détection automatique
#  Tout PNG déposé dans image/generees/<id>.png est intégré au produit
#  ou à la catégorie qui porte cet identifiant. Aucune édition manuelle
#  de products.js n'est nécessaire.
# ------------------------------------------------------------------

GEN = SRC / "generees"
mapping = {}

if GEN.exists():
    files = sorted(GEN.glob("*.png")) + sorted(GEN.glob("*.jpg"))
    if files:
        print("\nPhotos générées :")
    for f in files:
        pid = f.stem
        im = Image.open(f).convert("RGB")
        # Léger débouchage des ombres : les visuels de love room sont
        # sombres par nature et le fond de page l'est aussi. Sans ça,
        # les matières disparaissent — la leçon des pochons satin.
        g = grade(im, shadow_gamma=1.15, black_point=0.02,
                  warmth=1.02, contrast=1.04, vignette=0.24, desaturate=0.02)
        main = crop_ratio(g, 4 / 5)
        save(main, f"produits/{pid}.webp", 1200)

        # Vignette d'ambiance : le coverflow floute cette image en plein
        # écran. Flouter un fichier de 1200 px avec un rayon de 34 px coûte
        # très cher — et fait carrément tomber le rendu sur certaines
        # machines. Une version de 64 px donne exactement le même flou
        # pour un millième du travail.
        save(main, f"produits/{pid}-amb.webp", 64)

        entry = {"img": f"produits/{pid}.webp",
                 "amb": f"produits/{pid}-amb.webp",
                 "gallery": []}
        # Trois vignettes : un plan large recadré, puis deux détails serrés.
        for i, (frac, cx, cy) in enumerate(
                [(1.0, 0.5, 0.5), (0.52, 0.36, 0.42), (0.52, 0.66, 0.62)], start=1):
            thumb = crop_ratio(g, 1.0) if frac == 1.0 else crop_detail(g, frac, cx, cy)
            save(thumb, f"produits/{pid}-{i}.webp", 800)
            entry["gallery"].append(f"produits/{pid}-{i}.webp")
        mapping[pid] = entry

# Le fichier est toujours écrit, même vide : les pages le chargent en dur.
js = ROOT / "site" / "assets" / "js" / "products-images.js"
# Les visuels produits sont référencés depuis le JavaScript : le tampon de
# tools/stamp_assets.py ne les couvre pas. Sans cette version, un visiteur
# qui a l'ancienne photo en cache la garde après un changement d'image.
import time
version = format(int(time.time()), "x")

lines = ["/* Généré par tools/process_images.py — ne pas modifier à la main.",
         "   Chaque clé correspond à un identifiant de produit, ou à une catégorie",
         "   préfixée par « cat- ». products.js fusionne ce tableau au chargement. */",
         "",
         f"const IM_IMG_V = '{version}';",
         "",
         "const IM_IMAGES = {"]
for pid in sorted(mapping):
    e = mapping[pid]
    gal = ", ".join(f"'{g}'" for g in e["gallery"])
    lines.append(f"  '{pid}': {{ img: '{e['img']}', amb: '{e['amb']}', gallery: [{gal}] }},")
lines += ["};", ""]
js.write_text("\n".join(lines), encoding="utf-8")
print(f"\nproducts-images.js : {len(mapping)} visuel(s) déclaré(s)")

print("\nTerminé.")
