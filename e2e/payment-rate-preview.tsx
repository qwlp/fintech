import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import TuitionDecision from "../src/features/payments/TuitionDecision";
import { WorkspaceCurrencyProvider } from "../src/components/WorkspaceCurrency";
import "../src/styles/styles.css";
import "../src/styles/app-clean.css";
import "../src/styles/payment-focused.css";
import "../src/components/ui/ui.css";
const now = Date.now();
const today = new Date(now).toISOString().slice(0, 10);
const previous = new Date(now - 86400000).toISOString().slice(0, 10);
function Preview() {
  const [rate, setRate] = useState(1.3241);
  return (
    <WorkspaceCurrencyProvider currency="USD">
      <main className="app-clean" style={{ padding: 16 }}>
        <section className="payment-workspace payment-focused">
          <TuitionDecision
            banking={{
              paymentAmount: 50000,
              tuitionDeadline: new Date(now + 30 * 86400000)
                .toISOString()
                .slice(0, 10),
              marketRates: [
                { base: "GBP", quote: "USD", date: previous, rate: 1.33 },
                { base: "GBP", quote: "USD", date: today, rate },
              ],
            }}
            reserveGBP={0}
            wallets={[]}
            paymentStatus="not_started"
            onRefresh={async () => setRate(1.35)}
            routes={[
              {
                key: "sandbox-standard",
                provider: "Fintech Provider",
                fee: 8.5,
                delivery: "1–2 business days",
                maxBusinessDays: 2,
              },
              {
                key: "sandbox-platform",
                provider: "Education Platforms",
                fee: 11.61,
                delivery: "2–3 business days",
                maxBusinessDays: 3,
              },
              {
                key: "sandbox-bank",
                provider: "Bank & Card",
                fee: 26.32,
                delivery: "3–5 business days",
                maxBusinessDays: 5,
              },
            ].map((route) => ({
              ...route,
              sourceCurrency: "GBP",
              targetCurrency: "USD",
              fxRate: rate,
              quotedAt: now,
              quoteExpiresAt: now + 600000,
            }))}
          />
        </section>
      </main>
    </WorkspaceCurrencyProvider>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(<Preview />);
