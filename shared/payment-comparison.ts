import { convertMoney, currencyRate } from "./currency";
import { paymentRouteCategory } from "./payment-routes";

/** Illustrative provider pricing. Bank origin follows the sending currency. */
export function providerPricing(
  provider: string,
  source: string,
  target: string,
  amount: number,
  midMarket: number,
) {
  const category = paymentRouteCategory(provider);
  const crossBorder = source !== target;
  const spread = !crossBorder
    ? 0
    : category === "platform"
      ? 0.015
      : category === "bankCard"
        ? source === "CNY"
          ? 0.003
          : 0.025
        : 0;
  const fxRate = crossBorder
    ? Number((midMarket * (1 - spread)).toPrecision(12))
    : 1;
  const sourceAmount = Math.ceil((amount / fxRate - 1e-9) * 100) / 100;
  const fee = !crossBorder
    ? 0
    : category === "fintech"
      ? Math.round(sourceAmount * 0.0035 * 100) / 100
      : category === "bankCard"
        ? source === "CNY"
          ? 250
          : convertMoney(40, "USD", source)
        : 0;
  return { fxRate, fee, sourceAmount };
}

export const formatExchangeRate = (rate: number) =>
  String(Number(rate.toPrecision(12)));
export function comparisonRoute<
  T extends {
    fxRate: number;
    fee: number;
    sourceCurrency?: string;
    targetCurrency?: string;
  },
>(route: T, source: string, target: string): T {
  const oldSource = route.sourceCurrency ?? "USD";
  const oldTarget = route.targetCurrency ?? "GBP";
  if (source === oldSource && target === oldTarget) return route;
  const spread = route.fxRate / currencyRate(oldSource, oldTarget);
  return {
    ...route,
    sourceCurrency: source,
    targetCurrency: target,
    fee: convertMoney(route.fee, oldSource, source),
    fxRate: source === target ? 1 : currencyRate(source, target) * spread,
  };
}
export function paymentOptionScore(
  route: { totalUSD: number | null; fresh: boolean; eligible: boolean },
  cheapest: number,
  days?: number,
): number {
  const cost =
    route.totalUSD && route.totalUSD > 0
      ? Math.min(5, (5 * cheapest) / route.totalUSD)
      : 0;
  const speed =
    days == null ? 0 : days <= 1 ? 2 : days <= 3 ? 1.5 : days <= 5 ? 1 : 0.5;
  return (
    Math.round(
      (cost + speed + (route.eligible ? 2 : 0) + (route.fresh ? 1 : 0)) * 10,
    ) / 10
  );
}
