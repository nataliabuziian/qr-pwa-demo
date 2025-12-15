self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("qr-cache").then(cache =>
      cache.addAll([
        "./",
        "./index.html",
        "./scanner.js",
        "./manifest.json"
      ])
    )
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
