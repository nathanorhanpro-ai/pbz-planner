#!/usr/bin/env python3
"""Génère le site statique PBZ Arsenal dans ../dist à partir de data.json et config.json."""
import json, shutil, html, pathlib, datetime, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from tips import GUIDES, CATS, SRC as TSRC, LEVELS
TODAY = datetime.date.today().isoformat()

SRC = pathlib.Path(__file__).resolve().parent
OUT = SRC.parent / "dist"
D = json.loads((SRC / "data.json").read_text())
C = json.loads((SRC / "config.json").read_text())
SITE = C["site"].rstrip("/")
ITEMS = D["items"]
BY = {i["id"]: i for i in ITEMS}
STATS = D["stats"]
e = lambda s: html.escape(str(s), quote=True)

L = {
 "en": dict(
  code="en", locale="en_US", pfx="", other="fr", other_name="FR",
  kinds={"blade": "Blade", "edge": "Phantom Edge"}, kindsPl={"blade": "Blades", "edge": "Phantom Edges"},
  types={"One-Handed": "One-handed", "Dual-Wield": "Dual-wield", "Two-Handed": "Two-handed", "Artifice": "Artifice", "Destructive": "Destructive", "Martial": "Martial", "Ranged": "Ranged", "Summoning": "Summoning"},
  rarity={"Common": "Common", "Rare": "Rare", "Epic": "Epic", None: "Unknown rarity"},
  stats={"damage": "Damage", "guardBreak": "Guard break", "status": "Status", "summonHealth": "Summon HP", "summonDamage": "Summon damage", "hpRecovery": "HP recovery", "shaChiRecovery": "Sha-Chi recovery"},
  trust={"agree": "Sources agree", "verified": "Verified in game", "conflict": "Sources disagree: treat as estimates", "single": "Single source", "missing": "No data yet"},
  title="Phantom Blade Zero Build Planner, Tier List & Weapon Stats | PBZ Arsenal",
  desc="Plan your Phantom Blade Zero build: all 52 blades and Phantom Edges with base and max stats, an auto tier list, a 4-weapon comparator and shareable builds.",
  nav=[("", "Tips"), ("#guides", "Guides"), ("planner/", "Build planner"), ("planner/#tiers", "Tier list")],
  search="Search", ad="Advertisement",
  h1="Plan your Phantom Blade Zero build", h1_html="Forge your <em>Phantom Blade</em> build.", cta1="Build my loadout", cta2="See the tier list", podium="Current S-tier", f_w="weapons", f_s="sources", f_t="tier lists", lead="Pick two blades and two Phantom Edges, get a score and tips, then share the link. Every weapon, every stat, base and max level.",
  weapons="weapons", sourcesN="sources cross-checked", updated="Data updated",
  k_build="Loadout", h_build="Your build", save="Save build", share="Copy link", text="Copy as text", reset="Recommended", random="Random", saved="My builds",
  k_ars="Arsenal", h_ars="Every weapon", searchPh="Search a weapon…", sort="Sort by", sorts=[("score", "Score"), ("damage", "Damage"), ("guardBreak", "Guard break"), ("status", "Status"), ("name", "Name")], grid="Cards", table="Table", shown="shown",
  k_cmp="Head to head", h_cmp="Compare up to 4 weapons", lead_cmp="Winning value in green for each stat. Switch Base / Max at any time.",
  k_tier="Ranking", h_tier="Auto tier list", lead_tier="Computed from stats only: damage compared with the best weapon of the same category plus guard break or status (75/25 for blades, 55/45 for Phantom Edges, which are mostly used for utility). Tiers split each category by rank: top 15% S, then A, B, C, D. It is a numbers ranking, not a meta opinion.",
  faq_h="FAQ", faq=[
   ("What is the best weapon in Phantom Blade Zero?", "By raw numbers, the S-tier of the tier list above holds the highest damage with guard break or status. The best build mixes two blade styles and at least one guard breaker."),
   ("Where do the stats come from?", "Values are cross-checked between several public community sources. Each weapon shows whether sources agree, disagree or are missing."),
   ("Can I share my build?", "Yes: the address bar always holds your build. Use “Copy link” or “Copy as text” for Discord or Reddit."),
  ],
  disclaimer="PBZ Arsenal is an unofficial fan site. It is not affiliated with, endorsed or sponsored by S-GAME. Phantom Blade Zero and all related names are trademarks of their respective owners. Stats come from community sources and may change with game updates.",
  credit="Weapon renders © S-GAME, used for identification only.", privacy="Privacy & cookies", legal="Legal notice", data_from="Game data", back="← Back to the planner",
  w_title="{name} stats, tier & best build | Phantom Blade Zero",
  w_desc="{name} in Phantom Blade Zero: {type} {kind}, {rarity}. Damage {dmg} at max level, tier {tier}. Base and max stats, sources and best pairings.",
  w_intro="{name} is a {rarity_l} {type_l} {kind_l} in Phantom Blade Zero.",
  w_rank="At max level it deals {dmg} damage, #{rank} of {n} {kindsPl_l}, which puts it in tier {tier} with a score of {score}/100.",
  w_gb="It breaks guards ({gb} at max level), useful against shielded enemies and bosses.",
  w_st="It builds up status effects ({st} at max level).",
  w_nodata="Its stats have not been published yet.",
  w_stats="Stats", w_base="Base level", w_max="Max level", w_pair="Good pairings", w_same="Other {type_l} weapons", w_open="Open in the planner", w_rel="Data reliability", w_src="Values by source (base level)",
  tier="Tier", score="Score", unranked="unranked",
 ),
 "fr": dict(
  code="fr", locale="fr_FR", pfx="/fr", other="en", other_name="EN",
  kinds={"blade": "Lame", "edge": "Lame fantôme"}, kindsPl={"blade": "Lames", "edge": "Lames fantômes"},
  types={"One-Handed": "Une main", "Dual-Wield": "Deux lames", "Two-Handed": "Deux mains", "Artifice": "Artifice", "Destructive": "Destructrice", "Martial": "Martiale", "Ranged": "À distance", "Summoning": "Invocation"},
  rarity={"Common": "Commune", "Rare": "Rare", "Epic": "Épique", None: "Rareté inconnue"},
  stats={"damage": "Dégâts", "guardBreak": "Brise-garde", "status": "Altération", "summonHealth": "PV invocation", "summonDamage": "Dégâts invocation", "hpRecovery": "Soin PV", "shaChiRecovery": "Récup. Sha-Chi"},
  trust={"agree": "Sources concordantes", "verified": "Vérifié en jeu", "conflict": "Sources en désaccord : valeurs estimées", "single": "Source unique", "missing": "Pas encore de données"},
  title="Phantom Blade Zero : planificateur de build, tier list et stats des armes | PBZ Arsenal",
  desc="Créez votre build Phantom Blade Zero : les 52 lames et lames fantômes avec stats de base et max, tier list automatique, comparateur 4 armes et builds partageables.",
  nav=[("", "Astuces"), ("#guides", "Guides"), ("planner/", "Planificateur"), ("planner/#tiers", "Tier list")],
  search="Rechercher", ad="Publicité",
  h1="Créez votre build Phantom Blade Zero", h1_html="Forgez votre build <em>Phantom Blade</em>.", cta1="Créer mon build", cta2="Voir la tier list", podium="Tier S du moment", f_w="armes", f_s="sources", f_t="tier lists", lead="Choisissez deux lames et deux lames fantômes, obtenez un score et des conseils, puis partagez le lien. Toutes les armes, toutes les stats, niveau de base et max.",
  weapons="armes", sourcesN="sources recoupées", updated="Données du",
  k_build="Équipement", h_build="Votre build", save="Sauvegarder", share="Copier le lien", text="Copier en texte", reset="Recommandé", random="Aléatoire", saved="Mes builds",
  k_ars="Arsenal", h_ars="Toutes les armes", searchPh="Chercher une arme…", sort="Trier par", sorts=[("score", "Score"), ("damage", "Dégâts"), ("guardBreak", "Brise-garde"), ("status", "Altération"), ("name", "Nom")], grid="Cartes", table="Tableau", shown="affichées",
  k_cmp="Face à face", h_cmp="Comparez jusqu'à 4 armes", lead_cmp="La meilleure valeur de chaque stat est en vert. Basculez Base / Max à tout moment.",
  k_tier="Classement", h_tier="Tier list automatique", lead_tier="Calculée uniquement à partir des stats : les dégâts comparés à la meilleure arme de la même catégorie plus le brise-garde ou l'altération (75/25 pour les lames, 55/45 pour les lames fantômes, surtout utilisées comme utilitaires). Les tiers découpent chaque catégorie par rang : les 15 % du haut en S, puis A, B, C, D. C'est un classement chiffré, pas un avis sur la méta.",
  faq_h="Questions fréquentes", faq=[
   ("Quelle est la meilleure arme de Phantom Blade Zero ?", "En chiffres bruts, le tier S de la tier list ci-dessus réunit les plus gros dégâts avec brise-garde ou altération. Le meilleur build mélange deux styles de lames et au moins une arme qui brise la garde."),
   ("D'où viennent les stats ?", "Les valeurs sont recoupées entre plusieurs sources communautaires publiques. Chaque arme indique si les sources concordent, divergent ou manquent."),
   ("Puis-je partager mon build ?", "Oui : la barre d'adresse contient toujours votre build. Utilisez « Copier le lien » ou « Copier en texte » pour Discord ou Reddit."),
  ],
  disclaimer="PBZ Arsenal est un site de fan non officiel. Il n'est ni affilié, ni approuvé, ni sponsorisé par S-GAME. Phantom Blade Zero et les noms associés sont des marques de leurs propriétaires respectifs. Les stats viennent de sources communautaires et peuvent changer avec les mises à jour du jeu.",
  credit="Rendus des armes © S-GAME, utilisés uniquement pour identifier les armes.", privacy="Confidentialité et cookies", legal="Mentions légales", data_from="Données du jeu", back="← Retour au planificateur",
  w_title="{name} : stats, tier et meilleur build | Phantom Blade Zero",
  w_desc="{name} dans Phantom Blade Zero : {kind} {type}, {rarity}. {dmg} dégâts au niveau max, tier {tier}. Stats de base et max, sources et meilleures associations.",
  w_intro="{name} est une {kind_l} « {type} » de rareté {rarity_l} dans Phantom Blade Zero.",
  w_rank="Au niveau max elle inflige {dmg} dégâts, n°{rank} sur {n} {kindsPl_l}, ce qui la place en tier {tier} avec un score de {score}/100.",
  w_gb="Elle brise la garde ({gb} au niveau max), utile contre les boucliers et les boss.",
  w_st="Elle applique une altération ({st} au niveau max).",
  w_nodata="Ses stats n'ont pas encore été publiées.",
  w_stats="Stats", w_base="Niveau de base", w_max="Niveau max", w_pair="Bonnes associations", w_same="Autres armes « {type} »", w_open="Ouvrir dans le planificateur", w_rel="Fiabilité des données", w_src="Valeurs par source (niveau de base)",
  tier="Tier", score="Score", unranked="non classée",
 ),
}

# ---------- scores (même formule que common.js) ----------
def pool(kind): return [i for i in ITEMS if i["kind"] == kind]
def maxof(kind, s, lvl="max"): return max([1] + [i["stats"][lvl][s] or 0 for i in pool(kind)])
def score(it, lvl="max"):
    v = it["stats"][lvl]
    if v["damage"] is None: return None
    d = v["damage"] / maxof(it["kind"], "damage", lvl)
    g = v["guardBreak"] / maxof(it["kind"], "guardBreak", lvl) if v["guardBreak"] is not None else 0
    s = v["status"] / maxof(it["kind"], "status", lvl) if v["status"] is not None else 0
    wd, wu = W[it["kind"]]
    return round(wd * d + wu * max(g, s))
W = {"blade": (75, 25), "edge": (55, 45)}
def tier_of(it, lvl="max"):
    sc = score(it, lvl)
    if sc is None: return None
    arr = sorted([x for x in (score(i, lvl) for i in pool(it["kind"])) if x is not None], reverse=True)
    p = arr.index(sc) / len(arr)
    return "S" if p < 0.15 else "A" if p < 0.4 else "B" if p < 0.65 else "C" if p < 0.85 else "D"
def state(it): return "verified" if it["check"]["verified"] else it["check"]["state"]

GLYPH = {
 "One-Handed": '<path d="M4 20l3-3M5 15l4 4M8 16L19 5V3h-2L6 14"/>',
 "Dual-Wield": '<path d="M3 21l2.5-2.5M4 17l3 3M6.5 17.5L18 6V4h-2L4.5 15.5"/><path d="M21 21l-2.5-2.5M20 17l-3 3M17.5 17.5L6 6V4h2l11.5 11.5"/>',
 "Two-Handed": '<path d="M3 21l3.5-3.5M4 15l5 5M7.5 16.5L20 4"/><path d="M6.5 12.5l5 5L21 8V3h-5z"/>',
 "Artifice": '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.3 5.3l2.8 2.8M15.9 15.9l2.8 2.8M18.7 5.3l-2.8 2.8M8.1 15.9l-2.8 2.8"/>',
 "Destructive": '<path d="M4 21L14.5 10.5"/><path d="M11 5.5l7.5 7.5 2.5-2.5c-1-4-3.5-6.5-7.5-7.5z"/>',
 "Martial": '<path d="M3 21L17 7"/><path d="M14 4l6-1-1 6-2.5-.5-.5-2.5-2.5-.5z"/><path d="M6 15l3 3"/>',
 "Ranged": '<path d="M6 3a15 15 0 0 1 15 15"/><path d="M6 3l15 15"/><path d="M3 21l10.5-10.5M10.5 10h3.5v3.5"/>',
 "Summoning": '<path d="M12 21.5c-3.6 0-6-2.6-6-5.8 0-4.2 3.6-5.7 3-11.2 4 1.8 9 5.6 9 11.2 0 3.2-2.4 5.8-6 5.8z"/><circle cx="12" cy="15.5" r="2"/>',
}
def glyph(it, mode=""):
    if C.get("renders") and it.get("image"):
        src = f'/img/{"weapons" if mode == "tall" else "m"}/{it["image"]}'
        return f'<span class="art {mode} rar-{it["rarity"]}" data-cjk="{"刃" if it["kind"] == "blade" else "影"}" aria-hidden="true"><img src="{src}" alt="{e(it["name"]) if mode == "tall" else ""}" loading="{"eager" if mode == "tall" else "lazy"}" decoding="async"></span>'
    return f'<span class="glyph {mode} rar-{it["rarity"]}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">{GLYPH[it["type"]]}</svg></span>'
LOGO = '<svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="5" fill="#e5432f" transform="rotate(-5 16 16)"/><path d="M9.5 23.5L22 11l1.6-4.1L19.5 8.5 7 21z" fill="#fff3e6"/><path d="M7.2 18.6l6.2 6.2" stroke="#07080b" stroke-width="2.2" stroke-linecap="round"/></svg>'
FAVICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="5" fill="#e5432f" transform="rotate(-5 16 16)"/><path d="M9.5 23.5L22 11l1.6-4.1L19.5 8.5 7 21z" fill="#fff3e6"/><path d="M7.2 18.6l6.2 6.2" stroke="#07080b" stroke-width="2.2" stroke-linecap="round"/></svg>'


import random as _r
def _ridge(y, amp, seed, n=9, w=1600, h=700):
    _r.seed(seed); pts=[(0,y)]
    for k in range(1,n+1):
        pts.append((w*k/n, y-_r.uniform(.15,1)*amp))
    d=f"M0 {h} L0 {y} "
    for (x0,y0),(x1,y1) in zip(pts,pts[1:]):
        mx=(x0+x1)/2; d+=f"Q{x0+(x1-x0)*.25:.0f} {min(y0,y1)-amp*.35:.0f} {mx:.0f} {(y0+y1)/2-amp*.1:.0f} T{x1:.0f} {y1:.0f} "
    return d+f"L{w} {h}Z"
SCENE = f"""<svg viewBox="0 0 1600 700" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121624"/><stop offset=".7" stop-color="#0a0c12"/><stop offset="1" stop-color="#07080b"/></linearGradient>
<radialGradient id="moon" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#f3e3c2" stop-opacity=".55"/><stop offset=".35" stop-color="#e5432f" stop-opacity=".12"/><stop offset="1" stop-color="#e5432f" stop-opacity="0"/></radialGradient>
<filter id="blur"><feGaussianBlur stdDeviation="22"/></filter><filter id="glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#07080b" stop-opacity="0"/><stop offset="1" stop-color="#07080b"/></linearGradient></defs>
<rect width="1600" height="700" fill="url(#sky)"/>
<g class="moon"><circle cx="1010" cy="96" r="230" fill="url(#moon)"/><circle cx="1010" cy="96" r="50" fill="#efe6d2" opacity=".9"/><circle cx="1029" cy="83" r="50" fill="#121624" opacity=".22"/></g>
<path d="{_ridge(470,170,4)}" fill="#1a1f2d" opacity=".75"/>
<g class="mist"><ellipse cx="500" cy="470" rx="520" ry="46" fill="#efe6d2" opacity=".06" filter="url(#blur)"/><ellipse cx="1300" cy="430" rx="420" ry="40" fill="#efe6d2" opacity=".05" filter="url(#blur)"/></g>
<path d="{_ridge(540,150,11)}" fill="#121520"/>
<g class="mist2"><ellipse cx="900" cy="560" rx="700" ry="50" fill="#efe6d2" opacity=".05" filter="url(#blur)"/></g>
<path d="{_ridge(620,110,23,7)}" fill="#0b0d13"/>
<path class="slash" d="M140 660 C 600 420, 1000 300, 1560 60" fill="none" stroke="#e5432f" stroke-width="2.4" stroke-linecap="round" filter="url(#glow)" opacity=".85"/>
<rect width="1600" height="700" fill="url(#fade)"/></svg>"""

def fmt(n, t):
    if n is None: return "—"
    s = f"{n:,}"
    return s.replace(",", " ") if t["code"] == "fr" else s

def ad(t, slot, cls, fmt_="auto"):
    return f'<div class="ad-box"><span class="ad-label">{t["ad"]}</span><div class="ad ph {cls}" data-ad="{slot}" data-format="{fmt_}"></div></div>'

def head(t, title, desc, path, alt_path, extra=""):
    url = SITE + path
    ads = ""
    if C.get("adsense_client"):
        ads = f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={e(C["adsense_client"])}" crossorigin="anonymous"></script>'
    ga = C.get("ga4_id")
    gtag = f'<script async src="https://www.googletagmanager.com/gtag/js?id={e(ga)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}gtag("js",new Date());gtag("config","{e(ga)}");</script>' if ga else ""
    en_p, fr_p = (path, alt_path) if t["code"] == "en" else (alt_path, path)
    return f'''<!doctype html>
<html lang="{t["code"]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="en" href="{SITE}{en_p}">
<link rel="alternate" hreflang="fr" href="{SITE}{fr_p}">
<link rel="alternate" hreflang="x-default" href="{SITE}{en_p}">
<meta name="theme-color" content="#0c0f11">
<meta property="og:type" content="website"><meta property="og:site_name" content="PBZ Arsenal"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}"><meta property="og:url" content="{url}"><meta property="og:image" content="{SITE}/og.png"><meta property="og:locale" content="{t["locale"]}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,700&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&family=Ma+Shan+Zheng&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css?v={C["v"]}">
<script>window.PBZ_IMG={json.dumps("/img/" if C.get("renders") else "")};window.ADS={json.dumps({"client": C.get("adsense_client", ""), "slots": C.get("slots", {})})};</script>
{ads}{gtag}{extra}
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="2.2"/></filter></svg>
<header class="top"><div class="in">
<a class="brand" href="{t["pfx"]}/">{LOGO}PBZ <b>Arsenal</b> <small>FAN</small></a>
<nav class="nav">{"".join(f'<a href="{t["pfx"]}/{h}">{l}</a>' for h, l in t["nav"])}</nav>
{{SEARCH}}
<a class="lang" href="{alt_path}" hreflang="{t["other"]}" lang="{t["other"]}">{t["other_name"]}</a>
</div></header>
'''

def foot(t):
    o = L["fr"] if t["code"] == "en" else L["en"]
    return f'''<footer><div class="in">
{ad(t, "foot", "ad-foot")}
<p class="disclaimer"><i class="seal">注</i><span>{e(t["disclaimer"])}{" " + e(t["credit"]) if C.get("renders") else ""}</span></p>
<div class="links"><a href="{t["pfx"]}/">PBZ Arsenal</a><a href="{t["pfx"]}/privacy/">{t["privacy"]}</a><a href="{t["pfx"]}/legal/">{t["legal"]}</a><span>{t["data_from"]} : v{D["version"]} · {D["updated"]}</span></div>
</div></footer>
'''

def sidebar(t):
    return f'<aside class="side"><div class="sticky">{ad(t, "side", "ad-side")}{ad(t, "side2", "ad-side2")}</div></aside>'

def write(path, s):
    p = OUT / path.lstrip("/")
    if path.endswith("/"): p = p / "index.html"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(s)

ASSET_V = C["v"]
def scripts(*names): return "".join(f'<script src="/{n}?v={ASSET_V}"></script>' for n in names)

# ---------- page planificateur ----------
def home(t):
    other = L[t["other"]]
    path, alt = t["pfx"] + "/planner/", other["pfx"] + "/planner/"
    nsrc = len({s for i in ITEMS for s in i["check"]["sources"]})
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebApplication", "name": "PBZ Arsenal", "url": SITE + path, "applicationCategory": "GameApplication", "operatingSystem": "Web", "inLanguage": t["code"], "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR"}, "description": t["desc"]},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in t["faq"]]}]}
    h = head(t, t["title"], t["desc"], path, alt, f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>')
    h = h.replace("{SEARCH}", f'<button type="button" class="searchbtn" id="searchbtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span>{t["search"]}</span><kbd>Ctrl K</kbd></button>')
    sorts = "".join(f'<option value="{k}">{l}</option>' for k, l in t["sorts"])
    top = [i for k in ("blade", "edge") for i in sorted([x for x in pool(k) if score(x) is not None], key=lambda x: -score(x))[:2]]
    podium = "".join(f'<a href="{t["pfx"]}/w/{i["id"]}/">{glyph(i)}<span><span class="nm">{e(i["name"])}</span><br><small>{t["kinds"][i["kind"]]} · {t["types"][i["type"]]}</small></span><span style="display:grid;justify-items:end;gap:6px"><span class="tbadge t-{tier_of(i)}">{tier_of(i)}</span><span class="num">{fmt(i["stats"]["max"]["damage"], t)}</span></span></a>' for i in top)
    body = f'''<div class="hero"><div class="scene">{SCENE}</div>
<div class="in"><div>
  <span class="kick"><i class="seal">零</i>Phantom Blade Zero · {t["k_build"]}</span>
  <h1>{t["h1_html"]}</h1>
  <p class="lead">{e(t["lead"])}</p>
  <div class="ctas"><a class="btn lg" href="#build">{t["cta1"]} →</a><a class="btn ghost lg" href="#tiers">{t["cta2"]}</a></div>
  <div class="facts"><div><b>{len(ITEMS)}</b><span>{t["f_w"]}</span></div><div><b>{nsrc}</b><span>{t["f_s"]}</span></div><div><b>2</b><span>{t["f_t"]}</span></div><div><b>v{D["version"]}</b><span>{D["updated"]}</span></div></div>
</div>
<div class="podium"><h3><i class="seal" style="width:24px;height:24px;font-size:16px">榜</i>{t["podium"]}</h3>{podium}</div>
</div></div>
<div class="ad-band">{ad(t, "top", "ad-top")}</div>
<div class="wrap"><main>
<section id="build" aria-labelledby="h-build">
  <div class="shead"><div><span class="kick"><i class="seal">甲</i>{t["k_build"]}</span><h2 id="h-build">{t["h_build"]}</h2></div><div class="seg" data-lvl-seg></div></div>
  <div class="slots" id="slots"></div>
  <div class="verdict">
    <div class="score frame" id="score"></div>
    <div class="panel frame">
      <ul class="advice" id="advice"></ul>
      <div class="actions">
        <button type="button" class="btn" id="act-share">{t["share"]}</button>
        <button type="button" class="btn ghost" id="act-text">{t["text"]}</button>
        <button type="button" class="btn ghost" id="act-save">★ {t["save"]}</button>
        <button type="button" class="btn ghost sm" id="act-reset">{t["reset"]}</button>
        <button type="button" class="btn ghost sm" id="act-random">🎲 {t["random"]}</button>
        <span class="toast" id="toast" role="status"></span>
      </div>
      <div><span class="kick" style="margin-bottom:6px">{t["saved"]}</span><div class="saved" id="saved"></div></div>
    </div>
  </div>
</section>

<section id="arsenal" aria-labelledby="h-ars">
  <div class="shead"><div><span class="kick"><i class="seal">刃</i>{t["k_ars"]}</span><h2 id="h-ars">{t["h_ars"]}</h2></div><div class="seg" data-lvl-seg></div></div>
  <div class="toolbar"><div class="chips" id="f-kind"></div></div>
  <div class="toolbar"><div class="chips" id="f-type"></div></div>
  <div class="toolbar">
    <div class="grow"><label class="sr" for="q">{t["searchPh"]}</label><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="search" id="q" placeholder="{t["searchPh"]}" autocomplete="off"></div>
    <label class="trust" for="sort">{t["sort"]}</label><select id="sort">{sorts}</select>
    <div class="seg" id="f-view"><button type="button" data-view="grid">{t["grid"]}</button><button type="button" data-view="table">{t["table"]}</button></div>
    <span class="trust"><b class="num" id="count"></b> {t["shown"]}</span>
  </div>
  <div id="list"></div>
</section>

{ad(t, "infeed", "ad-infeed", "fluid")}

<section id="compare" aria-labelledby="h-cmp">
  <div class="shead"><div><span class="kick"><i class="seal">鬥</i>{t["k_cmp"]}</span><h2 id="h-cmp">{t["h_cmp"]}</h2><p class="lead">{t["lead_cmp"]}</p></div></div>
  <div class="cmp-pick"><select id="cmp-add" aria-label="{t["h_cmp"]}"></select></div>
  <div class="cmp" id="cmp"></div>
</section>

<section id="tiers" aria-labelledby="h-tier">
  <div class="shead"><div><span class="kick"><i class="seal">榜</i>{t["k_tier"]}</span><h2 id="h-tier">{t["h_tier"]}</h2><p class="lead">{t["lead_tier"]}</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><div class="seg" id="t-kind"></div><div class="seg" data-lvl-seg></div></div></div>
  <div class="tiers" id="tierlist" data-kind="blade"></div>
</section>

{ad(t, "infeed2", "ad-infeed", "fluid")}

<section aria-labelledby="h-faq">
  <span class="kick"><i class="seal">問</i>FAQ</span><h2 id="h-faq" style="margin-bottom:22px">{t["faq_h"]}</h2>
  <div class="faq">{"".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in t["faq"])}</div>
</section>
</main>{sidebar(t)}</div>
<dialog id="dlg"></dialog>
{foot(t)}{scripts("data.js", "common.js", "app.js", "ads.js")}
</body></html>'''
    write(path, h + body)

# ---------- pages d'armes ----------
def weapon(t, it):
    other = L[t["other"]]
    path, alt = f'{t["pfx"]}/w/{it["id"]}/', f'{other["pfx"]}/w/{it["id"]}/'
    sc = score(it); tr = tier_of(it)
    p = pool(it["kind"]); ranked = sorted([i for i in p if score(i) is not None], key=lambda i: -(i["stats"]["max"]["damage"] or 0))
    v = it["stats"]["max"]
    kl, tl, rl = t["kinds"][it["kind"]], t["types"][it["type"]], t["rarity"][it["rarity"]]
    fmtd = dict(name=it["name"], type=tl, kind=kl, rarity=rl, dmg=fmt(v["damage"], t), tier=tr or t["unranked"],
                kind_l=kl.lower(), type_l=tl.lower(), rarity_l=rl.lower(), kindsPl_l=t["kindsPl"][it["kind"]].lower(), score=sc,
                rank=(ranked.index(it) + 1 if it in ranked else "?"), n=len(p), gb=fmt(v["guardBreak"], t), st=fmt(v["status"], t))
    title = t["w_title"].format(**fmtd)
    desc = t["w_desc"].format(**fmtd) if v["damage"] is not None else f'{it["name"]} — Phantom Blade Zero: {kl}, {tl}. {t["w_nodata"]}'
    paras = [t["w_intro"].format(**fmtd)]
    if v["damage"] is not None: paras.append(t["w_rank"].format(**fmtd))
    else: paras.append(t["w_nodata"])
    if v["guardBreak"] is not None: paras.append(t["w_gb"].format(**fmtd))
    if v["status"] is not None: paras.append(t["w_st"].format(**fmtd))

    def bars(lvl):
        vv = it["stats"][lvl]; rows = []
        for s in STATS:
            if vv[s] is None: continue
            w = round(100 * vv[s] / maxof(it["kind"], s, lvl))
            rows.append(f'<div class="bar c-{s}"><span>{t["stats"][s]}</span><i><b style="width:{w}%"></b></i><span class="num">{fmt(vv[s], t)}</span></div>')
        for k, arr in (it["extra"] or {}).items():
            rows.append(f'<div class="bar c-extra"><span>{t["stats"].get(k, k)}</span><i><b style="width:100%"></b></i><span class="num">{fmt(arr[0 if lvl == "base" else 1], t)}</span></div>')
        return f'<div class="bars">{"".join(rows)}</div>' if rows else f'<span class="unk">{t["w_nodata"]}</span>'

    src = "".join(f'<li><b>{e(n)}</b> : ' + ", ".join(f'{t["stats"][s].lower()} {fmt(sv[s], t)}' for s in STATS if sv[s] is not None) + "</li>"
                  for n, sv in it["check"]["sources"].items() if any(sv[s] is not None for s in STATS))
    def link(i):
        s2 = score(i)
        return f'<a class="rar-{i["rarity"]}" href="{t["pfx"]}/w/{i["id"]}/">{glyph(i)}<span><span class="nm">{e(i["name"])}</span><br><small class="trust">{t["types"][i["type"]]}</small></span><span class="r">{f"""<span class="tbadge t-{tier_of(i)}">{tier_of(i)}</span>""" if s2 is not None else ""}</span></a>'
    same = [i for i in p if i["type"] == it["type"] and i is not it]
    # Associations : pour une lame, la meilleure lame d'un autre style + les 2 meilleures lames fantômes ; pour une lame fantôme, l'inverse
    best = lambda arr: sorted([i for i in arr if score(i) is not None], key=lambda i: -score(i))
    if it["kind"] == "blade":
        partner = next((i for i in best(pool("blade")) if i["type"] != it["type"] and (it["stats"]["max"]["guardBreak"] is not None or i["stats"]["max"]["guardBreak"] is not None)), None)
        edges = best(pool("edge"))[:2]
        pair = ([partner] if partner else []) + edges
        b = [it["id"], partner["id"] if partner else best(pool("blade"))[0]["id"], edges[0]["id"], edges[1]["id"]]
    else:
        blades = best(pool("blade")); b1 = next(i for i in blades if i["stats"]["max"]["guardBreak"] is not None); b2 = next(i for i in blades if i["type"] != b1["type"])
        other_e = next(i for i in best(pool("edge")) if i is not it and i["type"] != it["type"])
        pair = [b1, b2, other_e]; b = [b1["id"], b2["id"], it["id"], other_e["id"]]
    plan = f'{t["pfx"]}/planner/#b={",".join(b)}&l=max&c={it["id"]}'
    ld = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "PBZ Arsenal", "item": SITE + t["pfx"] + "/"},
        {"@type": "ListItem", "position": 2, "name": t["kindsPl"][it["kind"]], "item": SITE + t["pfx"] + "/#arsenal"},
        {"@type": "ListItem", "position": 3, "name": it["name"], "item": SITE + path}]}
    h = head(t, title, desc, path, alt, f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>').replace("{SEARCH}", '<span style="margin-left:auto"></span>')
    body = f'''<div class="wp-hero rar-{it["rarity"]}"><div class="bg" data-cjk="{"刃" if it["kind"] == "blade" else "影"}"></div>
<div class="in" style="grid-template-columns:1fr;gap:0;padding-bottom:0"><div class="crumbs"><a href="{t["pfx"]}/">PBZ Arsenal</a> / <a href="{t["pfx"]}/planner/#arsenal">{t["kindsPl"][it["kind"]]}</a> / {e(it["name"])}</div></div>
<div class="in">{glyph(it, "tall")}<div><div class="meta"><span>{kl}</span><span>{tl}</span><span class="rtag rar-{it["rarity"]}">{rl}</span>{f'<span>{t["score"]} {sc}/100</span>' if tr else ""}</div>
<h1 style="margin-top:12px;display:flex;align-items:center;gap:18px;flex-wrap:wrap">{e(it["name"])}{f' <span class="tbadge t-{tr}" style="width:52px;height:52px;font-size:32px">{tr}</span>' if tr else ""}</h1>
<p class="lead">{" ".join(e(x) for x in paras)}</p>
<div class="ctas" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:22px"><a class="btn lg" href="{plan}">{t["w_open"]} →</a><a class="btn ghost lg" href="{t["pfx"]}/planner/#tiers">{t["tier"]} list</a></div></div></div></div>
<div class="ad-band">{ad(t, "top", "ad-top")}</div>
<div class="wrap"><main>
<section><span class="kick"><i class="seal">數</i>{t["w_stats"]}</span>
<div class="two"><div class="panel frame"><h3>{t["w_base"]}</h3>{bars("base")}</div><div class="panel frame"><h3>{t["w_max"]}</h3>{bars("max")}</div></div>
<div class="panel frame" style="margin-top:14px"><h3>{t["w_rel"]}</h3><p class="trust {state(it)}" style="margin:0">● {t["trust"][state(it)]}{f' ({it["check"]["agreeing"]})' if state(it) == "agree" and it["check"]["agreeing"] else ""}</p>{f'<div class="src">{t["w_src"]}<ul style="margin:6px 0 0;padding-left:18px">{src}</ul></div>' if src else ""}</div>
</section>
{ad(t, "page", "ad-infeed", "fluid")}
<section><div class="two">
<div><h2 style="margin-bottom:12px">{t["w_pair"]}</h2><div class="simlist">{"".join(link(i) for i in pair)}</div></div>
<div><h2 style="margin-bottom:12px">{t["w_same"].format(**fmtd)}</h2><div class="simlist">{"".join(link(i) for i in same)}</div></div>
</div></section>
<p><a href="{t["pfx"]}/planner/">{t["back"]}</a></p>
</main>{sidebar(t)}</div>
{foot(t)}{scripts("ads.js")}
</body></html>'''
    write(path, h + body)

# ---------- site d'astuces ----------
TT = {
 "en": dict(title="Phantom Blade Zero Tips & Tricks: combat, bosses, best ending | PBZ Arsenal",
  desc="Clear Phantom Blade Zero tips: parry and dodge rules, Sha-Chi and guard break, bosses, upgrades, missable quests and the best ending. Plus a free build planner.",
  h1="Phantom Blade Zero tips, <em>straight to the point</em>.", lead="Short, checked tips to parry better, break guards, beat bosses and miss nothing. No filler, no story spoilers.",
  cta1="Start with the basics", cta2="All guides", first="Read these first", f_g="guides", f_t="tips", f_l="languages",
  k_guides="Guides", h_guides="Pick a subject", k_all="Every tip", h_all="Find a tip in seconds", search="Search a tip: parry, boss, healing…", all="All", none="No tip matches.",
  tips_n="tips", read="Read the guide", k_tool="Tool", h_tool="Build your loadout", tool_p="Compare all 52 weapons, get a build score out of 100 and an automatic tier list.", tool_cta="Open the build planner",
  unsure="Reported by other guides, not confirmed by several sources", sources="Sources checked for this guide", more="Keep reading", updated="Updated", home="Tips",
  g_title="{title} | Phantom Blade Zero tips", minutes="min read", note="", toc="In this guide"),
 "fr": dict(title="Astuces Phantom Blade Zero : combat, boss, meilleure fin | PBZ Arsenal",
  desc="Des astuces Phantom Blade Zero claires : règles de parade et d'esquive, Sha-Chi et brise-garde, boss, améliorations, quêtes manquables et meilleure fin. Avec un planificateur de build gratuit.",
  h1="Les astuces Phantom Blade Zero, <em>droit au but</em>.", lead="Des astuces courtes et vérifiées pour mieux parer, briser les gardes, battre les boss et ne rien rater. Sans blabla, sans spoiler sur l'histoire.",
  cta1="Commencer par les bases", cta2="Tous les guides", first="À lire en premier", f_g="guides", f_t="astuces", f_l="langues",
  k_guides="Guides", h_guides="Choisissez un sujet", k_all="Toutes les astuces", h_all="Trouvez une astuce en quelques secondes", search="Chercher une astuce : parade, boss, soins…", all="Toutes", none="Aucune astuce ne correspond.",
  tips_n="astuces", read="Lire le guide", k_tool="Outil", h_tool="Composez votre équipement", tool_p="Comparez les 52 armes, obtenez un score de build sur 100 et une tier list automatique.", tool_cta="Ouvrir le planificateur",
  unsure="Rapporté par d'autres guides, non confirmé par plusieurs sources", sources="Sources vérifiées pour ce guide", more="À lire ensuite", updated="Mis à jour le", home="Astuces",
  g_title="{title} | Astuces Phantom Blade Zero", minutes="min de lecture", note="Les noms d'objets et d'aptitudes sont traduits librement : ils peuvent différer légèrement de la version française du jeu.", toc="Dans ce guide"),
}
def _tip(x): return (x[0], x[1], len(x) > 2 and x[2])
N_TIPS = sum(len(g["en"]["tips"]) for g in GUIDES)
SEARCH_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>'

def gcard(t, g):
    c = g[t["code"]]; tt = TT[t["code"]]
    return (f'<a class="gcard frame" href="{t["pfx"]}/g/{g["slug"]}/"><span class="gseal">{g["seal"]}</span>'
            f'<span class="gmeta"><span>{CATS[g["cat"]][1][t["code"]]}</span><span class="lv lv{g["level"]}">{LEVELS[t["code"]][g["level"]]}</span></span>'
            f'<span class="gt">{e(c["title"])}</span><span class="gi">{e(c["intro"])}</span>'
            f'<span class="gfoot"><span><b>{len(c["tips"])}</b> {tt["tips_n"]}</span><span class="go">{tt["read"]} →</span></span></a>')

def toolband(t, art=True):
    tt = TT[t["code"]]
    arts = "".join(glyph(i, "banner") for i in sorted([x for x in pool("blade") if score(x) is not None], key=lambda x: -score(x))[:3])
    return (f'<a class="toolband frame" href="{t["pfx"]}/planner/"><span><span class="kick"><i class="seal">甲</i>{tt["k_tool"]}</span><h2>{tt["h_tool"]}</h2>'
            f'<p class="lead">{tt["tool_p"]}</p><span class="btn" style="margin-top:18px">{tt["tool_cta"]} →</span></span><span class="toolart">{arts}</span></a>')

def tips_home(t):
    other = L[t["other"]]; tt = TT[t["code"]]; lg = t["code"]
    path, alt = t["pfx"] + "/", other["pfx"] + "/"
    ld = {"@context": "https://schema.org", "@type": "ItemList", "name": tt["title"], "itemListElement": [
        {"@type": "ListItem", "position": n + 1, "name": g[lg]["title"], "url": f'{SITE}{t["pfx"]}/g/{g["slug"]}/'} for n, g in enumerate(GUIDES)]}
    h = head(t, tt["title"], tt["desc"], path, alt, f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>').replace("{SEARCH}", '<span style="margin-left:auto"></span>')
    first = "".join(f'<a href="{t["pfx"]}/g/{g["slug"]}/"><span class="gseal sm">{g["seal"]}</span><span><span class="nm">{e(g[lg]["short"])}</span><br><small>{len(g[lg]["tips"])} {tt["tips_n"]} · {LEVELS[lg][g["level"]]}</small></span><span class="go">→</span></a>' for g in GUIDES[:4])
    feed = []
    for g in GUIDES:
        for n, x in enumerate(g[lg]["tips"]):
            ti, tx, un = _tip(x)
            feed.append(f'<a class="tcard" data-cat="{g["cat"]}" href="{t["pfx"]}/g/{g["slug"]}/#t{n + 1}"><span class="tc"><span class="gseal xs">{g["seal"]}</span>{e(g[lg]["short"])}</span><span class="tt">{e(ti)}</span><span class="tx">{e(tx)}</span></a>')
    chips = f'<button type="button" class="chip" data-c="" aria-pressed="true">{tt["all"]}</button>' + "".join(f'<button type="button" class="chip" data-c="{k}" aria-pressed="false">{v[1][lg]}</button>' for k, v in CATS.items())
    body = f'''<div class="hero"><div class="scene">{SCENE}</div>
<div class="in"><div>
  <span class="kick"><i class="seal">訣</i>Phantom Blade Zero · {tt["home"]}</span>
  <h1>{tt["h1"]}</h1>
  <p class="lead">{e(tt["lead"])}</p>
  <div class="ctas"><a class="btn lg" href="{t["pfx"]}/g/{GUIDES[0]["slug"]}/">{tt["cta1"]} →</a><a class="btn ghost lg" href="#guides">{tt["cta2"]}</a></div>
  <div class="facts"><div><b>{len(GUIDES)}</b><span>{tt["f_g"]}</span></div><div><b>{N_TIPS}</b><span>{tt["f_t"]}</span></div><div><b>2</b><span>{tt["f_l"]}</span></div></div>
</div>
<div class="podium"><h3><i class="seal" style="width:24px;height:24px;font-size:16px">先</i>{tt["first"]}</h3>{first}</div>
</div></div>
<div class="ad-band">{ad(t, "top", "ad-top")}</div>
<div class="wrap"><main>
<section id="guides" aria-labelledby="h-guides">
  <div class="shead"><div><span class="kick"><i class="seal">書</i>{tt["k_guides"]}</span><h2 id="h-guides">{tt["h_guides"]}</h2></div></div>
  <div class="ggrid">{"".join(gcard(t, g) for g in GUIDES)}</div>
</section>
{ad(t, "infeed", "ad-infeed", "fluid")}
<section id="tips" aria-labelledby="h-all">
  <div class="shead"><div><span class="kick"><i class="seal">訣</i>{tt["k_all"]}</span><h2 id="h-all">{tt["h_all"]}</h2></div><span class="trust"><b class="num" id="tcount">{N_TIPS}</b> {tt["tips_n"]}</span></div>
  <div class="toolbar"><div class="grow"><label class="sr" for="tq">{tt["search"]}</label>{SEARCH_ICON}<input type="search" id="tq" placeholder="{tt["search"]}" autocomplete="off"></div></div>
  <div class="toolbar"><div class="chips" id="tcats">{chips}</div></div>
  <div class="tgrid" id="tfeed">{"".join(feed)}</div>
  <p class="trust" id="tnone" hidden>{tt["none"]}</p>
</section>
<section>{toolband(t)}</section>
{ad(t, "infeed2", "ad-infeed", "fluid")}
</main>{sidebar(t)}</div>
{foot(t)}{scripts("tips.js", "ads.js")}
</body></html>'''
    write(path, h + body)

def guide(t, g):
    other = L[t["other"]]; tt = TT[t["code"]]; lg = t["code"]; c = g[lg]
    path, alt = f'{t["pfx"]}/g/{g["slug"]}/', f'{other["pfx"]}/g/{g["slug"]}/'
    title = tt["g_title"].format(title=c["title"])
    words = sum(len((a + " " + b_).split()) for a, b_, _ in map(_tip, c["tips"]))
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "headline": c["title"], "description": c["intro"], "inLanguage": lg, "dateModified": TODAY, "datePublished": "2026-11-11", "mainEntityOfPage": SITE + path, "author": {"@type": "Organization", "name": "PBZ Arsenal"}, "publisher": {"@type": "Organization", "name": "PBZ Arsenal"}},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": tt["home"], "item": SITE + t["pfx"] + "/"}, {"@type": "ListItem", "position": 2, "name": c["title"], "item": SITE + path}]}]}
    h = head(t, title, c["intro"], path, alt, f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>').replace("{SEARCH}", '<span style="margin-left:auto"></span>')
    items = []
    for n, x in enumerate(c["tips"]):
        ti, tx, un = _tip(x)
        warn = f'<p class="unsure">◆ {tt["unsure"]}</p>' if un else ""
        items.append(f'<article class="tip frame" id="t{n + 1}"><span class="tnum">{n + 1:02d}</span><div><h2>{e(ti)}</h2><p>{e(tx)}</p>{warn}</div></article>')
        if n == 2: items.append(ad(t, "page", "ad-infeed", "fluid"))
    toc = "".join(f'<li><a href="#t{n + 1}">{e(_tip(x)[0])}</a></li>' for n, x in enumerate(c["tips"]))
    idx = GUIDES.index(g); rest = [GUIDES[(idx + k) % len(GUIDES)] for k in (1, 2, 3)]
    srcs = "".join(f'<li><a href="{TSRC[s][1]}" rel="nofollow noopener" target="_blank">{TSRC[s][0]}</a></li>' for s in g["src"])
    note = f'<p class="trust" style="margin-top:18px">{tt["note"]}</p>' if tt["note"] else ""
    body = f'''<div class="wp-hero ghero"><div class="bg" data-cjk="{g["seal"]}"></div>
<div class="in" style="grid-template-columns:1fr;gap:0;padding-bottom:0"><div class="crumbs"><a href="{t["pfx"]}/">{tt["home"]}</a> / {CATS[g["cat"]][1][lg]} / {e(c["short"])}</div></div>
<div class="in" style="grid-template-columns:1fr"><div><div class="meta"><span>{CATS[g["cat"]][1][lg]}</span><span class="lv lv{g["level"]}">{LEVELS[lg][g["level"]]}</span><span>{len(c["tips"])} {tt["tips_n"]}</span><span>{max(1, round(words / 160))} {tt["minutes"]}</span><span>{tt["updated"]} {TODAY}</span></div>
<h1 style="margin-top:14px;max-width:18ch">{e(c["title"])}</h1><p class="lead">{e(c["intro"])}</p></div></div></div>
<div class="ad-band">{ad(t, "top", "ad-top")}</div>
<div class="wrap"><main>
<nav class="toc frame" aria-label="{tt["toc"]}"><span class="kick" style="margin-bottom:8px">{tt["toc"]}</span><ol>{toc}</ol></nav>
<div class="tips">{"".join(items)}</div>
{note}
<section><span class="kick"><i class="seal">續</i>{tt["more"]}</span><div class="ggrid">{"".join(gcard(t, x) for x in rest)}</div></section>
<section>{toolband(t)}</section>
<div class="src" style="margin-bottom:30px">{tt["sources"]}<ul style="margin:6px 0 0;padding-left:18px">{srcs}</ul></div>
</main>{sidebar(t)}</div>
{foot(t)}{scripts("ads.js")}
</body></html>'''
    write(path, h + body)

# ---------- pages légales ----------
LEGAL = {
 "en": {
  "privacy": ("Privacy & cookies", [
   ("Who we are", "PBZ Arsenal is an unofficial, free fan tool for the game Phantom Blade Zero."),
   ("What we store", "Your builds are saved only in your browser (localStorage). We have no account system and collect no personal data directly."),
   ("Advertising", "This site is funded by advertising served by Google AdSense. Google and its partners may use cookies or similar technologies to show ads based on your previous visits to this and other sites. In the EEA, the UK and Switzerland a consent banner (certified by Google) asks for your choice before any personalised ad is shown. You can change your choice at any time from that banner, and manage personalised ads at https://adssettings.google.com. More details: https://policies.google.com/technologies/ads"),
   ("Audience measurement", "We may use anonymous audience statistics (pages viewed, country, device) to improve the site."),
   ("Contact", "For any request about your data, contact the site owner at the address given in the legal notice."),
  ]),
  "legal": ("Legal notice", [
   ("Publisher", "PBZ Arsenal, a personal fan project. Contact: {contact}"),
   ("Hosting", "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA."),
   ("Intellectual property", "Phantom Blade Zero, its names and its content belong to S-GAME and their respective owners. This site is not affiliated with them. The site's code, design and icons are original works. Weapon statistics are facts gathered from public community sources."),
  ]),
 },
 "fr": {
  "privacy": ("Confidentialité et cookies", [
   ("Qui sommes-nous", "PBZ Arsenal est un outil de fan gratuit et non officiel pour le jeu Phantom Blade Zero."),
   ("Ce que nous stockons", "Vos builds sont enregistrés uniquement dans votre navigateur (localStorage). Il n'y a pas de compte et nous ne collectons directement aucune donnée personnelle."),
   ("Publicité", "Ce site est financé par la publicité diffusée par Google AdSense. Google et ses partenaires peuvent utiliser des cookies ou technologies similaires pour afficher des annonces basées sur vos visites précédentes sur ce site et d'autres. Dans l'EEE, au Royaume-Uni et en Suisse, une bannière de consentement (certifiée par Google) recueille votre choix avant toute annonce personnalisée. Vous pouvez modifier ce choix à tout moment depuis cette bannière et gérer les annonces personnalisées sur https://adssettings.google.com. Plus d'informations : https://policies.google.com/technologies/ads"),
   ("Mesure d'audience", "Nous pouvons utiliser des statistiques d'audience anonymes (pages vues, pays, appareil) pour améliorer le site."),
   ("Contact", "Pour toute demande concernant vos données, contactez l'éditeur à l'adresse indiquée dans les mentions légales."),
  ]),
  "legal": ("Mentions légales", [
   ("Éditeur", "PBZ Arsenal, projet personnel de fan. Contact : {contact}"),
   ("Hébergement", "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis."),
   ("Propriété intellectuelle", "Phantom Blade Zero, ses noms et son contenu appartiennent à S-GAME et à leurs propriétaires respectifs. Ce site n'y est pas affilié. Le code, le design et les icônes du site sont des créations originales. Les statistiques des armes sont des faits recueillis dans des sources communautaires publiques."),
  ]),
 },
}
def legal(t, key):
    other = L[t["other"]]
    title, secs = LEGAL[t["code"]][key]
    path, alt = f'{t["pfx"]}/{key}/', f'{other["pfx"]}/{key}/'
    h = head(t, f"{title} | PBZ Arsenal", title, path, alt).replace("{SEARCH}", '<span style="margin-left:auto"></span>')
    body = f'''<div class="wrap single"><main class="prose" style="padding:30px 0">
<h1>{title}</h1>{"".join(f"<h2>{e(a)}</h2><p>{e(b.format(contact=C.get('contact', '—')))}</p>" for a, b in secs)}
<p><a href="{t["pfx"]}/">{t["back"]}</a></p></main></div>{foot(t)}{scripts("ads.js")}</body></html>'''
    write(path, h + body)

def main():
    if OUT.exists(): shutil.rmtree(OUT)
    OUT.mkdir()
    for f in ("style.css", "common.js", "app.js", "ads.js", "tips.js"): shutil.copy(SRC / f, OUT / f)
    (OUT / "data.js").write_text("window.PBZ=" + json.dumps(D, ensure_ascii=False, separators=(",", ":")) + ";")
    (OUT / "favicon.svg").write_text(FAVICON)
    if C.get("renders"):
        for d in ("weapons", "m"): shutil.copytree(SRC / "assets" / d, OUT / "img" / d)
    if (SRC / "og.png").exists(): shutil.copy(SRC / "og.png", OUT / "og.png")
    urls = []
    for t in L.values():
        home(t); urls.append(t["pfx"] + "/planner/")
        tips_home(t); urls.append(t["pfx"] + "/")
        for g in GUIDES: guide(t, g); urls.append(f'{t["pfx"]}/g/{g["slug"]}/')
        for it in ITEMS: weapon(t, it); urls.append(f'{t["pfx"]}/w/{it["id"]}/')
        for k in ("privacy", "legal"): legal(t, k); urls.append(f'{t["pfx"]}/{k}/')
    (OUT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        "".join(f"<url><loc>{SITE}{u}</loc><lastmod>{TODAY}</lastmod></url>\n" for u in urls) + "</urlset>\n")
    (OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n")
    pub = C.get("adsense_client", "").replace("ca-pub-", "pub-")
    if pub: (OUT / "ads.txt").write_text(f"google.com, {pub}, DIRECT, f08c47fec0942fa0\n")
    (OUT / "vercel.json").write_text(json.dumps({"trailingSlash": True, "headers": [{"source": "/(.*)\\.(js|css|svg|png|webp)", "headers": [{"key": "Cache-Control", "value": "public, max-age=86400"}]}]}, indent=1))
    (OUT / "404.html").write_text(head(L["en"], "Not found | PBZ Arsenal", "Page not found", "/404.html", "/fr/").replace("{SEARCH}", "") +
        '<div class="wrap single"><main style="padding:60px 0"><h1>404</h1><p class="lead">Page not found · Page introuvable</p><p><a class="btn" href="/">PBZ Arsenal →</a></p></main></div></body></html>')
    print(f"{len(urls)} pages -> {OUT}")

main()
