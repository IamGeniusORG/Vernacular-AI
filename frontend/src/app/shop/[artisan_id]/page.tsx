import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArtisanProducts, getArtisan } from "@/lib/api";
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
    notFound();
  }

  const [artisan, products] = await Promise.all([
    getArtisan(artisan_id),
    getArtisanProducts(artisan_id)
  ]);

  if (!artisan) {
    notFound();
  }

  return <StorefrontClient products={products} artisan={artisan} />;
}
