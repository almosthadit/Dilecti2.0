# Dilecti Implementation Plan: Database & AI Optimization

This board tracks the current objectives, technical debt, and backlog for Dilecti.

## Priority 1: The Local-First Search Fallback (Quick Win, High Impact)
The Change: Rewrite the SmartSearchBar and search API to query drizzle first. Only hit external APIs if local results < 3.
UX Impact: Users typing in the search bar will see instant dropdown results for the 9,000 seeded items. The app will feel as fast as Apple Spotlight. No loading spinners for popular queries.
Cost Impact: Immediate drop in third-party API calls.

## Priority 2: Instant Vector Discover Feed (Core Value Prop)
The Change: Replace the AI-generated "Discover" tab logic with a purely mathematical pgvector query. We average the user's saved items, and query the DB for the closest 50 vectors.
UX Impact: The Discover tab goes from a 3-second loading state to 0.1 seconds. Users get an infinite scroll of highly personalized recommendations that feel like magic but cost nothing to generate.
Cost Impact: Eliminates Gemini API usage for basic feed generation. AI is reserved purely for conversational chat and generating written insights.

## Priority 3: Social "Taste Match" Badges (Viral Loop)
The Change: Implement a simple SQL function that compares user profiles using Cosine Similarity on their item vectors.
UX Impact: When looking at a friend's profile or an item, users see a "92% Match" badge. This creates a highly engaging, Tinder-like discovery mechanic for media and friends.

## Priority 4: Background API Harvester (Data Moat)
The Change: When a user searches for an obscure item (e.g., a brand new release) and the app falls back to the external API, we asynchronously save that item and generate its embedding in the background.
UX Impact: The user who searched for it waits 1 second. Every user after them gets it instantly. The app feels like it's constantly getting smarter and faster.
