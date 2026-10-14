import {
  destinationPaymentRoutes,
  paymentRouteNames,
} from "../../shared/payment-routes";
import { universities as studyUniversities } from "../../shared/study";
export type TuitionCountry = "US" | "UK" | "China";
export type TuitionRoute = "bank" | "platform" | "card";
export const universities: Record<TuitionCountry, string[]> = {
  US: studyUniversities["United States"],
  UK: studyUniversities["United Kingdom"],
  China: studyUniversities.China,
};
export function tuitionEstimates(
  origin: TuitionCountry,
  destination: TuitionCountry,
  amount: number,
  _localAccount: boolean,
) {
  const domestic = origin === destination;
  // Costs here are USD-equivalent planning estimates.
  const wireFee = origin === "China" ? 37 : 40;
  const wireSpread = origin === "China" ? 0.003 : 0.025;
  const fxCost = (spread: number) =>
    domestic
      ? [0, 0]
      : [amount / (1 - spread) - amount, amount / (1 - spread) - amount];
  return [
    {
      id: "bank" as const,
      title: paymentRouteNames.fintech,
      subtitle: destinationPaymentRoutes[destination].fintech,
      fee: domestic ? [0, 0] : [amount * 0.0033, amount * 0.004],
      fx: [0, 0],
      speed: "Instant–2 business days",
      note: "Conversion uses the mid-market reference rate with an upfront conversion fee. Confirm provider eligibility and the university’s accepted payment rail.",
    },
    {
      id: "platform" as const,
      title: paymentRouteNames.platform,
      subtitle: destinationPaymentRoutes[destination].platform,
      fee: [0, 0],
      fx: fxCost(0.015),
      speed: "2–3 business days",
      note: "Use the education payment partners listed for your destination through your university’s payment instructions. The 1.5% FX spread is embedded in the rate with no upfront fee.",
    },
    {
      id: "card" as const,
      title: paymentRouteNames.bankCard,
      subtitle: destinationPaymentRoutes[destination].bankCard,
      fee: domestic ? [0, 0] : [wireFee, wireFee],
      fx: fxCost(wireSpread),
      speed: "3–5 business days",
      note:
        origin === "China"
          ? "Chinese bank wire estimate: 250 yuan (about $37) upfront and a 0.3% FX spread."
          : "US/UK bank wire estimate: $40 upfront and a 2.5% FX spread. Confirm SWIFT charges and full-credit instructions with the bank.",
    },
  ];
}
