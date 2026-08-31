// Service worker minimo.
// REGOLA: si mette in cache SOLO il guscio statico dell'app.
// Prenotazioni, disponibilità e chiamate a Supabase vanno SEMPRE in rete:
// un calendario servito dalla cache mostra slot liberi che liberi non sono.

const CACHE = 'salone-v1';
const GUSCIO = ['/', '/index.html', '/manifest.json', '/offline.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(GUSCIO)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((chiavi) =>
      Promise.all(chiavi.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Mai intercettare le API: dati sempre freschi.
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/') ||
    e.request.method !== 'GET'
  ) {
    return;
  }

  // Navigazione: rete prima, pagina offline come ultima spiaggia.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/offline.html')));
    return;
  }

  // Asset statici: cache prima.
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});
