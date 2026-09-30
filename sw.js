const CACHE_NAME = "ezan-vakti-v3";

const FILES_TO_CACHE = [
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
.then(cache => {
return cache.addAll(FILES_TO_CACHE);
})
.then(() => {
return self.skipWaiting();
})
);

});

/* Aktivasyon */
self.addEventListener("activate", event => {

event.waitUntil(
caches.keys()
.then(keys => {

    return Promise.all(
      keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );

  })
  .then(() => {
    return self.clients.claim();
  })

);

});

/* İnternet varsa günceli al, yoksa cache kullan */
self.addEventListener("fetch", event => {

const request = event.request;

if (request.method !== "GET") {
return;
}

/*

* API isteklerini cache'leme.
* Böylece ezan vakitleri her zaman
* güncel API'den alınır.
  */
  if (
  request.url.includes(
  "ezanvakti.imsakiyem.com/api"
  )
  ) {
  event.respondWith(
  fetch(request)
  .catch(() => {
  return new Response(
  JSON.stringify({
  error: "İnternet bağlantısı yok."
  }),
  {
  status: 503,
  headers: {
  "Content-Type":
  "application/json"
  }
  }
  );
  })
  );

return;

}

/*

* Site dosyaları:
* Önce cache, yoksa internet.
  */
  event.respondWith(

caches.match(request)
  .then(cachedResponse => {

    if (cachedResponse) {
      return cachedResponse;
    }

    return fetch(request)
      .then(response => {

        if (
          response &&
          response.status === 200 &&
          response.type === "basic"
        ) {

          const copy =
            response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(
                request,
                copy
              );
            });

        }

        return response;

      });

  })

);

});
