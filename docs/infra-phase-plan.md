# TCG Dexter — Infrastructure Phase Plan (Lean)

_Pre-PMF. Just enough infra to ship safely. Expand when there's pressure._

## Current scope

Unit tests in CI. Nothing else.

- Vitest for pure-logic unit tests (no React, no jsdom)
- GitHub Actions runs `typecheck` + `test` on every push to `preview` and `main`
- Test failures don't block merges yet — they're a signal. Add branch protection later when there's a second contributor.

## Out of scope (now)

UI / e2e testing, Playwright, RTL, Sentry, monitoring, second Supabase project, migrations-as-code, Discord per-env app, per-env Blob, mac mini runner, CODEOWNERS, PR templates, feature flags. All preserved in §5 with revisit triggers.

## 1. Environments

| Env | Branch | URL |
|---|---|---|
| Local | _(any)_ | localhost:3000 |
| Preview | `preview` | preview.tcgdexter.com |
| Prod | `main` | tcgdexter.com |

**Flow**: feature branches → PR to `preview` → PR `preview` → `main` (weekly ship).

Both preview and prod hit the same Supabase project. Tests don't touch the DB (Supabase client is mocked).

## 2. Testing — Vitest only

Coverage targets in priority order:

1. `lib/deckAnalyzer.ts` and any deck parsing / format detection helpers
2. API route handlers — call exported `POST`/`GET` directly with a mocked `Request`, assert on `Response`
3. `lib/supabase/*` wrappers — mock the SDK and assert call shapes

`vitest.config.ts` runs in node env (no jsdom) — keeps tests fast and dependency-light.

### Scripts (added to `package.json`)

```json
{
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

## 3. GitHub Actions

One workflow: `.github/workflows/preview-checks.yml`. Triggers on push to `preview` and `main`.

Steps:

1. Checkout
2. Node 20 + npm install (cached)
3. `npm run typecheck`
4. `npm run test`

That's it. No e2e, no deploy hooks, no secrets, no matrix.

## 4. Your actions (Christian)

1. **Confirm GitHub repo slug** (org/repo) — only blocker
2. _Optional, defer until needed_: add branch protection on `preview` requiring the check to pass before merge

## 5. Deferred backlog (expand when needed)

| Item | Revisit when… |
|---|---|
| Playwright e2e against preview | First user-facing regression that unit tests miss |
| Component / RTL tests | Components start carrying real logic instead of being presentational |
| Second Supabase project | Auth-required e2e becomes worth standing up |
| Migrations as code | First schema change after launch, or onboarding a second contributor |
| Sentry | First production error report you can't reproduce |
| Better Stack uptime | First missed outage |
| Mac mini self-hosted runner | Safari-specific bug you can't reproduce on chromium |
| Discord per-env OAuth app | Auth flow changes that risk breaking prod sign-in |
| Per-env Blob store | First incident where preview writes touched prod assets |
| Feature flags | First feature you want to dark-launch |
| CODEOWNERS / PR templates | Second contributor joins |
| Branch protection rules beyond "checks must pass" | Second contributor joins |

---

_Last updated: 2026-04-22 — scope cut to Vitest + GitHub Actions on push to preview/main. Everything else deferred._
