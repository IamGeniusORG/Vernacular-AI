# Living Scratchpad

## Current Status
*   **Date:** October 2026.
*   **Action:** Initialized the 6-pillar framework for the Seva First Innovation Challenge prototype. Proposal submitted successfully under Junior category (Application: SFIC-WB-0094).
*   **Current Focus:** Moving into Phase 1 (Environment setup).

## Architectural Trade-offs & Decisions
*   **Audio Processing:** We are choosing to handle speech-to-text directly through Gemini Multimodal (via OpenRouter) rather than a separate Whisper pipeline. Trade-off: Saves API calls and backend complexity, but we must strictly prompt Gemini to transcribe and translate Bengali accurately.
*   **Authentication:** Skipping complex JWT/OAuth for now. Identifying users purely via `phone_number` lookup to simplify the UX for the hackathon pilot.

## Edge Cases to Watch
*   **Large Image Uploads:** Need to compress images on the frontend (Next.js) before sending to FastAPI to prevent long upload times on rural 3G networks.
*   **Audio Format Compatibility:** Browsers record audio in `.webm`. Need to ensure the FastAPI backend and OpenRouter accept this format natively or implement lightweight conversion.
