# 📝 Agile Task Board (TASKS.md)

This board tracks the current objectives, technical debt, and backlog for Dilecti. When completing tasks, move them here and add technical notes.

## 🏃 Active Sprint (Current Focus)

## 🟡 In Progress / Polish

## 🔴 Backlog (Future Epics)
- **Feyble Deprecation:** Port all remaining Goodreads-style features (reading goals, custom bookshelves) over to the Universal tags system, and delete `FeybleApp.tsx`.
- **Advanced Import/Export System:** Upgrade `ImportModal.tsx` to handle Letterboxd CSVs, mapping their custom schema to `UserItem`.
- **Granular Category Context:** Add category-specific database fields (e.g., `platforms` for Games, `cuisine` for Food, `address` for Places) to extend the universal item model.

## 🟢 Recently Completed
- [X] Universal Discovery Module: Updated the `/discover` placeholder to fetch real recommendations, now utilizing `/api/discover-category` with AI cache.
- [X] **HTML Parsing Fallback:** Refactored the `/api/import-url` endpoint to use `cheerio` for standard DOM parsing before falling back to Gemini.
- [X] **Profile Context Reduction:** Optimized `/api/update-understanding` to cluster items and summarize themes to reduce token cost.
- [X] **Data Visualization (`StatsTab.tsx`):** Implemented Recharts to visualize user items saved over time grouped by category, accessible via the Stats route.
- [X] **Stabilize AI Ask For Ideas:** Prevented token/payload blowup by mapping user items to lightweight payloads on the client, and formatting curated Taste Evidence on the backend into segmented negative/positive boundaries.
- [X] **Rich Critic Portal Firestore Wiring:** Built a robust translation layer in `hooks.ts` that safely intercepts 10-point float ratings (e.g., 8.4 `criticScore`) and maps them to safe integer stars (`rating`) for legacy UI views.
- [X] Implement Social Discovery & Followed Feed: Built robust taste-graph social system, including `TasteCompareModal`, `PublicProfileModal`, followed activity in `FeedTab`, discoverability settings, and subcollection tracking (`following`/`followers`) with Firebase rules.
- [X] Stabilized Firestore Rules deployment by explicitly targeting the dedicated database ID in `firebase.json` for all permission updates.
- [X] Configured `UniversalAddModal.tsx` and unified Metadata Fetching API in `server.ts` replacing AI search parsing.
- [X] Redesigned Navigation, moved Home to left tab layout and centralized "Add" button.
- [X] Initialized React Router layout structure (`App.tsx`, `Navigation.tsx`).
- [X] Set up Tailwind v4 theming (`index.css` fonts, colors).
- [X] Deployed Firebase OAuth (`LoginScreen.tsx`).
- [X] Configured `UniversalAddModal.tsx` and `TasteProfileModal.tsx`.
- [X] Ported legacy Feyble logic to isolated `/books/*` paths.
