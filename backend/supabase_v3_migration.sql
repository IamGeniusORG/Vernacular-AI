-- ========================================================================
-- Vernacular AI: v3 Production Migration
-- Run this in your Supabase Project -> SQL Editor
-- Enables Realtime, Orders, Subscribers, Inventory & Stock Decrement
-- ========================================================================

-- 1. Inventory & Stock Quantity on Products
ALTER TABLE IF EXISTS public.products 
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 1;

-- Ensure stock cannot be negative
DO $$
BEGIN
    ALTER TABLE public.products ADD CONSTRAINT products_stock_quantity_check CHECK (stock_quantity >= 0);
EXCEPTION WHEN duplicate_object THEN
    -- constraint already exists
END $$;

-- Atomic Stock Decrement Function (Eliminates Race Conditions / Overselling)
CREATE OR REPLACE FUNCTION public.decrement_product_stock(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count INTEGER;
    v_remaining_stock INTEGER;
BEGIN
    UPDATE public.products
    SET 
        stock_quantity = stock_quantity - 1,
        in_stock = (stock_quantity - 1 > 0)
    WHERE id = p_product_id AND stock_quantity > 0
    RETURNING stock_quantity INTO v_remaining_stock;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    IF v_updated_count > 0 THEN
        RETURN jsonb_build_object('success', true, 'remaining_stock', v_remaining_stock);
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'out_of_stock');
    END IF;
END;
$$;

-- 2. Tips Table (Direct Patronage)
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

-- 3. Orders Table (PayPal & UPI Purchases)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artisan_id UUID NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    buyer_name TEXT DEFAULT 'Anonymous Buyer',
    buyer_email TEXT,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR', 'USD')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('upi', 'paypal')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    transaction_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_artisan_id ON public.orders(artisan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Artisans can view own orders" ON public.orders;
CREATE POLICY "Artisans can view own orders" ON public.orders 
    FOR SELECT USING (auth.uid() = artisan_id);

DROP POLICY IF EXISTS "Public can record orders" ON public.orders;
CREATE POLICY "Public can record orders" ON public.orders 
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Artisans can update own orders" ON public.orders;
CREATE POLICY "Artisans can update own orders" ON public.orders 
    FOR UPDATE USING (auth.uid() = artisan_id);

-- 4. Subscribers Table (Buyer Community Newsletter)
CREATE TABLE IF NOT EXISTS public.subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON public.subscribers(email);
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can subscribe" ON public.subscribers;
CREATE POLICY "Public can subscribe" ON public.subscribers 
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can view subscribers" ON public.subscribers;
CREATE POLICY "Service role can view subscribers" ON public.subscribers 
    FOR SELECT USING (auth.role() = 'service_role');

-- 5. Product Views Analytics Table
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
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Artisans can view own analytics" ON public.product_views;
CREATE POLICY "Artisans can view own analytics" ON public.product_views 
    FOR SELECT USING (auth.uid() = artisan_id);

DROP POLICY IF EXISTS "Public can record product views" ON public.product_views;
CREATE POLICY "Public can record product views" ON public.product_views 
    FOR INSERT WITH CHECK (true);

-- 6. Supabase Realtime Publications
-- Enables WebSocket subscriptions for live tips and orders in Artisan Studio
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tips;
    EXCEPTION WHEN duplicate_object THEN
        -- table already in publication
        NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    EXCEPTION WHEN duplicate_object THEN
        -- table already in publication
        NULL;
    END;
END $$;
