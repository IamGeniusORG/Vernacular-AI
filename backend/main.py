import sys
import os
import time
import asyncio
import datetime
from contextlib import asynccontextmanager
import httpx

# Ensure backend directory is in sys.path so 'app' is always resolvable
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.products import router as products_router
from app.api.artisans import router as artisans_router

start_time = time.time()
keep_alive_stats = {
    "target_url": None,
    "pings_count": 0,
    "last_ping_at": None,
    "last_ping_status": None,
    "last_error": None,
}

async def keep_alive_loop():
    """
    Mutual cross-service keep-alive task to prevent Render free-tier idle spin-down.
    Pings both the FastAPI backend and Next.js frontend every 5 minutes.
    Pinging Render's external public edge proxies resets the 15-minute inactivity timers.
    """
    # Wait 15 seconds after server startup before first ping
    await asyncio.sleep(15)

    backend_url = os.getenv("RENDER_EXTERNAL_URL", "https://vernacular-ai-mw9i.onrender.com").rstrip("/")
    frontend_url = os.getenv("FRONTEND_URL", "https://vernacular-storefront.onrender.com").rstrip("/")

    target_urls = [
        f"{backend_url}/health",
        f"{frontend_url}/health",
        f"{frontend_url}/api/health",
    ]

    keep_alive_stats["target_url"] = target_urls[0]
    keep_alive_stats["all_targets"] = target_urls

    print(f"[KeepAlive] Background worker active. Pinging {target_urls} every 5 minutes.")

    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            for url in target_urls:
                try:
                    res = await client.get(url)
                    keep_alive_stats["pings_count"] += 1
                    keep_alive_stats["last_ping_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
                    keep_alive_stats["last_ping_status"] = res.status_code
                    keep_alive_stats["last_error"] = None
                    print(f"[KeepAlive] Ping to {url} -> HTTP {res.status_code}")
                except Exception as e:
                    keep_alive_stats["last_error"] = str(e)
                    print(f"[KeepAlive] Ping notice for {url}: {e}")

            # Sleep 5 minutes (300 seconds) — well within Render's 15-minute idle threshold
            await asyncio.sleep(300)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background keep-alive task on server boot
    task = asyncio.create_task(keep_alive_loop())
    yield
    # Graceful shutdown
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="Vernacular AI E-Commerce API",
    description="Backend API for generating localized product listings from audio and images.",
    version="2.0.0",
    lifespan=lifespan
)

# Explicit CORS origins for production and local environments
frontend_env = os.getenv("FRONTEND_URL", "https://vernacular-storefront.onrender.com").rstrip("/")
raw_allowed = os.getenv("ALLOWED_ORIGINS", "")
default_origins = [
    "https://vernacular-storefront.onrender.com",
    "https://vernacular-ai-mw9i.onrender.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    frontend_env,
]
if raw_allowed:
    default_origins.extend([o.strip() for o in raw_allowed.split(",") if o.strip()])

allowed_origins = list(dict.fromkeys([o for o in default_origins if o]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)

# Keep-Alive & Health Check endpoints (placed at top for fast ping responses)
@app.get("/health")
@app.head("/health")
@app.get("/api/v1/health")
@app.head("/api/v1/health")
async def health_check():
    uptime = round(time.time() - start_time, 1)
    return {
        "status": "healthy",
        "service": "vernacular-ai-backend",
        "version": "2.0.0",
        "uptime_seconds": uptime,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "keep_alive": keep_alive_stats
    }

app.include_router(products_router, prefix="/api/v1/products", tags=["Products"])
app.include_router(artisans_router, prefix="/api/v1/artisans", tags=["Artisans"])
