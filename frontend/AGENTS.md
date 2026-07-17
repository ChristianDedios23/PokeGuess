# Frontend notes for agents

- **Commands**: `npm run dev` (serves on port **3001**, not 3000), `npm run build`, `npm run lint`. There is no test suite — don't assume a `test` script exists or invent one.
- **No `tailwind.config.js`** — this is Tailwind v4, configured inline in `app/globals.css` via `@theme inline`.
- **Dark mode** is driven by `prefers-color-scheme` media queries throughout, not a `.dark` class toggle.
- **Board theming**: colors/backgrounds per wallpaper are centralized in `lib/boardThemes.ts` (`accent` + `pageBackground` per theme). The page background is applied via a CSS custom property (`--background`) set from `GuessBoard.tsx`.
- **Per-room, per-player localStorage keys** (ruled-out picks, wallpaper choice) are namespaced by room code + player slot — keep that scoping if extending persisted state.
