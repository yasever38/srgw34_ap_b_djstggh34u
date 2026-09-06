/* Service Worker для offline-работы PWA «Бюджет» */
const CACHE_NAME = "budget-v1";

// Основные файлы приложения, которые кэшируются при установке (app shell)
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

// При установке — сохраняем app shell в кэш
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// При активации — удаляем старые кэши и берём контроль над страницей сразу
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Стратегия «cache-first»: сначала берём из кэша, при промахе — из сети
// (включая CDN Chart.js, чтобы график работал и офлайн)
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === "basic" ||
            (response && response.status === 200 && event.request.url.indexOf("cdn.jsdelivr.net") !== -1)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => {
        // Полный офлайн без сети — отдаём главную страницу как fallback
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      });
    })
  );
});
