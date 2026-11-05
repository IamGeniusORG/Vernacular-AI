const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface ProductTranslations {
  title?: {
    en?: string;
    bn?: string;
    hi?: string;
  };
  description?: {
    en?: string;
    bn?: string;
    hi?: string;
  };
}

export interface Product {
  id: string;
  artisan_id: string;
  image_url: string;
  images?: string[] | null;
  audio_url: string | null;
  ai_title_en: string;
  ai_title_local: string;
  ai_desc_en: string;
  ai_desc_local: string;
  translations?: ProductTranslations | null;
  price_inr?: number | null;
  price?: number | null;
  price_usd?: number | null;
  suggested_price_range?: string | null;
  suggested_usd_price?: number | null;
  export_description?: string | null;
  craft?: string | null;
  category?: string | null;
  tags: string[];
  in_stock?: boolean | null;
  stock_quantity?: number | null;
  estimated_weaving_days?: number | null;
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
  avatar_url?: string | null;
  banner_url?: string | null;
  qr_code_url?: string | null;
  preferred_currency?: "INR" | "USD" | string | null;
  preferred_language?: "en" | "hi" | "bn" | string | null;
  user_role?: string | null;
  created_at: string;
  products?: Product[];
}

export async function getArtisan(artisanId: string): Promise<Artisan | null> {
  // 1. Try backend API with ISR caching (60s)
  try {
    const res = await fetch(`${API_BASE}/api/v1/artisans/${artisanId}`, {
      next: { revalidate: 60 },
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
  // 1. Try backend API with ISR caching (60s)
  try {
    const res = await fetch(`${API_BASE}/api/v1/products/shop/${artisanId}`, {
      next: { revalidate: 60 },
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

export async function getProduct(productId: string): Promise<Product | null> {
  // 1. Try backend API with ISR caching (60s)
  try {
    const res = await fetch(`${API_BASE}/api/v1/products/${productId}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.product) return data.product;
    }
  } catch {
    // Backend API unreachable, continue to Supabase fallback
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
        .eq("id", productId)
        .maybeSingle();
      if (!error && data) return data;
    }
  } catch {
    // ignore
  }

  return null;
}

export async function deleteArtisanAccount(artisanId: string, token: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/artisans/${artisanId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.detail || "Failed to delete account" };
    }
    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Network error during account deletion";
    return { success: false, message: msg };
  }
}

/**
 * Resolves localized product title based on active language (en, bn, hi) with safe fallbacks and alias normalization.
 */
export function getLocalizedProductTitle(
  product?: Product | null,
  lang: string = "en"
): string {
  if (!product) return "Handloom Creation";
  const titles = product.translations?.title as Record<string, string | undefined> | undefined;
  if (titles) {
    let text: string | undefined = undefined;
    if (lang === "hi" || lang === "hin" || lang === "hindi") {
      text = titles.hi || titles.hindi || titles.hin;
    } else if (lang === "bn" || lang === "ben" || lang === "bengali") {
      text = titles.bn || titles.bengali || titles.ben;
    } else {
      text = titles.en || titles.english || titles.eng;
    }

    if (text && text.trim()) return text;
    if (titles.en && titles.en.trim()) return titles.en;
  }

  if (lang === "en") return product.ai_title_en || product.ai_title_local || "Handloom Creation";
  if (lang === "bn") return product.ai_title_local || product.ai_title_en || "হস্তনির্মিত তাঁত সৃষ্টি";
  if (lang === "hi") return product.ai_title_local || product.ai_title_en || "हस्तनिर्मित हथकरघा वस्त्र";
  return product.ai_title_en || product.ai_title_local || "Handloom Creation";
}

/**
 * Resolves localized product description based on active language (en, bn, hi) with safe fallbacks and alias normalization.
 */
export function getLocalizedProductDesc(
  product?: Product | null,
  lang: string = "en"
): string {
  if (!product) return "";
  const descs = product.translations?.description as Record<string, string | undefined> | undefined;
  if (descs) {
    let text: string | undefined = undefined;
    if (lang === "hi" || lang === "hin" || lang === "hindi") {
      text = descs.hi || descs.hindi || descs.hin;
    } else if (lang === "bn" || lang === "ben" || lang === "bengali") {
      text = descs.bn || descs.bengali || descs.ben;
    } else {
      text = descs.en || descs.english || descs.eng;
    }

    if (text && text.trim()) return text;
    if (descs.en && descs.en.trim()) return descs.en;
  }

  if (lang === "en") return product.ai_desc_en || product.export_description || product.ai_desc_local || "";
  if (lang === "bn") return product.ai_desc_local || product.ai_desc_en || "";
  if (lang === "hi") return product.ai_desc_local || product.ai_desc_en || "";
  return product.ai_desc_en || product.ai_desc_local || "";
}
