/* Emplacements publicitaires. La configuration (client AdSense + ID de blocs) est injectée par build.py dans window.ADS. */
(function () {
  const A = window.ADS || {};
  const fr = document.documentElement.lang.startsWith("fr");
  document.querySelectorAll(".ad[data-ad]").forEach((el) => {
    const slot = (A.slots || {})[el.dataset.ad];
    if (A.client && slot) {
      el.classList.remove("ph");
      el.innerHTML = `<ins class="adsbygoogle" style="display:block" data-ad-client="${A.client}" data-ad-slot="${slot}" data-ad-format="${el.dataset.format || "auto"}" data-full-width-responsive="true"></ins>`;
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    } else if (A.client) {
      // AdSense actif sans ID de bloc : on laisse les annonces automatiques placer les pubs
      el.parentElement.classList.contains("ad-box") ? el.parentElement.remove() : el.remove();
    } else {
      el.textContent = fr ? "Emplacement publicitaire" : "Ad space";
    }
  });
})();
