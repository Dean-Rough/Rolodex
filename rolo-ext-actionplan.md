# Rolodex Extension Revamp – Action Plan

## Guiding principles
1. **Lightweight launcher** – The extension only captures context and routes users to the `/capture` web workspace; no business logic or AI lives in the service worker.
2. **Chrome-first compliance** – Minimal permissions, strict CSP, https-only endpoints, clear privacy messaging, and packaging assets required for Chrome Web Store review.
3. **Designer-grade polish** – Popup and onboarding reflect Rolodex brand typography, colour, and motion standards while communicating status and next steps.
4. **Operational readiness** – Shared tooling (TypeScript, ESLint, tests), versioning, and documentation make shipping updates predictable and auditable.

## Phase 1 – Consolidate foundations (Week 1)
- Archive `extension/` prototype and migrate active work into a single `extension` package with git history noted.
- Define extension TypeScript + Vite (or ESBuild) tooling to compile background, popup, and content modules with shared lint/format rules.
- Author `manifest.json` v3 baseline with scoped permissions (`contextMenus`, `storage`, optional `scripting`), explicit `host_permissions`, icons, action popup, and CSP.
- Document local development workflow (`npm install`, `npm run dev`, `npm run build`, `npm run lint`) inside `extension/README.md`.

## Phase 2 – Lightweight capture trigger (Weeks 2-3)
- Implement background service worker that registers a context-menu item and toolbar action; build a context payload builder that normalises image URL, page metadata, and timestamp.
- Replace direct API fetch with `chrome.tabs.create` or `chrome.windows.create` to launch `/capture?src=...&title=...` in the hosted app, ensuring URL encoding and analytics logging.
- Add optional messaging channel so popup can request last capture status from background for display.
- Create unit tests for payload builder and URL helpers; integrate into CI via `npm test` in `extension/`.

## Phase 3 – Popup & UX polish (Weeks 4-5)
- Design Figma-derived popup layout (status pill, primary CTA, secondary link to library, subtle gradient background) and implement in React/Vite with Tailwind or lightweight CSS modules.
- Show login state by querying `/auth/extension/status` endpoint in web app (via fetch proxied through background for CSP compliance); provide "Sign in" deep link if unauthenticated.
- Surface last capture result and errors via extension storage; include animations/microcopy aligned to UI guidelines.
- Add localization scaffolding for key strings and accessibility checks (focus management, keyboard navigation, contrast ratios).

## Phase 4 – Compliance & release readiness (Weeks 6-7)
- Draft privacy policy snippet referencing server-side data handling; link from popup and Chrome Web Store listing metadata.
- Produce icon suite (16/32/48/128/256) and promotional screenshots with updated UI.
- Implement automated build script generating signed `.zip` package, version bump automation, and CHANGELOG for extension releases.
- Run Chrome extension linting (`chrome-webstore-upload-cli` dry run), manual QA scenarios, and penetration checklist (CSP validation, permission review, offline behaviour).

## Phase 5 – Handoff & instrumentation (Week 8)
- Wire background analytics events (install, context menu click, launch success, errors) to Segment/Snowplow via web app beacon endpoint.
- Provide release playbook covering submission, staged rollout, rollback, and support triage.
- Hold cross-team walkthrough to align backend `/capture` enhancements, ensuring query params consumed and authenticated flows tested.

## Deliverables checklist
- [ ] Unified `extension/` codebase with TypeScript build system
- [ ] Hardened MV3 manifest & CSP
- [ ] Lightweight capture trigger + popup status UI
- [ ] Automated tests, linting, and packaging pipeline
- [ ] Chrome Web Store-ready assets, docs, and release playbook

## Risks & mitigations
- **Scope creep back into heavy background workflows** → Enforce architecture review gate; reject features requiring new background APIs without justification.
- **Authentication friction** → Coordinate with backend to expose short-lived signed URLs or deep links; provide fallbacks inside popup guidance.
- **Design drift** → Pair with design weekly; maintain shared token file to align colours/typography with main app.
- **Compliance surprises** → Run interim reviews against Chrome policy updates and perform QA on latest Chrome Canary.

## Success metrics
- Time from capture gesture to `/capture` workspace load < 1.5s on broadband.
- <1% extension-triggered errors per 1K capture attempts (monitored via analytics endpoint).
- Chrome Web Store submission approved on first review cycle.
- Designer satisfaction rating ≥ 4.5/5 in internal beta survey focusing on ease of capture and perceived polish.
