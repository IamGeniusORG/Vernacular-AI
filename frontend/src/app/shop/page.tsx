import type { Metadata } from "next";
import ShopDirectoryClient from "@/app/ShopDirectoryClient";
import { Artisan, Product } from "@/lib/api";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── API Helper ──────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function getArtisans(): Promise<Artisan[]> {
  // 1. First attempt: Direct Supabase Server client (fetching artisans and products in parallel)
  try {
    const supabase = await createClient();
    const [artisansRes, productsRes] = await Promise.all([
      supabase
        .from("artisans")
        .select("*")
        .neq("user_role", "customer")
        .order("created_at", { ascending: false }),
      supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (!artisansRes.error && artisansRes.data) {
      const allProducts = (productsRes.data || []) as Product[];
      const artisansWithProducts: Artisan[] = (artisansRes.data as Artisan[])
        .filter((a) => a.user_role !== "customer")
        .map((artisan) => ({
          ...artisan,
          products: allProducts.filter((p) => p.artisan_id === artisan.id),
        }));

      if (artisansWithProducts.length > 0) {
        return artisansWithProducts;
      }
    }
  } catch (err) {
    console.warn("Direct Supabase parallel query fallback to backend API:", err);
  }

  // 2. Second attempt: FastAPI backend endpoint
  try {
    const res = await fetch(`${API_BASE}/api/v1/artisans/`, {
      cache: "no-store", // Always fresh
    });
    if (!res.ok) return [];
    const data = await res.json();
    const rawArtisans = (data.artisans ?? []) as Artisan[];
    return rawArtisans.filter((a) => a.user_role !== "customer");
  } catch (error) {
    console.error("Failed to fetch artisans:", error);
    return [];
  }
}

// ─── Metadata ────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Discovery Marketplace | Vernacular AI",
  description:
    "Browse authentic handlooms and shop directly from rural weavers and artisans with zero commission.",
};

// ─── Page Component ──────────────────────────────────────────────────────────
export default async function ShopDirectoryPage() {
  const artisans = await getArtisans();

  return <ShopDirectoryClient artisans={artisans} />;
}
