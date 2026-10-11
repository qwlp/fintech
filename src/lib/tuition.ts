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
  localAccount: boolean,
) {
  const domestic = origin === destination;
  const local = domestic || (localAccount && origin !== "China");
  const wireMargin = origin === "China" ? [0.002, 0.005] : [0.02, 0.035];
  return [
    {
      id: "bank" as const,
      title: paymentRouteNames.fintech,
      subtitle: destinationPaymentRoutes[destination].fintech,
      fee: local ? [0, 0] : [30, 85],
      fx: domestic
        ? [0, 0]
        : local
          ? [amount * 0.0033, amount * 0.0065]
          : wireMargin.map((rate) => amount * rate),
      speed: local ? "Instant–2 business days" : "3–7 business days + matching",
      note: local
        ? "Confirm the university accepts your account and payment rail. Account eligibility and conversion availability vary."
        : "Ask the bank for OUR charges and a full-credit quote. Allow extra time for the university to match your student reference.",
    },
    {
      id: "platform" as const,
      title: paymentRouteNames.platform,
      subtitle: destinationPaymentRoutes[destination].platform,
      fee: [0, 0],
      fx: domestic ? [0, 0] : [amount * 0.012, amount * 0.025],
      speed: "2–3 business days",
      note: "Use the education payment partners listed for your destination through your university’s payment instructions. FX cost is embedded in the rate; payment-method fees may also apply.",
    },
    {
      id: "card" as const,
      title: paymentRouteNames.bankCard,
      subtitle: destinationPaymentRoutes[destination].bankCard,
      fee:
        destination === "US"
          ? [amount * 0.0275, amount * 0.0425]
          : destination === "China" && !domestic
            ? [amount * 0.02, amount * 0.03]
            : [0, 0],
      fx: domestic
        ? [0, 0]
        : destination === "UK"
          ? [amount * 0.005, amount * 0.01]
          : [0, amount * 0.03],
      speed: "Instant–24 hours",
      note:
        destination === "UK"
          ? "Estimate assumes a card with no foreign transaction fee. Choose GBP at checkout and check your issuer’s limit."
          : "Check card acceptance, transaction limits, issuer FX charges and when your student balance updates. Local wallets require an eligible linked account.",
    },
  ];
}
