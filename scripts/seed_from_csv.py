"""Construit data/games/phantom-blade-zero.json en recoupant les sources web.

Source principale : pbz.gg (valeurs au niveau 1 et au niveau max). Les valeurs de niveau 1
sont recoupées avec ofzenandcomputing et thegameswiki. Rien n'est relevé en jeu : verified = False.
"""
import csv, json, re
from pathlib import Path
from collections import Counter

root = Path(__file__).resolve().parent.parent
D = root / "data"
TYPE_FR = {"One-Handed": "Une main", "Dual-Wield": "Double", "Two-Handed": "Deux mains",
           "Artifice": "Artifice", "Destructive": "Destruction", "Martial": "Martial",
           "Ranged": "Distance", "Summoning": "Invocation"}
ALIASES = {"Illusory Pipa": "Heartrend Pipa"}  # mêmes chiffres exacts, renommée entre deux versions
EXTRA = {  # stats propres aux invocations, d'après pbz.gg (niveau 1 → max)
    "Kuye Temple Prayer Beads": {"summonHealth": [1100, 45033], "summonDamage": [20, 179]},
    "Puppeteer's Bell": {"summonHealth": [1700, 69597], "summonDamage": [20, 179]},
    "Swordsman's Summon": {"summonHealth": [1400, 57315], "summonDamage": [20, 179]},
    "Inanis' Radiant Fan": {"hpRecovery": [342, 2360], "shaChiRecovery": [207, 1428]},
}
FEXTRA_ONLY = [("blade", "The Fanatic's Drunken Sword", "One-Handed"),
               ("blade", "Tianmiao Wild Oriole Sword", "One-Handed"),
               ("blade", "Shadowless Edge", "Dual-Wield")]

n = lambda v: int(v) if v and v.strip() else None
slug = lambda s: re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
IMG = root / "assets" / "weapons"
def image(name):  # icônes officielles récupérées depuis pbz.gg (choix de Nathan, 2026-11-08)
    f = slug(name.lower().replace("&", "and").replace("'", "")) + ".webp"
    return f if (IMG / f).exists() else None

# Sources secondaires (niveau 1)
others = {}
for r in csv.DictReader((D / "sources-2026-11-08.csv").open(encoding="utf-8")):
    name = ALIASES.get(r["name"], r["name"])
    vals = {"damage": n(r["damage"]), "guardBreak": n(r["guard_break"]), "status": n(r["status_effects"])}
    if any(v is not None for v in vals.values()):
        others.setdefault(name, {})[r["source"]] = vals

items = []
for r in csv.DictReader((D / "pbz-gg-2026-11-08.csv").open(encoding="utf-8")):
    base = {"damage": n(r["dmg_base"]), "guardBreak": n(r["gb_base"]), "status": n(r["st_base"])}
    mx = {"damage": n(r["dmg_max"]), "guardBreak": n(r["gb_max"]), "status": n(r["st_max"])}
    srcs = {"pbz.gg": base, **others.get(r["name"], {})}
    has = any(v is not None for v in base.values())
    # Même jeu de chiffres = accord, même si la source range le brise-garde dans la colonne statut
    nums = lambda v: sorted(x for x in v.values() if x is not None)
    match = [s for s, v in srcs.items() if s != "pbz.gg" and nums(v) == nums(base)]
    diff = [s for s, v in srcs.items() if s != "pbz.gg" and nums(v) != nums(base)]
    if not has:
        state = "missing"
    elif match:
        state = "agree"
    elif diff:
        state = "conflict"
    else:
        state = "single"
    items.append({"id": slug(r["name"].replace("&", "and").replace("'", "")), "name": r["name"], "kind": r["kind"], "type": r["type"],
                  "rarity": r["rarity"], "extra": EXTRA.get(r["name"]), "image": image(r["name"]),
                  "stats": {"base": base, "max": mx},
                  "check": {"state": state, "verified": False, "agreeing": len(match) + 1 if has else 0,
                            "sources": srcs if has else {}}})

empty = {"damage": None, "guardBreak": None, "status": None}
for kind, name, typ in FEXTRA_ONLY:
    items.append({"id": slug(name.replace("&", "and").replace("'", "")), "name": name, "kind": kind, "type": typ, "rarity": None, "extra": None, "image": image(name),
                  "stats": {"base": dict(empty), "max": dict(empty)},
                  "check": {"state": "missing", "verified": False, "agreeing": 0, "sources": {}}})

items.sort(key=lambda x: (x["kind"], x["type"], x["name"]))
game = {
    "id": "phantom-blade-zero", "name": "Phantom Blade Zero",
    "version": "1.0", "updated": "2026-11-08",
    "kinds": ["blade", "edge"],
    "levels": ["base", "max"],
    "slots": [{"id": "b1", "kind": "blade"}, {"id": "b2", "kind": "blade"},
              {"id": "e1", "kind": "edge"}, {"id": "e2", "kind": "edge"}],
    "stats": ["damage", "guardBreak", "status"],
    "items": items,
}
(D / "games" / "phantom-blade-zero.json").write_text(json.dumps(game, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(items), "objets", Counter(i["check"]["state"] for i in items))
for i in items:
    if i["check"]["state"] == "conflict":
        print("  désaccord :", i["name"], {k: v for k, v in i["check"]["sources"].items()})
