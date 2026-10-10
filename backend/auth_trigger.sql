-- =========================================================================
-- Supabase Auth Trigger for Vernacular AI E-Commerce Enabler
-- 
-- Run this in the Supabase SQL Editor.
-- This automatically creates a row in the public.artisans table 
-- whenever a new user signs up via OTP (auth.users).
-- =========================================================================

-- 1. Create the function that inserts into the artisans table
CREATE OR REPLACE FUNCTION public.handle_new_artisan_signup() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.artisans (id, phone_number, full_name)
  VALUES (
    new.id, 
    COALESCE(new.phone, 'Unknown Phone'), 
    'New Artisan' -- Default name until they update their profile
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Bind the trigger to the auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_artisan_signup();
