-- Migration: Add images array column to products table
-- Stores multiple photo angles for a single product listing (up to 8)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Backfill existing single image_url values into images array
UPDATE public.products 
SET images = ARRAY[image_url] 
WHERE (images IS NULL OR images = '{}') AND image_url IS NOT NULL;
