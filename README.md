# Rolodex

> **Right-click any product image on the web → AI captures, tags, and stores it in your personal, searchable FF&E library, ready to drop into client projects or auto-generated mood boards.**

---

## Overview
Rolodex is an internal tool for designers to capture, organize, and search FF&E (Furniture, Fixtures & Equipment) products from anywhere on the web. It leverages AI for data extraction, color analysis, and moodboard generation, with a focus on immaculate UI/UX and extensibility.

- **Browser Extension**: Save products with a right-click.
- **Web App**: Search, organize, and export moodboards.
- **Backend**: FastAPI, PostgreSQL + pgvector, OpenAI/CLIP for AI extraction.
- **UI**: React, Tailwind, shadcn/ui, Geist/Geist Mono, dark mode, Framer Motion.

---

## Quickstart

1. Clone the repo and follow [BUILD.md](./BUILD.md) for setup.
2. See [DEVELOPMENT.md](./DEVELOPMENT.md) for local dev, code style, and troubleshooting.
3. Product requirements: [PRD.md](./PRD.md)
4. System architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)
5. UI/UX principles: [UIUX.md](./UIUX.md)
6. Roadmap: [ROADMAP.md](./ROADMAP.md)
7. Changelog: [CHANGELOG.md](./CHANGELOG.md)

---

## Stack
- **Frontend**: React, Tailwind, shadcn/ui, Framer Motion, Geist/Geist Mono
- **Backend**: FastAPI, PostgreSQL, pgvector, OpenAI/CLIP
- **Extension**: Chrome Manifest V3
- **Storage**: Supabase Storage or AWS S3

---

## Features
- Right-click save from any product image
- AI-powered extraction (title, vendor, price, color, etc.)
- Search, filter, and organize products
- Project/moodboard creation and export
- Immaculate, accessible UI/UX

---

## Documentation
- [BUILD.md](./BUILD.md): Step-by-step onboarding/build guide
- [PRD.md](./PRD.md): Product requirements
- [ARCHITECTURE.md](./ARCHITECTURE.md): System design
- [DEVELOPMENT.md](./DEVELOPMENT.md): Dev workflow
- [CHANGELOG.md](./CHANGELOG.md): Version history
- [ROADMAP.md](./ROADMAP.md): Upcoming features
- [UIUX.md](./UIUX.md): UI/UX principles and design system

---

## License
Internal use only. Not for commercial distribution (yet). 