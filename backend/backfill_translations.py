"""
Standalone CLI Backfill Migration Script:
Multilingual Product Description System (Bengali, English, Hindi)

Usage:
    python backend/backfill_translations.py
"""

import sys
import os
import asyncio

# Ensure backend root is in Python module path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.supabase_client import supabase
from app.services.ai_service import translate_existing_product_text


async def main():
    print("=" * 70)
    print("VERNACULAR AI: Multilingual Catalog Backfill Migration (EN / BN / HI)")
    print("=" * 70)

    # 1. Fetch all products from Supabase (with fallback if new columns not yet migrated)
    try:
        res = (
            supabase.table("products")
            .select("id, artisan_id, ai_title_en, ai_title_local, ai_desc_en, ai_desc_local, export_description, translations")
            .execute()
        )
        products = res.data or []
    except Exception:
        try:
            res = (
                supabase.table("products")
                .select("id, artisan_id, ai_title_en, ai_title_local, ai_desc_en, ai_desc_local")
                .execute()
            )
            products = res.data or []
        except Exception as e2:
            print(f"[ERROR] Failed to query products from Supabase: {e2}")
            return

    print(f"[*] Found {len(products)} total product(s) in catalog.")

    # 2. Filter products that require multilingual backfilling
    to_backfill = []
    for p in products:
        translations = p.get("translations")
        t_title = translations.get("title", {}) if isinstance(translations, dict) and isinstance(translations.get("title"), dict) else {}
        t_desc = translations.get("description", {}) if isinstance(translations, dict) and isinstance(translations.get("description"), dict) else {}

        # Check if Hindi actually contains Devanagari script (Unicode 0900-097F)
        hi_val = t_title.get("hi") or t_title.get("hindi") or t_title.get("hin") or ""
        has_devanagari = any('\u0900' <= char <= '\u097F' for char in hi_val)

        has_full_translations = (
            isinstance(translations, dict)
            and bool(t_title.get("en"))
            and bool(t_title.get("bn"))
            and bool(hi_val)
            and has_devanagari
            and bool(t_desc.get("en"))
            and bool(t_desc.get("bn"))
            and bool(t_desc.get("hi") or t_desc.get("hindi") or t_desc.get("hin"))
        )
        if not has_full_translations or "--force" in sys.argv:
            to_backfill.append(p)

    print(f"[*] {len(to_backfill)} product(s) need translation backfill.")
    if not to_backfill:
        print("[SUCCESS] All products already have full multilingual translations!")
        return

    # 3. Process each product through Gemini 2.5 Flash
    success_count = 0
    fail_count = 0

    for idx, p in enumerate(to_backfill, 1):
        p_id = p["id"]
        title = p.get("ai_title_local") or p.get("ai_title_en") or "Handloom Creation"
        desc = p.get("ai_desc_local") or p.get("ai_desc_en") or p.get("export_description") or ""

        print(f"\n[{idx}/{len(to_backfill)}] Translating product '{title}' (ID: {p_id})...")

        try:
            multilingual = await translate_existing_product_text(title, desc)
            titles = multilingual.get("title", {})
            descs = multilingual.get("description", {})

            print(f"    -> [EN Title]: {titles.get('en', '')}")
            print(f"    -> [BN Title]: {titles.get('bn', '')}")
            print(f"    -> [HI Title]: {titles.get('hi', '')}")

            update_payload = {
                "translations": multilingual,
                "ai_title_en": titles.get("en") or p.get("ai_title_en"),
                "ai_title_local": titles.get("bn") or p.get("ai_title_local"),
                "ai_desc_en": descs.get("en") or p.get("ai_desc_en"),
                "ai_desc_local": descs.get("bn") or p.get("ai_desc_local"),
            }

            try:
                supabase.table("products").update(update_payload).eq("id", p_id).execute()
                print(f"    [OK] Successfully updated Supabase record.")
                success_count += 1
            except Exception as db_err:
                # If translations column is pending SQL migration, fallback to existing columns
                print(f"    [WARN] Supabase update with translations failed ({db_err}). Retrying with base columns...")
                fallback_payload = update_payload.copy()
                fallback_payload.pop("translations", None)
                supabase.table("products").update(fallback_payload).eq("id", p_id).execute()
                print(f"    [OK] Updated base language columns.")
                success_count += 1

        except Exception as ai_err:
            print(f"    [FAILED] Error during AI translation: {ai_err}")
            fail_count += 1

        # Rate-limiting pause between requests
        await asyncio.sleep(1.0)

    print("\n" + "=" * 70)
    print(f"[SUMMARY] Migration complete: {success_count} succeeded, {fail_count} failed.")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
