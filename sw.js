const CACHE_NAME = "ezan-vakti-v3";

const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon.svg"
];

/* Kurulum */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

/* Aktivasyon */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* İnternet varsa günceli al, yoksa önbellekten göster */
self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {

        const copy = response.clone();

        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, copy);
          });

        return response;
      })
      .catch(() =>
        caches.match(event.request)
      )
  );

});

/* Eski Service Worker güncellemesini zorla */
self.addEventListener("message", event => {

  if (
    event.data &&
    event.data.type === "SKIP_WAITING"
  ) {
    self.skipWaiting();
  }

});
