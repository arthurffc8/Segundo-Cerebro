const CACHE_NAME = 'segundo-cerebro-v10';
const WIDGET_DATA_URL = './widgets/hoje-data.json';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/icon-mono-512.png',
  './icons/apple-touch-icon.png',
  './icons/badge-96.png',
  './icons/favicon-64.png',
  './widgets/hoje-template.json',
  './widgets/pendencias-template.json',
  './widgets/hoje-data.json',
  './classes/1.jpg',
  './classes/2.jpg',
  './classes/3.jpg',
  './classes/4.jpg',
  './classes/5.jpg',
  // CDN resources
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7.25.0/babel.min.js',
  'https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore-compat.js'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        // addAll falha inteiro se um único recurso falhar — cacheia um a um
        return Promise.all(ASSETS_TO_CACHE.map(u => cache.add(u).catch(err => console.log('[SW] skip', u, err))));
      })
      .catch(err => console.log('[SW] Cache error:', err))
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  // Firestore/Auth precisam sempre da rede — nunca servir do cache
  if (/googleapis\.com|firebaseio\.com|identitytoolkit/.test(url.hostname)) return;

  // Navegações (index.html?tab=…, share target) casam com o shell ignorando a query
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html', { ignoreSearch: true })
          .then(r => r || new Response('Offline', { status: 503 })))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Return cached response and update cache in background
          fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse);
              });
            }
          }).catch(() => {});
          return cachedResponse;
        }
        // Not in cache - fetch from network
        return fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
      .catch(() => {
        // Offline and not cached - return offline page or empty response
        if (event.request.destination === 'document') {
          return caches.match('./index.html', { ignoreSearch: true });
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      })
  );
});

// ── NOTIFICAÇÕES ────────────────────────────────────────────────────────────

// Clique numa notificação: foca a janela existente (e troca de aba) ou abre uma nova
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const tab = (event.notification.data && event.notification.data.tab) || 'tarefas';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      if ('focus' in client) {
        client.postMessage({ type: 'SC_NAVIGATE', tab });
        return client.focus();
      }
    }
    if (self.clients.openWindow) {
      return self.clients.openWindow('./index.html?tab=' + encodeURIComponent(tab));
    }
  })());
});

// Push (app fechado) — payload: {title, body, tab, tag, badge}
self.addEventListener('push', event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; }
  catch (e) { d = { body: event.data ? event.data.text() : '' }; }

  const title = d.title || '👑 Segundo Cérebro';
  event.waitUntil((async () => {
    await self.registration.showNotification(title, {
      body: d.body || '',
      icon: './icons/icon-192.png',
      badge: './icons/badge-96.png',
      tag: d.tag || 'sc-push',
      renotify: true,
      lang: 'pt-BR',
      vibrate: [80, 40, 80],
      data: { tab: d.tab || 'tarefas' }
    });
    if (typeof d.badge === 'number' && self.navigator && self.navigator.setAppBadge) {
      try { d.badge > 0 ? await self.navigator.setAppBadge(d.badge) : await self.navigator.clearAppBadge(); }
      catch (e) {}
    }
  })());
});

// ── WIDGET (Windows 11 · painel de widgets do Edge) ─────────────────────────

async function widgetPayload() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(WIDGET_DATA_URL);
    if (res) return await res.json();
  } catch (e) {}
  return { resumo: 'Abra o app para sincronizar', itens: [], vazio: 'Nada carregado ainda.' };
}

async function renderWidget(widget) {
  if (!widget || !widget.definition) return;
  try {
    const tmplRes = await fetch(widget.definition.msAcTemplate);
    const template = await tmplRes.text();
    const data = JSON.stringify(await widgetPayload());
    await self.widgets.updateByTag(widget.definition.tag, { template, data });
  } catch (e) { console.log('[SW] widget render error', e); }
}

async function renderAllWidgets() {
  if (!self.widgets) return;
  try {
    const list = await self.widgets.matchAll({ installable: true });
    for (const w of list) await renderWidget(w);
  } catch (e) {}
}

self.addEventListener('widgetinstall', event => {
  event.waitUntil(renderWidget(event.widget));
});
self.addEventListener('widgetresume', event => {
  event.waitUntil(renderWidget(event.widget));
});
self.addEventListener('widgetclick', event => {
  if (event.action === 'abrir-agenda' || event.action === 'abrir-pendencias') {
    event.waitUntil(self.clients.openWindow('./index.html?tab=tarefas'));
    return;
  }
  event.waitUntil(renderWidget(event.widget));
});
self.addEventListener('widgetuninstall', () => {});

// ── MENSAGENS DO APP ────────────────────────────────────────────────────────

self.addEventListener('message', event => {
  const d = event.data || {};
  if (d.type === 'SKIP_WAITING') { self.skipWaiting(); return; }

  // O app manda o snapshot de hoje; guardamos no cache e redesenhamos o widget
  if (d.type === 'SC_WIDGET_DATA' && d.payload) {
    event.waitUntil((async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(WIDGET_DATA_URL, new Response(JSON.stringify(d.payload), {
          headers: { 'Content-Type': 'application/json' }
        }));
      } catch (e) {}
      await renderAllWidgets();
    })());
  }
});
