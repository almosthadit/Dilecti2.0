# Dilecti Stabilization & Scaling Plan

**Context:** Dilecti is currently overly reliant on real-time LLM generations for basic catalog retrieval, search, and images. This causes API rate limits to max out quickly, degrades the user experience with slow load times, and breaks the UI when AI hallucinations or timeouts occur.

**Objective:** Transition Dilecti from a "fragile real-time AI" architecture to a "robust, cached, and owned-data" architecture. We will use AI strictly for personalization and heavy-lifting, not for basic database lookups.

---

## Phase 1: Stop the Bleeding (Caching, Fallbacks & Resilience)
*Goal: Prevent the app from breaking when rate limits are hit and stop burning credits on duplicate requests.*

*   **Step 1.1: Aggressive LLM Caching:** Implement a strict Firestore/Redis caching layer for ALL AI requests. If a user asks for "sci-fi book recommendations", cache the result globally for 24 hours. Never ask the AI the exact same question twice in a day.
*   **Step 1.2: Bulletproof Image Fallbacks:** Stop relying entirely on AI-hallucinated or third-party image URLs that break. Implement premium, CSS-based or SVG category-specific placeholder art (e.g., a sleek gradient with a book icon) that instantly renders if an image URL fails to load.
*   **Step 1.3: Circuit Breakers & Debouncing:** Add strict UI debouncing on search bars and auto-suggest to prevent spamming the AI API on every keystroke. Implement a "circuit breaker" that detects when the AI API is rate-limited and instantly falls back to a static "Popular Items" list.
*   **Step 1.4: Graceful Degradation:** Ensure that if an API call fails, the UI shows a friendly message ("Our recommendation engine is taking a quick breather") rather than a blank screen or a crash.

---

## Phase 2: Speed & Batching (Async Architecture)
*Goal: Deliver the promise of "lightning-fast" recommendations by moving AI generation out of the critical rendering path.*

*   **Step 2.1: Async Generation:** When a user requests recommendations, immediately show a beautiful loading state or partial results from the cache. Run the heavy AI generation asynchronously in the background.
*   **Step 2.2: Batch Pre-computation:** Instead of generating recommendations on-demand when the user clicks a tab, generate a batch of 20-50 recommendations when they log in (or via a nightly cron job), save them to Firestore, and serve them instantly when the user navigates.
*   **Step 2.3: Separate Data Extraction from UI:** Stop trying to parse massive, complex JSON from the AI in real-time. Use simpler, smaller AI prompts that return just IDs or titles, and fetch the rich metadata from our own database.

---

## Phase 3: The Owned Catalog (Open Data Ingestion)
*Goal: Break free from AI rate limits entirely for search and catalog retrieval.*

*   **Step 3.1: Seed the Database:** Implement the Open Data ingestion pipeline (Open Library, TMDB, Open Food Facts) to populate a massive, owned catalog in Firestore or a dedicated search database.
*   **Step 3.2: Dedicated Search Engine:** Replace AI-driven search with a standard, lightning-fast search index (e.g., Meilisearch, Algolia, or Firestore vector search). Users should instantly find items without waking up the LLM.
*   **Step 3.3: AI as the "Brain", Not the "Brawn":** With the catalog owned, relegate the AI solely to analyzing Taste Profiles and matching user preferences to the static database, rather than asking it to invent the items from scratch.

---

**Rules of Engagement for the AI Agent:**
1.  **Do not skip steps.** Complete Phase 1 entirely before moving to Phase 2.
2.  **Verify before proceeding.** Ensure caching actually works and saves credits before writing the next feature.
3.  **No mock data.** Implement real robust error handling, not hardcoded placeholders.
