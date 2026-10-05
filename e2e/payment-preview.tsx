import React from "react";
import ReactDOM from "react-dom/client";
import PaymentEvidence from "../src/PaymentEvidence";
import "../src/styles.css";
import "../src/components/ui/ui.css";
const proposal = {
  _id: "proposal-demo",
  recipient: "Example UK University",
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
  <main style={{ padding: 20 }}>
    <PaymentEvidence
      banking={{ recipientVerified: true }}
      proposals={[proposal]}
      ledger={[ledger]}
      audit={[]}
    />
  </main>,
);
