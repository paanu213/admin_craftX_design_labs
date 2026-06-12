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
  **Always use `window.location.assign("/")` for post-login redirect** — it forces a full page load so the session cookie is sent and the dashboard server component sees the authenticated session. (`window.location.href = "/"` is equivalent but triggers `react-hooks/immutability` lint error — use `.assign()` instead.)

- **`proxy.ts` MUST use `getToken` from `next-auth/jwt` — NEVER `auth(handler)`.**
  Using `auth(handler)` in `proxy.ts` runs the full JWT callback on every request, including a DB query for group permissions. When that DB call is slow or times out, `req.auth` returns null → `isLoggedIn = false` → user is redirected to `/login` after a successful login (the post-login loop).
  **The proxy does ONLY an optimistic cookie/JWT check (`getToken`). Full session validation lives in `(dashboard)/layout.tsx`.**
  Correct pattern:
  ```typescript
  // proxy.ts — keep this exactly as-is, never replace with auth(handler)
  import { getToken } from "next-auth/jwt";
  export async function proxy(request: NextRequest) {
    const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
    const isLoggedIn = !!token;
    if (!isLoggedIn && !isPublic) return NextResponse.redirect(new URL("/login", nextUrl));
    if (isLoggedIn && isPublic) return NextResponse.redirect(new URL("/", nextUrl));
  }
  ```

- **Never add `src/middleware.ts` alongside `src/proxy.ts`.** Next.js 16 uses `proxy.ts` as the middleware file. Having both causes a build error: "Both middleware file and proxy file are detected. Please use proxy.ts only."

- **Access control is PURELY group-based — there is NO role bypass.**
  The `role` field on a User is a **designation** (job title: CEO, CMO, Employee…) and has zero effect on permissions.
  Full access is granted only by being in a group with ALL modules × ALL actions = true (i.e. "Super Admin" group with "Grant Full Access" applied).
  Do NOT add `if (token.role === 'SUPER_ADMIN')` bypasses — they were removed intentionally.

## CI / Build

- **Zod v4 breaking change:** `z.number()`, `z.enum()` etc. no longer accept `{ invalid_type_error, required_error }` constructor params. Use plain `.number()` with chained `.min()/.max()` and pass message strings directly to enum validators.

- **Razorpay SDK must NOT be instantiated at module level.** `new Razorpay({ key_id, key_secret })` throws `key_id or oauthToken is mandatory` at Next.js build time when env vars are absent (CI). Always instantiate it **inside the route handler**, after the env-var guard check.

- **ESLint — exclude `.claude/` from linting.** Agent worktrees at `.claude/worktrees/` contain stale copies of source files and will produce false lint errors. The `eslint.config.mjs` globalIgnores list must include `".claude/**"`.

- **`react-hooks/immutability` — use `window.location.assign("/")` not `window.location.href = "/"`.**
  Direct property assignment to `window.location.href` is flagged as a mutation of an external value. `window.location.assign("/")` is identical in behavior and passes the rule.

- **`react-hooks/set-state-in-effect`:** Calling `setState()` directly inside a `useEffect` body triggers this rule. Wrap the entire `useEffect` block with `/* eslint-disable react-hooks/set-state-in-effect */` … `/* eslint-enable */` (not `eslint-disable-next-line` on the `useEffect` line — that only suppresses the next line, not the body).

- **`@typescript-eslint/no-explicit-any` in API routes:** Import proper Prisma enum types from `@/generated/prisma/enums` (e.g. `AppStatus`, `ExpenseStatus`) and cast with those instead of `any`.

## Permissions — Adding New Modules

**Rule: Every new feature/section added to the application must be added to `src/lib/permissions.ts` MODULES array.**

- Add the new module key+label to `MODULES` (this makes it appear in the User Groups permissions matrix screen)
- Add old-style permission keys for it to `OLD_KEY_MAP` (e.g. `viewXxx: ['xxx', 'read']`)
- Add defaults for it in `ROLE_FALLBACK_PERMISSIONS` for CEO, CMO, etc.
- Update the Sidebar to use the new permission key (not a borrowed one from another module)
- Update any API routes guarding that module to use `canDo(matrix, "xxx", "read/create/...")` with the correct module key
- SUPER_ADMIN role always gets full access automatically
- Any group with ALL modules + ALL actions = true is auto-promoted to FULL_PERMISSIONS (no need to re-save when a new module is added — it's automatic)

## Auth / Group Permissions — Key Behaviour

- Group permissions are re-fetched on **every JWT token refresh** — permission changes take effect immediately without re-login.
- If a user is in a group where ALL modules × ALL actions = true → they get `FULL_PERMISSIONS` automatically (any new module added later is covered too).
- `role` field = designation only (CEO, CMO, Employee…). It does NOT grant access to anything.
- To give a user full/super-admin access: add them to the "Super Admin" group (which must have "Grant Full Access" applied).
- Never check `session.user.role` for access control — always use `canDo(session.user.permissionMatrix, module, action)`.
- Approval actions (approve payment, approve expense, generate dev password) use `canDo` with the relevant module's `update` or `create` permission, not role checks.

## Secrets / Environment Variables

- **Never commit secrets.** Razorpay keys, DB passwords, and all credentials go in `.env` only (gitignored). Add placeholders to `.env.example`.
- When adding new third-party integrations (payment gateways, cloud SDKs, etc.), always add their env var placeholders to `.env.example` immediately.
