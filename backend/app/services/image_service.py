import io
import asyncio
from typing import Optional
from PIL import Image

_rembg_session = None

def _get_rembg_session():
    """Lazy initialize the lightweight u2netp model session."""
    global _rembg_session
    if _rembg_session is None:
        try:
            from rembg import new_session
            # u2netp is the ultra-lightweight mobile model (~4MB vs ~176MB standard u2net)
            # Fits comfortably within Render 512MB RAM budget
            _rembg_session = new_session("u2netp")
        except Exception as e:
            print(f"Warning: Failed to initialize u2netp session: {e}")
            _rembg_session = False
    return _rembg_session if _rembg_session is not False else None


def _remove_bg_sync(image_bytes: bytes) -> bytes:
    """Synchronous CPU worker for background removal."""
    session = _get_rembg_session()
    if session is None:
        return image_bytes

    from rembg import remove

    # 1. Open input image with PIL and resize if excessively huge to conserve RAM
    input_img = Image.open(io.BytesIO(image_bytes))
    max_dim = 1200
    if max(input_img.size) > max_dim:
        input_img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

    # 2. Convert to RGBA bytes
    buf = io.BytesIO()
    input_img.save(buf, format="PNG")
    png_bytes = buf.getvalue()

    # 3. Extract transparent foreground using u2netp
    nobg_bytes = remove(png_bytes, session=session)
    nobg_img = Image.open(io.BytesIO(nobg_bytes)).convert("RGBA")

    # 4. Paste over boutique warm cream e-commerce background (#F9F8F6 / RGB 249, 248, 246)
    clean_bg = Image.new("RGBA", nobg_img.size, (249, 248, 246, 255))
    composite = Image.alpha_composite(clean_bg, nobg_img).convert("RGB")

    # 5. Compress to JPEG
    output_buf = io.BytesIO()
    composite.save(output_buf, format="JPEG", quality=90, optimize=True)
    return output_buf.getvalue()


async def remove_background_with_fallback(image_bytes: bytes, timeout_seconds: float = 3.5) -> bytes:
    """
    Remove background and replace with boutique studio cream background.
    Protected with a strict 3.5s circuit breaker timeout to guarantee zero hangs.
    If timeout or error occurs, gracefully falls back to raw image bytes.
    """
    try:
        # Offload CPU-bound image processing to thread pool with timeout
        return await asyncio.wait_for(
            asyncio.to_thread(_remove_bg_sync, image_bytes),
            timeout=timeout_seconds,
        )
    except asyncio.TimeoutError:
        print(f"Notice: Background removal circuit breaker triggered (> {timeout_seconds}s). Preserving original photo.")
        return image_bytes
    except Exception as e:
        print(f"Notice: Background removal fallback triggered: {e}. Preserving original photo.")
        return image_bytes
