import { useWorkspaceCurrency } from "./WorkspaceCurrency";
import { convertMoney, formatCurrency } from "../shared/currency";
import { useState } from "react";
import {
  ShieldCheck,
  UserRound,
  ReceiptText,
  Download,
  Check,
  Clock,
  ChevronRight,
  Calculator,
  Play,
} from "lucide-react";
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
      <div className="evidence-recipient">
        <div className="evidence-section-heading">
          <h3>
            <UserRound size={18} aria-hidden="true" />
            Recipient
          </h3>
          <span
            className={`evidence-badge ${banking?.recipientVerified ? "confirmed" : ""}`}
          >
            {banking?.recipientVerified ? (
              <>
                <ShieldCheck size={14} aria-hidden="true" />
                Confirmed
              </>
            ) : (
              <>
                <Clock size={14} aria-hidden="true" />
                {banking ? "Pending" : "Not set up"}
              </>
            )}
          </span>
        </div>
        {!banking ? (
          <div className="evidence-setup">
            <span>
              Sample tuition ·{" "}
              {formatCurrency(convertMoney(2000, "GBP", currency), currency)}
            </span>
            <Button
              disabled={pending || !accountId}
              onClick={() => void run(false)}
            >
              <Play size={15} aria-hidden="true" />
              Load payment sandbox
            </Button>
          </div>
        ) : !banking.recipientVerified ? (
          <form
            className="evidence-confirm-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (last4.length === 4) void run(true);
            }}
          >
            <label htmlFor="recipient-last-four">
              Match account ending{" "}
              <strong>{banking.recipientAccountLast4 ?? "—"}</strong>
            </label>
            <div className="evidence-confirm-controls">
              <Input
                id="recipient-last-four"
                aria-label="Confirm recipient last four digits"
                inputMode="numeric"
                autoComplete="off"
                placeholder="4 digits"
                value={last4}
                maxLength={4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, ""))}
              />
              <Button
                type="submit"
                aria-label="Confirm sandbox recipient"
                disabled={pending || !accountId || last4.length !== 4}
              >
                <Check size={15} aria-hidden="true" />
                {pending ? "Confirming…" : "Confirm"}
              </Button>
            </div>
          </form>
        ) : (
          <p className="evidence-recipient-note">
            {banking.recipientAccountLast4
              ? `Account ending ${banking.recipientAccountLast4} · `
              : ""}
            Owner-confirmed sample recipient
          </p>
        )}
        {error && (
          <p role="alert" className="evidence-error">
            {error}
          </p>
        )}
      </div>
      <div className="evidence-receipts">
        <div className="evidence-section-heading">
          <h3>
            <ReceiptText size={18} aria-hidden="true" />
            Receipts
          </h3>
          {(proposals.length > 0 || ledger.length > 0 || tools.length > 0) && (
            <Button
              variant="outline"
              size="sm"
              aria-label="Download execution evidence"
              onClick={download}
            >
              <Download size={15} aria-hidden="true" />
              Export
            </Button>
          )}
        </div>
        {current ? (
          <details className="evidence-receipt-details">
            <summary>
              <ReceiptText size={16} aria-hidden="true" />
              <span>Payment activity &amp; receipts</span>
              <span className="evidence-badge">{current.status}</span>
              <ChevronRight size={15} aria-hidden="true" />
            </summary>
            <div className="payment-evidence-content" role="status">
              <div className="evidence-payment-title">
                <strong>{current.recipient}</strong>
                <span>
                  {current.provider} · •••• {current.recipientLast4}
                </span>
              </div>
              <dl className="evidence-payment-facts">
                <div>
                  <dt>Recipient receives</dt>
                  <dd>
                    {formatCurrency(
                      current.amountMinor / 100,
                      current.targetCurrency,
                      2,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Total debit</dt>
                  <dd>
                    {formatCurrency(
                      current.totalMinor / 100,
                      current.sourceCurrency,
                      2,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Fee</dt>
                  <dd>
                    {formatCurrency(
                      current.feeMinor / 100,
                      current.sourceCurrency,
                      2,
                    )}
                  </dd>
                </div>
                {current.remainingGBPMinor !== undefined && (
                  <>
                    <div>
                      <dt>Funds after payment</dt>
                      <dd>
                        {formatCurrency(
                          current.remainingGBPMinor / 100,
                          current.targetCurrency,
                          2,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Protected reserve</dt>
                      <dd>
                        {formatCurrency(
                          (current.protectedReserveMinor ?? 0) / 100,
                          current.targetCurrency,
                          2,
                        )}
                      </dd>
                    </div>
                  </>
                )}
                <div>
                  <dt>{current.reference ? "Reference" : "Quote expires"}</dt>
                  <dd>
                    {current.reference ??
                      new Date(current.expiresAt).toLocaleTimeString()}
                  </dd>
                </div>
                {current.deadline && (
                  <>
                    <div>
                      <dt>Deadline (UTC)</dt>
                      <dd>{current.deadline}</dd>
                    </div>
                    <div>
                      <dt>Safety buffer</dt>
                      <dd>{current.bufferBusinessDays ?? 1} business day(s)</dd>
                    </div>
                  </>
                )}
              </dl>
              {ledger.map((entry) => (
                <div className="evidence-ledger" key={entry.reference}>
                  <small>{entry.reference}</small>
                  <span>
                    {entry.currency} {(entry.beforeMinor / 100).toFixed(2)} →{" "}
                    {(entry.afterMinor / 100).toFixed(2)}
                  </span>
                  <small>
                    Debit ·{" "}
                    {formatCurrency(entry.debitMinor / 100, entry.currency, 2)}
                  </small>
                </div>
              ))}
            </div>
          </details>
        ) : (
          <p className="security-empty receipt-empty">
            No payment receipts yet.
          </p>
        )}
      </div>
      {tools.length > 0 && (
        <details className="evidence-tools">
          <summary>
            <Calculator size={16} aria-hidden="true" />
            Agent calculations
            <span className="evidence-badge">{tools.length}</span>
            <ChevronRight size={15} aria-hidden="true" />
          </summary>
          <div className="payment-evidence-content">
            {tools.map((tool, index) => (
              <details
                className="evidence-tool"
                key={`${tool.timestamp}-${index}`}
              >
                <summary>
                  {tool.name.replaceAll("_", " ")}
                  <small>{new Date(tool.timestamp).toLocaleString()}</small>
                </summary>
                <pre>
                  {JSON.stringify(
                    { arguments: tool.arguments, result: tool.result },
                    null,
                    2,
                  )}
                </pre>
              </details>
            ))}
          </div>
        </details>
      )}
      <p className="payment-sandbox-note">Sandbox · No real funds move.</p>
    </section>
  );
}
