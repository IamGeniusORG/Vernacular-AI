# System Architecture

## 1. System Topology
The application follows a decoupled, stateless client-server architecture to ensure high performance on low-bandwidth rural networks. 
*   **Frontend (Client):** Next.js (React) web application.
*   **Backend (API/Orchestrator):** Python (FastAPI).
*   **AI Engine:** Google Gemini API (routed via OpenRouter).
*   **Database:** PostgreSQL (hosted on Supabase or Neon).

## 2. Tech Stack
*   **UI/UX:** Next.js (App Router), Tailwind CSS, Lucide Icons.
*   **Backend:** Python 3.11+, FastAPI, Uvicorn, Pydantic, SQLAlchemy/asyncpg.
*   **External APIs:** OpenRouter (Gemini Multimodal for Vision + Audio/Text processing).

## 3. Cloud Deployment
*   **Frontend:** Vercel (CI/CD via GitHub).
*   **Backend:** Render or Railway (Free/Hobby tier for pilot).
*   **Database:** Supabase/Neon (PostgreSQL).

## 4. Service Communication
1.  **Next.js -> FastAPI:** REST over HTTPS. Next.js POSTs FormData (Image Blob + Audio Blob) to a FastAPI `/api/v1/generate-listing` endpoint.
2.  **FastAPI -> OpenRouter:** Secure API calls injecting the media as base64 or temporary signed URLs along with a strict JSON-schema prompt.
3.  **FastAPI -> PostgreSQL:** Async SQL queries to `INSERT` into the `products` and `artisans` tables.
