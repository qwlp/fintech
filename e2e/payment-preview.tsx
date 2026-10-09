import React from "react";
import ReactDOM from "react-dom/client";
import { Security } from "../src/App";
import "../src/app-clean.css";
import "../src/dark-mode.css";
import PaymentEvidence from "../src/PaymentEvidence";
import "../src/styles.css";
import "../src/components/ui/ui.css";
const pendingRecipient =
  new URLSearchParams(location.search).get("recipient") === "pending";
const proposal = {
  _id: "proposal-demo",
  recipient: "University of Manchester",
  recipientLast4: "1842",
  provider: "Sandbox Standard",
  amountMinor: 200000,
  totalMinor: 259238,
  feeMinor: 840,
  fxRate: 0.774,
  sourceCurrency: "USD",
  targetCurrency: "GBP",
  status: "completed",
  expiresAt: Date.now(),
  createdAt: Date.now(),
  reference: "SBX-PREVIEW-ONLY",
};
const ledger = {
  reference: proposal.reference,
  currency: "USD",
  debitMinor: proposal.totalMinor,
  beforeMinor: 500000,
  afterMinor: 240762,
  recipient: proposal.recipient,
  receivedMinor: 200000,
  receivedCurrency: "GBP",
  timestamp: Date.now(),
};
ReactDOM.createRoot(document.getElementById("root")!).render(
  <main className="app-clean" style={{ padding: 20 }}>
    <Security
      config={{
        approvalRequired: true,
        paymentLimit: 2500,
        approvalExpiryMinutes: 10,
      }}
      audit={Array.from({ length: 7 }, (_, index) => ({
        id: `event-${index}`,
        type: index % 2 ? "PAYMENT_PREPARED" : "PROFILE_UPDATED",
        detail:
          index % 2
            ? "Sandbox proposal prepared for owner review"
            : "Study profile saved",
        actor: "Student",
        timestamp: "9 Oct 2026, 10:00",
      }))}
      receipts={
        <PaymentEvidence
          banking={{
            recipientVerified: !pendingRecipient,
            recipientAccountLast4: "1842",
          }}
          proposals={pendingRecipient ? [] : [proposal]}
          ledger={pendingRecipient ? [] : [ledger]}
          audit={[]}
        />
      }
    />
  </main>,
);
