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
function Preview() {
  const [banking, setBanking] = useState({
    paymentAmount: 2000,
    recipient: "Example UK University",
    recipientAccountLast4: "1842",
    tuitionDeadline: new Date(observedAt + 14 * 86400000)
      .toISOString()
      .slice(0, 10),
    bufferBusinessDays: 1,
  });
  const [reserve, setReserve] = useState(1000);
  const [selected, setSelected] = useState("sandbox-standard");
  const [expiresAt, setExpiresAt] = useState(observedAt + 600000);
  const [status, setStatus] = useState("not_started");
  const [wallet, setWallet] = useState({
    currency: "USD",
    amount: 5000,
    gbpValue: 3870,
  });
  return (
    <div className="app-clean">
      <main style={{ padding: 16, maxWidth: 1600, margin: "auto" }}>
        <PaymentWorkspace
          estimateData={{
            countryFrom: "Cambodia",
            countryTo: "United Kingdom",
            selectedRoute: selected,
            routes: [
              {
                key: "sandbox-standard",
                provider: "Sandbox Standard",
                fee: 8.4,
                fxRate: 0.774,
                delivery: "1–2 business days",
                quoteExpiresAt: expiresAt,
              },
              {
                key: "sandbox-fast",
                provider: "Sandbox Express",
                fee: 26,
                fxRate: 0.77,
                delivery: "Within 1 business day",
                quoteExpiresAt: expiresAt,
              },
            ],
          }}
          amount={banking.paymentAmount}
          recipient={banking.recipient}
          banking={banking}
          balances={<p>Currency balances available.</p>}
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
          activity={<p>No payments yet.</p>}
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
                  fxRate: 0.774,
                  delivery: "1–2 business days",
                  maxBusinessDays: 2,
                  quotedAt: observedAt,
                  quoteExpiresAt: expiresAt,
                },
                {
                  key: "sandbox-fast",
                  provider: "Sandbox Express",
                  fee: 26,
                  fxRate: 0.77,
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
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(<Preview />);
