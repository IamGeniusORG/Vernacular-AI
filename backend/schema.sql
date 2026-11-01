-- =============================================
-- Vernacular AI E-Commerce Enabler — Schema
-- Run this in the Supabase SQL Editor
-- =============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Artisans table
CREATE TABLE IF NOT EXISTS artisans (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number  TEXT UNIQUE NOT NULL,
    full_name     TEXT NOT NULL,
    district      TEXT,
    whatsapp_number TEXT,
    upi_id        TEXT,
    paypal_email  TEXT,
    avatar_url    TEXT,
    banner_url    TEXT,
    preferred_currency TEXT DEFAULT 'INR',
    preferred_language TEXT DEFAULT 'en',
    user_role     TEXT DEFAULT 'customer',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artisan_id      UUID NOT NULL REFERENCES artisans(id) ON DELETE CASCADE,
    image_url       TEXT NOT NULL,
    audio_url       TEXT,
    ai_title_en     TEXT,
    ai_title_local  TEXT,
    ai_desc_en      TEXT,
    ai_desc_local   TEXT,
    export_description TEXT,
    price_inr       INTEGER,
    price           INTEGER,
    price_usd       NUMERIC,
    suggested_price_range TEXT,
    suggested_usd_price NUMERIC,
    in_stock        BOOLEAN DEFAULT TRUE,
    tags            JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Column Migrations for Existing Tables (Safe to run in Supabase SQL editor):
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS paypal_email TEXT;
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS upi_id TEXT;
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'INR';
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_usd NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS suggested_usd_price NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS export_description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price INTEGER;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS in_stock BOOLEAN DEFAULT TRUE;

-- Ensure ON DELETE CASCADE constraints for clean account deletion
ALTER TABLE IF EXISTS public.products
    DROP CONSTRAINT IF EXISTS products_artisan_id_fkey,
    ADD CONSTRAINT products_artisan_id_fkey FOREIGN KEY (artisan_id) REFERENCES public.artisans(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.tips
    DROP CONSTRAINT IF EXISTS tips_artisan_id_fkey,
    ADD CONSTRAINT tips_artisan_id_fkey FOREIGN KEY (artisan_id) REFERENCES public.artisans(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.product_views
    DROP CONSTRAINT IF EXISTS product_views_artisan_id_fkey,
    ADD CONSTRAINT product_views_artisan_id_fkey FOREIGN KEY (artisan_id) REFERENCES public.artisans(id) ON DELETE CASCADE;

-- Storage Buckets & Policies for artisan assets & product audio
INSERT INTO storage.buckets (id, name, public) 
VALUES ('artisan-assets', 'artisan-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-audio', 'product-audio', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Read Artisan Assets" ON storage.objects;
CREATE POLICY "Public Read Artisan Assets" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'artisan-assets' OR bucket_id = 'product-audio');

DROP POLICY IF EXISTS "Artisans can upload assets" ON storage.objects;
CREATE POLICY "Artisans can upload assets" 
ON storage.objects FOR INSERT 
WITH CHECK (
    (bucket_id = 'artisan-assets' OR bucket_id = 'product-audio')
    AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Artisans can update assets" ON storage.objects;
CREATE POLICY "Artisans can update assets" 
ON storage.objects FOR UPDATE 
USING (
    (bucket_id = 'artisan-assets' OR bucket_id = 'product-audio')
    AND auth.role() = 'authenticated'
);

-- Index for fast artisan lookups
CREATE INDEX IF NOT EXISTS idx_products_artisan_id ON products(artisan_id);

-- =============================================
-- Row Level Security (RLS) Policies
-- Run these in the Supabase SQL Editor if RLS is enabled:
-- =============================================

-- 1. Enable RLS on products & artisans
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artisans ENABLE ROW LEVEL SECURITY;

-- 2. Allow universal read access to products
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
CREATE POLICY "Products are viewable by everyone" ON public.products 
    FOR SELECT USING (true);

-- 3. Allow verified artisans to insert only their own products
DROP POLICY IF EXISTS "Artisans can insert products" ON public.products;
CREATE POLICY "Artisans can insert products" ON public.products 
    FOR INSERT WITH CHECK (auth.uid() = artisan_id);

-- 4. Allow verified artisans to update only their own products
DROP POLICY IF EXISTS "Artisans can update own products" ON public.products;
CREATE POLICY "Artisans can update own products" ON public.products 
    FOR UPDATE USING (auth.uid() = artisan_id);

-- 5. Allow verified artisans to delete only their own products
DROP POLICY IF EXISTS "Artisans can delete own products" ON public.products;
CREATE POLICY "Artisans can delete own products" ON public.products 
    FOR DELETE USING (auth.uid() = artisan_id);

-- 6. Allow universal read access to artisans
DROP POLICY IF EXISTS "Artisans are viewable by everyone" ON public.artisans;
CREATE POLICY "Artisans are viewable by everyone" ON public.artisans 
    FOR SELECT USING (true);

-- 7. Allow verified artisans to insert only their own profile
DROP POLICY IF EXISTS "Artisans can insert own profile" ON public.artisans;
CREATE POLICY "Artisans can insert own profile" ON public.artisans 
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 8. Allow verified artisans to update only their own profile
DROP POLICY IF EXISTS "Artisans can update own profile" ON public.artisans;
CREATE POLICY "Artisans can update own profile" ON public.artisans 
    FOR UPDATE USING (auth.uid() = id);

-- =============================================
-- 9. Tips / Direct Patronage Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artisan_id UUID NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
    patron_name TEXT DEFAULT 'Anonymous Patron',
    amount NUMERIC NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL CHECK (currency IN ('INR', 'USD')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('upi', 'paypal')),
    order_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tips_artisan_id ON public.tips(artisan_id, created_at DESC);
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Artisans can view own tips" ON public.tips;
CREATE POLICY "Artisans can view own tips" ON public.tips 
    FOR SELECT USING (auth.uid() = artisan_id);

DROP POLICY IF EXISTS "Public can record tips" ON public.tips;
CREATE POLICY "Public can record tips" ON public.tips 
    FOR INSERT WITH CHECK (true);

-- =============================================
-- 10. Global Reach Analytics (Product Views) Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.product_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artisan_id UUID NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    country TEXT DEFAULT 'India',
    country_code TEXT DEFAULT 'IN',
    city TEXT DEFAULT 'Kolkata',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_views_artisan_created ON public.product_views(artisan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_views_country ON public.product_views(artisan_id, country_code);
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Artisans can view own analytics" ON public.product_views;
CREATE POLICY "Artisans can view own analytics" ON public.product_views 
    FOR SELECT USING (auth.uid() = artisan_id);

DROP POLICY IF EXISTS "Public can record product views" ON public.product_views;
CREATE POLICY "Public can record product views" ON public.product_views 
    FOR INSERT WITH CHECK (true);

