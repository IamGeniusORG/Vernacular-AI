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
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_usd NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS suggested_usd_price NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS export_description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price INTEGER;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS in_stock BOOLEAN DEFAULT TRUE;

-- Storage Buckets & Policies for artisan assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('artisan-assets', 'artisan-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Read Artisan Assets" ON storage.objects;
CREATE POLICY "Public Read Artisan Assets" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'artisan-assets');

DROP POLICY IF EXISTS "Artisans can upload assets" ON storage.objects;
CREATE POLICY "Artisans can upload assets" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'artisan-assets');

DROP POLICY IF EXISTS "Artisans can update assets" ON storage.objects;
CREATE POLICY "Artisans can update assets" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'artisan-assets');

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

-- 3. Allow artisans to insert their own products
DROP POLICY IF EXISTS "Artisans can insert products" ON public.products;
CREATE POLICY "Artisans can insert products" ON public.products 
    FOR INSERT WITH CHECK (true);

-- 4. Allow artisans to update their own products
DROP POLICY IF EXISTS "Artisans can update own products" ON public.products;
CREATE POLICY "Artisans can update own products" ON public.products 
    FOR UPDATE USING (auth.uid() = artisan_id);

-- 5. Allow artisans to delete their own products
DROP POLICY IF EXISTS "Artisans can delete own products" ON public.products;
CREATE POLICY "Artisans can delete own products" ON public.products 
    FOR DELETE USING (auth.uid() = artisan_id);

-- 6. Allow universal read access to artisans
DROP POLICY IF EXISTS "Artisans are viewable by everyone" ON public.artisans;
CREATE POLICY "Artisans are viewable by everyone" ON public.artisans 
    FOR SELECT USING (true);

-- 7. Allow artisans to update own profile
DROP POLICY IF EXISTS "Artisans can update own profile" ON public.artisans;
CREATE POLICY "Artisans can update own profile" ON public.artisans 
    FOR UPDATE USING (auth.uid() = id);
