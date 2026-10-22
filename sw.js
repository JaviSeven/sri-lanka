/* Sri Lanka 2026: copia de la app para que abra sin conexión.
   Sirve lo guardado al instante y se actualiza por detrás; si hay versión nueva, la app avisa. */
const CACHE = "srilanka-v1";
const ARCHIVOS = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-512.png"];
const FUENTES = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (FUENTES.test(req.url)) {                                     // tipografías: se guardan la primera vez
    e.respondWith(caches.open(CACHE).then(async c => (await c.match(req)) || fetch(req).then(r => { c.put(req, r.clone()); return r; })));
    return;
  }
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;                      // tiempo y cambio van directos
  e.respondWith(caches.open(CACHE).then(async c => {
    const clave = req.mode === "navigate" ? "./index.html" : req;
    const guardado = await c.match(clave);
    const red = fetch(req).then(r => {
      if (r.ok && !r.redirected) {
        const firma = x => x && (x.headers.get("etag") || x.headers.get("last-modified"));
        if (req.mode === "navigate" && guardado && firma(r) && firma(r) !== firma(guardado))
          e.waitUntil(new Promise(ok => setTimeout(ok, 2500)).then(() => self.clients.matchAll({ type: "window" })).then(cs => cs.forEach(cl => cl.postMessage({ tipo: "nueva" }))));
        c.put(clave, r.clone());
      }
      return r;
    }).catch(() => guardado || c.match("./index.html"));
    return guardado || red;
  }));
});
