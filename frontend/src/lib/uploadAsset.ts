import { createClient } from "@/utils/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/**
 * Resizes and compresses an image file on the client if it exceeds maxDimension or 2MB.
 */
export async function compressImage(file: File, maxDimension = 1200, quality = 0.85): Promise<File> {
  // If already under 1MB and reasonably sized, return original
  if (file.size <= 1024 * 1024 && !file.type.includes("bmp") && !file.type.includes("tiff")) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

/**
 * Uploads an artisan profile avatar or banner image to Supabase Storage ('artisan-assets')
 * via the backend service_role endpoint with direct Supabase client fallback.
 */
export async function uploadArtisanAsset(
  artisanId: string,
  file: File,
  assetType: "avatar" | "banner"
): Promise<{ success: boolean; url?: string; error?: string }> {
  // 1. File size check (2MB limit after compression)
  let uploadFile = file;
  if (file.size > 2 * 1024 * 1024) {
    try {
      uploadFile = await compressImage(file, assetType === "avatar" ? 800 : 1600, 0.82);
    } catch (e) {
      console.warn("Client compression skipped:", e);
    }
  }

  if (uploadFile.size > 2.5 * 1024 * 1024) {
    return {
      success: false,
      error: "Image exceeds the 2MB size limit. Please choose a smaller photo.",
    };
  }

  // 2. Try Backend Service-Role API Endpoint first with session authorization
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("asset_type", assetType);

    const res = await fetch(`${API_BASE}/api/v1/artisans/${artisanId}/upload-asset`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (res.ok) {
      const json = await res.json();
      if (json.url) {
        return { success: true, url: json.url };
      }
    }
  } catch (err) {
    console.warn("Backend upload-asset call failed, trying direct Supabase storage:", err);
  }

  // 3. Fallback to direct client-side Supabase storage
  try {
    const supabase = createClient();
    const ext = uploadFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${artisanId}/${assetType}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("artisan-assets")
      .upload(filePath, uploadFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from("artisan-assets")
      .getPublicUrl(filePath);

    if (publicUrlData?.publicUrl) {
      return { success: true, url: publicUrlData.publicUrl };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return { success: false, error: message };
  }

  return { success: false, error: "Failed to obtain public URL" };
}
