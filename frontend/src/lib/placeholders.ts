/**
 * Dynamic Category Placeholders for Vernacular AI Handloom Products
 * Detects craft or keywords in title / category and returns a realistic default image.
 */

export function getProductFallbackImage(
  title?: string | null,
  categoryOrCraft?: string | null
): string {
  const combined = `${title || ""} ${categoryOrCraft || ""}`.toLowerCase();

  if (
    combined.includes("taant") ||
    combined.includes("tant") ||
    combined.includes("phulia") ||
    combined.includes("shantipur")
  ) {
    return "/assets/products/phulia_taant.jpg?v=20261111";
  }

  if (
    combined.includes("jamdani") ||
    combined.includes("dhakai") ||
    combined.includes("muslin")
  ) {
    return "/placeholders/jamdani.jpg";
  }

  if (
    combined.includes("baluchari") ||
    combined.includes("swarnachari") ||
    combined.includes("murshidabad")
  ) {
    return "/placeholders/baluchari.jpg";
  }

  if (
    combined.includes("kantha") ||
    combined.includes("nakshi") ||
    combined.includes("birbhum")
  ) {
    return "/placeholders/kantha.jpg";
  }

  if (
    combined.includes("khadi") ||
    combined.includes("linen") ||
    combined.includes("cotton") ||
    combined.includes("silk") ||
    combined.includes("begumpuri")
  ) {
    return "/assets/products/phulia_taant.jpg";
  }

  return "/placeholders/default-handloom.jpg";
}

/**
 * Returns a valid product image URL or a dynamic category placeholder if missing, empty, or fallback logo.
 */
export function getProductImage(
  product?: {
    images?: string[] | null;
    image_url?: string | null;
    ai_title_en?: string | null;
    ai_title_local?: string | null;
    title?: string | null;
    craft?: string | null;
    category?: string | null;
  } | null,
  preferredIndex = 0
): string {
  if (!product) return "/placeholders/default-handloom.jpg";

  const title = product.ai_title_en || product.ai_title_local || product.title;

  const isInvalidPlaceholder = (url?: string | null) => {
    if (!url || typeof url !== "string" || !url.trim()) return true;
    const lower = url.toLowerCase();
    return (
      lower.includes("brand-hero.png") ||
      lower.includes("logo.png") ||
      lower.includes("b%20logo.png") ||
      lower.includes("placeholder.jpg")
    );
  };

  const images = product.images;
  if (images && Array.isArray(images) && images.length > preferredIndex && images[preferredIndex]) {
    const candidate = images[preferredIndex];
    if (!isInvalidPlaceholder(candidate)) {
      return candidate;
    }
  }

  if (product.image_url && !isInvalidPlaceholder(product.image_url)) {
    return product.image_url;
  }

  return getProductFallbackImage(title, product.craft || product.category);
}
