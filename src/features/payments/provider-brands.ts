import { paymentRouteCategory } from "../../../shared/payment-routes";

type ProviderBrand = { id: string; name: string };
const brands: Record<string, ProviderBrand> = {
  wise: { id: "wise", name: "Wise" },
  revolut: { id: "revolut", name: "Revolut" },
  alipay: { id: "alipay", name: "Alipay" },
  wechat: { id: "wechat", name: "WeChat Pay" },
  flywire: { id: "flywire", name: "Flywire" },
  convera: { id: "convera", name: "Convera" },
  transact: { id: "transact", name: "Transact" },
  easytransfer: { id: "easytransfer", name: "EasyTransfer" },
  skyremit: { id: "skyremit", name: "SkyRemit" },
  swift: { id: "swift", name: "SWIFT" },
  visa: { id: "visa", name: "Visa" },
  mastercard: { id: "mastercard", name: "Mastercard" },
  unionpay: { id: "unionpay", name: "UnionPay" },
};

export function providerBrands(
  provider: string,
  destination: string,
): ProviderBrand[] {
  const china = ["CNY", "China"].includes(destination);
  const us = ["USD", "US", "United States"].includes(destination);
  const category = paymentRouteCategory(provider);
  const ids =
    category === "fintech"
      ? china
        ? ["alipay", "wechat", "wise"]
        : ["wise", "revolut"]
      : category === "platform"
        ? china
          ? ["easytransfer", "skyremit"]
          : us
            ? ["flywire", "convera", "transact"]
            : ["flywire", "convera"]
        : category === "bankCard"
          ? china
            ? ["swift", "visa", "mastercard"]
            : ["swift", "visa", "mastercard", "unionpay"]
          : [];
  return ids.map((id) => brands[id]);
}
