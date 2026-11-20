// Cloudflare Pages (mode avancé) : renvoie l'ancienne adresse et www vers le domaine principal.
const MAIN = "inkbuilds.com";
const OLD = new Set(["pbz-planner.pages.dev", "www.inkbuilds.com"]);
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Sitemap des anciennes adresses, pour que Google les réexplore vite et voie les redirections 301.
    if (url.hostname === "pbz-planner.pages.dev" && url.pathname === "/sitemap-old.xml") {
      const res = await env.ASSETS.fetch(new Request(new URL("/sitemap.xml", request.url)));
      const today = new Date().toISOString().slice(0, 10);
      const xml = (await res.text()).replaceAll("https://inkbuilds.com/", "https://pbz-planner.pages.dev/").replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${today}</lastmod>`);
      return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
    }
    if (OLD.has(url.hostname)) {
      url.hostname = MAIN;
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
