import httpx
import json
import base64
from app.core.config import settings

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "google/gemini-2.5-flash"

SYSTEM_PROMPT = (
    "You are an expert e-commerce cataloger for Indian handlooms. "
    "Analyze this image and the user's spoken description. "
    "Extract the price. Describe the specific colors/patterns of this exact image "
    "based on the context of the audio. "
    "Also, estimate a 'Fair Market Price Range' based on the detected weave/fabric "
    "(e.g., Khadi, Jamdani, Taant) and the quality described. "
    "In addition to the local INR price, estimate a premium International USD Price (suggested_usd_price, e.g. 45.00) "
    "for this handloom item targeting US/EU boutique markets. "
    "Also generate a short export_description strictly in English emphasizing the heritage craft, artisanal authenticity, and weaving technique. "
    "CRITICAL REQUIREMENT: Generate title and description simultaneously in English ('en'), Bengali ('bn'), and Hindi ('hi'). "
    "Output ONLY a strict JSON object with these keys: "
    "'translations': { "
    "  'title': { 'en': 'English title', 'bn': 'Bengali title', 'hi': 'Hindi title' }, "
    "  'description': { 'en': 'English description', 'bn': 'Bengali description', 'hi': 'Hindi description' } "
    "}, "
    "'ai_title_en' (English title), "
    "'ai_title_local' (Bengali title), "
    "'ai_desc_en' (English description), "
    "'ai_desc_local' (Bengali description), "
    "'price_inr' (integer, null if not mentioned), "
    "'suggested_price_range' (e.g., '₹1500 - ₹2500'), "
    "'suggested_usd_price' (numeric float/integer, e.g., 45.00), "
    "'export_description' (English description emphasizing artisanal heritage for global buyers), "
    "and 'tags' (array of 3-4 strings like 'Taant', 'Cotton'). "
    "No markdown."
)


async def generate_product_listing(
    image_bytes: bytes,
    image_mime: str,
    audio_bytes: bytes,
    audio_mime: str
) -> dict:
    """Send one image + audio to Gemini. Returns parsed JSON dict."""
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Vernacular AI E-Commerce Enabler",
        "Content-Type": "application/json",
    }

    payload = {
        "model": MODEL,
        "response_format": {"type": "json_object"},
        "max_tokens": 800,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Analyze the attached product image and audio description."},
                    {"type": "image_url", "image_url": {"url": f"data:{image_mime};base64,{image_b64}"}},
                    {"type": "image_url", "image_url": {"url": f"data:{audio_mime};base64,{audio_b64}"}},
                ],
            },
        ],
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(OPENROUTER_URL, headers=headers, json=payload, timeout=60.0)
        except Exception as net_err:
            raise Exception(f"AI service connection failed: {net_err}")

        if response.status_code != 200:
            raise Exception(f"OpenRouter Gemini Error ({response.status_code}): {response.text}")

        data = response.json()
        try:
            result_text = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as parse_err:
            raise Exception(f"Unexpected AI response format: {parse_err}")

        # Strip any accidental markdown fences
        clean = result_text.strip()
        for fence in ("```json", "```"):
            if clean.startswith(fence):
                clean = clean[len(fence):]
        if clean.endswith("```"):
            clean = clean[:-3]

        try:
            parsed = json.loads(clean.strip())
        except json.JSONDecodeError:
            # Fallback safe dict if JSON had syntax irregularities
            parsed = {
                "ai_title_en": "Handcrafted Indian Handloom Creation",
                "ai_title_local": "হস্তনির্মিত ভারতীয় তাঁত সৃষ্টি",
                "ai_desc_en": "Authentic master weave handloom piece created with traditional artisanal technique.",
                "ai_desc_local": "ঐতিহ্যবাহী তাঁত শিল্পীদের দ্বারা নির্মিত হস্তনির্মিত খাঁটি সৃষ্টি।",
                "price_inr": 1500,
                "suggested_price_range": "₹1500 - ₹2500",
                "suggested_usd_price": 35.00,
                "export_description": "Certified living heritage Indian handloom hand-woven by generational rural weavers.",
                "tags": ["Handloom", "Artisan", "Heritage"],
            }

        # Ensure structured translations dictionary exists with all three languages (en, bn, hi)
        translations = parsed.get("translations")
        if not isinstance(translations, dict):
            translations = {}

        title_dict = translations.get("title") if isinstance(translations.get("title"), dict) else {}
        desc_dict = translations.get("description") if isinstance(translations.get("description"), dict) else {}

        en_title = title_dict.get("en") or parsed.get("ai_title_en") or "Handcrafted Indian Handloom Creation"
        bn_title = title_dict.get("bn") or parsed.get("ai_title_local") or "হস্তনির্মিত ভারতীয় তাঁত সৃষ্টি"
        hi_title = title_dict.get("hi") or "हस्तनिर्मित भारतीय हथकरघा वस्त्र"

        en_desc = desc_dict.get("en") or parsed.get("ai_desc_en") or "Authentic master weave handloom piece created with traditional artisanal technique."
        bn_desc = desc_dict.get("bn") or parsed.get("ai_desc_local") or "ঐতিহ্যবাহী তাঁত শিল্পীদের দ্বারা নির্মিত হস্তনির্মিত খাঁটি সৃষ্টি।"
        hi_desc = desc_dict.get("hi") or "पारंपरिक कारीगरों द्वारा निर्मित प्रामाणिक हथकरघा उत्कृष्ट कृति।"

        parsed["translations"] = {
            "title": {"en": en_title, "bn": bn_title, "hi": hi_title},
            "description": {"en": en_desc, "bn": bn_desc, "hi": hi_desc},
        }
        parsed["ai_title_en"] = en_title
        parsed["ai_title_local"] = bn_title
        parsed["ai_desc_en"] = en_desc
        parsed["ai_desc_local"] = bn_desc

        return parsed


TRANSLATE_SYSTEM_PROMPT = (
    "You are a professional multilingual cataloger for Indian handlooms. "
    "Translate and enrich the given product title and description simultaneously into: "
    "1. English ('en') "
    "2. Bengali ('bn') "
    "3. Hindi ('hi') "
    "Output ONLY a strict JSON object with this exact structure: "
    "{\n"
    '  "title": { "en": "...", "bn": "...", "hi": "..." },\n'
    '  "description": { "en": "...", "bn": "...", "hi": "..." }\n'
    "}\n"
    "No markdown fences, no explanatory text."
)


async def translate_existing_product_text(title: str, description: str) -> dict:
    """Generate multilingual translations (en, bn, hi) for existing catalog listings."""
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://vernacular-storefront.onrender.com",
        "X-Title": "Vernacular AI Backfill Translator",
        "Content-Type": "application/json",
    }

    prompt = f"Product Title: {title or 'Handloom Creation'}\nProduct Description: {description or 'Handcrafted authentic handloom weave.'}"

    payload = {
        "model": MODEL,
        "response_format": {"type": "json_object"},
        "max_tokens": 600,
        "messages": [
            {"role": "system", "content": TRANSLATE_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(OPENROUTER_URL, headers=headers, json=payload, timeout=30.0)
            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"].strip()
                for fence in ("```json", "```"):
                    if content.startswith(fence):
                        content = content[len(fence):]
                if content.endswith("```"):
                    content = content[:-3]
                parsed = json.loads(content.strip())
                if isinstance(parsed, dict) and "title" in parsed and "description" in parsed:
                    return parsed
        except Exception as e:
            print(f"Notice: Multilingual translation API call fallback: {e}")

    # Safe fallback
    return {
        "title": {
            "en": title or "Handcrafted Indian Handloom Creation",
            "bn": title or "হস্তনির্মিত ভারতীয় তাঁত সৃষ্টি",
            "hi": title or "हस्तनिर्मित भारतीय हथकरघा वस्त्र",
        },
        "description": {
            "en": description or "Authentic master weave handloom piece created with traditional artisanal technique.",
            "bn": description or "ঐতিহ্যবাহী তাঁত শিল্পীদের দ্বারা নির্মিত হস্তনির্মিত খাঁটি সৃষ্টি।",
            "hi": description or "पारंपरिक कारीगरों द्वारा निर्मित प्रामाणिक हथकरघा उत्कृष्ट कृति।",
        },
    }


SEARCH_SYSTEM_PROMPT = (
    "You are a conversational search query parser for Vernacular AI, an Indian handloom marketplace. "
    "Parse the user's spoken voice search query which may be in English, Bengali, Hindi, or mixed vernacular. "
    "Extract structured e-commerce filter parameters into a strict JSON object with these exact keys: "
    "1. 'craft': one of ['Jamdani', 'Taant', 'Silk', 'Khadi', 'Baluchari'] if identified, else null. "
    "2. 'region': e.g., 'Nadia', 'Murshidabad', 'Hooghly', 'Birbhum', 'Shantipur', 'Phulia', or null. "
    "3. 'max_price': integer maximum budget in INR (e.g. 3500) if the user mentioned a budget or price limit, else null. "
    "4. 'color': main color keyword in English (e.g., 'Red', 'Blue', 'White', 'Black', 'Yellow', 'Green') or null. "
    "5. 'keywords': list of 1-3 descriptive keywords (e.g. ['cotton', 'wedding', 'summer']). "
    "Output ONLY valid JSON. No markdown fences."
)


async def parse_search_intent(query: str, language: str = "en") -> dict:
    """Parse spoken voice queries into structured marketplace filter intent."""
    if not query or not query.strip():
        return {"craft": None, "region": None, "max_price": None, "color": None, "keywords": []}

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://vernacular-storefront.onrender.com",
        "X-Title": "Vernacular AI Voice Search",
        "Content-Type": "application/json",
    }

    payload = {
        "model": MODEL,
        "response_format": {"type": "json_object"},
        "max_tokens": 250,
        "messages": [
            {"role": "system", "content": SEARCH_SYSTEM_PROMPT},
            {"role": "user", "content": f"Language: {language}\nSpoken Query: {query}"},
        ],
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(OPENROUTER_URL, headers=headers, json=payload, timeout=15.0)
            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"].strip()
                for fence in ("```json", "```"):
                    if content.startswith(fence):
                        content = content[len(fence):]
                if content.endswith("```"):
                    content = content[:-3]
                parsed = json.loads(content.strip())
                return {
                    "craft": parsed.get("craft"),
                    "region": parsed.get("region"),
                    "max_price": parsed.get("max_price"),
                    "color": parsed.get("color"),
                    "keywords": parsed.get("keywords") or [],
                }
        except Exception as e:
            print(f"Notice: Gemini intent parsing fallback: {e}")

    # Fallback heuristic parser
    q_lower = query.lower()
    craft = None
    for c in ["Jamdani", "Taant", "Silk", "Khadi", "Baluchari"]:
        if c.lower() in q_lower:
            craft = c
            break

    region = None
    for r in ["Nadia", "Murshidabad", "Hooghly", "Birbhum", "Shantipur", "Phulia"]:
        if r.lower() in q_lower:
            region = r
            break

    return {"craft": craft, "region": region, "max_price": None, "color": None, "keywords": [query.strip()]}

