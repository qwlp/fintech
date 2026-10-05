# Validation record

Validated on 5 October 2026 using Bun.

- `bun run test:eval`: 80 checks passed across nine test files. Regenerated local evaluation and transactional payment evidence.
- `bun run build`: passed. Vite retains existing warnings for JavaScript chunks over 500 KB.
- `bunx tsc --noEmit -p convex/tsconfig.json`: passed.
- `bun run test:e2e`: 21 passed, two opt-in persistent-account tests skipped. Includes desktop/mobile tuition decisions in light/dark mode and recorded calculation details in chat. Browser tests use a single worker and await font readiness before animated preview checks.
- `RUN_AGENT_EVAL=1 bun run eval:live`: six of six current scenarios passed the expanded smoke checks using the configured live model. Synthetic context and local read-only calculations only; no remote accounts or payment execution.

## What the evidence establishes

`docs/evidence/local-evaluation.json` records actual local regression outcomes. The suite covers deadline ranking, unknown/expired quotes, weekday arrival, funding and reserve shortfalls, negative/quoted preparation requests, source-quote expiry, UTC date rollover at execution, ownership, immutable snapshots, daily AI quotas, revoked consent, model-timeout fallback, account-private tool evidence and idempotent retries of older completed proposals.

`docs/evidence/sandbox-execution.json` contains a locally tested proposal, explicit owner approval, wallet debit, receipt and audit history. The handlers execute in convex-test transactions. This is application-level sandbox evidence, not provider settlement.

`docs/evidence/live-agent-evaluation.json` contains current raw live-model responses, tool outputs, timings and check results. Earlier run summaries remain in the report, including a run with two provider timeouts. Manual review found misleading reserve, preparation and recipient wording; instructions and factual indicators were tightened before the latest run. Current indicators check costs/top-ups, missing deadlines, stale quotes, refusal, reserve double-counting, proposal-record creation wording and recipient-confirmation/selection claims. They are simple text checks, not exhaustive semantic verification.

A 45-second model request timeout bounds individual requests. If a tool already returned before a later explanation failure, the app retains its result and displays a fallback explanation rather than requiring repetition of preparation. Daily usage is limited to 100 requests per UTC day per account.

## Practical limits

The live evaluation has one current trial per scenario, six English prompts and synthetic data. It is not an authenticated browser-to-backend agent completion measurement, a multilingual benchmark, independent audit or student usability study. Earlier run results use evolving prompts/checks and are not pooled into the current score.

No persistent remote test account was created in this run. Authenticated development-session evidence and a recorded demo video remain to be produced. No real payment provider, KYC/AML verification, bank holiday calendar or university processing integration is claimed.

Source changes have not been deployed to the Convex backend or production frontend. Synchronize the backend before running the updated app against it. Existing active proposals without deadline snapshots must be reset; previously completed receipts remain available.

Judges determine the competition score. Passing these checks does not establish a 100/100 result.
