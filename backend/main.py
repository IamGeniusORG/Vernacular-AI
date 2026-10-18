from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.products import router as products_router
from app.api.artisans import router as artisans_router

app = FastAPI(
    title="Vernacular AI E-Commerce API",
    description="Backend API for generating localized product listings from audio and images.",
    version="2.0.0"
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
@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}

app.include_router(products_router, prefix="/api/v1/products", tags=["Products"])
app.include_router(artisans_router, prefix="/api/v1/artisans", tags=["Artisans"])
