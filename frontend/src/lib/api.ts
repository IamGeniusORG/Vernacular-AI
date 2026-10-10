const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface Product {
  id: string;
  artisan_id: string;
  image_url: string;
  ai_title_en: string;
  ai_title_local: string;
  ai_desc_en: string;
  ai_desc_local: string;
  price_inr: number | null;
  tags: string[];
  created_at: string;
}

export interface Artisan {
  id: string;
  phone_number: string;
  full_name: string;
  district: string;
  created_at: string;
}

export async function getArtisan(artisanId: string): Promise<Artisan | null> {
  const res = await fetch(`${API_BASE}/api/v1/artisans/${artisanId}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.artisan ?? null;
}

export async function getArtisanProducts(artisanId: string): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/api/v1/products/shop/${artisanId}`, {
    next: { revalidate: 60 }, // ISR: re-fetch at most once per minute
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.products ?? [];
}
