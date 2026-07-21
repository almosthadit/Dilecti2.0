# Dilecti - Screen & Component Inventory

This document provides a comprehensive inventory of the Dilecti application's screens, components, functionality, and related Firebase collections.

## 1. Main Navigation & Core Pages

### Home Page (`/`)
*   **Component**: `DilectiHome`
*   **Purpose**: The central landing page to "Find something awesome." Displays category shortcuts, personalized AI-curated recommendations based on the user's taste profile, and calls to action for building a social network.
*   **Key UI Elements**: 
    *   Category shortcut grid (Food, TV/Movies, Music, Products, Places, Books, Events, Games).
    *   "Curated For You" AI recommendations horizontal scroll (with filter dropdown).
    *   "Curate Your Circle" module for inviting friends.
*   **User Actions**: Navigate to categories, view recommendation details (opens preview modal), save recommendation to library, reject recommendation, add preferences if empty.
*   **Related Database Collections**: `users/{uid}` (profile, cached recommendations).

### Universal Library (`/library`)
*   **Component**: `UniversalLibrary`
*   **Purpose**: A unified view of everything the user has saved, organized and grouped by category.
*   **Key UI Elements**:
    *   Status filters ("Tried", "Want to Try") and sorting dropdown ("Recency", "Rating").
    *   Reorderable, collapsible category rows (via Drag and Drop).
    *   Horizontal scroll for items within each category line.
*   **User Actions**: Reorder categories via drag, collapse/expand sections, filter library state, add new items (opens `UniversalAddModal`), open item details.
*   **Related Database Collections**: `users/{uid}/items`

### Category Zone (`/zone/:categoryId`)
*   **Component**: `CategoryZone`
*   **Purpose**: A dedicated hub for a specific category (e.g., Food, TV/Movies). It consolidates library items, AI discoveries, and social feed activity just for that category.
*   **Key UI Elements**:
    *   Zone Header with category switcher dropdown.
    *   Tabs: "All", "Library", "Discover", "Social".
    *   Progress / Status filters specifically context-aware (e.g. "Reading", "Watching", "Tasting").
*   **User Actions**: Switch categories, filter items, save new items, browse trending/AI selections, interact with social feed for the category.
*   **Related Database Collections**: `users/{uid}/items`, `users` (for social queries).

### Discover (`/discover`)
*   **Component**: `DiscoverTab`
*   **Purpose**: Personalized recommendations powered by the user's taste profile and social network activity.
*   **Key UI Elements**:
    *   Category filter dropdown.
    *   "From Your Network" section displaying highly-rated items from friends.
    *   Categorized AI recommendation rows.
    *   Action overlay on cards (Add to Library, Not Interested).
*   **User Actions**: Filter recommendations by source (AI vs. Human/Social), dismiss items, quickly add items to library.
*   **Related Database Collections**: `users/{uid}` (preferences/profile), `users/{uid}/following`, `users/{followed_uid}/items`.

### Activity Feed (`/feed`)
*   **Component**: `FeedTab`
*   **Purpose**: A social engagement space to see what friends are saving, reviewing, and tracking.
*   **Key UI Elements**:
    *   "Find friends" search bar with autocomplete results.
    *   Feed activity/timeline cards showing user avatar, action, book/item, review snippet, and timestamps.
    *   Filters: "All Activity", "With Reviews", "Currently [Action]". Advanced filters dropdown.
    *   "Trending" horizontal scroller.
*   **User Actions**: Search and follow other users, preview items from the feed, filter feed visibility.
*   **Related Database Collections**: `users` (global user search), `users/{uid}/following`, `users/{followed_uid}/items`.

### Stats (`/stats`)
*   **Component**: `StatsTab`
*   **Purpose**: View metrics on activity, reviews, and library composition.
*   **Key UI Elements**:
    *   Metrics grid (Items Saved, Avg Rating, Reviews Written, Active Streaks).
    *   "Recently Saved" list view.
    *   "Top Rated Creators" list view.
*   **User Actions**: Passive viewing.
*   **Related Database Collections**: `users/{uid}/items` (calculates averages/aggregations locally).

### Earn / Monetization Dashboard (`/earn`)
*   **Component**: `EarnTab`
*   **Purpose**: Landing page explaining the creator monetization features and displaying current earnings.
*   **Key UI Elements**:
    *   Available Balance display (e.g. $0.00).
    *   "Cash Out" call to action.
    *   "How to Earn" informational list (Curate Library, Influence Others, Top Critic bonuses).
*   **User Actions**: Mostly informational; intent to trigger payouts.
*   **Related Database Collections**: Would likely connect to a wallet/payouts collection (placeholder UI right now).

### Profile & Settings (`/profile`)
*   **Component**: `ProfileTab`
*   **Purpose**: User account configurations, demographic context for AI, taste preferences, and account management.
*   **Key UI Elements**:
    *   Avatar upload & profile header.
    *   Taste Profile Overview (AI summarization & understanding).
    *   Demographics & Context form (Birthday, Gender, Location, Employment, Lifestyle).
    *   AI Curation Preferences (Favorite Genres, Tropes, Moods, Authors, Ranked Books).
    *   Integrations panel (Goodreads).
    *   System toggles (Dark Mode, Data Export, Replay Tutorial, Restart Onboarding).
*   **User Actions**: Upload avatar, update text preferences, configure genres/tropes, sign out, export JSON backup.
*   **Related Database Collections**: `users/{uid}` (profile, demographics, taste preferences).

---

## 2. Modals, Overlays, & Utilities

### Add/Edit Item Modal
*   **Component**: `UniversalAddModal`
*   **Purpose**: Allows adding items singularly or in bulk to the user's library.
*   **Key UI Elements**: Search bar, category switcher tabs, "Bulk Import" and "AI Parse" toggles, form fields (Title, Subtitle, Status, Reaction, Review).
*   **User Actions**: Search via API, parse text/voice, fill manual fields, save to library.

### Item Detail Modal
*   **Component**: `ItemDetailModal`
*   **Purpose**: Shows the full details of an item inside the user's library.
*   **Key UI Elements**: Cover image, title, detailed description renderer, rating/review display, tags.
*   **User Actions**: View info, edit item (routes to add modal), delete item, share item.

### Taste Profile Modal
*   **Component**: `TasteProfileModal`
*   **Purpose**: Onboarding flow to capture user taste through different methods.
*   **Key UI Elements**: Tabbed interface (Start, AI Interview, Quick Quiz, Manual Entry). Microphone button for voice input via Web Speech API.
*   **User Actions**: Speak to AI, select preset categories, type manual entries, save preferences to profile.

### Rich Critic Portal
*   **Component**: `RichCriticPortalModal`
*   **Purpose**: Expanded monetization dashboard for approved curators.
*   **Key UI Elements**: Advanced stats (Criticoins, Earnings, Conversion Rate), Active Opportunities panel.
*   **User Actions**: View affiliate statuses, manage monetization paths.

---

## 3. Books Sub-App (`/books/*`)

The `/books` and `/feyble` routes are completely handled by the isolated `FeybleApp.tsx` router. While it shares many conceptual overlaps, it has its own specialized modals:

*   **`AIAssistantModal`**: AI Chatbot companion for book recommendations and library queries.
*   **`BookPreviewModal`**: A display modal specifically tailored to book metadata.
*   **`ReviewEditor`**: A specialized WYSIWYG/text editor for drafting book reviews.
*   **`ImportModal`**: Focuses intensely on Goodreads CSV imports and parsing.
*   **`AskForIdeasModal`**: Specific prompt-injection module to get reading ideas.
*   **`OnboardingModal`**: A sequenced tutorial flow (Welcome, Taste setup, Features tour) originally designed for the books implementation.

---

## 4. Overall Architecture & Layout

*   **Layout Shell (`LayoutShell`)**: Wraps all core routes (except standalone `/books`) with `DilectiHeader` at the top and `Navigation` (bottom tab bar).
*   **Bottom Navigation**: Dynamic bar that routes to Home, Library, Discover, Feed, Stats, Earn, Profile. Uses `lucide-react` icons.
*   **Contexts**: 
    1.  `UserContext`: Firebase Auth state management.
    2.  `useUserProfile`: Fetches user demographics, cache, and string preferences from `users/{uid}`.
    3.  `useUserItems`: Fetches universal media items from `users/{uid}/items`.
