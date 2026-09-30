self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

/*
  Ezan Vakti bildirim altyapısı.
  Gerçek zamanlı push geldiğinde burada gösterilecek.
*/
self.addEventListener("push", event => {

  let data = {
    title: "Ezan Vakti",
    body: "Ezan vakti geldi.",
    icon: "/icon.svg"
  };

  try {
    if (event.data) {
      data = {
        ...data,
        ...event.data.json()
      };
    }
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(
      data.title,
      {
        body: data.body,
        icon: data.icon,
        badge: data.icon,
        vibrate: [200, 100, 200],
        data: {
          url: "/"
        }
      }
    )
  );
});

self.addEventListener("notificationclick", event => {

  event.notification.close();

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(list => {

      for (const client of list) {
        if ("focus" in client) {
          return client.focus();
        }
      }

      return clients.openWindow("/");
    })
  );
});
