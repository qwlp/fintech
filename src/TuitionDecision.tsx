import { useWorkspaceCurrency } from "./WorkspaceCurrency";
import { formatCurrency } from "../shared/currency";
import { Dialog } from "radix-ui";
import InfoHelp from "./InfoHelp";
import MidMarketRate from "./MidMarketRate";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  RefreshCw,
  Clock3,
  CheckCircle2,
  CircleAlert,
  Landmark,
  CalendarDays,
  ChevronDown,
  CreditCard,
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
const sourceMoney = (value: number | null, currency = "USD") =>
  value === null
    ? "Unavailable"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(value);
export default function TuitionDecision(props: Props) {
  const currency = useWorkspaceCurrency();
  const { banking, reserveGBP, paymentStatus } = props;
  const [deadline, setDeadline] = useState(banking.tuitionDeadline ?? "");
  const [buffer, setBuffer] = useState(String(banking.bufferBusinessDays ?? 1));
  const [reserve, setReserve] = useState(String(reserveGBP));
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [detailRoute, setDetailRoute] = useState<string | null>(null);
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
          currency,
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
    currency,
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
          ? e.message.replace(/\[.*?\]/g, "").replace(/^.*?Uncaught Error:\s*/, "").replace(/\s+at handler[\s\S]*$/, "").replace(/\s+Called by client[\s\S]*$/, "")
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
          <h2 id="tuition-decision-heading">Choose a route</h2>
        </div>
        <MidMarketRate source={props.routes[0]?.sourceCurrency ?? "USD"} target={currency} />
      </div>
      <details className="payment-plan-settings" open={!banking.tuitionDeadline || dirty}>
        <summary className="payment-plan-summary"><span><CalendarDays size={17} /> Payment plan</span><span>{banking.tuitionDeadline || "Set deadline"}<ChevronDown size={16} /></span></summary>
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
            Deadline · UTC
            <DatePicker
              label="Tuition deadline"
              compact
              value={deadline}
              disabled={locked || busy}
              onChange={setDeadline}
            />
          </label>
          <div className="tuition-plan-option-fields">
            <label>
              Buffer · business days
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
              Living reserve · {currency}
              <Input
                aria-label={`Protected living funds in ${currency}`}
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
          <Button
            type="submit"
            disabled={locked || busy || !dirty || !deadline}
          >
            Save plan
          </Button>
        </form>
      </details>
      {dirty && (
        <p className="tuition-plan-note">
          Save your changes to update the comparison and the AI’s
          recommendation.
        </p>
      )}
      {locked && (
        <p className="tuition-plan-note">
          An existing proposal keeps its approved terms. Reset it in the payment
          review before changing the plan, refreshing quotes or choosing a
          route.
        </p>
      )}
      {decision && (
        <>
          {!decision.recommendedRouteKey && (
            <div
              className="tuition-recommendation blocked"
              aria-label="Route recommendation"
            >
              <CircleAlert size={18} />
              <strong>{!banking.tuitionDeadline ? "Choose a deadline and save your plan" : "Refresh quotes or check route details"}</strong>
            </div>
          )}
          <div className="tuition-route-list">
            {decision.routes.map((route) => (
              <article
                className={`tuition-route ${props.selectedRoute === route.routeKey ? "selected" : ""}`}
                key={route.routeKey}
              >
                <div className="tuition-route-title">
                  <strong>
                    {route.routeKey.includes("card") || route.routeKey === "sandbox-fast" ? <CreditCard size={18} /> : <Landmark size={18} />}
                    {route.provider}
                  </strong>
                  <span>
                    {route.eligible ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <CircleAlert size={14} />
                    )}
                    {props.selectedRoute === route.routeKey
                      ? "Selected"
                      : route.eligible
                        ? "Available"
                        : "Unavailable"}
                  </span>
                </div>
                <div className="tuition-route-summary">
                  <strong>
                    {sourceMoney(route.totalUSD, route.sourceCurrency)}
                  </strong>
                  <span>
                    <Clock3 size={14} />
                    {route.estimatedArrival
                      ? route.delivery
                      : route.delivery}
                  </span>
                  <Button
                    variant="outline"
                    aria-label={
                      props.selectedRoute === route.routeKey
                        ? "Selected"
                        : `Choose ${route.provider}`
                    }
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
                      }, "Route selected.")
                    }
                  >
                    {props.selectedRoute === route.routeKey
                      ? "Selected"
                      : "Select"}
                    <ArrowRight size={15} />
                  </Button>
                </div>
                {!route.eligible && <p className="tuition-route-blocker">{route.blockers[0]}</p>}
                <Dialog.Root
                  open={detailRoute === route.routeKey}
                  onOpenChange={(open) =>
                    setDetailRoute(open ? route.routeKey : null)
                  }
                >
                  <Dialog.Trigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="route-detail-button"
                      aria-label={`Details for ${route.provider}`}
                    >
                      Details
                    </Button>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="brief-overlay" />
                    <Dialog.Content className="brief-dialog tuition-route-details">
                      <Dialog.Title>{route.provider}</Dialog.Title>
                      <Dialog.Description>
                        Rate, fees and availability for this quote.
                      </Dialog.Description>
                      <dl className="route-quick-facts">
                        <div>
                          <dt>
                            Rate <InfoHelp term="Exchange rate" />
                          </dt>
                          <dd>
                            {route.rateGBPPerUSD} {route.targetCurrency} /{" "}
                            {route.sourceCurrency}
                          </dd>
                        </div>
                        <div>
                          <dt>
                            Fees <InfoHelp term="Fees" />
                          </dt>
                          <dd>
                            {sourceMoney(route.feeUSD, route.sourceCurrency)}
                          </dd>
                        </div>
                      </dl>
                      <div className="tuition-route-facts">
                        <div>
                          <small>
                            Estimated arrival, with buffer{" "}
                            <InfoHelp term="Arrival estimate" />
                          </small>
                          <strong>{route.estimatedArrival ?? "Unknown"}</strong>
                        </div>
                        <div>
                          <small>Living funds after payment</small>
                          <strong>
                            {route.remainingGBP === null
                              ? "Unknown"
                              : formatCurrency(
                                  route.remainingGBP,
                                  route.targetCurrency,
                                  2,
                                )}
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
                            At least{" "}
                            {sourceMoney(
                              route.minimumTopUpUSD,
                              route.sourceCurrency,
                            )}{" "}
                            additional {route.sourceCurrency}
                            is needed to cover this payment and protect your
                            reserve, using the current sandbox valuation. A
                            sponsor promise does not count until funds arrive.
                          </p>
                        )}
                      <small>
                        {route.fresh
                          ? "Quote valid until " +
                            new Date(route.quoteExpiresAt!).toLocaleTimeString()
                          : "Quote needs refresh"}
                      </small>
                      <Dialog.Close asChild>
                        <Button variant="outline">Close</Button>
                      </Dialog.Close>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
              </article>
            ))}
          </div>
          <div className="tuition-decision-footer">
            <InfoHelp term="Provider quote" />
            <Button
              variant="ghost"
              size="sm"
              aria-label="Refresh sandbox quotes"
              disabled={busy || locked}
              onClick={() =>
                void run(
                  () =>
                    props.onRefresh
                      ? props.onRefresh()
                      : mutation("refreshSandboxQuotes", {}),
                  "Quotes refreshed.",
                )
              }
            >
              <RefreshCw size={14} />
              Refresh
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
