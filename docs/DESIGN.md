# 🎨 Design System & UX Standards (DESIGN.md)

Dilecti achieves a premium, "editorial" aesthetic through rigorous adherence to minimalism, strict typography, and deliberate negative space.

## 1. Core Visual Philosophy
- **No Slop:** Avoid generic blue/purple gradients, gratuitous shadows, or chaotic layouts. Every visual choice must look intentional.
- **Content First:** The user's metadata (book covers, movie posters, their reviews) is the hero. The UI should recede.
- **Editorial Contrast:** Emphasize the interplay between large, elegant serif headers and dense, technical sans-serif metadata.

## 2. Color Palette (Tailwind Configuration)
**Backgrounds & Surfaces:**
- Layout Background: `bg-[#f9f8f6]` (Soft, warm off-white). Not stark `#ffffff`. Dark Mode: `#121212`.
- Cards: `bg-white` border `border-black/5`. Dark Mode: `bg-[#1e1e1e]` border `border-white/5`.

**Typography / Ink:**
- Primary Text: `text-[#1a1a1a]` (Charcoal). Dark Mode: `text-[#f9f8f6]`.
- Secondary/Muted: `text-black/50`. Dark Mode: `text-white/50`.

**Action Colors:**
- Primary Action Add/Save: `bg-emerald-600` / `text-emerald-700`.
- Feyble Legacy Brand: `bg-[#9b4dca]` (Purple).
- Universal Category Coding (for chips/badges):
  - Movie/TV: Blue `text-blue-600 bg-blue-50`
  - Music: Purple `text-purple-600 bg-purple-50`
  - Food: Orange `text-orange-600 bg-orange-50`
  - Book: Indigo `text-indigo-600 bg-indigo-50`
  - Place: Teal `text-teal-600 bg-teal-50`

## 3. Typography Hierarchy
All fonts are managed in `index.css`.
- **Primary Display (`font-serif`):** `Playfair Display`. Use for massive page titles (`text-3xl` to `text-5xl`), empty state hero text, and major quote blocks.
- **Metadata & UI (`font-sans`):** `Inter`. Use for all dense reading material, buttons, inputs, and descriptions (`text-xs` to `text-base`).
- **Brand Wordmark (`font-logo`):** `Cormorant Garamond`. Strictly reserved for headers.

## 4. Layout, Spacing, and Density
- **Mobile Paradigm:** Always code mobile-first. Rely heavily on bottom sheets and bottom navigation (`pb-24` payload clearance). 
- **Component Padding:** Standardize on `p-4` or `p-6` for cards. 
- **Radii:** `rounded-2xl` for major content blocks, `rounded-xl` for inputs/buttons, `rounded-full` for pill tags and FABs. 
- **Z-Index Scale:**
  - Base: `z-0`
  - Modals/Bottom Sheets: `z-50`
  - Mobile Nav: `z-[100]`

## 5. Interaction & Animation (`motion`)
- **Micro-interactions:** All buttons and interactive cards must have `active:scale-[0.98] transition-all` for immediate satisfying physical feedback.
- **Hover States:** Buttons should darken slightly (`hover:bg-black/5`). Desktop cards should utilize `group` and `group-hover:shadow-md`.
- **Page Transitions:** Keep them subtle. Fade in elements (`animate-in fade-in duration-500`) rather than aggressive sliding.

## 6. Accessiblity (a11y)
- Minimum contrast ratio 4.5:1 for text.
- Use `lucide-react` with `aria-hidden="true"` and provide adjacent `span className="sr-only"` labels for icon-only buttons.
