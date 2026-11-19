/* Mathe Legends – Offline-Cache, Muster von Spell Legends (dl-v8) bzw. Word Legends (seit wl-v5).
   App-Dateien: mit Internet immer frisch vom Server (höchstens 2,5 s warten), ohne Internet aus dem Cache.
   Schrift von Google Fonts: einmal laden, dann aus dem Cache. */
const VERSION = 'ml-v3';   // wie VERSION in app.js – immer beide zusammen hochzählen
// Nur eigene Caches anfassen: Word, Geo und Spell Legends liegen auf derselben Adresse (chrisladner.github.io).
// Streng: gelöscht werden nur alte Versions-Caches „ml-v…“ (das Präfix „ml-“ gibt es woanders schon, z. B. „ml-bus-“).
const OWN = /^ml-v\d+$/;
const FONT_CACHE = 'ml-fonts';
const NET_WAIT = 2500;
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './aufgaben.js',
  './schularbeit.js',
  './legends-status.js',
  './legends-sync.js',
  './app.js',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  // cache: 'reload' – frisch vom Server, nicht aus dem Browser-Zwischenspeicher (sonst können alte Dateien hängen bleiben)
  event.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  // Die offene Seite merkt den Wechsel selbst (controllerchange in app.js) und lädt neu, sobald sie auf der
  // Startseite ist. Hier nie client.navigate() in waitUntil abwarten – das blockiert sich gegenseitig.
  event.waitUntil((async () => {
    const old = (await caches.keys()).filter(k => OWN.test(k) && k !== VERSION);
    await Promise.all(old.map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    let saved = Promise.resolve();
    const network = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
      if (res.ok) {
        const copy = res.clone();
        saved = caches.open(VERSION).then(c => c.put(req, copy));
      }
      return res;
    });
    // Kommt die Antwort erst nach der Wartezeit, wird der Cache trotzdem aufgefrischt
    event.waitUntil(network.then(() => saved).catch(() => {}));
    event.respondWith(freshOrCached(req, network));
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(async cache => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
        return res;
      })
    );
  }
});

async function freshOrCached(req, network) {
  const timeout = new Promise(resolve => setTimeout(resolve, NET_WAIT, null));
  const res = await Promise.race([network.catch(() => null), timeout]);
  if (res && res.ok) return res;
  const hit = await caches.match(req, { ignoreSearch: true })
    || (req.mode === 'navigate' && await caches.match('./index.html'));
  // nichts im Cache: auf das Netz warten
  return hit || res || network;
}
