#!/usr/bin/env python3
"""
Génère les photos produit manquantes avec Nano Banana 2 (Gemini 3.1 Flash Image).

    export GEMINI_API_KEY=...          # palier payant obligatoire
    python3 tools/generate_product_photos.py               # tout ce qui manque
    python3 tools/generate_product_photos.py petales-roses # un seul produit
    python3 tools/generate_product_photos.py --draft       # 0.5K, pour juger vite

Les fichiers sortent dans `image/generees/<id>.png`. Un fichier déjà présent
n'est jamais régénéré : pour refaire une photo, supprimer son PNG.

Ensuite : python3 tools/process_images.py
"""

from pathlib import Path
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "image" / "generees"
SCRIPT = Path.home() / ".claude/skills/nano-banana-2-skill/scripts/generate_image.py"

# ------------------------------------------------------------------
#  Style commun — reprend les consignes de docs/plan-photos.md
# ------------------------------------------------------------------

DECOR = (
    "Décor réel de la Love Room, à respecter : mur mat noir profond légèrement "
    "texturé, grand rideau de velours rouge sombre à œillets métalliques, tables "
    "basses gigognes rondes à piètement doré et plateau de verre, sol sombre. "
    "AUCUN autre mobilier dans le cadre que ce qui est explicitement nommé dans le "
    "sujet : pas de lit, pas de tête de lit, pas de fauteuil, pas de canapé, pas de "
    "coussins, pas de plaid. Un mobilier inventé trahit immédiatement que ce n'est "
    "pas la vraie chambre. "
)

STYLE = (
    "Style : photographie publicitaire haut de gamme, prise de nuit dans la pièce. "
    "Éclairage : bougies chaudes en lumière rasante venant de la gauche, un second "
    "point rose poudré très diffus à droite, aucun plafonnier, aucun flash, aucune "
    "lumière du jour. "
    "Optique : 50 mm, ouverture f/2, mise au point sur le sujet, arrière-plan fondu. "
    "Cadrage : portrait 4:5 strict. Le sujet occupe les deux tiers inférieurs, "
    "posé bas dans le cadre ; le tiers supérieur reste un mur noir mat presque vide. "
    "Composition en diagonale montante de la gauche vers la droite. "
    "Le plateau supérieur de la table ferme le bas du cadre : ni étagère "
    "inférieure, ni reflet inversé d'un verre, ni sol vide dans le bas de l'image. "
    "Palette : noir chaud, crème, rose poudré, laiton, un rouge profond du rideau. "
    "Le rideau rouge n'apparaît que sur un seul côté du cadre : c'est un mur de la "
    "pièce, pas une toile de fond symétrique. "
    "Les bougies sont toujours des veilleuses dans un simple verre transparent, "
    "posées bas au premier plan et hors mise au point : jamais de cierge, jamais de "
    "bougeoir en laiton, jamais de cire jaune. Une bougie ne doit jamais être "
    "l'objet le plus clair du cadre. "
    "Aucun reflet coloré étalé sur le plateau de verre : pas de flaque rouge ni "
    "orangée, seulement de fins reflets chauds sur les arêtes dorées. "
    "Exposition : les matières doivent rester lisibles dans les ombres — satin, "
    "verre, laiton — pas de noirs bouchés ni d'aplats vides. "
    "Rendu photographique réaliste, grain fin, aucune retouche visible. "
    "Interdits absolus : aucun texte, aucun chiffre, aucune lettre, aucun logo. "
    "Aucune étiquette sur les bouteilles — ni imprimée, ni vierge, ni blanche : le "
    "verre doit rester nu. Une étiquette blanche devient la zone la plus lumineuse "
    "du cadre et vole le regard. "
    "Aucune personne, aucun visage, aucune main, "
    "aucun élément vulgaire ou suggestif explicite, pas de rose fluo, pas de rouge "
    "criard, pas de cœurs en plastique, pas de confettis, pas de pétales artificiels."
)

# ------------------------------------------------------------------
#  Sujets — un par produit sans photo
# ------------------------------------------------------------------

PROMPTS = {

    # ---- Packs ----
    "pack-intense":
        "la mise en scène du pack signature, posée sur un drap de satin anthracite "
        "froissé, vue de trois quarts en légère plongée. Dans le cadre : des pétales "
        "de roses, rouge sombre et rose poudré, éparpillés sur le satin sans former "
        "de motif ni de cœur ; un pochon en satin noir fermé par son ruban, "
        "entièrement lisse et sans aucune impression ; une bouteille de champagne en "
        "verre sombre entièrement nue posée dans un seau à glace en métal noir mat, "
        "en amorce sur le bord du cadre ; deux flûtes servies aux bulles fines ; et "
        "un jeu de cartes noir mat étalé en éventail, dos entièrement uni, sans "
        "motif, sans chiffre et sans figure. Deux veilleuses dans un verre "
        "transparent au premier plan, hors mise au point. Le satin capte la lumière "
        "en plis longs et brillants : c'est la matière qui porte l'image. "
        "Le cadre se referme sur la surface du satin : aucun meuble, aucune tête de "
        "lit, aucun mur en pied, aucun sol, aucun plafond. "
        "Le pochon fermé représente à lui seul l'accessoire intime du pack : aucun "
        "objet de cette nature ne doit apparaître dans l'image, même partiellement, "
        "même suggéré par une silhouette ou une ombre. Rien d'explicite, rien de "
        "suggestif : l'image doit rester celle d'une attention préparée, élégante et "
        "discrète. " + DECOR,

    "pack-planche-champagne":
        "une planche apéritive à partager pour deux, posée sur le plateau de verre de la table basse dorée. Sur une ardoise noire : rosette et jambon sec roulés en rosaces, copeaux de parmesan, un fromage à pâte molle entamé, olives noires, cerneaux de noix, deux figues coupées en deux, gressins dressés debout. À droite, une bouteille de champagne en verre sombre entièrement nue dans un seau à glace en métal noir mat, glaçons et condensation. Deux coupes de champagne remplies, bulles fines qui montent, le verre capte un reflet doré. Deux bougies chauffe-plat allumées au premier plan, volontairement floues. En arrière-plan, le rideau de velours rouge et le mur noir mat, hors focus. Vue de trois quarts, légèrement en plongée. " + DECOR,
    "pack-planche-vin":
        "une planche apéritive généreuse vue légèrement de haut, sur le plateau de verre de la table basse dorée. Sur une ardoise noire : charcuteries roulées, fromages affinés disposés en éventail, tranches de pain grillé, une petite grappe de raisin noir, amandes. À côté, une bouteille de vin rouge en verre sombre entièrement nue, débouchée, bouchon et tire-bouchon en métal noir posés à plat. Deux verres à vin servis, la lumière de bougie traverse le vin et projette un reflet rouge profond sur le verre de la table. Une seule bougie allumée à gauche du cadre. Ambiance plus ambrée et plus chaude que le champagne, aucun seau à glace. " + DECOR,
    "pack-double-bulles":
        "deux bouteilles de champagne en verre sombre entièrement nues côte à côte dans un grand seau à glace en métal noir mat rempli de glaçons translucides, condensation et gouttes qui perlent sur le verre sombre des bouteilles, col givré. Devant le seau, deux coupes de champagne vides posées sur un plateau miroir doré qui renvoie la lumière des bougies. Cadrage serré, vue prise depuis un angle de la pièce et non de face : le mur noir mat occupe le fond, et le rideau de velours rouge n'apparaît que sur UN SEUL côté du cadre, en bande verticale très floue. Un liseré de lumière chaude souligne l'épaule des bouteilles. La bougie reste hors champ ou masquée par le seau : on ne voit que sa lueur, jamais un aplat clair. " + DECOR,
    "pack-anniversaire":
        "un coin de la chambre décoré pour un anniversaire. Contre le mur noir mat, une composition de ballons en latex mat, noirs et rose poudré, de tailles différentes, sans aucune inscription. Une guirlande de petites ampoules chaudes court le long du mur et donne des points de lumière flous. Sur la table basse dorée, une bouteille de champagne en verre sombre entièrement nue dans un seau à glace noir, deux coupes, et une petite assiette de macarons rose pâle. Trois bougies allumées de hauteurs différentes. Le rideau de velours rouge en amorce sur UN SEUL bord du cadre. Le cadrage se referme sur la composition de ballons et la table : rien d'autre de la pièce n'entre dans l'image, pas de lit ni de mobilier au fond, pas de mur clair. Aucun chiffre, aucune lettre, aucun ballon métallisé brillant. " + DECOR,
    # ---- À déguster ----
    "champagne-bouteille":
        "Une bouteille de champagne en verre sombre entièrement nue dans un seau à glace en métal noir mat, glaçons "
        "et condensation, deux coupes de champagne vides posées à côté sur du satin noir froissé. "
        "Le col givré de la bouteille capte un reflet ambré. Fond noir profond, cadrage serré.",

    "planche-apero":
        "Une planche apéritive vue légèrement de haut sur une ardoise noire : charcuteries roulées, "
        "fromages affinés en éventail, cornichons, olives, noix, raisin, pain grillé. Composition "
        "dense et soignée. Deux petites assiettes crème et deux verres flous en arrière-plan. "
        "Bougie allumée hors cadre à gauche qui éclaire la scène en rasant.",

    "vin-bouteille":
        "Une bouteille de vin rouge en verre sombre entièrement nue, débouchée, et deux verres à vin servis posés "
        "sur une table basse en verre. Le vin est traversé par une lumière chaude de bougie. "
        "Tire-bouchon en métal noir posé à côté. Fond mur noir mat, arrière-plan très flou.",

    "duo-cocktails":
        "Deux cocktails servis dans des verres à facettes posés sur un plateau miroir rond doré, "
        "glaçons transparents, un zeste d'agrume et une feuille de menthe, buée sur le verre. "
        "Un shaker en métal noir mat en arrière-plan flou. Fond noir, lumière rasante ambrée "
        "et un très léger halo rose poudré.",

    "selection-softs":
        "Une sélection de boissons fraîches sans alcool posée sur un plateau noir : deux bouteilles "
        "en verre sombre entièrement nues, une carafe d'eau avec des rondelles de citron, deux verres remplis "
        "de glaçons. Gouttes de condensation. Fond noir mat, lumière latérale chaude, "
        "un reflet rose poudré discret sur le verre.",

    # ---- À décorer ----
    "petales-roses":
        "Des pétales de roses rouges sombres et rose poudré éparpillés sur un drap de satin noir "
        "froissé d'un grand lit, vus légèrement de haut. Quelques pétales sur l'oreiller. "
        "Lumière chaude très rasante qui dessine les plis du satin et le velours des pétales. "
        "Deux bougies allumées floues en arrière-plan. Aucun objet en plastique.",

    "deco-romantique":
        "Un coin de chambre mis en scène : lit au satin noir tiré, pétales de roses disposés sur "
        "le drap, une dizaine de bougies allumées de tailles différentes posées au sol et sur une "
        "table de nuit noire, guirlande de petites ampoules chaudes le long du mur noir. "
        "Ambiance nocturne intime, lumière uniquement des bougies.",

    "deco-anniversaire":
        "Une composition de ballons mats noirs et rose poudré de tailles différentes contre un mur "
        "noir mat, avec une guirlande de petites ampoules chaudes et trois bougies allumées sur une "
        "console noire. Les ballons captent un reflet doux. Aucun chiffre, aucune lettre, "
        "aucune inscription, pas de ballon brillant métallisé.",

    "ballons":
        "Une grappe serrée de ballons en latex mat, noirs et rose poudré, contre un mur noir mat, "
        "cadrage serré en légère contre-plongée. Un reflet chaud allongé sur la courbe de chaque "
        "ballon. Arrière-plan très flou. Aucune inscription.",

    "deco-demande-mariage":
        "Une mise en scène pour une demande en mariage dans une chambre sombre : un chemin de "
        "bougies chauffe-plat allumées au sol formant une courbe, des pétales de roses rouges "
        "sombres entre les bougies, une bouteille de champagne en verre sombre entièrement nue dans un seau à glace "
        "et deux coupes sur une table basse. Vue large, ambiance nocturne, aucune lettre, "
        "aucune inscription, aucune bague visible.",

    # ---- Petites attentions ----
    "chocolats":
        "Une boîte de chocolats fins ouverte, posée sur une table de nuit noire : chocolats noirs "
        "carrés et ronds, quelques-uns décorés d'un filet de chocolat, papier de soie crème. "
        "Une bougie allumée à côté, hors focus. Fond noir profond, cadrage serré en légère "
        "plongée. Aucun emballage imprimé, aucune marque.",

    "fleurs":
        "Un bouquet de roses rouges sombres et de fleurs rose poudré, dans un vase cylindrique "
        "noir mat, posé sur une console sombre. Quelques pétales tombés à côté du vase. "
        "Lumière chaude rasante venant de la gauche qui détache les pétales du fond noir. "
        "Arrière-plan mur noir très flou.",

    "gourmandises":
        "Un petit plateau noir de gourmandises sucrées pour la fin de soirée : macarons rose pâle "
        "et crème, guimauves, fraises fraîches, quelques carrés de chocolat noir, une petite "
        "coupelle de coulis. Deux coupes de champagne floues en arrière-plan. Fond noir, "
        "lumière basse et chaude, cadrage serré.",

    # ---- Visuels de catégorie ----
    "cat-deguster":
        "Nature morte verticale : une bouteille de champagne en verre sombre entièrement nue dans un seau à glace, "
        "deux coupes servies et le bord d'une planche de charcuterie sur une ardoise noire, "
        "bougies allumées au premier plan flou. Fond noir mat. Composition qui laisse de "
        "l'espace sombre dans le tiers inférieur pour y poser du texte.",

    "cat-decorer":
        "Nature morte verticale : pétales de roses sur du satin noir froissé, bougies allumées "
        "de différentes hauteurs, une guirlande de petites ampoules chaudes floue en arrière-plan. "
        "Fond noir mat. Composition qui laisse de l'espace sombre dans le tiers inférieur "
        "pour y poser du texte.",

    "cat-attentions":
        "Nature morte verticale : une boîte de chocolats fins ouverte, un petit bouquet de roses "
        "sombres dans un vase noir, un ruban de satin noir posé en boucle, une bougie allumée. "
        "Fond noir mat. Composition qui laisse de l'espace sombre dans le tiers inférieur "
        "pour y poser du texte.",
}


def build(subject):
    return f"Crée une image de : {subject} {STYLE}"


def generate(pid, resolution):
    dest = OUT / f"{pid}.png"
    if dest.exists():
        print(f"  = {pid:<26} déjà présent, ignoré")
        return True

    cmd = [
        "uv", "run", str(SCRIPT),
        "--prompt", build(PROMPTS[pid]),
        "--filename", str(dest),
        "--resolution", resolution,
        "--aspect-ratio", "4:5",
    ]

    for attempt in range(1, 4):
        res = subprocess.run(cmd, capture_output=True, text=True)
        if dest.exists():
            print(f"  ✓ {pid:<26} {dest.stat().st_size // 1024} Ko")
            return True
        err = (res.stdout + res.stderr).strip()
        if "limit: 0" in err:
            print(f"  ✗ {pid:<26} quota à zéro : le palier gratuit ne donne pas accès "
                  f"à ce modèle, il faut activer la facturation.")
            return False
        if "429" in err and attempt < 3:
            print(f"  … {pid:<26} 429, nouvelle tentative dans 45 s ({attempt}/3)")
            time.sleep(45)
            continue
        print(f"  ✗ {pid:<26} {err.splitlines()[0][:160] if err else 'échec inconnu'}")
        return False
    return False


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    resolution = "0.5K" if "--draft" in sys.argv else "2K"
    ids = args or list(PROMPTS)

    unknown = [i for i in ids if i not in PROMPTS]
    if unknown:
        print(f"Identifiants inconnus : {', '.join(unknown)}")
        print(f"Disponibles : {', '.join(PROMPTS)}")
        return 1

    OUT.mkdir(parents=True, exist_ok=True)
    print(f"Génération de {len(ids)} visuel(s) en {resolution}, ratio 4:5 :\n")

    ok = 0
    for pid in ids:
        if generate(pid, resolution):
            ok += 1
        else:
            break   # inutile d'insister si le quota est fermé

    print(f"\n{ok}/{len(ids)} réussis.")
    if ok:
        print("Étape suivante : python3 tools/process_images.py")
    return 0 if ok == len(ids) else 1


if __name__ == "__main__":
    sys.exit(main())
