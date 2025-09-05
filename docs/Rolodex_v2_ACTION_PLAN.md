# Enterprise Action Plan: Rolodex

This document provides a granular, step-by-step implementation plan to address the findings of the UNIFIED_TECHNICAL_AUDIT.md. The focus is on rapid, enterprise-grade execution to bridge the gap between the current infrastructure and the required product functionality.

## Guiding Principles

*   **Ruthless Prioritization:** Focus exclusively on the critical path to a functional MVP.
*   **Incremental Implementation:** Each step should be a small, testable, and verifiable unit of work.
*   **Convention over Configuration:** Leverage existing frameworks and best practices to accelerate development.
*   **Measure and Iterate:** Use the success metrics defined in the audit to track progress and guide development.

---

## Phase 1: Core Functionality (Weeks 1-4)

### **Objective:** Simplify the architecture and implement the core "capture-to-display" loop.

#### **Week 1-2: Extension & Web App Integration**

**Goal:** Decouple the extension from the backend and establish the new web app-centric workflow.

*   **Step 1: Create a New Feature Branch**
    *   I will create a new git branch `feature/simplify-extension-flow` to isolate these changes.

*   **Step 2: Simplify the Chrome Extension**
    *   I will modify `extension/background.js` to remove all API calls, authentication logic, and error handling.
    *   The extension's sole responsibility will be to capture the `srcUrl` of the right-clicked image and the `tab.url` and `tab.title` of the page.
    *   It will then open a new tab with the URL `https://<your-app-domain>/capture?imageUrl=<encoded_url>&sourceUrl=<encoded_source>&title=<encoded_title>`.

*   **Step 3: Create the `/capture` Page in the Frontend**
    *   I will create a new page at `frontend/app/capture/page.tsx`.
    *   This page will read the `imageUrl`, `sourceUrl`, and `title` from the URL search parameters.
    *   For now, it will display the captured image and the source URL.

*   **Step 4: Stub the Backend Interaction**
    *   On the `/capture` page, I will add a "Save" button.
    *   Clicking "Save" will call a new, stubbed function `saveItem(imageUrl, sourceUrl, title)` in `frontend/lib/api.ts`. This function will initially just log the data to the console.

*   **Step 5: Test the New Flow**
    *   I will load the simplified extension in Chrome.
    *   I will right-click an image on a webpage.
    *   I will verify that the `/capture` page opens in the web app and displays the correct image and source URL.
    *   I will click "Save" and verify that the correct data is logged to the console.

#### **Week 3-4: AI Extraction & Initial Display**

**Goal:** Implement the AI extraction pipeline and display the results in a basic grid.

*   **Step 1: Implement the Real AI Extraction Endpoint**
    *   I will modify the `/api/extract` endpoint in `backend/main.py`.
    *   I will add an OpenAI API client to the backend.
    *   The endpoint will take an `imageUrl` and `sourceUrl` as input.
    *   It will use the OpenAI API (with a model like GPT-4o) to analyze the image and the content of the source URL.
    *   The prompt will instruct the model to return a JSON object with the fields defined in `ARCHITECTURE.md` (title, vendor, price, etc.).
    *   I will add robust error handling and fallbacks for the API call.

*   **Step 2: Implement Image Storage**
    *   I will add a Supabase Storage client to the backend.
    *   When an item is saved, the backend will download the image from the `imageUrl`, and upload it to a Supabase Storage bucket.
    *   The `items.img_url` will be updated to point to the new Supabase Storage URL.

*   **Step 3: Update the `saveItem` Function**
    *   I will update the `saveItem` function in `frontend/lib/api.ts` to call the `/api/extract` endpoint.
    *   The extracted data will then be used to create a new item in the database via a call to `POST /api/items`.
    *   The `POST /api/items` endpoint in `backend/main.py` will be updated to accept all the new fields (title, vendor, price, etc.) and save them to the database.

*   **Step 4: Create the Item Grid**
    *   I will modify the home page at `frontend/app/page.tsx` to display a grid of saved items.
    *   I will use the `api.listItems` function to fetch the items from the backend.
    *   Each item in the grid will display the image, title, and vendor.

*   **Step 5: Test the End-to-End Flow**
    *   I will use the simplified extension to capture an image.
    *   On the `/capture` page, I will click "Save".
    *   I will verify that the AI extraction is triggered, the data is saved to the database, and the new item appears in the grid on the home page.

---

## Phase 2: Core Features (Weeks 5-8)

### **Objective:** Build the core user-facing features for search, organization, and moodboards.

#### **Week 5-6: Search and Project Management**

*   **Step 1: Implement Semantic Search**
    *   I will create a background task that generates a vector embedding for each new item using a CLIP model.
    *   The embedding will be stored in the `items.embedding` column.
    *   I will update the `GET /api/items` endpoint to accept a `query` parameter and perform a vector similarity search on the `embedding` column.

*   **Step 2: Build the Search UI**
    *   I will add a search bar to the home page.
    *   As the user types, the `api.listItems` function will be called with the search query, and the grid will update with the results.

*   **Step 3: Build the Project Management UI**
    *   I will create a new page for creating and managing projects.
    *   Users will be able to create new projects, and see a list of their existing projects.
    *   On the item grid, I will add a button to each item to "Add to Project".
    *   This will open a modal where the user can select a project to add the item to.

#### **Week 7-8: Moodboard Creation**

*   **Step 1: Create the Moodboard UI**
    *   I will create a new page for viewing a project's moodboard.
    *   This page will display all the items in the project on a canvas-based layout.
    *   I will implement drag-and-drop functionality to allow users to rearrange the items.

*   **Step 2: Implement PDF Export**
    *   I will add an "Export to PDF" button to the moodboard page.
    *   This will use a library like `jsPDF` to generate a high-resolution PDF of the moodboard.

---

## Phase 3: Polish & Hardening (Weeks 9-12)

### **Objective:** Add authentication, comprehensive tests, and polish the UI/UX.

#### **Week 9-10: Authentication and Testing**

*   **Step 1: Implement User Authentication**
    *   I will integrate Supabase Auth into the frontend.
    *   I will create sign-up and login pages.
    *   The backend API will be updated to validate the JWT from Supabase Auth.
    *   All API endpoints will require a valid JWT.

*   **Step 2: Write Comprehensive Tests**
    *   I will write end-to-end tests with Playwright for the core user workflows:
        *   Sign up and log in.
        *   Capture an item with the extension.
        *   Save the item and see it in the grid.
        *   Search for the item.
        *   Create a project and add the item to it.
        *   Create a moodboard and export it.
    *   I will write unit tests for the key backend and frontend components.

#### **Week 11-12: Polish and Optimization**

*   **Step 1: Implement the Full UI/UX Vision**
    *   I will replace the basic UI components with `shadcn/ui` components.
    *   I will apply the theming, typography, and spacing from `UIUX.md`.
    *   I will add the microinteractions and animations specified in the design system.

*   **Step 2: Performance Optimization**
    *   I will analyze the performance of the application and identify any bottlenecks.
    *   I will implement image optimization and a CDN for serving images.
    *   I will optimize the database queries and add caching where appropriate.

By following this action plan, Rolodex can be transformed from a well-engineered but incomplete project into a fully functional, enterprise-grade application that delivers on its initial promise.
