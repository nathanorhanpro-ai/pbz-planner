/* Filtre et recherche des astuces (accueil) */
(function () {
  const q = document.getElementById("tq"), feed = document.getElementById("tfeed");
  if (!q || !feed) return;
  const cards = [...feed.children], count = document.getElementById("tcount"), none = document.getElementById("tnone");
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  cards.forEach((c) => (c.dataset.n = norm(c.textContent)));
  let cat = "";
  function apply() {
    const words = norm(q.value).split(/\s+/).filter(Boolean); let n = 0;
    cards.forEach((c) => { const ok = (!cat || c.dataset.cat === cat) && words.every((w) => c.dataset.n.includes(w)); c.hidden = !ok; if (ok) n++; });
    count.textContent = n; none.hidden = n > 0;
  }
  q.addEventListener("input", apply);
  document.getElementById("tcats").addEventListener("click", (e) => {
    const b = e.target.closest("[data-c]"); if (!b) return;
    cat = b.dataset.c; document.querySelectorAll("#tcats [data-c]").forEach((x) => x.setAttribute("aria-pressed", x === b)); apply();
  });
})();
