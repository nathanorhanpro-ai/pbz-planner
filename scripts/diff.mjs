// Compare deux versions des données d'un jeu et écrit le changelog du patch en Markdown.
// Usage : node scripts/diff.mjs ancien.json nouveau.json > patch.md
import { readFileSync } from "node:fs";

const [a, b] = process.argv.slice(2).map((p) => JSON.parse(readFileSync(p, "utf8")));
const old = Object.fromEntries(a.items.map((i) => [i.id, i]));
const neu = Object.fromEntries(b.items.map((i) => [i.id, i]));
const lines = [`# ${b.name} : changements ${a.version} → ${b.version}`, ""];
const added = b.items.filter((i) => !old[i.id]), removed = a.items.filter((i) => !neu[i.id]);
const changed = [];
const LABEL = { damage: "Dégâts", guardBreak: "Brise-garde", status: "Effets de statut" };
const LEVEL = { base: "niv. 1", max: "niv. max" };
for (const it of b.items) {
  const o = old[it.id]; if (!o) continue;
  for (const lvl of b.levels) for (const s of b.stats) {
    const x = o.stats[lvl]?.[s], y = it.stats[lvl]?.[s];
    if (x !== y && x != null && y != null) changed.push({ it, s: `${LABEL[s] || s} (${LEVEL[lvl] || lvl})`, x, y, up: y > x });
  }
}
const sec = (title, arr, f) => { if (arr.length) lines.push(`## ${title}`, "", ...arr.map(f), ""); };
sec("Buffs", changed.filter((c) => c.up), (c) => `- **${c.it.name}** : ${c.s} ${c.x ?? "–"} → ${c.y ?? "–"}`);
sec("Nerfs", changed.filter((c) => !c.up), (c) => `- **${c.it.name}** : ${c.s} ${c.x ?? "–"} → ${c.y ?? "–"}`);
sec("Nouveautés", added, (i) => `- **${i.name}** (${i.type})`);
sec("Retirés", removed, (i) => `- **${i.name}**`);
if (lines.length === 2) lines.push("Aucun changement de stats.");
console.log(lines.join("\n"));
