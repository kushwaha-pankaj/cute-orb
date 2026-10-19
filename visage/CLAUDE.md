# Visage — notes for Claude

React + three.js character studio. `npm run dev` serves it on port 5173.

## Mascots

Before creating, changing or fixing any mascot (registry entry, studio definition, renderer, expressions or product still), read `MASCOT_RULEBOOK.md` and follow it. Run its pre-merge checklist (section 11) before calling the work done, and add a row to its mistakes log (section 12) when you fix a new class of bug.

Key rules, in short:
- Never hard-code a mascot name, id, count or image outside `src/mascots/` and its own renderer. Pages read the registry in `src/mascots/index.js`.
- Renderers mount into a `.presence` div, read config from a ref every frame, resize with a ResizeObserver, and dispose everything on unmount.
- Frame characters with camera zoom, not model scale. Keep the top of the stage empty.
- Verify every expression visually at thumbnail size. Opposite moods must look opposite.
