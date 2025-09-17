# DEVELOPMENT.md – Rolodex

## 1. Local Setup
- Use Node.js v20+, Python 3.11+.
- SQLite is now the default for local work. Postgres remains supported by setting `DATABASE_URL`.
- Create a Python virtual environment and install backend dependencies: `python3 -m venv .venv && source .venv/bin/activate && pip install -r backend/requirements.txt`.
- Install frontend dependencies: `npm install --prefix frontend`.
- Optional: copy `.env.example` to `.env` when wiring external services (Supabase, OpenAI).

## 2. Code Style & Conventions
- **Frontend**: Prettier, ESLint, TypeScript strict mode, Tailwind config.
- **Backend**: Black, isort, flake8, mypy.
- **Naming**: Clear, descriptive, no abbreviations.
- **No magic numbers, no TODOs, no debug cruft.**

## 3. Branching & PRs
- Use feature branches: `feature/short-desc`
- PRs must pass lint, type-check, and tests before merge.
- Use conventional commits for messages.

## 4. Testing
- **Backend**: `pytest backend/tests` (covers health, items, projects). SQLite fixtures are created automatically.
- **Frontend**: `npm run lint`, `npm test`, `npm run test:e2e` (Playwright) – ensure `NEXT_PUBLIC_API_BASE_URL` is set for networked tests.
- Aim for 100% coverage where practical. Update fixtures or demo data when UI copy changes.

## 5. CI/CD
- GitHub Actions for lint, type-check, test, and build
- Deploy to Fly.io (backend) and Vercel/Netlify (frontend)

## 6. Secrets & Env
- Never commit secrets. `.env` and `frontend/.env.local` remain gitignored.
- Backend: `DATABASE_URL` is optional – defaults to `sqlite:///./var/rolodex.db`. Set `ROLODEX_SEED_DEMO=0` to disable demo data.
- Capture deep links: configure `ROLODEX_CAPTURE_BASE_URL`, `ROLODEX_CAPTURE_STAGING_BASE_URL`, and `ROLODEX_CAPTURE_DEVELOPMENT_BASE_URL` if the default app domains differ in your environment. These feed the extension deep-link endpoint.
- Frontend: configure `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_DEMO_TOKEN` for local dev. Real auth providers can be wired later.
- Optional services: `OPENAI_API_KEY` (embeddings), `SUPABASE_PROJECT_URL`/`SUPABASE_SERVICE_ROLE_KEY` (storage uploads).

## 7. Troubleshooting
- **Backend fails to start** – ensure Python 3.11+, and remove stale `var/rolodex.db` if migrations drift. Run `rm -rf var && uvicorn backend.main:app --reload` to rebuild.
- **Tests reuse cached settings** – call `from backend.core.config import get_settings; get_settings.cache_clear()` when toggling env vars.
- **Frontend cannot reach API** – verify `NEXT_PUBLIC_API_BASE_URL` and that CORS allows your origin (see `ROLODEX_CORS_ORIGINS`).
- **Extension packaging** – see [extension/README.md](extension/README.md) for MV3 lint/package scripts.
