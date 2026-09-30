/* public/sw-portal.js – Service Worker des ÖkoInvest-Portals (Scope /portal)
 *
 * Grundsatz: KEINE vertraulichen Daten im Cache. Zwischengespeichert wird nur eine statische
 * Offline-Seite (ohne Nutzerdaten) samt Icons. Portalseiten und APIs gehen immer ans Netz
 * (Portal sendet Cache-Control: no-store); nur wenn eine Seitennavigation offline scheitert,
 * zeigt der Worker die Offline-Seite. API-Aufrufe, Uploads, Downloads werden nie angefasst.
 */
const VERSION = "oi-portal-shell-v1";
const SHELL = ["/portal-offline.html", "/icon.svg", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload", credentials: "omit" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("oi-portal-") && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Statische Shell-Dateien: aus dem Cache (sind öffentlich und ohne Nutzerbezug)
  if (SHELL.includes(url.pathname)) {
    event.respondWith(caches.match(url.pathname).then((r) => r || fetch(req)));
    return;
  }

  // Nur Seitennavigationen im Portal: immer Netz, offline → statische Offline-Seite
  if (req.mode === "navigate" && url.pathname.startsWith("/portal")) {
    event.respondWith(
      fetch(req).catch(async () => (await caches.match("/portal-offline.html")) || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }))
    );
  }
  // alles andere (APIs, Next-Chunks, Dokumente): unberührt → Browser/Netz
});
