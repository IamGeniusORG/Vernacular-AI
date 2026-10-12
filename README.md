# Vernacular AI E-Commerce Enabler

[![Next.js](https://img.shields.io/badge/Next.js-16.3.8-black?style=flat&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%7C%20Auth%20%7C%20Storage-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-4285F4?style=flat&logo=google)](https://deepmind.google/technologies/gemini/)
[![Challenge](https://img.shields.io/badge/Competition-Seva%20Innovation%20Challenge-orange)](#)

An AI-powered, voice-first e-commerce enabler built for rural handloom weavers and artisans. This platform bridges digital literacy and linguistic divides, allowing artisans to generate a high-conversion digital boutique in seconds using only raw product photos and a voice note recorded in their native tongue (Bengali/Hindi)—bypassing all typing and complex e-commerce cataloging steps.

---

## 🌟 Key Highlights & Latest Upgrades

### 1. Dual-Role Google 1-Tap Authentication
* **Seamless OAuth Onboarding:** Instant sign-in via Google 1-Tap (`/login`) with persistent session management via Supabase Auth and Next.js SSR middleware.
* **Smart Intent Routing:** Interactive role selector (*"I want to shop"* vs. *"I am an artisan"*). Upon successful authentication, the server-side callback (`/auth/callback`) and client sync pipeline (`/auth/sync`) automatically update the artisan's profile role and direct them to their target workspace:
  * **Shoppers:** Routed directly to the **Discovery Marketplace** (`/shop`).
  * **Artisans:** Routed directly to their **AI Creation Studio** (`/studio`).
* **Resilient Fallback Sync:** Handles Google OAuth user metadata synchronization with Supabase PostgreSQL, bypassing RLS safely via backend service-role authorization.

### 2. Dedicated Discovery Marketplace (`/shop`)
* **Dedicated Marketplace Hub:** Full artisan directory and handloom discovery grid moved to `/shop` with intelligent auto-redirects from root (`/` ➔ `/shop`).
* **Real-Time Regional Search:** Instant client-side search filtering by artisan name, district, and regional craft heritage (Jamdani, Taant, Baluchari, Khadi, Silk).
* **Responsive Visual Cards:** Rich artisan profile cards with heritage tags and quick direct links to individual looms.

### 3. Voice-Driven Zero-Typing Studio (`/studio`)
* **Multimodal AI Pipeline:** Artisans upload up to 8 photos and record a voice description in their native tongue.
* **Gemini 2.5 Flash Engine:** Transcribes vernacular audio and analyzes garment photos to synthesize:
  * English & Localized (Bengali/Hindi) product titles and descriptions.
  * Curated craft tags (fabric weave, motif, occasion).
  * Automated price estimation (INR) based on craft complexity.
* **Instant WhatsApp Storefront Link & QR Generator:** Compact, scannable QR code generator and one-click store URL copying for physical pop-ups, packaging, and exhibitions.

### 4. Bespoke Artisan Storefronts (`/shop/[artisan_id]`)
* **Editorial Masterpiece Showcase:** Highlighting the artisan's signature loom piece alongside vernacular audio narration (*"Voice of the Weaver"*).
* **Boutique Collection Grid:** Full catalog of handloom products with vernacular script titles and price badges.
* **Zero-Commission WhatsApp Commerce:** Buyers click *"Buy on WhatsApp"* to launch a direct chat with the artisan, pre-filled with the product title, price, and storefront link—ensuring 100% of proceeds stay with the weaver.

### 5. Native-Grade Mobile UI & Vernacular Typography
* **Indic Typography Spacing:** Configured with relaxed line-heights (`leading-normal md:leading-relaxed`) to eliminate vertical truncation of Bengali and Hindi diacritics (*matras*) and complex conjuncts.
* **Thumb-Friendly Touch Targets:** Accessible Back navigation buttons (`44px+` hit areas with `touch-manipulation`).
* **Safe-Area Layouts:** Mobile-optimized Profile Drawer with safe-area padding (`pb-9 sm:pb-8`) to prevent UI clashes with iOS and Android navigation gestures.

---

## 🏗 System Architecture

```
                   ┌───────────────────────────────────────┐
                   │           Buyer / Artisan             │
                   └──────────────────┬────────────────────┘
                                      │
                         HTTPS / Mobile Web Viewport
                                      │
                   ┌──────────────────▼────────────────────┐
                   │          Next.js 16 Frontend          │
                   │        App Router + Tailwind CSS      │
                   ├───────────────────────────────────────┤
                   │  /shop                 (Marketplace)  │
                   │  /shop/[artisan_id]    (Storefront)   │
                   │  /studio               (Studio/Voice) │
                   │  /login & /auth/sync   (Google OAuth) │
                   └───────────┬───────────────┬───────────┘
                               │               │
                    OAuth / RLS│               │ REST API / Multipart
                               ▼               ▼
        ┌────────────────────────────┐   ┌───────────────────────────┐
        │       Supabase Cloud       │   │      FastAPI Backend      │
        ├────────────────────────────┤   ├───────────────────────────┤
        │ • Auth (Google 1-Tap)      │   │ • Product Generation API  │
        │ • PostgreSQL (Artisans/DB) │◄──┤ • Artisan Profile Service │
        │ • Storage (Image/Audio CDN)│   │ • Storage Upload Manager  │
        └────────────────────────────┘   └─────────────┬─────────────┘
                                                       │
                                            Multimodal Prompting
                                                       ▼
                                         ┌───────────────────────────┐
                                         │   Google Gemini 2.5 Flash │
                                         │     (via OpenRouter)      │
                                         └───────────────────────────┘
```

---

## 📂 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── artisans.py          # Artisan registration, query & profile PATCH
│   │   │   └── products.py          # Multi-image & voice catalog generation endpoint
│   │   ├── core/
│   │   │   ├── config.py            # Pydantic environment settings
│   │   │   └── supabase_client.py   # Supabase client initialized with SERVICE_KEY
│   │   ├── schemas/
│   │   │   └── product.py           # Product and artisan schema definitions
│   │   └── services/
│   │       ├── ai_service.py        # Gemini 2.5 Flash multimodal voice & image pipeline
│   │       └── storage_service.py   # Supabase bucket asset uploader
│   ├── main.py                      # FastAPI application entrypoint with CORS
│   ├── auth_trigger.sql             # SQL trigger for auth.users -> public.artisans
│   ├── schema.sql                   # Database table definitions
│   └── requirements.txt             # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/
│   │   │   │   ├── callback/        # Next.js OAuth code exchange handler
│   │   │   │   └── sync/            # Role synchronization & intent router
│   │   │   ├── login/               # Dual-role Google 1-Tap sign-in interface
│   │   │   ├── shop/
│   │   │   │   ├── page.tsx         # Discovery Marketplace SSR entrypoint
│   │   │   │   └── [artisan_id]/    # Dynamic artisan boutique storefront
│   │   │   ├── studio/              # Artisan camera & voice upload studio
│   │   │   ├── ShopDirectoryClient  # Client component for marketplace search & grid
│   │   │   ├── layout.tsx           # Root layout with fonts & context providers
│   │   │   └── page.tsx             # Root route (redirects to /shop)
│   │   ├── context/
│   │   │   ├── ArtisanContext.tsx   # Global session, role & profile state
│   │   │   └── LanguageContext.tsx  # Multi-language dictionary provider
│   │   └── utils/
│   │       └── supabase/            # Client, Server, and Middleware Supabase SDKs
│   └── package.json
└── README.md
```

---

## 🚀 Quickstart Guide

### Prerequisites
* **Node.js** (v18.18+ or v20+)
* **Python** (3.10+)
* **Supabase** account with a configured project

---

### 1. Database & Authentication Setup (Supabase)

1. Open your Supabase project's **SQL Editor**.
2. Run [`backend/schema.sql`](file:///C:/Users/IamTeddy/OneDrive/Desktop/IamGenius/Seva%20Innovation%20Challenge%20Project/Vernacular%20AI%20E-Commerce%20Enabler/backend/schema.sql) to initialize the `artisans` and `products` tables.
3. Run [`backend/auth_trigger.sql`](file:///C:/Users/IamTeddy/OneDrive/Desktop/IamGenius/Seva%20Innovation%20Challenge%20Project/Vernacular%20AI%20E-Commerce%20Enabler/backend/auth_trigger.sql) to establish the automated trigger that creates an artisan record upon user sign-up.
4. Navigate to **Storage** in the Supabase dashboard and create a public bucket:
   * **Bucket Name:** `product-images`
   * **Public:** `ON`
5. Navigate to **Authentication > Providers > Google** and enable Google OAuth.
   * Add `http://localhost:3000/auth/callback` to your Supabase **Redirect URLs**.

---

### 2. Backend Setup (FastAPI)

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```env
OPENROUTER_API_KEY=your_openrouter_or_gemini_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
SUPABASE_BUCKET=product-images
```

Start the FastAPI development server:

```bash
uvicorn main:app --reload --port 8000
```
API docs will be available at: `http://127.0.0.1:8000/docs`.

---

### 3. Frontend Setup (Next.js 16)

```bash
cd frontend

# Install dependencies
npm install
```

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Start the frontend development server:

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 📱 User Flows

### Artisan Flow
1. Navigate to `/login` and select **"I am an artisan"**.
2. Click **Sign in with Google**; the system establishes your account and directs you to `/studio`.
3. In the studio, snap/upload product photos and record an audio snippet explaining the craft in your native language.
4. Gemini AI analyzes the photos and voice note, extracts the craft details, and publishes the listing.
5. Share your boutique via WhatsApp or download your personalized high-resolution store QR code.

### Shopper Flow
1. Visit `/shop` (or `/`) to browse verified handlooms across regional clusters.
2. Filter by artisan or craft type using the real-time search bar.
3. Open any artisan storefront (`/shop/[artisan_id]`) to view curated collections, listen to the weaver's voice narration, and click **"Buy on WhatsApp"** for zero-commission checkout.

---

## 🔒 Security & Performance Highlights

* **Service-Role Boundary:** Public clients interact using restricted anonymous tokens. High-privilege writes (such as automated profile provisioning and AI catalog insertions) execute server-side using the `SUPABASE_SERVICE_KEY`.
* **Zero Cold-Start Navigation:** Client routes leverage Next.js App Router streaming and cached SSR with `revalidate` fallbacks for instant page transitions.
* **Responsive Touch Targets:** Styled strictly following WCAG touch-target specifications for seamless thumb accessibility on mobile devices.

---

## 📄 License

Developed for the **Seva Innovation Challenge**. All rights reserved.
