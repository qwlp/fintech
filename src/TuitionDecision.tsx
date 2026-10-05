import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { assessTuition, type DecisionRoute } from "../convex/tuitionDecision";
import { convexApi, convexClient } from "./lib/convex";
import { Button } from "./components/ui/button";
import { DatePicker } from "./components/ui/date-picker";
import { Input } from "./components/ui/input";
import "./tuition-decision.css";

type Plan = {
  deadline: string;
  bufferBusinessDays: number;
  protectedReserveGBP: number;
};
type Props = {
  accountId?: string;
  banking: {
    paymentAmount?: number;
    tuitionDeadline?: string;
    bufferBusinessDays?: number;
  };
  reserveGBP: number;
  wallets: { currency: string; amount: number; gbpValue: number }[];
  routes: DecisionRoute[];
  selectedRoute?: string;
  paymentStatus: string;
  onSave?: (plan: Plan) => Promise<void>;
  onRefresh?: () => Promise<void>;
  onSelect?: (key: string) => Promise<boolean>;
};
const usd = (value: number | null) =>
  value === null
    ? "Unavailable"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
export default function TuitionDecision(props: Props) {
  const { banking, reserveGBP, paymentStatus } = props;
  const [deadline, setDeadline] = useState(banking.tuitionDeadline ?? "");
  const [buffer, setBuffer] = useState(String(banking.bufferBusinessDays ?? 1));
  const [reserve, setReserve] = useState(String(reserveGBP));
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const locked = paymentStatus !== "not_started";
  useEffect(() => {
    setDeadline(banking.tuitionDeadline ?? "");
    setBuffer(String(banking.bufferBusinessDays ?? 1));
    setReserve(String(reserveGBP));
  }, [banking.tuitionDeadline, banking.bufferBusinessDays, reserveGBP]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const assessment = useMemo(() => {
    try {
      return {
        decision: assessTuition({
          amountGBP: banking.paymentAmount ?? 0,
          reserveGBP,
          wallets: props.wallets,
          routes: props.routes,
          deadline: banking.tuitionDeadline,
          bufferBusinessDays: banking.bufferBusinessDays,
          now,
        }),
        error: "",
      };
    } catch (e) {
      return {
        decision: null,
        error: e instanceof Error ? e.message : "Planning data unavailable",
      };
    }
  }, [
    banking.paymentAmount,
    banking.tuitionDeadline,
    banking.bufferBusinessDays,
    reserveGBP,
    props.wallets,
    props.routes,
    now,
  ]);
  const decision = assessment.decision;
  const dirty =
    deadline !== (banking.tuitionDeadline ?? "") ||
    Number(buffer) !== (banking.bufferBusinessDays ?? 1) ||
    Number(reserve) !== reserveGBP;
  const run = async (action: () => Promise<void>, message: string) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNow(Date.now());
      setNotice(message);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message.replace(/\[.*?\]/g, "")
          : "Could not update tuition plan",
      );
    } finally {
      setBusy(false);
    }
  };
  const mutation = async (
    name: "updateTuitionPlan" | "refreshSandboxQuotes",
    args: object,
  ) => {
    if (!convexClient || !props.accountId)
      throw new Error("Sign in to update your plan");
    await convexClient.mutation(convexApi[name], {
      accountId: props.accountId as any,
      ...args,
    } as any);
  };
  return (
    <section
      className="tuition-decision"
      aria-labelledby="tuition-decision-heading"
    >
      <div className="tuition-decision-heading">
        <div>
          <h2 id="tuition-decision-heading">Choose your payment route</h2>
          <p>Set your deadline, then choose a payment route.</p>
        </div>
        <span className="tuition-sandbox">USD → GBP · Sandbox</span>
      </div>
      <form
        className="tuition-plan-form"
        onSubmit={(e) => {
          e.preventDefault();
          const plan = {
            deadline,
            bufferBusinessDays: Number(buffer),
            protectedReserveGBP: Number(reserve),
          };
          void run(
            () =>
              props.onSave
                ? props.onSave(plan)
                : mutation("updateTuitionPlan", plan),
            "Tuition plan saved.",
          );
        }}
      >
        <label>
          Pay by (UTC date)
          <DatePicker
            label="Tuition deadline"
            compact
            value={deadline}
            disabled={locked || busy}
            onChange={setDeadline}
          />
        </label>
        <details className="tuition-plan-options">
          <summary>Living funds & timing</summary>
          <div className="tuition-plan-option-fields">
        <label>
          Safety buffer (business days)
          <Input
            aria-label="Safety buffer in business days"
            type="number"
            min={0}
            max={5}
            step={1}
            required
            value={buffer}
            disabled={locked || busy}
            onChange={(e) => setBuffer(e.target.value)}
          />
        </label>
        <label>
          Protected living funds (GBP)
          <Input
            aria-label="Protected living funds in GBP"
            type="number"
            min={0}
            max={1000000}
            step="0.01"
            required
            value={reserve}
            disabled={locked || busy}
            onChange={(e) => setReserve(e.target.value)}
          />
        </label>
          </div>
        </details>
        <Button type="submit" disabled={locked || busy || !dirty || !deadline}>
          Save plan
        </Button>
      </form>
      {dirty && (
        <p className="tuition-plan-note">
          Save your changes to update the comparison and the AI’s
          recommendation.
        </p>
      )}
      {locked && (
        <p className="tuition-plan-note">
          An existing proposal keeps its approved terms. Reset it in Review & pay before
          changing the plan, refreshing quotes or choosing a route.
        </p>
      )}
      {decision && (
        <>
          <div
            className={`tuition-recommendation ${decision.recommendedRouteKey ? "ready" : "blocked"}`}
            aria-label="Route recommendation"
          >
            <ShieldCheck size={21} />
            <div>
              <strong>
                {decision.recommendedRouteKey
                  ? "A route meets your plan"
                  : "Update your plan to continue"}
              </strong>
              <p>{decision.explanation}</p>
            </div>
          </div>
          <div className="tuition-route-list">
            {decision.routes.map((route) => (
              <article className={`tuition-route ${props.selectedRoute === route.routeKey ? "selected" : ""}`} key={route.routeKey}>
                <div className="tuition-route-title">
                  <strong>{route.provider}</strong>
                  <span>
                    {route.eligible ? "Meets plan" : "Blocked"}
                    {props.selectedRoute === route.routeKey
                      ? " · Selected"
                      : ""}
                  </span>
                </div>
                <div className="tuition-route-summary">
                  <strong>{usd(route.totalUSD)}</strong>
                  <span>{route.estimatedArrival ? `Arrives ${route.estimatedArrival}` : "Set a deadline to estimate arrival"}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      busy ||
                      locked ||
                      dirty ||
                      !route.eligible ||
                      props.selectedRoute === route.routeKey ||
                      !props.onSelect
                    }
                    onClick={() =>
                      void run(async () => {
                        if (!(await props.onSelect?.(route.routeKey)))
                          throw new Error("Could not select route");
                      }, "Route selected. Ask the AI to prepare your tuition payment, then review and approve in Payments.")
                    }
                  >
                    {props.selectedRoute === route.routeKey ? "Selected" : `Choose ${route.provider}`}
                    <ArrowRight size={15} />
                  </Button>
                </div>
                <details className="tuition-route-details">
                  <summary>{route.eligible ? "Cost & timing details" : "Why is this unavailable?"}</summary>
                <div className="tuition-route-facts">
                  <div>
                    <small>Total USD, including fee</small>
                    <strong>{usd(route.totalUSD)}</strong>
                  </div>
                  <div>
                    <small>Estimated arrival, with buffer</small>
                    <strong>{route.estimatedArrival ?? "Unknown"}</strong>
                  </div>
                  <div>
                    <small>Living funds after payment</small>
                    <strong>
                      {route.remainingGBP === null
                        ? "Unknown"
                        : `£${route.remainingGBP.toFixed(2)}`}
                    </strong>
                  </div>
                </div>
                {!route.eligible && (
                  <ul className="tuition-blockers">
                    {route.blockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                )}
                {route.minimumTopUpUSD !== null &&
                  route.minimumTopUpUSD > 0 && (
                    <p className="tuition-funding-gap">
                      At least {usd(route.minimumTopUpUSD)} additional USD is
                      needed to cover this payment and protect your reserve,
                      using the current sandbox valuation. A sponsor promise
                      does not count until funds arrive.
                    </p>
                  )}
                  <small>{route.fresh ? "Quote valid until " + new Date(route.quoteExpiresAt!).toLocaleTimeString() : "Quote needs refresh"}</small>
                </details>
              </article>
            ))}
          </div>
          <div className="tuition-decision-footer">
            <details className="tuition-estimate-details"><summary>About these estimates</summary><p>Quotes and balances are simulated. Delivery estimates exclude bank holidays, bank cutoffs and university processing. The buffer adds planning time; it cannot guarantee arrival.</p></details>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy || locked}
              onClick={() =>
                void run(
                  () =>
                    props.onRefresh
                      ? props.onRefresh()
                      : mutation("refreshSandboxQuotes", {}),
                  "Sandbox quotes refreshed. These are illustrative rates.",
                )
              }
            >
              <RefreshCw size={14} />
              Refresh sandbox quotes
            </Button>
          </div>
        </>
      )}
      {(error || assessment.error) && (
        <p className="tuition-error" role="alert">
          {error || assessment.error}
        </p>
      )}
      {notice && (
        <p className="tuition-notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
