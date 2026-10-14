# Validation record

Reviewed against the supplied International Track appendix on **14 October 2026**. See `competition-requirements.md` for the requirements matrix and contestant obligations.

## Current verification

- `bun run test:eval`: **208 passed, zero failed**. Regenerated local evaluation and transactional payment evidence.
- `bun run build`: passed. Existing Vite warnings for bundles over 500 KB remain.
- `bunx tsc --noEmit -p convex/tsconfig.json`: passed.
- Backend synchronized successfully with `bunx convex dev --once` to **dev:optimistic-mockingbird-578**.
- Authenticated manual sandbox journey: passed on the development backend.
- `RUN_FINANCE_SMOKE=1 RUN_AGENT_SMOKE=1 RECORD_DEMO=1 bunx playwright test e2e/finance-agent.pw.ts`: **passed** with the configured live model. A fictional student enabled AI processing, asked the model to prepare tuition, explicitly approved, executed, and exported the receipt and ledger. The current recording/export come from this successful run.
- `bun run test:e2e`: 122 passed, two opt-in tests skipped, one marketing-autoplay timing failure. After making motion preferences explicit, waiting for the visible preview and allowing a full autoplay cycle, `bunx playwright test e2e/accounts.pw.ts --grep "preview autoplays"` passed all three affected cases. **All 123 non-opt-in browser cases passed across the full run and focused rerun.** The opt-in financial case was separately enabled and passed with the live AI model; the separate account session-restoration smoke remains unrun.
- Scoped Prettier checks and `git diff --check`: passed. The existing formatting of `src/App.tsx` was preserved around its single changed tour property.

## Evidence and fixes

`docs/evidence/local-evaluation.json` covers deterministic planning, route/deadline/expiry checks, protected reserves, funding confirmation, account ownership, sponsor isolation, bounded AI dispatch, consent, timeout fallback and idempotent payment execution. Model responses in these local tests are mocked.

`docs/evidence/sandbox-execution.json` exercises actual handlers with convex-test transactions. It is local application evidence.

`docs/evidence/development-session.json` and `docs/evidence/sandbox-demo.webm` record the authenticated development journey with a live `prepare_tuition_payment` tool result, owner approval, one atomic wallet debit and a matching UUID receipt. `docs/evidence/demo-manifest.json` identifies the command, environment, consistency checks and file hashes. Data is fictional; no real money moved or external provider settlement occurred. Daily market references informed comparison arithmetic; provider fees remain illustrative.

The audit restored the missing route-details → owner-review transition, added feedback when a changed comparison needs saving, sequenced first-visit AI privacy and introduction dialogs, and allowed completed receipts to be retrieved after study-currency changes without another debit. Tests were updated for listed-university selectors, current route categories, mobile navigation and current labels. Browser preview roots survive Vite entry reevaluation.

## Historical model evaluation

`docs/evidence/live-agent-evaluation.json` retains the earlier six-scenario live-model evaluation and prior timeout summaries. It was not rerun in this audit. Those synthetic prompts use local read-only tools and simple factual text checks; they are separate from the current authenticated payment journey. Neither six scenarios nor one authenticated trial establishes an overall task-success rate.

## Practical limits

The browser recording is an automated walkthrough without narration. A student usability study, independent security review, provider settlement, real recipient verification, KYC/AML/sanctions validation, bank-holiday calendars, recovery/MFA and operational monitoring are not established by these checks. See `security-self-assessment.md`.

Tests created dedicated fictional accounts on the development backend. Source is committed to the repository; publishing the frontend and competition submission are separate contestant actions. Team eligibility, registration, rights clearance and a presentation rehearsed within ten minutes remain to be confirmed. Judges determine the score.
