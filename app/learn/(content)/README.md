# Trainer School — Curriculum (v1 draft)

This directory contains the lesson content for Trainer School v1. It is a **content draft for review** — the rendering scaffolding (`/learn` and `/learn/[slug]` routes, the MDX pipeline, `learn_progress` schema, and the `CompleteButton` client island) has not yet been built.

**Tone:** Friendly mentor — warm, conversational, second-person.

**Audience:** True beginners. The curriculum assumes the reader has never played the Pokémon TCG.

**Card images:** Currently referenced via direct `https://images.pokemontcg.io/...` URLs. The eventual scaffolding will swap these for a `<CardImage>` component that resolves card name → URL via `lib/cards/image.ts`.

## Lessons (in order)

| # | Slug | Title |
|---|---|---|
| 1 | `what-is-pokemon-tcg` | What is the Pokémon TCG? |
| 2 | `anatomy-pokemon-card` | Anatomy of a Pokémon card |
| 3 | `anatomy-trainer-card` | Anatomy of a Trainer card |
| 4 | `anatomy-energy-card` | Anatomy of an Energy card |
| 5 | `how-a-turn-works` | How a turn works |
| 6 | `win-conditions` | How you win |
| 7 | `knockouts-prize-trading` | Knockouts and prize trading |
| 8 | `reading-a-deck-list` | Reading a deck list |
| 9 | `profile-your-first-deck` | Profile your first deck |
| 10 | `save-to-library` | Save your deck and join the gym |

Order, module grouping, and per-lesson metadata are defined in `lib/learn/curriculum.ts`.

## Reviewing the content

Open the `.mdx` files in this directory in order. Each is plain markdown with a small frontmatter block; no custom components are used yet so the writing reads as-is. Notes on tone, accuracy, or coverage gaps belong in PR comments on this branch.
