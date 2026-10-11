export type PaymentRouteCategory = "fintech" | "platform" | "bankCard";

export const paymentRouteNames: Record<PaymentRouteCategory, string> = {
  fintech: "Fintech Provider",
  platform: "Education Platforms",
  bankCard: "Bank & Card",
};

export const destinationPaymentRoutes = {
  US: {
    fintech:
      "Wise, Revolut (using multi-currency USD account routing numbers to pay via a $0 US ACH eCheck).",
    platform: "Flywire, Convera, Transact International (UCLA).",
    bankCard:
      "International SWIFT Wire, International Visa, Mastercard, or UnionPay (via QuikPAY, USCe.pay, or BruinBill).",
  },
  UK: {
    fintech:
      "Wise, Revolut (converting origin currency to GBP to settle locally via UK Faster Payments).",
    platform: "Flywire (Edinburgh, Manchester), Convera (KCL).",
    bankCard:
      "International SWIFT Wire (direct to the university's UK GBP account), International Visa, Mastercard, or UnionPay (via the university portal).",
  },
  China: {
    fintech:
      "Alipay Global, WeChat Pay (Cross-Border), or Wise (routing to a local Chinese account).",
    platform:
      "EasyTransfer, SkyRemit (specialized cross-border education remittance partners).",
    bankCard:
      "International SWIFT Wire (direct to Bank of China or Agricultural Bank of China), International Visa/Mastercard (via the university finance portal).",
  },
};

export function paymentRouteCategory(
  provider: string,
): PaymentRouteCategory | null {
  if (
    /fintech|wise|revolut|alipay|wechat|provider a|sandbox standard/i.test(
      provider,
    )
  )
    return "fintech";
  if (
    /education|flywire|convera|transact|easytransfer|skyremit|transfermate/i.test(
      provider,
    )
  )
    return "platform";
  if (/bank|swift|card|sandbox express/i.test(provider)) return "bankCard";
  return null;
}

// Preserve stored route keys and quote terms while displaying consistent names.
export function routeProviderName(provider: string): string {
  const category = paymentRouteCategory(provider);
  return category ? paymentRouteNames[category] : provider;
}

export function routeProviderDetails(
  provider: string,
  destination: string,
): string {
  const category = paymentRouteCategory(provider);
  const country =
    destination === "USD" ||
    destination === "United States" ||
    destination === "US"
      ? "US"
      : destination === "CNY" || destination === "China"
        ? "China"
        : "UK";
  return category ? destinationPaymentRoutes[country][category] : provider;
}
