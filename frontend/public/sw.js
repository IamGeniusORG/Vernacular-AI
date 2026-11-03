// Vernacular AI Native Service Worker (v2)
// High-performance Stale-While-Revalidate & Offline Studio Caching Strategy

const CACHE_NAME = "vernacular-ai-v2";
const OFFLINE_URLS = [
  "/",
  "/shop",
  "/studio",
  "/manifest.json",
  "/favicon.ico",
  "/icon.png",
  "/logo.png",
  "/apple-icon.png",
];

// 1. Install & Pre-cache App Shell & Core Routes
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS).catch((err) => {
        console.warn("ServiceWorker pre-cache partial failure:", err);
      });
    })
  );
  self.skipWaiting();
});

// 2. Activate & Cleanup Stale Caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log(`[SW] Evicting legacy cache: ${name}`);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: Fast Stale-While-Revalidate (Instant Cache Return + Background Network Refresh)
function staleWhileRevalidate(request, fallbackKey) {
  return caches.open(CACHE_NAME).then((cache) => {
    return cache.match(request, { ignoreSearch: true }).then((cachedResponse) => {
      // Asynchronous background revalidation fetch (non-blocking)
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      // Instant cache hit: Return immediately, bypassing all network timeout delays
      if (cachedResponse) {
        return cachedResponse;
      }

      // Fallback cache hit (e.g. /studio shell for parameterized route)
      if (fallbackKey) {
        return cache.match(fallbackKey).then((fallbackResponse) => {
          if (fallbackResponse) {
            return fallbackResponse;
          }
          return fetchPromise;
        });
      }

      // Cache miss: Await network response
      return fetchPromise;
    });
  });
}

// 3. Fetch Interceptor
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass non-GET requests or backend/Supabase/PayPal API traffic
  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("paypal.com") ||
    url.hostname.includes("openrouter.ai")
  ) {
    return;
  }

  // ── Strategy A: Strict Cache-First for UI Media & Static Icons ──
  const isMediaAsset =
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|gif)$/i) ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/");

  if (isMediaAsset) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => new Response("", { status: 404, statusText: "Offline Media Not Found" }));
      })
    );
    return;
  }

  // ── Strategy B: Stale-While-Revalidate for Next.js Static Assets & Fonts ──
  const isNextStatic = url.pathname.startsWith("/_next/static/");
  const isFont =
    url.pathname.match(/\.(woff2|woff|ttf|otf|eot)$/i) ||
    url.hostname.includes("fonts.gstatic.com") ||
    url.hostname.includes("fonts.googleapis.com");

  if (isNextStatic || isFont) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // ── Strategy C: Stale-While-Revalidate for Studio & Navigation HTML Shells ──
  if (request.mode === "navigate") {
    const isStudio = url.pathname === "/studio" || url.pathname.startsWith("/studio");
    const fallback = isStudio ? "/studio" : "/";
    event.respondWith(staleWhileRevalidate(request, fallback));
    return;
  }

  // ── Strategy D: Default Stale-While-Revalidate for Other Web Resources ──
  event.respondWith(staleWhileRevalidate(request));
});
