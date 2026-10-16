# Tests and evidence

## Final preparation checks — 16 October 2026

Run the standard checks with:

```sh
bun run verify
```

This runs unit/backend tests, builds the app, checks backend TypeScript, and checks required submission files, local documentation links, and recorded-demo hashes. It does not deploy, create accounts, or call a live AI service.

Final preparation checks passed:

- **211 tests** across 25 files, including four deployment-script tests. Generated `submission/` copies are excluded from the test runner.
- Frontend and backend TypeScript checks and production build.
- Required submission files, local Markdown links, and recorded-demo hashes.
- Frozen Bun dependency install.
- Fresh extracted submission: dependency install, all 211 tests, build, backend type check, and submission checks passed.
- Ten-slide presentation rebuild and 12-page visual guide compilation; the guide embeds Noto Sans throughout.
- Changed-file formatting, documentation links, evidence hashes, and Git whitespace checks.
- Tracked/new text files scanned for common private-key and API-token patterns; no matches found.

The build still reports existing JavaScript bundles larger than 500 KB. This is a size warning; the build passes. Repository-wide `format:check` reports 49 existing files, including generated skill files and unchanged application code. Formatting checks pass for this submission's changed files.

Docker is not installed in the preparation environment, so a full container deployment has not been verified here. Deployment-script tests check setup, target restrictions, checks without changes, and isolation of AI settings. Test the full Docker setup and selected model on the presentation computer.

## What the evidence means

| File                                | What it shows                                                                                                 | Limit                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `evidence/sandbox-execution.json`   | Actual Convex handlers running in a local test database; proposal, approval, debit, ledger, and receipt       | Not an external payment-provider receipt                |
| `evidence/development-session.json` | Authenticated development-account journey with live AI preparation, student approval, and simulated execution | One fictional account and one live-model trial          |
| `evidence/sandbox-demo.webm`        | Browser recording of that successful journey                                                                  | About 36 seconds; no narration                          |
| `evidence/demo-manifest.json`       | Recording command, consistency checks, and file hashes                                                        | Identifies the recorded files, not an independent audit |

The recorded journey used a fictional student on the development backend on 14 October. Its checks confirm that owner approval preceded execution, only one ledger debit occurred, the balance change matched the debit, and the receipt matched the proposal. No real money moved.

Evidence files are retained from their recorded runs. Running ordinary tests does not rewrite their dates or results.

## Reproduce local evidence

```sh
bun run test:eval
```

This runs the local suite with mocked model responses and writes `test-results/evaluations/local-evaluation.json` and refreshes `docs/evidence/sandbox-execution.json`. Optional evaluation reports stay outside the submission docs. It does not replace the live demo.

## Browser and live checks

```sh
bunx playwright install chromium
bun run test:e2e
```

The browser suite uses isolated previews. Live account tests are opt-in.

On 16 October, the full run returned **117 passed, six failed, and two skipped**. The failures exposed a short autoplay wait, duplicate React roots in chat/sponsor preview fixtures, and a layout measurement taken across two animation frames. These were repaired. Focused reruns passed: autoplay (three), chat (three), setup funding (two), and sponsor navigation/tours (seven).

**All 123 non-opt-in browser cases passed across the full run and the focused reruns.** The entire suite was not repeated after those fixture fixes. The two live-account tests were not enabled in this final review; the earlier authenticated recording remains separate evidence.

To record a new authenticated live-model journey on the configured **development** backend:

```sh
RUN_FINANCE_SMOKE=1 RUN_AGENT_SMOKE=1 RECORD_DEMO=1 bunx playwright test e2e/finance-agent.pw.ts
```

This creates a fictional account, contacts the configured model, and performs a simulated payment. Check the deployment target before running it. On success it replaces the development-session export and demo video. Update and review the recording manifest if either file changes; the submission checker rejects stale hashes.

For a separate six-scenario live-model evaluation:

```sh
RUN_AGENT_EVAL=1 bun run eval:live
```

The report is written to ignored `test-results/evaluations/live-agent-evaluation.json`. This sends synthetic prompts and local read-only tool results to the configured AI service. It creates no payment proposals. For a local model accessed directly from the host, use a host-reachable `AI_BASE_URL`, such as `http://127.0.0.1:11434/v1`, rather than Docker's `host.docker.internal` address.

## What remains unproven

These checks do not establish student usability, independent security assurance, real recipient verification, provider settlement, legal compliance, model reliability across tasks, or access from a China network. Team registration, eligibility, rights clearance, and final upload also remain contestant responsibilities.
