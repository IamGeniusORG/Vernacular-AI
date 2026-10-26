"use server";

import { revalidatePath } from "next/cache";

/**
 * Server action to invalidate cached shop and profile pages
 * when an artisan updates their cover photo (banner) or avatar.
 */
export async function revalidateArtisanProfile(artisanId?: string | null) {
  try {
    revalidatePath("/shop");
    revalidatePath("/profile");
    revalidatePath("/studio");
    if (artisanId) {
      revalidatePath(`/shop/${artisanId}`);
    }
    return { success: true };
  } catch (err) {
    console.warn("revalidatePath notice:", err);
    return { success: false };
  }
}
