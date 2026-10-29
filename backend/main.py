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
    Self-ping background task to prevent Render free-tier idle spin-down.
    Runs every 9 minutes (well within Render's 15-minute sleep threshold).
    Pinging Render's external public URL hits Render's edge proxy, resetting
    the inactivity countdown timer.
    """
    # Wait 30 seconds after server startup before first ping
    await asyncio.sleep(30)

    # 1. Check explicit KEEP_ALIVE_URL env var
    # 2. Check RENDER_EXTERNAL_URL (automatically provided by Render runtime)
    target = os.getenv("KEEP_ALIVE_URL")
    if not target and os.getenv("RENDER_EXTERNAL_URL"):
        target = f"{os.getenv('RENDER_EXTERNAL_URL').rstrip('/')}/health"

    if not target and os.getenv("RENDER"):
        # Default production fallback on Render
        target = "https://vernacular-storefront.onrender.com/api/v1/health"

    keep_alive_stats["target_url"] = target

    if not target:
        print("[KeepAlive] Local development environment detected. Outbound self-pings skipped.")
        return

    print(f"[KeepAlive] Background worker active. Pinging {target} every 9 minutes to keep server awake.")

    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            try:
                res = await client.get(target)
                keep_alive_stats["pings_count"] += 1
                keep_alive_stats["last_ping_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
                keep_alive_stats["last_ping_status"] = res.status_code
                keep_alive_stats["last_error"] = None
                print(f"[KeepAlive] Ping #{keep_alive_stats['pings_count']} to {target} -> HTTP {res.status_code}")
            except Exception as e:
                keep_alive_stats["last_error"] = str(e)
                print(f"[KeepAlive] Ping attempt notice: {e}")

            # Sleep 9 minutes (540 seconds)
            await asyncio.sleep(540)

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

# CORS — allow all origins so Vercel preview/production domains and local dev are never blocked
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
