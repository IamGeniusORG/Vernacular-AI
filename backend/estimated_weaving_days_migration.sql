-- Migration: Add estimated_weaving_days column to products table
-- Allows artisans to specify expected crafting duration for custom orders when out of stock

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS estimated_weaving_days INTEGER DEFAULT NULL;

-- Comment for schema documentation
COMMENT ON COLUMN public.products.estimated_weaving_days IS 'Number of days needed to weave a new piece on demand when out of stock';
