export type FundingStatus = "confirmed" | "pending";
export type PaymentStatus =
  | "not_started"
  | "prepared"
  | "approved"
  | "processing"
  | "completed"
  | "failed";

export interface FundingSource {
  id: string;
  name: string;
  type: "Savings" | "Sponsor" | "Scholarship";
  amount: number;
  status: FundingStatus;
  available: string;
}
export interface CostItem {
  id: string;
  name: string;
  category: "Pre-departure" | "Arrival" | "Recurring" | "Safety";
  amount: number;
  due: string;
  paid?: boolean;
}
export interface Sponsor {
  id: string;
  name: string;
  relationship: string;
  commitment: number;
  nextDate: string;
  permissions: string[];
}
export interface Wallet {
  currency: string;
  symbol: string;
  amount: number;
  gbpValue: number;
  label: string;
}
export interface PaymentRoute {
  id: string;
  provider: string;
  sourceAmount: number;
  fee: number;
  fxRate: number;
  delivery: string;
  recommended?: boolean;
}
export interface AuditEvent {
  id: string;
  type: string;
  detail: string;
  timestamp: string;
  actor: string;
}
