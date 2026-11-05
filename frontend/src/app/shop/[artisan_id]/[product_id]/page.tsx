import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtisan, getProduct, type Product, type Artisan } from "@/lib/api";
import { getProductImage } from "@/lib/placeholders";
import ProductDetailClient from "./ProductDetailClient";

export const revalidate = 60;

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── Dynamic Metadata for Rich WhatsApp & Social Previews ─────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ artisan_id: string; product_id: string }>;
}): Promise<Metadata> {
  const { artisan_id, product_id } = await params;
  if (!uuidRegex.test(artisan_id) || !uuidRegex.test(product_id)) return {};

  const [artisan, product] = await Promise.all([
    getArtisan(artisan_id),
    getProduct(product_id),
  ]);

  if (!product) return {};

  const artisanName = artisan?.full_name || "Master Weaver";
  const productTitle = product.translations?.title?.en || product.ai_title_en || product.ai_title_local || "Handcrafted Heritage Textile";
  const title = `${productTitle} by ${artisanName} | Vernacular AI`;
  const description =
    product.translations?.description?.en ||
    product.ai_desc_en ||
    product.export_description ||
    "Check out this authentic handloom creation directly from the weaver on Vernacular AI.";
  const ogImage = getProductImage(product);

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

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ artisan_id: string; product_id: string }>;
}) {
  const { artisan_id, product_id } = await params;

  if (!uuidRegex.test(artisan_id) || !uuidRegex.test(product_id)) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center p-6 text-neutral-800">
        <div className="bg-white border border-stone-200 p-8 rounded-3xl max-w-md text-center shadow-lg">
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Invalid Link Format</h2>
          <p className="text-sm text-neutral-600 mb-6">
            The provided product or artisan ID is invalid.
          </p>
          <Link
            href="/shop"
            className="inline-block px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition"
          >
            Return to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const [artisan, product] = await Promise.all([
    getArtisan(artisan_id),
    getProduct(product_id),
  ]);

  if (!product) {
    return notFound();
  }

  // Fallback artisan object if missing from query
  const effectiveArtisan: Artisan = artisan || {
    id: artisan_id,
    phone_number: "",
    full_name: "Master Weaver",
    district: "West Bengal, India",
    created_at: new Date().toISOString(),
  };

  return <ProductDetailClient artisan={effectiveArtisan} product={product} />;
}
