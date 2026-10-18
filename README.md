# Vernacular AI — Global Artisan Storefront

[![Live Demo](https://img.shields.io/badge/Live_Demo-vernacular--storefront.onrender.com-0070ba?style=for-the-badge)](https://vernacular-storefront.onrender.com)

**Built for the Seva First Innovation Challenge & the PayPal AI Hackathon**

## 🌍 The Mission
India's rural handloom weavers create some of the most beautiful textiles in the world, yet they remain locked out of the digital economy by language, technological, and currency barriers. 

**Vernacular AI** is a dual-commerce, two-sided marketplace connecting rural artisans directly with buyers. By allowing weavers to build global storefronts using just photos and their native voice, we bridge the gap between offline rural heritage and global digital commerce.

## ✨ Key Features

### 🎙️ The Artisan Studio
* **Voice-to-Catalog AI:** Using Google Gemini's multimodal AI, weavers simply upload a photo and record a voice description in their native tongue (Bengali, Hindi, etc.). The AI instantly generates an SEO-optimized English catalog, a local INR price, and an export-markup USD price.
* **Native Script Localization:** A lightweight context dictionary translates the UI seamlessly between English, বাংলা, and हिन्दी without page reloads.
* **Frictionless Auth:** Google 1-Tap OAuth provides zero-cost, seamless login tailored perfectly for the Android-heavy rural demographic.

### 🛒 The Buyer Storefront
* **Voice of the Weaver:** A dedicated audio player streams the artisan's original voice recording alongside the AI-translated text, building immediate trust and emotional connection.
* **Masterpiece Carousel:** A randomized, infinitely sliding UI showcases the depth of the weaver's catalog.
* **Dual-Commerce Engine:**
  * **Local Mode (Seva First):** Buyers in India can check out via a dynamically generated zero-commission UPI QR code and a pre-filled WhatsApp order flow. 100% of the money goes directly to the weaver.
  * **Global Export Mode (PayPal):** International buyers can toggle the storefront to USD and securely check out using the integrated **PayPal React SDK**, instantly transforming the village weaver into a global exporter.

## 🏗️ System Architecture & Tech Stack
* **Frontend:** Next.js, TypeScript, Tailwind CSS (Deployed on Render)
* **Backend:** Python, FastAPI, Uvicorn (Deployed on Render with cron-job keep-alive)
* **AI Engine:** Google Gemini Multimodal API
* **Database & Auth:** Supabase (PostgreSQL, Authentication, Row Level Security, Storage Buckets)
* **Payments:** PayPal JavaScript SDK (Global), qrcode.react (Local UPI)

## 🚀 Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/IamGeniusORG/Vernacular-AI.git
cd Vernacular-AI
```

### 2. Frontend Setup (Next.js)
```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase keys, PayPal Sandbox Client ID, and Backend URL to .env.local

# Run the development server
npm run dev
```

### 3. Backend Setup (FastAPI)
```bash
# Navigate to the backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Add your Gemini API Key and Supabase Service Role Key to .env

# Run the API server
uvicorn main:app --reload --port 8000
```
