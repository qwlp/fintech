import { convertMoney, currencyRate } from "./currency";
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
