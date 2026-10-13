import type { PaymentStatus } from "./app";

export type DatabaseState = {
  account: {
    _id: string;
    university: string;
    course?: string;
    universityChoices?: string[];
    countryFrom: string;
    countryTo: string;
    countriesTo?: string[];
    name: string;
    initials: string;
    avatarUrl?: string | null;
    role: string;
    planName: string;
    paymentStatus: PaymentStatus;
    selectedRoute: string;
    sponsorRequestSent: boolean;
    aiConsentAt?: number;
    setupComplete?: boolean;
  };
  auditEvents: Array<{
    _id: string;
    type: string;
    detail: string;
    timestamp: number;
    actor: string;
  }>;
  messages: Array<{
    _id: string;
    from: "agent" | "user";
    text: string;
    timestamp?: number;
    chatId?: string;
    toolResults?: { name: string; result: unknown }[];
  }>;
  notifications: Array<{
    _id: string;
    title: string;
    detail: string;
    read: boolean;
  }>;
  checklist: Array<{
    key: string;
    label: string;
    detail: string;
    done: boolean;
  }>;
  costs: Array<{
    key: string;
    name: string;
    category: string;
    amount: number;
    due: string;
    paid?: boolean;
  }>;
  funding: Array<{
    key: string;
    name: string;
    type: string;
    amount: number;
    status: string;
    available: string;
  }>;
  sponsors: Array<{
    key: string;
    name: string;
    relationship: string;
    commitment: number;
    nextDate: string;
    permissions: string[];
  }>;
  wallets: Array<{
    currency: string;
    symbol: string;
    amount: number;
    gbpValue: number;
    label: string;
  }>;
  toolExecutions?: Array<{
    name: string;
    arguments: unknown;
    result: unknown;
    timestamp: number;
  }>;
  paymentRoutes: Array<{
    sourceCurrency?: string;
    targetCurrency?: string;
    maxBusinessDays?: number;
    quotedAt?: number;
    quoteExpiresAt?: number;
    key: string;
    provider: string;
    sourceAmount: number;
    fee: number;
    fxRate: number;
    delivery: string;
    recommended?: boolean;
  }>;
  config: Record<string, any>;
  sponsorRequests: Array<{
    _id: string;
    sponsorKey: string;
    amount: number;
    purpose: string;
    neededBy: string;
    status: "sent" | "fulfilled";
  }>;
  paymentProposals?: Array<{
    delivery: string;
    _id: string;
    recipient: string;
    recipientLast4: string;
    provider: string;
    amountMinor: number;
    totalMinor: number;
    feeMinor: number;
    fxRate: number;
    sourceCurrency: string;
    targetCurrency: string;
    status: string;
    expiresAt: number;
    createdAt: number;
    protectedReserveMinor?: number;
    remainingGBPMinor?: number;
    reference?: string;
  }>;
  ledgerEntries?: Array<{
    reference: string;
    currency: string;
    debitMinor: number;
    beforeMinor: number;
    afterMinor: number;
    recipient: string;
    receivedMinor: number;
    receivedCurrency: string;
    timestamp: number;
  }>;
  rateAlerts: Array<{
    _id: string;
    pair: string;
    targetRate: number;
    active: boolean;
  }>;
};

export type Page =
  | "Dashboard"
  | "Profile"
  | "Move Planner"
  | "AI Agent"
  | "Payments"
  | "Exchange"
  | "Sponsors"
  | "Wallet"
  | "Security";
