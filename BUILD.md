# BUILD.md – Rolodex

> **Step-by-step onboarding/build checklist for new devs.**

---

## 1. Prerequisites
- [x] macOS (Ventura+) or Linux (WSL2 OK)
- [x] Node.js v20+ (`node -v`)
- [x] Python 3.10+ (`python3 --version`)
- [x] Supabase account & project
- [x] Chrome (for extension dev)
- [x] Git, GitHub account, SSH keys

---

## 2. Clone & Install
- [ ] Fork repo on GitHub
- [x] `git clone git@github.com:YOUR-USER/Rolodex.git`
- [x] `cd Rolodex`
- [x] `npm install` (in frontend/)
- [x] `python3 -m venv venv && source venv/bin/activate` (in backend/)
- [x] `pip install -r backend/requirements.txt`
- [x] Copy `.env.example` to `.env` and fill in secrets

---

## 3. Database & Auth (Supabase)
- [x] Create a Supabase project at https://app.supabase.com
- [x] Get your Project URL and anon/public API key
- [x] Add these to your `.env` and `frontend/.env` as `SUPABASE_URL` and `SUPABASE_KEY`
- [x] Open Supabase SQL editor and run the provided schema (see /docs/schema.sql)
- [x] Set up Supabase Auth (email/password or social providers)
- [ ] (Optional) Configure Row Level Security (RLS) and policies

---

## 4. Backend
- [x] Update backend config to use Supabase Postgres connection string
- [x] `uvicorn backend.main:app --reload`
- [x] Visit `http://localhost:8000/docs`

---

## 5. Frontend
- [x] `npm run dev` (in frontend/)
- [x] Visit `http://localhost:3000`
- [x] Confirm login screen loads

---

## 6. Browser Extension
- [x] Chrome → Extensions → Load unpacked → select `extension/`
- [x] Right-click image → “Save to MyLibrary” appears
- [x] Save image, check backend for new item

---

## 7. Testing
- [x] `npm run lint` (in frontend/)
- [x] `npm run type-check` (in frontend/)
- [x] `npm run test` (in frontend/)
- [x] `npx playwright test` (UI) - ✅ *Setup complete, 6 tests passing*

---

## 8. First PR
- [ ] `git checkout -b your-feature`
- [ ] Make a small change (e.g., update README)
- [ ] `git push origin your-feature`
- [ ] Open PR on GitHub, assign reviewer

---

## 9. Troubleshooting
- [x] See DEVELOPMENT.md for common issues
- [x] Ask in #dev-support or ping Dean

---

## 10. Done!
- [ ] Celebrate. You’re in. 