# Product Requirements Document (PRD) – Rolodex

## 1. Purpose
Rolodex is an internal tool for designers to capture, tag, and organize FF&E products from the web, leveraging AI for extraction and search, with a focus on best-in-class UI/UX.

## 2. User Personas
- **Interior Designer (Primary)**: Needs to quickly capture, organize, and retrieve product info for client projects.
- **Design Assistant**: Supports lead designer, manages library, assembles moodboards.
- **Developer (Internal)**: Maintains and extends the tool, ensures reliability and performance.

## 3. User Stories (MVP)
- As a designer, I can right-click any image on the web and “Save to MyLibrary.”
- The extension auto-fills: product image, title, vendor, price, description, color (hex), category, material, URL.
- I can open the web app, fuzzy-search my saved items, and add any subset to a named “Project.”
- I can export a high-res moodboard PDF/JPG for the current project.
- I can delete or edit any field if the AI guess was wrong.

## 4. Features & Acceptance Criteria
- **Chrome extension for product capture**
  - [ ] Context menu appears on right-click of image
  - [ ] Sends image/context to backend
  - [ ] Shows feedback (toast, modal) on success/failure
- **AI-powered extraction**
  - [ ] Extracts all required fields (title, vendor, price, etc.)
  - [ ] Fallback to manual edit if extraction fails
- **Web app for search, organization, moodboard export**
  - [ ] Search/filter returns relevant results in <1s
  - [ ] Projects can be created, renamed, deleted
  - [ ] Items can be added/removed from projects
  - [ ] Users can select multiple items to perform bulk actions (add to project, delete)
  - [ ] Moodboard export produces high-res PDF/JPG
- **Immaculate, accessible UI/UX**
  - [ ] All controls keyboard accessible
  - [ ] Color contrast meets WCAG AA
  - [ ] Responsive on mobile and desktop
- **Authentication**
  - [ ] Users can sign up, log in, reset password
  - [ ] Session persists across reloads
- **Error handling & fallback**
  - [ ] User sees clear error messages for all failures
  - [ ] Empty states have custom illustrations and CTAs

## 5. Edge-Case & Error Flows
- **AI extraction fails**: User is prompted to manually edit fields; error toast shown.
- **Image upload fails**: User can retry or choose a different image.
- **No search results**: Show empty state with suggestions.
- **Network/API error**: Show error toast, retry option.
- **Duplicate item detected**: Warn user, allow override or cancel.

## 6. Non-Goals
- No public sharing or collaboration in MVP
- No mobile app in MVP
- No direct e-commerce integration

## 7. Success Metrics
- Extraction accuracy ≥ 85% on real-world product pages
- < 2 min to onboard and save first product
- < 1 sec search/filter response time
- 100% test coverage, zero critical bugs in production

## 8. Stretch Goals (v2+)
- Brief-based search (natural language)
- Palette matching
- Collaboration and sharing
- API integrations (Zapier, Make)
- Mobile/PWA 