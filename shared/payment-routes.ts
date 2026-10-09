// Keep legacy sandbox records readable without changing their keys or quote terms.
export function routeProviderName(provider: string): string {
  const names: Record<string, string> = {
    "Provider A": "Wise",
    "Sandbox Standard": "Wise",
    "Bank SWIFT": "SWIFT bank transfer",
    "Sandbox Bank": "SWIFT bank transfer",
    "International card": "Debit / credit card",
    "Sandbox Express": "Debit / credit card",
  };
  return names[provider] ?? provider;
}
