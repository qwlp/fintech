import { WorkspaceCurrencyProvider } from "../src/WorkspaceCurrency";
import { convertMoney, currencyRate } from "../shared/currency";
import { countries } from "../shared/study";
import { Wallet, ExchangeWorkspace } from "../src/App";
import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import PaymentWorkspace from "../src/PaymentWorkspace";
import "../src/payment-simple.css";
import "../src/typography.css";
import "../src/app-clean.css";
import "../src/experience.css";
import TuitionDecision from "../src/TuitionDecision";
import "../src/styles.css";
import "../src/components/ui/ui.css";
import "../src/dark-mode.css";
const observedAt = Date.now();
const currency = new URLSearchParams(location.search).get("currency") ?? "GBP";
const country =
  countries.find((c) => c.currency === currency)?.name ?? "United Kingdom";
const converted = (value: number) => convertMoney(value, "GBP", currency);
function Preview() {
  const [banking, setBanking] = useState({
    paymentAmount: converted(2000),
    recipient: "Example UK University",
    recipientAccountLast4: "1842",
    tuitionDeadline: new Date(observedAt + 14 * 86400000)
      .toISOString()
      .slice(0, 10),
    bufferBusinessDays: 1,
  });
  const [reserve, setReserve] = useState(converted(1000));
  const [selected, setSelected] = useState("sandbox-standard");
  const [expiresAt, setExpiresAt] = useState(observedAt + 600000);
  const [status, setStatus] = useState("not_started");
  const [wallet, setWallet] = useState({
    currency: "USD",
    amount: 5000,
    gbpValue: 3870,
  });
  return (
    <WorkspaceCurrencyProvider currency={currency}>
      <div className="app-clean">
        <main style={{ padding: 16, maxWidth: 1600, margin: "auto" }}>
          <PaymentWorkspace
            amount={banking.paymentAmount}
            recipient={banking.recipient}
            banking={banking}
            balances={
              <Wallet
                storedWallets={[
                  { ...wallet, symbol: "$", label: "Sandbox balance" },
                ]}
                go={() => {}}
              />
            }
            exchange={<p>Exchange estimates available.</p>}
            onEdit={async (details) =>
              setBanking({
                ...banking,
                paymentAmount: details.amount,
                recipient: details.recipient,
                recipientAccountLast4: details.last4,
              })
            }
            paymentStatus={status}
            review={<p>Review your saved proposal before approving.</p>}
            plan={
              <TuitionDecision
                banking={banking}
                reserveGBP={reserve}
                selectedRoute={selected}
                paymentStatus={status}
                wallets={[wallet]}
                routes={[
                  {
                    key: "sandbox-standard",
                    provider: "Sandbox Standard",
                    fee: 8.4,
                    sourceCurrency: "USD",
                    targetCurrency: currency,
                    fxRate: 0.774 * currencyRate("GBP", currency),
                    delivery: "1–2 business days",
                    maxBusinessDays: 2,
                    quotedAt: observedAt,
                    quoteExpiresAt: expiresAt,
                  },
                  {
                    key: "swift",
                    provider: "Bank SWIFT",
                    fee: 34,
                    sourceCurrency: "USD",
                    targetCurrency: currency,
                    fxRate: 0.768 * currencyRate("GBP", currency),
                    delivery: "3–5 business days",
                    maxBusinessDays: 5,
                    quotedAt: observedAt,
                    quoteExpiresAt: expiresAt,
                  },
                  {
                    key: "sandbox-fast",
                    provider: "Sandbox Express",
                    fee: 26,
                    sourceCurrency: "USD",
                    targetCurrency: currency,
                    fxRate: 0.77 * currencyRate("GBP", currency),
                    delivery: "Within 1 business day",
                    maxBusinessDays: 1,
                    quotedAt: observedAt,
                    quoteExpiresAt: expiresAt,
                  },
                ]}
                onSave={async (plan) => {
                  setBanking({
                    ...banking,
                    tuitionDeadline: plan.deadline,
                    bufferBusinessDays: plan.bufferBusinessDays,
                  });
                  setReserve(plan.protectedReserveGBP);
                }}
                onSelect={async (key) => {
                  setSelected(key);
                  return true;
                }}
                onRefresh={async () => {
                  setExpiresAt(Date.now() + 600000);
                }}
              />
            }
          />
          <button
            onClick={() =>
              setWallet({ currency: "USD", amount: 2000, gbpValue: 1548 })
            }
          >
            Simulate funding shortfall
          </button>
          <button onClick={() => setExpiresAt(Date.now() - 1)}>
            Expire quotes
          </button>
          <button onClick={() => setStatus("prepared")}>Lock proposal</button>
        </main>
      </div>
    </WorkspaceCurrencyProvider>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(<Preview />);
