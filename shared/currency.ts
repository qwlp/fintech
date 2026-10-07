import { getCountry } from "./study";

// Fixed illustrative sandbox valuations, not live exchange rates. GBP is the
// reference for legacy wallet valuations; wallet balances keep their own currency.
export const sandboxUnitsPerGBP: Record<string, number> = {
  GBP: 1,
  USD: 1 / 0.774,
  AUD: 1.95,
  CAD: 1.75,
  EUR: 1.17,
  CNY: 9.2,
  KHR: 5200,
};
export const sandboxRouteGBPPerUSD: Record<string, number> = {
  wise: 0.774,
  swift: 0.768,
  card: 0.77,
  "sandbox-standard": 0.774,
  "sandbox-bank": 0.768,
  "sandbox-fast": 0.77,
};
export const studyCurrency = (country: string = "") =>
  getCountry(country)?.currency ?? "GBP";
export function currencyRate(from: string, to: string) {
  if (!(from in sandboxUnitsPerGBP) || !(to in sandboxUnitsPerGBP))
    throw new Error("Unsupported currency");
  return sandboxUnitsPerGBP[to] / sandboxUnitsPerGBP[from];
}
export const convertMoney = (value: number, from: string, to: string) =>
  Math.round(value * currencyRate(from, to) * 100) / 100;
export const walletValue = (
  wallet: { currency: string; amount: number; gbpValue: number },
  currency: string,
) =>
  wallet.currency === currency
    ? wallet.amount
    : wallet.gbpValue * currencyRate("GBP", currency);
export const formatCurrency = (value: number, currency: string, decimals = 0) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
export function convertMoneyText(text: string, from: string, to: string) {
  if (from === to) return text;
  return text
    .replace(
      /£([\d,]+(?:\.\d+)?)(?:–([\d,]+(?:\.\d+)?))?/g,
      (_match, low: string, high?: string) => {
        const amount = (value: string) =>
          formatCurrency(
            convertMoney(Number(value.replaceAll(",", "")), from, to),
            to,
          );
        return high ? `${amount(low)}–${amount(high)}` : amount(low);
      },
    )
    .replaceAll("GBP", to);
}
