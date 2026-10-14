# MoveWire

A Topic C cross-border finance assistant for international students. MoveWire combines a study plan, private sponsor coordination, an AI assistant with bounded tools, and a transactional tuition-payment sandbox.

**All payments, balances, recipient checks and route quotes are simulated. No real money moves.** The AI may calculate and prepare, but only the authenticated student can approve and execute a payment.

## Self-host locally or in China

See [Local deployment](docs/local-deployment.md) for the Docker setup, runtime frontend configuration and local AI model settings. The backend URL and AI model are configured explicitly. Browser rate references default to Frankfurter; server payment-rate refresh uses Frankfurter with an ECB fallback. These references are not binding provider quotes.

## Run locally

Requires Bun and a configured Convex development account.

```sh
bun install
bunx convex dev --once
bun run auth:setup
bun run ai:setup
bun run dev
```

The first Convex run configures the deployment and writes `.env.local`. Set server-only `AI_BASE_URL`, `AI_MODEL` and `AI_API_KEY` (or explicitly allow a private keyless local model) before `ai:setup`; never prefix a secret with `VITE_`. `auth:setup` preserves existing signing keys. See `.env.example`. Email verification and emailed recovery require an email provider and are not enabled.

Create a Student account, finish onboarding, and open the workspace. New accounts start with an empty study plan; no passwordless demo account is automatically created. A separate Sponsor account can connect using a student's single-use, 24-hour invitation. Linked accounts share names; financial-request visibility requires a separate student permission.

## Demonstrate the agent

1. Open **Payments**; it initializes fictional balances and illustrative quotes if no payment is saved.
2. Review the deadline, business-day buffer and protected living funds in the planning settings. Refresh expired quotes.
3. Open a route’s **Details**, then **Select route and review payment**. Confirm the example university in review; this is not real bank verification.
4. Open **AI Agent**, review the privacy notice and enable AI processing.
5. Ask **“Compare my tuition payment routes and check affordability.”** Inspect the recorded calculation separately from generated prose.
6. Ask **“Stress test my wallet if my home currency falls 10% against GBP.”** This changes no financial records.
7. Ask **“Prepare my tuition payment.”** The agent creates a proposal; no funds move.
8. Return to **Payments**, review the immutable terms, check consent, approve and send the sandbox payment.
9. Open **Profile → Security & activity → Payment history** and download the receipt, wallet debit and audit evidence as JSON.

To prepare manually, use **Continue** in payment review after confirming the university. Preparation, approval and sending remain distinct steps.

The agent can also save requested profile, tuition, Move Planner, budget and funding changes; select existing payment routes; refresh sandbox quotes; update the departure checklist; and add rate alerts or country-account labels. For example, ask “Set my Move Planner rent to £900 per month” or “Set my tuition deadline to 2027-09-15.” It reads current values before editing and preserves fields you did not ask to change. Only China, the United Kingdom and the United States and their listed universities are supported.

Changes to confirmed funding show an amount-confirmation card in chat and remain pending until the owner confirms. Pending changes expire after 30 minutes and cannot overwrite funding/profile changes saved since the card was created. These edits update planning records, not wallet balances. Recipient confirmation, payment approval and sending remain separate owner actions in Payments.

The recommendation is the cheapest fresh route that meets the saved deadline with a safety buffer, covers the USD debit and retains your living reserve. Blocked routes show their reasons and an illustrative USD funding top-up. Delivery counts Monday–Friday in UTC; holidays, bank cutoffs and university processing are excluded. Pending sponsor commitments never count as wallet cash.

Quotes expire after ten minutes. Changing provider requires resetting the proposal and obtaining fresh approval. Reset cancels outstanding proposals, but never reverses a completed ledger debit or replenishes the wallet. Repeated execution of a completed proposal returns its existing receipt without debiting again.

## Verification

```sh
bun run test:eval
bun run build
bunx tsc --noEmit -p convex/tsconfig.json
bun run test:e2e
```

Backend integration tests use `convex-test` with actual authentication identities and transactional mutations. Browser tests include isolated previews; the live account smoke tests require explicit environment flags and create test accounts.

```sh
EXPORT_EXECUTION_EVIDENCE=1 bun run test
RUN_FINANCE_SMOKE=1 RECORD_DEMO=1 bunx playwright test e2e/finance-agent.pw.ts
# Optional live AI service call, using the configured server key:
RUN_FINANCE_SMOKE=1 RUN_AGENT_SMOKE=1 bunx playwright test e2e/finance-agent.pw.ts
```

The first evidence command regenerates `docs/evidence/sandbox-execution.json` from a successful integration test. It is local test evidence, not an external payment-provider receipt. The UI export records the authenticated development session.

The local evaluation command writes `docs/evidence/local-evaluation.json` and regenerates payment execution evidence. It tests deterministic controls with mocked model responses.

For a live-model check using six fictional scenarios and local read-only tools:

```sh
RUN_AGENT_EVAL=1 bun run eval:live
```

This sends synthetic prompts and tool results to the configured AI service using its server settings. It creates no accounts or payment proposals. The report preserves prior run summaries, raw current responses, errors and check outcomes; simple text checks are not a semantic guarantee or a full authenticated end-to-end test.

The AI chat shows recorded calculation details separately from generated prose. If a tool completes but the subsequent model explanation times out, those results remain visible, and any prepared proposal stays available in Payments. AI requests are limited to one per ten seconds and 100 per UTC day per account.

Existing sandbox accounts must save a deadline and refresh known fixture quotes before preparing a new proposal. Reset older active proposals that lack deadline snapshots. Synchronize schema/functions with `bunx convex dev --once` when deploying these source changes; local verification does not deploy them.

## Competition materials

Topic C submission source: [GitHub repository](https://github.com/qwlp/fintech). See the [requirements audit](docs/competition-requirements.md) for the deadline, eligibility and evidence obligations.

- [Architecture and algorithms](docs/architecture.md)
- [Security self-assessment and known risks](docs/security-self-assessment.md)
- [Demo script](docs/demo-script.md)
- [Presentation deck](docs/presentation.pdf) ([editable HTML](docs/presentation.html))
- [Submission checklist and improvement roadmap](docs/submission-checklist.md)
- [Execution evidence](docs/evidence/sandbox-execution.json)
- [Validation record](docs/validation.md)
- [Local control evaluation](docs/evidence/local-evaluation.json)
- [Live-model evaluation](docs/evidence/live-agent-evaluation.json)
- [Authenticated live-AI execution](docs/evidence/development-session.json) and [demo video](docs/evidence/sandbox-demo.webm) ([provenance](docs/evidence/demo-manifest.json))
- [Student validation protocol](docs/student-validation.md)

## Scope

React/TypeScript and Convex provide the application and authentication. The configured AI service supplies the model; model replies may be inaccurate. Budget calculations, quote arithmetic, approval checks and wallet debits are server-controlled. Quotes are illustrative fixtures, not current financial-provider recommendations. Real banking integrations, jurisdiction-specific compliance validation, verified recipients, operational monitoring and independent security review remain outside this sandbox.
