import type { CostItem, FundingSource, PaymentRoute } from "../types";

export const sumCosts = (items: CostItem[]) =>
  items.reduce((sum, item) => sum + item.amount, 0);
export const confirmedFunding = (items: FundingSource[]) =>
  items
    .filter((i) => i.status === "confirmed")
    .reduce((sum, item) => sum + item.amount, 0);
export const fundingGap = (cost: number, funding: number) =>
  Math.max(0, cost - funding);
export const fundingCoverage = (cost: number, funding: number) =>
  cost <= 0 ? 0 : Math.min(100, (funding / cost) * 100);
export const monthlyBurn = (rent: number, expenses: number[]) =>
  rent + expenses.reduce((a, b) => a + b, 0);
export const runway = (liquidFunds: number, burn: number) =>
  burn <= 0 ? 0 : liquidFunds / burn;
export const convertCurrency = (source: number, rate: number, fees = 0) =>
  source * rate - fees;
export const routeEffectiveCost = (
  route: Pick<PaymentRoute, "fee" | "sourceAmount">,
) => route.sourceAmount + route.fee;
export const formatGBP = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
export const formatUSD = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
