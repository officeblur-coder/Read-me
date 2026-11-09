// Service worker minimal: face site-ul instalabil ca aplicație. Nu păstrează nimic în cache (actualizările apar imediat);
// doar când nu e internet arată o pagină simplă în loc de eroarea browserului.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lyra\'s Delivery</title>' +
    '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0806;color:#fff7ef;font-family:system-ui;text-align:center;padding:24px">' +
    '<div><h1 style="font-size:28px">Fără internet</h1><p style="color:#c9b6a5">Verifică conexiunea și încearcă din nou.</p>' +
    '<button onclick="location.reload()" style="margin-top:12px;padding:14px 26px;border:0;border-radius:999px;background:#ff7a1a;color:#fff;font-weight:700;font-size:16px">Reîncearcă</button></div></body>',
    { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});

// Notificări (Web Push): „Restaurantul propune 40 minute”, „Curierul e pe drum”, „Comandă nouă” la recepție
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Lyra's Delivery", {
    body: d.body || "", tag: d.tag || undefined, renotify: !!d.tag, data: { url: d.url || "/" },
    icon: "/icons/icon-192.png", badge: "/icons/favicon-48.png", vibrate: [200, 100, 200],
  }));
});
// apăsarea pe notificare deschide pagina comenzii (sau aduce în față fereastra deja deschisă)
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    const same = list.find(c => c.url === url) || list.find(c => new URL(c.url).origin === self.location.origin);
    if (same) return same.focus().then(c => c && c.url !== url && "navigate" in c ? c.navigate(url) : c);
    return self.clients.openWindow(url);
  }));
});
