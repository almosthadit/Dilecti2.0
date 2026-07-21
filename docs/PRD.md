# 📋 Product Requirements Document (PRD)

## 1. Product Vision
Dilecti is a universal media, taste, and experience tracking platform. It replaces the fragmented ecosystem of niche trackers (Goodreads for books, Letterboxd for movies, Yelp for food) with a single, highly aesthetic, cohesive personal library. Originating from *Feyble* (a premium book tracker), Dilecti elevates user metadata into a beautifully designed personal archive and taste graph.

## 2. Core Value Proposition
- **Unified Logging:** Frictionless capture of *anything* the user experiences.
- **Aesthetic Excellence:** A design-forward interface that makes personal data look like a premium editorial magazine.
- **Taste Graphing & AI:** Leveraging Gemini AI to cross-reference a user's tastes (e.g., "Since you love David Lynch films and Cyberpunk books, try this video game.")
- **Social Connectivity:** Discovering taste crossovers with friends through a curated, non-toxic activity feed.

## 3. Target User Personas
1. **The Curator (Primary):** Meticulous tracker. Wants a unified aesthetic to showcase their refined taste. Cares deeply about precise ratings (Rich Critic Portal) and organization.
2. **The Casual Logger (Secondary):** Wants quickly to save a restaurant recommendation or movie trailer before they forget. Needs frictionless, fast entry.
3. **The Feyble Legacy User:** Came for books, staying for movies and music. Expects parity with existing reading stats and reading goals.

## 4. Key Features & Epics
- **Epic 1: Universal Taxonomy Engine**
  - Polymorphic `UserItem` data model supporting Books, Movies, TV, Music, Games, Places, Food, Products, and Events.
  - Universal Add Modal with fast, integrated search logic.
- **Epic 2: Core UX & Library**
  - Master Library View with dynamic filtering, sorting, and inline editing.
  - Granular Profile view demonstrating taste metrics and genre affinity.
- **Epic 3: Deep Reviewing System**
  - Rich Critic Portal: Float-based ratings (0.0 - 10.0 scale) alongside standard binary love/like reactions.
  - Persistent markdown/rich-text review editor.
- **Epic 4: AI & Discovery**
  - "Ask For Ideas" interaction: Gemini-powered semantic search against the user's library and global trends.
  - AI Assistant for natural language logging (e.g., "Add Dune to my books and rate it 9.5").
- **Epic 5: Social Feed (WIP)**
  - Asynchronous activity stream of followed users' logs and reviews.
  - Low-friction interactions (likes, saves to own library).

## 5. Success Metrics & KPIs
- **Activation:** 60% of signups log their first item within 5 minutes.
- **Retention (MAU):** 40% of users log >3 items per month.
- **Engagement Depth:** The average active user utilizes >2 distinct categories (e.g., Books + Movies).
- **Social Graph:** Average user follows >5 friends.

## 6. Edge Cases & Constraints
- Offline support and sync conflict resolution (relying heavily on Firebase offline persistence).
- Search API rate limits for book/movie metadata APIs.
- Privacy controls: Allowing items to be marked "Private" and hiding them from the Social Feed.
- Handling legacy 1-5 integer ratings from Feyble migrating cleanly to the new 0.0-10.0 scale.
