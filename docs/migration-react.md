# Si tu veux passer le site en React / shadcn

Le prototype est en HTML/CSS/JS statique. Le composant `animated-hero.tsx`
fourni suppose Next.js + Tailwind + TypeScript + shadcn/ui. Voici le chemin
complet si tu décides de basculer — mais lis d'abord la section « pourquoi je
ne l'ai pas fait ».

## Pourquoi je ne l'ai pas fait maintenant

1. **Le coût réel dépasse le hero.** Migrer voudrait dire reconstruire les
   six pages, le catalogue, le panier en `localStorage`, l'écran de validation
   et la confirmation. Le hero, c'est 5 % du travail.
2. **La cible de production n'est pas tranchée.** Si le site finit sur
   WooCommerce (l'option la plus probable pour que ton pote gère seul ses
   produits et ses commandes), tout le React serait à jeter.
3. **L'effet ne justifie pas les dépendances.** `framer-motion`,
   `@radix-ui/react-slot`, `class-variance-authority` et `lucide-react` pour un
   mot qui défile et deux boutons : c'est 4 paquets, un bundler et un pas de
   build, contre 30 lignes de CSS et 15 de JS.

L'effet est reproduit à l'identique : pile d'éléments en position absolue,
débordement masqué, trois états (`previous` / `current` / `next`), et une
transition avec léger dépassement — `cubic-bezier(0.24, 1.4, 0.4, 1)` — qui
tient le rôle du ressort `stiffness: 50` de framer-motion.

## Le chemin si tu bascules

### 1. Créer le projet

```bash
npx create-next-app@latest intensemans --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd intensemans
```

Tailwind et TypeScript sont installés par ces options : rien à ajouter.

### 2. Initialiser shadcn/ui

```bash
npx shadcn@latest init
```

L'assistant écrit `components.json`, qui fixe les chemins. Réponses adaptées
à ce projet :

| Question | Réponse |
|---|---|
| Style | New York |
| Base color | Neutral (la palette de la marque sera posée par-dessus) |
| CSS variables | Yes |

### 3. Le dossier `components/ui` n'est pas décoratif

`components.json` déclare `"ui": "@/components/ui"`. C'est là que
`npx shadcn@latest add <composant>` écrit les fichiers, et c'est ce chemin que
résolvent les `import { Button } from "@/components/ui/button"`. Si tu ranges
les composants ailleurs, chaque `add` les remettra dans `components/ui` et tu
te retrouveras avec deux copies divergentes du même composant. shadcn ne
distribue pas un paquet npm : il copie du code chez toi, et cette convention
de chemin est le seul contrat entre le CLI et tes imports.

### 4. Dépendances et composants

```bash
npx shadcn@latest add button
npm install framer-motion lucide-react
```

`add button` installe déjà `@radix-ui/react-slot` et
`class-variance-authority`, et crée `lib/utils.ts` avec le helper `cn`. Pas
besoin de copier `button.tsx` à la main : la version du CLI est à jour.

### 5. Poser le composant

`src/components/ui/animated-hero.tsx` — en adaptant les trois choses qui
comptent pour ce projet :

- **Les mots qui défilent doivent être des produits**, pas des adjectifs :
  `["le champagne.", "les pétales.", "les bougies.", "la planche.", "la surprise."]`.
  L'animation sert la vente, sinon elle décore.
- **L'image de fond** : `assets/img/lieu/hero-chambre.webp` en `next/image`
  avec `priority`, et `hero-chambre-mobile.webp` en art direction sous 760 px.
  Surtout pas une photo de stock : c'est le vrai lieu qui est vendu, une image
  Unsplash d'une autre chambre serait de la publicité mensongère.
- **Le hero doit rester court.** La version d'origine fait `py-20 lg:py-40`
  et centre tout : sur mobile, le catalogue passe sous la ligne de flottaison.
  Le client a déjà réservé, il vient acheter — viser 62 à 72 vh, texte à
  gauche, et les produits visibles en un défilement.

### 6. Palette

Remplacer les variables de `globals.css` par les tokens de la marque, relevés
au pixel sur le logo :

```css
:root {
  --background: 20 9% 4%;      /* #0a0809 */
  --foreground: 27 44% 95%;    /* #fbf1ea */
  --primary:   2 52% 69%;      /* #d98b88 rose poudré */
  --muted:     20 9% 10%;
}
```

Et le duo typographique : Cormorant Garamond pour les titres, Jost pour le
reste, via `next/font/google`.
