# PBZ Arsenal

Site d'astuces non officiel pour Phantom Blade Zero (FR/EN) avec planificateur de build et emplacements publicitaires Google AdSense. Les astuces sont dans `src/tips.py`.

## Générer le site
    python3 src/build.py      # écrit dist/ (110 pages)

## Activer les pubs
Dans `src/config.json` :
- `adsense_client` : votre ID éditeur `ca-pub-…` (ajoute le script AdSense dans chaque page et génère `ads.txt`)
- `slots` : ID des blocs d'annonces (top, infeed, infeed2, side, side2, foot, page). Laissés vides = annonces automatiques.
- `site` : l'URL finale (canonical, sitemap)
- `renders` : true = rendus officiels des armes (src/assets, © S-GAME), false = emblèmes dessinés
Puis relancer `build.py`. Dans AdSense, activez le message de consentement RGPD (Confidentialité et messages) pour l'Europe.

## Déployer sur Vercel
Framework : Other · Build command : `python3 src/build.py` · Output directory : `dist`
