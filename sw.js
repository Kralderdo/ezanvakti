const CACHE_NAME = "ezan-vakti-v3";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache =>
        cache.addAll(APP_FILES)
      )
      .then(() =>
        self.skipWaiting()
      )
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key =>
              key !== CACHE_NAME
            )
            .map(key =>
              caches.delete(key)
            )
        )
      )
      .then(() =>
        self.clients.claim()
      )
  );
});

self.addEventListener("fetch", event => {
  const request =
    event.request;

  /*
   * API isteklerini cache'leme.
   * Böylece namaz vakitleri her zaman
   * güncel internet verisinden gelir.
   */
  if (
    request.url.includes(
      "api.turkiyeapi.dev"
    ) ||
    request.url.includes(
      "api.aladhan.com"
    )
  ) {
    event.respondWith(
      fetch(request)
        .catch(() =>
          caches.match(request)
        )
    );

    return;
  }

  /*
   * Site dosyalarında:
   * önce internet,
   * olmazsa cache.
   */
  event.respondWith(
    fetch(request)
      .then(response => {

        if (
          response &&
          response.status === 200 &&
          request.method === "GET"
        ) {
          const copy =
            response.clone();

          caches.open(
            CACHE_NAME
          ).then(cache => {
            cache.put(
              request,
              copy
            );
          });
        }

        return response;
      })
      .catch(() =>
        caches.match(request)
      )
  );
});

self.addEventListener(
  "notificationclick",
  event => {

    event.notification.close();

    event.waitUntil(
      clients.matchAll({
        type: "window",
        includeUncontrolled: true
      }).then(clientList => {

        for (
          const client of clientList
        ) {
          if (
            "focus" in client
          ) {
            return client.focus();
          }
        }

        if (
          clients.openWindow
        ) {
          return clients.openWindow(
            "./"
          );
        }
      })
    );
  }
);
