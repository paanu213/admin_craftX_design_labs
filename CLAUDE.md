@AGENTS.md

# ⚠️ STRICT BRANCH RULE — NEVER OVERRIDE

**Stage branch:** `claude/client-expense-app-planning-vlz7r`
**Production branch:** `main`

## Rules (non-negotiable)
1. ALL code changes, fixes, and features MUST be committed and pushed to the **stage branch only**.
2. NEVER commit or push to `main` without an explicit instruction from the user such as "merge to main", "push to main", or "deploy to production".
3. Every session starts on the stage branch. Verify with `git branch` before any commit.
4. If in doubt — push to stage, not main.

---

# Known Gotchas & Rules (learned from past bugs)

## Auth / Login

- **Never use `router.push()` + `router.refresh()` together after sign-in.**
  `router.refresh()` re-renders the current route and races against the push, leaving the user stuck on the login page even though auth succeeded.
  **Always use `window.location.href = "/"` for post-login redirect** — it forces a full page load so the session cookie is sent and the dashboard server component sees the authenticated session.

- **SUPER_ADMIN permission override must run on EVERY token refresh, not just at sign-in.**
  In `src/lib/auth.ts`, the `if (token.role === 'SUPER_ADMIN') { token.permissionMatrix = FULL_PERMISSIONS; }` block MUST be placed OUTSIDE the `if (user) { ... }` block so it runs on every JWT callback invocation, not just when a user first signs in.

## CI / Build

- **Zod v4 breaking change:** `z.number()`, `z.enum()` etc. no longer accept `{ invalid_type_error, required_error }` constructor params. Use plain `.number()` with chained `.min()/.max()` and pass message strings directly to enum validators.

- **Razorpay SDK must NOT be instantiated at module level.** `new Razorpay({ key_id, key_secret })` throws `key_id or oauthToken is mandatory` at Next.js build time when env vars are absent (CI). Always instantiate it **inside the route handler**, after the env-var guard check.

- **ESLint — exclude `.claude/` from linting.** Agent worktrees at `.claude/worktrees/` contain stale copies of source files and will produce false lint errors. The `eslint.config.mjs` globalIgnores list must include `".claude/**"`.

- **`react-hooks/set-state-in-effect`:** Calling `setState()` directly inside a `useEffect` body triggers this rule. Wrap the entire `useEffect` block with `/* eslint-disable react-hooks/set-state-in-effect */` … `/* eslint-enable */` (not `eslint-disable-next-line` on the `useEffect` line — that only suppresses the next line, not the body).

- **`@typescript-eslint/no-explicit-any` in API routes:** Import proper Prisma enum types from `@/generated/prisma/enums` (e.g. `AppStatus`, `ExpenseStatus`) and cast with those instead of `any`.

## Secrets / Environment Variables

- **Never commit secrets.** Razorpay keys, DB passwords, and all credentials go in `.env` only (gitignored). Add placeholders to `.env.example`.
- When adding new third-party integrations (payment gateways, cloud SDKs, etc.), always add their env var placeholders to `.env.example` immediately.
