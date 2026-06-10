@AGENTS.md

# ⚠️ STRICT BRANCH RULE — NEVER OVERRIDE

**Stage branch:** `claude/client-expense-app-planning-vlz7r`
**Production branch:** `main`

## Rules (non-negotiable)
1. ALL code changes, fixes, and features MUST be committed and pushed to the **stage branch only**.
2. NEVER commit or push to `main` without an explicit instruction from the user such as "merge to main", "push to main", or "deploy to production".
3. Every session starts on the stage branch. Verify with `git branch` before any commit.
4. If in doubt — push to stage, not main.
