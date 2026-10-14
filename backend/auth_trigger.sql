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
  INSERT INTO public.artisans (id, phone_number, full_name, user_role)
  VALUES (
    new.id, 
    new.phone, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'user_role', 'customer')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.artisans.full_name);
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Never block auth user creation on profile trigger failure
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Bind the trigger to the auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_artisan_signup();
