# USER To‑Do Checklist (Rolodex)

Goal: Verify the app end‑to‑end (extension → API → DB → web app) in dev, then prep for staging/prod.

## 1) Local Prereqs
- [ ] Install Chrome (for extension), Node 20+, Python 3.11+, PostgreSQL.
- [ ] Create database and set `DATABASE_URL` in `.env` (root).
- [ ] Apply schema: run SQL in `docs/schema.sql` on your DB.

## 2) Start Services
- [ ] Backend: `uvicorn backend.main:app --reload` (expects `DATABASE_URL`).
- [ ] Frontend: set `frontend/.env.local` with `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`, then `npm run dev`.
- [ ] Health check: open http://localhost:8000/health (should be `{status: "ok"}`).

## 3) Extension v2 Setup
- [ ] Load unpacked: `chrome://extensions` → Enable Developer Mode → Load `extension-v2.0.0/`.
- [ ] Open the extension popup and ensure the “Open Rolodex Web App” link points to your local app.

## 4) Dev Auth Handshake
- [ ] In Chrome, click the extension context menu (right‑click an image) once to trigger auth (it should prompt).
- [ ] When prompted (or proactively): visit `http://localhost:3000/auth/extension?token=dev-token`
- [ ] Page will store the token and redirect to `.../auth-success?token=dev-token`.
- [ ] Extension should capture the token and show a success notification.

## 5) Save an Item
- [ ] On any website, right‑click an image → “Save to Rolodex”.
- [ ] Expect a success notification (dev token used); verify in DB `items` table that a row is inserted.

## 6) Web App Verification
- [ ] Visit `http://localhost:3000/dashboard/items` (frontend uses the dev token) and confirm the saved item appears.

## 7) CI Checks
- [ ] Push a branch; verify GitHub Actions run for frontend and backend and pass.

## 8) Prep for Staging/Prod (Optional)
- [ ] Create `NEXT_PUBLIC_API_BASE_URL` for staging/prod; redeploy static site.
- [ ] Configure real JWT validation (Supabase/Clerk) and set auth keys.
- [ ] Replace dev token flow with a proper sign‑in flow.
- [ ] Review extension manifest host permissions for staging/prod domains only.
