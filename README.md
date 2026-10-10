# Vernacular AI E-Commerce Enabler

An AI-powered e-commerce enabler built for rural artisans. This platform breaks down literacy and language barriers by allowing artisans to generate a complete digital storefront using only raw images and a voice note in their native language (Bengali).

Built for the **Seva Innovation Challenge**.

## 🚀 Features

* **Zero-Typing Catalog Generation:** Artisans upload images and a voice note; Gemini 2.5 Flash Multimodal AI generates professional bilingual titles, descriptions, and tags.
* **Premium Storefronts:** Beautiful, responsive, mobile-first storefronts designed to elevate the perceived value of handloom products.
* **Explore-First Authentication:** Passwordless Phone OTP login via Supabase Auth, allowing unauthenticated users to explore the catalog generation tool before signing up.
* **WhatsApp Commerce:** Zero-friction checkout—buyers contact the artisan directly on WhatsApp with a pre-filled, formatted purchase message and link.

## 🛠 Tech Stack

* **Frontend:** Next.js 16 (App Router), React, Tailwind CSS, Lucide Icons.
* **Backend:** FastAPI, Python, Pydantic.
* **AI:** Google Gemini 2.5 Flash (via OpenRouter) for batch multimodal processing.
* **Database & Auth:** Supabase PostgreSQL, Supabase Storage (CDN), and Supabase Auth (Phone OTP).

## 💻 Getting Started Locally

### Prerequisites
* Node.js v18+
* Python 3.10+
* A Supabase Project

### 1. Backend Setup (FastAPI)
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```
Create a `.env` file in the `backend` directory:
```env
OPENROUTER_API_KEY=your_openrouter_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
SUPABASE_BUCKET=product-images
```
Run the backend:
```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup (Next.js)
```bash
cd frontend
npm install
```
Create a `.env.local` file in the `frontend` directory:
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```
Run the frontend:
```bash
npm run dev
```

### 3. Database Setup
Execute the SQL found in `backend/schema.sql` and `backend/auth_trigger.sql` in your Supabase SQL Editor to configure the necessary tables and triggers.
