import type {
  AuditEvent,
  CostItem,
  FundingSource,
  PaymentRoute,
  Sponsor,
  Wallet,
} from "../types/app";

export const costs: CostItem[] = [
  {
    id: "tuition",
    name: "Tuition",
    category: "Recurring",
    amount: 6000,
    due: "3 instalments",
    paid: false,
  },
  {
    id: "rent",
    name: "Rent",
    category: "Recurring",
    amount: 7800,
    due: "Monthly",
  },
  {
    id: "living",
    name: "Living costs",
    category: "Recurring",
    amount: 5100,
    due: "Monthly",
  },
  {
    id: "deposit",
    name: "Housing deposit",
    category: "Arrival",
    amount: 1300,
    due: "01 Sep 2026",
  },
  {
    id: "visa",
    name: "Visa & health surcharge",
    category: "Pre-departure",
    amount: 1600,
    due: "Paid",
    paid: true,
  },
  {
    id: "flight",
    name: "Flight & arrival",
    category: "Pre-departure",
    amount: 800,
    due: "20 Aug 2026",
  },
  {
    id: "emergency",
    name: "Emergency buffer",
    category: "Safety",
    amount: 2000,
    due: "Reserve",
  },
];
export const funding: FundingSource[] = [
  {
    id: "savings",
    name: "Personal savings",
    type: "Savings",
    amount: 8900,
    status: "confirmed",
    available: "Available now",
  },
  {
    id: "parent",
    name: "Parent sponsorship",
    type: "Sponsor",
    amount: 9000,
    status: "confirmed",
    available: "Quarterly",
  },
  {
    id: "scholarship",
    name: "Merit scholarship",
    type: "Scholarship",
    amount: 4000,
    status: "confirmed",
    available: "01 Sep 2026",
  },
];
export const sponsors: Sponsor[] = [
  {
    id: "sp1",
    name: "Sokha Chan",
    relationship: "Parent",
    commitment: 9000,
    nextDate: "15 Nov 2026",
    permissions: ["Commitment status", "Sponsored tuition", "Funding requests"],
  },
];
export const wallets: Wallet[] = [
  {
    currency: "USD",
    symbol: "$",
    amount: 8700,
    gbpValue: 6734,
    label: "Primary savings",
  },
  {
    currency: "GBP",
    symbol: "£",
    amount: 2166,
    gbpValue: 2166,
    label: "UK current account",
  },
  {
    currency: "CNY",
    symbol: "¥",
    amount: 2106.8,
    gbpValue: 229,
    label: "Home account",
  },
];
export const routes: PaymentRoute[] = [
  {
    id: "platform",
    provider: "Education Platforms",
    sourceAmount: 2590.68,
    fee: 15,
    fxRate: 0.772,
    delivery: "2–3 business days",
  },
  {
    id: "wise",
    provider: "Wise",
    sourceAmount: 2574.6,
    fee: 8.4,
    fxRate: 0.774,
    delivery: "1 business day",
    recommended: true,
  },
  {
    id: "swift",
    provider: "SWIFT bank transfer",
    sourceAmount: 2607,
    fee: 34,
    fxRate: 0.768,
    delivery: "3–5 business days",
  },
];
export const initialAudit: AuditEvent[] = [
  {
    id: "a1",
    type: "PLAN_CREATED",
    detail: "UK study plan created",
    timestamp: "29 Sep 2026, 09:14",
    actor: "Dara Chan",
  },
  {
    id: "a2",
    type: "SPONSOR_ACCEPTED",
    detail: "£9,000 commitment confirmed",
    timestamp: "29 Sep 2026, 09:22",
    actor: "Sokha Chan",
  },
  {
    id: "a3",
    type: "RECIPIENT_VERIFIED",
    detail: "University account matched verified directory",
    timestamp: "29 Sep 2026, 09:31",
    actor: "MoveWire",
  },
];
