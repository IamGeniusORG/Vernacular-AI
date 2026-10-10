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
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artisan_id      UUID NOT NULL REFERENCES artisans(id) ON DELETE CASCADE,
    image_url       TEXT NOT NULL,
    ai_title_en     TEXT,
    ai_title_local  TEXT,
    ai_desc_en      TEXT,
    ai_desc_local   TEXT,
    price_inr       INTEGER,
    tags            JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast artisan lookups
CREATE INDEX IF NOT EXISTS idx_products_artisan_id ON products(artisan_id);

-- =============================================
-- Supabase Storage Bucket
-- Run this OR create it via the Supabase UI:
--   Storage > New Bucket > Name: "product-images" > Public: ON
-- =============================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('product-images', 'product-images', true)
-- ON CONFLICT DO NOTHING;
