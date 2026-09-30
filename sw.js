const CACHE_NAME = "ezan-vakti-2027-v1";

const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon.svg"
];


/* =========================
   KURULUM
   ========================= */

self.addEventListener("install", event => {

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then(cache => {

        return cache.addAll(FILES);

      })
      .then(() => {

        return self.skipWaiting();

      })

  );

});


/* =========================
   AKTİVASYON
   ========================= */

self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys()
      .then(keys => {

        return Promise.all(

          keys
            .filter(key => {
              return key !== CACHE_NAME;
            })
            .map(key => {
              return caches.delete(key);
            })

        );

      })
      .then(() => {

        return self.clients.claim();

      })

  );

});


/* =========================
   İSTEKLER
   ========================= */

self.addEventListener("fetch", event => {

  const request = event.request;


  /*
   * Sadece GET isteklerini
   * Service Worker yönetsin.
   */

  if (
    request.method !== "GET"
  ) {

    return;

  }


  /*
   * NAMAZ VAKİTLERİ API
   *
   * API'yi cache'lemiyoruz.
   * Böylece gerçek ve güncel
   * vakitler alınır.
   */

  if (
    request.url.includes(
      "ezanvakti.imsakiyem.com/api"
    )
  ) {

    event.respondWith(

      fetch(request, {
        cache: "no-store"
      })

    );

    return;

  }


  /*
   * DİĞER DOSYALAR
   *
   * Önce internetten güncel dosyayı
   * almaya çalış.
   *
   * İnternet yoksa cache kullan.
   */

  event.respondWith(

    fetch(request)

      .then(response => {

        /*
         * Başarılı cevap geldiyse
         * cache'i güncelle.
         */

        if (
          response &&
          response.status === 200
        ) {

          const responseClone =
            response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {

              cache.put(
                request,
                responseClone
              );

            });

        }

        return response;

      })

      .catch(() => {

        /*
         * İnternet yoksa
         * kayıtlı dosyayı kullan.
         */

        return caches.match(request);

      })

  );

});
