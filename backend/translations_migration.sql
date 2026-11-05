-- ==============================================================================
-- Migration: Complete Columns & Multilingual Translations Architecture
-- Description: Adds all modern product columns and safely backfills translations.
-- ==============================================================================

-- 1. Ensure all modern columns exist on products table first
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS export_description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_usd NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS suggested_usd_price NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS in_stock BOOLEAN DEFAULT TRUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS estimated_weaving_days INTEGER;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- 2. Populate structured translations JSONB safely from existing data
UPDATE public.products
SET translations = jsonb_build_object(
    'title', jsonb_build_object(
        'en', COALESCE(NULLIF(ai_title_en, ''), NULLIF(ai_title_local, ''), 'Handloom Creation'),
        'bn', COALESCE(NULLIF(ai_title_local, ''), NULLIF(ai_title_en, ''), 'হস্তনির্মিত তাঁত সৃষ্টি'),
        'hi', COALESCE(NULLIF(ai_title_local, ''), NULLIF(ai_title_en, ''), 'हस्तनिर्मित हथकरघा वस्त्र')
    ),
    'description', jsonb_build_object(
        'en', COALESCE(NULLIF(ai_desc_en, ''), NULLIF(export_description, ''), NULLIF(ai_desc_local, ''), ''),
        'bn', COALESCE(NULLIF(ai_desc_local, ''), NULLIF(ai_desc_en, ''), ''),
        'hi', COALESCE(NULLIF(ai_desc_local, ''), NULLIF(ai_desc_en, ''), '')
    )
)
WHERE translations IS NULL OR translations = '{}'::jsonb;
