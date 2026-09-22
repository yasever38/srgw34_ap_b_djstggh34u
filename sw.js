/* Service Worker для offline-работы PWA «Бюджет» */
const CACHE_NAME = "budget-v2";

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

// Навигация (сама страница index.html): «сеть сначала». Приложение будет
// обновляться годами — если отдавать HTML из кэша навсегда (как раньше),
// пользователь никогда не увидит новых версий, пока сам не почистит кэш.
// Пока есть интернет — всегда берём свежую версию и обновляем кэш; офлайн —
// откатываемся на последнюю сохранённую копию.
// Остальные файлы (иконки, манифест, Chart.js с CDN) меняются редко —
// для них оставляем «кэш сначала», экономим сеть.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const isNavigation = event.request.mode === "navigate" || event.request.url.endsWith("/index.html");
  if (isNavigation) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && (response.type === "basic" || event.request.url.indexOf("cdn.jsdelivr.net") !== -1)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => {});
    })
  );
});
