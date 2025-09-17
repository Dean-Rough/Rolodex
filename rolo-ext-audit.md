# Rolodex Extension – Targeted 3-Part Audit

## Part 1. Technical audit
- **Architecture shape** – Two extension codepaths exist: a prototype in `extension/` with a barebones MV3 manifest and direct `fetch` to `http://localhost` plus a complex production-aspiring build in `extension-v2.0.0/` that layers secure storage, retry logic, and dynamic config. The duplication complicates maintenance and violates the "lightweight launcher" goal.
- **Manifest hygiene** – The legacy manifest lacks `host_permissions`, icons, CSP, and version discipline. The v2 manifest requests broad permissions (`tabs`, `activeTab`, notifications) and exposes web-accessible scripts even though the extension should only raise `/capture`; both manifests need rationalised scopes aligned with Chrome best practices.
- **Background implementation** – The prototype background script sends unauthenticated POSTs and logs to console, offering no telemetry or resilience. The v2 background script handles auth, retries, and config inline but relies on `importScripts` globals, mixes concerns, and still performs heavy network orchestration inside the service worker rather than handing off to the web app.
- **Popup & UI assets** – The popup is static HTML with inline styles, no build tooling, and hard-coded links. There is no shared design system or alignment with the "designer" aesthetic promised in marketing collateral.
- **Documentation & tooling** – README flags the prototype as dev-only but there is no authoritative doc describing which folder is current, how to run tests/linting, or how the extension integrates with the broader app. There are no automated tests, linting configs, or CI tasks for extension code.

## Part 2. Product & UX assessment
- **Value proposition clarity** – The popup only explains a right-click capture and links to the web app; there is no confirmation of login state, library count, or onboarding. Designers lack confidence that the gesture works.
- **Capture workflow** – Relying on background `fetch` means users never see context or errors. Authentication prompts open new tabs without cohesive UX, and failure states surface as silent console logs.
- **Visual design** – The popup typography and colour palette are minimal but not brand-aligned. Lack of spacing rules, icons, or responsive layout undermines the "slick, designer" mandate.
- **Extension weight** – The heavy v2 service worker tries to handle auth, retries, notifications, and storage, increasing cognitive load and risk of breakage. A simpler trigger that launches `/capture?context=...` would better match Chrome UX expectations and reduce maintenance.

## Part 3. Imagineer blueprint for Rolodex Extension 3.0
- **North-star experience** – A lightweight MV3 extension that, on right-click or toolbar click, opens the hosted `/capture` workspace prefilled with the asset context. All intelligence (auth, enrichment, persistence) lives in the web app/backend.
- **Technical pillars** – Single background module focused on context menu registration and URL construction; messaging bridge or declarative content to pass metadata; minimal permissions (`contextMenus`, `scripting` if needed); CSP-hardened popup built with a small UI toolkit matching the main product.
- **Designer-first UI** – The popup doubles as a status indicator showing login state, last capture, and a "Launch Capture" call-to-action with refined typography, brand colours, and micro-interactions. Errors route users into the web experience with guidance.
- **Operational guardrails** – Shared TypeScript config for extension scripts, unit tests for URL builders, linting via ESLint, and documentation describing packaging, release, and Chrome Web Store compliance.

## Conclusion
Aligning the extension with Chrome best practices requires sunsetting the legacy prototype, slimming the service worker to a trigger-and-telemetry role, and investing in a polished popup that mirrors the designer-grade feel of the main app. Consolidating documentation and automation will reinforce code quality while the new architecture channels all heavy logic through the web platform, delivering a trustworthy, modern Rolodex extension experience.
