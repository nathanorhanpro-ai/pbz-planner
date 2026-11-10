/* PBZ Arsenal: logique partagée (données, scores, icônes, textes) */
(function () {
  const G = window.PBZ;
  const byId = Object.fromEntries(G.items.map((i) => [i.id, i]));
  const STATS = G.stats; // damage, guardBreak, status

  const GLYPH = {
    "One-Handed": '<path d="M4 20l3-3M5 15l4 4M8 16L19 5V3h-2L6 14"/>',
    "Dual-Wield": '<path d="M3 21l2.5-2.5M4 17l3 3M6.5 17.5L18 6V4h-2L4.5 15.5"/><path d="M21 21l-2.5-2.5M20 17l-3 3M17.5 17.5L6 6V4h2l11.5 11.5"/>',
    "Two-Handed": '<path d="M3 21l3.5-3.5M4 15l5 5M7.5 16.5L20 4"/><path d="M6.5 12.5l5 5L21 8V3h-5z"/>',
    "Artifice": '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.3 5.3l2.8 2.8M15.9 15.9l2.8 2.8M18.7 5.3l-2.8 2.8M8.1 15.9l-2.8 2.8"/>',
    "Destructive": '<path d="M4 21L14.5 10.5"/><path d="M11 5.5l7.5 7.5 2.5-2.5c-1-4-3.5-6.5-7.5-7.5z"/>',
    "Martial": '<path d="M3 21L17 7"/><path d="M14 4l6-1-1 6-2.5-.5-.5-2.5-2.5-.5z"/><path d="M6 15l3 3"/>',
    "Ranged": '<path d="M6 3a15 15 0 0 1 15 15"/><path d="M6 3l15 15"/><path d="M3 21l10.5-10.5M10.5 10h3.5v3.5"/>',
    "Summoning": '<path d="M12 21.5c-3.6 0-6-2.6-6-5.8 0-4.2 3.6-5.7 3-11.2 4 1.8 9 5.6 9 11.2 0 3.2-2.4 5.8-6 5.8z"/><circle cx="12" cy="15.5" r="2"/>',
  };
  // Rendu de l'arme (si activé) ou emblème dessiné. mode : "" médaillon, "banner" bandeau de carte, "tall" grand rendu vertical
  const CJK = { blade: "刃", edge: "影" };
  const glyph = (it, mode = "") => {
    const IMG = window.PBZ_IMG;
    if (IMG && it.image) return `<span class="art ${mode} rar-${it.rarity}" data-cjk="${CJK[it.kind]}" aria-hidden="true"><img src="${IMG}${mode === "tall" ? "weapons" : "m"}/${it.image}" alt="" loading="lazy" decoding="async"></span>`;
    return `<span class="glyph ${mode} rar-${it.rarity}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${GLYPH[it.type] || ""}</svg></span>`;
  };
  const typeIcon = (t) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPH[t] || ""}</svg>`;

  const pool = (kind) => G.items.filter((i) => i.kind === kind);
  const has = (it) => STATS.some((s) => it.stats.max[s] != null);
  const _max = {};
  function maxOf(kind, s, lvl) {
    const k = kind + s + lvl;
    if (!(k in _max)) _max[k] = Math.max(1, ...pool(kind).map((i) => i.stats[lvl][s] || 0));
    return _max[k];
  }
  // Score 0-100 : dégâts relatifs à la meilleure arme de la même catégorie + utilité (brise-garde ou altération)
  const W = { blade: [75, 25], edge: [55, 45] };
  function score(it, lvl = "max") {
    const v = it.stats[lvl];
    if (v.damage == null) return null;
    const d = v.damage / maxOf(it.kind, "damage", lvl);
    const g = v.guardBreak != null ? v.guardBreak / maxOf(it.kind, "guardBreak", lvl) : 0;
    const s = v.status != null ? v.status / maxOf(it.kind, "status", lvl) : 0;
    const [wd, wu] = W[it.kind];
    return Math.round(wd * d + wu * Math.max(g, s));
  }
  // Tier par rang dans la catégorie : 15 % S, 25 % A, 25 % B, 20 % C, le reste D
  const _rank = {};
  function tierFor(it, lvl = "max") {
    const sc = score(it, lvl);
    if (sc == null) return null;
    const k = it.kind + lvl;
    if (!_rank[k]) _rank[k] = pool(it.kind).map((i) => score(i, lvl)).filter((x) => x != null).sort((a, b) => b - a);
    const arr = _rank[k], p = arr.indexOf(sc) / arr.length;
    return p < 0.15 ? "S" : p < 0.4 ? "A" : p < 0.65 ? "B" : p < 0.85 ? "C" : "D";
  }
  const stateOf = (it) => (it.check.verified ? "verified" : it.check.state);

  const lang = document.documentElement.lang.startsWith("fr") ? "fr" : "en";
  const loc = lang === "fr" ? "fr-FR" : "en-US";
  const fmt = (n) => (n == null ? "—" : n.toLocaleString(loc));
  const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  const T = {
    en: {
      kinds: { blade: "Blade", edge: "Phantom Edge" }, kindsPl: { blade: "Blades", edge: "Phantom Edges" },
      types: { "One-Handed": "One-handed", "Dual-Wield": "Dual-wield", "Two-Handed": "Two-handed", Artifice: "Artifice", Destructive: "Destructive", Martial: "Martial", Ranged: "Ranged", Summoning: "Summoning" },
      rarity: { Common: "Common", Rare: "Rare", Epic: "Epic", null: "Unknown" },
      stats: { damage: "Damage", guardBreak: "Guard break", status: "Status", summonHealth: "Summon HP", summonDamage: "Summon dmg", hpRecovery: "HP recovery", shaChiRecovery: "Sha-Chi recovery" },
      statsShort: { damage: "DMG", guardBreak: "GUARD", status: "STATUS" },
      levels: { base: "Base", max: "Max" },
      slots: ["Blade 1", "Blade 2", "Phantom Edge 1", "Phantom Edge 2"],
      trust: { agree: "Sources agree", verified: "Verified in game", conflict: "Sources disagree", single: "Single source", missing: "No data yet" },
      ui: {
        all: "All", search: "Search a weapon…", noRes: "No weapon found.", grid: "Cards", table: "Table", sort: "Sort", sortScore: "Score", sortDmg: "Damage", sortGb: "Guard break", sortSt: "Status", sortName: "Name",
        equip: "Equip in {slot}", equipped: "EQUIPPED", compare: "Compare", inCompare: "In comparison", details: "Full page", close: "Close", pick: "Choose a weapon", change: "change",
        score: "Build score", radar: ["Blades", "Edges", "Guard", "Status", "Range", "Data"], outOf: "/ 100", share: "Copy link", copied: "Link copied!", copyText: "Copy as text", textCopied: "Build copied as text!", save: "Save build", saved: "My builds", savedEmpty: "No saved build yet.", nameBuild: "Build name", reset: "Recommended", random: "Random",
        totals: { blade: "Blades damage", edge: "Edges damage", gb: "Total guard break", st: "Total status" },
        cmpAdd: "+ Add a weapon", cmpEmpty: "Add up to 4 weapons to compare them side by side.", stat: "Stat", tierScore: "Score", unranked: "Unranked (no damage data)",
        sources: "Values by source (base level)", noStats: "No stats published for this weapon yet.", tierLabel: "Tier", report: "Report a wrong value",
      },
      advice: {
        noGuard: "No blade breaks guards: shielded enemies will slow you down. Swap one blade.",
        guard: "{names} breaks guards. Switch to it as soon as an enemy blocks.",
        same: "Both blades are {type}. A second style gives you a change of pace mid-fight.",
        two: "Two blade styles ({types}): good flexibility.",
        edgeGuard: "{name} is a top guard breaker among Phantom Edges. Keep it for bosses.",
        noStatus: "No status effect in this build. Add one for long boss fights.",
        status: "{names} adds status buildup.",
        statusN: "{names} add status buildup.",
        unsure: "Numbers not confirmed for {names}: totals are estimates.",
        top: "{name} is S-tier in its category.",
        topN: "{name} are S-tier in their categories.",
      },
    },
    fr: {
      kinds: { blade: "Lame", edge: "Lame fantôme" }, kindsPl: { blade: "Lames", edge: "Lames fantômes" },
      types: { "One-Handed": "Une main", "Dual-Wield": "Deux lames", "Two-Handed": "Deux mains", Artifice: "Artifice", Destructive: "Destructrice", Martial: "Martiale", Ranged: "À distance", Summoning: "Invocation" },
      rarity: { Common: "Commune", Rare: "Rare", Epic: "Épique", null: "Inconnue" },
      stats: { damage: "Dégâts", guardBreak: "Brise-garde", status: "Altération", summonHealth: "PV invocation", summonDamage: "Dégâts invoc.", hpRecovery: "Soin PV", shaChiRecovery: "Récup. Sha-Chi" },
      statsShort: { damage: "DÉG", guardBreak: "GARDE", status: "ALTÉR." },
      levels: { base: "Base", max: "Max" },
      slots: ["Lame 1", "Lame 2", "Lame fantôme 1", "Lame fantôme 2"],
      trust: { agree: "Sources concordantes", verified: "Vérifié en jeu", conflict: "Sources en désaccord", single: "Source unique", missing: "Pas encore de données" },
      ui: {
        all: "Toutes", search: "Chercher une arme…", noRes: "Aucune arme trouvée.", grid: "Cartes", table: "Tableau", sort: "Trier", sortScore: "Score", sortDmg: "Dégâts", sortGb: "Brise-garde", sortSt: "Altération", sortName: "Nom",
        equip: "Équiper en {slot}", equipped: "ÉQUIPÉE", compare: "Comparer", inCompare: "Dans le comparateur", details: "Fiche complète", close: "Fermer", pick: "Choisir une arme", change: "changer",
        score: "Score du build", radar: ["Lames", "L. fantômes", "Garde", "Altér.", "Polyval.", "Fiabilité"], outOf: "/ 100", share: "Copier le lien", copied: "Lien copié !", copyText: "Copier en texte", textCopied: "Build copié en texte !", save: "Sauvegarder", saved: "Mes builds", savedEmpty: "Aucun build sauvegardé.", nameBuild: "Nom du build", reset: "Recommandé", random: "Aléatoire",
        totals: { blade: "Dégâts des lames", edge: "Dégâts des lames fantômes", gb: "Brise-garde total", st: "Altération totale" },
        cmpAdd: "+ Ajouter une arme", cmpEmpty: "Ajoutez jusqu'à 4 armes pour les comparer côte à côte.", stat: "Stat", tierScore: "Score", unranked: "Non classées (pas de dégâts connus)",
        sources: "Valeurs par source (niveau de base)", noStats: "Pas encore de stats publiées pour cette arme.", tierLabel: "Tier", report: "Signaler une valeur fausse",
      },
      advice: {
        noGuard: "Aucune lame ne brise la garde : les ennemis à bouclier vont vous freiner. Changez une lame.",
        guard: "{names} brise la garde. Passez dessus dès qu'un ennemi bloque.",
        same: "Vos deux lames sont « {type} ». Un second style permet de changer de rythme en combat.",
        two: "Deux styles de lames ({types}) : bonne polyvalence.",
        edgeGuard: "{name} fait partie des meilleures lames fantômes pour briser la garde. Gardez-la pour les boss.",
        noStatus: "Aucune altération dans ce build. Ajoutez-en une pour les longs combats de boss.",
        status: "{names} applique une altération.",
        statusN: "{names} appliquent une altération.",
        unsure: "Chiffres non confirmés pour {names} : les totaux sont des estimations.",
        top: "{name} est tier S dans sa catégorie.",
        topN: "{name} sont tier S dans leur catégorie.",
      },
    },
  }[lang];

  const trust = (it) => {
    const st = stateOf(it), n = it.check.agreeing;
    if (st === "agree") return T.trust.agree + (n ? ` (${n})` : "");
    return T.trust[st] || st;
  };

  function bars(it, lvl, opts = {}) {
    const v = it.stats[lvl];
    const rows = STATS.filter((s) => v[s] != null).map((s) =>
      `<div class="bar c-${s}"><span>${opts.short ? T.statsShort[s] : T.stats[s]}</span><i><b style="width:${Math.round(100 * v[s] / maxOf(it.kind, s, lvl))}%"></b></i><span class="num">${fmt(v[s])}</span></div>`);
    if (opts.extra && it.extra) for (const [k, arr] of Object.entries(it.extra)) {
      const val = arr[lvl === "base" ? 0 : 1];
      rows.push(`<div class="bar c-extra"><span>${T.stats[k] || k}</span><i><b style="width:100%"></b></i><span class="num">${fmt(val)}</span></div>`);
    }
    return rows.length ? `<div class="bars">${rows.join("")}</div>` : `<span class="unk">${T.ui.noStats}</span>`;
  }

  window.PBZL = { G, byId, pool, has, maxOf, score, tierFor, stateOf, trust, glyph, typeIcon, fmt, fill, esc, T, lang, bars, STATS };
})();
