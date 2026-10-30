/**
 * Next.js Server-Side Instrumentation
 * 
 * Runs once upon Node.js server boot on Render.
 * Sends outbound keep-alive pings every 5 minutes to keep both the
 * FastAPI backend and the Next.js storefront active on Render's edge proxy,
 * eliminating the 15-minute free-tier spin-down.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const BACKEND_URL =
      process.env.NEXT_PUBLIC_API_URL || "https://vernacular-ai-mw9i.onrender.com";
    const FRONTEND_URL =
      process.env.NEXT_PUBLIC_SITE_URL || "https://vernacular-storefront.onrender.com";

    const ping = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);

        await Promise.allSettled([
          fetch(`${BACKEND_URL}/health`, {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch(`${FRONTEND_URL}/health`, {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);

        clearTimeout(timeout);
      } catch {
        // Silently ignore ping errors
      }
    };

    // Initial warmup 5s after startup
    setTimeout(ping, 5000);

    // Keep-alive heartbeat every 5 minutes (300 seconds)
    setInterval(ping, 5 * 60 * 1000);
  }
}
