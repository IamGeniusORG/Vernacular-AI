# Design Contracts

## 1. UI/UX Design Language
*   **Mobile-First:** Target 360x640 resolution (standard rural smartphone).
*   **Typography:** Large, highly legible sans-serif fonts. Use universal icons for actions (Camera, Mic, Send) rather than text labels where possible.
*   **Color Palette:** High contrast. Primary action buttons should be distinct (e.g., standard WhatsApp green for the share button to build trust).

## 2. Database Schema (PostgreSQL core)
*   **`artisans`:** `artisan_id` (UUID), `full_name`, `phone_number` (Unique/Login), `district`, `preferred_language`.
*   **`products`:** `product_id` (UUID), `artisan_id` (FK), `raw_image_url`, `ai_title_en`, `ai_title_local`, `ai_desc_local`, `price_inr`, `tags` (JSONB), `whatsapp_share_hash`.

## 3. API Contract (Generate Listing)
*   **Endpoint:** `POST /api/v1/products/generate`
*   **Request Payload (multipart/form-data):**
    *   `artisan_id`: string (UUID)
    *   `image`: File Blob (jpeg/png)
    *   `audio`: File Blob (webm/mp3)
*   **Response Payload (JSON):**
    ```json
    {
      "status": "success",
      "data": {
         "product_id": "uuid",
         "ai_title_local": "লাল এবং সাদা ফুলিয়া सूती (Cotton) তাঁত",
         "ai_title_en": "Red and White Phulia Cotton Taant Saree",
         "price_inr": 850,
         "tags": ["Taant", "Cotton", "Red", "Handloom"],
         "whatsapp_link": "[https://wa.me/?text=](https://wa.me/?text=)..."
      }
    }
    ```
