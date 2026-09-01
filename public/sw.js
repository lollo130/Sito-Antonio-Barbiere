// Service worker minimo.
// REGOLA: si mette in cache SOLO il guscio statico dell'app.
// Prenotazioni, disponibilità e chiamate a Supabase vanno SEMPRE in rete:
// un calendario servito dalla cache mostra slot liberi che liberi non sono.

// Alzare questo numero a ogni modifica del guscio: al primo caricamento
// successivo le cache vecchie vengono cancellate (vedi 'activate').
const CACHE = 'salone-v2';

// manifest.json NON sta qui di proposito. Serviva dalla cache, e chi aveva
// già visitato il sito continuava a ricevere il manifest vecchio: installava
// l'app sbagliata, con il nome e la schermata d'avvio di prima. Il manifest
// va sempre chiesto alla rete.
const GUSCIO = ['/', '/index.html', '/offline.html'];

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

  // Manifest e collegamento dell'app Android: sempre dalla rete, così un
  // cambio di nome, icona o schermata d'avvio arriva subito a tutti.
  if (url.pathname === '/manifest.json' || url.pathname.startsWith('/.well-known/')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // Navigazione: rete prima, pagina offline come ultima spiaggia.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/offline.html')));
    return;
  }

  // Asset statici: cache prima. I nomi contengono un codice che cambia a
  // ogni pubblicazione, quindi non si rischia di servire roba vecchia.
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});
