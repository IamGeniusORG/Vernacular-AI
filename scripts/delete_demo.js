/**
 * Standalone Demo Artisan Cleanup Script
 * Run locally anytime: node scripts/delete_demo.js
 * Uses native Node.js fetch (Node 18+) — requires zero npm dependencies.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Error: Missing required Supabase environment variables.");
  console.error("Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your environment.");
  console.error("Usage: SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/delete_demo.js");
  process.exit(1);
}

async function purgeDemoArtisan() {
  console.log("🔍 Checking for 'Demo Artisan' in Supabase database...");

  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };

  try {
    // 1. Search for Demo Artisan
    const searchRes = await fetch(`${SUPABASE_URL}/rest/v1/artisans?full_name=ilike.*Demo*&select=id,full_name,phone_number`, {
      method: "GET",
      headers,
    });

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      throw new Error(`Failed to query artisans: ${searchRes.status} ${errText}`);
    }

    const artisans = await searchRes.json();
    if (!artisans || artisans.length === 0) {
      console.log("✅ No 'Demo Artisan' accounts found in database. Directory is already clean!");
      return;
    }

    console.log(`Found ${artisans.length} demo artisan account(s):`, artisans);

    for (const artisan of artisans) {
      const artisanId = artisan.id;

      // 2. Query products to clean up storage image if any
      const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/products?artisan_id=eq.${artisanId}&select=id,image_url`, {
        method: "GET",
        headers,
      });

      if (prodRes.ok) {
        const prods = await prodRes.json();
        for (const p of prods) {
          if (p.image_url && p.image_url.includes("product-images")) {
            const filename = p.image_url.split("/").pop().split("?")[0];
            console.log(`🗑️ Deleting storage object from product-images: ${filename}`);
            await fetch(`${SUPABASE_URL}/storage/v1/object/product-images`, {
              method: "DELETE",
              headers,
              body: JSON.stringify({ prefixes: [filename] }),
            }).catch(() => {});
          }
        }
      }

      // 3. Delete artisan row from database (cascades to products, tips, views)
      const delRes = await fetch(`${SUPABASE_URL}/rest/v1/artisans?id=eq.${artisanId}`, {
        method: "DELETE",
        headers,
      });

      if (delRes.ok) {
        console.log(`✅ Successfully deleted artisan '${artisan.full_name}' (ID: ${artisanId}) from database.`);
      } else {
        console.error(`❌ Failed to delete artisan:`, await delRes.text());
      }
    }

    console.log("🎉 Cleanup completed successfully!");
  } catch (error) {
    console.error("❌ Cleanup error:", error.message);
  }
}

purgeDemoArtisan();
