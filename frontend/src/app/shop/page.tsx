import type { Metadata } from "next";
import Link from "next/link";
import { Store, MapPin, ArrowRight } from "lucide-react";

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
      next: { revalidate: 30 }, // ISR cache
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 md:p-10 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <header className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full mb-4">
            <Store size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Artisan Directory
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Discover rural weavers and shop directly from their digital stores.
          </p>
        </header>

        {/* Directory List */}
        {artisans.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-700">No artisans found</h2>
            <p className="text-slate-500 mt-2">
              Generate a catalog listing first to see artisans appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {artisans.map((artisan) => (
              <Link 
                key={artisan.id} 
                href={`/shop/${artisan.id}`}
                className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex items-center justify-between"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {artisan.full_name || "Anonymous Artisan"}
                  </h2>
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1">
                    <MapPin size={14} />
                    {artisan.district || "West Bengal, India"}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 flex items-center justify-center transition-colors shrink-0">
                  <ArrowRight size={18} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
