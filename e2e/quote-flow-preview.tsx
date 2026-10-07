import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import PaymentWorkspace from "../src/PaymentWorkspace";
import TuitionDecision from "../src/TuitionDecision";
import { Payments } from "../src/App";
import { tuitionQuote } from "../convex/tuitionDecision";
import type { PaymentStatus } from "../src/types";
import "../src/styles.css";
import "../src/components/ui/ui.css";
import "../src/payment-simple.css";
import "../src/app-clean.css";
const now = Date.now();
const providers = [
  {
    key: "standard",
    provider: "Standard",
    sourceAmount: 1,
    fee: 8.4,
    fxRate: 0.774,
    delivery: "1–2 business days",
    quotedAt: now,
    quoteExpiresAt: now + 600000,
    maxBusinessDays: 2,
  },
  {
    key: "express",
    provider: "Express",
    sourceAmount: 1,
    fee: 26,
    fxRate: 0.77,
    delivery: "1 business day",
    quotedAt: now,
    quoteExpiresAt: now + 600000,
    maxBusinessDays: 1,
  },
];
function Preview() {
  const [selected, setSelected] = useState("standard");
  const [observations, setObservations] = useState(providers);
  const [status, setStatus] = useState<PaymentStatus>("not_started");
  const [proposal, setProposal] = useState<any>();
  const banking = {
    paymentAmount: 1500.25,
    recipient: "Example University",
    recipientAccountLast4: "1842",
    recipientVerified: true,
    tuitionDeadline: new Date(now + 14 * 86400000).toISOString().slice(0, 10),
    bufferBusinessDays: 1,
  };
  return (
    <div className="app-clean">
      <main style={{ padding: 16, maxWidth: 1600, margin: "auto" }}>
        <PaymentWorkspace
          amount={banking.paymentAmount}
          recipient={banking.recipient}
          paymentStatus={status}
          plan={
            <TuitionDecision
              banking={banking}
              reserveGBP={1000}
              wallets={[{ currency: "USD", amount: 5000, gbpValue: 3870 }]}
              routes={observations}
              selectedRoute={selected}
              paymentStatus={status}
              onSelect={async (key) => {
                setSelected(key);
                return true;
              }}
            />
          }
          review={
            <Payments
              status={status}
              paid={status === "completed"}
              storedRoute={selected}
              storedRoutes={observations}
              config={banking}
              proposal={proposal}
              onSelectRoute={async (key) => {
                setSelected(key);
                return true;
              }}
              prepare={async () => {
                const route = observations.find((r) => r.key === selected)!;
                const quote = tuitionQuote(banking.paymentAmount, route);
                setProposal({
                  ...quote,
                  _id: "preview",
                  provider: route.provider,
                  recipient: banking.recipient,
                  recipientLast4: "1842",
                  fxRate: route.fxRate,
                  delivery: route.delivery,
                  sourceCurrency: "USD",
                  targetCurrency: "GBP",
                  status: "prepared",
                  createdAt: now,
                  expiresAt: now + 600000,
                });
                setStatus("prepared");
                return true;
              }}
              approve={async () => {
                setStatus("approved");
                return true;
              }}
              execute={async () => {
                setStatus("completed");
                return true;
              }}
              reset={async () => {
                setStatus("not_started");
                setProposal(undefined);
                return true;
              }}
            />
          }
        />
        <button
          onClick={() =>
            setObservations(
              providers.map((route) => ({ ...route, fee: 100, fxRate: 0.65 })),
            )
          }
        >
          Change provider observation
        </button>
      </main>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(<Preview />);
