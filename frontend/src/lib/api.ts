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
  const res = await fetch(`${API_BASE}/api/v1/artisans/${artisanId}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.artisan ?? null;
}

export async function getArtisanProducts(artisanId: string): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/api/v1/products/shop/${artisanId}`, {
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.products ?? [];
}
