import { useWorkspaceCurrency } from "./WorkspaceCurrency";
import { convertMoney, formatCurrency } from "../shared/currency";
import { useState } from "react";
import { convexApi, convexClient } from "./lib/convex";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import "./tuition-decision.css";

type Proposal = {
  _id: string;
  recipient: string;
  recipientLast4: string;
  provider: string;
  amountMinor: number;
  totalMinor: number;
  feeMinor: number;
  fxRate: number;
  sourceCurrency: string;
  targetCurrency: string;
  status: string;
  expiresAt: number;
  createdAt: number;
  protectedReserveMinor?: number;
  remainingGBPMinor?: number;
  reference?: string;
  deadline?: string;
  bufferBusinessDays?: number;
};
type Ledger = {
  reference: string;
  currency: string;
  debitMinor: number;
  beforeMinor: number;
  afterMinor: number;
  recipient: string;
  receivedMinor: number;
  receivedCurrency: string;
  timestamp: number;
};
export default function PaymentEvidence({
  accountId,
  banking,
  proposals,
  ledger,
  audit,
  tools = [],
}: {
  accountId?: string;
  banking?: { recipientVerified?: boolean; recipientAccountLast4?: string };
  proposals: Proposal[];
  ledger: Ledger[];
  audit: unknown[];
  tools?: {
    name: string;
    arguments: unknown;
    result: unknown;
    timestamp: number;
  }[];
}) {
  const currency = useWorkspaceCurrency();
  const [last4, setLast4] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const current = proposals
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  const run = async (verify: boolean) => {
    if (!convexClient || !accountId || pending) return;
    setPending(true);
    setError("");
    try {
      if (verify)
        await convexClient.mutation(convexApi.verifySandboxRecipient, {
          accountId: accountId as any,
          last4,
        });
      else
        await convexClient.mutation(convexApi.initializePaymentSandbox, {
          accountId: accountId as any,
        });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message.replace(/\[.*?\]/g, "")
          : "Could not update sandbox",
      );
    } finally {
      setPending(false);
    }
  };
  const download = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            application: "MoveWise",
            sandbox: true,
            exportedAt: new Date().toISOString(),
            proposals,
            ledger,
            audit,
            toolExecutions: tools,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = "movewise-sandbox-evidence.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="payment-evidence">
      <p className="payment-sandbox-note">Sandbox · No real funds move.</p>
      <details open={!banking || !banking.recipientVerified}>
        <summary>{!banking ? "Set up a sample payment" : !banking.recipientVerified ? "Confirm your recipient" : "Payment activity & receipts"}</summary>
        <div className="payment-evidence-content">
        {!banking ? (
          <>
            <p>
              Load a {formatCurrency(convertMoney(2000, "GBP", currency), currency)} tuition scenario with a simulated US$5,000 wallet.
              Your study plan stays separate.
            </p>
            <Button
              disabled={pending || !accountId}
              onClick={() => void run(false)}
            >
              Load payment sandbox
            </Button>
          </>
        ) : !banking.recipientVerified ? (
          <>
            <p>
              Enter the account suffix{" "}
              <strong>{banking.recipientAccountLast4}</strong> to confirm the recipient.
            </p>
            <Input
              aria-label="Confirm recipient last four digits"
              value={last4}
              maxLength={4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, ""))}
            />
            <Button
              disabled={pending || last4.length !== 4}
              onClick={() => void run(true)}
            >
              Confirm sandbox recipient
            </Button>
          </>
        ) : (
          <p>
            Recipient verified.
          </p>
        )}
        {!current && banking?.recipientVerified && <p className="receipt-empty">No payment receipts yet.</p>}
        {current && (
          <div role="status" style={{ overflowWrap: "anywhere" }}>
            <p>
              <strong>{current.status.toUpperCase()}</strong> ·{" "}
              {current.provider} · {current.recipient} · account ending{" "}
              {current.recipientLast4}
            </p>
            <p>
              Recipient receives {formatCurrency(current.amountMinor / 100, current.targetCurrency, 2)}.
              Total {formatCurrency(current.totalMinor / 100, current.sourceCurrency, 2)}, including {formatCurrency(current.feeMinor / 100, current.sourceCurrency, 2)} fee.
            </p>
            {current.remainingGBPMinor !== undefined && (
              <p>
                Estimated funds after payment: {formatCurrency(current.remainingGBPMinor / 100, current.targetCurrency, 2)}. Protected
                living-cost reserve: {formatCurrency((current.protectedReserveMinor ?? 0) / 100, current.targetCurrency, 2)}.
              </p>
            )}
            <p>
              {current.reference
                ? `Receipt: ${current.reference}`
                : `Quote expires ${new Date(current.expiresAt).toLocaleTimeString()}. Approval covers this exact proposal.`}
            </p>
            {current.deadline && (
              <p>
                Tuition deadline: {current.deadline} (UTC date). Safety buffer:{" "}
                {current.bufferBusinessDays ?? 1} business day(s). These terms
                belong to this proposal.
              </p>
            )}
          </div>
        )}
        {ledger.map((entry) => (
          <p key={entry.reference} style={{ overflowWrap: "anywhere" }}>
            {entry.reference}: {entry.currency}{" "}
            {(entry.beforeMinor / 100).toFixed(2)} →{" "}
            {(entry.afterMinor / 100).toFixed(2)} after a{" "}
            {(entry.debitMinor / 100).toFixed(2)} debit.
          </p>
        ))}
        <Button
          variant="outline"
          onClick={download}
          disabled={!proposals.length}
        >
          Download execution evidence
        </Button>
        {tools.length > 0 && (
          <details style={{ marginTop: 16 }}>
            <summary>
              Agent calculation evidence ({tools.length} recent tool calls)
            </summary>
            <p>
              These are recorded tool results. Review the calculation separately
              from the AI’s explanation. Your export includes this financial
              information.
            </p>
            {tools.map((tool, index) => (
              <details key={`${tool.timestamp}-${index}`}>
                <summary>
                  {tool.name} · {new Date(tool.timestamp).toLocaleString()}
                </summary>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    fontSize: 12,
                  }}
                >
                  {JSON.stringify(
                    { arguments: tool.arguments, result: tool.result },
                    null,
                    2,
                  )}
                </pre>
              </details>
            ))}
          </details>
        )}
        {error && <p role="alert">{error}</p>}
        </div>
      </details>
    </section>
  );
}
