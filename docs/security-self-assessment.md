# MoveWire security self-assessment

Scope: student/sponsor account application, external AI calls, planning edits and simulated payments in supported USD, GBP and CNY corridors. This is a developer assessment, not an independent audit or legal compliance certification.

## Permission tiers

| Tier | Action                                 | Enforcement                                                                        |
| ---- | -------------------------------------- | ---------------------------------------------------------------------------------- |
| 0    | Read account records                   | Authenticated account ownership; sponsor projections                               |
| 1    | Compare quotes and simulate budgets/FX | Internal allowlisted tools; deterministic calculations; consent                    |
| 2    | Prepare a payment                      | Authenticated student; verified fixture recipient; limit, funds and reserve checks |
| 3    | Approve a proposal                     | Owner-only public mutation; exact proposal ID; expiry/state checks                 |
| 4    | Execute approved sandbox payment       | Owner-bound approval; atomic balance/ledger update; idempotent receipt             |

The model can access account-bound reads, planning edits and payment preparation only. It has no function definition or execution dispatch for tiers 3–4. A prompt cannot grant a capability that the executor does not expose.

Planning edits are a separate tier-2 capability: profile/destination, tuition/deadline/reserve, Move Planner, budget items, checklist, alerts and country-account labels. These change planning records, not wallet cash or bank accounts. Active proposals block changes to payment terms; resetting and fresh owner approval are required. Explicit confirmed-funding edits return a pending owner-confirmation card with a 30-minute expiry and a stale-record check. Country changes may rebase declared planning amounts. The agent can change the reserve before preparation when requested; the approved proposal snapshots it.

## Controls and evidence

- Convex Auth email/password identity; ownership checks before account reads/writes.
- Immutable account role during normal login.
- Student invitations use 48-bit random codes, expire in 24 hours and are single-use.
- Sponsor dashboards return linked names, commitments, permission labels, permitted requests and separately authorized financial overview/tuition projections. Personal balances and spending are excluded.
- Sponsor permission values are allowlisted. Changes create audit events; revocation applies on the next reactive query.
- Explicit, revocable AI consent; secret API key kept server-side.
- AI receives minimized financial context, recent chat and bounded tool outputs rather than full wallet/identity records. User chat may itself contain personal data.
- Tool names and arguments are checked server-side, with no model-selected account IDs.
- Ten-second per-account AI request spacing, 100 requests per UTC day, bounded tool rounds and 45-second provider request timeouts.
- Consent is rechecked before chat persistence; completed tool results remain inspectable when a later model explanation fails.
- Integer ledger amounts, source-quote expiry, transaction limit, protected living reserve, source balance validation and exact proposal authorization.
- Saved tuition deadline, business-day buffer and delivery window are snapshotted; execution rechecks buffered arrival. Planning changes and fixture refresh require resetting an active proposal.
- Concurrent/repeated execution is handled through transactional state checks; completed-proposal retry returns its receipt.
- Owner JSON evidence export preserves proposals, receipts and audit history.

Tests cover account isolation, recipient mismatch, limit violations, missing approval, missing proposal ID, quote expiry, route changes, insufficient funds, approved snapshot stability, duplicate execution, consent revocation, tool allowlisting and sponsor visibility.

## Known-risk register

| Risk                                              | Current boundary / remaining work                                                                                                                                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model hallucination or misleading recommendations | Deterministic tools produce calculations; prose is still fallible. Recorded calculation details are shown independently of generated prose. Six live smoke scenarios include factual indicators; broader semantic and multilingual evaluation remains needed. |
| Prompt injection                                  | No approval/execution capability; conservative preparation guard rejects tested quoted/negative/hypothetical commands but remains heuristic, not a general intent or injection classifier. Preparation moves no funds.                                        |
| External AI processing                            | Consent and data minimization are implemented; provider retention, routing and jurisdictional processing require deployment-specific review.                                                                                                                  |
| Quotes and recipient verification                 | Fixtures only; suffix confirmation is not real payee verification. No external provider settlement.                                                                                                                                                           |
| Compliance                                        | No claim of KYC, AML, sanctions or regulated advisory compliance. Those controls require jurisdiction/provider review before real funds.                                                                                                                      |
| Authentication recovery                           | No email verification or emailed recovery; MFA is not implemented.                                                                                                                                                                                            |
| Resource abuse                                    | Per-account request spacing and daily quota exist; distributed abuse and registration/invitation throttling need stronger controls.                                                                                                                           |
| Audit integrity                                   | Clients cannot rewrite audit rows through exposed functions, but privileged deployment administrators can. No cryptographic append-only storage.                                                                                                              |
| Deadline estimation                               | UTC weekdays and declared sandbox delivery windows only. Holidays, bank cutoff times and university processing are excluded; no arrival guarantee.                                                                                                            |
| Provider latency / outage                         | A 45-second per-request timeout bounds calls. Completed tool results are retained through a fallback explanation. Earlier live runs had timeouts; long-term availability is unmeasured.                                                                       |
| Annual/monthly cost assumptions                   | Rent simulation explicitly assumes matching plan cost items are annual totals. Typed cost periods are a future improvement.                                                                                                                                   |
| FX arithmetic                                     | Minor-unit rounding is tested; rates use JavaScript numeric values. A production provider should return binding integer quote amounts.                                                                                                                        |
| Evidence disclosure                               | Download is owner-controlled; exports include names/IDs in audit history and should be reviewed before submission.                                                                                                                                            |
| Production operations                             | Independent penetration testing, monitoring, backup/recovery and real-provider retry/reconciliation are not implemented.                                                                                                                                      |

## Data and licensing

Do not submit credentials, raw `.env` files, private chat histories or real account data. Public fixtures name an example university and generic sandbox providers. Font licenses are included under `public/fonts`. Review third-party dependency licenses before submission; see `docs/dependency-licenses.json` for the installed direct dependency inventory. AI-assisted development does not remove contestant responsibility for originality, testing and disclosure under the competition's full rules.
