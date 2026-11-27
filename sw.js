/* ------------------------------------------------------------------
   sw.js — офлайн-кэш приложения (Service Worker).

   Зачем: приложению нужны зарубежные ресурсы (библиотека Firebase с gstatic.com,
   шрифты Google). Если у оператора они медленные или заблокированы (например,
   без VPN), страница не должна висеть. После ПЕРВОГО успешного открытия всё
   нужное сохраняется на устройстве, и дальше приложение запускается мгновенно
   и без интернета; изменения отправятся в облако, когда связь появится.

   Правила:
   • Страница (index.html) — сначала сеть (до 4 с), иначе копия с устройства.
   • Файлы приложения с ?v=… — из кэша (версия в адресе меняется при обновлении).
   • Библиотека Firebase и шрифты — из кэша, обновляются фоном.
   • Запросы к базе и входу (firestore.googleapis.com и т.п.) НЕ перехватываются.
   Номер версии ниже меняйте вместе с version.json (его проверяет автотест).
------------------------------------------------------------------ */
'use strict';

const VERSION = '2026-11-27c';
const SHELL = 'vip-shell-' + VERSION;      /* файлы приложения: меняются с каждой версией */
const EXT = 'vip-ext-v1';                  /* Firebase SDK и шрифты: живут между версиями */
const NAV_TIMEOUT = 4000;

const ASSETS = [
  'assets/logo.png', 'assets/logo-print.png', 'assets/logo-gold.png', 'assets/favicon.png',
  'assets/apple-touch-icon.png', 'assets/icon-192.png', 'assets/icon-512.png', 'manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    let urls = ASSETS.slice();
    try {
      const res = await fetch('index.html', { cache: 'reload' });
      if (res && res.ok) {
        const html = await res.clone().text();
        await cache.put(new Request('index.html'), res.clone());
        await cache.put(new Request('./'), res.clone());
        const re = /(?:href|src)="([^"#]+\.(?:css|js)(?:\?[^"]*)?)"/g;
        let m;
        while ((m = re.exec(html))) { if (!/^(?:[a-z]+:)?\/\//i.test(m[1])) urls.push(m[1]); }
      }
    } catch (e) { /* нет сети при установке — кэш наполнится при работе */ }
    await Promise.all(urls.map(u => cache.add(u).catch(() => { })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.indexOf('vip-shell-') === 0 && k !== SHELL).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

const timeout = ms => new Promise(res => setTimeout(res, ms));
const okish = r => r && (r.ok || r.type === 'opaque');

/* сначала сеть, но не дольше ms; потом — копия из кэша */
async function networkFirst(event, cacheName, key, ms, matchOpts) {
  const cache = await caches.open(cacheName);
  const net = fetch(event.request).then(res => {
    if (okish(res)) { cache.put(key || event.request, res.clone()).catch(() => { }); }
    return res;
  });
  event.waitUntil(net.catch(() => { }));
  const fromCache = async () => (await cache.match(key || event.request, matchOpts)) || null;
  return new Promise(resolve => {
    let done = false;
    const finish = r => { if (!done && r) { done = true; resolve(r); } };
    const t = setTimeout(async () => finish(await fromCache()), ms);
    net.then(r => { clearTimeout(t); finish(r); }, async () => {
      clearTimeout(t);
      const c = await fromCache();
      if (c) finish(c); else if (!done) { done = true; resolve(Response.error()); }
    });
  });
}

/* из кэша; если нет — из сети (и кладём в кэш) */
async function cacheFirst(event, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(event.request);
  if (hit) return hit;
  const res = await fetch(event.request);
  if (okish(res)) cache.put(event.request, res.clone()).catch(() => { });
  return res;
}

/* из кэша сразу, а свежую копию подтягиваем фоном */
async function staleWhileRevalidate(event, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(event.request);
  const net = fetch(event.request).then(res => {
    if (okish(res)) cache.put(event.request, res.clone()).catch(() => { });
    return res;
  });
  if (hit) { event.waitUntil(net.catch(() => { })); return hit; }
  return net;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* ---- свой сайт ---- */
  if (url.origin === self.location.origin) {
    const file = url.pathname.split('/').pop();
    if (file === 'sw.js' || file === 'version.json' || file === 'net-check.html') return;     /* всегда напрямую */
    if (req.mode === 'navigate') {
      event.respondWith(networkFirst(event, SHELL, req, NAV_TIMEOUT, { ignoreSearch: true })
        .then(r => (r && r.type !== 'error') ? r : caches.match('index.html').then(c => c || r)));
      return;
    }
    if (file === 'firebase-config.js') { event.respondWith(networkFirst(event, SHELL, null, 2500)); return; }
    if (url.searchParams.has('v')) { event.respondWith(cacheFirst(event, SHELL)); return; }
    event.respondWith(staleWhileRevalidate(event, SHELL));
    return;
  }

  /* ---- библиотека Firebase ---- */
  if (url.pathname.indexOf('/firebasejs/') >= 0) { event.respondWith(cacheFirst(event, EXT)); return; }

  /* ---- шрифты Google ---- */
  if (url.hostname === 'fonts.googleapis.com') { event.respondWith(staleWhileRevalidate(event, EXT)); return; }
  if (url.hostname === 'fonts.gstatic.com') { event.respondWith(cacheFirst(event, EXT)); return; }
  /* всё остальное (Firestore, вход и т.д.) — напрямую, без вмешательства */
});
