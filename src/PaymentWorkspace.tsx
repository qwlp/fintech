import { convertMoney } from "../shared/currency";
import { useWorkspaceCurrency } from "./WorkspaceCurrency";
import { countries, getUniversity } from "../shared/study";
import UniversitySelect from "./UniversitySelect";
import { useEffect, useState, type ReactNode } from "react";
import {
  Landmark,
  GraduationCap,
  WalletCards,
  ArrowLeftRight,
  Pencil,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { convexApi, convexClient } from "./lib/convex";
import "./tuition-decision.css";
import "./brief.css";
import "./payment-compact.css";
export default function PaymentWorkspace({
  help,
  plan,
  review,
  balances,
  exchange,
  amount,
  recipient,
  paymentStatus,
  accountId,
  banking,
  initialView = "tuition",
  onEdit,
}: {
  help?: ReactNode;
  plan: ReactNode;
  review: ReactNode;
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
  const currency = useWorkspaceCurrency();
  const country =
    countries.find((item) => item.currency === currency)?.name ?? "";
  const [view, setView] = useState(initialView);
  const [reviewing, setReviewing] = useState(paymentStatus !== "not_started");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    amount: String(amount ?? ""),
    recipient: recipient ?? "",
    last4: banking?.recipientAccountLast4 ?? "",
  });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setEditing(false);
  }, [currency]);
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
        <div className="payment-heading-actions">
          <span className="payment-workspace-sandbox">
            <ShieldCheck size={14} /> Sandbox · No real funds
          </span>
          {help}
        </div>
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
        </TabsList>
        <TabsContent value="tuition">
          {amount !== undefined && !reviewing && (
            <div className="payment-workspace-summary">
              <div>
                <span>
                  <GraduationCap size={15} /> Tuition · {currency}
                </span>
                <strong>
                  {new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency,
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
                    !getUniversity(country, details.recipient) ||
                    !/^\d{4}$/.test(details.last4)
                  )
                    throw new Error(
                      "Enter a positive amount, select a listed university and enter four account digits.",
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
                Tuition amount · {currency}
                <Input
                  required
                  type="number"
                  min="0.01"
                  max={convertMoney(1000000, "GBP", currency)}
                  step="0.01"
                  value={draft.amount}
                  disabled={busy}
                  onChange={(e) =>
                    setDraft({ ...draft, amount: e.target.value })
                  }
                />
              </label>
              <UniversitySelect
                label="University / recipient"
                allowClear={false}
                country={country}
                value={draft.recipient}
                disabled={busy}
                onChange={(value) => setDraft({ ...draft, recipient: value })}
              />
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
              <div className="payment-review-actions">
                <Button
                  className="payment-review-next"
                  onClick={() => setReviewing(true)}
                >
                  Review payment <ArrowRight size={16} />
                </Button>
              </div>
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
      </Tabs>
    </section>
  );
}
