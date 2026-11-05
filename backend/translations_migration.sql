-- ==============================================================================
-- Migration: Multilingual Translations Architecture (Bengali, English, Hindi)
-- Description: Adds JSONB translations column and backfills initial values.
-- ==============================================================================

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- Populate existing titles and descriptions into structured translations JSONB
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
