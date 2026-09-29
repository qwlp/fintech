# Financial Passport

## Product Requirements Document (PRD)

**Project Type:** AI Cross-Border & Student Finance Assistant  
**Competition Track:** Topic C — Cross-border & Student Finance Assistant  
**Competition Theme:** AI as a Financial Participant  
**Document Status:** Draft v1.0  
**Target Submission:** October 20, 2026  
**Primary Users:** International students and their financial sponsors

---

# 1. Executive Summary

**Financial Passport** is an AI-powered financial agent designed for international students who must manage complex financial obligations across countries, currencies, institutions, and sponsors.

International students often rely on disconnected tools to answer simple but critical questions:

- Can I afford to study abroad?
- How much money do I need before departure?
- When will I run out of money?
- How much should my sponsor contribute?
- What is the cheapest and safest way to pay tuition internationally?
- When should I convert currencies?
- Which upcoming financial obligation should I handle next?
- Can I afford a more expensive apartment?
- Is a tuition-payment recipient legitimate?
- What happens to my budget if exchange rates change?

Financial Passport combines financial planning, cross-border payment intelligence, sponsor coordination, multi-currency management, and an AI financial agent into a single system.

The product is designed around five stages:

> **PLAN → FUND → TRANSFER → PAY → MONITOR**

The AI does not merely answer questions. It reasons over the user's financial state, identifies required actions, prepares transactions, requests authorization where required, executes supported sandbox actions, and records the results in an auditable history.

The central product promise is:

> **Financial Passport tells international students whether they can afford their study-abroad plan, what they need to do next, and—when authorized—helps them complete the financial tasks required to get there and stay there.**

---

# 2. Problem Statement

Studying abroad creates a fragmented financial journey.

A typical international student may need to coordinate:

- tuition fees,
- university deposits,
- visa fees,
- healthcare or insurance costs,
- flight costs,
- accommodation deposits,
- monthly rent,
- food and transportation,
- emergency funds,
- multiple currencies,
- international transfers,
- scholarships,
- parental support,
- external sponsors,
- bank accounts,
- remittance providers,
- payment deadlines.

These obligations are usually managed across spreadsheets, messaging applications, banking applications, university portals, remittance services, and informal conversations with family members.

This creates several problems:

1. Students cannot easily determine the **true total cost** of studying abroad.
2. Students may have enough money overall but not enough **liquidity at the right time**.
3. Sponsors do not have a clear view of how much they are expected to contribute or when.
4. Cross-border payments may incur unnecessary fees or unfavorable foreign-exchange rates.
5. Students may accidentally send money to incorrect or fraudulent recipients.
6. International students often operate across multiple currencies without understanding the effect of exchange-rate changes.
7. Existing budgeting apps are usually designed for domestic personal finance rather than international education.
8. Existing payment platforms focus on transferring money rather than helping students understand **whether, when, and why** they should make a payment.

Financial Passport addresses this gap with a financial agent designed specifically around the international-student lifecycle.

---

# 3. Product Vision

Financial Passport should become a student's **financial operating system for studying abroad**.

Rather than presenting isolated financial data, the system should continuously understand:

- where the student is going,
- what they must pay,
- when payments are due,
- what money is available,
- who is funding each obligation,
- which currencies are involved,
- how long the student's available funds will last,
- which financial actions should happen next.

The AI agent should transform this financial state into clear, explainable, and actionable decisions.

---

# 4. Competition Alignment

Financial Passport is designed specifically for:

**Topic C — Cross-border & Student Finance Assistant**

The project directly addresses:

- international student finance,
- cross-border remittances,
- tuition payments,
- multi-currency management,
- sponsor coordination,
- financial planning,
- payment decision-making.

## 4.1 Scoring Alignment

### Task Completion — 40%

The system must demonstrate complete financial workflows rather than simple Q&A.

Example:

1. User requests a tuition payment.
2. Agent identifies the required amount.
3. Agent checks the student's available funds.
4. Agent identifies available payment routes.
5. Agent compares estimated fees and FX costs.
6. Agent validates the recipient.
7. Agent prepares the transaction.
8. Agent asks for user authorization.
9. Agent executes a sandbox transaction.
10. Agent records the result.
11. Agent updates the student's financial plan.

### Security & Compliance — 30%

The product must demonstrate:

- explicit user consent,
- role-based permissions,
- transaction approval requirements,
- spending limits,
- sponsor privacy controls,
- audit logs,
- fraud warnings,
- protected financial data,
- separation between AI recommendation and user authorization.

### Innovation & Interaction — 30%

The product differentiates itself through:

- AI-driven financial planning,
- sponsor-student coordination,
- multi-currency reasoning,
- proactive funding-gap detection,
- transaction preparation,
- explainable recommendations,
- conversational what-if simulation,
- context-aware financial task prioritization.

---

# 5. Target Users

## 5.1 Primary User — International Student

A student who:

- studies or plans to study outside their home country,
- manages tuition and living expenses,
- may depend on parents, scholarships, or sponsors,
- may hold or receive funds in multiple currencies,
- needs to make cross-border payments.

### Typical Goals

- Determine whether studying abroad is financially feasible.
- Calculate total study costs.
- Understand how much money is required before departure.
- Avoid running out of money.
- Pay tuition safely.
- Reduce transfer and FX costs.
- Coordinate financial support.
- Understand upcoming obligations.

---

## 5.2 Secondary User — Sponsor

A sponsor may be:

- parent,
- guardian,
- scholarship body,
- employer,
- family member,
- educational organization,
- other approved financial supporter.

### Typical Goals

- Understand their committed financial contribution.
- Know when money must be provided.
- See whether required sponsored obligations have been funded.
- Avoid unnecessary visibility into the student's private spending.
- Receive requests for upcoming contributions.

---

# 6. Core Product Principles

## 6.1 Action Over Information

The AI should not only say:

> "Your tuition is due soon."

It should say:

> "Your £2,000 tuition payment is due in 12 days. You have enough available funds. The lowest-cost supported transfer route is estimated to save $41 compared with the default bank transfer. I can prepare the payment for your approval."

---

## 6.2 Explainability

Every recommendation must answer:

- What is recommended?
- Why?
- What data was used?
- What are the estimated costs?
- What assumptions were made?
- What action will occur if approved?

---

## 6.3 Human Authorization

The system may prepare financial actions automatically, but money movement must obey configured authorization requirements.

The AI must never silently execute high-risk transactions.

---

## 6.4 Least-Privilege Access

Sponsors must only see information explicitly shared by the student.

A sponsor should not automatically gain access to:

- merchant-level transaction history,
- unrelated spending,
- private bank balances,
- other sponsor contributions.

---

## 6.5 Financial Safety

The product must clearly distinguish:

- verified data,
- estimated data,
- user-provided data,
- AI-generated projections.

Financial Passport should never present an estimate as guaranteed.

---

# 7. Core User Journey

```text
Create Profile
      ↓
Create Study-Abroad Plan
      ↓
Calculate Total Financial Requirement
      ↓
Add Funding Sources
      ↓
Identify Funding Gap
      ↓
Create Financial Timeline
      ↓
Monitor Upcoming Obligations
      ↓
Prepare Cross-Border Payment
      ↓
Validate Recipient
      ↓
Compare Payment Routes
      ↓
User Approves
      ↓
Execute Sandbox Transaction
      ↓
Update Financial Plan
```

---

# 8. Functional Requirements

# 8.1 Student Financial Profile

The system must allow a student to create a financial profile containing:

### Identity & Study Context

- home country,
- destination country,
- destination city,
- university,
- degree/program,
- intake date,
- expected study duration,
- nationality,
- current student status.

### Financial Context

- available savings,
- home currency,
- destination currency,
- monthly personal income,
- scholarship funding,
- sponsor funding,
- expected part-time income,
- emergency savings.

### Privacy

Users must be able to control which profile data is visible to each sponsor.

---

# 8.2 Study-Abroad Plan

The user must be able to create one or more study-abroad plans.

Each plan should contain:

- destination,
- university,
- program,
- start date,
- expected duration,
- tuition,
- scholarship,
- living costs,
- visa costs,
- travel costs,
- accommodation costs,
- other mandatory costs.

The user must be able to compare alternative plans.

Example:

```text
Plan A: UK — De Montfort University
Plan B: Australia — RMIT
Plan C: New Zealand — AUT
```

---

# 8.3 Cost Calculator

The application must calculate the estimated cost of studying abroad.

## Cost Categories

### Pre-Departure

- university application fees,
- tuition deposit,
- visa fee,
- healthcare/insurance,
- document processing,
- flights,
- luggage,
- airport transport.

### Arrival

- accommodation deposit,
- first month's rent,
- utilities deposit,
- SIM/mobile setup,
- transportation setup,
- household essentials,
- initial groceries.

### Recurring

- tuition installments,
- accommodation,
- food,
- transportation,
- mobile service,
- insurance,
- utilities,
- academic expenses,
- personal expenses.

### Safety Buffer

- emergency fund,
- currency volatility buffer,
- unexpected expenses.

---

# 8.4 Funding Gap Engine

The system must compare:

> **Expected Financial Requirement**

against

> **Available and Committed Funding**

Funding sources may include:

- student savings,
- parents,
- sponsors,
- scholarships,
- grants,
- loans,
- part-time work,
- employer sponsorship.

The system must calculate:

```text
Total Cost
- Confirmed Funding
= Funding Gap
```

The system must additionally calculate:

- percentage funded,
- monthly runway,
- pre-departure funding requirement,
- first-semester funding requirement,
- expected shortfall date.

Example:

```text
Estimated Year-One Cost:      $31,200
Confirmed Funding:            $27,700
-------------------------------------
Funding Gap:                   $3,500

Funding Coverage:               88.8%
Estimated Runway:           10.4 months
Expected Shortfall:           July 2027
```

---

# 8.5 Cash-Flow Timeline

The application must represent financial obligations over time.

Example:

| Date   | Obligation          | Amount | Status   |
| ------ | ------------------- | -----: | -------- |
| Jun 15 | Tuition Deposit     | £3,000 | Paid     |
| Jul 04 | Visa                |   £490 | Paid     |
| Aug 01 | Housing Deposit     |   £900 | Upcoming |
| Sep 01 | Tuition Installment | £5,000 | Upcoming |
| Sep 05 | Rent                |   £700 | Upcoming |

The AI must identify:

- expensive months,
- periods of liquidity risk,
- upcoming deadlines,
- projected negative balances.

---

# 8.6 Sponsor Mode

Students must be able to invite sponsors.

## Sponsor Profile

A sponsor profile should include:

- sponsor name,
- sponsor relationship,
- home country,
- base currency,
- agreed contribution,
- supported categories,
- payment schedule.

## Supported Categories

A sponsor may contribute toward:

- tuition,
- accommodation,
- living expenses,
- transportation,
- emergency fund,
- insurance,
- other approved categories.

## Sponsor Permissions

The student must control whether a sponsor can see:

- contribution status,
- tuition status,
- accommodation status,
- remaining requested amount,
- payment schedule.

Sponsors should not automatically see detailed spending.

---

# 8.7 Sponsor Funding Commitments

Sponsors must be able to commit funding.

Example:

```text
Sponsor: Parent
Category: Tuition
Committed: $8,000
Transferred: $5,000
Remaining: $3,000
Next Needed: November 15
```

The AI should identify when sponsor funds must be requested.

---

# 8.8 Multi-Currency Financial State

The system should support multiple balances and currencies.

Example:

```text
USD      $4,200
KHR      2,000,000
GBP      £1,100
```

The system should convert balances into a selected reporting currency using current or simulated FX rates.

The system must identify currency-specific upcoming obligations.

Example:

> "You have £1,100 available, but £2,000 tuition is due in 19 days. Approximately £900 additional GBP is required."

---

# 8.9 Payment Route Comparison

For supported transactions, the system should compare available payment routes.

Potential routes:

- bank transfer,
- SWIFT,
- remittance platform,
- university payment partner,
- supported fintech provider,
- sandbox provider.

The comparison should include:

- sender amount,
- recipient amount,
- transfer fee,
- estimated FX cost,
- estimated arrival time,
- payment limits,
- recipient compatibility.

Example:

| Route              | Fee | FX Cost | Delivery | Total Estimated Cost |
| ------------------ | --: | ------: | -------- | -------------------: |
| Bank SWIFT         | $35 |     $42 | 2–5 days |                  $77 |
| Provider A         |  $8 |     $12 | Same day |                  $20 |
| University Partner | $15 |      $8 | 1–2 days |                  $23 |

---

# 8.10 Tuition Payment Agent

The tuition-payment workflow is a flagship demonstration.

The agent should:

1. Identify the tuition obligation.
2. Confirm the payment deadline.
3. Confirm required currency.
4. Check available funds.
5. Identify funding source.
6. Compare available payment routes.
7. Validate recipient details.
8. Calculate estimated fees.
9. Prepare the payment.
10. Present the user with a final review.
11. Require authorization.
12. Execute using sandbox APIs.
13. Store the transaction result.
14. Update the financial plan.
15. Generate an execution log.

---

# 8.11 Recipient Validation

Before preparing a significant payment, the system should compare:

- recipient name,
- institution name,
- recipient bank,
- destination country,
- account/reference information,
- expected payment amount,
- previously approved recipients.

The system must flag suspicious inconsistencies.

Example:

```text
WARNING

The recipient account name does not match the previously verified
university payment recipient.

Payment preparation has been stopped.

Expected:
De Montfort University

Received:
DMU Education Services Ltd.
```

The system must allow legitimate mismatches to be reviewed and manually approved.

---

# 8.12 AI Financial Task List

The application should provide a prioritized action feed.

Example:

```text
YOUR NEXT FINANCIAL ACTIONS

1. Tuition payment
   £2,000 due October 15
   Ready to prepare

2. Emergency fund
   Current: £550
   Target: £1,000

3. Accommodation
   £700 due in 19 days

4. Sponsor funding
   Request $1,200 before November 1
```

Prioritization should consider:

- deadline,
- financial importance,
- available balance,
- funding gap,
- transaction processing time,
- risk level.

---

# 8.13 Conversational Financial Agent

Users should be able to ask natural-language questions.

Examples:

```text
"Can I afford a £900 apartment?"

"What happens if my parents send money every three months?"

"How much money do I need before I leave Cambodia?"

"If GBP gets 5% stronger, how much more will tuition cost me?"

"Can I afford to travel home in December?"

"How much should I save every month?"

"Prepare my next tuition payment."

"Why are you recommending this payment provider?"
```

The agent should reason over structured user data rather than relying only on generic language-model responses.

---

# 8.14 What-If Simulator

The system should allow users to test financial decisions without changing their real plan.

Examples:

### Housing

```text
Current Rent: £650/month
Proposed Rent: £900/month

Additional Annual Cost: £3,000
Current Runway: 12 months
New Runway: 8.7 months
Projected Funding Gap: £2,130
```

### Sponsor Schedule

```text
Current:
$650 monthly

Proposed:
$2,000 every three months

Result:
Total yearly support is similar,
but cash-flow risk increases before the second transfer.
```

---

# 8.15 Financial Runway

Financial Passport should estimate how long current available funding can support the student.

The calculation should consider:

- current balances,
- committed sponsor funds,
- recurring expenses,
- upcoming large payments,
- currency conversion,
- expected income.

Example:

```text
FINANCIAL RUNWAY

Current available resources: £8,900
Average monthly burn:         £1,020

Raw runway: 8.7 months

Adjusted runway after
upcoming tuition payment:     6.8 months
```

---

# 8.16 Alerts

The system should generate alerts for:

- upcoming tuition payment,
- insufficient balance,
- sponsor contribution required,
- funding gap,
- projected negative balance,
- unusual payment recipient,
- expensive transfer route,
- major FX movement,
- emergency-fund depletion.

Alerts must be categorized by severity:

- Information
- Recommendation
- Warning
- Critical

---

# 9. AI Agent Requirements

The AI layer should not function as a generic chatbot.

It must interact with structured application tools.

## 9.1 Required Agent Capabilities

The agent should be able to:

- retrieve user financial state,
- retrieve study plan,
- calculate funding gap,
- calculate runway,
- retrieve upcoming obligations,
- compare transfer routes,
- validate payment recipients,
- prepare sandbox transactions,
- request user approval,
- execute approved sandbox transactions,
- update financial records,
- generate explanations,
- create action recommendations.

---

# 9.2 Example Agent Tools

```text
get_student_profile()
get_study_plan()
get_wallet_balances()
get_upcoming_obligations()
calculate_total_cost()
calculate_funding_gap()
calculate_runway()
simulate_budget_change()
get_fx_rate()
compare_payment_routes()
validate_recipient()
prepare_payment()
request_transaction_approval()
execute_sandbox_payment()
record_transaction()
notify_sponsor()
```

---

# 9.3 Agent Decision Model

The agent should follow:

```text
UNDERSTAND
    ↓
RETRIEVE FINANCIAL STATE
    ↓
ANALYZE
    ↓
IDENTIFY REQUIRED ACTION
    ↓
CHECK PERMISSIONS
    ↓
PREPARE
    ↓
EXPLAIN
    ↓
REQUEST AUTHORIZATION
    ↓
EXECUTE
    ↓
VERIFY
    ↓
LOG
```

---

# 10. Permission Model

Financial actions must be divided into permission tiers.

## Tier 0 — Observe

The agent may:

- read financial data,
- calculate,
- analyze,
- summarize.

No financial actions are created.

---

## Tier 1 — Recommend

The agent may propose actions.

Example:

> "Convert $1,000 USD to GBP before your tuition payment."

No transaction is prepared.

---

## Tier 2 — Prepare

The agent may create a pending transaction.

Example:

```text
Convert:
$1,000 USD

Estimated receive:
£745

Fee:
$4.50

Status:
AWAITING USER APPROVAL
```

---

## Tier 3 — Execute

The agent may execute an explicitly approved sandbox transaction.

Approval should be required immediately before execution.

---

# 11. Transaction Approval Requirements

The system must require explicit approval when:

- transferring funds,
- converting currencies,
- paying tuition,
- sending money to a new recipient,
- exceeding configured value limits.

The user must see:

- source account,
- destination,
- amount,
- currency,
- fee,
- exchange rate,
- expected recipient amount,
- reason,
- risk warnings.

---

# 12. High-Risk Transaction Controls

High-risk transactions may require:

- additional confirmation,
- biometric confirmation where supported,
- sponsor authorization,
- verified-recipient status,
- manual review.

Example configurable limit:

```text
Transactions below $100:
Standard confirmation

$100–$500:
Explicit confirmation

Above $500:
Enhanced confirmation

New high-value recipient:
Enhanced confirmation + warning
```

Values used in the demo may be configurable.

---

# 13. Sponsor Privacy Model

Sponsor Mode must be consent-based.

Example permission matrix:

| Data                        | Student | Sponsor       |
| --------------------------- | ------- | ------------- |
| Total tuition requirement   | Yes     | If shared     |
| Sponsor contribution status | Yes     | Yes           |
| Upcoming sponsored payment  | Yes     | Yes           |
| Student bank balance        | Yes     | No by default |
| Merchant transactions       | Yes     | No            |
| Other sponsor contributions | Yes     | No by default |
| Personal purchases          | Yes     | No            |

---

# 14. Security Requirements

## 14.1 Authentication

The application should support:

- secure login,
- strong password policy,
- session expiration,
- token rotation,
- optional MFA.

---

## 14.2 Authorization

Every protected API endpoint must validate:

- authenticated user,
- resource ownership,
- role,
- permission scope.

---

## 14.3 Sensitive Data

Sensitive information must not be stored in plaintext where avoidable.

Sensitive fields include:

- account identifiers,
- transaction references,
- sponsor relationships,
- user balances,
- personally identifying information.

---

## 14.4 Secrets

API keys and secrets must:

- never appear in frontend code,
- never be committed to Git,
- be stored in environment variables or secret-management systems.

---

## 14.5 Audit Logging

Important agent actions must be logged.

Example:

```json
{
  "event": "PAYMENT_PREPARED",
  "userId": "student_123",
  "agentAction": true,
  "amount": 2000,
  "currency": "GBP",
  "recipient": "verified_university_01",
  "timestamp": "2026-10-10T12:31:42Z"
}
```

Important events include:

- login,
- sponsor invitation,
- permission change,
- payment preparation,
- payment approval,
- payment rejection,
- payment execution,
- recipient validation,
- agent recommendation.

---

# 15. AI Safety Requirements

The AI must not:

- invent account balances,
- fabricate exchange rates,
- claim payment completion without API confirmation,
- bypass user authorization,
- reveal sponsor/student information without permission,
- present estimated costs as guaranteed,
- silently modify financial plans,
- execute an unsupported financial action.

When required information is unavailable, the agent should state the limitation.

---

# 16. Data Confidence Model

Every external financial value should include a data source status.

Possible statuses:

```text
VERIFIED
USER PROVIDED
LIVE API
ESTIMATED
SIMULATED
STALE
UNKNOWN
```

Example:

```text
Tuition Fee: £16,250
Source: University data
Confidence: VERIFIED

Monthly Food Estimate: £250
Source: Planning model
Confidence: ESTIMATED
```

---

# 17. MVP Scope

The competition MVP should prioritize complete workflows over broad functionality.

## MUST HAVE

- Student onboarding
- Financial profile
- Study-abroad plan
- Cost calculator
- Funding sources
- Funding-gap calculation
- Financial runway
- Cash-flow timeline
- Sponsor mode
- Multi-currency balances
- AI assistant
- What-if simulation
- Payment route comparison
- Recipient validation
- Tuition-payment preparation
- User approval
- Sandbox payment execution
- Audit log
- Security permissions

---

## SHOULD HAVE

- destination comparison,
- sponsor notifications,
- FX alerts,
- emergency-fund recommendations,
- visual financial dashboard,
- transaction history,
- explainable AI reasoning summary.

---

## COULD HAVE

- university data integration,
- visa-data integration,
- bank-account recommendations,
- credit-building guidance,
- scholarship discovery,
- automatic receipt extraction,
- document scanning,
- payment deadline extraction from university invoices.

---

## OUT OF SCOPE FOR MVP

- real-money custody,
- autonomous unrestricted transactions,
- investment advice,
- lending,
- cryptocurrency,
- production credit scoring,
- automated visa decisions,
- legal advice,
- real-world banking account creation.

---

# 18. Recommended MVP Demo

The final demo should tell one continuous story.

## Demo Persona

**Student:** International student from Cambodia  
**Destination:** United Kingdom  
**University:** Example UK university  
**Funding:** Savings + parent sponsor + scholarship  
**Currencies:** USD → GBP

---

## Demo Flow

### Scene 1 — Create Plan

User:

> "I am moving from Cambodia to the UK for university."

The agent identifies the required financial data and creates the plan.

---

### Scene 2 — Financial Readiness

Dashboard:

```text
Estimated Year-One Cost       £24,600
Confirmed Funding             £21,900
Funding Gap                    £2,700

Funding Coverage                  89%
```

AI:

> "Your current funding covers approximately 89% of your estimated first-year costs. Your highest liquidity requirement occurs in September."

---

### Scene 3 — What-If Question

User:

> "Can I afford a £900/month apartment instead?"

Agent:

```text
Current rent: £650
Proposed rent: £900

Additional yearly cost: £3,000

Funding gap changes:
£2,700 → £5,700

Estimated runway:
10.8 months → 8.1 months
```

---

### Scene 4 — Upcoming Tuition Payment

AI:

> "Your £2,000 tuition installment is due in 12 days."

The agent compares payment methods.

---

### Scene 5 — Cross-Border Payment

```text
Provider A
Estimated total cost: $2,583

Bank SWIFT
Estimated total cost: $2,641

Estimated difference: $58
```

The agent explains the recommendation.

---

### Scene 6 — Recipient Validation

The agent verifies the university payment recipient.

Status:

```text
RECIPIENT VERIFIED
```

---

### Scene 7 — Payment Preparation

```text
PAYMENT REVIEW

Amount:
£2,000

Source:
USD Balance

Provider:
Provider A

Estimated Fee:
$8.40

Exchange Rate:
1 USD = 0.774 GBP

Status:
Awaiting Approval
```

---

### Scene 8 — User Approval

User presses:

> **Approve Payment**

The transaction is executed through a sandbox.

---

### Scene 9 — Execution Evidence

```text
TRANSACTION COMPLETED

Reference:
TX-DEMO-842913

Amount:
£2,000

Recipient:
Verified University Account

Status:
SUCCESS
```

---

### Scene 10 — Plan Automatically Updates

Dashboard:

```text
Tuition Payment
PAID

Remaining Tuition:
£4,000

Funding Coverage:
89% → 91%

Next Action:
Sponsor contribution required by November 15
```

This demonstrates the AI as an active financial participant rather than a passive chatbot.

---

# 19. Proposed Application Navigation

```text
Dashboard
│
├── My Plan
│   ├── Study Details
│   ├── Total Cost
│   ├── Funding
│   └── Timeline
│
├── AI Agent
│
├── Payments
│   ├── Upcoming
│   ├── Compare Routes
│   ├── Prepare Payment
│   └── History
│
├── Sponsors
│   ├── Sponsor List
│   ├── Commitments
│   └── Permissions
│
├── Wallet
│   ├── Balances
│   └── Currencies
│
└── Security
    ├── Permissions
    ├── Limits
    └── Activity Log
```

---

# 20. Dashboard Requirements

The main dashboard should immediately answer:

1. How much will my plan cost?
2. How much funding do I have?
3. What is my funding gap?
4. How long will my money last?
5. What payment is due next?
6. What does the AI recommend I do?

Example:

```text
FINANCIAL PASSPORT

UK Study Plan

Funding
█████████████████░░░ 89%

£21,900 / £24,600

Funding Gap
£2,700

Financial Runway
10.8 months

NEXT PAYMENT
£2,000 Tuition
Due in 12 days

AI RECOMMENDATION
Prepare tuition payment this week.

[Review Payment]
```

---

# 21. Suggested Technical Architecture

```text
                     ┌────────────────────┐
                     │      Frontend      │
                     │ Web / Mobile App   │
                     └─────────┬──────────┘
                               │
                     ┌─────────▼──────────┐
                     │     API Layer      │
                     │ Auth + Validation  │
                     └─────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
┌─────────▼─────────┐ ┌────────▼────────┐ ┌────────▼─────────┐
│ Financial Engine  │ │    AI Agent     │ │ Payment Service  │
│                   │ │                 │ │                  │
│ Cost              │ │ Tool Calling    │ │ Sandbox          │
│ Gap               │ │ Planning        │ │ Transactions     │
│ Runway            │ │ Explanation     │ │ Recipient Check  │
│ Cash Flow         │ │ Actions         │ │ FX Comparison    │
└─────────┬─────────┘ └────────┬────────┘ └────────┬─────────┘
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
                      ┌────────▼────────┐
                      │    Database     │
                      │                │
                      │ Users          │
                      │ Plans          │
                      │ Sponsors       │
                      │ Transactions   │
                      │ Audit Logs     │
                      └─────────────────┘
```

---

# 22. Suggested Data Model

## User

```text
id
name
email
role
homeCountry
homeCurrency
destinationCountry
destinationCurrency
createdAt
```

---

## StudyPlan

```text
id
userId
university
program
destinationCountry
destinationCity
startDate
endDate
tuition
estimatedLivingCost
visaCost
flightCost
housingDeposit
emergencyFundTarget
```

---

## FundingSource

```text
id
studyPlanId
type
providerId
amount
currency
status
availableDate
category
```

Types:

```text
SAVINGS
SPONSOR
SCHOLARSHIP
INCOME
GRANT
OTHER
```

---

## Sponsor

```text
id
studentId
name
relationship
country
baseCurrency
permissions
```

---

## Obligation

```text
id
studyPlanId
category
name
amount
currency
dueDate
status
recipientId
```

---

## WalletBalance

```text
id
userId
currency
balance
source
```

---

## Payment

```text
id
userId
obligationId
sourceCurrency
destinationCurrency
sourceAmount
destinationAmount
provider
fee
exchangeRate
recipientId
status
approvedAt
executedAt
reference
```

---

## AuditEvent

```text
id
userId
eventType
entityType
entityId
metadata
timestamp
```

---

# 22A. Recommended Technology Stack

The MVP should use a TypeScript-first stack optimized for rapid development, strong type safety, real-time financial state, and agent-driven workflows.

## 22A.1 Core Stack

| Layer                     | Technology                                | Purpose                                                                                                                  |
| ------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Runtime / Package Manager | **Bun**                                   | Fast dependency installation, scripts, local tooling, tests, and development runtime                                     |
| Frontend                  | **React + TypeScript**                    | Main application UI                                                                                                      |
| Routing                   | **TanStack Router**                       | Fully typed client-side routing and route-level data boundaries                                                          |
| Server State              | **TanStack Query**                        | External API data, payment-provider requests, FX data, caching, retries, and async request state                         |
| Backend / Database        | **Convex**                                | Real-time database, backend functions, scheduled jobs, secure server-side business logic, and reactive application state |
| Styling                   | **Tailwind CSS**                          | Fast, consistent UI implementation                                                                                       |
| UI Components             | **shadcn/ui**                             | Accessible, composable application components                                                                            |
| Validation                | **Zod**                                   | Runtime validation for forms, external APIs, and AI tool inputs/outputs                                                  |
| Forms                     | **React Hook Form**                       | Complex typed forms for onboarding, sponsors, study plans, and payment approval                                          |
| Testing                   | **Vitest + Testing Library + Playwright** | Unit, component, integration, and end-to-end testing                                                                     |
| Source Control / CI       | **GitHub + GitHub Actions**               | Collaboration, automated checks, security scanning, and deployment workflow                                              |

The preferred language across the project is **TypeScript**. Shared domain types should be reused wherever practical across frontend code, Convex functions, validation schemas, financial calculations, and AI tool definitions.

---

## 22A.2 Why This Stack Fits Financial Passport

### Bun

Bun should be used as the primary JavaScript/TypeScript toolchain.

Use it for:

- dependency installation,
- development scripts,
- build commands,
- test execution,
- local CLI utilities,
- seed scripts,
- financial-model test fixtures.

Recommended commands:

```bash
bun install
bun run dev
bun test
bun run build
```

The repository should avoid mixing npm, pnpm, Yarn, and Bun lockfiles. **Bun should be the single package manager for the project.**

---

### React + TypeScript

React should provide the application UI, while TypeScript should be used throughout the frontend and backend-facing application code.

Important domain concepts should have explicit types, including:

```ts
type CurrencyCode = "USD" | "GBP" | "KHR" | "EUR" | string;

type Money = {
  amount: number;
  currency: CurrencyCode;
};

type PaymentStatus =
  | "draft"
  | "awaiting_approval"
  | "approved"
  | "processing"
  | "completed"
  | "failed";
```

Financial calculations must not depend on untyped arbitrary objects returned by the AI layer.

---

## 22A.3 TanStack Router

**TanStack Router** should be used for type-safe application routing.

Suggested route structure:

```text
/
├── /dashboard
├── /onboarding
├── /plans
│   ├── /new
│   └── /$planId
│       ├── /overview
│       ├── /funding
│       ├── /timeline
│       └── /simulation
├── /agent
├── /payments
│   ├── /upcoming
│   ├── /compare
│   ├── /$paymentId
│   └── /history
├── /sponsors
│   └── /$sponsorId
├── /wallet
├── /security
│   ├── /permissions
│   └── /activity
└── /settings
```

### Router Requirements

- Protected routes must verify authentication.
- Sponsor routes must verify sponsor permissions.
- Payment routes must validate ownership before showing transaction data.
- Sensitive route parameters must never be trusted without backend authorization.
- Route search parameters should be typed for filters, simulation inputs, and dashboard date ranges.

Example use cases:

```text
/payments/compare?obligationId=abc123
/plans/plan123/simulation?rent=900
```

The router should be responsible for navigation state, not financial business logic.

---

# 22A.4 TanStack Query

**TanStack Query** should manage asynchronous server state that comes from services outside Convex or requires request caching and lifecycle control.

Primary uses:

- FX-rate providers,
- tuition/payment-provider APIs,
- remittance-provider comparison endpoints,
- university data APIs,
- visa-cost data sources,
- sandbox payment APIs,
- external recipient-verification services.

Example query keys:

```ts
["fx-rate", "USD", "GBP"][("payment-routes", obligationId)][
  ("recipient-verification", recipientId)
][("university-fees", universityId, programmeId)];
```

### Query Rules

Financial data must have deliberate freshness policies.

For example:

```text
FX rate                 Short stale time
University tuition      Longer stale time
Payment route quote     Very short stale time
Visa fee                Moderate stale time
Historical transaction  Effectively immutable
```

Do not silently reuse stale payment quotes during transaction confirmation. A payment quote should be refreshed before the final approval step when required by the provider.

### Convex vs TanStack Query

Use **Convex reactive queries** for first-party Financial Passport application state.

Use **TanStack Query** primarily for third-party or request-oriented server state.

This avoids unnecessary duplication.

Example:

```text
Student's saved study plan       → Convex
Sponsor commitments              → Convex
Application audit log            → Convex
Live USD/GBP quote               → TanStack Query
Payment-provider comparison      → TanStack Query
External university fee lookup   → TanStack Query
```

---

# 22A.5 Convex

**Convex** should be the primary backend platform and source of truth for Financial Passport application data.

Convex is responsible for:

- persistent database storage,
- real-time application state,
- backend queries and mutations,
- authorization checks,
- sponsor permission enforcement,
- financial-plan updates,
- transaction-state management,
- audit logging,
- scheduled reminders and financial checks,
- secure server-side calls to external services where appropriate.

## Convex Data Domains

Recommended top-level tables:

```text
users
studyPlans
fundingSources
sponsors
sponsorPermissions
obligations
walletBalances
paymentRecipients
payments
paymentQuotes
agentRuns
agentActions
approvals
notifications
auditEvents
```

### Example Ownership Model

Every financial object should be linked back to an authenticated principal.

Example:

```text
users
  └── studyPlans
       ├── obligations
       ├── fundingSources
       └── payments
```

Sponsor access should never be inferred simply because a sponsor knows a student ID. Access must pass explicit permission checks.

---

# 22A.6 Convex Function Design

Use separate Convex functions for reads, writes, actions, and scheduled work.

Suggested structure:

```text
convex/
├── schema.ts
├── users.ts
├── plans.ts
├── funding.ts
├── sponsors.ts
├── obligations.ts
├── wallets.ts
├── payments.ts
├── recipients.ts
├── approvals.ts
├── audit.ts
├── notifications.ts
├── agent.ts
├── calculations/
│   ├── fundingGap.ts
│   ├── runway.ts
│   ├── cashFlow.ts
│   └── fx.ts
└── actions/
    ├── comparePaymentRoutes.ts
    ├── executeSandboxPayment.ts
    └── verifyRecipient.ts
```

### Queries

Queries should be used for reads such as:

```text
getStudyPlan
getDashboardState
getUpcomingObligations
getFundingSummary
getSponsorCommitments
getPaymentHistory
getAuditEvents
```

### Mutations

Mutations should perform deterministic writes such as:

```text
createStudyPlan
updateStudyPlan
addFundingSource
inviteSponsor
updateSponsorPermission
createPaymentDraft
approvePayment
recordPaymentResult
```

### Actions

Actions should be used for external side effects, such as:

```text
fetchLiveFxRate
compareExternalPaymentProviders
verifyExternalRecipient
executeSandboxPayment
callAiAgent
```

An AI model must not write directly to database tables without going through validated application functions.

---

# 22A.7 AI / Agent Layer

The agent layer should be provider-agnostic at the architecture level.

Recommended approach:

```text
User Message
    ↓
Agent Orchestrator
    ↓
Tool Selection
    ↓
Validated Tool Input
    ↓
Convex Query / Mutation / Action
    ↓
Structured Tool Result
    ↓
Agent Explanation
```

The application may use a hosted LLM API, but the AI model must not become the source of truth for financial state.

### Agent Tool Contract

Each agent tool should define:

- tool name,
- description,
- Zod input schema,
- authorization requirements,
- execution class,
- structured return type,
- audit behavior.

Example:

```ts
const preparePaymentInput = z.object({
  obligationId: z.string(),
  paymentRouteId: z.string(),
});
```

The AI may choose to call `preparePayment`, but the server decides whether the user is authorized to prepare that payment.

---

# 22A.8 Financial Calculation Layer

Core financial calculations should be implemented as deterministic TypeScript functions rather than generated by the LLM.

Examples:

```text
calculateFundingGap()
calculateMonthlyBurn()
calculateFinancialRunway()
calculateProjectedBalance()
calculateFxConversion()
calculateEffectiveTransferCost()
calculateFundingCoverage()
```

Requirements:

- pure functions where practical,
- unit-tested,
- explicit currency parameters,
- no hidden rounding,
- deterministic results,
- decimal-safe handling for money.

For production-quality calculations, avoid relying on ordinary floating-point arithmetic for monetary values. Store values in minor units where practical.

Example:

```text
$12.34 → 1234 cents
£2,000.00 → 200000 pence
```

---

# 22A.9 Authentication and Authorization

Authentication should integrate cleanly with Convex.

The chosen authentication provider must support:

- secure sessions,
- student accounts,
- sponsor accounts,
- account linking/invitations,
- optional MFA,
- server-verifiable identity.

Authorization remains an application responsibility.

Authentication answers:

> Who is the user?

Authorization answers:

> Is this user allowed to access or modify this specific financial resource?

Every Convex mutation that accesses sensitive data must enforce authorization server-side.

---

# 22A.10 UI Stack

Recommended:

```text
React
TypeScript
Tailwind CSS
shadcn/ui
Lucide Icons
Recharts or another lightweight charting library
```

Suggested UI primitives:

- cards,
- dialogs,
- drawers,
- forms,
- tables,
- tabs,
- alerts,
- progress bars,
- command palette,
- timeline components.

The UI should emphasize financial clarity over decorative complexity.

---

# 22A.11 Testing Stack

## Unit Testing

Use **Vitest** for:

- financial calculations,
- permission rules,
- route-selection logic,
- payment-state transitions,
- validation schemas.

## Component Testing

Use **Testing Library** for:

- forms,
- payment approval UI,
- sponsor permission controls,
- warnings and error states.

## End-to-End Testing

Use **Playwright** for critical flows:

```text
Student signup
→ Create study plan
→ Add sponsor funding
→ Detect funding gap
→ Ask agent to prepare tuition payment
→ Compare routes
→ Approve payment
→ Execute sandbox transaction
→ Confirm plan update
```

---

# 22A.12 Suggested Repository Structure

```text
financial-passport/
├── src/
│   ├── components/
│   ├── features/
│   │   ├── agent/
│   │   ├── dashboard/
│   │   ├── payments/
│   │   ├── plans/
│   │   ├── sponsors/
│   │   └── wallet/
│   ├── routes/
│   ├── hooks/
│   ├── lib/
│   ├── schemas/
│   ├── types/
│   └── main.tsx
│
├── convex/
│   ├── schema.ts
│   ├── users.ts
│   ├── plans.ts
│   ├── sponsors.ts
│   ├── funding.ts
│   ├── obligations.ts
│   ├── payments.ts
│   ├── approvals.ts
│   ├── audit.ts
│   ├── agent.ts
│   ├── calculations/
│   └── actions/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── public/
├── .env.example
├── package.json
├── bun.lock
├── tsconfig.json
└── README.md
```

---

# 22A.13 Data Flow Example — Tuition Payment

```text
Student opens upcoming payment
        ↓
TanStack Router loads /payments/$paymentId
        ↓
Convex query returns obligation + application state
        ↓
TanStack Query requests live provider quotes
        ↓
AI agent compares structured results
        ↓
Student selects / accepts recommendation
        ↓
Convex mutation creates payment draft
        ↓
Student reviews payment
        ↓
Convex mutation records explicit approval
        ↓
Convex action calls sandbox payment provider
        ↓
Provider response is validated
        ↓
Convex mutation stores final transaction state
        ↓
Audit event written
        ↓
Reactive Convex query updates dashboard in real time
```

---

# 22A.14 Environment Variables

Example `.env.example`:

```bash
VITE_CONVEX_URL=

AI_API_KEY=
FX_API_KEY=
PAYMENT_SANDBOX_API_KEY=
PAYMENT_SANDBOX_BASE_URL=

APP_ENV=development
```

Rules:

- Never commit real keys.
- Frontend-exposed variables must contain no secrets.
- Provider secrets should only be used from trusted server-side code.
- Competition demo credentials should be isolated from production credentials.

---

# 22A.15 Technical Decision Summary

The recommended stack is therefore:

```text
Bun
  ↓
React + TypeScript
  ↓
TanStack Router
  ↓
TanStack Query
  ↓
Convex
  ↓
External Financial / AI / Sandbox APIs
```

This architecture intentionally gives different responsibilities to each layer:

- **TanStack Router** owns navigation and route state.
- **TanStack Query** owns request-oriented external server state.
- **Convex** owns Financial Passport's persistent and reactive application state.
- **Deterministic TypeScript functions** own financial calculations.
- **The AI agent** orchestrates tools and explains decisions.
- **The user** retains final authority over sensitive financial actions.

This separation is important for both reliability and the competition's security/compliance scoring.

---

# 23. Core Financial Calculations

## Funding Gap

```text
Funding Gap =
Total Projected Costs
- Confirmed Funding
```

---

## Monthly Burn Rate

```text
Monthly Burn =
Monthly Rent
+ Food
+ Transportation
+ Utilities
+ Insurance
+ Academic Expenses
+ Personal Expenses
```

---

## Simple Runway

```text
Runway =
Liquid Available Funds
/ Monthly Burn
```

The production calculation should additionally account for irregular obligations.

---

## Currency Conversion

```text
Destination Amount =
Source Amount × FX Rate - Fees
```

---

## Payment Route Effective Cost

```text
Effective Cost =
Transfer Fee
+ Estimated FX Spread Cost
+ Additional Provider Fees
```

---

# 24. Non-Functional Requirements

## Performance

- Dashboard should load within 3 seconds under normal demo conditions.
- Financial recalculation should complete within 1 second where possible.
- Agent responses should stream where supported.

## Reliability

- Financial calculations must be deterministic outside explicitly AI-generated estimates.
- Transaction state must not depend only on language-model output.

## Accessibility

- Keyboard-accessible navigation.
- Semantic labels.
- Clear warning states.
- Sufficient contrast.
- No critical information communicated by color alone.

## Responsiveness

The MVP should support:

- desktop,
- tablet,
- mobile web.

---

# 25. Explainability Requirements

Each AI recommendation should provide a short explanation.

Example:

```text
Recommendation:
Use Provider A.

Why:
- lowest estimated total transfer cost,
- supports GBP tuition transfers,
- expected delivery before your deadline,
- recipient is verified.

Estimated saving:
$58 compared with your bank's SWIFT route.
```

Users should be able to select:

> **Why this recommendation?**

---

# 26. Error Handling

The application must gracefully handle:

- missing exchange rate,
- unsupported currency,
- insufficient balance,
- payment provider unavailable,
- invalid recipient,
- transaction failure,
- expired user authorization,
- conflicting sponsor commitments,
- unavailable external data.

Example:

```text
Payment could not be executed.

Reason:
Sandbox provider rejected the transaction.

No funds were deducted.

Reference:
ERR-201
```

---

# 27. Testing Requirements

## Unit Tests

Required for:

- funding-gap calculation,
- runway calculation,
- FX conversion,
- transaction-fee calculation,
- permission logic,
- sponsor visibility logic.

## Integration Tests

Required for:

- agent → payment service,
- payment service → sandbox API,
- sponsor invitation,
- user authorization flow,
- transaction logging.

## Security Tests

Required for:

- unauthorized sponsor access,
- transaction execution without approval,
- IDOR/resource ownership,
- expired session,
- API-key exposure,
- role escalation.

---

# 28. Required Competition Execution Evidence

The final project should generate evidence that the agent completed financial tasks.

Evidence may include:

- sandbox transaction logs,
- transaction IDs,
- agent action log,
- approval event,
- recipient-validation result,
- before/after financial state,
- demo recording.

Example:

```text
AGENT EXECUTION TRACE

12:04:01  Tuition obligation detected
12:04:02  Available balance checked
12:04:03  Payment routes retrieved
12:04:04  Recipient validated
12:04:05  Provider A selected
12:04:06  Payment prepared
12:04:18  User approved
12:04:19  Sandbox payment submitted
12:04:20  Payment successful
12:04:21  Financial plan updated
```

---

# 29. Success Metrics

For the competition prototype:

## Functional

- ≥ 90% of predefined demo tasks successfully completed.
- 100% of executed transactions require correct authorization.
- 100% of transactions recorded in audit history.
- No sponsor can access unapproved student financial data.

## Experience

A new user should be able to:

- create a study plan in under 5 minutes,
- understand funding status immediately,
- perform a what-if calculation in one interaction,
- prepare a tuition payment through the AI agent.

---

# 30. Key Differentiators

Financial Passport is not simply:

- a budgeting application,
- a chatbot,
- a remittance application,
- a university-cost calculator,
- a sponsor tracker.

It combines all of these into an AI agent that understands the student's full cross-border financial state.

Key differentiators:

1. **International-student-specific financial model**
2. **Funding-gap prediction**
3. **Liquidity and runway forecasting**
4. **Student-sponsor collaboration**
5. **Multi-currency financial reasoning**
6. **Payment-route comparison**
7. **Recipient validation**
8. **AI-prepared financial actions**
9. **Human authorization before execution**
10. **Explainable decision-making**
11. **Auditable agent execution**

---

# 31. Product Positioning

## One-Sentence Description

> **Financial Passport is an AI financial agent that helps international students plan, fund, transfer, pay, and monitor the financial journey of studying abroad.**

## Short Pitch

> International students manage tuition, visas, living costs, sponsors, currencies, and international transfers across disconnected systems. Financial Passport brings these obligations into one financial plan, identifies funding gaps, coordinates sponsors, finds efficient cross-border payment routes, and—with user approval—executes supported financial tasks.

## Demo Hook

> **Students know where they want to study. Financial Passport tells them whether they can afford to get there, whether they can afford to stay there, and what financial action they should take next.**

---

# 32. Development Priorities

Development should proceed in the following order:

## Priority 1 — Financial Core

- profile,
- study plan,
- costs,
- funding,
- funding gap,
- runway,
- timeline.

## Priority 2 — Agent Intelligence

- structured agent tools,
- plan querying,
- what-if simulation,
- action recommendations.

## Priority 3 — Payment Workflow

- route comparison,
- recipient validation,
- payment preparation,
- approval,
- sandbox execution.

## Priority 4 — Sponsor Mode

- sponsor invitation,
- commitments,
- permissions,
- funding requests.

## Priority 5 — Polish

- dashboard,
- alerts,
- demo data,
- execution logs,
- final UX.

---

# 33. Proposed Milestones

## Milestone 1 — Foundation

Deliver:

- authentication,
- database,
- student profile,
- study plan.

## Milestone 2 — Financial Engine

Deliver:

- cost model,
- funding sources,
- gap calculation,
- runway,
- timeline.

## Milestone 3 — AI Agent

Deliver:

- conversational interface,
- tool calling,
- structured recommendations,
- what-if simulations.

## Milestone 4 — Payments

Deliver:

- route comparison,
- recipient verification,
- prepare/approve/execute workflow,
- sandbox integration.

## Milestone 5 — Sponsor Mode

Deliver:

- invitations,
- permissions,
- contribution tracking,
- sponsor requests.

## Milestone 6 — Competition Readiness

Deliver:

- security testing,
- execution evidence,
- technical documentation,
- demo video,
- presentation deck,
- README,
- test cases.

---

# 34. Competition Submission Checklist

Before submission, verify:

- [ ] Technical architecture documented
- [ ] Core algorithms documented
- [ ] AI agent tools documented
- [ ] Security design documented
- [ ] Permission tiers implemented
- [ ] Known-risk list completed
- [ ] Presentation ≤ 10 minutes
- [ ] Demo video ≤ 5 minutes
- [ ] GitHub repository complete
- [ ] README complete
- [ ] Deployment instructions complete
- [ ] Test cases included
- [ ] Sandbox transaction evidence included
- [ ] Agent execution logs included
- [ ] No private API keys committed
- [ ] Third-party licenses documented
- [ ] All external data sources documented

---

# 35. Final Product Definition

Financial Passport should be judged successful if a user can say:

> "I want to study in another country."

and the system can help transform that intention into a financially executable plan:

1. determine expected costs,
2. identify available funding,
3. expose the remaining gap,
4. predict cash-flow problems,
5. coordinate sponsors,
6. manage currencies,
7. identify upcoming financial obligations,
8. recommend an appropriate financial action,
9. prepare the action,
10. obtain explicit authorization,
11. execute the supported task,
12. verify the result,
13. update the student's financial state.

That complete loop is the defining feature of the product.

> **Financial Passport is not only a financial assistant. It is a controlled, explainable financial agent for the international-student journey.**
