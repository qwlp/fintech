import { useEffect, useState, type ReactNode } from "react";
import {
  Landmark,
  GraduationCap,
  WalletCards,
  ArrowLeftRight,
  ReceiptText,
  Calculator,
  Pencil,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import PaymentEstimate, { type EstimateData } from "./PaymentEstimate";
import { convexApi, convexClient } from "./lib/convex";
import "./tuition-decision.css";
import "./brief.css";
import "./payment-compact.css";
export default function PaymentWorkspace({
  plan,
  review,
  activity,
  balances,
  exchange,
  amount,
  recipient,
  paymentStatus,
  accountId,
  banking,
  initialView = "tuition",
  onEdit,
  estimateData,
}: {
  estimateData?: EstimateData;
  plan: ReactNode;
  review: ReactNode;
  activity: ReactNode;
  balances?: ReactNode;
  exchange?: ReactNode;
  amount?: number;
  recipient?: string;
  paymentStatus: string;
  accountId?: string;
  banking?: { recipientAccountLast4?: string };
  initialView?: string;
  onEdit?: (details: {
    amount: number;
    recipient: string;
    last4: string;
  }) => Promise<void>;
}) {
  const [view, setView] = useState(initialView);
  const [reviewing, setReviewing] = useState(paymentStatus !== "not_started");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    amount: String(amount ?? ""),
    recipient: recipient ?? "",
    last4: banking?.recipientAccountLast4 ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => setView(initialView), [initialView]);
  const locked = paymentStatus !== "not_started";
  useEffect(() => {
    if (locked) setReviewing(true);
  }, [locked]);
  return (
    <section className="payment-workspace">
      <div className="payment-workspace-heading">
        <div className="payment-workspace-title">
          <span className="tuition-heading-icon">
            <GraduationCap size={24} />
          </span>
          <div>
            <h1>Payments</h1>
          </div>
        </div>
        <span className="payment-workspace-sandbox">
          <ShieldCheck size={14} /> Sandbox · No real funds
        </span>
      </div>
      <Tabs value={view} onValueChange={setView}>
        <TabsList
          className="payment-workspace-tabs"
          aria-label="Payment sections"
        >
          <TabsTrigger value="tuition">
            <GraduationCap size={16} /> Tuition
          </TabsTrigger>
          {balances && (
            <TabsTrigger value="balances">
              <WalletCards size={16} /> Balances
            </TabsTrigger>
          )}
          {exchange && (
            <TabsTrigger value="exchange">
              <ArrowLeftRight size={16} /> Exchange
            </TabsTrigger>
          )}
          <TabsTrigger value="activity">
            <ReceiptText size={16} /> Receipts
          </TabsTrigger>
          <TabsTrigger value="estimate">
            <Calculator size={16} /> Calculator
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tuition">
          {amount !== undefined && !reviewing && (
            <div className="payment-workspace-summary">
              <div>
                <span>
                  <GraduationCap size={15} /> Tuition · GBP
                </span>
                <strong>
                  {new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency: "GBP",
                  }).format(amount)}
                </strong>
              </div>
              <div>
                <span>
                  <Landmark size={15} /> Recipient
                </span>
                <strong>{recipient || "Not set"}</strong>
              </div>

              <Button
                variant="outline"
                aria-label="Edit tuition details"
                disabled={locked || busy}
                onClick={() => {
                  setDraft({
                    amount: String(amount),
                    recipient: recipient ?? "",
                    last4: banking?.recipientAccountLast4 ?? "",
                  });
                  setEditing(true);
                  setMessage("");
                }}
              >
                <Pencil size={15} /> Edit
              </Button>
            </div>
          )}
          {editing && (
            <form
              className="brief-edit-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setMessage("");
                try {
                  const details = {
                    amount: Number(draft.amount),
                    recipient: draft.recipient.trim(),
                    last4: draft.last4,
                  };
                  if (
                    !Number.isFinite(details.amount) ||
                    details.amount <= 0 ||
                    !details.recipient ||
                    !/^\d{4}$/.test(details.last4)
                  )
                    throw new Error(
                      "Enter a positive amount, recipient and four account digits.",
                    );
                  if (onEdit) await onEdit(details);
                  else {
                    if (!convexClient || !accountId)
                      throw new Error("Sign in to save payment details.");
                    await convexClient.mutation(
                      convexApi.updatePaymentDetails,
                      { accountId: accountId as any, ...details },
                    );
                  }
                  setEditing(false);
                  setMessage("Saved. Confirm the updated recipient below.");
                } catch (error) {
                  setMessage(
                    error instanceof Error
                      ? error.message
                      : "Could not save. Try again.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Tuition amount · GBP
                <Input
                  required
                  type="number"
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  value={draft.amount}
                  disabled={busy}
                  onChange={(e) =>
                    setDraft({ ...draft, amount: e.target.value })
                  }
                />
              </label>
              <label>
                University / recipient
                <Input
                  required
                  maxLength={160}
                  value={draft.recipient}
                  disabled={busy}
                  onChange={(e) =>
                    setDraft({ ...draft, recipient: e.target.value })
                  }
                />
              </label>
              <label>
                Recipient account last four digits
                <Input
                  required
                  pattern="[0-9]{4}"
                  inputMode="numeric"
                  maxLength={4}
                  value={draft.last4}
                  disabled={busy}
                  onChange={(e) =>
                    setDraft({ ...draft, last4: e.target.value })
                  }
                />
              </label>
              <div className="brief-actions">
                <Button disabled={busy}>
                  {busy ? "Saving…" : "Save details"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
          {message && <p role="status">{message}</p>}
          {!reviewing && !locked ? (
            <>
              <div className="payment-choose-view">{plan}</div>
              <Button
                className="payment-review-next"
                onClick={() => setReviewing(true)}
              >
                Review payment <ArrowRight size={16} />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className="payment-back"
                onClick={() => setReviewing(false)}
                disabled={locked}
              >
                <ArrowLeft size={16} /> Routes
              </Button>
              {review}
            </>
          )}
        </TabsContent>
        <TabsContent value="balances">{balances}</TabsContent>
        <TabsContent value="exchange">{exchange}</TabsContent>
        <TabsContent value="activity">{activity}</TabsContent>
        <TabsContent value="estimate">
          <PaymentEstimate
            amount={amount}
            recipient={recipient}
            data={estimateData}
          />
          <Button
            variant="outline"
            onClick={() => {
              setView("tuition");
              setReviewing(false);
            }}
          >
            Open tuition details <ArrowRight size={15} />
          </Button>
        </TabsContent>
      </Tabs>
    </section>
  );
}
