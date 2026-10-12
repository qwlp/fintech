import type { CostItem, FundingSource, PaymentRoute } from "../types/app";

export const sumCosts = (items: CostItem[]) =>
  items.reduce((sum, item) => sum + item.amount, 0);
export const confirmedFunding = (items: FundingSource[]) =>
  items
    .filter((i) => i.status === "confirmed")
    .reduce((sum, item) => sum + item.amount, 0);
type PlanFundingSource = {
  name: string;
  type: string;
  amount: number;
  status: string;
  available: string;
};

// Setup/profile store a total rather than an itemized funding breakdown.
// Preserve a matching breakdown; otherwise show the declared total once.
export function resolvePlanFunding(
  items: PlanFundingSource[],
  declaredAmount: unknown,
) {
  const itemizedTotal = items
    .filter((item) => item.status === "confirmed")
    .reduce((sum, item) => sum + item.amount, 0);
  const total =
    typeof declaredAmount === "number" &&
    Number.isFinite(declaredAmount) &&
    declaredAmount >= 0
      ? declaredAmount
      : itemizedTotal;
  const sources: PlanFundingSource[] =
    Math.round(total * 100) === Math.round(itemizedTotal * 100)
      ? items
      : [
          ...(total > 0
            ? [
                {
                  name: "Confirmed funding",
                  type: "Declared funding",
                  amount: total,
                  status: "confirmed",
                  available: "Reported in your profile",
                },
              ]
            : []),
          ...items.filter((item) => item.status !== "confirmed"),
        ];
  return { total, sources };
}
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
