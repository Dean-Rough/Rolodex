# Rolodex 10/10 Remediation Plan — Ultra‑Granular Checklist

Objective: Drive every subsystem (auth, API, DB, UI, extension, testing, CI/CD, security, perf) to 10/10. Tasks are grouped by priority with explicit steps, commands, code targets, acceptance criteria (AC), and QA.

Legend: P0 = Critical, P1 = High, P2 = Medium, P3 = Polish. DRI = directly responsible individual.

## P0 — Critical (Security/Reliability Blockers)

1) Backend: Fix DB env var resolution (import‑time failure)
- Files: `backend/main.py`
- Steps:
  1. Add fallback to `DATABASE_URL`; add preflight check; enable `pool_pre_ping=True`.
  2. Guard engine creation if URL missing; raise explicit error.
- Snippet:
  """
  DATABASE_URL = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")
  if not DATABASE_URL:
      raise RuntimeError("DATABASE_URL is required")
  engine = create_engine(DATABASE_URL, pool_pre_ping=True)
  """
- AC: `uvicorn backend.main:app --reload` boots when only `DATABASE_URL` set; health check works.
- QA: `curl -s localhost:8000/ | jq .` returns `{status: ok}` (after DB available).

2) Backend: CORS for Web + Extension
- Files: `backend/main.py`
- Steps:
  1. `from fastapi.middleware.cors import CORSMiddleware`
  2. Add middleware: allow origins `http://localhost:3000`, `https://*.rolodex.app`.
- AC: Browser requests from Next app and extension succeed without CORS errors.
- QA: Use browser console + `curl -H "Origin: http://localhost:3000" -I http://localhost:8000/` shows CORS headers.

3) Backend: Secure `POST /api/items` with JWT
- Files: `backend/main.py`, `backend/requirements.txt`
- Steps:
  1. Choose provider (Supabase JWT or Clerk). Start with Bearer JWT verify stub (pydantic/jose) → map to `owner_id`.
  2. Validate payload (`img_url: HttpUrl`), sanitize; return 201 on success.
  3. Reject unauthenticated (401) and invalid (422) requests.
- AC: Unauthed write → 401; Authed write → row inserted with `owner_id`.
- QA: `curl -H "Authorization: Bearer <token>" -d '{"img_url":"https://..."}' ...` passes; DB shows owner.

4) Extension (legacy) deprecate or quarantine
- Files: `extension/`, root docs
- Steps:
  1. Add `extension/README.md` marking dev‑only; or move to `legacy/extension/`.
  2. Ensure packaging/links reference only `extension-v2.0.0/`.
- AC: No production artifact references legacy extension.
- QA: Grep repo for `extension/` usage in docs and scripts.

5) Extension v2: Popup uses env config (no localhost hardcode)
- Files: `extension-v2.0.0/popup.html`, `extension-v2.0.0/popup.js` (new)
- Steps:
  1. Add `<script src="config.js"></script>` and new `popup.js` to compute web app URL.
  2. Replace `<a href="http://localhost:3000">` with `<a id="open-app" href="#">` and set via script.
- Snippet (popup.js):
  """
  (async () => { const cfg = new RolodexConfig();
    const href = await cfg.getWebAppUrl();
    const a = document.getElementById('open-app'); a.href = href; a.textContent = 'Open Rolodex Web App'; })();
  """
- AC: Popup opens correct env (dev/staging/prod) based on availability.
- QA: Load unpacked → click link; inspect logs.

6) Frontend: Fix failing unit test copy mismatch
- Files: `frontend/__tests__/page.test.tsx` (or `frontend/app/page.tsx`)
- Steps:
  1. Update test to match actual copy or extract copy to constants and reuse.
  2. Run tests.
- Commands: `cd frontend && npm test`
- AC: Tests pass locally.

7) Frontend: Pin critical deps for reproducibility
- Files: `frontend/package.json`
- Steps:
  1. Replace `"latest"` with pinned versions (e.g., next `14.x`, react `18.3.1`, typescript `5.x`).
  2. `npm i && npm run build` to verify lockfile.
- AC: Deterministic build (`npm ci`) succeeds.

8) Git hygiene: Ignore build artifacts and tsbuildinfo
- Files: `frontend/.gitignore`
- Steps: Add `.next/`, `out/`, `coverage/`, `*.tsbuildinfo`.
- AC: `git status` clean after build/export.

9) Env normalization: Doc + examples consistent
- Files: `.env.example`, `BUILD.md`, `DEVELOPMENT.md`
- Steps:
  1. Replace Vite variables with Next patterns (`NEXT_PUBLIC_*`).
  2. Document `DATABASE_URL` (primary) and optional `SUPABASE_DB_URL`.
- AC: Fresh clone can set envs and start FE/BE without guesswork.

## P1 — High (Feature Parity + Correctness)

10) API: `/health` endpoint for extension env detection
- Files: `backend/main.py`
- Steps: Add GET `/health` returning `{status:'ok', db:'connected'}`.
- AC: `config.js` health checks succeed (dev/staging/prod).

11) API: Items search/read with pagination
- Files: Backend routers/schemas (add `backend/schemas.py` if desired)
- Steps:
  1. Implement `GET /api/items?query=&hex=&price_max=&limit=&cursor=`.
  2. Validate params; cap limit; return `items`, `nextCursor`.
- AC: Filtered results consistent; documented types.

12) API: Consistent error envelope + handlers
- Files: `backend/main.py`
- Steps: Add exception handlers for 422/404/500 → `{error:{code,message}}`.
- AC: No raw SQL/errors leaked; clients receive consistent shape.

13) DB: Indexes for common filters
- Files: `docs/schema.sql` (add migration snippet)
- Steps: Create indexes on `items(created_at)`, `items(vendor)`, `items(colour_hex)`, optional trigram on `title`.
- AC: Queries <100ms on 10k rows (local).

14) Extension v2: Auth handshake
- Files: `extension-v2.0.0/background.js`, `config.js`, FE route `/auth/extension`
- Steps:
  1. Add message action `authenticate` → open web app `/auth/extension`.
  2. FE route sets token into `chrome.storage` via `chrome.runtime.sendMessage` callback.
  3. Store token with hash+timestamp (already in `SecureStorage`).
- AC: After login, `checkAuth` returns true; token rotates on expiry.

15) Frontend scaffold: Components/lib/routes
- Files: `frontend/components/*`, `frontend/lib/api.ts`, `frontend/app/(dashboard)/*`, `frontend/app/auth/extension/page.tsx`
- Steps: Create minimal components, API client with base URL, and routes.
- AC: `/dashboard` renders scaffold; `/auth/extension` completes handshake.

16) FE Security headers (static export)
- Files: `frontend/next.config.js` or hosting config
- Steps: Add headers: CSP, `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy`.
- AC: Verified in deployed/static preview.

## P2 — Medium (Quality/Scalability/UX)

17) API: `/api/extract` scaffold
- Files: `backend/main.py` (or `routers/extract.py`), `schemas.py`
- Steps: Define request/response models; return deterministic mock until AI integrated.
- AC: Validates inputs; unit tests green.

18) Projects CRUD + associations
- Files: Backend routers; DB tables exist.
- Steps: Implement create/get/add_item/remove_item with auth checks and 404/403 handling.
- AC: Endpoints tested; constraints enforced.

19) Pagination & rate limits
- Files: Backend
- Steps: Enforce max limit; add simple rate limiting (e.g., slowapi) to write endpoints.
- AC: Excessive writes → 429; stable pagination semantics documented.

20) Frontend: Items grid + search UI
- Files: `frontend/components/ItemsGrid.tsx`, pages under dashboard
- Steps: Grid with loading/error/empty states; debounced search; filter chips.
- AC: Keyboard accessible; passes basic a11y checks.

21) Frontend: State with React Query
- Files: `frontend/lib/query.ts`, providers
- Steps: Configure query client; retries/backoff; cache invalidation on mutations.
- AC: Network resiliency improved; fewer refetches.

22) Testing: FE+BE unit/integration
- Files: `backend/tests/*`, `frontend/__tests__/*`
- Steps: Add 10–15 API tests; 10+ FE tests for components and API client.
- AC: Coverage ≥90% with thresholds; CI enforced.

23) e2e: Playwright smoke
- Files: `frontend/tests/*`
- Steps: Test auth (mock token), dashboard loads, item appears after API call.
- AC: Stable locally and in CI.

24) CI/CD: GitHub Actions
- Files: `.github/workflows/frontend-ci.yml`, `.github/workflows/backend-ci.yml`
- Steps: FE (lint, type, test, build), BE (pytest, build); cache deps.
- AC: Required checks for PRs; status visible on PRs.

## P3 — Polish (Perf, Observability, Docs, Release)

25) Observability: Structured logs + request IDs
- Files: Backend middleware/logging
- Steps: Log `{method,path,status,duration_ms,request_id}` JSON; add `X-Request-Id` echo.
- AC: Logs parseable; errors correlatable.

26) Performance: DB pool + timeouts
- Files: `backend/main.py`
- Steps: Tune `pool_size`, `max_overflow`, statement timeouts; profile heavy queries.
- AC: p95 < 150ms for list/search.

27) Security re‑audit: Extension + API
- Files: Extension manifest/permissions/CSP; backend headers
- Steps: Restrict `web_accessible_resources`; review host permissions; add API security headers.
- AC: Pass Chrome store checklist; OWASP top 10 basic mitigations.

28) Documentation alignment
- Files: `README.md`, `BUILD.md`, `DEVELOPMENT.md`, `AGENTS.md`
- Steps: Ensure commands, envs, routes accurate; add troubleshooting.
- AC: New dev completes setup <30 min with no blockers.

29) Release process: Semver + CHANGELOG + packaging
- Files: `CHANGELOG.md`, scripts
- Steps: Define release script; tag, changelog update; extension packaging doc.
- AC: Repeatable releases; artifacts archived.

---

## Command Appendix (for quick use)

Backend
- Dev: `cd backend && uvicorn backend.main:app --reload`
- Test: `pytest -q` (after adding tests)
- Health: `curl -s localhost:8000/health | jq .`

Frontend
- Dev: `cd frontend && npm run dev`
- Test: `npm test` | Type: `npm run type-check` | Lint: `npm run lint`
- E2E: `npm run test:e2e`

Extension v2
- Load unpacked: `chrome://extensions` → `extension-v2.0.0/`
- Logs: `chrome://extensions` → service worker logs

---

## Ownership & Sequencing (Suggested 4‑week plan)
- Week 1 (P0): 1–9
- Week 2 (P1): 10–16
- Week 3 (P2): 17–24
- Week 4 (P2→P3): 25–29

Gates: A (end P0), B (end P1), C (end P2), D (end P3) as described in ACs.
