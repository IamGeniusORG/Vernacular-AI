import asyncio
import os
import json
from app.services.ai_service import generate_product_listing

async def main():
    print("=== Testing OpenRouter Gemini Multimodal Service ===")
    
    # Paths to the sample files
    base_dir = r"C:\Users\IamTeddy\OneDrive\Desktop\IamGenius\Seva Innovation Challenge Project\Vernacular AI E-Commerce Enabler\Required Documents\Saree and audio"
    image_path = os.path.join(base_dir, "Sample Handloom Saree image.jpg")
    audio_path = os.path.join(base_dir, "Sample audio.mp3")
    
    print(f"Reading image from: {image_path}")
    with open(image_path, "rb") as f:
        image_bytes = f.read()
        
    print(f"Reading audio from: {audio_path}")
    with open(audio_path, "rb") as f:
        audio_bytes = f.read()
        
    print("Sending request to Gemini via OpenRouter (this may take a few seconds)...")
    try:
        result = await generate_product_listing(
            image_bytes=image_bytes, 
            image_mime="image/jpeg", 
            audio_bytes=audio_bytes, 
            audio_mime="audio/mp3"
        )
        print("\n--- AI Engine Response ---")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        print("--------------------------")
        print("\nSuccess! The AI correctly parsed the multimodal input.")
    except Exception as e:
        if hasattr(e, 'response'):
            print(f"\nOpenRouter API Error Response: {e.response.text}")
        else:
            import traceback
            traceback.print_exc()
        print(f"\nError: {e}")

if __name__ == "__main__":
    asyncio.run(main())
