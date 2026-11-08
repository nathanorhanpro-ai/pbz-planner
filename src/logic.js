// Logique partagée entre le planner (navigateur) et la génération des pages (Node).
globalThis.Logic = (G, T) => {
  const byId = Object.fromEntries(G.items.map((it) => [it.id, it]));
  const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ""));
  const fmt = (v) => (v == null ? "–" : v.toLocaleString(T.lang.locale));
  const stateOf = (it) => (it.check.verified ? "verified" : it.check.state);
  const S = (it, lvl) => it.stats[lvl];
  const pool = (kind) => G.items.filter((i) => i.kind === kind);
  const maxOf = (kind, stat, lvl) => Math.max(1, ...pool(kind).map((i) => S(i, lvl)[stat] || 0));
  const rank = (it, stat, lvl) => {
    const v = S(it, lvl)[stat]; if (v == null) return null;
    const xs = pool(it.kind).map((i) => S(i, lvl)[stat]).filter((x) => x != null);
    return xs.filter((x) => x <= v).length / xs.length;
  };
  const trust = (it) => fill(T.trust[stateOf(it)], { n: it.check.agreeing });
  const extraText = (it, lvl) => it.extra ? Object.entries(it.extra).map(([k, v]) => `${T.extra[k]} ${fmt(v[lvl === "max" ? 1 : 0])}`).join(", ") : "";
  function pitch(it, lvl = "base") {
    if (it.extra) return fill(T.pitch.summon, { extra: extraText(it, lvl) });
    const d = rank(it, "damage", lvl), g = rank(it, "guardBreak", lvl), s = rank(it, "status", lvl);
    if (d == null) return T.pitch.unknown;
    const p = [d > .8 ? T.pitch.dmgHigh : d > .45 ? T.pitch.dmgMid : T.pitch.dmgLow];
    if (g != null) p.push(g > .75 ? T.pitch.gbHigh : g > .4 ? T.pitch.gbMid : T.pitch.gbLow);
    if (s != null) p.push(s > .6 ? T.pitch.stHigh : T.pitch.stLow);
    return p.join(" ");
  }
  // Armes recoupées d'un autre style, qui couvrent ce qui manque à celle-ci
  function pairs(it, n = 4) {
    const want = S(it, "base").guardBreak != null ? "damage" : "guardBreak";
    return pool(it.kind).filter((o) => o.id !== it.id && o.type !== it.type && stateOf(o) === "agree" && S(o, "base")[want] != null)
      .sort((a, b) => S(b, "base")[want] - S(a, "base")[want]).slice(0, n);
  }
  const DEFAULT = (() => {
    const ok = (k) => pool(k).filter((i) => stateOf(i) === "agree");
    const b = ok("blade").sort((x, y) => y.stats.base.damage - x.stats.base.damage);
    const e = ok("edge").sort((x, y) => (y.stats.base.guardBreak || 0) - (x.stats.base.guardBreak || 0));
    return [b[0].id, (b.find((x) => x.type !== b[0].type) || b[1]).id, e[0].id, (e.find((x) => x.type !== e[0].type) || e[1]).id];
  })();
  const idx = Object.fromEntries(G.items.map((it, i) => [it.id, i]));
  const hashOf = (loadout, lvl) => "#L" + (lvl === G.levels[0] ? "1" : "M") + "-" + loadout.map((id) => idx[id]).join("-");
  return { byId, fill, fmt, stateOf, S, pool, maxOf, rank, trust, extraText, pitch, pairs, DEFAULT, hashOf };
};
