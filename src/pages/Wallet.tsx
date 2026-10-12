import { useState } from "react";
import { ChevronRight, CircleDollarSign } from "lucide-react";
import { formatCurrency, walletValue } from "../../shared/currency";
import { useWorkspaceCurrency, useWorkspaceMoney } from "../WorkspaceCurrency";
import InfoHelp from "../InfoHelp";
import { wallets as fallbackWallets } from "../data";
import type { DatabaseState, Page } from "../types/database";

export function Wallet({
  storedWallets,
  go,
}: {
  storedWallets?: DatabaseState["wallets"];
  go: (page: Page) => void;
}) {
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();

  const [detailsOpen, setDetailsOpen] = useState(false);
  const visibleWallets = storedWallets ?? fallbackWallets;
  const totalValue = visibleWallets.reduce(
    (sum, wallet) => sum + walletValue(wallet, currency),
    0,
  );
  const usdBalance = visibleWallets
    .filter((wallet) => wallet.currency === "USD")
    .reduce((sum, wallet) => sum + walletValue(wallet, currency), 0);

  return (
    <div className="page-stack balance-workspace">
      <section className="page-intro">
        <h2>Your balances</h2>
        <button className="primary" onClick={() => go("Exchange")}>
          <CircleDollarSign size={16} /> Convert currency
        </button>
      </section>
      <section className="balance-total">
        <span>Total in {currency}</span>
        <strong>{formatMoney(totalValue)}</strong>
        <small>Converted values use demo rates.</small>
      </section>
      <section className="balance-accounts" aria-label="Currency accounts">
        <div className="balance-table-head">
          <span>Account</span>
          <span>Balance</span>
          <span>{currency} equivalent</span>
        </div>
        {visibleWallets.map((wallet) => (
          <div className="balance-account-row" key={wallet.currency}>
            <div>
              <strong>{wallet.currency}</strong>
              <span>{wallet.label}</span>
            </div>
            <strong>{formatCurrency(wallet.amount, wallet.currency, 2)}</strong>
            <span>
              {formatMoney(walletValue(wallet, currency))}
              <small className="balance-rate">
                {wallet.amount > 0
                  ? `1 ${wallet.currency} ≈ ${(walletValue(wallet, currency) / wallet.amount).toFixed(4)} ${currency}`
                  : "Rate unavailable"}{" "}
                <InfoHelp term="Balance valuation" />
              </small>
            </span>
          </div>
        ))}
        {visibleWallets.length === 0 && <p>No currency accounts yet.</p>}
      </section>
      <button
        className="disclosure-button"
        aria-expanded={detailsOpen}
        onClick={() => setDetailsOpen((open) => !open)}
      >
        {detailsOpen ? "Hide currency analysis" : "View currency analysis"}
        <ChevronRight size={16} />
      </button>
      {detailsOpen && (
        <section className="balance-analysis">
          <h3>Currency exposure</h3>
          <dl>
            {visibleWallets.map((wallet) => (
              <div key={wallet.currency}>
                <dt>{wallet.currency}</dt>
                <dd>
                  {totalValue
                    ? ((wallet.gbpValue / totalValue) * 100).toFixed(1)
                    : "0"}
                  % of total
                </dd>
              </div>
            ))}
          </dl>
          <p>
            A 5% fall in USD against {currency} would reduce the value of your
            current USD balance by approximately {formatMoney(usdBalance * 0.05)}.
          </p>
        </section>
      )}
    </div>
  );
}
