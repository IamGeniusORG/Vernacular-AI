-- ==============================================================================
-- Vernacular AI — Delete Demo Artisan Account & Cascade Data Cleanup
-- Run this in the Supabase SQL Editor to permanently purge Demo Artisan records.
-- ==============================================================================

DO $$
DECLARE
    demo_id UUID;
    deleted_products_count INT;
BEGIN
    -- 1. Locate Demo Artisan
    SELECT id INTO demo_id 
    FROM public.artisans 
    WHERE full_name = 'Demo Artisan' 
    LIMIT 1;

    IF demo_id IS NOT NULL THEN
        -- 2. Audit product count before deletion
        SELECT COUNT(*) INTO deleted_products_count 
        FROM public.products 
        WHERE artisan_id = demo_id;
        
        -- 3. Delete artisan row (cascades to products, tips, product_views)
        DELETE FROM public.artisans 
        WHERE id = demo_id;
        
        RAISE NOTICE 'Successfully deleted Demo Artisan (ID: %) and cascaded % product creation(s).', demo_id, deleted_products_count;
    ELSE
        RAISE NOTICE 'Demo Artisan account not found (it may have already been deleted).';
    END IF;
END $$;
