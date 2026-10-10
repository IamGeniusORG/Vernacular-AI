# Product Requirements Document (PRD)
**Project:** Vernacular AI E-Commerce Enabler
**Category:** Employment, Livelihood & MSMEs
**Target Persona:** Rural handloom weavers and artisans in Shantipur/Phulia, Nadia, West Bengal (Junior Category/Solo Developer).

## 1. Core Logic
The application eliminates the digital literacy and language barriers preventing rural artisans from selling online. A user uploads a smartphone photo of their product and speaks a 10-second description in Bengali. The system uses AI to parse the image and audio, generating an English and localized Bengali product catalog listing, which is then exportable as a clean WhatsApp link to bypass wholesalers.

## 2. Target Personas
*   **Primary User:** Traditional Taant/Jamdani weaver. Has a smartphone and WhatsApp, but lacks English typing skills, SEO knowledge, and professional photography equipment. 
*   **Secondary User:** Urban boutique owner or retail buyer who receives the structured WhatsApp link.

## 3. Absolute Must-Have Features (MVP for Hackathon)
*   **"Zero-Typing" UI:** Three main actions only (Snap Photo, Record Voice, Generate). No text inputs required from the user.
*   **Multimodal AI Processing:** Route an image and an audio file (Bengali) through a single AI pipeline to extract intent, price, tags, and generate SEO descriptions.
*   **Database Persistence:** Store generated product cards per artisan.
*   **One-Click WhatsApp Export:** Generate a pre-formatted WhatsApp message containing the product details and a unique ID.
