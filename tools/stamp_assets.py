#!/usr/bin/env python3
"""
Ajoute un tampon de version aux liens CSS et JS des pages.

Le tampon vient de la date de modification du fichier : le navigateur
recharge la feuille dès qu'elle change, et la garde en cache sinon.
Sans ça, une modification de palette peut rester invisible derrière
le cache — ce qui est exactement arrivé pendant le développement.

    python3 tools/stamp_assets.py
"""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"

PATTERN = re.compile(r'(href|src)="(assets/(?:css|js)/[A-Za-z0-9_.-]+\.(?:css|js))(?:\?v=[0-9a-z]+)?"')


def version(rel):
    f = SITE / rel
    return format(int(f.stat().st_mtime), "x") if f.exists() else "0"


def stamp(page):
    s = page.read_text(encoding="utf-8")
    out = PATTERN.sub(lambda m: f'{m.group(1)}="{m.group(2)}?v={version(m.group(2))}"', s)
    if out != s:
        page.write_text(out, encoding="utf-8")
        return True
    return False


count = 0
for page in sorted(SITE.glob("*.html")):
    if stamp(page):
        count += 1
        print(f"  {page.name}")

print(f"{count} page(s) tamponnée(s).")
