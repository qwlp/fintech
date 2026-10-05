# MoveWise

MoveWise is a competition-ready cross-border finance assistant for international students. This MVP turns the PRD's Cambodia-to-UK demo into a complete interactive workflow: financial planning, sponsor coordination, multi-currency balances, deterministic what-if analysis, recipient validation, route comparison, explicit approval, sandbox execution, and auditable evidence.

## Run locally

Requires Bun 1.1+ and a free Convex account.

```bash
bun install
bun run convex:dev
```

The first Convex run prompts you to sign in, creates a development deployment, writes `.env.local`, and syncs the schema and functions. In a second terminal run `bun run dev`. The app automatically creates the preplanned demo account `dara@financialpassport.demo` the first time it connects. `VITE_CONVEX_URL` is required: the UI deliberately shows a setup state instead of silently substituting hard-coded browser data.

## Verify

```bash
bun run test
bun run build
```

## Demo path

1. Open **Dashboard** to see £24,600 costs, £21,900 confirmed funding, the £2,700 gap, runway, and priority action.
2. Open **AI Agent**, select the rent what-if prompt, and review the deterministic impact.
3. Open **Payments**, compare routes, and inspect why Provider A is recommended.
4. Verify the university recipient, prepare the payment, check the explicit consent box, and approve.
5. Execute the sandbox transaction. The UI returns `TX-DEMO-842913` and updates the plan.
6. Open **Security** to see the preparation, approval, and execution events with actor and timestamp.

## Safety model

- The AI can observe, recommend, and prepare; it cannot approve.
- Execution is rejected by the UI state machine unless explicit approval exists.
- The MVP never moves real money and labels its sandbox boundary throughout.
- Sponsor visibility is purpose-limited; wallet balances and personal spending stay private.
- All consequential payment transitions add an audit event.
- Financial calculations are deterministic TypeScript functions, not model-generated values.

## Architecture

The frontend is React + TypeScript on Vite/Bun. Convex stores the account, plan data, payment state, audit history, chat, notifications, sponsor requests, sponsor permissions, rate alerts, departure checklist, and configurable product data. Queries are reactive, while backend mutations enforce payment state transitions. `src/lib/finance.ts` remains the pure financial calculation layer; `src/data.ts` is retained only as deterministic test fixtures and is not used when rendering a connected application.

## Scope note

This remains a sandbox MVP. The seeded profile is intentionally passwordless for a frictionless product demo; production authentication, real provider connections, live FX rates, and compliance controls are still required before handling real financial data or funds.

Email accounts use Convex Auth with email/password credentials. Registration
creates either a Student or Sponsor account; role selection is immutable during
login. Student accounts start with an empty study profile and financial records.
Sponsors have a separate account home. Students can create single-use, 24-hour invitations in Sponsors and share a code, link, or QR. Sponsors enter the code or scan the QR to connect; either account can disconnect. Linking shares names only and does not grant access to balances, spending, or other sponsors. Camera scanning requires HTTPS (or localhost) and camera permission.
The public home page includes a local budget estimate and links to both flows.

To configure the development deployment with Bun:

```sh
bun install
bun run auth:setup
bunx convex dev --once
bun run dev
```

`auth:setup` generates the JWT signing keys directly on the configured development
deployment and preserves existing keys. Keep these keys out of `VITE_*` variables.
Convex account functions require an authenticated owner, and the old demo seed
is now internal. Email verification and emailed password recovery are not enabled;
they require an email delivery provider. Payments remain sandbox simulations.

## AI chatbot

The authenticated AI Agent uses OpenRouter with MiniMax M2.5 and routes to the
cheapest available provider. Replies include recent conversation history and
server-calculated account totals. The model cannot execute or approve payments.

Add `OPENROUTER_KEY` to `.env`, then configure and sync Convex:

```sh
bun run ai:setup
bunx convex dev --once
```

The setup script sends the key to the configured development deployment through
stdin. Keep it server-side; never add a `VITE_` prefix. To change models, set
`OPENROUTER_MODEL` in the Convex deployment environment. Failed replies leave
the conversation unchanged so you can retry.
