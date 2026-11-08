"""Images de partage (Discord, Reddit, X) : 1200x630 par arme + une pour le planner.
Sortie : assets/og/<id>.jpg et assets/og/planner.jpg. Lancer après seed_from_csv.py."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

root = Path(__file__).resolve().parent.parent
F = root / "scripts" / "fonts"
G = json.loads((root / "data/games/phantom-blade-zero.json").read_text(encoding="utf-8"))
OUT = root / "assets" / "og"; OUT.mkdir(exist_ok=True)
W, H = 1200, 630
BG, CRIM, GOLD, MIST, INK = (11, 11, 13), (192, 49, 58), (201, 164, 92), (150, 150, 160), (236, 232, 224)
title = lambda s: ImageFont.truetype(str(F / "ArsenalSC-Regular.ttf"), s)
mono = lambda s, b=False: ImageFont.truetype(str(F / ("IBMPlexMono-Bold.ttf" if b else "IBMPlexMono-Regular.ttf")), s)
sans = lambda s: ImageFont.truetype(str(F / "WorkSans-Regular.ttf"), s)
LABEL = {"damage": "DAMAGE", "guardBreak": "GUARD BREAK", "status": "STATUS"}
KIND = {"blade": "Blade", "edge": "Phantom Edge"}

def canvas():
    im = Image.new("RGB", (W, H), BG)
    glow = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(glow)
    d.ellipse((620, 40, 1180, 600), fill=(60, 18, 22))
    im = Image.blend(im, glow.filter(ImageFilter.GaussianBlur(120)), 1.0)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 8, H), fill=CRIM)
    d.text((64, 560), "PHANTOM BLADE ZERO · BUILD PLANNER", font=mono(20), fill=MIST)
    return im, d

def fit(d, text, maxw, size):
    while size > 30 and d.textlength(text, font=title(size)) > maxw: size -= 4
    return title(size)

def weapon(it):
    im, d = canvas()
    if it.get("image"):
        w = Image.open(root / "assets/weapons" / it["image"]).convert("RGBA")
        w.thumbnail((520, 520))
        im.paste(w, (900 - w.width // 2, 315 - w.height // 2), w)
    d.text((64, 70), f"{KIND[it['kind']].upper()} · {it['type'].upper()}" + (f" · {it['rarity'].upper()}" if it.get("rarity") else ""), font=mono(22), fill=GOLD)
    words, lines, cur = it["name"].split(), [], ""
    f = title(76)
    for wd in words:
        t = (cur + " " + wd).strip()
        if d.textlength(t, font=f) > 600 and cur: lines.append(cur); cur = wd
        else: cur = t
    lines.append(cur)
    if len(lines) > 2: f = title(56); lines = [" ".join(words[:len(words)//2]), " ".join(words[len(words)//2:])]
    y = 110
    for ln in lines: d.text((64, y), ln, font=f, fill=INK); y += f.size + 6
    y += 30
    b, m = it["stats"]["base"], it["stats"]["max"]
    ex = it.get("extra") or {}
    XL = {"summonHealth": "SUMMON HP", "summonDamage": "SUMMON DMG", "hpRecovery": "HEALING", "shaChiRecovery": "SHA-CHI"}
    if all(v is None for v in b.values()) and ex:
        d.text((300, y), "LV 1", font=mono(18), fill=MIST); d.text((440, y), "LV MAX", font=mono(18), fill=MIST); y += 34
        for k, (lo, hi) in ex.items():
            d.text((64, y + 6), XL.get(k, k), font=mono(20), fill=MIST)
            d.text((300, y), f"{lo:,}".replace(",", " "), font=mono(36, True), fill=INK)
            d.text((440, y), f"{hi:,}".replace(",", " "), font=mono(36, True), fill=GOLD); y += 56
    elif all(v is None for v in b.values()):
        d.text((64, y), "Stats not documented yet", font=sans(30), fill=MIST)
    else:
        d.text((300, y), "LV 1", font=mono(18), fill=MIST); d.text((440, y), "LV MAX", font=mono(18), fill=MIST); y += 34
        for k in ["damage", "guardBreak", "status"]:
            if b.get(k) is None: continue
            d.text((64, y + 6), LABEL[k], font=mono(20), fill=MIST)
            d.text((300, y), f"{b[k]:,}".replace(",", " "), font=mono(36, True), fill=INK)
            d.text((440, y), f"{m[k]:,}".replace(",", " ") if m.get(k) is not None else "–", font=mono(36, True), fill=GOLD)
            y += 56
    im.save(OUT / f"{it['id']}.jpg", quality=84, optimize=True)

def planner():
    im, d = canvas()
    best = sorted([i for i in G["items"] if i.get("image") and i["stats"]["base"]["damage"]], key=lambda i: -i["stats"]["base"]["damage"])[:3]
    for n, it in enumerate(best):
        w = Image.open(root / "assets/weapons" / it["image"]).convert("RGBA"); w.thumbnail((360, 360))
        im.paste(w, (720 + n * 150 - w.width // 2, 330 - w.height // 2 + (n - 1) * 30), w)
    d.text((64, 90), "BUILD PLANNER", font=mono(24), fill=GOLD)
    d.text((64, 130), "Phantom Blade", font=title(92), fill=INK)
    d.text((64, 230), "Zero", font=title(92), fill=CRIM)
    d.text((64, 360), f"{len(G['items'])} weapons · level 1 & max stats", font=sans(30), fill=INK)
    d.text((64, 404), "Compare, build your loadout, share it.", font=sans(30), fill=MIST)
    im.save(OUT / "planner.jpg", quality=84, optimize=True)

for it in G["items"]: weapon(it)
planner()
print(len(list(OUT.glob("*.jpg"))), "images")
