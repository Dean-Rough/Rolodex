# Rolodex 4.0

> **Right-click any product image on the web → AI captures, tags, and stores it in your personal, searchable FF&E library, ready to drop into client projects or auto-generated mood boards.**

---

## Overview
Rolodex is an internal tool for designers to capture, organize, and search FF&E (Furniture, Fixtures & Equipment) products from anywhere on the web. It leverages AI for data extraction, color analysis, and moodboard generation, with a focus on immaculate UI/UX and extensibility.

- **Browser Extension**: Save products with a right-click.
- **Web App**: Search, organize, and export moodboards.
- **Backend**: FastAPI, PostgreSQL + pgvector, OpenAI/CLIP for AI extraction.
- **UI**: React, Tailwind, shadcn/ui, Geist/Geist Mono, dark mode, Framer Motion.

---

## Quickstart

1. **Clone & install**
   ```bash
   git clone https://github.com/rolodexhq/rolodex.git
   cd Rolodex
   python3 -m venv .venv && source .venv/bin/activate
   pip install -r backend/requirements.txt
   npm install --prefix frontend
   ```
2. **Run the backend** – no secrets required for local work. SQLite is provisioned automatically and seeded with demo data.
   ```bash
   export ROLODEX_SEED_DEMO=1
   uvicorn backend.main:app --reload
   ```
3. **Run the frontend** – point the UI at the local API and use the demo bearer token.
   ```bash
   export NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   export NEXT_PUBLIC_DEMO_TOKEN=demo-token-12345
   npm --prefix frontend run dev
   ```
4. **Explore the capture workspace** at http://localhost:3000/capture and the library at http://localhost:3000/.
5. For full context review [4.0-build-programme.md](./4.0-build-programme.md), [DEVELOPMENT.md](./DEVELOPMENT.md), and [BUILD.md](./BUILD.md).

### Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | Override database connection string (Postgres or SQLite). | Auto-created SQLite file `./var/rolodex.db` |
| `ROLODEX_SEED_DEMO` | Seed demo items/projects on startup. | `1` (enabled for SQLite) |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend → backend base URL. | `http://localhost:8000` |
| `NEXT_PUBLIC_DEMO_TOKEN` | Demo bearer token for local UI flows. | `demo-token-12345` |
| `OPENAI_API_KEY` | Optional embedding support. | unset |
| `SUPABASE_PROJECT_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Optional storage uploads. | unset |

---

## Stack
- **Frontend**: React, Tailwind, shadcn/ui, Framer Motion, Geist/Geist Mono
- **Backend**: FastAPI, PostgreSQL, pgvector, OpenAI/CLIP
- **Extension**: Chrome Manifest V3
- **Storage**: Supabase Storage or AWS S3

---

## Features
- Lightweight Chrome extension trigger handing off to the `/capture` workspace
- `/capture` experience with editable metadata, AI enrichment preview, and submission to the API
- Library page wired to FastAPI with filtering, semantic search fallback, and graceful demo data
- Project creation and item linking endpoints with SQLite/Postgres compatibility
- Immaculate, accessible UI/UX ready for production polish

---

- [4.0-build-programme.md](./4.0-build-programme.md): Step-by-step delivery plan
- [BUILD.md](./BUILD.md): Step-by-step onboarding/build guide
- [PRD.md](./PRD.md): Product requirements
- [ARCHITECTURE.md](./ARCHITECTURE.md): System design
- [DEVELOPMENT.md](./DEVELOPMENT.md): Dev workflow
- [USER_TODO.md](./USER_TODO.md): Manual verification scripts
- [CHANGELOG.md](./CHANGELOG.md): Version history
- [ROADMAP.md](./ROADMAP.md): Upcoming features
- [UIUX.md](./UIUX.md): UI/UX principles and design system

---

## License
Internal use only. Not for commercial distribution (yet). 
