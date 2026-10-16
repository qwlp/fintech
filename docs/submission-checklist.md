# Final submission checklist

MoveWire enters **Topic C: Cross-border & Student Finance Assistant**.

**Deadline: 20 October 2026, 23:59 Beijing time (UTC+8).** This is 22:59 in Phnom Penh and 15:59 UTC. Registration and submission have the same deadline. The requirements below come from the supplied PBCSF International Track appendix (pages 2–4).

## Files to submit

| Required item                                          | Open this                                                                                                                                    |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Technical documentation                                | [Architecture and algorithms](architecture.md)                                                                                               |
| Presentation, no longer than 10 minutes                | [Slides PDF](presentation.pdf) · [editable source](source/presentation.html)                                                                 |
| Source, README, deployment instructions, and tests     | [GitHub repository](https://github.com/qwlp/fintech) · [README](../README.md) · [deployment guide](local-deployment.md)                      |
| Security report with permission levels and known risks | [Security assessment](security-self-assessment.md)                                                                                           |
| Sandbox operation logs and demo video                  | [Execution logs](evidence/development-session.json) · [video](evidence/sandbox-demo.webm) · [recording details](evidence/demo-manifest.json) |
| Extra user documentation                               | [Illustrated guide PDF](demonstration-guide.pdf)                                                                                             |

The general demo-video item is optional, but the Topic C execution-evidence item asks for logs **and a video**. Include the supplied recording. It is about 36 seconds long and has no narration. For a narrated demo, show route comparison, a currency scenario, AI preparation, student approval, the simulated payment, and its receipt. Keep it within five minutes.

## Prepare the package

```sh
bun run verify
bun run submission:pack
```

To rebuild the editable slides, run `bun run deck:build` (requires Playwright Chromium). To rebuild the guide, install Typst and run `typst compile --pdf-standard a-2b docs/source/demonstration-guide.typ docs/demonstration-guide.pdf`.

The second command creates a dated folder and `.tar.gz` archive in `submission/`. It includes source, tests, deployment scripts, docs, slides, the guide, and evidence. It excludes local credentials, installed dependencies, build caches, and agent configuration. A `SHA256SUMS` file records the packaged file hashes. Use the portal's requested upload format; a prepared archive is not a submission receipt.

[Validation notes](validation.md) explain what was tested. Local test evidence uses mocked model replies. The recorded browser journey used a live model and fictional accounts on a development backend. Neither is proof of real bank settlement.

## Team checks before uploading

- [ ] Confirm 2–5 eligible full-time student members and at least 60% non-Chinese nationals. Each person may join only one team.
- [ ] Complete registration and supply the required team and eligibility information.
- [ ] Review the slides and add team details wherever the portal or presentation requires them. Rehearse within ten minutes.
- [ ] Watch the demo and read the exported records. Keep fictional data only; do not upload credentials or private chats.
- [ ] Review third-party licenses and image/brand permissions. [Dependency inventory](evidence/dependency-licenses.json) and `public/*-logos/sources.json` are starting points, not rights clearance.
- [ ] Test deployment on the presentation computer and confirm the chosen AI model works.
- [ ] Give judges an accessible GitHub URL. If they need a hosted app, provide its tested URL and access instructions.
- [ ] Upload through the official channel before the deadline and save the receipt. The latest received version before the deadline prevails.

These team checks remain open until the contestants complete them. A student study, independent security review, and real payment-provider integration have not been completed and must not be claimed.

## Rules to confirm

Every member must attend an eligible overseas institution outside Mainland China, Hong Kong SAR, Macao SAR, and Chinese Taipei. The institution must meet the appendix's accreditation and degree-awarding requirements. The organizer decides track assignment. English is required for submissions and presentations.

Scoring is task completion (40%), security and compliance (30%), and innovation and interaction (30%). Topic C permits sandbox evidence; real money and on-chain transactions are not required. Judges determine the score.

The full Competition Rules and Privacy Policy govern the entry. Contestants retain IP; the hosts may use entries and team information for non-commercial promotion under non-exclusive, royalty-free rights. There is no registration fee. Official website: [fintechathon.g-ican.com](https://fintechathon.g-ican.com).

## After selection

Finalists are announced on 31 October. Check-in and the WeBank visit are on 20 November in Shenzhen; the final is 21–23 November. At least one team member must attend in person, subject to the organizer's rules.

## Folder layout

This folder contains the five essential written guides and the two reader-facing PDFs. `evidence/` contains payment records, the demo, its recording manifest, and the license inventory. `source/` contains editable slides, the guide source, and its screenshots. Optional evaluation reports go to ignored `test-results/evaluations/`.
