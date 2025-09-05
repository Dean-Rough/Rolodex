# DEVELOPMENT.md – Rolodex

## 1. Local Setup
- See [BUILD.md](./BUILD.md) for step-by-step onboarding.
- Use Node.js v20+, Python 3.10+, PostgreSQL 15+.
- Use a Python virtualenv for backend deps.
- Copy `.env.example` to `.env` and fill in secrets (see below).

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
- **Frontend**: jest-extended, jest-environment-jsdom, @playwright/test
- **Backend**: pytest, coverage
- 100% test coverage required

## 5. CI/CD
- GitHub Actions for lint, type-check, test, and build
- Deploy to Fly.io (backend) and Vercel/Netlify (frontend)

## 6. Secrets & Env
- Never commit secrets. Use `.env` (gitignored).
- Backend DB: set `DATABASE_URL` (fallback `SUPABASE_DB_URL` also supported).
- Frontend API base: set `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local`.
- See `.env.example` for required keys (DB, OpenAI, storage, Supabase/Clerk, etc.)

## 7. Troubleshooting
- Common issues and fixes:
  - Port conflicts: change in `.env`
  - DB connection: check Postgres is running
  - Extension not loading: check Chrome logs
- Ask in #dev-support or ping Dean 
