# Repository Guidelines

## Project Structure & Module Organization
- `frontend/`: Next.js (app router) + TypeScript + Tailwind. Pages in `frontend/app/` (e.g., `app/page.tsx`).
- `backend/`: FastAPI entrypoint `backend/main.py`, Python deps in `backend/requirements.txt`.
- `extension/` and `extension-v2.0.0/`: Chrome MV3 code and packaged v2 assets.
- `docs/`: DB schema (`docs/schema.sql`) and architecture notes. Other root docs: `BUILD.md`, `DEVELOPMENT.md`, `ARCHITECTURE.md`.

## Build, Test, and Development Commands
- Frontend dev: `cd frontend && npm run dev` → http://localhost:3000
- Frontend build/start: `npm run build && npm start`
- Frontend quality: `npm run lint`, `npm run type-check`, `npm test`, `npm run test:e2e` (Playwright)
- Backend dev: `cd backend && uvicorn backend.main:app --reload` → http://localhost:8000/docs (`/health`, `/api/items`, `/api/projects`)
- Backend env: `python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`

## Coding Style & Naming Conventions
- Frontend: ESLint + Prettier, TypeScript strict. Files: `kebab-case.tsx`; React components `PascalCase`; variables `camelCase`.
- Backend: Black, isort, flake8, mypy. Python files and symbols `snake_case`; 4-space indent.
- No magic numbers; clear names; remove dead/debug code before commit.

## Testing Guidelines
- Frontend unit: Jest in `frontend/__tests__` (`*.test.ts|tsx`). Run: `npm test`.
- Frontend e2e: Playwright tests in `frontend/tests/`. Run: `npm run test:e2e`.
- Backend: pytest + coverage (`pytest --cov`). Place tests under `backend/tests/` (e.g., `test_health.py`).
- Target coverage: 100% (see DEVELOPMENT.md). Fail builds under threshold.

## Commit & Pull Request Guidelines
- Branches: `feature/short-desc`, `fix/short-desc`.
- Conventional Commits: e.g., `feat(frontend): add item grid`, `fix(api): handle null price`.
- PRs must pass lint, type, tests; include brief description, linked issue, and screenshots for UI changes.

## Security & Configuration Tips
- Secrets: never commit. Copy `.env.example` → `.env`.
- Supabase: set `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` (frontend). Backend DB via `DATABASE_URL` (fallback `SUPABASE_DB_URL`). Apply schema from `docs/schema.sql`.
- JWT: Set `SUPABASE_JWT_SECRET` or `JWT_SECRET` (dev) to enable backend JWT verification.
- Review `ARCHITECTURE.md` before significant changes.
