from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.products import router as products_router
from app.api.artisans import router as artisans_router

app = FastAPI(
    title="Vernacular AI E-Commerce API",
    description="Backend API for generating localized product listings from audio and images.",
    version="2.0.0"
)

# CORS — allow local dev + Vercel production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",  # swap with your exact Vercel domain before deploy
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products_router, prefix="/api/v1/products", tags=["Products"])
app.include_router(artisans_router, prefix="/api/v1/artisans", tags=["Artisans"])

@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}
