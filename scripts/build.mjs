// Génère le site statique : planner + une page par arme, en anglais (racine) et en français (/fr/).
// Usage : node scripts/build.mjs
//   dist/<jeu>/            site complet prêt à déployer (avec sitemap.xml et robots.txt)
//   dist/preview/          même site, avec index.html en fragment pour l'aperçu Artifact
import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const CSS = read("src/style.css"), PLANNER = read("src/planner.html"), LOGIC = read("src/logic.js");
const SITE = JSON.parse(read("data/site.json"));
// Sur Vercel, l'adresse de production est fournie au build : pas besoin de la coder en dur.
if (!SITE.siteUrl && process.env.VERCEL_PROJECT_PRODUCTION_URL) SITE.siteUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
if (!SITE.siteUrl && process.env.CF_PAGES && SITE.pagesUrl) SITE.siteUrl = SITE.pagesUrl; // Cloudflare Pages : adresse de production fixe
// Mesure d'audience sans cookie selon l'hébergeur : Vercel Web Analytics, ou Cloudflare Web Analytics (jeton dans site.json).
const ANALYTICS = process.env.CF_PAGES
  ? (SITE.cfBeacon ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${SITE.cfBeacon}"}'></script>\n` : "")
  : `<script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script>\n<script defer src="/_vercel/insights/script.js"></script>\n`;
const ORDER = ["en", "fr", "zh", "ja", "ko", "de", "es", "pt", "ru"];
const LANGS = Object.fromEntries(ORDER.filter((c) => existsSync(join(root, `src/locales/${c}.json`))).map((c) => [c, JSON.parse(read(`src/locales/${c}.json`))]));
const PREFIX = Object.fromEntries(Object.keys(LANGS).map((c) => [c, c === "en" ? "" : `${c}/`]));
new Function(LOGIC)();
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? "");
const json = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
const sub0 = (g, s) => s.replaceAll("{{VERSION}}", esc(g.version)).replaceAll("{{UPDATED}}", esc(g.updated));
const depthBase = (path) => "../".repeat(path.split("/").length - 1);

function validate(g) {
  const errs = [], ids = new Set();
  for (const it of g.items) {
    if (ids.has(it.id)) errs.push(`id en double : ${it.id}`);
    ids.add(it.id);
    if (!g.kinds.includes(it.kind)) errs.push(`${it.id} : catégorie inconnue`);
    for (const l of g.levels) for (const s of g.stats) { const v = it.stats[l]?.[s]; if (v != null && !Number.isFinite(v)) errs.push(`${it.id} : ${l}.${s} invalide`); }
    for (const T of Object.values(LANGS)) if (!T.types[it.type]) errs.push(`${it.id} : type sans traduction ${it.type}`);
  }
  if (errs.length) throw new Error(errs.join("\n"));
}

const ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%230b0b0d'/%3E%3Cpath d='M32 6 L40 32 L32 58 L24 32 Z' fill='%23c0313a'/%3E%3Cpath d='M32 6 L32 58' stroke='%23c9a45c' stroke-width='2'/%3E%3C/svg%3E";
// Polices hébergées sur le site (OFL) : pas d'appel à Google Fonts.
const FONT_FACES = read("src/fonts.css");
const fontCss = (base) => `<style>\n${FONT_FACES.replaceAll("%BASE%", base)}</style>\n`;
const page = (lang, head, body) => `<!doctype html>\n<html lang="${lang}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="theme-color" content="#0b0b0d">\n<link rel="icon" href="${ICON}">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n${ANALYTICS}${head}</head>\n<body>\n${body}\n</body>\n</html>\n`;

// rel : chemin de la page sans préfixe de langue (ex. "index.html", "weapons/x/index.html")
// Balises de partage (Discord, Reddit, X). Les URL absolues exigent siteUrl.
function ogTags(title, desc, img, rel, lang) {
  if (!SITE.siteUrl) return "";
  const u = SITE.siteUrl.replace(/\/$/, "");
  return [`<meta property="og:type" content="website">`, `<meta property="og:site_name" content="Phantom Blade Zero Build Planner">`,
    `<meta property="og:title" content="${esc(title)}">`, `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${u}/${PREFIX[lang]}${rel.replace(/index\.html$/, "")}">`,
    `<meta property="og:image" content="${u}/assets/og/${img}">`, `<meta property="og:image:width" content="1200">`, `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`].join("\n");
}

// Données structurées (schema.org) : fil d'Ariane des armes et fiche de l'application.
function jsonLd(o) { return SITE.siteUrl ? `<script type="application/ld+json">${json(o)}</script>` : ""; }
const absUrl = (lang, rel) => `${(SITE.siteUrl || "").replace(/\/$/, "")}/${PREFIX[lang]}${rel.replace(/index\.html$/, "")}`;

function headTags(rel, lang) {
  if (!SITE.siteUrl) return "";
  const url = (c) => `${SITE.siteUrl.replace(/\/$/, "")}/${PREFIX[c]}${rel.replace(/index\.html$/, "")}`;
  return [`<link rel="canonical" href="${url(lang)}">`, ...Object.keys(LANGS).map((c) => `<link rel="alternate" hreflang="${LANGS[c].lang.locale}" href="${url(c)}">`),
    `<link rel="alternate" hreflang="x-default" href="${url("en")}">`].join("\n");
}

// Menu commun à toutes les pages : planner, builds par étape, tier list, emplacements, types d'armes.
function navHtml(g, T, base, rel) {
  const P = PREFIX[T.lang.code], cur = (on) => (on ? ' aria-current="page"' : "");
  const stages = [...new Set((g.presets || []).map((p) => p.stage))];
  const types = g.kinds.flatMap((k) => [...new Set(g.items.filter((i) => i.kind === k).map((i) => i.type))].map((t) => [k, t]));
  const drop = (label, on, items) => `<details class="nav-drop"><summary${cur(on)}>${esc(label)}</summary><div class="langs-menu">${items.map(([href, text, here]) => `<a href="${base}${P}${href}"${cur(here)}>${esc(text)}</a>`).join("")}</div></details>`;
  return `<nav class="main-nav" aria-label="${esc(T.nav.label)}"><a href="${base}${P}index.html"${cur(rel === "index.html")}>${esc(T.ui.home)}</a>` +
    drop(T.nav.builds, rel.startsWith("builds/"), stages.map((st) => [`builds/${st}/index.html`, fill(T.pg.buildH1, { stage: T.pg.lower === "1" ? T.stages[st].toLowerCase() : T.stages[st] }), rel === `builds/${st}/index.html`])) +
    `<a href="${base}${P}tier-list/index.html"${cur(rel.startsWith("tier-list/"))}>${esc(T.nav.tier)}</a><a href="${base}${P}locations/index.html"${cur(rel.startsWith("locations/"))}>${esc(T.nav.locations)}</a>` +
    drop(T.nav.types, rel.startsWith("types/"), types.map(([k, t]) => [`types/${t.toLowerCase()}/index.html`, fill(T.pg.typeName, { type: T.types[t], kinds: T.kindsPlural[k] }), rel === `types/${t.toLowerCase()}/index.html`])) + `</nav>\n  <script>document.addEventListener("click",function(e){document.querySelectorAll(".top details[open]").forEach(function(d){if(!d.contains(e.target))d.open=false})})</script>`;
}
function header(T, base, rel, plannerHref, g, navRel = rel) {
  const links = Object.values(LANGS).map((L) => `<a href="${base}${PREFIX[L.lang.code]}${rel}" hreflang="${L.lang.code}"${L.lang.code === T.lang.code ? ' aria-current="true"' : ""}>${L.lang.name}</a>`).join("");
  return `<header class="top band"><div class="inner">
  <span class="brand"><a href="${plannerHref}">Phantom Blade Zero <b>·</b> ${T.site.brand}</a></span>
  <details class="langs"><summary>${T.lang.code.toUpperCase()}</summary><div class="langs-menu">${links}</div></details>
  <small class="meta-line">${T.site.gameVersion} {{VERSION}} · ${T.site.dataFrom} {{UPDATED}} · ${T.site.fan}</small>
  ${g ? navHtml(g, T, base, navRel) : ""}
</div></header>`;
}
const reportHref = (name) => !SITE.reportUrl ? "" : SITE.reportHandle ? `${SITE.reportUrl}?${new URLSearchParams({ text: `${SITE.reportHandle} Wrong stats${name ? `: ${name}` : ""} - ` })}` : SITE.reportUrl; // sans reportHandle : simple lien (post Reddit)
const LEGAL = { en: read("src/legal/en.html"), fr: read("src/legal/fr.html") };
const legalPath = (lang) => (LEGAL[lang] ? PREFIX[lang] : "") + "legal/index.html";
// Bandeau affilié : jeux du même genre, liens de recherche Instant Gaming avec le code d'affiliation.
const promoBlock = (T) => {
  if (!SITE.affiliate || !SITE.affiliateGames?.length) return "";
  const u = new URL(SITE.affiliate), link = (q) => { u.searchParams.set("q", q); return u.toString(); };
  return `<div class="promo-block">${igBanner(T)}<div class="promo-head"><span class="kicker">${esc(T.ui.similarTitle)}</span>${SITE.igBanner ? "" : `<small>${esc(T.ui.affiliate)}</small>`}</div><div class="promo-row">${SITE.affiliateGames.map((n) => `<a class="promo-card" href="${esc(link(n))}" rel="sponsored noopener" target="_blank"><b>${esc(n)}</b><span>${esc(T.ui.seePrice)} →</span></a>`).join("")}</div></div>`;
};
const promo = (T) => { const b = promoBlock(T); return b ? `<aside class="promo band" aria-label="${esc(T.ui.similarTitle)}"><div class="inner">${b}</div></aside>` : ""; };
// Bannière dynamique officielle Instant Gaming (prix mis à jour par eux). Langues gérées : fr en de es pt, sinon en.
const IG_LANGS = ["fr", "en", "de", "es", "pt"];
const igBanner = (T) => {
  const igr = SITE.affiliate && new URL(SITE.affiliate).searchParams.get("igr");
  if (!igr || !SITE.igBanner) return "";
  const lang = IG_LANGS.includes(T.lang.code) ? T.lang.code : "en";
  return `<div class="ig-wrap"><small class="aff">${esc(T.ui.affiliate)}</small><div class="ig-banner"></div></div><script>window.igBannerConfig = { lang: ${JSON.stringify(lang)}, igr: ${JSON.stringify(igr)}, banners: ["ig-banner"] };</script><script src="https://www.instant-gaming.com/api/banner/partner/loader.js" defer></script>`;
};
const footer = (T, base = "") => `<footer class="band"><div class="inner"><p>${esc(T.footer.sources)}</p><p>${esc(T.footer.disclaimer)}</p><p><a href="${base}${legalPath(T.lang.code)}">${esc(T.footer.legal)}</a>${SITE.reportUrl ? ` · <a href="${esc(reportHref("", T.lang.code))}" rel="noopener" target="_blank">${esc(T.ui.report)}</a>` : ""}${SITE.support ? ` · <a href="${esc(SITE.support)}" rel="noopener" target="_blank">${esc(T.ui.support)}</a>` : ""}${SITE.affiliate ? ` · <a href="${esc(SITE.affiliate)}" rel="sponsored noopener" target="_blank">${esc(T.ui.buyGame)}</a> <small>(${esc(T.ui.affiliate)})</small>` : ""}</p></div></footer>`;
const legalBody = (lang, updated) => LEGAL[lang]
  .replaceAll("{{UPDATED}}", esc(updated)).replaceAll("{{HOST_NAME}}", esc(SITE.host.name))
  .replaceAll("{{HOST_ADDRESS}}", esc(SITE.host.address)).replaceAll("{{HOST_URL}}", esc(SITE.host.url))
  .replaceAll("{{CONTACT}}", SITE.contact ? `<p>Contact : <a href="${SITE.contact.includes("@") && !SITE.contact.startsWith("http") ? "mailto:" : ""}${esc(SITE.contact)}">${esc(SITE.contact.replace(/^mailto:/, ""))}</a></p>` : "");

// Rang S à C par famille, d'après les dégâts au niveau max (les égalités partagent le rang). Sans dégâts : pas de rang.
const TIER_CUTS = [["S", .15], ["A", .4], ["B", .75], ["C", 1]];
function tierMap(g) {
  const top = g.levels[g.levels.length - 1], dmg = (i) => (i.stats[top] || {}).damage, out = {};
  for (const kind of g.kinds) {
    const xs = g.items.filter((i) => i.kind === kind && dmg(i) != null).sort((a, b) => dmg(b) - dmg(a));
    for (const i of xs) { const r = xs.findIndex((x) => dmg(x) === dmg(i)) + 1; out[i.id] = TIER_CUTS.find(([, c]) => r <= Math.ceil(c * xs.length))[0]; }
  }
  return out;
}
// FAQ du planner : réponses calculées depuis les données, avec le balisage FAQPage pour Google.
function faqOf(g, T, P) {
  const top = g.levels[g.levels.length - 1], best = (k) => g.items.filter((i) => i.kind === k && i.stats[top].damage != null).sort((a, b) => b.stats[top].damage - a.stats[top].damage)[0].name;
  const byId = Object.fromEntries(g.items.map((i) => [i.id, i])), early = (g.presets.find((p) => p.stage === "early" && p.focus === "power") || g.presets[0]).ids.map((id) => byId[id].name);
  const nb = g.items.filter((i) => i.kind === "blade").length, ne = g.items.length - nb;
  const vars = { game: g.name, blade: best("blade"), edge: best("edge"), w1: early[0], w2: early[1], w3: early[2], w4: early[3], nb, ne, n: g.items.length, ok: g.items.filter((i) => ["agree", "verified"].includes(i.check.state)).length };
  const links = [[`${P}tier-list/index.html`, T.pg.tierH1], [`${P}builds/early/index.html`, fill(T.pg.buildH1, { stage: T.pg.lower === "1" ? T.stages.early.toLowerCase() : T.stages.early })], [`${P}locations/index.html`, T.pg.locH1], null];
  const qa = T.faq.items.map(([q, a], i) => ({ q: fill(q, vars), a: fill(a, vars), link: links[i] }));
  return {
    html: `<div class="faq">${qa.map((x) => `<details><summary>${esc(x.q)}</summary><p>${esc(x.a)}${x.link ? ` <a href="${x.link[0]}">${esc(x.link[1])} →</a>` : ""}</p></details>`).join("")}</div>`,
    ld: jsonLd({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: qa.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) }),
  };
}
function indexHtml(g, T, weaponHref) {
  const tiers = tierMap(g);
  const cols = [];
  for (const kind of g.kinds) for (const type of [...new Set(g.items.filter((i) => i.kind === kind).map((i) => i.type))]) {
    const items = g.items.filter((i) => i.kind === kind && i.type === type).sort((a, b) => a.name.localeCompare(b.name));
    cols.push(`<div><h3>${esc(T.kindsPlural[kind])} · ${esc(T.types[type])}</h3><ul>${items.map((i) => `<li><a href="${weaponHref(i)}"><b class="tg tg-${(tiers[i.id] || "n").toLowerCase()}">${tiers[i.id] || "–"}</b>${esc(i.name)}</a></li>`).join("")}</ul></div>`);
  }
  return `<div class="index-cols">${cols.join("")}</div>`;
}

function weaponPage(g, T, L, it, base) {
  const fmt = L.fmt, P = PREFIX[T.lang.code];
  const planner = `${base}${P}index.html`;
  const wHref = (o) => `${base}${P}weapons/${o.id}/index.html`;
  const img = (o, kind = "weapons") => o.image ? `<img src="${base}assets/${kind}/${o.image}" alt="${esc(o.name)}"${kind === "thumbs" ? ' loading="lazy"' : ""}>` : "";
  const STAT_ICON = { damage: "stat-damage", guardBreak: "stat-guard-break", status: "stat-status-effects" };
  const rows = g.stats.filter((s) => it.stats.base[s] != null).map((s) =>
    `<tr><td><img src="${base}assets/ui/${STAT_ICON[s]}.webp" alt="">${esc(T.stats[s])}</td><td class="num">${fmt(it.stats.base[s])}</td><td class="num">${fmt(it.stats.max[s])}</td></tr>`).join("")
    || (it.extra ? Object.entries(it.extra).map(([k, v]) => `<tr><td>${esc(T.extra[k])}</td><td class="num">${fmt(v[0])}</td><td class="num">${fmt(v[1])}</td></tr>`).join("") : "");
  const pool = L.pool(it.kind);
  const ranks = g.stats.filter((s) => it.stats.max[s] != null).map((s) => {
    const xs = pool.filter((o) => o.stats.max[s] != null).sort((a, b) => b.stats.max[s] - a.stats.max[s]);
    return `<li>${esc(fill(T.ui.rankLine, { stat: T.stats[s], k: xs.findIndex((o) => o.id === it.id) + 1, n: xs.length, kinds: T.kindsPlural[it.kind].toLowerCase() }))}</li>`;
  }).join("");
  const card = (o) => `<a class="mini" href="${wHref(o)}">${img(o, "thumbs")}<span>${esc(o.name)}</span><small>${esc(T.types[o.type])}</small></a>`;
  const tier = tierMap(g)[it.id];
  const dcard = (o) => `<a class="mini" href="${wHref(o)}">${img(o, "thumbs")}<span>${esc(o.name)}</span><small>${o.stats.max.damage != null ? `${esc(T.stats.damage)} ${fmt(o.stats.max.damage)}` : esc(T.types[o.type])}</small></a>`;
  const same = pool.filter((o) => o.type === it.type && o.id !== it.id).sort((a, b) => (b.stats.max.damage ?? -1) - (a.stats.max.damage ?? -1));
  const at = pool.indexOf(it), prev = pool[(at - 1 + pool.length) % pool.length], next = pool[(at + 1) % pool.length];
  const pairs = L.pairs(it);
  const src = Object.entries(it.check.sources).filter(([, v]) => g.stats.some((s) => v[s] != null)).map(([n, v]) => `${n} : ` + g.stats.filter((s) => v[s] != null).map((s) => `${T.stats[s].toLowerCase()} ${fmt(v[s])}`).join(", ")).join(" · ");
  const st = L.stateOf(it);
  return `<nav class="crumbs band"><div class="inner"><a href="${planner}">${esc(T.ui.home)}</a> / ${esc(T.kindsPlural[it.kind])} / <a href="${base}${P}types/${it.type.toLowerCase()}/index.html">${esc(T.types[it.type])}</a></div></nav>
<main>
<section class="band"><div class="inner wp">
  <div class="showcase">${img(it) || `<span class="noimg">${esc(T.ui.noImage)}</span>`}</div>
  <div class="sheet">
    <div class="meta"><span>${esc(T.kinds[it.kind])}</span><span>${esc(T.types[it.type])}</span>${it.rarity ? `<span class="rar-${it.rarity}">${esc(T.rarity[it.rarity])}</span>` : ""}${tier ? `<a class="tier-chip tg-${tier.toLowerCase()}" href="${base}${P}tier-list/index.html#${it.kind}">${esc(fill(T.ui.tier, { t: tier }))}</a>` : ""}</div>
    <h1 style="font-size:clamp(32px,5vw,52px)">${esc(it.name)}</h1>
    <p class="pitch">${esc(L.pitch(it, "base"))}</p>${it.zone ? `\n    <p class="where"><b>${esc(T.ui.whereToFind)} :</b> <a href="${base}${P}locations/index.html#${it.zone.toLowerCase().replace(/[^a-z0-9]+/g, "-")}">${esc(it.zone)}</a> · <a href="${base}${P}builds/${it.stage}/index.html">${esc(T.stages[it.stage])}</a></p>` : ""}${it.temperOf ? `\n    <p class="where"><b>${esc(T.ui.whereToFind)} :</b> <a href="${base}${P}weapons/${it.temperOf}/index.html">${esc(fill(T.pg.temperOf, { name: g.items.find((x) => x.id === it.temperOf).name }))}</a></p>` : ""}
    ${rows ? `<table class="stat-table"><thead><tr><th>${esc(T.ui.statsTitle)}</th><th class="r">${esc(T.levels.base)}</th><th class="r">${esc(T.levels.max)}</th></tr></thead><tbody>${rows}</tbody></table>` : `<p class="trust">${esc(T.ui.noStats)}</p>`}
    <p class="trust ${st}"><b>${esc(L.trust(it))}</b>${src ? ` · ${esc(T.ui.sourcesAt1)}${esc(src)}` : ""}</p>
    <div class="equip"><a class="btn" href="${planner}#W-${it.id}">${esc(T.ui.openInPlanner)}</a>${SITE.reportUrl ? `<a class="btn ghost" href="${esc(reportHref(it.name, T.lang.code))}" rel="noopener" target="_blank">${esc(T.ui.report)}</a>` : ""}</div>
  </div>
</div></section>
${ranks ? `<section class="wsec band"><div class="inner"><h2>${esc(T.ui.ranksTitle)}</h2><ul class="advice">${ranks}</ul></div></section>` : ""}
${pairs.length ? `<section class="wsec band"><div class="inner"><h2>${esc(T.ui.pairs)}</h2><div class="cards">${pairs.map(card).join("")}</div></div></section>` : ""}
${same.length ? `<section class="wsec band"><div class="inner"><h2>${esc(fill(T.ui.sameType, { type: T.types[it.type].toLowerCase() }))}</h2><div class="cards">${same.map(dcard).join("")}</div></div></section>` : ""}
<nav class="pn band" aria-label="${esc(T.kindsPlural[it.kind])}"><div class="inner"><a href="${wHref(prev)}" rel="prev"><small>← ${esc(T.ui.prev)}</small>${esc(prev.name)}</a><a href="${wHref(next)}" rel="next"><small>${esc(T.ui.next)} →</small>${esc(next.name)}</a></div></nav>
</main>`;
}

const games = readdirSync(join(root, "data/games")).filter((f) => f.endsWith(".json"));
for (const f of games) {
  const g = JSON.parse(read(`data/games/${f}`));
  validate(g);
  const out = join(root, "dist", g.id);
  rmSync(out, { recursive: true, force: true });
  const files = {};
  for (const [lang, T] of Object.entries(LANGS)) {
    const L = globalThis.Logic(g, T);
    const P = PREFIX[lang];
    const meta = (s) => fill(s, { game: g.name });
    const put = (path, html) => { files[path] = html; };
    const sub = (s) => s.replaceAll("{{VERSION}}", esc(g.version)).replaceAll("{{UPDATED}}", esc(g.updated));

    // Planner
    const pPath = `${P}index.html`, pBase = depthBase(pPath);
    const faq = faqOf(g, T, "");
    const head = (title, desc, path, alt) => `<title>${esc(title)}</title>\n<meta name="description" content="${esc(desc)}">\n${headTags(g, path, alt, lang)}\n`;
    const plannerBody = PLANNER
      .replace(/\{\{t\.(\w+)\.(\w+)\}\}/g, (_, a, b) => esc(T[a][b]))
      .replace("{{TITLE}}", esc(meta(T.meta.plannerTitle))).replace("{{DESCRIPTION}}", esc(meta(T.meta.plannerDesc))).replace("{{LEDE}}", esc(meta(T.meta.plannerDesc)))
      .replace("{{HEAD}}", () => headTags("index.html", lang) + "\n" + faq.ld + "\n" + jsonLd({ "@context": "https://schema.org", "@type": "WebApplication", name: "Phantom Blade Zero Build Planner", url: absUrl(lang, "index.html"), applicationCategory: "GameApplication", operatingSystem: "Any", inLanguage: T.lang.locale, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, description: meta(T.meta.plannerDesc) }) + "\n" + ogTags(meta(T.meta.plannerTitle), meta(T.meta.plannerDesc), "planner.jpg", "index.html", lang))
      .replace("{{CSS}}", () => CSS)
      .replace("{{FONTS}}", () => fontCss(pBase))
      .replace("{{HEADER}}", () => sub(header(T, pBase, "index.html", `${pBase}${P}index.html`, g)))
      .replace("{{INDEX}}", () => indexHtml(g, T, (i) => `weapons/${i.id}/index.html`))
      .replace("{{FAQ}}", () => faq.html).replace("{{FOOTER}}", () => footer(T, pBase))
      .replace("{{PROMO}}", () => promoBlock(T))
      .replace("{{SUPPORT}}", () => (SITE.support ? `<a class="btn ghost" href="${esc(SITE.support)}" rel="noopener" target="_blank">${esc(T.ui.support)}</a>` : "") + "")
      .replace("{{DATA}}", () => json(g)).replace("{{T}}", () => json(T)).replace("{{LOGIC}}", () => LOGIC)
      .replaceAll("{{BASE}}", pBase);
    const cut = plannerBody.indexOf("<header");
    put(pPath, page(T.lang.locale, plannerBody.slice(0, cut), plannerBody.slice(cut)));
    if (lang === "en") files.__fragment = plannerBody;

    // Pages d'armes
    for (const it of g.items) {
      const path = `${P}weapons/${it.id}/index.html`, base = depthBase(path);
      const s = it.stats.base;
      const title = fill(T.meta.weaponTitle, { name: it.name, game: g.name, kind: T.kinds[it.kind].toLowerCase() });
      const desc = fill(T.meta.weaponDesc, { name: it.name, game: g.name, kind: T.kinds[it.kind].toLowerCase(), type: T.types[it.type].toLowerCase(), damage: s.damage != null ? `${L.fmt(s.damage)} → ${L.fmt(it.stats.max.damage)}` : "?" });
      const hd = `<title>${esc(title)}</title>\n<meta name="description" content="${esc(desc)}">\n${headTags(`weapons/${it.id}/index.html`, lang)}\n` +
        ogTags(title, desc, `${it.id}.jpg`, `weapons/${it.id}/index.html`, lang) + "\n" +
        jsonLd({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [[T.ui.home, absUrl(lang, "index.html")], [it.name, absUrl(lang, `weapons/${it.id}/index.html`)]].map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })) }) + "\n" +
        `${fontCss(base)}<style>\n${CSS}</style>\n`;
      put(path, page(T.lang.locale, hd, sub(header(T, base, `weapons/${it.id}/index.html`, `${base}${P}index.html`, g)) + weaponPage(g, T, L, it, base) + promo(T) + footer(T, base)));
    }

    // Guides : une page par étape du jeu (loadouts conseillés) et une page « où trouver chaque arme ».
    const STAGES = [...new Set((g.presets || []).map((p) => p.stage))];
    const FONT_CSS = (base) => `${fontCss(base)}<style>\n${CSS}</style>\n`;
    const stageName = (s) => (T.pg.lower === "1" ? T.stages[s].toLowerCase() : T.stages[s]);
    const buildH1 = (s) => fill(T.pg.buildH1, { stage: stageName(s) });
    const byId = Object.fromEntries(g.items.map((i) => [i.id, i]));
    const guide = (rel, title, desc, crumb, body) => {
      const path = `${P}${rel}`, base = depthBase(path);
      const hd = `<title>${esc(title)}</title>\n<meta name="description" content="${esc(desc)}">\n${headTags(rel, lang)}\n` + ogTags(title, desc, "planner.jpg", rel, lang) + "\n" +
        jsonLd({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [[T.ui.home, absUrl(lang, "index.html")], [crumb, absUrl(lang, rel)]].map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })) }) + "\n" + FONT_CSS(base);
      put(path, page(T.lang.locale, hd, sub(header(T, base, rel, `${base}${P}index.html`, g)) +
        `<nav class="crumbs band"><div class="inner"><a href="${base}${P}index.html">${esc(T.ui.home)}</a> / ${esc(T.pg.guides)} / ${esc(crumb)}</div></nav>\n<main>${body(base)}</main>` + promo(T) + footer(T, base)));
    };
    const cardOf = (base) => (o) => `<a class="mini" href="${base}${P}weapons/${o.id}/index.html">${o.image ? `<img src="${base}assets/thumbs/${o.image}" alt="${esc(o.name)}" loading="lazy">` : ""}<span>${esc(o.name)}</span><small>${esc(T.types[o.type])}${o.zone ? ` · ${esc(o.zone)}` : ""}</small></a>`;
    const guideLinks = (base, skip) => `<p class="guide-links">${STAGES.filter((s) => s !== skip).map((s) => `<a href="${base}${P}builds/${s}/index.html">${esc(buildH1(s))}</a>`).join(" · ")}${skip === "loc" ? "" : ` · <a href="${base}${P}locations/index.html">${esc(T.pg.locH1)}</a>`}${skip === "tier" ? "" : ` · <a href="${base}${P}tier-list/index.html">${esc(T.pg.tierH1)}</a>`}</p>`;
    const TYPES = g.kinds.flatMap((k) => [...new Set(g.items.filter((i) => i.kind === k).map((i) => i.type))].map((t) => [k, t]));
    const typeName = (kind, type) => fill(T.pg.typeName, { type: T.types[type], kinds: T.kindsPlural[kind] });
    const typeLinks = (base, skip) => `<p class="guide-links">${TYPES.filter(([, t]) => t !== skip).map(([k, t]) => `<a href="${base}${P}types/${t.toLowerCase()}/index.html">${esc(typeName(k, t))}</a>`).join(" · ")}</p>`;
    for (const s of STAGES) {
      const h1 = buildH1(s), zones = g.zoneOrder.filter((z) => g.items.some((i) => i.zone === z && i.stage === s));
      const upTo = STAGES.slice(0, STAGES.indexOf(s) + 1);
      guide(`builds/${s}/index.html`, fill(T.pg.buildTitle, { h1, stage: stageName(s), game: g.name }), fill(T.pg.buildDesc, { h1, stage: stageName(s), game: g.name }), h1, (base) => {
        const card = cardOf(base);
        const sum = (ids, k) => ids.reduce((a, id) => a + (byId[id].stats.base[k] || 0), 0);
        const sets = g.presets.filter((p) => p.stage === s).map((p) => `<section class="wsec band"><div class="inner"><h2>${esc(T.stages[s])} · ${esc(T.focus[p.focus])}</h2>
<div class="cards">${p.ids.map((id) => card(byId[id])).join("")}</div>
<p class="trust">${esc(T.stats.damage)} ${L.fmt(sum(p.ids, "damage"))} · ${esc(T.stats.guardBreak)} ${L.fmt(sum(p.ids, "guardBreak"))} · ${esc(T.stats.status)} ${L.fmt(sum(p.ids, "status"))} <small>(${esc(T.levels.base)})</small></p>
<div class="equip"><a class="btn" href="${base}${P}index.html${L.hashOf(p.ids, g.levels[0])}">${esc(T.ui.openInPlanner)}</a></div></div></section>`).join("\n");
        const avail = g.items.filter((i) => i.stage === s);
        return `<section class="band ghead"><div class="inner"><span class="kicker">${esc(T.pg.guides)}</span><h1>${esc(h1)}</h1><p>${esc(fill(T.pg.buildIntro, { zones: zones.join(", ") }))}</p></div></section>
${sets}
<section class="wsec band"><div class="inner"><h2>${esc(T.pg.available)}</h2><div class="cards">${avail.map(card).join("")}</div></div></section>
<section class="wsec band"><div class="inner"><h2>${esc(T.pg.otherStages)}</h2>${guideLinks(base, s)}</div></section>`;
      });
    }
    if (g.zoneOrder) guide("locations/index.html", fill(T.pg.locTitle, { game: g.name }), fill(T.pg.locDesc, { game: g.name }), T.pg.locH1, (base) => {
      const card = cardOf(base), sec = (id, title, sub, items) => items.length ? `<section class="wsec band" id="${id}"><div class="inner"><h2>${esc(title)}${sub ? ` <small class="zstage">${esc(sub)}</small>` : ""}</h2><div class="cards">${items.map(card).join("")}</div></div></section>` : "";
      const slugOf = (z) => z.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const unknown = g.items.filter((i) => !i.stage && !i.temperOf), tempered = g.items.filter((i) => i.temperOf);
      return `<section class="band ghead"><div class="inner"><span class="kicker">${esc(T.pg.guides)}</span><h1>${esc(T.pg.locH1)}</h1><p>${esc(fill(T.pg.locIntro, { n: unknown.length }))}</p></div></section>
${sec("start", T.pg.start, T.stages.early, g.items.filter((i) => i.stage && !i.zone))}
${g.zoneOrder.map((z) => { const xs = g.items.filter((i) => i.zone === z); return sec(slugOf(z), z, xs[0] ? T.stages[xs[0].stage] : "", xs); }).join("\n")}
${tempered.length ? `<section class="wsec band" id="tempered"><div class="inner"><h2>${esc(T.pg.tempered)}</h2><div class="cards">${tempered.map((o) => `<a class="mini" href="${base}${P}weapons/${o.id}/index.html">${o.image ? `<img src="${base}assets/thumbs/${o.image}" alt="${esc(o.name)}" loading="lazy">` : ""}<span>${esc(o.name)}</span><small>${esc(fill(T.pg.temperOf, { name: byId[o.temperOf].name }))}</small></a>`).join("")}</div></div></section>` : ""}
${sec("unknown", T.pg.unknown, "", unknown)}`;
    });
    // Tier list : classement par dégâts au niveau max, par famille. Les égalités partagent le même rang.
    guide("tier-list/index.html", fill(T.pg.tierTitle, { game: g.name }), fill(T.pg.tierDesc, { game: g.name }), T.pg.tierH1, (base) => {
      const top = g.levels[g.levels.length - 1], dmg = (i) => (i.stats[top] || {}).damage;
      const card = (o) => `<a class="mini" href="${base}${P}weapons/${o.id}/index.html">${o.image ? `<img src="${base}assets/thumbs/${o.image}" alt="${esc(o.name)}" loading="lazy">` : ""}<span>${esc(o.name)}</span><small>${esc(T.types[o.type])}${dmg(o) != null ? ` · ${esc(T.stats.damage)} ${L.fmt(dmg(o))}` : ""}${o.stage ? ` · ${esc(T.stages[o.stage])}` : ""}</small></a>`;
      const CUTS = TIER_CUTS, tiers = tierMap(g);
      const kindSec = (kind) => {
        const xs = g.items.filter((i) => i.kind === kind && dmg(i) != null).sort((a, b) => dmg(b) - dmg(a));
        const tierOf = (i) => tiers[i.id];
        const rest = g.items.filter((i) => i.kind === kind && dmg(i) == null);
        return `<section class="wsec band" id="${kind}"><div class="inner"><h2>${esc(T.kindsPlural[kind])}</h2>${CUTS.map(([t]) => { const ys = xs.filter((i) => tierOf(i) === t); return ys.length ? `<div class="tier tier-${t.toLowerCase()}"><b class="tier-tag">${t}</b><div class="cards">${ys.map(card).join("")}</div></div>` : ""; }).join("")}${rest.length ? `<div class="tier"><b class="tier-tag tier-none">–</b><div class="cards">${rest.map(card).join("")}</div></div><p class="tier-note">${esc(T.pg.tierUnranked)}</p>` : ""}</div></section>`;
      };
      return `<section class="band ghead"><div class="inner"><span class="kicker">${esc(T.pg.guides)}</span><h1>${esc(T.pg.tierH1)}</h1><p>${esc(T.pg.tierIntro)}</p></div></section>
${g.kinds.map(kindSec).join("\n")}
<section class="wsec band"><div class="inner"><h2>${esc(T.pg.byType)}</h2>${typeLinks(base)}</div></section>`;
    });
    // Une page par type d'arme : toutes les armes du type, triées par dégâts au niveau max.
    for (const [kind, type] of TYPES) {
      const name = typeName(kind, type), rel = `types/${type.toLowerCase()}/index.html`;
      const top = g.levels[g.levels.length - 1], dmg = (i) => (i.stats[top] || {}).damage ?? -1;
      const xs = g.items.filter((i) => i.type === type).sort((a, b) => dmg(b) - dmg(a) || a.name.localeCompare(b.name));
      guide(rel, fill(T.pg.typeTitle, { name, game: g.name }), fill(T.pg.typeDesc, { name, game: g.name, n: xs.length }), name, (base) => {
        const v = (x) => (x != null ? L.fmt(x) : "–");
        const where = (o) => o.zone ? `<a href="${base}${P}locations/index.html#${o.zone.toLowerCase().replace(/[^a-z0-9]+/g, "-")}">${esc(o.zone)}</a>` : o.temperOf ? esc(fill(T.pg.temperOf, { name: byId[o.temperOf].name })) : o.stage ? esc(T.pg.start) : "–";
        const row = (o) => `<tr><td><a href="${base}${P}weapons/${o.id}/index.html">${o.image ? `<img src="${base}assets/thumbs/${o.image}" alt="" loading="lazy">` : ""}${esc(o.name)}</a></td><td class="num">${v(o.stats.base.damage)}</td><td class="num">${v(o.stats[top].damage)}</td><td class="num">${v(o.stats[top].guardBreak)}</td><td class="num">${v(o.stats[top].status)}</td><td>${where(o)}</td></tr>`;
        return `<section class="band ghead"><div class="inner"><span class="kicker">${esc(T.kindsPlural[kind])}</span><h1>${esc(name)}</h1><p>${esc(fill(T.pg.typeIntro, { n: xs.length }))}</p></div></section>
<section class="wsec band"><div class="inner"><div class="cards">${xs.map(cardOf(base)).join("")}</div></div></section>
<section class="wsec band"><div class="inner"><h2>${esc(T.ui.statsTitle)}</h2><div class="tscroll"><table class="stat-table type-table"><thead><tr><th></th><th class="r">${esc(T.stats.damage)} · ${esc(T.levels.base)}</th><th class="r">${esc(T.stats.damage)} · ${esc(T.levels.max)}</th><th class="r">${esc(T.stats.guardBreak)}</th><th class="r">${esc(T.stats.status)}</th><th>${esc(T.ui.whereToFind)}</th></tr></thead><tbody>${xs.map(row).join("")}</tbody></table></div></div></section>
<section class="wsec band"><div class="inner"><h2>${esc(T.pg.byType)}</h2>${typeLinks(base, type)}${guideLinks(base)}</div></section>`;
      });
    }
  }
  const FONTS = (base) => `${fontCss(base)}<style>\n${CSS}</style>\n`;
  for (const lang of Object.keys(LEGAL)) {
    const T = LANGS[lang], path = legalPath(lang), base = depthBase(path);
    const hd = `<title>${esc(T.footer.legal)} · Phantom Blade Zero Build Planner</title>\n<meta name="robots" content="noindex">\n${FONTS(base)}`;
    files[path] = page(T.lang.locale, hd, sub0(g, header(T, base, "index.html", `${base}${PREFIX[lang]}index.html`, g, "legal")) + `<main class="band"><div class="inner legal">${legalBody(lang, g.updated)}</div></main>` + footer(T, base));
  }
  { const T = LANGS.en, F = LANGS.fr;
    files["404.html"] = page("en", `<title>${esc(T.notFound.title)} · Phantom Blade Zero Build Planner</title>\n<meta name="robots" content="noindex">\n${FONTS("/")}`,
      sub0(g, header(T, "/", "index.html", "/index.html", g, "404")) + `<main class="band"><div class="inner legal nf"><p class="kicker">404</p><h1>${esc(T.notFound.title)}</h1><p>${esc(T.notFound.text)}</p><p><a class="btn" href="/">${esc(T.notFound.back)}</a></p>` +
      (F ? `<p lang="fr" class="trust">${esc(F.notFound.text)} <a href="/fr/">${esc(F.notFound.back)}</a></p>` : "") + `</div></main>` + footer(T, "/")); }
  const frag = files.__fragment; delete files.__fragment;
  // En ligne, Cloudflare redirige /x/index.html vers /x/ : les liens internes pointent donc directement vers le dossier
  // (sinon Google signale des « pages avec redirection »). En local (file://), on garde index.html.
  const clean = process.env.CF_PAGES && !process.env.KEEP_INDEX ? (h) => h.replace(/href="([^"#?:]*?)index\.html(#[^"]*)?"/g, (m, dir, hash) => (dir === "" || dir.endsWith("/") ? `href="${dir || "./"}${hash || ""}"` : m)) : (h) => h;
  for (const [p, html] of Object.entries(files)) { mkdirSync(dirname(join(out, p)), { recursive: true }); writeFileSync(join(out, p), clean(html)); }
  cpSync(join(root, "assets"), join(out, "assets"), { recursive: true });
  if (existsSync(join(root, "static"))) cpSync(join(root, "static"), out, { recursive: true });
  if (SITE.siteUrl) {
    const u = SITE.siteUrl.replace(/\/$/, "");
    writeFileSync(join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(files).filter((p) => p !== "404.html" && !p.includes("legal/")).map((p) => `  <url><loc>${u}/${p.replace(/index\.html$/, "")}</loc><lastmod>${g.updated}</lastmod></url>`).join("\n")}\n</urlset>\n`);
    writeFileSync(join(out, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${u}/sitemap.xml\n`);
  }
  // Aperçu : même arborescence, mais la page d'accueil en fragment
  const prev = join(root, "dist/preview");
  rmSync(prev, { recursive: true, force: true });
  cpSync(out, prev, { recursive: true });
  writeFileSync(join(prev, "index.html"), frag);
  console.log(`ok  ${g.id}  ${Object.keys(files).length} pages, ${g.items.length} armes`);
}
