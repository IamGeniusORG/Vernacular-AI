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
    "Output ONLY a strict JSON object with these keys: "
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
        response = await client.post(OPENROUTER_URL, headers=headers, json=payload, timeout=60.0)

        if response.status_code != 200:
            raise Exception(f"OpenRouter API Error {response.status_code}: {response.text}")

        data = response.json()
        result_text = data["choices"][0]["message"]["content"]

        # Strip any accidental markdown fences
        clean = result_text.strip()
        for fence in ("```json", "```"):
            if clean.startswith(fence):
                clean = clean[len(fence):]
        if clean.endswith("```"):
            clean = clean[:-3]

        return json.loads(clean.strip())
