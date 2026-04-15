# TCG Dexter — Claude Code Guide

## Project Overview
Pokémon TCG deck management web app. Core features: deck profiling (legality, price, meta match), saved deck library, match logging, deck sharing via QR/link.

## Stack
- **Next.js 14** (App Router, server components + client islands)
- **TypeScript 5**, **Tailwind CSS 3**, **React 18**
- **Supabase** — auth + database (server client via `@/lib/supabase/server`, client via `@/lib/supabase/client`)

## Deployment
- **Main branch = production** on Vercel. Every push to `main` triggers a deploy.
- Always run `npx tsc --noEmit` before pushing — Vercel runs a full type-check build and will fail on any TS error.

## Key Architecture

### Routes
| Route | Description |
|---|---|
| `/` | Home — paste deck list, get instant analysis |
| `/my-decks` | Saved deck library (auth required) |
| `/my-decks/[id]` | Individual saved deck profile |
| `/d/[shortId]` | Public shared deck page |
| `/meta-decks/[slug]` | Meta archetype profile |

### API Routes (`app/api/`)
| Route | Purpose |
|---|---|
| `POST /api/analyze` | Analyze a deck list |
| `GET/POST /api/saved-decks` | List / create saved decks |
| `PATCH/DELETE /api/saved-decks/[id]` | Rename / delete a saved deck |
| `POST /api/matches` | Log a match result |
| `POST /api/deck-share` | Generate a shareable short URL |

### Component Conventions
- **`DeckProfileView`** (`app/components/DeckProfileView.tsx`) — shared full-page layout used by both public shared decks and private saved deck profiles. Key props: `pageTitle`, `titleAction`, `subtitle`, `topSlot`, `footerCta`, `hideSave`.
  - `topSlot` renders inside the main `flex flex-col gap-4` container, above the analysis modules.
  - `subtitle` is conditionally rendered — pass `false` to suppress the default "Created on…" date fallback without leaving dead space.
  - `titleAction` renders inline after the `<h1>` (use for pencil/rename icon).
- **`SavedDeckRow`** (`app/my-decks/SavedDeckRow.tsx`) — list item in `/my-decks`. Row tap navigates to the deck profile. Log Match button expands an inline form.
- **`MyDeckClient`** (`app/my-decks/[id]/MyDeckClient.tsx`) — client wrapper for saved deck detail. Owns rename + delete state; passes action buttons, MatchLog, DeckNotes, and DeckList into `topSlot`.

### Design Tokens (globals.css)
```
--bg: #f2f2f2          (page background)
--surface: #e8e8e8     (card/cell default background)
--border: #d95555
--text-primary: #1a1a1a
--text-secondary: #4a4a4a
--text-muted: #888888
--accent: #d95555
```
White (`bg-white`) is used for elevated cards (match log, deck list, saved deck rows) to stand out from `--surface`.

### Button Sizing Convention
Action button rows use `text-xs font-semibold` with `px-3 py-1.5` for text buttons and `px-3 py-[7px]` for icon-only buttons (the 1px extra vertical padding compensates for the missing text line-height, keeping all buttons the same height). Black background buttons use `border border-transparent` to match the height of bordered buttons like Log Match.

## Tailwind Notes
- Content paths: `./app/**/*.{ts,tsx}` and `./components/**/*.{ts,tsx}`
- No custom font sizes defined — uses Tailwind defaults (`text-xs` = 12px, `text-sm` = 14px, `text-base` = 16px, `text-lg` = 18px, `text-xl` = 20px, `text-2xl` = 24px)
- Arbitrary values (e.g. `py-[7px]`) are supported via JIT

## Dev Server
```bash
npm run dev   # runs on port 3000
```
Preview server config lives at `.claude/launch.json`.
