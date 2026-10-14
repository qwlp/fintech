# Submission readiness

See [the page-by-page requirements audit](competition-requirements.md) for all supplied rules, eligibility, deadline and remaining contestant obligations. These files support the supplied International Track rules. They are not confirmation of registration or eligibility.

| Required item                                   | Repository material                                                  | Remaining action                                      |
| ----------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- |
| Technical documentation                         | `architecture.md`                                                    | Review against final implementation                   |
| Presentation ≤10 minutes                        | `presentation.html`, `presentation.pdf`                              | Rehearse and personalize team details                 |
| Optional video ≤5 minutes                       | `demo-script.md`                                                     | Record actual application                             |
| Code, README, deployment instructions and tests | Repository and README                                                | Provide accessible repository URL                     |
| Security self-assessment                        | `security-self-assessment.md`                                        | Review known risks and deployment details             |
| Sandbox operation logs and demo video           | Local execution JSON, authenticated live-AI export and recorded WebM | Review recorded demo/export; optionally add narration |

Local-test JSON is genuine application test output but is not external-provider execution evidence. The recorded development-session journey and live AI preparation are in `evidence/development-session.json` and `evidence/sandbox-demo.webm`; `evidence/demo-manifest.json` documents their provenance. Review the recording for the final submission.

## Product roadmap by scoring impact

1. Validate the tuition journey with international students and measure time, errors and usefulness. Report actual sample size and results.
2. Add provider sandbox integration with quote timestamps, recipient-validation responses, callback reconciliation and receipts. No real-money requirement for Topic C is assumed.
3. Use the implemented deadline planner in the demo; replace benchmark fee ranges with sourced, dated provider/university information; add deadline-aware delivery constraints.
4. Extend the implemented local regression and six-scenario live AI evaluation across ambiguous requests, multilingual amounts, hallucinated rates, quoted instructions, expired quotes and funding shortfalls. Publish measured task success and unsafe-action rates.
5. Add structured expense periods, payment schedules and semester cash-flow forecasting. Distinguish committed funding from money available now.
6. Add student-approved sponsor-request drafts and contribution reconciliation; keep private spending hidden.
7. Improve recovery, MFA, abuse prevention and independent security review before handling sensitive real records.

## Differentiating ideas

- **Living-cost protection:** route affordability includes a reserve, not just sufficient source funds. Implemented in the sandbox.
- **Currency stress rehearsal:** students see exposure before paying. Implemented as a deterministic AI tool.
- **Financial task receipt:** each completed task has a unique receipt and downloadable financial/audit evidence. Implemented.
- **Deadline-aware tuition navigator:** fresh fixture quotes, saved deadline, conservative weekday arrival, buffer, reserve and funding-gap explanations. Implemented. Actual university rules, holiday calendars and sourced provider quotes remain planned.
- **Private sponsor negotiation:** propose the smallest funding request that closes a tuition gap without sharing spending. Planned.

Judges determine the final score. Do not present this checklist as proof of a 100/100 result.
