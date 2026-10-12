import { routeProviderName } from "../../../shared/payment-routes";
import { useWorkspaceCurrency } from "../../components/WorkspaceCurrency";
import { studyCurrency } from "../../../shared/currency";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  GraduationCap,
  Landmark,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { tuitionQuote, type DecisionRoute } from "../../../convex/tuitionDecision";
import InfoHelp from "../../components/InfoHelp";

type Proposal = {
  recipient: string;
  amountMinor: number;
  totalMinor: number;
  feeMinor: number;
  fxRate: number;
  provider: string;
  delivery: string;
  expiresAt: number;
  status: string;
  sourceCurrency: string;
  targetCurrency: string;
};
export type EstimateData = {
  routes?: DecisionRoute[];
  selectedRoute?: string;
  countryFrom?: string;
  countryTo?: string;
  proposal?: Proposal;
};
const money = (value: number, currency: string) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value);
export default function PaymentEstimate({
  amount,
  recipient,
  data = {},
}: {
  amount?: number;
  recipient?: string;
  data?: EstimateData;
}) {
  const workspaceCurrency = useWorkspaceCurrency();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const proposal =
    data.proposal?.status !== "cancelled" ? data.proposal : undefined;
  const quotes = (data.routes ?? []).flatMap((route) => {
    try {
      return [{ ...route, ...tuitionQuote(amount ?? 0, route) }];
    } catch {
      return [];
    }
  });
  const selected = quotes.find((route) => route.key === data.selectedRoute);
  const quote = proposal ?? selected;
  if (!quote)
    return (
      <section
        className="automatic-estimate"
        aria-label="Automatic payment estimate"
      >
        <ReceiptText size={24} />
        <h2>No estimate yet</h2>
        <p>
          Save tuition details and select a route in Tuition to see your
          estimate here.
        </p>
      </section>
    );
  const source = proposal?.sourceCurrency ?? selected?.sourceCurrency ?? "USD",
    target =
      proposal?.targetCurrency ??
      selected?.targetCurrency ??
      (data.countryTo ? studyCurrency(data.countryTo) : workspaceCurrency);
  const received = proposal?.amountMinor ?? quote.amountMinor;
  const expiresAt = proposal?.expiresAt ?? selected?.quoteExpiresAt;
  const expired =
    proposal?.status !== "completed" && (!expiresAt || expiresAt <= now);
  return (
    <section
      className="automatic-estimate"
      aria-label="Automatic payment estimate"
    >
      <p className="estimate-saved-note">Calculated from your saved payment.</p>
      <div className="estimate-context">
        <div>
          <GraduationCap size={18} />
          <span>
            <small>Tuition · {target}</small>
            <strong>{money(received / 100, target)}</strong>
          </span>
        </div>
        <div>
          <Landmark size={18} />
          <span>
            <small>Recipient</small>
            <strong>{proposal?.recipient ?? recipient ?? "Not set"}</strong>
          </span>
        </div>
      </div>
      <div className="estimate-country-line">
        <span>
          {data.countryFrom || "Origin not set"} · {source}
        </span>
        <ArrowRight size={14} />
        <span>
          {data.countryTo || "Destination not set"} · {target}
        </span>
      </div>
      <div className="estimate-total">
        <span>
          <WalletCards size={17} />{" "}
          {proposal ? "Saved total" : "Estimated total"}
        </span>
        <strong>{money(quote.totalMinor / 100, source)}</strong>
        <small>
          {routeProviderName(quote.provider)} · {quote.delivery}
        </small>
      </div>
      <dl className="estimate-breakdown">
        <div>
          <dt>Tuition conversion</dt>
          <dd>{money((quote.totalMinor - quote.feeMinor) / 100, source)}</dd>
        </div>
        <div>
          <dt>
            Fees <InfoHelp term="Fees" />
          </dt>
          <dd>{money(quote.feeMinor / 100, source)}</dd>
        </div>
        <div>
          <dt>
            Rate <InfoHelp term="Exchange rate" />
          </dt>
          <dd>
            1 {source} = {quote.fxRate} {target}
          </dd>
        </div>
      </dl>
      {expired && (
        <p role="status" className="fx-error">
          Quote needs refresh in Tuition.
        </p>
      )}
      <small className="estimate-saved-note">
        Sandbox estimate · No real funds move.
      </small>
    </section>
  );
}
