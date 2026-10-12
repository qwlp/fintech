import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Bell,
  ChevronRight,
  Clock3,
  GraduationCap,
  Landmark,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import InfoHelp from "../../components/InfoHelp";
import { currencyRate, formatCurrency } from "../../../shared/currency";
import { formatUSD } from "../../lib/finance";
import { useWorkspaceCurrency } from "../../components/WorkspaceCurrency";
import type { DatabaseState, Page } from "../../types/database";

export function ExchangeWorkspace({
  go,
  database,
  onRateAlert,
}: {
  go: (p: Page) => void;
  database: DatabaseState | null;
  onRateAlert: (targetRate: number) => Promise<boolean>;
}) {
  const currency = useWorkspaceCurrency();
  const [amount, setAmount] = useState("2500");
  const [targetRate, setTargetRate] = useState(() =>
    String(0.79 * currencyRate("GBP", currency)),
  );
  useEffect(
    () => setTargetRate(String(0.79 * currencyRate("GBP", currency))),
    [currency],
  );
  const [saving, setSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const bestRoute =
    database?.paymentRoutes.find((r) => r.recommended) ?? database?.paymentRoutes[0];
  const rate = bestRoute?.fxRate ?? 0;
  const fee = bestRoute?.fee ?? 0;
  const numericAmount = Number(amount);
  const validAmount =
    amount.trim() !== "" && Number.isFinite(numericAmount) && numericAmount > 0;
  const received = validAmount ? numericAmount * rate : 0;
  const validTarget =
    targetRate.trim() !== "" &&
    Number.isFinite(Number(targetRate)) &&
    Number(targetRate) > 0;
  const alert = database?.rateAlerts.find(
    (item) => item.active && item.pair === `USD/${currency}`,
  );
  const targetMoney = (value: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const saveAlert = async () => {
    if (!validTarget || saving) return;
    setSaving(true);
    setAlertMessage("");
    try {
      const success = await onRateAlert(Number(targetRate));
      setAlertMessage(success ? "Alert saved." : "Could not save. Try again.");
    } catch {
      setAlertMessage("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="workspace fx-desk fx-conversion">
      <header className="fx-heading">
        <h2>
          <ArrowLeftRight size={24} aria-hidden="true" /> Exchange
        </h2>
      </header>
      <div className="fx-conversion-layout">
        <section className="fx-converter-panel" aria-label="Conversion estimate">
          <div className="fx-conversion-heading">
            <h3>USD → {currency}</h3>
            <span className="fx-badge">
              <ShieldCheck size={14} aria-hidden="true" /> Sandbox
            </span>
          </div>
          <div className="fx-amounts">
            <label className="fx-label" htmlFor="fx-amount">
              <WalletCards size={15} aria-hidden="true" /> You send
            </label>
            <div className="fx-money-field">
              <Input
                id="fx-amount"
                aria-label="Amount to convert"
                className="fx-amount-input"
                money
                inputMode="decimal"
                min="0.01"
                value={amount}
                aria-invalid={!validAmount}
                aria-describedby={!validAmount ? "fx-amount-help" : undefined}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span className="fx-currency">USD</span>
            </div>
            <div className="fx-conversion-direction">
              <ArrowLeft className="fx-down-arrow" size={18} aria-hidden="true" />
            </div>
            <div className="fx-result">
              <span className="fx-label">
                <Landmark size={15} aria-hidden="true" /> You receive · {currency}
              </span>
              <output aria-live="polite">
                {bestRoute && validAmount ? targetMoney(received) : "—"}
              </output>
            </div>
            {!validAmount && (
              <p id="fx-amount-help" className="fx-error">
                Enter an amount above zero.
              </p>
            )}
          </div>
          <div className="fx-quote-summary">
            <dl className="fx-breakdown">
              <div>
                <dt><ArrowLeftRight size={15} aria-hidden="true" /> Rate <InfoHelp term="Exchange rate" /></dt>
                <dd>{bestRoute ? `1 USD = ${rate.toFixed(4)} ${currency}` : "Unavailable"}</dd>
              </div>
              <div>
                <dt><ReceiptText size={15} aria-hidden="true" /> Fee <InfoHelp term="Fees" /></dt>
                <dd>{bestRoute ? formatUSD(fee) : "—"}</dd>
              </div>
              <div>
                <dt><Clock3 size={15} aria-hidden="true" /> Arrival <InfoHelp term="Arrival estimate" /></dt>
                <dd>{bestRoute?.delivery ?? "Unavailable"}</dd>
              </div>
              <div className="fx-total">
                <dt><WalletCards size={15} aria-hidden="true" /> Total · USD</dt>
                <dd>{bestRoute && validAmount ? formatUSD(numericAmount + fee) : "—"}</dd>
              </div>
            </dl>
            <Button
              className="fx-primary"
              disabled={!validAmount || !bestRoute}
              onClick={() => go("Payments")}
            >
              <GraduationCap size={18} aria-hidden="true" /> Tuition payment{" "}
              <ArrowRight size={18} />
            </Button>
          </div>
        </section>
        <aside className="fx-conversion-support">
          <details className="fx-alert-disclosure">
            <summary>
              <span><Bell size={16} aria-hidden="true" /> Rate alert</span>
              <ChevronRight size={16} aria-hidden="true" />
            </summary>
            {alert && (
              <p className="fx-active-alert">
                Active target: {alert.targetRate} {currency} per USD
              </p>
            )}
            <form onSubmit={(e) => { e.preventDefault(); void saveAlert(); }}>
              <label className="fx-label" htmlFor="fx-target">
                Target rate · {currency} per USD
              </label>
              <Input
                id="fx-target"
                className="fx-target-input"
                type="number"
                inputMode="decimal"
                min="0.001"
                step="0.001"
                value={targetRate}
                onChange={(e) => { setTargetRate(e.target.value); setAlertMessage(""); }}
                aria-invalid={!validTarget}
                aria-describedby="fx-target-help"
              />
              <p id="fx-target-help" className={validTarget ? "fx-hint" : "fx-error"}>
                {validTarget
                  ? `Current: ${bestRoute ? rate.toFixed(4) : "unavailable"} ${currency} per USD`
                  : "Enter a rate above zero."}
              </p>
              <Button type="submit" disabled={!validTarget || saving || !database}>
                {saving ? "Saving…" : alert ? "Update alert" : "Create alert"}
              </Button>
              <p role="status" className="fx-hint">{alertMessage}</p>
            </form>
          </details>
        </aside>
      </div>
    </section>
  );
}
