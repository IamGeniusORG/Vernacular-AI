import type { Metadata } from "next";
import ShopDirectoryClient from "./ShopDirectoryClient";

// ─── API Helper ──────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Artisan {
  id: string;
  phone_number: string;
  full_name: string;
  district: string;
  created_at: string;
}

async function getArtisans(): Promise<Artisan[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/artisans/`, {
      cache: 'no-store', // Always fresh
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.artisans ?? [];
  } catch (error) {
    console.error("Failed to fetch artisans:", error);
    return [];
  }
}

// ─── Metadata ────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Artisan Directory | Vernacular AI",
  description: "Browse rural handloom artisans and shop directly from their digital storefronts.",
};

// ─── Page Component ──────────────────────────────────────────────────────────
export default async function ShopDirectoryPage() {
  const artisans = await getArtisans();

  return <ShopDirectoryClient artisans={artisans} />;
}
