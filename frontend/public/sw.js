// Vernacular AI Native Service Worker (v3)
// Immediate Client Claiming, Aggressive Pre-Caching & Resilient Offline Routing

const CACHE_NAME = "vernacular-ai-v3";
const URLS_TO_PRECACHE = [
  "/",
  "/shop",
  "/studio",
  "/profile",
  "/login",
  "/manifest.json",
  "/favicon.ico",
  "/icon.png",
  "/logo.png",
  "/apple-icon.png",
  "/B%20logo.png",
];

// 1. Install Event: Immediate skipWaiting & Aggressive Pre-caching
self.addEventListener("install", (event) => {
  // Force active service worker without waiting for tabs to close
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log("[SW] Aggressively pre-caching core routes and assets...");
      // Resilient individual caching: ensures all available routes are cached
      // even if one asset network request fails, preventing installation abort
      const precachePromises = URLS_TO_PRECACHE.map(async (url) => {
        try {
          const response = await fetch(url, { cache: "reload" });
          if (response && (response.status === 200 || response.type === "opaque")) {
            await cache.put(url, response);
          }
        } catch (err) {
          console.warn(`[SW] Pre-cache item skipped for ${url}:`, err);
        }
      });
      await Promise.all(precachePromises);
      console.log("[SW] Core routes successfully pre-cached.");
    })
  );
});

// 2. Activate Event: Immediate Client Claiming
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
    }).then(() => {
      // Take immediate control of all open pages on the very first visit
      console.log("[SW] Claiming all clients immediately.");
      return self.clients.claim();
    })
  );
});

// Helper: Fast Stale-While-Revalidate
function staleWhileRevalidate(request, fallbackKey) {
  return caches.open(CACHE_NAME).then((cache) => {
    return cache.match(request, { ignoreSearch: true }).then((cachedResponse) => {
      // Non-blocking background network revalidation
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      // Return cached version instantly if present
      if (cachedResponse) {
        return cachedResponse;
      }

      // Check fallback key (e.g. /studio shell)
      if (fallbackKey) {
        return cache.match(fallbackKey).then((fallbackResponse) => {
          if (fallbackResponse) {
            return fallbackResponse;
          }
          return fetchPromise;
        });
      }

      return fetchPromise;
    });
  });
}

// 3. Fetch Event Interceptor
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass non-GET requests or backend/Supabase/PayPal APIs
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

  // ── Strategy B: Next.js Static Assets & Fonts ──
  const isNextStatic = url.pathname.startsWith("/_next/static/");
  const isFont =
    url.pathname.match(/\.(woff2|woff|ttf|otf|eot)$/i) ||
    url.hostname.includes("fonts.gstatic.com") ||
    url.hostname.includes("fonts.googleapis.com");

  if (isNextStatic || isFont) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // ── Strategy C: Navigation Requests (Dynamic Caching for All Visited Pages) ──
  if (request.mode === "navigate") {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request, { ignoreSearch: true });

        // Background network fetch to dynamically cache every page the user visits
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
              cache.put(url.pathname, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(async () => {
            // When offline:
            if (cached) return cached;
            const pathCached = await cache.match(url.pathname);
            if (pathCached) return pathCached;

            // Fallback shells for main routes
            if (url.pathname.startsWith("/studio")) {
              return (await cache.match("/studio")) || (await cache.match("/"));
            }
            if (url.pathname.startsWith("/shop")) {
              return (await cache.match("/shop")) || (await cache.match("/"));
            }
            if (url.pathname.startsWith("/profile")) {
              return (await cache.match("/profile")) || (await cache.match("/"));
            }
            return (await cache.match("/")) || Response.error();
          });

        return cached || fetchPromise;
      })
    );
    return;
  }

  // ── Strategy D: Default Stale-While-Revalidate for Other Web Resources ──
  event.respondWith(staleWhileRevalidate(request));
});
