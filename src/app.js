/* PBZ Arsenal : planificateur (page d'accueil) */
(function () {
  const { G, byId, pool, score, tierFor, stateOf, trust, glyph, typeIcon, fmt, fill, esc, T, lang, bars, STATS } = window.PBZL;
  const $ = (id) => document.getElementById(id);
  const PFX = lang === "fr" ? "/fr" : "";
  const page = (it) => `${PFX}/w/${it.id}/`;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  // ---------- build par défaut : meilleures armes avec brise-garde et deux styles ----------
  const ranked = (kind) => pool(kind).filter((i) => score(i) != null).sort((a, b) => score(b) - score(a));
  const DEFAULT = (() => {
    const bl = ranked("blade"), ed = ranked("edge");
    const b1 = bl.find((i) => i.stats.max.guardBreak != null) || bl[0];
    const b2 = bl.find((i) => i !== b1 && i.type !== b1.type) || bl[1];
    const e1 = ed[0], e2 = ed.find((i) => i !== e1 && i.type !== e1.type) || ed[1];
    return [b1.id, b2.id, e1.id, e2.id];
  })();
  const SLOT_KIND = G.slots.map((s) => s.kind);

  // ---------- état ----------
  let lvl = "max", build = DEFAULT.slice(), cmp = [];
  const filter = { kind: "", type: "", q: "", sort: "score", view: store.get("pbz.view", "grid"), dir: "desc" };
  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    if (p.get("l") === "base" || p.get("l") === "max") lvl = p.get("l");
    const b = (p.get("b") || "").split(",");
    if (b.length === 4) build = b.map((id, i) => (byId[id] && byId[id].kind === SLOT_KIND[i] ? id : DEFAULT[i]));
    const c = (p.get("c") || "").split(",").filter((id) => byId[id]);
    if (c.length) cmp = [...new Set(c)].slice(0, 4);
  }
  const hash = () => `#b=${build.join(",")}&l=${lvl}${cmp.length ? "&c=" + cmp.join(",") : ""}`;
  const shareUrl = () => location.origin + location.pathname + `#b=${build.join(",")}&l=${lvl}`;
  readHash();
  if (!cmp.length) cmp = [build[0], build[1]];

  // ---------- niveau ----------
  function renderLvl() {
    document.querySelectorAll("[data-lvl-seg]").forEach((el) => {
      el.innerHTML = G.levels.map((l) => `<button type="button" data-l="${l}" aria-pressed="${l === lvl}">${T.levels[l]}</button>`).join("");
    });
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-lvl-seg] [data-l]");
    if (b) { lvl = b.dataset.l; renderAll(); }
  });

  // ---------- build ----------
  function buildScore(items) {
    const sc = items.map((i) => score(i, lvl) ?? 55);
    let s = sc.reduce((a, b) => a + b, 0) / sc.length;
    const blades = items.filter((i) => i.kind === "blade");
    if (blades.some((b) => b.stats[lvl].guardBreak != null)) s += 4; else s -= 8;
    if (new Set(blades.map((b) => b.type)).size > 1) s += 3; else s -= 3;
    if (items.some((i) => i.stats[lvl].status != null)) s += 3;
    return Math.max(0, Math.min(100, Math.round(s)));
  }
  function renderBuild() {
    const items = build.map((id) => byId[id]);
    $("slots").innerHTML = items.map((it, i) => {
      const sc = score(it, lvl), t = tierFor(it, lvl);
      return `<button type="button" class="slot frame rar-${it.rarity}" data-slot="${i}" aria-label="${T.slots[i]} : ${esc(it.name)} (${T.ui.change})">
        <span class="lbl">${T.slots[i]}</span>${t ? `<span class="swap tbadge t-${t}">${t}</span>` : ""}
        ${glyph(it, "banner")}<span class="nm">${esc(it.name)}</span><span class="sm">${T.types[it.type]} · <span class="rtag rar-${it.rarity}">${T.rarity[it.rarity]}</span></span>
        <div class="mini">${bars(it, lvl, { short: true })}</div><span class="chg">↻ ${T.ui.change}</span></button>`;
    }).join("");

    const S = (i) => i.stats[lvl];
    const sum = (arr, k) => arr.reduce((a, i) => a + (S(i)[k] || 0), 0);
    const blades = items.filter((i) => i.kind === "blade"), edges = items.filter((i) => i.kind === "edge");
    const bs = buildScore(items);
    const top2 = (kind, k) => pool(kind).map((i) => i.stats[lvl][k] || 0).sort((x, y) => y - x).slice(0, 2).reduce((x, y) => x + y, 0) || 1;
    const items4 = items;
    const ax = [
      sum(blades, "damage") / top2("blade", "damage"),
      sum(edges, "damage") / top2("edge", "damage"),
      sum(items4, "guardBreak") / (top2("blade", "guardBreak") + top2("edge", "guardBreak")),
      sum(items4, "status") / (top2("blade", "status") + top2("edge", "status")),
      new Set(items4.map((i) => i.type)).size / 4 * 0.5 + (items4.some((i) => S(i).guardBreak != null) ? 0.25 : 0) + (items4.some((i) => S(i).status != null) ? 0.25 : 0),
      items4.filter((i) => ["agree", "verified"].includes(stateOf(i))).length / 4,
    ].map((v) => Math.max(0.04, Math.min(1, v)));
    const R = 92, cx = 130, cy = 118, pt = (k, r) => { const ang = -Math.PI / 2 + k * Math.PI / 3; return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)]; };
    const poly = (f) => ax.map((_, k) => pt(k, f(k)).map((n) => n.toFixed(1)).join(",")).join(" ");
    const grade = bs >= 90 ? "S" : bs >= 80 ? "A" : bs >= 70 ? "B" : bs >= 60 ? "C" : "D";
    $("score").innerHTML = `<div class="head"><div class="big">${bs}<small>/100</small></div><div style="display:grid;gap:4px;min-width:0"><span class="kick" style="margin:0;letter-spacing:.2em">${T.ui.score}</span><span class="trust">${T.levels[lvl]}</span></div><div class="grade"><span class="tbadge t-${grade}">${grade}</span></div></div>
      <svg class="radar" viewBox="-40 0 340 240" role="img" aria-label="${T.ui.score}">
        ${[1, 0.66, 0.33].map((f) => `<polygon points="${poly(() => R * f)}" fill="none" stroke="rgba(239,230,210,.1)"/>`).join("")}
        ${ax.map((_, k) => { const [x, y] = pt(k, R); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(239,230,210,.08)"/>`; }).join("")}
        <polygon points="${poly((k) => R * ax[k])}" fill="rgba(229,67,47,.28)" stroke="#ff6a4d" stroke-width="2" stroke-linejoin="round" style="filter:drop-shadow(0 0 10px rgba(229,67,47,.6))"/>
        ${ax.map((v, k) => { const [x, y] = pt(k, R * v); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="#efe6d2"/>`; }).join("")}
        ${T.ui.radar.map((l, k) => { const [x, y] = pt(k, R + 16); return `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="${Math.abs(x - cx) < 5 ? "middle" : x > cx ? "start" : "end"}">${l}</text>`; }).join("")}
      </svg>
      <div class="totals">${[[T.ui.totals.blade, sum(blades, "damage")], [T.ui.totals.edge, sum(edges, "damage")], [T.ui.totals.gb, sum(items, "guardBreak")], [T.ui.totals.st, sum(items, "status")]]
        .map(([k, v]) => `<div><span>${k}</span><b class="num">${fmt(v)}</b></div>`).join("")}</div>`;

    const A = T.advice, say = [];
    const gb = blades.filter((b) => S(b).guardBreak != null);
    say.push(gb.length ? ["good", fill(A.guard, { names: gb.map((b) => b.name).join(" & ") })] : ["warn", A.noGuard]);
    const types = [...new Set(blades.map((b) => T.types[b.type]))];
    say.push(types.length < 2 ? ["warn", fill(A.same, { type: types[0] })] : ["good", fill(A.two, { types: types.join(", ") })]);
    const eg = edges.filter((e) => S(e).guardBreak != null).sort((a, b) => S(b).guardBreak - S(a).guardBreak)[0];
    if (eg && S(eg).guardBreak / window.PBZL.maxOf("edge", "guardBreak", lvl) > 0.8) say.push(["good", fill(A.edgeGuard, { name: eg.name })]);
    const st = items.filter((i) => S(i).status != null);
    say.push(st.length ? ["good", fill(st.length > 1 ? A.statusN : A.status, { names: st.map((i) => i.name).join(", ") })] : ["", A.noStatus]);
    const top = items.filter((i) => tierFor(i, lvl) === "S");
    if (top.length) say.push(["good", fill(top.length > 1 ? A.topN : A.top, { name: top.map((i) => i.name).join(", ") })]);
    const unsure = items.filter((i) => !["agree", "verified"].includes(stateOf(i)));
    if (unsure.length) say.push(["warn", fill(A.unsure, { names: unsure.map((i) => i.name).join(", ") })]);
    $("advice").innerHTML = say.map(([c, t]) => `<li class="${c}">${esc(t)}</li>`).join("");
    renderSaved();
  }
  $("slots").addEventListener("click", (e) => {
    const b = e.target.closest("[data-slot]"); if (b) openPicker(+b.dataset.slot);
  });
  function equip(id, slot) {
    const from = build.indexOf(id);
    if (from >= 0 && from !== slot) build[from] = build[slot]; // échange au lieu de dupliquer
    build[slot] = id; renderBuild(); renderList(); sync();
  }

  const toast = (msg) => { $("toast").textContent = msg; clearTimeout(toast.t); toast.t = setTimeout(() => ($("toast").textContent = ""), 2600); };
  const copy = (txt, msg) => (navigator.clipboard ? navigator.clipboard.writeText(txt).then(() => toast(msg), () => toast(txt)) : toast(txt));
  $("act-share").onclick = () => copy(shareUrl(), T.ui.copied);
  $("act-text").onclick = () => {
    const items = build.map((id) => byId[id]);
    const lines = items.map((it, i) => `${T.slots[i]}: ${it.name} (${T.types[it.type]})`);
    copy(`Phantom Blade Zero build (${T.levels[lvl]}) · ${T.ui.score} ${buildScore(items)}/100\n${lines.join("\n")}\n${shareUrl()}`, T.ui.textCopied);
  };
  $("act-reset").onclick = () => { build = DEFAULT.slice(); renderBuild(); renderList(); sync(); };
  $("act-random").onclick = () => {
    const pickRand = (arr, n) => arr.slice().sort(() => Math.random() - 0.5).slice(0, n).map((i) => i.id);
    const bl = pickRand(pool("blade").filter((i) => score(i) != null), 2), ed = pickRand(pool("edge").filter((i) => score(i) != null), 2);
    build = [...bl, ...ed]; renderBuild(); renderList(); sync();
  };
  $("act-save").onclick = () => {
    const list = store.get("pbz.builds", []);
    const name = (prompt(T.ui.nameBuild, `Build ${list.length + 1}`) || "").trim().slice(0, 40);
    if (!name) return;
    list.unshift({ name, b: build.slice(), l: lvl }); store.set("pbz.builds", list.slice(0, 12)); renderSaved();
  };
  function renderSaved() {
    const list = store.get("pbz.builds", []);
    $("saved").innerHTML = list.length ? list.map((s, i) => `<span class="chip"><button type="button" class="load" data-load="${i}">${esc(s.name)}</button><button type="button" data-del="${i}" aria-label="✕">✕</button></span>`).join("")
      : `<span class="trust">${T.ui.savedEmpty}</span>`;
  }
  $("saved").addEventListener("click", (e) => {
    const list = store.get("pbz.builds", []);
    const l = e.target.closest("[data-load]"), d = e.target.closest("[data-del]");
    if (l) { const s = list[+l.dataset.load]; build = s.b.filter((id) => byId[id]).length === 4 ? s.b.slice() : build; lvl = s.l || lvl; renderAll(); }
    if (d) { list.splice(+d.dataset.del, 1); store.set("pbz.builds", list); renderSaved(); }
  });

  // ---------- arsenal ----------
  function renderFilters() {
    const kinds = [["", T.ui.all], ["blade", T.kindsPl.blade], ["edge", T.kindsPl.edge]];
    $("f-kind").innerHTML = kinds.map(([k, l]) => `<button type="button" class="chip" data-kind="${k}" aria-pressed="${filter.kind === k}">${l}</button>`).join("");
    const types = [...new Set(G.items.filter((i) => !filter.kind || i.kind === filter.kind).map((i) => i.type))];
    $("f-type").innerHTML = [`<button type="button" class="chip" data-type="" aria-pressed="${!filter.type}">${T.ui.all}</button>`]
      .concat(types.map((t) => `<button type="button" class="chip" data-type="${t}" aria-pressed="${filter.type === t}">${typeIcon(t)}${T.types[t]}</button>`)).join("");
    document.querySelectorAll("#f-view [data-view]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.view === filter.view));
  }
  $("f-kind").addEventListener("click", (e) => { const b = e.target.closest("[data-kind]"); if (b) { filter.kind = b.dataset.kind; filter.type = ""; renderFilters(); renderList(); } });
  $("f-type").addEventListener("click", (e) => { const b = e.target.closest("[data-type]"); if (b) { filter.type = b.dataset.type; renderFilters(); renderList(); } });
  $("f-view").addEventListener("click", (e) => { const b = e.target.closest("[data-view]"); if (b) { filter.view = b.dataset.view; store.set("pbz.view", filter.view); renderFilters(); renderList(); } });
  $("q").addEventListener("input", (e) => { filter.q = e.target.value; renderList(); });
  $("sort").addEventListener("change", (e) => { filter.sort = e.target.value; filter.dir = filter.sort === "name" ? "asc" : "desc"; renderList(); });

  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  function visible() {
    const q = norm(filter.q.trim());
    const key = { score: (i) => score(i, lvl) ?? -1, damage: (i) => i.stats[lvl].damage ?? -1, guardBreak: (i) => i.stats[lvl].guardBreak ?? -1, status: (i) => i.stats[lvl].status ?? -1, name: (i) => i.name }[filter.sort];
    const dir = filter.dir === "asc" ? 1 : -1;
    return G.items.filter((i) => (!filter.kind || i.kind === filter.kind) && (!filter.type || i.type === filter.type) &&
      (!q || norm(i.name + " " + T.types[i.type] + " " + i.type).includes(q)))
      .sort((a, b) => { const x = key(a), y = key(b); return (typeof x === "string" ? x.localeCompare(y) : x - y) * dir; });
  }
  function renderList() {
    const items = visible();
    $("count").textContent = items.length;
    if (!items.length) { $("list").innerHTML = `<p class="trust">${T.ui.noRes}</p>`; return; }
    if (filter.view === "table") {
      const th = (k, label, num) => `<th class="${num ? "num" : ""}"><button type="button" data-sortk="${k}"${filter.sort === k ? ` data-dir="${filter.dir}"` : ""}>${label}</button></th>`;
      $("list").innerHTML = `<div class="tablewrap"><table><thead><tr>${th("name", T.ui.sortName)}<th>${T.ui.tierLabel}</th>${th("score", T.ui.sortScore, 1)}${th("damage", T.stats.damage, 1)}${th("guardBreak", T.stats.guardBreak, 1)}${th("status", T.stats.status, 1)}<th>${T.trust.agree.split(" ")[0]}</th></tr></thead><tbody>${items.map((it) => {
        const sc = score(it, lvl), t = tierFor(it, lvl), v = it.stats[lvl];
        return `<tr data-id="${it.id}"><td><span class="nmcell">${glyph(it)}<span><b>${esc(it.name)}</b>${build.includes(it.id) ? ` <span class="rtag" style="--rc:var(--jade)">✓</span>` : ""}<br><small class="trust">${T.types[it.type]} · <span class="rtag rar-${it.rarity}">${T.rarity[it.rarity]}</span></small></span></span></td>
          <td>${t ? `<span class="tbadge t-${t}">${t}</span>` : "—"}</td><td class="num">${sc ?? "—"}</td><td class="num">${fmt(v.damage)}</td><td class="num">${fmt(v.guardBreak)}</td><td class="num">${fmt(v.status)}</td><td><span class="trust ${stateOf(it)}">●</span></td></tr>`;
      }).join("")}</tbody></table></div>`;
    } else {
      $("list").innerHTML = `<div class="grid">${items.map((it) => {
        const t = tierFor(it, lvl);
        return `<button type="button" class="card rar-${it.rarity}${build.includes(it.id) ? " on" : ""}" data-id="${it.id}">
          ${t ? `<span class="tier tbadge t-${t}">${t}</span>` : ""}
          ${glyph(it, "banner")}
          <span class="cap"><span class="nm">${esc(it.name)}</span><span class="ty">${T.types[it.type]} · <span class="rtag rar-${it.rarity}">${T.rarity[it.rarity]}</span></span></span>
          ${build.includes(it.id) ? `<span class="eq">✓ ${T.ui.equipped}</span>` : ""}
          ${bars(it, lvl, { short: true })}</button>`;
      }).join("")}</div>`;
    }
  }
  $("list").addEventListener("click", (e) => {
    const s = e.target.closest("[data-sortk]");
    if (s) { const k = s.dataset.sortk; filter.dir = filter.sort === k ? (filter.dir === "asc" ? "desc" : "asc") : k === "name" ? "asc" : "desc"; filter.sort = k; $("sort").value = k; renderList(); return; }
    const c = e.target.closest("[data-id]"); if (c) openDetail(c.dataset.id);
  });

  // ---------- fenêtre détail / sélecteur ----------
  const dlg = $("dlg");
  const open = (html, cls = "") => { dlg.innerHTML = `<div class="dlg ${cls}">${html}</div>`; if (!dlg.open) dlg.showModal(); };
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-close]")) dlg.close(); });
  function openDetail(id) {
    const it = byId[id], sc = score(it, lvl), t = tierFor(it, lvl);
    const slots = SLOT_KIND.map((k, i) => [k, i]).filter(([k]) => k === it.kind);
    const src = Object.entries(it.check.sources).filter(([, v]) => STATS.some((s) => v[s] != null))
      .map(([n, v]) => `<b>${esc(n)}</b> : ${STATS.filter((s) => v[s] != null).map((s) => `${T.stats[s].toLowerCase()} ${fmt(v[s])}`).join(", ")}`).join("<br>");
    open(`<div class="dlg-h"><div><div class="meta"><span>${T.kinds[it.kind]}</span><span>${T.types[it.type]}</span><span class="rtag rar-${it.rarity}">${T.rarity[it.rarity]}</span>${t ? `<span>${T.ui.tierLabel} <b>${t}</b> · ${sc}/100</span>` : ""}</div><h2 style="margin-top:6px">${esc(it.name)}</h2></div><button type="button" class="close" data-close aria-label="${T.ui.close}">✕</button></div>
      <div class="dlg-grid">${glyph(it, "tall")}<div class="dlg-main">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div class="seg" data-lvl-seg></div><span class="trust ${stateOf(it)}">● ${trust(it)}</span></div>
      <div id="dlg-bars">${bars(it, lvl, { extra: true })}</div>
      ${src ? `<div class="src">${T.ui.sources}<br>${src}</div>` : ""}
      <div class="actions">${slots.map(([, i]) => build[i] === id ? `<span class="btn ghost sm" aria-current="true">✓ ${T.slots[i]}</span>` : `<button type="button" class="btn sm" data-eq="${i}">${fill(T.ui.equip, { slot: T.slots[i] })}</button>`).join("")}
        <button type="button" class="btn ghost sm" data-cmp="${id}">${cmp.includes(id) ? "✓ " + T.ui.inCompare : T.ui.compare}</button>
        <a class="btn ghost sm" href="${page(it)}">${T.ui.details} →</a></div></div></div>`, `rar-${it.rarity}`);
    renderLvl();
    dlg.dataset.id = id;
  }
  function openPicker(slot) {
    const kind = SLOT_KIND[slot];
    const items = pool(kind).slice().sort((a, b) => (score(b, lvl) ?? -1) - (score(a, lvl) ?? -1));
    open(`<div class="dlg-h"><div><span class="kick">${T.slots[slot]}</span><h2>${T.ui.pick}</h2></div><button type="button" class="close" data-close aria-label="${T.ui.close}">✕</button></div>
      <input type="search" id="pick-q" placeholder="${T.ui.search}" autocomplete="off">
      <div class="picklist" id="pick-list">${items.map((it) => {
        const v = it.stats[lvl], t = tierFor(it, lvl);
        return `<button type="button" class="pickitem${build[slot] === it.id ? " on" : ""}" data-pick="${it.id}" data-n="${esc(norm(it.name + " " + T.types[it.type]))}">${glyph(it)}<span><span class="nm">${esc(it.name)}</span><br><small class="trust">${T.types[it.type]}</small></span>
          <span class="r">${t ? `<span class="tbadge t-${t}">${t}</span><br>` : ""}<span class="num">${fmt(v.damage)}</span></span></button>`;
      }).join("")}</div>`);
    dlg.dataset.slot = slot;
    const q = $("pick-q");
    q.addEventListener("input", () => { const s = norm(q.value); dlg.querySelectorAll("[data-pick]").forEach((b) => (b.hidden = !b.dataset.n.includes(s))); });
    if (matchMedia("(pointer:fine)").matches) q.focus();
  }
  dlg.addEventListener("click", (e) => {
    const p = e.target.closest("[data-pick]"); if (p) { equip(p.dataset.pick, +dlg.dataset.slot); dlg.close(); return; }
    const q = e.target.closest("[data-eq]"); if (q) { equip(dlg.dataset.id, +q.dataset.eq); openDetail(dlg.dataset.id); return; }
    const c = e.target.closest("[data-cmp]");
    if (c) { const id = c.dataset.cmp; cmp = cmp.includes(id) ? cmp.filter((x) => x !== id) : [...cmp, id].slice(-4); renderCmp(); sync(); openDetail(id); }
  });
  dlg.addEventListener("close", () => { delete dlg.dataset.id; delete dlg.dataset.slot; });

  // ---------- recherche globale ----------
  function openSearch() {
    const items = G.items;
    open(`<div class="dlg-h"><div><h2>${T.ui.search.replace("…", "")}</h2></div><button type="button" class="close" data-close aria-label="${T.ui.close}">✕</button></div>
      <input type="search" id="pick-q" placeholder="${T.ui.search}" autocomplete="off">
      <div class="picklist">${items.map((it) => `<button type="button" class="pickitem" data-open="${it.id}" data-n="${esc(norm(it.name + " " + T.types[it.type] + " " + T.kinds[it.kind]))}">${glyph(it)}<span><span class="nm">${esc(it.name)}</span><br><small class="trust">${T.kinds[it.kind]} · ${T.types[it.type]}</small></span><span class="r num">${fmt(it.stats[lvl].damage)}</span></button>`).join("")}</div>`);
    const q = $("pick-q");
    q.addEventListener("input", () => { const s = norm(q.value); dlg.querySelectorAll("[data-open]").forEach((b) => (b.hidden = !b.dataset.n.includes(s))); });
    q.addEventListener("keydown", (e) => { if (e.key === "Enter") { const f = dlg.querySelector("[data-open]:not([hidden])"); if (f) openDetail(f.dataset.open); } });
    q.focus();
  }
  dlg.addEventListener("click", (e) => { const o = e.target.closest("[data-open]"); if (o) openDetail(o.dataset.open); });
  $("searchbtn").onclick = openSearch;
  document.addEventListener("keydown", (e) => {
    if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) { e.preventDefault(); openSearch(); }
  });

  // ---------- comparateur ----------
  function renderCmp() {
    $("cmp-add").innerHTML = `<option value="">${T.ui.cmpAdd}</option>` + ["blade", "edge"].map((k) => `<optgroup label="${T.kindsPl[k]}">${pool(k).filter((i) => !cmp.includes(i.id)).map((i) => `<option value="${i.id}">${esc(i.name)}</option>`).join("")}</optgroup>`).join("");
    $("cmp-add").disabled = cmp.length >= 4;
    const items = cmp.map((id) => byId[id]);
    if (!items.length) { $("cmp").innerHTML = `<p class="trust" style="padding:16px">${T.ui.cmpEmpty}</p>`; return; }
    const val = (it, k) => STATS.includes(k) ? it.stats[lvl][k] : it.extra && it.extra[k] ? it.extra[k][lvl === "base" ? 0 : 1] : null;
    const keys = ["score", ...STATS, ...new Set(items.flatMap((i) => Object.keys(i.extra || {})))];
    const get = (it, k) => (k === "score" ? score(it, lvl) : val(it, k));
    const rows = keys.filter((k) => items.some((i) => get(i, k) != null)).map((k) => {
      const vs = items.map((i) => get(i, k)), mx = Math.max(...vs.filter((v) => v != null), 1), win = vs.filter((v) => v != null).length > 1 ? mx : null;
      const c = k === "score" ? "c-extra" : STATS.includes(k) ? `c-${k}` : "c-extra";
      return `<div class="cmp-row"><div>${k === "score" ? T.ui.tierScore : T.stats[k] || k}</div>${vs.map((v) => `<div class="cell ${c}${v != null && v === win ? " win" : ""}"><span class="num">${fmt(v)}</span><i><b style="width:${v == null ? 0 : Math.round(100 * v / mx)}%"></b></i></div>`).join("")}</div>`;
    }).join("");
    $("cmp").style.setProperty("--n", items.length);
    $("cmp").innerHTML = `<div class="cmp-head"><div><div class="seg" data-lvl-seg></div></div>${items.map((it) => `<div class="w">${glyph(it)}<span class="nm">${esc(it.name)}</span><span class="trust">${T.types[it.type]}</span><button type="button" class="x" data-rm="${it.id}">✕ ${T.ui.close.toLowerCase()}</button></div>`).join("")}</div>${rows}`;
    renderLvl();
  }
  $("cmp-add").addEventListener("change", (e) => { if (e.target.value) { cmp = [...cmp, e.target.value].slice(0, 4); renderCmp(); sync(); } });
  $("cmp").addEventListener("click", (e) => { const r = e.target.closest("[data-rm]"); if (r) { cmp = cmp.filter((x) => x !== r.dataset.rm); renderCmp(); sync(); } });

  // ---------- tier list ----------
  function renderTiers() {
    const k = $("tierlist").dataset.kind || "blade";
    $("t-kind").innerHTML = ["blade", "edge"].map((x) => `<button type="button" data-tk="${x}" aria-pressed="${x === k}">${T.kindsPl[x]}</button>`).join("");
    const items = pool(k), groups = { S: [], A: [], B: [], C: [], D: [] }, un = [];
    items.forEach((i) => { const t = tierFor(i, lvl); (t ? groups[t] : un).push(i); });
    const pill = (i) => `<button type="button" class="tpill" data-id="${i.id}">${glyph(i)}${esc(i.name)} <span class="num trust">${score(i, lvl) ?? ""}</span></button>`;
    $("tierlist").innerHTML = Object.entries(groups).filter(([, a]) => a.length).map(([t, a]) =>
      `<div class="tierrow t-${t}"><div class="t"><span class="tbadge t-${t}">${t}</span></div><div class="items">${a.sort((x, y) => score(y, lvl) - score(x, lvl)).map(pill).join("")}</div></div>`).join("") +
      (un.length ? `<div class="tierrow t-D"><div class="t"><span class="tbadge t-D">?</span></div><div class="items"><small class="trust" style="width:100%">${T.ui.unranked}</small>${un.map(pill).join("")}</div></div>` : "");
  }
  $("t-kind").addEventListener("click", (e) => { const b = e.target.closest("[data-tk]"); if (b) { $("tierlist").dataset.kind = b.dataset.tk; renderTiers(); } });
  $("tierlist").addEventListener("click", (e) => { const b = e.target.closest("[data-id]"); if (b) openDetail(b.dataset.id); });

  // ---------- rendu ----------
  function sync() { history.replaceState(null, "", hash()); }
  function renderAll() {
    renderLvl(); renderBuild(); renderList(); renderCmp(); renderTiers(); sync();
    if (dlg.open && dlg.dataset.id) openDetail(dlg.dataset.id);
  }
  window.addEventListener("hashchange", () => { readHash(); renderAll(); });
  renderFilters(); renderAll();
})();
