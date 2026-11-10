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

function header(T, base, rel, plannerHref) {
  const links = Object.values(LANGS).map((L) => `<a href="${base}${PREFIX[L.lang.code]}${rel}" hreflang="${L.lang.code}"${L.lang.code === T.lang.code ? ' aria-current="true"' : ""}>${L.lang.name}</a>`).join("");
  return `<header class="top band"><div class="inner">
  <span class="brand"><a href="${plannerHref}">Phantom Blade Zero <b>·</b> ${T.site.brand}</a></span>
  <details class="langs"><summary>${T.lang.code.toUpperCase()}</summary><div class="langs-menu">${links}</div></details>
  <small class="meta-line">${T.site.gameVersion} {{VERSION}} · ${T.site.dataFrom} {{UPDATED}} · ${T.site.fan}</small>
</div></header>`;
}
const reportHref = (name, lang) => SITE.reportUrl ? `${SITE.reportUrl}?${new URLSearchParams({ title: name ? `Wrong stats: ${name}` : "Wrong stats", body: `Weapon: ${name || ""}\nPage language: ${lang}\nWhat is wrong (stat, level, value you see in game):\n\nScreenshot (optional):\n` })}` : "";
const LEGAL = { en: read("src/legal/en.html"), fr: read("src/legal/fr.html") };
const legalPath = (lang) => (LEGAL[lang] ? PREFIX[lang] : "") + "legal/index.html";
// Bandeau affilié : jeux du même genre, liens de recherche Instant Gaming avec le code d'affiliation.
const promo = (T, banner = true) => {
  if (!SITE.affiliate || !SITE.affiliateGames?.length) return "";
  const u = new URL(SITE.affiliate), link = (q) => { u.searchParams.set("q", q); return u.toString(); };
  return `<aside class="promo band" aria-label="${esc(T.ui.similarTitle)}"><div class="inner"><div class="promo-head"><span class="kicker">${esc(T.ui.similarTitle)}</span><small>${esc(T.ui.affiliate)}</small></div><div class="promo-row">${SITE.affiliateGames.map((n) => `<a class="promo-card" href="${esc(link(n))}" rel="sponsored noopener" target="_blank"><b>${esc(n)}</b><span>${esc(T.ui.seePrice)} →</span></a>`).join("")}</div>${banner ? igBanner(T) : ""}</div></aside>`;
};
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

function indexHtml(g, T, weaponHref) {
  const cols = [];
  for (const kind of g.kinds) for (const type of [...new Set(g.items.filter((i) => i.kind === kind).map((i) => i.type))]) {
    const items = g.items.filter((i) => i.kind === kind && i.type === type).sort((a, b) => a.name.localeCompare(b.name));
    cols.push(`<div><h3>${esc(T.kindsPlural[kind])} · ${esc(T.types[type])}</h3><ul>${items.map((i) => `<li><a href="${weaponHref(i)}">${esc(i.name)}</a></li>`).join("")}</ul></div>`);
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
  const same = pool.filter((o) => o.type === it.type && o.id !== it.id);
  const pairs = L.pairs(it);
  const src = Object.entries(it.check.sources).filter(([, v]) => g.stats.some((s) => v[s] != null)).map(([n, v]) => `${n} : ` + g.stats.filter((s) => v[s] != null).map((s) => `${T.stats[s].toLowerCase()} ${fmt(v[s])}`).join(", ")).join(" · ");
  const st = L.stateOf(it);
  return `<nav class="crumbs band"><div class="inner"><a href="${planner}">${esc(T.ui.home)}</a> / ${esc(T.kindsPlural[it.kind])} / ${esc(T.types[it.type])}</div></nav>
<main>
<section class="band"><div class="inner wp">
  <div class="showcase">${img(it) || `<span class="noimg">${esc(T.ui.noImage)}</span>`}</div>
  <div class="sheet">
    <div class="meta"><span>${esc(T.kinds[it.kind])}</span><span>${esc(T.types[it.type])}</span>${it.rarity ? `<span class="rar-${it.rarity}">${esc(T.rarity[it.rarity])}</span>` : ""}</div>
    <h1 style="font-size:clamp(32px,5vw,52px)">${esc(it.name)}</h1>
    <p class="pitch">${esc(L.pitch(it, "base"))}</p>
    ${rows ? `<table class="stat-table"><thead><tr><th>${esc(T.ui.statsTitle)}</th><th class="r">${esc(T.levels.base)}</th><th class="r">${esc(T.levels.max)}</th></tr></thead><tbody>${rows}</tbody></table>` : `<p class="trust">${esc(T.ui.noStats)}</p>`}
    <p class="trust ${st}"><b>${esc(L.trust(it))}</b>${src ? ` · ${esc(T.ui.sourcesAt1)}${esc(src)}` : ""}</p>
    <div class="equip"><a class="btn" href="${planner}#W-${it.id}">${esc(T.ui.openInPlanner)}</a>${SITE.reportUrl ? `<a class="btn ghost" href="${esc(reportHref(it.name, T.lang.code))}" rel="noopener" target="_blank">${esc(T.ui.report)}</a>` : ""}</div>
  </div>
</div></section>
${ranks ? `<section class="wsec band"><div class="inner"><h2>${esc(T.ui.ranksTitle)}</h2><ul class="advice">${ranks}</ul></div></section>` : ""}
${pairs.length ? `<section class="wsec band"><div class="inner"><h2>${esc(T.ui.pairs)}</h2><div class="cards">${pairs.map(card).join("")}</div></div></section>` : ""}
${same.length ? `<section class="wsec band"><div class="inner"><h2>${esc(fill(T.ui.sameType, { type: T.types[it.type].toLowerCase() }))}</h2><div class="cards">${same.map(card).join("")}</div></div></section>` : ""}
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
    const head = (title, desc, path, alt) => `<title>${esc(title)}</title>\n<meta name="description" content="${esc(desc)}">\n${headTags(g, path, alt, lang)}\n`;
    const plannerBody = PLANNER
      .replace(/\{\{t\.(\w+)\.(\w+)\}\}/g, (_, a, b) => esc(T[a][b]))
      .replace("{{TITLE}}", esc(meta(T.meta.plannerTitle))).replace("{{DESCRIPTION}}", esc(meta(T.meta.plannerDesc)))
      .replace("{{HEAD}}", () => headTags("index.html", lang) + "\n" + jsonLd({ "@context": "https://schema.org", "@type": "WebApplication", name: "Phantom Blade Zero Build Planner", url: absUrl(lang, "index.html"), applicationCategory: "GameApplication", operatingSystem: "Any", inLanguage: T.lang.locale, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, description: meta(T.meta.plannerDesc) }) + "\n" + ogTags(meta(T.meta.plannerTitle), meta(T.meta.plannerDesc), "planner.jpg", "index.html", lang))
      .replace("{{CSS}}", () => CSS)
      .replace("{{HEADER}}", () => sub(header(T, pBase, "index.html", `${pBase}${P}index.html`)))
      .replace("{{INDEX}}", () => indexHtml(g, T, (i) => `weapons/${i.id}/index.html`))
      .replace("{{FOOTER}}", () => promo(T, false) + footer(T, pBase))
      .replace("{{IGBANNER}}", () => igBanner(T))
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
        `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Marcellus+SC&family=Karla:wght@400;500;700&family=IBM+Plex+Mono:wght@500&display=swap">\n<style>\n${CSS}</style>\n`;
      put(path, page(T.lang.locale, hd, sub(header(T, base, `weapons/${it.id}/index.html`, `${base}${P}index.html`)) + weaponPage(g, T, L, it, base) + promo(T) + footer(T, base)));
    }
  }
  const FONTS = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Marcellus+SC&family=Karla:wght@400;500;700&family=IBM+Plex+Mono:wght@500&display=swap">\n<style>\n${CSS}</style>\n`;
  for (const lang of Object.keys(LEGAL)) {
    const T = LANGS[lang], path = legalPath(lang), base = depthBase(path);
    const hd = `<title>${esc(T.footer.legal)} · Phantom Blade Zero Build Planner</title>\n<meta name="robots" content="noindex">\n${FONTS}`;
    files[path] = page(T.lang.locale, hd, sub0(g, header(T, base, "index.html", `${base}${PREFIX[lang]}index.html`)) + `<main class="band"><div class="inner legal">${legalBody(lang, g.updated)}</div></main>` + footer(T, base));
  }
  { const T = LANGS.en, F = LANGS.fr;
    files["404.html"] = page("en", `<title>${esc(T.notFound.title)} · Phantom Blade Zero Build Planner</title>\n<meta name="robots" content="noindex">\n${FONTS}`,
      sub0(g, header(T, "/", "index.html", "/index.html")) + `<main class="band"><div class="inner legal nf"><p class="kicker">404</p><h1>${esc(T.notFound.title)}</h1><p>${esc(T.notFound.text)}</p><p><a class="btn" href="/">${esc(T.notFound.back)}</a></p>` +
      (F ? `<p lang="fr" class="trust">${esc(F.notFound.text)} <a href="/fr/">${esc(F.notFound.back)}</a></p>` : "") + `</div></main>` + footer(T, "/")); }
  const frag = files.__fragment; delete files.__fragment;
  for (const [p, html] of Object.entries(files)) { mkdirSync(dirname(join(out, p)), { recursive: true }); writeFileSync(join(out, p), html); }
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
