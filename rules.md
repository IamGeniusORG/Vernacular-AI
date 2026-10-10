# Codebase Laws

## 1. Directory Structure
```text
/
├── frontend/             # Next.js Application
│   ├── src/app/          # App router pages
│   ├── src/components/   # Reusable UI components
│   └── src/lib/          # API utilities and helpers
├── backend/              # Python FastAPI
│   ├── app/
│   │   ├── api/          # Route handlers
│   │   ├── core/         # Config, security, database setup
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── schemas/      # Pydantic validation schemas
│   │   └── services/     # AI integration logic (OpenRouter)
│   ├── requirements.txt
│   └── main.py
└── README.md

```

## 2. Conventions

* **Frontend:** Strict TypeScript. Use Tailwind utility classes. Components must be functional and use Hooks.
* **Backend:** Type hints required for all Python functions. Pydantic models for request/response validation.
* **API Design:** RESTful principles. All endpoints prefixed with `/api/v1/`.

## 3. Security

* **No hardcoded secrets:** All API keys (`OPENROUTER_API_KEY`, `DATABASE_URL`) must be in `.env` and added to `.gitignore`.
* **CORS:** Backend must strictly configure CORS to only accept requests from the Vercel frontend domain and `localhost`.

## 4. Testing (Pilot Phase)

* Manual unit testing for the AI integration route (ensure Gemini correctly parses Bengali audio and handloom images before wiring the UI).
