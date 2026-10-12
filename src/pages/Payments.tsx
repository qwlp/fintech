import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  Landmark,
  LockKeyhole,
  ReceiptText,
  RotateCcw,
  Send,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import InfoHelp from "../InfoHelp";
import { formatCurrency } from "../../shared/currency";
import {
  routeProviderName,
  routeProviderDetails,
} from "../../shared/payment-routes";
import { tuitionQuote } from "../../convex/tuitionDecision";
import { convexApi, convexClient } from "../lib/convex";
import { useWorkspaceCurrency } from "../WorkspaceCurrency";
import type { DatabaseState } from "../types/database";
import type { PaymentStatus } from "../types";

export function Payments({
  accountId,
  status,
  paid,
  prepare,
  approve,
  execute,
  reset,
  storedRoute,
  onSelectRoute,
  storedRoutes,
  config,
  proposal,
}: {
  accountId?: string;
  status: PaymentStatus;
  paid: boolean;
  prepare: () => Promise<boolean>;
  approve: () => Promise<boolean>;
  execute: () => Promise<boolean>;
  reset: () => Promise<boolean>;
  storedRoute?: string;
  onSelectRoute: (route: string) => Promise<boolean>;
  storedRoutes?: DatabaseState["paymentRoutes"];
  proposal?: NonNullable<DatabaseState["paymentProposals"]>[number];
  config?: any;
}) {
  const currency = useWorkspaceCurrency();

  const availableRoutes = (storedRoutes ?? []).map((r) => {
    try {
      const quote = tuitionQuote(Number(config?.paymentAmount), r);
      return {
        ...r,
        id: r.key,
        sourceAmount: quote.sourceMinor / 100,
        totalMinor: quote.totalMinor,
      };
    } catch {
      return { ...r, id: r.key, sourceAmount: NaN, totalMinor: NaN };
    }
  });

  const [selected, setSelected] = useState(
    storedRoute ?? availableRoutes.find((r) => r.recommended)?.id ?? "wise",
  );
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [recipientDigits, setRecipientDigits] = useState("");

  const runAction = async (action: () => Promise<boolean>) => {
    if (busy) return;
    setBusy(true);
    setActionError("");
    try {
      if (!(await action())) setActionError("Could not save. Try again.");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message.split("Uncaught Error: ").pop()!.split("\n")[0]
          : "Could not save. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const selectProvider = async (id: string) => {
    const previous = selected;
    setSelected(id);
    setConsent(false);
    await runAction(async () => {
      const success = await onSelectRoute(id);
      if (!success) setSelected(previous);
      return success;
    });
  };

  useEffect(() => {
    if (storedRoute) setSelected(storedRoute);
    setConsent(false);
  }, [storedRoute, status, currency, config?.paymentAmount]);

  const [quoteClock, setQuoteClock] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setQuoteClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeProposal =
    status !== "not_started" && proposal?.status !== "cancelled"
      ? proposal
      : undefined;

  const route = (() => {
    const item = availableRoutes.find((r) => r.id === selected);
    return item
      ? {
          ...item,
          ...(activeProposal
            ? {
                provider: activeProposal.provider,
                totalMinor: activeProposal.totalMinor,
                sourceAmount:
                  (activeProposal.totalMinor - activeProposal.feeMinor) / 100,
                fee: activeProposal.feeMinor / 100,
                fxRate: activeProposal.fxRate,
                delivery: activeProposal.delivery,
              }
            : { sourceAmount: item.sourceAmount }),
        }
      : undefined;
  })();

  const amount = activeProposal
    ? activeProposal.amountMinor / 100
    : Number(config?.paymentAmount);
  const selectedQuote = availableRoutes.find((r) => r.id === selected);
  const quoteExpired =
    status !== "completed" &&
    (activeProposal
      ? activeProposal.expiresAt <= quoteClock
      : !selectedQuote?.quoteExpiresAt ||
        selectedQuote.quoteExpiresAt <= quoteClock);
  const ready =
    !quoteExpired &&
    (selectedQuote?.targetCurrency ?? "GBP") === currency &&
    Number.isFinite(amount) &&
    amount > 0 &&
    !!route &&
    route.fxRate > 0 &&
    config?.recipientVerified === true;
  const amountLabel =
    Number.isFinite(amount) && amount > 0
      ? new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: activeProposal?.targetCurrency ?? currency,
        }).format(amount)
      : "—";
  const recipient =
    activeProposal?.recipient ??
    config?.recipient ??
    "University of Manchester";
  const locked = status !== "not_started";
  const currentStep =
    status === "not_started" ? 1 : status === "prepared" ? 2 : 3;

  return (
    <div className="payments-page payment-checkout pay-simple">
      <div className="tuition-sandbox">
        <div id="sandbox-checkout" className="tuition-sandbox-content">
          <header className="pay-heading">
            <h2>Confirm payment</h2>
            <div className="pay-header-actions">
              {status !== "not_started" && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void runAction(reset)}
                >
                  <RotateCcw size={14} />
                  Reset payment
                </Button>
              )}
            </div>
          </header>
          {status !== "not_started" && (
            <div className="pay-progress" aria-label="Payment progress">
              {["Choose", "Approve", "Send"].map((label, i) => (
                <div
                  key={label}
                  className={i + 1 <= currentStep ? "active" : ""}
                  aria-current={i + 1 === currentStep ? "step" : undefined}
                >
                  <span>
                    {i + 1 < currentStep ? <Check size={12} /> : i + 1}
                  </span>
                  {label}
                </div>
              ))}
            </div>
          )}
          {paid && (
            <div className="pay-success" role="status">
              <CheckCircle2 size={20} />
              <strong>{amountLabel} sent</strong>
              <span>{config?.transactionReference}</span>
            </div>
          )}
          <div className="pay-grid">
            <div className="pay-card pay-review">
              <div className="compact-checkout-content">
                <div
                  className="pay-options"
                  role="group"
                  aria-label="Payment providers"
                >
                  {availableRoutes
                    .filter((r) => r.id === selected)
                    .map((r) => {
                      const RouteIcon =
                        r.id.includes("swift") ||
                        r.provider.toLowerCase().includes("bank")
                          ? Landmark
                          : r.id.includes("card") ||
                              r.provider.toLowerCase().includes("card")
                            ? CreditCard
                            : Send;
                      return (
                        <div key={r.id} className="pay-option selected">
                          <span className="pay-provider-icon">
                            <RouteIcon size={20} />
                          </span>
                          <span className="pay-provider">
                            <strong>{routeProviderName(r.provider)}</strong>
                            <small>
                              {routeProviderDetails(
                                r.provider,
                                r.targetCurrency ?? "GBP",
                              )}
                            </small>
                            <span>
                              <Clock3 size={13} />
                              {r.delivery}
                              {r.recommended && <em>Best value</em>}
                            </span>
                          </span>
                          <strong
                            className="pay-price"
                            aria-label={`Total cost in ${activeProposal?.sourceCurrency ?? r.sourceCurrency ?? "USD"}`}
                          >
                            {formatCurrency(
                              (activeProposal?.totalMinor ?? r.totalMinor) /
                                100,
                              activeProposal?.sourceCurrency ??
                                r.sourceCurrency ??
                                "USD",
                              2,
                            )}
                          </strong>
                          <span className="pay-radio" aria-hidden="true">
                            {route?.id === r.id && <Check size={12} />}
                          </span>
                        </div>
                      );
                    })}
                  {!availableRoutes.length && (
                    <p className="fx-hint">No providers available.</p>
                  )}
                </div>
                {config?.recipientVerified !== true &&
                  status === "not_started" && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void runAction(async () => {
                          if (!convexClient || !accountId) return false;
                          await convexClient.mutation(
                            convexApi.verifySandboxRecipient,
                            {
                              accountId: accountId as any,
                              last4: recipientDigits,
                            },
                          );
                          return true;
                        });
                      }}
                    >
                      <label>
                        Confirm recipient account last four digits
                        <Input
                          required
                          pattern="[0-9]{4}"
                          inputMode="numeric"
                          maxLength={4}
                          value={recipientDigits}
                          disabled={busy}
                          onChange={(e) => setRecipientDigits(e.target.value)}
                        />
                      </label>
                      <Button disabled={busy}>Confirm sandbox recipient</Button>
                    </form>
                  )}
                <div className="pay-recipient">
                  <Landmark size={20} />
                  <div>
                    <strong>{recipient}</strong>
                    <small>
                      ••••{" "}
                      {activeProposal?.recipientLast4 ??
                        config?.recipientAccountLast4 ??
                        "1842"}
                    </small>
                  </div>
                  <ShieldCheck
                    size={20}
                    aria-label={
                      config?.recipientVerified
                        ? "Sandbox recipient checked"
                        : "Unconfirmed sandbox recipient"
                    }
                    role="img"
                  >
                    <title>
                      {config?.recipientVerified
                        ? "Sandbox recipient checked"
                        : "Unconfirmed sandbox recipient"}
                    </title>
                  </ShieldCheck>
                </div>
                <div className="pay-amount">
                  <span>Recipient gets</span>
                  <strong>{amountLabel}</strong>
                </div>
                {!ready && (
                  <p className="fx-error" role="status">
                    {quoteExpired
                      ? "Quote expired. Refresh the comparison, or reset an active payment before refreshing."
                      : "Confirm the sandbox recipient above before preparing a payment."}
                  </p>
                )}
                <div className="payment-review-details">
                  <dl className="pay-details">
                    <div>
                      <dt>
                        <WalletCards size={16} />
                        You pay
                      </dt>
                      <dd>
                        {route
                          ? formatCurrency(
                              route.totalMinor / 100,
                              activeProposal?.sourceCurrency ??
                                route.sourceCurrency ??
                                "USD",
                              2,
                            )
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <ReceiptText size={16} />
                        Fee included <InfoHelp term="Fees" />
                      </dt>
                      <dd>
                        {route
                          ? formatCurrency(
                              route.fee,
                              activeProposal?.sourceCurrency ??
                                route.sourceCurrency ??
                                "USD",
                              2,
                            )
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <Activity size={16} />
                        Rate <InfoHelp term="Exchange rate" />
                      </dt>
                      <dd>
                        {route
                          ? `${route.fxRate} ${activeProposal?.targetCurrency ?? currency} / ${activeProposal?.sourceCurrency ?? route.sourceCurrency ?? "USD"}`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <Clock3 size={16} />
                        Arrival <InfoHelp term="Arrival estimate" />
                      </dt>
                      <dd>{route?.delivery ?? "—"}</dd>
                    </div>
                  </dl>
                </div>
                {status === "not_started" && (
                  <Button
                    className="pay-action"
                    disabled={!ready || busy}
                    onClick={() => void runAction(prepare)}
                  >
                    {busy ? "Saving…" : "Continue"}
                    <ArrowRight size={16} />
                  </Button>
                )}
                {status === "prepared" && (
                  <>
                    <label className="pay-consent">
                      <Checkbox
                        checked={consent}
                        onCheckedChange={(checked) =>
                          setConsent(checked === true)
                        }
                        disabled={!ready}
                      />
                      <span>Recipient and total are correct</span>
                    </label>
                    <Button
                      className="pay-action"
                      disabled={!consent || !ready || busy}
                      onClick={() => void runAction(approve)}
                    >
                      {busy ? "Saving…" : "Approve"}
                      <LockKeyhole size={16} />
                    </Button>
                  </>
                )}
                {status === "approved" && (
                  <Button
                    className="pay-action"
                    disabled={!ready || busy}
                    onClick={() => void runAction(execute)}
                  >
                    Send {amountLabel}
                    <ArrowRight size={16} />
                  </Button>
                )}
                {status === "processing" && (
                  <Button className="pay-action" disabled>
                    <span className="spinner" />
                    Sending…
                  </Button>
                )}
                {status === "completed" && (
                  <div className="pay-done">
                    <CheckCircle2 size={18} />
                    Sent
                  </div>
                )}
                {actionError && (
                  <p className="fx-error" role="alert">
                    {actionError}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
