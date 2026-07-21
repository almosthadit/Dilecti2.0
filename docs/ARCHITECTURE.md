# 🏗️ Architecture & Systems Design

## 1. Technology Stack
- **Frontend Core:** React 19, React Router v7 (`react-router-dom`), Vite 6
- **Language:** TypeScript (Strict mode preferred)
- **Styling:** Tailwind CSS v4, `clsx`, `tailwind-merge`
- **Animation:** `motion` (fka framer-motion)
- **Backend / Platform:** 
  - Firebase v12 (Firestore NoSQL DB, Firebase Authentication)
  - Node.js Express v4 Server (Port 3000 mapping, API proxies, ESBuild packaging)
- **AI Infrastructure:** `@google/genai` (Server-side execution only for security)

## 2. System Boundaries & Routing
Dilecti operates as a Single Page Application (SPA) with server-side proxy capabilities.
- **`src/App.tsx` (LayoutShell):** The unified router and global event listener hub. Manages global modal states (Add, Import, AI).
- **`/books/*` (Legacy Feyble):** Encapsulated in `src/FeybleApp.tsx` for backwards compatibility with complex book-tracking data schemas.
- **Server (`server.ts`):** Serves the Vite application in development and production. Exposes `/api/*` endpoints to securely proxy AI requests and third-party metadata API calls, protecting API keys.

## 3. Data Schema & Models (`src/types.ts`)
The application relies on polymorphic NoSQL documents in Firestore.
- **`Category`:** Restricts item types. `type Category = 'book' | 'movie' | 'tv' | 'music' | 'game' | 'place' | 'food' | 'product' | 'event';`
- **`UserItem` Collection:**
  - `id: string`
  - `userId: string`
  - `category: Category`
  - `title: string`, `creator?: string`, `coverUrl?: string`
  - `rating?: number` (Legacy 1-5), `criticScore?: number` (Rich 0.0-10.0)
  - `reaction?: 'love' | 'like'`, `review?: string`
  - `createdAt: timestamp`, `updatedAt: timestamp`
- **`UserProfile` Collection:** User settings, active taste preferences (`preferences`), onboarding state, and theme overrides.

## 4. State Management Strategy
- **Auth & Global Data:** Driven by `UserContext.tsx` via `react-firebase-hooks`. Reacts instantly to Firestore document changes.
- **Local Interactivity:** `useState` + `useCallback`.
- **Decoupled Modals:** Instead of massive Context files for modal visibility, we use native `window.dispatchEvent(new Event('open-X'))`. Global UI elements listen to these events to mount/unmount.

## 5. Security & Authentication
- **Authentication:** Firebase Auth (Google OAuth Provider). Handled in `<AuthWrapper>`.
- **Database:** `firestore.rules` enforces that `UserItem` documents can only be created/read/updated/deleted by the user whose `uid` matches the `userId` field, unless the item is explicitly flagged as public for the Social Feed.
- **API Keys:** Never injected into Vite via `VITE_`. All sensitive `.env` variables live server-side.

## 6. Technical Debt & Workarounds
- **Search Abstraction:** `src/lib/search.ts` handles legacy local autocomplete. The Universal metadata search has been stabilized into standard server-side endpoints (`server.ts`) unifying Google Books and Apple iTunes APIs to return normalized payloads.
- **Legacy Feyble Alignment:** We maintain duplicate UI paradigms in `/books/` and `/library/`. Future architecture requires a full deprecation of `FeybleApp.tsx` by merging its features into the Universal Library.
