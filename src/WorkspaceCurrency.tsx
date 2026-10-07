import { createContext, useContext, type ReactNode } from "react";
import { formatCurrency } from "../shared/currency";
const CurrencyContext = createContext("GBP");
export function WorkspaceCurrencyProvider({
  currency,
  children,
}: {
  currency: string;
  children: ReactNode;
}) {
  return (
    <CurrencyContext.Provider value={currency}>
      {children}
    </CurrencyContext.Provider>
  );
}
export const useWorkspaceCurrency = () => useContext(CurrencyContext);
export function useWorkspaceMoney() {
  const currency = useWorkspaceCurrency();
  return (value: number, decimals = 0) =>
    formatCurrency(value, currency, decimals);
}
