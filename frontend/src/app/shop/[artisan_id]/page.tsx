import type { Metadata } from "next";
import Link from "next/link";
import { getArtisanProducts, getArtisan, type Product, type Artisan } from "@/lib/api";
import StorefrontClient from "./StorefrontClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── SEO / Open Graph Metadata ────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ artisan_id: string }>;
}): Promise<Metadata> {
  const { artisan_id } = await params;
  if (!uuidRegex.test(artisan_id)) return {};

  const artisan = await getArtisan(artisan_id);
  const products = await getArtisanProducts(artisan_id);
  
  if (!artisan || !products.length) return {};

  const title = `${artisan.full_name}'s Collection — Vernacular AI`;
  const description = `Shop handwoven products directly from ${artisan.full_name}. ${products[0]?.ai_desc_en.slice(0, 100) || ""}…`;
  const ogImage = products[0]?.image_url ?? null;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(ogImage && {
        images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

// ─── Server Component Page ─────────────────────────────────────────────────────

export default async function ShopPage({
  params,
}: {
  params: Promise<{ artisan_id: string }>;
}) {
  const { artisan_id } = await params;
  
  if (!uuidRegex.test(artisan_id)) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center p-6 text-neutral-800">
        <div className="bg-white border border-stone-200 p-8 rounded-3xl max-w-md text-center shadow-lg">
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Invalid Artisan ID</h2>
          <p className="text-sm text-neutral-600 mb-6">The ID &quot;{artisan_id}&quot; is not a valid format.</p>
          <Link href="/shop" className="inline-block px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition">
            Return to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  let artisan: Artisan | null = null;
  let products: Product[] = [];
  let fetchError: Error | null = null;

  try {
    const results = await Promise.all([
      getArtisan(artisan_id),
      getArtisanProducts(artisan_id)
    ]);
    artisan = results[0];
    products = results[1];
  } catch (err: unknown) {
    fetchError = err instanceof Error ? err : new Error(String(err));
  }

  if (!artisan) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center p-6 text-neutral-800">
        <div className="bg-white border border-stone-200 p-8 rounded-3xl max-w-md text-center shadow-lg">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
            !
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Artisan Not Found</h2>
          <div className="text-sm text-neutral-600 mb-6">
            {fetchError ? (
              <span>Error loading artisan: {fetchError.message || "Unknown error"}</span>
            ) : (
              <span>Could not load the catalog for artisan ID: <code className="text-xs bg-stone-100 p-1 rounded">{artisan_id}</code></span>
            )}
          </div>
          <Link href="/shop" className="inline-block px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition">
            Return to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return <StorefrontClient products={products} artisan={artisan} />;
}
