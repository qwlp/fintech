# International Track requirements audit

Reviewed 14 October 2026 against the supplied four-page **PBCSF Appendix 2 — Problem Description and Competition Rules for International Track**. Page 2 defines topics/scoring, page 3 eligibility/submission, and page 4 finals/integrity. This audit distinguishes implemented capabilities from contestant obligations; it is not organizer approval.

## Topic and scoring

MoveWire chooses **Topic C: Cross-border & Student Finance Assistant**. The rules require an AI agent completing financial tasks and permit simulated-account/sandbox evidence for this topic. Tuition route comparison, deadline/reserve checks, planning edits, owner-approved payment proposals, atomic sandbox execution and receipts address that scope. The listed remittance, tuition, credit-building and multi-currency examples are alternatives, not a requirement to implement every example. Topic F's on-chain execution and 0–5 bonus are not requirements for Topic C.

| Criterion                | Weight | Implementation and evidence                                                                                                                            | Limit                                                                                                 |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Task completion          | 40%    | Allowlisted AI tools; transactional planning edits; payment preparation; owner approval; debit, ledger and receipt; local regression and browser tests | No external settlement; six historical live-model scenarios do not measure all real-user task success |
| Security & compliance    | 30%    | Account ownership, sponsor permissions, AI consent, argument validation, separate payment authority, expiry, reserve protection and idempotency        | See security self-assessment; no regulated payment/compliance certification                           |
| Innovation & interaction | 30%    | Deadline-aware tuition navigation, living-fund protection, currency stress tests, sponsor privacy and inspectable tool results                         | Student usability study and independent review remain outstanding                                     |

The appendix does not specify numerical passing thresholds or mandate real money, a particular model, a provider integration, on-chain features, or China hosting for Topic C. Judges determine scores.

## Submission package

| Appendix requirement                                                            | Material / status                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Technical documentation: architecture, algorithms, security design              | `architecture.md`, `security-self-assessment.md`                                                                                                                                                                                                                       |
| Presentation deck; final presentation ≤10 minutes                               | `presentation.html` and `presentation.pdf`; ten slides. Team must personalize and rehearse duration                                                                                                                                                                    |
| General optional demo video ≤5 minutes                                          | `demo-script.md` provides a five-minute plan                                                                                                                                                                                                                           |
| Source with README, GitHub repository link, deployment instructions, test cases | [Repository](https://github.com/qwlp/fintech), root README, `local-deployment.md`, `tests/`, `convex/*.test.ts`, `e2e/`                                                                                                                                                |
| Security self-assessment with permission tiers and known risks                  | `security-self-assessment.md`, updated for planning-edit tools and funding confirmation                                                                                                                                                                                |
| Topic C execution evidence: sandbox operation logs **and demo video**           | `evidence/sandbox-execution.json`, local evaluation, **authenticated live-AI** `evidence/development-session.json` and `evidence/sandbox-demo.webm`; reproduce with `RUN_FINANCE_SMOKE=1 RUN_AGENT_SMOKE=1 RECORD_DEMO=1 bunx playwright test e2e/finance-agent.pw.ts` |

Although the general video item is optional, the execution-evidence item explicitly includes a demo video for non-on-chain topics. Treat a recorded sandbox journey as required. The recording command writes `evidence/development-session.json` and `evidence/sandbox-demo.webm` only on successful completion. A manual payment recording demonstrates the controls; use the optional live AI flag or a narrated agent recording to demonstrate the AI task as well. Do not present UI fixtures or mocked-model tests as live agent execution.

## Contestant obligations that code cannot establish

- Team of **2–5 full-time students**, currently enrolled at eligible overseas universities/research institutions. Every member's institution must be outside Mainland China, Hong Kong SAR, Macao SAR and Chinese Taipei and meet the appendix's accreditation/degree-authority definition.
- At least **60% non-Chinese nationals**: minimum 2 of 2, 2 of 3, 3 of 4, or 3 of 5 members. Organizer determines track assignment.
- Each person enters only one team across Domestic and International Tracks; duplicate registration is invalid.
- Submissions, presentations and reviews are in **English**. Repository competition documents and application interface use English.
- Register and submit by **20 October 2026, 23:59 Beijing time (UTC+8), or 15:59 UTC**. In Phnom Penh this is **22:59 on 20 October**. Use the exact Beijing deadline; the appendix's other city conversions round inconsistently. Updates are allowed before the deadline, latest received version prevails, no changes afterward.
- Finalists announced 31 October; check-in/WeBank HQ visit in Shenzhen 20 November; Grand Final 21–23 November. At least one finalist team member attends in person; absence without valid justification forfeits award eligibility.
- No registration fee. Organizer covers invited finalists' accommodation/round-trip international travel subject to the invitation's member count. These benefits do not change app requirements.
- Entry must be independently completed without plagiarism or IP infringement. Review third-party code, data, fonts, university/provider marks and all required notices. A source URL alone is not a usage license. `dependency-licenses.json` inventories direct dependencies; inspect transitive licenses and `public/*-logos/sources.json` before distribution. Do not assert an independent licensing audit has happened.
- Contestants retain entry IP; hosts have non-exclusive royalty-free use of entries/team information for non-commercial promotion. Full Competition Rules and Privacy Policy on the official website govern; this supplied appendix is not the full agreement.

Team identities, eligibility documents, registration/submission receipt, rights clearance, final presentation rehearsal and finalist travel must be completed by the contestants. No fictional team credentials, registration claim or usability result is supplied.
