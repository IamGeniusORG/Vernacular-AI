# Vernacular AI — Global Artisan Storefront

[![Live Demo](https://img.shields.io/badge/Live_Demo-vernacular--storefront.onrender.com-0070ba?style=for-the-badge)](https://vernacular-storefront.onrender.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.3.8-black?style=flat&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PayPal](https://img.shields.io/badge/PayPal-Developer%20Platform%20SDK-00457C?style=flat&logo=paypal)](https://developer.paypal.com/)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-4285F4?style=flat&logo=google)](https://deepmind.google/technologies/gemini/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%7C%20Auth%20%7C%20Storage-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable%20%7C%20Offline%20Mode-blue?style=flat&logo=pwa)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0+-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Seva First Innovation Challenge](https://img.shields.io/badge/Hackathon-Seva%20First%20Innovation%20Challenge-orange)](#)
[![PayPal AI Hackathon](https://img.shields.io/badge/Hackathon-PayPal%20AI%20Hackathon-003087)](#)

> **Empowering rural Indian weavers with voice-first multimodal AI, localized digital boutiques, 100% zero-commission domestic commerce, and global cross-border export powered by PayPal.**

---

## 💡 The Dual Hackathon Mission

India's traditional handloom sector sustains over **4.3 million weavers and artisans**, producing some of the world's finest hand-loomed textiles (Jamdani, Taant, Baluchari, Khadi, Tussar Silk). Despite their exceptional craftsmanship, over **80% of artisans remain excluded from digital and global commerce** due to:
1. **Linguistic & Literacy Barriers:** Mainstream platforms (Amazon, Etsy, Shopify) require English fluency, complex SKU spreadsheets, and manual text copywriting.
2. **Predatory Middlemen:** Aggregators and regional intermediaries take 30%–50% cuts, keeping rural weavers at subsistence income levels.
3. **Cross-Border Export Friction:** International shoppers crave authentic heritage textiles, but rural artisans cannot manage currency conversion, international merchant accounts, or export cataloging.

### Submission Alignment

| Track | Hackathon Focus | How Our Solution Delivers |
|---|---|---|
| 🇮🇳 **Seva First Innovation Challenge** | Rural Empowerment & Digital Inclusion | **Zero-Typing Studio:** Artisans snap a photo and record a voice description in their native language (Bengali/Hindi). **0% Platform Cut:** 100% direct-to-weaver UPI QR payments and WhatsApp commerce ensure every single rupee goes directly to the weaver. |
| 🌍 **PayPal AI Hackathon** | Next-Gen AI & Global Cross-Border Commerce | **AI Global Pricing Engine:** Gemini 2.5 Flash analyzes weave complexity to generate fair domestic INR prices, premium USD export pricing (`price_usd`), and heritage storytelling (`export_description`). **PayPal React SDK:** International buyers checkout seamlessly with PayPal while artisans receive global funds straight to their linked PayPal account. |

---

## 🌟 Core Feature Suite

### 1. Multimodal Voice & Vision AI Cataloging (`/studio`)
* **Zero-Typing Camera Studio:** Artisans snap a photo of their handloom textile and speak naturally in their native dialect (Bengali, Hindi, or English).
* **Google Gemini 2.5 Flash Multimodal Engine:** Simultaneously inspects the garment photograph and spoken audio waveform to synthesize:
  * Bilingual titles and descriptions (English + native Bengali/Hindi script).
  * Automated craft classification (weave technique, fabric, regional motif).
  * Fair domestic market valuation range in INR (`suggested_price_range`).
  * International boutique USD valuation (`suggested_usd_price`) and heritage narrative (`export_description`).
* **Supabase Media Storage CDN:** Automated compression and public delivery of product photos, weaver voice recordings, and profile assets.
* **Smart Edge Background Processing:** Background removal powered by lightweight `rembg-cpu` using `u2netp` (only ~4.7MB) with PIL compression and a 3.5s timeout circuit breaker, avoiding server memory exhaustion on restricted hosting environments.

### 2. Dual-Checkout Storefront UI (`/shop/[artisan_id]`)
* **Shipping Destination Toggle:** Shoppers choose their purchasing context:
  `[ 🇮🇳 Domestic (INR) ]  |  [ 🌍 International (USD) ]`
* **🇮🇳 Domestic Mode:**
  * Displays domestic INR price (`₹1,800`).
  * **Instant UPI Pay Modal (0% Fee):** Dynamically displays the artisan's real merchant QR code or synthesizes banking QR codes (`qrcode.react`) and mobile deep links (`upi://pay?pa=...`) launching GPay, PhonePe, Paytm, or BHIM.
  * **WhatsApp 1-Tap Commerce:** Direct WhatsApp conversation link with pre-filled item details and phone number normalization.
* **🌍 International Export Mode:**
  * Displays international USD price (`$45.00`) and the AI-generated heritage export narrative.
  * Hides domestic payment buttons.
  * Integrates the official `@paypal/react-paypal-js` SDK with lazy script loading (`deferLoading={destination !== "international"}`) for maximum page performance.
  * Captures orders into the artisan's linked `paypal_email` in the PayPal Sandbox environment.
* **Voice of the Weaver Audio Player:** Streams the artisan's original native voice note alongside the AI-translated text, establishing authenticity and emotional connection.
* **Masterpiece Showcase Carousel:** Randomized, infinitely sliding carousel highlighting the breadth of the weaver's portfolio.

### 3. Direct Patronage & "Tip the Artisan" Protocol
* **Direct Weaver Micro-Patronage:** Shoppers and cultural patrons can tip artisans directly from the public storefront and checkout modal with zero platform deduction.
* **Dual-Currency Support:**
  * **Domestic (INR):** Direct scan of the artisan's real UPI QR code or 1-tap mobile app launch (`upi://pay`). Enforces a strict minimum tip of ₹10 with an explicit badge and input validation.
  * **International (USD):** Secondary standalone PayPal `createOrder` integration utilizing `shipping_preference: "NO_SHIPPING"`, enabling friction-free tipping without requesting physical delivery addresses.
* **Patron Transparency Ledger:** Tips are logged to the Supabase `tips` table with patron names, currency, and payment method via `POST /api/v1/artisans/{artisan_id}/tip`.

### 4. Real Artisan Payment QR Code Integration
* **In-Studio Payment QR Upload:** Artisans upload screenshots of their personal PhonePe, Google Pay, Paytm, or BHIM QR codes in `/studio` (Branding Tab & Profile Drawer) with client-side canvas compression.
* **Supabase Storage Pipeline:** Uploads to the `artisan-assets` bucket and links directly to `qr_code_url` on the artisan profile.
* **Missing QR Fallback Protection:** If an artisan has not yet configured their QR or UPI ID, storefront actions display a polite toast notification (*"The artisan haven't added their payment QR yet. Try again later!"*) and provide a helpful pending notice card instead of rendering broken demo codes.

### 5. Artisan Profile & Storefront Branding Studio (`/studio`)
* **Dedicated "Profile & Branding" Tab:** Top-level navigation inside Studio allowing weavers to customize their identity without technical friction.
* **Client-Compressed Drag-and-Drop Uploaders:**
  * **Profile Avatar:** Square photo uploader with client canvas compression and a 2MB limit.
  * **Storefront Cover Banner:** 16:9 landscape banner uploader displaying at the top of their public storefront and marketplace cards.
  * **Payment QR Code:** Real merchant QR uploader with live preview and replacement options.
  * **Clean UPI ID:** Real UPI ID input without fake or hardcoded demo values.
* **Optimistic Directory Card Preview:** Live interactive preview card mirroring the public marketplace card that updates instantaneously as the weaver edits their profile.
* **Slide-Out Profile Drawer:** Slide-out drawer accessible from any page to update WhatsApp contact, domestic UPI ID, international PayPal email, and download high-resolution shop QR codes.

### 6. Conversational Voice Search with Gemini AI (`/shop`)
* **Voice-First Search Bar:** Buyers click the microphone icon to search using conversational natural language (e.g., *"Show me red silk sarees from Nadia"*).
* **Continuous Web Speech API:** Speech-to-text recognition with visual pulse feedback and automatic silence boundary detection.
* **Gemini 2.5 Flash Intent Extraction:** Backed by `POST /api/v1/products/search-intent`, which prompts Gemini to return strict JSON search parameters (`color`, `material`, `region`, `max_price`).
* **Reactive Directory Filtering:** Instant client-side filtering across the artisan catalog without full page refreshes.

### 7. PWA Offline Studio Mode & Auto-Sync (`/studio`)
* **Progressive Web App (PWA):** Native Web App Manifest (`manifest.json`) and Service Worker (`sw.js`) enabling installability on Android, iOS, and desktop.
* **1-Tap App Install Prompt:** Contextual install button in the Studio navigation bar.
* **Unified Mobile APK:** Compatible with lightweight Trusted Web Activity (TWA) / WebView APK wrappers distributed in GitHub Releases, ensuring automatic, zero-rebuild over-the-air updates.
* **IndexedDB Offline Queue (`idb-keyval`):** When rural artisans work with spotty cellular connectivity, draft photos and voice notes are stored safely in local browser storage.
* **Auto-Sync Manager:** Detects `navigator.onLine` and automatically flushes queued drafts to the FastAPI backend upon network restoration.

### 8. Visitor Telemetry & Analytics
* **Non-Blocking Telemetry:** Light-weight asynchronous view logging (`POST /api/v1/analytics/view`) recording traffic origin (Domestic vs. International).
* **Supabase Telemetry Ledger:** Stores aggregated visitor sessions in the `product_views` table for artisan performance insights.

### 9. Privacy, Compliance & Production Hardening
* **Multi-Lingual Cookie Consent:** Privacy-compliant cookie banner (`CookieConsent.tsx`) supporting English, Hindi, and Bengali with local state persistence.
* **Streamlined Onboarding Flow:** Fixed role-lock race conditions during Google 1-Tap OAuth sign-up, ensuring newly registered weavers transition directly into their active Studio dashboard without infinite setup loops.
* **PKCE OAuth Code Exchange:** Route Handler (`src/app/auth/callback/route.ts`) explicitly binds session cookies to outgoing `NextResponse.redirect` headers with reverse-proxy host resolution on Render.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Next.js 16 App Router & PWA)"]
        A["Shopper / Global Collector / Rural Artisan"] --> B["Responsive Web UI (Tailwind CSS 4)"]
        B --> C["/shop (Discovery Marketplace & Gemini Voice Search)"]
        B --> D["/shop/:artisan_id (Storefront, Real UPI QR, PayPal & Tips)"]
        B --> E["/studio (Multimodal AI Studio, Catalog & Branding)"]
        B --> F["/login & /auth/sync (Google OAuth & Session Sync)"]
        E -. Offline Mode .-> SW["Service Worker & IndexedDB Queue (idb-keyval)"]
        SW -. Auto-Sync on Reconnect .-> G
    end

    subgraph Payments ["Dual-Commerce & Patronage Layer"]
        D -- Domestic Purchase (0% Fee) --> P1["Direct Merchant UPI QR & WhatsApp"]
        D -- International Export --> P2["PayPal React SDK (Standard Purchase)"]
        D -- Direct Tip / Patronage --> P3["Tip Weaver (UPI QR / PayPal NO_SHIPPING)"]
    end

    subgraph Backend ["Backend API Layer (FastAPI)"]
        G["FastAPI Server (Uvicorn)"]
        G --> H["/api/v1/products/generate (Multimodal Gemini AI)"]
        G --> I["/api/v1/products/search-intent (Voice Query to JSON Filters)"]
        G --> J["/api/v1/artisans (Directory & Profile Sync)"]
        G --> K["/api/v1/artisans/:id/upload-asset (Avatar, Banner & QR Code)"]
        G --> L["/api/v1/artisans/:id/tip (Micro-Patronage Logging)"]
        G --> M["/api/v1/analytics/view (Non-Blocking Telemetry)"]
        G --> N["/api/v1/health (Keep-Alive Health Check)"]
    end

    subgraph Cloud ["Cloud, AI & Database Infrastructure"]
        O["Supabase Auth (Google OAuth 2.0 with SSR Cookies)"]
        P["Supabase PostgreSQL (artisans, products, tips, product_views)"]
        Q["Supabase Storage CDN (product-images, product-audio, artisan-assets)"]
        R["Google Gemini 2.5 Flash (via OpenRouter API)"]
        S["PayPal Developer Platform (Sandbox APIs)"]
    end

    C & D & E & F <--> G
    C & D & E & F <--> O
    P2 & P3 <--> S
    G <--> P
    G <--> Q
    G <--> R
```

---

## 📁 Repository Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analytics.py         # Visitor telemetry & view analytics endpoint
│   │   │   ├── artisans.py          # Artisan registration, profile sync, QR uploads & tip logging
│   │   │   └── products.py          # Multimodal Gemini cataloging, voice search intent & pricing
│   │   ├── core/
│   │   │   ├── config.py            # Pydantic BaseSettings environment loader
│   │   │   └── supabase_client.py   # Service-role Supabase client
│   │   ├── schemas/
│   │   │   └── product.py           # Pydantic models with USD price & export description
│   │   └── services/
│   │       ├── ai_service.py        # Gemini 2.5 Flash prompt for dual-pricing & export narrative
│   │       └── storage_service.py   # Supabase Storage asset uploader & DB persister
│   ├── main.py                      # FastAPI entrypoint with regex CORS middleware
│   ├── schema.sql                   # Database schema (artisans, products, tips, product_views)
│   ├── auth_trigger.sql             # PostgreSQL trigger syncing auth.users to public.artisans
│   ├── requirements.txt             # Pinned backend dependencies
│   ├── .env.example                 # Environment template for backend
│   └── .gitignore                   # Backend-specific ignore rules
│
├── frontend/
│   ├── public/
│   │   ├── icons/                   # Valid 192x192 & 512x512 PWA icons
│   │   ├── manifest.json            # PWA manifest for mobile installability
│   │   └── sw.js                    # Native Service Worker for offline asset caching
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/
│   │   │   │   ├── callback/route.ts# SSR OAuth code exchange & Set-Cookie handler
│   │   │   │   └── sync/page.tsx    # Resilient OAuth session syncer & role router
│   │   │   ├── login/page.tsx       # Dynamic redirectTo Google 1-Tap sign-in interface
│   │   │   ├── shop/
│   │   │   │   ├── page.tsx         # Discovery Marketplace (force-dynamic, revalidate=0)
│   │   │   │   └── [artisan_id]/    # Storefront (Hero Banner, Real QR, PayPal & Tip modal)
│   │   │   ├── studio/page.tsx      # Multimodal AI studio, Offline Queue & Branding Studio
│   │   │   ├── ShopDirectoryClient  # Voice-first search bar with Gemini intent extraction
│   │   │   ├── layout.tsx           # Root layout with fonts, PWA meta & context providers
│   │   │   └── page.tsx             # Root route (redirects to /shop)
│   │   ├── components/
│   │   │   ├── ArtisanAvatar.tsx    # Deterministic hashed gradient avatar component
│   │   │   ├── CookieConsent.tsx    # Trilingual GDPR/ePrivacy compliant cookie notice
│   │   │   ├── Marquee.tsx          # Animated direct-to-weaver announcement ticker
│   │   │   ├── ProfileDrawer.tsx    # Slide-out drawer for branding, UPI, PayPal & QR
│   │   │   └── LanguageToggle.tsx   # Floating multi-lingual switcher (EN/HI/BN)
│   │   ├── context/
│   │   │   ├── ArtisanContext.tsx   # Global session, role, avatar, banner & QR state
│   │   │   ├── LanguageContext.tsx  # Multi-language dictionary provider
│   │   │   └── PreferencesContext.tsx# Domestic / International preference manager
│   │   ├── i18n/
│   │   │   └── dictionaries.ts      # English, Hindi, and Bengali localization strings
│   │   ├── lib/
│   │   │   ├── api.ts               # Strongly-typed TypeScript interfaces
│   │   │   └── uploadAsset.ts       # Canvas client compression & asset upload pipeline
│   │   └── utils/
│   │       └── supabase/            # Client, Server, and Middleware Supabase SSR SDKs
│   ├── next.config.mjs              # Next.js config with Supabase & Google image domains
│   ├── package.json                 # Dependencies (Next 16, @paypal/react-paypal-js, Tailwind 4, idb-keyval)
│   ├── .env.example                 # Environment template for frontend
│   └── .gitignore                   # Frontend-specific ignore rules
│
├── .gitignore                       # Master root gitignore
└── README.md                        # Master project documentation
```

---

## 🛠️ Step-by-Step Setup Guide

### Prerequisites
* **Node.js** (v18.18+ or v20+)
* **Python** (3.10+)
* **Supabase** account with an active project
* **PayPal Developer** account (for Sandbox Client ID)

---

### 1. Database & Supabase Configuration

1. In your Supabase project's **SQL Editor**, execute [`backend/schema.sql`](file:///C:/Users/IamTeddy/OneDrive/Desktop/IamGenius/Seva%20Innovation%20Challenge%20Project/Vernacular%20AI%20E-Commerce%20Enabler/backend/schema.sql):
   ```sql
   -- Provisions tables & columns:
   -- public.artisans (upi_id, qr_code_url, whatsapp_number, paypal_email, avatar_url, banner_url)
   -- public.products (price, price_usd, suggested_usd_price, export_description, tags)
   -- public.tips (artisan_id, amount, currency, payment_method, patron_name, order_id)
   -- public.product_views (artisan_id, country, viewed_at)
   ```
2. Execute [`backend/auth_trigger.sql`](file:///C:/Users/IamTeddy/OneDrive/Desktop/IamGenius/Seva%20Innovation%20Challenge%20Project/Vernacular%20AI%20E-Commerce%20Enabler/backend/auth_trigger.sql) to auto-provision profile rows on sign-up with Google avatar sync.
3. In **Storage**, ensure the following public buckets are created with public read access enabled:
   * `product-images` (garment photographs)
   * `product-audio` (spoken voice notes)
   * `artisan-assets` (custom profile avatars, cover banners, and merchant payment QR codes)
4. In **Authentication > Providers > Google**, enable Google OAuth and configure redirect URLs:
   * `http://localhost:3000/auth/callback` (Local development)
   * `https://vernacular-storefront.onrender.com/auth/callback` (Production)

---

### 2. Backend Setup (FastAPI)

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create `backend/.env` (referencing [`backend/.env.example`](file:///C:/Users/IamTeddy/OneDrive/Desktop/IamGenius/Seva%20Innovation%20Challenge%20Project/Vernacular%20AI%20E-Commerce%20Enabler/backend/.env.example)):
```env
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here
SUPABASE_BUCKET=product-images
```

Start the backend server:
```bash
uvicorn main:app --reload --port 8000
```
* Interactive API Documentation: `http://127.0.0.1:8000/docs`
* Health Check: `http://127.0.0.1:8000/api/v1/health`

---

### 3. Frontend Setup (Next.js 16)

```bash
cd frontend

# Install dependencies
npm install
```

Create `frontend/.env.local` (referencing [`frontend/.env.example`](file:///C:/Users/IamTeddy/OneDrive/Desktop/IamGenius/Seva%20Innovation%20Challenge%20Project/Vernacular%20AI%20E-Commerce%20Enabler/frontend/.env.example)):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_PAYPAL_CLIENT_ID=test
```

Start the frontend development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 4. Production Build & Lint Verification

Run the verification suite:
```bash
cd frontend
npm run lint
npm run build
```

Expected output:
```
✓ Compiled successfully
  Running TypeScript ...
  Finished TypeScript in ~2.7s
✓ Generating static pages using 11 workers (8/8)
Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /auth/callback
├ ○ /auth/sync
├ ○ /login
├ ƒ /shop
├ ƒ /shop/[artisan_id]
└ ○ /studio
```

---

## 🚀 Live Cloud Deployment (Render)

Both frontend and backend are live on [Render](https://render.com/):

| Service | Type | Live URL / Endpoint |
|---|---|---|
| **Public Storefront** | Next.js 16 (Node.js Web Service) | **`https://vernacular-storefront.onrender.com`** |
| **AI Catalog Engine** | FastAPI / Python (Web Service) | **`https://vernacular-storefront.onrender.com/api`** (or backend URL) |

### Environment Variables Matrix

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend & Backend | Supabase project API gateway |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend | Restricted anonymous key for client queries |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | High-privilege key for storage uploads and profile sync |
| `NEXT_PUBLIC_API_URL` | Frontend | Target URL for backend FastAPI service |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Frontend | PayPal Developer Sandbox / Live client identifier |
| `OPENROUTER_API_KEY` | Backend | Multimodal access token for Google Gemini 2.5 Flash |

---

## 🔒 Security & Git Hygiene Standards

* **Zero Hardcoded Credentials:** Supabase keys, Gemini/OpenRouter keys, and PayPal credentials are exclusively read from runtime environment variables.
* **Strict Git Hygiene:** All `.env`, `.env.local`, `.venv/`, `node_modules/`, and `.next/` directories are strictly excluded via `.gitignore`.
* **CORS Whitelist:** FastAPI backend allows local development (`localhost:3000`) and dynamically matches production domains.
* **Cookie Security & SSR Integrity:** Enforces `SameSite=Lax`, `Path=/`, and `Secure=true` on HTTPS domains, ensuring cookies are preserved across reverse proxies.
* **Service-Role Boundary:** Public clients interact using restricted anonymous tokens. High-privilege writes (such as automated profile provisioning and AI catalog insertions) execute server-side using the `SUPABASE_SERVICE_KEY`.

---

## 📊 Impact Matrix

| Dimension | Traditional Global E-Commerce (Etsy, Amazon) | Vernacular AI Enabler (Global Export Mode) |
|---|---|---|
| **Artisan Onboarding** | Days (tax IDs, English portals, SKU forms) | **< 60 seconds** (voice note + camera snap) |
| **Cataloging & Pricing** | Manual copywriting & currency conversion | **Automated Dual-Pricing** by Gemini 2.5 Flash (INR + USD) |
| **Profile & Store Branding** | Complex web builders & manual image tools | **In-App Drag-and-Drop Studio** with live card preview & real QR upload |
| **Platform Commission** | 20% to 45% (middlemen, fees, listing costs) | **0% Platform Fee** (100% direct to artisan) |
| **Direct Patronage / Tips** | None or high platform cut | **100% Zero-Cut Tipping** (UPI QR / PayPal `NO_SHIPPING`, min ₹10) |
| **Domestic Payments** | Delayed bank transfers (7–14 days) | **Instant Direct UPI QR** (PhonePe/GPay/Paytm with missing QR notice) |
| **Global Export Payments** | High barrier, unavailable for rural weavers | **Seamless PayPal React SDK** with sandbox USD payments |
| **Offline Village Resilience** | Requires continuous high-speed cellular data | **PWA + IndexedDB Queue** (auto-flushes to backend on reconnect) |
| **Linguistic Inclusion** | English only | **Trilingual Voice & UI** (Bengali, Hindi, English) |
| **Buyer Discovery & Search** | Manual keyword typing in English | **Conversational Voice Search** (Gemini AI strict JSON filtering) |
| **Cultural Provenance** | Generic mass-manufactured textile description | **Authentic Heritage Story** with audio snippet player |

---

## 📄 License & Attribution

Developed for the **Seva First Innovation Challenge** and the **PayPal AI Hackathon**. Dedicated to preserving and celebrating India's rich artisanal heritage on the global stage.
