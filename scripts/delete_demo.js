/**
 * Standalone Demo Artisan Cleanup Script
 * Run locally anytime: node scripts/delete_demo.js
 * Uses native Node.js fetch (Node 18+) — requires zero npm dependencies.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || "https://jkyghxkkhunmdwzbqtrz.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpreWdoeGtraHVubWR3emJxdHJ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTE4NTE4NiwiZXhwIjoyMTA2NzYxMTg2fQ.VICwzDM2p3TcTceKsN_KpH5AoD0PxlbDMoIdro9tTa0";

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
