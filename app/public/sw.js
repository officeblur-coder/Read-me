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
