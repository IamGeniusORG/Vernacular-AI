// Vernacular AI Native Service Worker (v8-phulia-refresh)
// Fail-Safe Architecture, Safe Timeout Resolution & Aggressive Cache Purging

const CACHE_NAME = "vernacular-v8-phulia-refresh";
const URLS_TO_PRECACHE = [
  "/",
  "/shop",
  "/studio",
  "/profile",
  "/login",
  "/offline",
  "/manifest.json",
  "/favicon.ico",
  "/icon.png",
  "/logo.png",
  "/apple-icon.png",
  "/B%20logo.png",
  "/assets/products/phulia_taant.jpg",
  "/placeholders/taant.jpg",
];

// Message Listener: Support on-demand skipWaiting from PWA update prompts
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("[SW] Received SKIP_WAITING signal. Activating new worker immediately...");
    self.skipWaiting();
  }
});

// 1. Install Event: Immediate skipWaiting & Aggressive Pre-caching
self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log("[SW] Aggressively pre-caching core routes and assets...");
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

// 2. Activate Event: Aggressive Purge of All Previous Caches & Immediate Client Claiming
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              console.log(`[SW] Emergency Purging outdated cache: ${name}`);
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => {
        console.log("[SW] All legacy caches evicted. Claiming clients immediately.");
        return self.clients.claim();
      })
  );
});

// Helper: Safe network fetch with timeout that NEVER rejects (resolves null on timeout/error)
function safeFetchWithTimeout(request, timeoutMs = 4000) {
  return new Promise((resolve) => {
    let completed = false;

    const timer = setTimeout(() => {
      if (!completed) {
        completed = true;
        console.warn(`[SW] Network fetch timed out after ${timeoutMs}ms for ${request.url}`);
        resolve(null);
      }
    }, timeoutMs);

    fetch(request)
      .then((response) => {
        if (!completed) {
          completed = true;
          clearTimeout(timer);
          resolve(response);
        }
      })
      .catch((err) => {
        if (!completed) {
          completed = true;
          clearTimeout(timer);
          console.warn(`[SW] Network fetch failed for ${request.url}:`, err.message || err);
          resolve(null);
        }
      });
  });
}

// Helper: Stale-While-Revalidate with Fail-Safe Network Fallback
function staleWhileRevalidate(request, fallbackKey) {
  return caches.open(CACHE_NAME).then((cache) => {
    return cache.match(request, { ignoreSearch: true }).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      if (cachedResponse) {
        return cachedResponse;
      }

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

// 3. Fetch Event Interceptor with Strict Top-Level Fail-Safe Try/Catch
self.addEventListener("fetch", (event) => {
  try {
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
        caches.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const clone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone).catch(() => {}));
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

    // ── Strategy C: Fail-Safe Navigation Requests (Timeout Never Rejects) ──
    if (request.mode === "navigate") {
      event.respondWith(
        (async () => {
          try {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match(request, { ignoreSearch: true });

            // Safe timeout fetch (resolves null on timeout/error, NEVER rejects)
            const networkResponse = await safeFetchWithTimeout(request, 4000);

            // Successful live response
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone()).catch(() => {});
              cache.put(url.pathname, networkResponse.clone()).catch(() => {});
              return networkResponse;
            }

            // Valid network redirect or status response
            if (networkResponse && networkResponse.type !== "error") {
              return networkResponse;
            }

            // Offline or server cold start: check cached page
            if (cached) return cached;
            const pathCached = await cache.match(url.pathname);
            if (pathCached) return pathCached;

            // Route-specific fallback shells
            if (url.pathname.startsWith("/studio")) {
              const studioShell = await cache.match("/studio");
              if (studioShell) return studioShell;
            }
            if (url.pathname.startsWith("/shop")) {
              const shopShell = await cache.match("/shop");
              if (shopShell) return shopShell;
            }
            if (url.pathname.startsWith("/profile")) {
              const profileShell = await cache.match("/profile");
              if (profileShell) return profileShell;
            }

            // Offline / waking-up fallback page
            const offlineFallback = await cache.match("/offline");
            if (offlineFallback) return offlineFallback;

            const rootFallback = await cache.match("/");
            if (rootFallback) return rootFallback;

            // Explicit resolution with 503 fallback HTML (NEVER Response.error()!)
            return new Response(
              '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline - Vernacular AI</title><style>body{font-family:system-ui,-apple-system,sans-serif;padding:2rem;text-align:center;background:#f8fafc;color:#0f172a;}h1{margin-top:2rem;}.btn{display:inline-block;margin-top:1.5rem;padding:0.75rem 1.5rem;background:#0f172a;color:#fff;text-decoration:none;border-radius:0.75rem;font-weight:bold;}</style></head><body><h1>Server Starting / Offline</h1><p>The artisan server is waking up or you are currently offline. Please wait a moment.</p><a href="/shop" class="btn">Reload Storefront</a><script>setTimeout(function(){window.location.reload();},5000);</script></body></html>',
              {
                status: 503,
                statusText: "Service Unavailable",
                headers: { "Content-Type": "text/html; charset=utf-8" },
              }
            );
          } catch (navError) {
            console.error("[SW] Navigation handler exception, falling back to direct network:", navError);
            return fetch(request).catch(
              () =>
                new Response(
                  '<!DOCTYPE html><html><body><h1>Offline</h1><p>Please check your connection and reload.</p><script>setTimeout(function(){window.location.reload();},5000);</script></body></html>',
                  { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
                )
            );
          }
        })()
      );
      return;
    }

    // ── Strategy D: Default Stale-While-Revalidate for Other Web Resources ──
    event.respondWith(staleWhileRevalidate(request));
  } catch (err) {
    console.error("[SW] Fatal exception in fetch event, falling back to network fetch:", err);
    event.respondWith(fetch(event.request));
  }
});
