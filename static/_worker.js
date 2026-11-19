// Cloudflare Pages (mode avancé) : renvoie l'ancienne adresse et www vers le domaine principal.
const MAIN = "inkbuilds.com";
const OLD = new Set(["pbz-planner.pages.dev", "www.inkbuilds.com"]);
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (OLD.has(url.hostname)) {
      url.hostname = MAIN;
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
