import { comparisonRoute } from "../shared/payment-comparison";
import { WorkspaceCurrencyProvider } from "../src/components/WorkspaceCurrency";
import { convertMoney, currencyRate } from "../shared/currency";
import { countries, universities } from "../shared/study";
import { Wallet } from "../src/pages/Wallet";
import { ExchangeWorkspace } from "../src/pages/dashboard/ExchangeWorkspace";
import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import PaymentWorkspace from "../src/features/payments/PaymentWorkspace";
import "../src/styles/payment-simple.css";
import "../src/styles/typography.css";
import "../src/styles/app-clean.css";
import "../src/styles/experience.css";
import TuitionDecision from "../src/features/payments/TuitionDecision";
import "../src/styles/styles.css";
import "../src/components/ui/ui.css";
import "../src/styles/dark-mode.css";
const observedAt = Date.now();
const currency = new URLSearchParams(location.search).get("currency") ?? "GBP";
const country =
  countries.find((c) => c.currency === currency)?.name ?? "United Kingdom";
const converted = (value: number) => convertMoney(value, "GBP", currency);
function Preview() {
  const [banking, setBanking] = useState({
    paymentAmount: converted(2000),
    currency,
    sourceCurrency: undefined as string | undefined,
    recipient: universities[country][0],
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
            homeCountry={
              new URLSearchParams(location.search).get("home") ?? undefined
            }
            travelCountry={country}
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
            onCompare={async (comparison) =>
              setBanking({
                ...banking,
                paymentAmount: comparison.amount,
                currency: comparison.targetCurrency,
                sourceCurrency: comparison.sourceCurrency,
              })
            }
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
            plan={(comparison) => (
              <WorkspaceCurrencyProvider currency={comparison.targetCurrency}>
                <TuitionDecision
                  banking={{ ...banking, paymentAmount: comparison.amount }}
                  reserveGBP={convertMoney(
                    reserve,
                    currency,
                    comparison.targetCurrency,
                  )}
                  selectedRoute={selected}
                  paymentStatus={status}
                  wallets={[wallet]}
                  routes={[
                    {
                      key: "sandbox-platform",
                      provider: "Education Platforms",
                      fee: 15,
                      sourceCurrency: "USD",
                      targetCurrency: currency,
                      fxRate: 0.772 * currencyRate("GBP", currency),
                      delivery: "2–3 business days",
                      maxBusinessDays: 3,
                      quotedAt: observedAt,
                      quoteExpiresAt: expiresAt,
                    },
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
                  ].map((route) =>
                    comparisonRoute(
                      route,
                      comparison.sourceCurrency,
                      comparison.targetCurrency,
                    ),
                  )}
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
              </WorkspaceCurrencyProvider>
            )}
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
