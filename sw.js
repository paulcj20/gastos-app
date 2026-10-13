// Guarda la app para que abra sin conexión. Los gastos nunca pasan por acá:
// van directo a la planilla, y solo se interceptan los archivos de esta página.
const CACHE = 'gastos-v1';
const ARCHIVOS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()));
});

// Primero la red, para recibir actualizaciones; si no hay, la copia guardada.
self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== self.location.origin) return;
  evento.respondWith(
    fetch(pedido).then((respuesta) => {
      const copia = respuesta.clone();
      caches.open(CACHE).then((c) => c.put(pedido, copia));
      return respuesta;
    }).catch(() => caches.match(pedido, { ignoreSearch: true })));
});
