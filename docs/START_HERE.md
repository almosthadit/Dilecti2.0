# 🚀 START HERE: Dilecti Development Guide & Onboarding

Welcome to the Dilecti project. Dilecti is a universal media tracking, discovery, and social platform. It allows users to log and review books, movies, TV shows, food, music, products, places, events, and games in a single place.

*Dilecti evolved from "Feyble", an initial application that focused solely on book reviews. You will see legacy Feyble code; treat it with care.*

Please refer to this guide and the other documentation as needed when working on the project.

---

## 1. Project Purpose & Scope
Dilecti is designed to be the single source of truth for a user's tastes. It requires a robust, scalable architecture backed by Firebase (Firestore/Auth) and a highly polished, mobile-first React frontend.

## 2. Helpful Documentation
Here is a list of documentation you can consult if you need context:
1. **`START_HERE.md`** (Overview)
2. **`../AGENTS.md`**: Guide for AI agents.
3. **`/docs/PRD.md`**: Product vision, metrics, and feature requirements.
4. **`/docs/ARCHITECTURE.md`**: Systems design, data schemas, and technical stacks.
5. **`/docs/DESIGN.md`**: Visual language, Tailwind CSS standards, and UX patterns.
6. **`/docs/SCREENS.md`**: Screen inventory, routing maps, and component reuse.
7. **`/docs/TASKS.md`**: Current sprint, backlog, and active work.

## 3. Pre-Implementation Checklist
Before writing a single line of code, complete this mental and planned checklist:
- [ ] **Context Verification:** Did you read the relevant docs listed above?
- [ ] **Component Audit:** Did you check `SCREENS.md` and `src/components/` to ensure you aren't duplicating an existing UI element? (e.g., use `UniversalAddModal` instead of a custom add form).
- [ ] **Architecture Fit:** Does the feature fit into the established routing architecture in `src/App.tsx`? Does it respect Firebase security rules?
- [ ] **State Plan:** Will this use global `UserContext`, local `useState`, or Firestore realtime hooks?
- [ ] **Action Plan:** Summarize your intended changes internally before execution.

## 4. Post-Implementation Checklist
After modifying the codebase:
- [ ] **Build Check:** Does the code compile successfully?
- [ ] **Visual QA:** Does it generally follow `DESIGN.md`? Are loading, empty, and error states handled?
- [ ] **Task Tracking:** Update `TASKS.md` to reflect completed work if needed.
- [ ] **Documentation Sync:** Update `ARCHITECTURE.md` or `SCREENS.md` if significant structural changes were introduced.

## 5. Guidelines for Contribution
* **Consistency:** Try to follow existing design patterns when possible.
* **Reuse:** Leverage existing utility functions (`src/lib/utils.ts`, `src/lib/search.ts`) and global contexts.
* **Clarity:** Write clean, readable code.
* **Data Integrity:** Ensure Firestore operations respect security rules.
