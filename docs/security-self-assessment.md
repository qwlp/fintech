# Security self-assessment

This report covers Student and Sponsor accounts, AI tools, planning edits, and simulated USD, GBP, and CNY payments. It is a developer review. An independent security audit and legal compliance review have not been completed.

## Permission levels

| Level | Action                                           | Main check                                                        |
| ----- | ------------------------------------------------ | ----------------------------------------------------------------- |
| 0     | Read records                                     | Logged-in owner, or a linked sponsor with the required permission |
| 1     | Compare routes and run budget/currency scenarios | Allowed tool, valid inputs, owner identity, and AI consent        |
| 2     | Edit plans or prepare payment                    | Owner checks, validated fields, and payment/funding rules         |
| 3     | Approve payment                                  | Student owner approves the exact unexpired proposal               |
| 4     | Send simulated payment                           | Same owner and approved proposal; all financial checks repeated   |

The AI has no approval or send tool. It can change requested planning values before preparation, including the living reserve, but cannot change active payment terms. Resetting and new student approval are required. Confirmed-funding edits need a separate confirmation card, expire after 30 minutes, and cannot overwrite newer records. They never add wallet cash.

## Protections in place

- **Accounts:** Convex Auth email/password login and server-side ownership checks. Normal login cannot change the account role.
- **Sponsors:** 48-bit random invitation codes are single-use and expire in 24 hours. Sharing needs a student permission. Revoking permission removes access through the next reactive query. Wallets, private spending, and security events are excluded.
- **AI privacy:** consent can be revoked. API keys stay on the server. The model receives selected financial context, recent chat, and tool results; a user's own chat can still contain personal information.
- **AI tools:** names and arguments are checked on the server. The model cannot supply account IDs. Requests are limited to one per ten seconds and 100 per UTC day per account, with bounded tool rounds and 45-second provider timeouts.
- **Payments:** fixed proposal terms, integer ledger amounts, quote expiry, transaction limits, deadline checks, protected living funds, and student-only approval/send.
- **Duplicate sends:** one transaction updates the wallet, ledger, and receipt. Retrying a completed proposal returns its existing receipt without another debit.
- **Evidence:** students can export their receipts, calculations, and audit records. Public functions do not let clients rewrite audit rows.

Tests cover account isolation, sponsor privacy, missing approval, wrong recipients, limits, expired or changed quotes, insufficient funds, fixed proposal terms, repeated sends, revoked consent, and tool permissions. See [validation](validation.md).

## Known risks and limits

| Risk                   | Current limit and remaining work                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Wrong AI advice        | Calculations are recorded separately, but generated explanations can be wrong. Broader multilingual and real-user evaluation is needed. |
| Prompt injection       | AI cannot approve or send. The preparation-intent check is a heuristic and cannot detect every attack.                                  |
| External AI processing | Review the selected provider's retention, routing, and processing locations for each deployment.                                        |
| Rates and recipients   | Fees and recipients are examples. Reference rates are not binding quotes. There is no external settlement or real payee verification.   |
| Financial regulation   | KYC, AML, sanctions checks, and regulated advice/payment compliance are not implemented.                                                |
| Login recovery         | Email verification, emailed recovery, and MFA are not enabled.                                                                          |
| Abuse                  | Per-account AI limits exist. Stronger registration, invitation, and distributed-abuse controls are still needed.                        |
| Audit records          | Privileged deployment administrators can alter data. Logs are not cryptographically append-only.                                        |
| Delivery timing        | UTC weekdays only; holidays, bank cutoffs, and university processing are excluded. No arrival guarantee.                                |
| AI outages             | Completed tool results survive a later explanation failure, but long-term model availability is unmeasured.                             |
| Cost assumptions       | Rent simulation treats matching plan costs as annual totals. Explicit cost periods are a future improvement.                            |
| FX precision           | Rounding is tested, but rates use JavaScript numbers. Real providers should return binding integer quote amounts.                       |
| Export privacy         | Exports contain names and IDs. Review them before sharing.                                                                              |
| Operations             | Production monitoring, proven backup/recovery, provider reconciliation, and penetration testing are not complete.                       |

## Code-review follow-up

Account data is checked against the logged-in owner, and payment approval and sending are separate from AI tools. The final review also found work needed before production:

- Some account-scoped queries load all matching records. Add pagination and bounded reads as histories grow.
- The sponsor invitation display reads the current time in a reactive query, so an expired invitation may stay visible until the query runs again. Accepting an invitation checks expiry again in a mutation.
- Some functions use broad TypeScript types or lack explicit return validators. Tighten these contracts as the backend develops.

These limits do not establish production readiness. The permission, expiry, and duplicate-payment tests remain the evidence for the sandbox controls.

## Data and rights

Use fictional records for demos. Never submit `.env` files, API keys, passwords, private chats, or real financial data. Local deployment stores secrets in ignored `.env.self-hosted`; public frontend settings contain service URLs only.

Font licenses are included in `public/fonts`. [The direct dependency inventory](evidence/dependency-licenses.json) and `public/*-logos/sources.json` help identify third-party material. Source links do not grant usage rights. Contestants must review licenses, marks, and notices before distributing the entry. AI-assisted development does not remove responsibility for originality, disclosure, or testing.
