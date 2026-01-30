# Rolodex SaaS Conversion Game Plan

## 1. Strategy & Market
**Goal:** Convert "internal tool" into a B2B SaaS for Interior Design firms.
**Value Prop:** "Pinterest meets Excel for Professionals." Save products in 1 click, auto-extract specs, generate client-ready schedules/moodboards.

### Target Pricing
- **Free Tier:** 50 items, 1 project (Hook).
- **Pro ($29/mo):** Unlimited items, 10 projects, AI auto-tagging.
- **Studio ($99/mo):** Teams, shared libraries, branded exports.

## 2. Technical Debt & Gaps
- **Auth:** Currently relies on demo tokens. Need proper JWT/OAuth (Supabase Auth or Clerk).
- **Multi-tenancy:** Backend likely assumes single-user or loose ownership. Need strict Row Level Security (RLS) or application-level tenant filtering.
- **Billing:** No payment infrastructure.
- **Deployment:** Localhost only. Need Docker + Cloud config (Railway/Render/AWS).
- **Extension:** Multiple versions exist (`extension`, `extension-v2.0.0`, `extension-v3-simplified`). Need to canonize one V3 codebase.

## 3. Action Plan (Beast Mode)

### Phase 1: Foundation (Today)
- [ ] **Dockerize:** Create `Dockerfile` for backend and frontend.
- [ ] **Database Multi-tenancy:** Audit `models.py` and enforce `user_id` on all critical tables.
- [ ] **Extension Cleanup:** Audit the 3 extension folders, deprecate old ones, polish the V3 manifest.
- [ ] **Config:** Create production-ready `.env.template`.

### Phase 2: SaaS Features (Next)
- [ ] Integrate Clerk/Supabase Auth.
- [ ] Add Stripe Webhooks handler.
- [ ] Implement Team/Workspace logic.

### Phase 3: Launch Prep
- [ ] Landing page (marketing).
- [ ] Chrome Web Store listing assets.
- [ ] Terms/Privacy docs.
