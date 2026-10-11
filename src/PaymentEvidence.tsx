import { routeProviderName } from "../shared/payment-routes";
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
  Play,
} from "lucide-react";
import { convexApi, convexClient } from "./lib/convex";
import { Button } from "./components/ui/button";
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
  banking?: {
    recipientVerified?: boolean;
    recipientAccountLast4?: string;
    recipient?: string;
  };
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
          last4: banking?.recipientAccountLast4 ?? "",
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
            University account
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
                {banking ? "Needs confirmation" : "Not set up"}
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
              Set up demo payment
            </Button>
          </div>
        ) : !banking.recipientVerified ? (
          <div className="evidence-confirm-form">
            <div className="evidence-destination-copy">
              <strong>
                {banking.recipient || current?.recipient || "Your university"}
              </strong>
              <p>Confirm this is the university you want to pay.</p>
            </div>
            <Button
              aria-label="Confirm university account"
              disabled={
                pending ||
                !accountId ||
                !/^\d{4}$/.test(banking.recipientAccountLast4 ?? "")
              }
              onClick={() => void run(true)}
            >
              <Check size={15} aria-hidden="true" />
              {pending ? "Confirming…" : "Confirm university account"}
            </Button>
          </div>
        ) : (
          <p className="evidence-recipient-note">
            {banking.recipient || current?.recipient || "University account"} ·
            Confirmed by you
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
            Payment details
          </h3>
          {(proposals.length > 0 || ledger.length > 0 || tools.length > 0) && (
            <Button
              variant="outline"
              size="sm"
              aria-label="Download payment history"
              onClick={download}
            >
              <Download size={15} aria-hidden="true" />
              Download
            </Button>
          )}
        </div>
        {current ? (
          <details className="evidence-receipt-details">
            <summary>
              <ReceiptText size={16} aria-hidden="true" />
              <span>View latest payment</span>
              <span className="evidence-badge">
                {(
                  {
                    completed: "Complete",
                    prepared: "Ready to review",
                    approved: "Approved",
                    processing: "Sending",
                    failed: "Unsuccessful",
                    expired: "Needs a new price",
                  } as Record<string, string>
                )[current.status] ?? "In progress"}
              </span>
              <ChevronRight size={15} aria-hidden="true" />
            </summary>
            <div className="payment-evidence-content" role="status">
              <div className="evidence-payment-title">
                <strong>{current.recipient}</strong>
                <span>
                  {routeProviderName(current.provider)} · ••••{" "}
                  {current.recipientLast4}
                </span>
              </div>
              <dl className="evidence-payment-facts">
                <div>
                  <dt>University receives</dt>
                  <dd>
                    {formatCurrency(
                      current.amountMinor / 100,
                      current.targetCurrency,
                      2,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Total you pay</dt>
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
                      <dt>Money kept for living costs</dt>
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
                  <dt>
                    {current.reference ? "Reference" : "Price valid until"}
                  </dt>
                  <dd>
                    {current.reference ??
                      new Date(current.expiresAt).toLocaleTimeString()}
                  </dd>
                </div>
                {current.deadline && (
                  <>
                    <div>
                      <dt>Payment deadline</dt>
                      <dd>{current.deadline}</dd>
                    </div>
                    <div>
                      <dt>Extra time for processing</dt>
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
                    Paid ·{" "}
                    {formatCurrency(entry.debitMinor / 100, entry.currency, 2)}
                  </small>
                </div>
              ))}
            </div>
          </details>
        ) : (
          <p className="security-empty receipt-empty">
            No payments yet. Your payment details will appear here.
          </p>
        )}
      </div>
      <p className="payment-sandbox-note">Demo only · No real money moves.</p>
    </section>
  );
}
