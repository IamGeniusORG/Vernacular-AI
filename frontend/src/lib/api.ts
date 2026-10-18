const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface Product {
  id: string;
  artisan_id: string;
  image_url: string;
  audio_url: string | null;
  ai_title_en: string;
  ai_title_local: string;
  ai_desc_en: string;
  ai_desc_local: string;
  price_inr?: number | null;
  price?: number | null;
  price_usd?: number | null;
  suggested_price_range?: string | null;
  suggested_usd_price?: number | null;
  export_description?: string | null;
  tags: string[];
  in_stock?: boolean | null;
  created_at: string;
}

export interface Artisan {
  id: string;
  phone_number: string;
  full_name: string;
  district: string;
  whatsapp_number?: string | null;
  upi_id?: string | null;
  paypal_email?: string | null;
  user_role?: string | null;
  created_at: string;
  products?: Product[];
}

export async function getArtisan(artisanId: string): Promise<Artisan | null> {
  // 1. Try backend API
  try {
    const res = await fetch(`${API_BASE}/api/v1/artisans/${artisanId}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.artisan) return data.artisan;
    }
  } catch {
    // Backend API unreachable or cold-starting, continue to direct Supabase fallback
  }

  // 2. Direct Supabase Fallback
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await client
        .from("artisans")
        .select("*")
        .eq("id", artisanId)
        .maybeSingle();
      if (!error && data) return data;
    }
  } catch {
    // ignore
  }

  return null;
}

export async function getArtisanProducts(artisanId: string): Promise<Product[]> {
  // 1. Try backend API
  try {
    const res = await fetch(`${API_BASE}/api/v1/products/shop/${artisanId}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.products) return data.products;
    }
  } catch {
    // Backend API unreachable or cold-starting, continue to direct Supabase fallback
  }

  // 2. Direct Supabase Fallback
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await client
        .from("products")
        .select("*")
        .eq("artisan_id", artisanId)
        .order("created_at", { ascending: false });
      if (!error && data) return data;
    }
  } catch {
    // ignore
  }

  return [];
}
