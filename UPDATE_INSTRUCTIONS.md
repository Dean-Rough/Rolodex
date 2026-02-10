# 📥 Instructions to Update Your Rolodex Project

This guide will help you update your local Rolodex project with the latest features and optimizations.

## Prerequisites

- Git installed
- Node.js 18+ and npm
- Python 3.10+
- PostgreSQL (or SQLite for development)

## Step 1: Pull Latest Changes

```bash
cd /path/to/Rolodex
git fetch origin
git checkout claude/audit-and-refactor-app-011CUis71jFeSvuGYdWiXrGo
git pull origin claude/audit-and-refactor-app-011CUis71jFeSvuGYdWiXrGo
```

## Step 2: Update Backend Dependencies

```bash
cd backend

# Activate virtual environment
source venv/bin/activate  # On macOS/Linux
# OR
venv\Scripts\activate  # On Windows

# Install new dependencies
pip install --upgrade pip
pip install pillow httpx numpy
```

## Step 3: Update Database Schema

You have two options:

### Option A: Fresh Start (Recommended for Development)

```bash
cd backend

# Remove existing database
rm rolodex.db  # If using SQLite

# Run migrations (tables will be recreated automatically on next server start)
```

### Option B: Migrate Existing Database

If you want to preserve your existing data, run these SQL migrations:

#### For SQLite:

```sql
-- Add new columns to items table
ALTER TABLE items ADD COLUMN image_embedding TEXT;
ALTER TABLE items ADD COLUMN color_palette TEXT;
ALTER TABLE items ADD COLUMN tags TEXT;
ALTER TABLE items ADD COLUMN style_tags TEXT;
ALTER TABLE items ADD COLUMN notes TEXT;
ALTER TABLE items ADD COLUMN updated_at TIMESTAMP;

-- Update projects table
ALTER TABLE projects ADD COLUMN budget REAL;
ALTER TABLE projects ADD COLUMN description TEXT;
ALTER TABLE projects ADD COLUMN updated_at TIMESTAMP;

-- Create saved_searches table
CREATE TABLE saved_searches (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    filters TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_saved_searches_owner ON saved_searches(owner_id);
```

#### For PostgreSQL:

```sql
-- Add new columns to items table
ALTER TABLE items ADD COLUMN image_embedding JSONB;
ALTER TABLE items ADD COLUMN color_palette JSONB;
ALTER TABLE items ADD COLUMN tags JSONB;
ALTER TABLE items ADD COLUMN style_tags JSONB;
ALTER TABLE items ADD COLUMN notes TEXT;
ALTER TABLE items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;

-- Update projects table
ALTER TABLE projects ADD COLUMN budget DECIMAL(10, 2);
ALTER TABLE projects ADD COLUMN description TEXT;
ALTER TABLE projects ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;

-- Create saved_searches table
CREATE TABLE saved_searches (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    filters JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_saved_searches_owner ON saved_searches(owner_id);

-- Add GIN indexes for better search performance
CREATE INDEX idx_items_tags ON items USING GIN (tags);
CREATE INDEX idx_items_color_palette ON items USING GIN (color_palette);
CREATE INDEX idx_items_style_tags ON items USING GIN (style_tags);
```

## Step 4: Update Frontend Dependencies

```bash
cd ../frontend

# Install dependencies
npm install
```

## Step 5: Start the Backend Server

```bash
cd ../backend
source venv/bin/activate  # Activate venv if not already active

# Start server
uvicorn backend.main:app --reload
```

The backend should now be running at http://localhost:8000

## Step 6: Start the Frontend Development Server

In a new terminal:

```bash
cd frontend
npm run dev
```

The frontend should now be running at http://localhost:3000

## Step 7: Test New Features

### Test Authentication API

```bash
# Register a new user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User"
  }'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Color Palette Extraction

```bash
# Create an item (color palette will be extracted automatically)
curl -X POST http://localhost:8000/api/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "img_url": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc",
    "title": "Modern Sofa"
  }'
```

### Test Saved Searches

```bash
# Create a saved search
curl -X POST http://localhost:8000/api/searches \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Blue Sofas Under $2000",
    "filters": {
      "category": "sofa",
      "colour_hex": "#0000ff",
      "price_max": 2000
    }
  }'

# List saved searches
curl http://localhost:8000/api/searches \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Item CRUD Operations

```bash
# Get item detail
curl http://localhost:8000/api/items/ITEM_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update item (add tags and notes)
curl -X PATCH http://localhost:8000/api/items/ITEM_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tags": ["modern", "living-room"],
    "notes": "Perfect for Smith project"
  }'

# Find similar items
curl http://localhost:8000/api/items/ITEM_ID/similar \
  -H "Authorization: Bearer YOUR_TOKEN"

# Delete item
curl -X DELETE http://localhost:8000/api/items/ITEM_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Batch Operations

```bash
# Delete multiple items
curl -X POST http://localhost:8000/api/items/batch-delete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "item_ids": ["id1", "id2", "id3"]
  }'
```

## Step 8: Run Test Suite

```bash
# Backend tests
cd backend
pytest

# Frontend unit tests
cd ../frontend
npm run test

# E2E tests (requires both servers running)
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

## Step 9: Verify Frontend Pages

Open your browser and test:

1. **Library Page**: http://localhost:3000
   - Should display all items
   - Search should work
   - Filters should work

2. **Projects Page**: http://localhost:3000/projects
   - Should list all projects
   - Create new project button should work

3. **Project Detail**: http://localhost:3000/projects/PROJECT_ID
   - Should show project items
   - Add/remove items should work

4. **Moodboard**: http://localhost:3000/projects/PROJECT_ID/moodboard
   - Should show 3 layout options (Grid, Masonry, Collage)
   - PDF export should work
   - JPG export should work

5. **Capture Page**: http://localhost:3000/capture
   - Should show capture form
   - AI extraction should work

## What's New?

### Backend Features ✅

1. **Complete Authentication System**
   - User registration and login
   - JWT token-based auth
   - Extension status endpoint

2. **Enhanced Data Model**
   - Image embeddings for visual similarity
   - Color palette extraction (5 dominant colors)
   - User tags and AI style tags
   - Notes field
   - Budget tracking for projects

3. **Color Palette Extraction**
   - Automatic extraction of 5 dominant colors
   - Uses PIL quantization for fast processing
   - Background processing to avoid blocking

4. **Visual Similarity Search**
   - Find items similar to a given item
   - Uses image embeddings (cosine similarity)
   - Falls back to category matching

5. **Item CRUD Operations**
   - Get item detail
   - Update any field (tags, notes, etc.)
   - Delete single item
   - Batch delete multiple items

6. **Saved Searches API**
   - Save complex filter configurations
   - Quick access to frequent searches
   - Example: "Blue velvet sofas under $2000"

### Frontend Features ✅

1. **Complete Projects UI**
   - List all projects
   - Create new project with name/budget
   - View project details
   - Add/remove items from projects
   - Delete projects

2. **Moodboard Generation**
   - 3 layout options: Grid, Masonry, Collage
   - High-resolution export to PDF
   - Export to JPG
   - Drag-and-drop layouts (coming soon)

3. **Enhanced API Client**
   - All new endpoints integrated
   - Type-safe with TypeScript
   - Error handling and loading states

4. **Comprehensive E2E Tests**
   - 60+ test scenarios
   - Authentication flow
   - Capture flow
   - Projects and moodboard
   - Performance benchmarks

## Troubleshooting

### Backend won't start

**Error**: `ModuleNotFoundError: No module named '_cffi_backend'`

**Solution**:
```bash
pip install --upgrade --force-reinstall cryptography cffi
# OR use system package manager
sudo apt-get install libffi-dev python3-dev  # Ubuntu/Debian
brew install libffi  # macOS
```

### Database migration fails

**Error**: Column already exists

**Solution**: You may have run migrations twice. Either:
- Drop and recreate the database (development only)
- Manually check which columns exist and skip those migrations

### Color palette extraction not working

**Error**: PIL/Pillow errors

**Solution**:
```bash
pip install --upgrade Pillow
```

### Frontend can't connect to backend

**Error**: CORS errors in browser console

**Solution**: Verify backend is running on http://localhost:8000 and frontend on http://localhost:3000

### E2E tests fail

**Solution**:
1. Ensure both backend and frontend are running
2. Check that test user credentials are valid
3. Run `npx playwright install` to install browsers

## Next Steps: Building UI for New Features

The backend features are complete, but you'll want to build UI components to make them accessible:

### Priority 1: Essential UX

1. **Item Detail Modal** (`frontend/components/ItemDetailModal.tsx`)
   - Click any item → modal overlay
   - Display all metadata
   - Color palette chips
   - Tags editor
   - Notes field
   - "Find Similar" button

2. **Batch Operations UI** (`frontend/components/BatchActionsBar.tsx`)
   - Checkbox select mode
   - Shift+Click for range select
   - Actions: Add to Project, Delete, Tag

3. **Saved Searches Sidebar** (`frontend/components/SavedSearches.tsx`)
   - List saved searches
   - One-click to apply filter
   - Save current filters

### Using Cursor AI to Build Components

Cursor has excellent AI features. Here's how to use them:

1. **Cursor Composer** (Cmd/Ctrl + K):
   ```
   Create an ItemDetailModal component that:
   - Takes an item ID as prop
   - Fetches item details using api.getItem()
   - Displays all item fields including tags, notes, color_palette
   - Has editable tags (TagsInput component)
   - Has a "Find Similar" button that calls api.findSimilarItems()
   - Shows similar items in a grid below
   ```

2. **Cursor Chat** (Cmd/Ctrl + L):
   ```
   I need to add batch selection to the library page.
   - Add checkboxes to each item card
   - Show BatchActionsBar when items are selected
   - Support Shift+Click for range select
   - Actions: Delete, Add to Project
   ```

3. **Inline Editing** (Cmd/Ctrl + K on selected code):
   Select existing code and ask:
   ```
   Add color palette display to this ItemCard component.
   Show 5 color chips horizontally below the image.
   ```

## Success Checklist

- [ ] Backend server starts without errors
- [ ] Frontend dev server runs
- [ ] Can register new user via API
- [ ] Can login and receive JWT token
- [ ] Color palette extracted when creating item
- [ ] Can save and retrieve saved searches
- [ ] Can update item tags and notes
- [ ] Can find similar items
- [ ] Projects page loads and displays projects
- [ ] Can create new project
- [ ] Can view project details
- [ ] Moodboard page loads with layout options
- [ ] Can export moodboard to PDF
- [ ] E2E tests pass

## Documentation

For more details, see:
- **FEATURE_IMPLEMENTATION_SUMMARY.md** - Complete feature specs and optimization guide
- **ARCHITECTURE.md** - System architecture overview
- **ROADMAP.md** - Product roadmap
- **PRD.md** - Product requirements

## Support

If you encounter issues:
1. Check this troubleshooting section
2. Review error logs in terminal
3. Check browser console for frontend errors
4. Verify environment variables are set correctly
5. Ensure all dependencies are installed

---

**Last Updated**: Based on commits through "feat: add advanced features for personal productivity"
