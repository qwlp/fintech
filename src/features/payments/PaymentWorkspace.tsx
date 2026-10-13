import { Dialog } from "radix-ui";
import "../../styles/payment-focused.css";
import UniversityLabel from "../../components/UniversityLabel";
import { convertMoney, formatCurrency } from "../../../shared/currency";
import { useWorkspaceCurrency } from "../../components/WorkspaceCurrency";
import { countries, getCountry, getUniversity } from "../../../shared/study";
import UniversitySelect from "../../auth/UniversitySelect";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Landmark,
  GraduationCap,
  WalletCards,
  ArrowLeftRight,
  Pencil,
  ShieldCheck,
  ArrowLeft,
  Search,
  Send,
} from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui/tabs";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../components/ui/select";
import { WorkspaceCurrencyProvider } from "../../components/WorkspaceCurrency";
import { api } from "../../../convex/_generated/api";
export type Comparison = {
  sourceCurrency: string;
  targetCurrency: string;
  amount: number;
};
import { convexApi, convexClient } from "../../lib/convex";
import "../../styles/tuition-decision.css";
import "../../styles/brief.css";
import "../../styles/payment-compact.css";
import "../../styles/payment-comparison.css";
export default function PaymentWorkspace({
  help,
  sourceCurrency = "USD",
  homeCountry,
  travelCountry,
  onCompare,
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
  sourceCurrency?: string;
  homeCountry?: string;
  travelCountry?: string;
  onCompare?: (comparison: Comparison) => Promise<void>;
  plan: ReactNode | ((comparison: Comparison) => ReactNode);
  review: ReactNode;
  balances?: ReactNode;
  exchange?: ReactNode;
  amount?: number;
  recipient?: string;
  paymentStatus: string;
  accountId?: string;
  banking?: {
    recipientAccountLast4?: string;
    currency?: string;
    sourceCurrency?: string;
  };
  initialView?: string;
  onEdit?: (details: {
    amount: number;
    recipient: string;
    last4: string;
  }) => Promise<void>;
}) {
  const workspaceCurrency = useWorkspaceCurrency();
  const defaultSource =
    banking?.sourceCurrency ??
    getCountry(homeCountry ?? "")?.currency ??
    sourceCurrency;
  const defaultTarget =
    banking?.currency ??
    getCountry(travelCountry ?? "")?.currency ??
    workspaceCurrency;
  const [payFrom, setPayFrom] = useState(defaultSource);
  const [payTo, setPayTo] = useState(defaultTarget);
  useEffect(() => {
    setPayFrom(defaultSource);
  }, [defaultSource]);
  const currency = payTo;
  const savedCurrency = banking?.currency ?? workspaceCurrency;
  const country =
    getCountry(travelCountry ?? "")?.name ??
    countries.find((item) => item.currency === workspaceCurrency)?.name ??
    "";
  const [view, setView] = useState(initialView);
  const [reviewing, setReviewing] = useState(paymentStatus !== "not_started");
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    amount: String(amount ?? ""),
    recipient: recipient ?? "",
    last4: banking?.recipientAccountLast4 ?? "",
  });
  const [comparisonAmount, setComparisonAmount] = useState(
    String(
      amount == null ? "" : convertMoney(amount, savedCurrency, defaultTarget),
    ),
  );
  useEffect(() => {
    setPayTo(defaultTarget);
    setComparisonAmount(
      String(
        amount == null
          ? ""
          : convertMoney(amount, savedCurrency, defaultTarget),
      ),
    );
  }, [amount, savedCurrency, defaultTarget]);
  const changeTargetCurrency = (next: string) => {
    if (next === payTo) return;
    const current = Number(comparisonAmount);
    if (comparisonAmount.trim() && Number.isFinite(current)) {
      setComparisonAmount(String(convertMoney(current, payTo, next)));
    }
    setPayTo(next);
  };
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
    <section className="payment-workspace payment-focused">
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
            <div className="payment-comparison-search">
              <div className="payment-comparison-recipient">
                <span>
                  {recipient ? (
                    <UniversityLabel name={recipient} />
                  ) : (
                    <>
                      <Landmark size={16} aria-hidden="true" />
                      Choose your university
                    </>
                  )}
                </span>
                <Button
                  variant="ghost"
                  ref={editButtonRef}
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
                  <Pencil size={14} />
                  <span className="payment-edit-label">Edit details</span>
                </Button>
              </div>
              <form
                className="payment-comparison-bar"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const nextAmount = Number(comparisonAmount);
                  if (
                    busy ||
                    locked ||
                    !Number.isFinite(nextAmount) ||
                    nextAmount <= 0
                  )
                    return;
                  setBusy(true);
                  setMessage("");
                  try {
                    if (onCompare)
                      await onCompare({
                        sourceCurrency: payFrom,
                        targetCurrency: payTo,
                        amount: nextAmount,
                      });
                    else if (convexClient && accountId)
                      await convexClient.action(api.paymentRates.compare, {
                        sourceCurrency: payFrom as "USD" | "GBP" | "CNY",
                        targetCurrency: payTo as "USD" | "GBP" | "CNY",
                        amount: nextAmount,
                      });
                    else if (
                      onEdit &&
                      payFrom === sourceCurrency &&
                      payTo === workspaceCurrency
                    )
                      await onEdit({
                        amount: nextAmount,
                        recipient: recipient ?? "",
                        last4: banking?.recipientAccountLast4 ?? "",
                      });
                    else
                      throw new Error(
                        "Sign in to save your payment currencies.",
                      );
                    setMessage("Payment options updated.");
                  } catch (error) {
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : "Could not update your amount. Try again.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <div className="payment-comparison-country">
                  <span id="pay-from-label">
                    <Send size={13} aria-hidden="true" />
                    Pay from
                  </span>
                  <Select
                    value={payFrom}
                    disabled={locked || busy}
                    onValueChange={setPayFrom}
                  >
                    <SelectTrigger aria-labelledby="pay-from-label">
                      <SelectValue>
                        {
                          countries.find((item) => item.currency === payFrom)
                            ?.flag
                        }{" "}
                        <span className="payment-country-name">
                          {
                            countries.find((item) => item.currency === payFrom)
                              ?.name
                          }{" "}
                          ·{" "}
                        </span>
                        {payFrom}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="ui-select-content">
                      {countries.map((item) => (
                        <SelectItem key={item.currency} value={item.currency}>
                          {item.flag} {item.name} · {item.currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="payment-comparison-country">
                  <span id="pay-to-label">
                    <Landmark size={13} aria-hidden="true" />
                    Pay to
                  </span>
                  <Select
                    value={payTo}
                    disabled={locked || busy}
                    onValueChange={changeTargetCurrency}
                  >
                    <SelectTrigger aria-labelledby="pay-to-label">
                      <SelectValue>
                        {
                          countries.find((item) => item.currency === payTo)
                            ?.flag
                        }{" "}
                        <span className="payment-country-name">
                          {
                            countries.find((item) => item.currency === payTo)
                              ?.name
                          }{" "}
                          ·{" "}
                        </span>
                        {payTo}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="ui-select-content">
                      {countries.map((item) => (
                        <SelectItem key={item.currency} value={item.currency}>
                          {item.flag} {item.name} · {item.currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="payment-comparison-amount">
                  <span>
                    <GraduationCap size={13} aria-hidden="true" />
                    University receives
                  </span>
                  <div>
                    <Input
                      money
                      required
                      min="0.01"
                      max={convertMoney(1000000, "GBP", currency)}
                      aria-label={`Tuition amount in ${currency}`}
                      value={comparisonAmount}
                      disabled={locked || busy}
                      onChange={(event) =>
                        setComparisonAmount(event.target.value)
                      }
                    />
                    <Select
                      value={payTo}
                      disabled={locked || busy}
                      onValueChange={changeTargetCurrency}
                    >
                      <SelectTrigger
                        className="payment-receive-currency"
                        aria-label="University receives currency"
                        title="Change receiving currency"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="ui-select-content">
                        {countries.map((item) => (
                          <SelectItem key={item.currency} value={item.currency}>
                            {item.currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  className="payment-comparison-submit"
                  disabled={locked || busy}
                >
                  <Search size={18} />
                  {busy ? "Updating…" : "Compare"}
                </Button>
              </form>
            </div>
          )}
          <Dialog.Root
            open={editing}
            onOpenChange={(open) => {
              if (!busy) setEditing(open);
            }}
          >
            <Dialog.Portal>
              <Dialog.Overlay className="brief-overlay" />
              <Dialog.Content
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  editButtonRef.current?.focus();
                }}
                className="brief-dialog payment-settings-dialog"
                onEscapeKeyDown={(event) => {
                  if (busy) event.preventDefault();
                }}
                onPointerDownOutside={(event) => {
                  if (busy) event.preventDefault();
                }}
              >
                <Dialog.Title>Edit tuition details</Dialog.Title>
                <Dialog.Description>
                  Update the tuition amount and university recipient.
                </Dialog.Description>
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
                        !getUniversity(country, details.recipient)
                      )
                        throw new Error(
                          "Enter a positive amount and select a listed university.",
                        );
                      if (onEdit) await onEdit(details);
                      else {
                        if (!convexClient || !accountId)
                          throw new Error("Sign in to save payment details.");
                        await convexClient.action(api.paymentRates.compare, {
                          sourceCurrency: payFrom as "USD" | "GBP" | "CNY",
                          targetCurrency: payTo as "USD" | "GBP" | "CNY",
                          ...details,
                        });
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
                      money
                      min="0.01"
                      max={convertMoney(1000000, "GBP", currency)}

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
                    onChange={(value) =>
                      setDraft({ ...draft, recipient: value })
                    }
                  />
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
                {message && <p role="alert">{message}</p>}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          {message && !editing && <p role="status">{message}</p>}
          {!reviewing && !locked ? (
            <>
              <div
                className="payment-choose-view"
                inert={
                  amount !== undefined &&
                  (Number(comparisonAmount) !==
                    convertMoney(amount, savedCurrency, payTo) ||
                    payFrom !== (banking?.sourceCurrency ?? sourceCurrency) ||
                    payTo !== savedCurrency)
                }
              >
                {typeof plan === "function"
                  ? plan({
                      sourceCurrency: payFrom,
                      targetCurrency: payTo,
                      amount: Number(comparisonAmount) || 0,
                    })
                  : plan}
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
              <WorkspaceCurrencyProvider currency={savedCurrency}>
                {review}
              </WorkspaceCurrencyProvider>
            </>
          )}
        </TabsContent>
        <TabsContent value="balances">{balances}</TabsContent>
        <TabsContent value="exchange">{exchange}</TabsContent>
      </Tabs>
    </section>
  );
}
