# 🤖 AI Agent Operating System (AGENTS.md)

This document dictates the behavior and execution constraints for all AI agents, LLMs, and automated tools working on the Dilecti codebase. **Adherence is mandatory.**

## 1. Architectural Directives
- **Reduce Duplication:** Try to avoid creating parallel systems. Extend existing capabilities when possible.
- **Scope Awareness:** Focus on the user's request, but feel free to refactor or modify related local files if it improves the codebase or accomplishes the goal more effectively.
- **Production-Ready Default:** All generated code must be production-ready. This means handling loading states, empty states, error boundaries, and avoiding mock data placeholders unless prototyping is strictly requested.
- **Environment Parity:** Respect the sandbox. Do not modify container ports (must be 3000), and use existing proxy architectures for API keys (`server.ts`).

## 2. Technical Standards
- **TypeScript Strictness:** Avoid `any`. Use discriminated unions and strict interfaces (defined in `src/types.ts`). Do not suppress TS errors unless legacy code depends on it.
- **State Locality:** Prefer local component state unless data must be shared across the routing boundary. For global data, use the existing Firebase context hooks. No Redux, no Zustand.
- **Database Safety:** Never write destructive migration scripts, bulk delete operations, or wide table drops unless you have explicit, confirmed user consent. Treat Firestore as production data.

## 3. UI/UX Constraints
- **Responsive Design (Mobile & Desktop):** All UI MUST be responsive and optimized for BOTH mobile and desktop screens. Avoid issues where a layout looks good on one but terrible (e.g., cut off text, overflowing elements, poor spacing, uncentered elements) on the other.
- **Mobile-First Exclusivity:** All layouts must be built mobile-first using Tailwind. Default padding is `p-4` or `p-6`. Desktop layouts are progressive enhancements (`sm:`, `md:`, `lg:`). A desktop-only layout is a failure condition.
- **Adhere to `DESIGN.md`:** Do not invent new color palettes, fonts, or interaction patterns.
- **Performance:** Ensure heavy lists (like the Universal Library) use memoization or virtualization if necessary. Prevent unnecessary re-renders in Context providers.

## 4. Communication & Execution Style
- **Talk Less, Do More:** Execute code rather than explaining what you are going to do. If an explanation is necessary, keep it under 3 bullets.
- **Documentation Reflection:** When you complete a major task, consider updating `TASKS.md`, `SCREENS.md`, and any relevant architectural documentation to reflect the changes.
- **Error Recovery:** If a build fails, read the error, fix the exact line, and rebuild. Do not rewrite the entire file or rewrite unrelated logic.

## 5. Security
- **API Keys:** Never expose Gemini API keys or third-party secrets to the client. Route all sensitive operations through the Express `server.ts` layer endpoints.
## 6. Context Gathering
- Feel free to consult `/docs/START_HERE.md` and other documentation files when you need context on architecture, screens, or design decisions.
