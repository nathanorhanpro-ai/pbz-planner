# Phantom Blade Zero Build Planner (moteur multi-jeux)

Site statique bilingue : un planner de loadout + une page par arme, en anglais (racine) et en français (`/fr/`).

## Structure
- `data/games/<jeu>.json` : données du jeu (générées par `scripts/seed_from_csv.py` depuis les CSV de sources).
- `data/site.json` : `siteUrl` (à remplir une fois le domaine choisi, active canonical, hreflang, og:image, sitemap.xml et robots.txt).
- `src/planner.html`, `src/style.css`, `src/logic.js` (logique partagée navigateur/Node), `src/locales/en.json` et `fr.json` (tous les textes).
- `assets/weapons` (rendus officiels, © S-GAME, récupérés sur pbz.gg ; Shadowless Edge vient du wiki Fextralife), `assets/thumbs` (miniatures 180 px), `assets/ui` (icônes de types et de stats).
- `scripts/build.mjs` : génère `dist/<jeu>/` (site à déployer) et `dist/preview/` (aperçu).
- `scripts/og_images.py` : une image de partage par arme + une pour le planner (polices libres OFL dans `scripts/fonts`). Les balises og:image ne sortent qu'une fois `siteUrl` rempli.
- `scripts/diff.mjs ancien.json nouveau.json` : changelog d'un patch en Markdown.

## Commandes
    python3 scripts/seed_from_csv.py
    python3 scripts/og_images.py   # images de partage 1200x630 dans assets/og/
    node scripts/build.mjs

## Fiabilité des données
Chaque arme porte `check.state` (une invocation sans dégâts mais avec ses stats propres compte comme `single`) : `agree` quand au moins deux sources donnent les mêmes chiffres au niveau 1, sinon `single`, `conflict` ou `missing`. Les valeurs de pbz.gg (niveau 1 et niveau max) sont cohérentes : le niveau max vaut environ 6,9 fois le niveau 1.

Astuce : le dossier partagé est lent en écriture. Pour itérer, copie le projet dans un dossier local, lance le build (moins d'une seconde), puis recopie `dist/`.
- `data/site.json` : `reportUrl` (lien « signaler un chiffre faux », issues GitHub du dépôt), `contact` et `host` (mentions légales), `indexNowKey`. Sur Vercel, `siteUrl` vide est rempli par VERCEL_PROJECT_PRODUCTION_URL.
