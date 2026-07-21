# 📱 Screens & Component Inventory (SCREENS.md)

This is the definitive map of Dilecti's UI architecture. Before building new UI, confirm a relevant component doesn't already exist.

---

## 1. Global Shell & Entry

### `App.tsx` (LayoutShell)
- **Role:** Main React Router wrapper. Manages the global `Navigation` bar and mounts global modals.
- **Hooks/Data:** `UserContext`.

### `LoginScreen.tsx` / `SplashScreen.tsx`
- **Role:** Handles onboarding, Google Auth logic, and the initial brand SVG animation.
- **Hooks/Data:** Firebase `signInWithPopup`, `sessionStorage` for splash prevention.

---

## 2. Core Tab Routes (Mapped to Bottom Nav)

### `DilectiHome.tsx` (`/`)
- **Role:** Dashboard landing. Summarizes recent activity and quick-add actions.
- **Status:** Scaffolded.

### `UniversalLibrary.tsx` (`/library`)
- **Role:** The core "Taste Graph". A unified list of all `UserItem` entries.
- **Hooks/Data:** Requires `useBooks()` / `useUserItems()`. Mapped directly to Firestore documents.
- **Dependencies:** Relies on category-coded chips for filtering.

### `DiscoverTab.tsx` (`/discover`)
- **Role:** Personalized recommendation surface. 
- **Status:** UI Placeholder. Needs Gemini API backend wire-up to generate contextual suggestions.

### `FeedTab.tsx` (`/feed`)
- **Role:** Social activity stream showing friends' new reviews and ratings.
- **Status:** UI Placeholder. Needs Firestore querying for social graph.

### `ProfileTab.tsx` (`/profile`)
- **Role:** User identity, statistics preview, settings management, and Taste Profile entry point.
- **Hooks/Data:** `useUserProfile()`.

### `StatsTab.tsx` (`/stats`)
- **Role:** Aggregated visual analytics of consumed media.
- **Status:** UI Placeholder. Will require data visualization libraries.

---

## 3. Legacy Routing

### `FeybleApp.tsx` (`/books/*`)
- **Role:** The complex nested router for legacy Goodreads-style book tracking features. Maintained to avoid breaking core power-users, but slated for eventual universal integration.

---

## 4. Modal System (Event-Driven)
These modals live in `App.tsx` and render above all UI. They are triggered via `window.dispatchEvent()`.

- **`UniversalAddModal.tsx`**: The core data entry engine. Features Autocomplete searching and category mapping.
- **`TasteProfileModal.tsx`**: Onboarding and preference adjustment utility. Updates `UserProfile`.
- **`RichCriticPortalModal.tsx`**: Advanced 0.0-10.0 float rating interface. 
- **`AIAssistantModal.tsx` / `AskForIdeasModal.tsx`**: Gemini-powered conversational UI.
- **`ImportModal.tsx`**: Handles CSV dropping and batch Firestore syncing.

---

## 5. Reusable UI Components (`/src/components/`)
- **`DilectiHeader.tsx`**: Standardized top structural header.
- **`Navigation.tsx`**: Fixed bottom navbar containing main routes and central FAB.
- **`AutocompleteInput.tsx`**: Managed text input wrapping third-party search APIs (`src/lib/search.ts`).
- **`ReviewEditor.tsx`**: Reusable rich-text/markdown capable text area for capturing sentiment.
