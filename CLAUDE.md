# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (Next.js)
All frontend commands should be run from the `frontend/` directory:

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run Jest unit tests
- `npm run test:e2e` - Run Playwright end-to-end tests  
- `npm run type-check` - TypeScript type checking without emitting files

### Backend (FastAPI)
Backend commands should be run from the `backend/` directory with the virtual environment activated:

- `source venv/bin/activate` - Activate Python virtual environment
- `uvicorn backend.main:app --reload` - Start development server on http://localhost:8000
- `pytest` - Run backend tests
- `pytest --cov` - Run tests with coverage

### Extension
- Load unpacked extension from `extension/` directory in Chrome → Extensions → Developer mode

## Architecture Overview

Rolodex is a three-component system for FF&E (Furniture, Fixtures & Equipment) product management:

1. **Browser Extension** (`extension/`): Chrome Manifest V3 extension for right-click product capture
2. **Backend API** (`backend/`): FastAPI server with PostgreSQL + pgvector for AI-powered product extraction
3. **Web App** (`frontend/`): Next.js React application for product search, organization, and moodboard creation

### Data Flow
1. User right-clicks product image → Extension captures image + context
2. Extension sends data to FastAPI backend → AI pipeline extracts structured product data
3. Backend stores item in PostgreSQL with vector embedding
4. Web app provides search, filtering, project organization, and moodboard export

### Key Technologies
- **Frontend**: Next.js, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, Geist fonts
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, pgvector, OpenAI/CLIP
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Testing**: Jest (unit), Playwright (e2e), pytest (backend)

## Database Schema

Core tables:
- `users` - User accounts with email/auth
- `items` - Product items with AI-extracted metadata and vector embeddings
- `projects` - User-created project collections
- `project_items` - Many-to-many relationship between projects and items

Full schema available in `docs/schema.sql`.

## Environment Setup

Copy `.env.example` to `.env` and configure:
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - For AI product extraction
- `SUPABASE_PROJECT_URL` and related keys - For database and storage
- Storage provider keys (S3 or Supabase Storage)

## Testing Strategy

- **Unit Tests**: Jest for React components and utilities
- **E2E Tests**: Playwright for full user workflows
- **Backend Tests**: pytest for API endpoints and business logic
- All tests must pass before merge: `npm run lint`, `npm run type-check`, `npm run test`, `npx playwright test`

## Code Conventions

- **TypeScript strict mode** enabled
- **Tailwind CSS** for styling with shadcn/ui components
- **No magic numbers, TODOs, or debug code**
- **Conventional commits** for git messages
- **Feature branches** with descriptive names