import { routeProviderName } from "../../../shared/payment-routes";
import AgentFundingChange from "./AgentFundingChange";

export type ToolResult = { name: string; result: unknown };
const labels: Record<string, string> = {
  compare_payment_routes: "Tuition route comparison",
  stress_test_fx: "Currency stress scenario",
  simulate_budget: "Monthly budget scenario",
  prepare_tuition_payment: "Payment proposal",
  read_workspace: "Workspace details",
  update_tuition_details: "Tuition details",
  update_tuition_plan: "Tuition plan",
  update_move_plan: "Move Planner",
  update_profile: "Profile",
  update_budget_item: "Budget item",
  update_funding_source: "Funding source",
  select_payment_route: "Payment route",
  refresh_payment_quotes: "Sandbox quotes",
  set_checklist_item: "Checklist",
  create_rate_alert: "Rate alert",
  add_country_account: "Country account",
};
const money = (value: unknown, currency: string) =>
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
        value,
      )
    : "Unavailable";
export default function AgentCalculation({ tool }: { tool: ToolResult }) {
  if (
    !tool.result ||
    typeof tool.result !== "object" ||
    Array.isArray(tool.result)
  )
    return null;
  const result = tool.result as Record<string, any>;
  if (
    result.executionId &&
    ["pending_confirmation", "saved", "cancelled"].includes(result.status)
  ) {
    return <AgentFundingChange initial={result as any} />;
  }
  return (
    <details className="agent-calculation">
      <summary>
        {labels[tool.name] ?? "Tool details"} ·{" "}
        {result.status === "saved" ? "saved" : "recorded result"}
      </summary>
      {typeof result.error === "string" ? (
        <p>Action could not complete: {result.error}</p>
      ) : (
        <>
          {result.status === "saved" && (
            <>
              <p>Your requested changes were saved.</p>
              <SavedChanges
                changes={result.changes}
                currency={result.currency ?? "GBP"}
              />
            </>
          )}
          {tool.name === "read_workspace" && (
            <p>
              Read the latest saved profile, tuition, Move Planner, budget and
              funding details. No records changed.
            </p>
          )}
          {tool.name === "compare_payment_routes" && (
            <>
              <p>{result.explanation}</p>
              <p>
                Deadline: {result.deadline ?? "Not set"} · Buffer:{" "}
                {result.bufferBusinessDays} business day(s). Recipient receives{" "}
                {money(result.recipientAmountGBP, result.currency ?? "GBP")}.
              </p>
              <div className="assistant-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Total source currency</th>
                      <th>Buffered arrival</th>
                      <th>Living funds remaining</th>
                      <th>Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(result.routes) &&
                      result.routes.map((route: any) => (
                        <tr key={route.routeKey}>
                          <td>{routeProviderName(route.provider)}</td>
                          <td>
                            {money(
                              route.totalUSD,
                              route.sourceCurrency ?? "USD",
                            )}
                          </td>
                          <td>{route.estimatedArrival ?? "Unknown"}</td>
                          <td>
                            {money(
                              route.remainingGBP,
                              result.currency ?? "GBP",
                            )}
                          </td>
                          <td>
                            {route.eligible
                              ? "Meets plan"
                              : Array.isArray(route.blockers)
                                ? route.blockers.join("; ")
                                : "Blocked"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p>{result.assumptions}</p>
            </>
          )}
          {tool.name === "stress_test_fx" && (
            <p>
              {result.adversePercent}% adverse scenario:{" "}
              {money(result.currentGBP, result.currency ?? "GBP")} →{" "}
              {money(result.stressedGBP, result.currency ?? "GBP")}.
              Hypothetical loss:{" "}
              {money(result.lossGBP, result.currency ?? "GBP")}.
            </p>
          )}
          {tool.name === "simulate_budget" && (
            <p>
              Monthly rent:{" "}
              {money(result.monthlyRent, result.currency ?? "GBP")}. Other
              monthly costs:{" "}
              {money(result.otherMonthly, result.currency ?? "GBP")}. Total
              monthly spending:{" "}
              {money(result.monthlyBurn, result.currency ?? "GBP")}. Runway:{" "}
              {typeof result.runwayMonths === "number"
                ? result.runwayMonths.toFixed(1) + " months"
                : "No finite estimate"}
              .
            </p>
          )}
          {tool.name === "prepare_tuition_payment" && result.proposal && (
            <p>
              Proposal {result.proposal.status}:{" "}
              {routeProviderName(result.proposal.provider)}. Recipient receives{" "}
              {money(
                result.proposal.amountGBP,
                result.proposal.targetCurrency ?? result.currency ?? "GBP",
              )}
              ; total{" "}
              {money(
                result.proposal.totalUSD,
                result.proposal.sourceCurrency ?? "USD",
              )}
              . Review and approve in Payments. No funds moved.
            </p>
          )}
          {tool.name !== "compare_payment_routes" &&
            typeof result.assumptions === "string" && (
              <p>{result.assumptions}</p>
            )}
          <small>
            {result.status === "saved"
              ? "Workspace records updated. No funds moved."
              : result.status === "read"
                ? "Current workspace records."
                : result.sandbox
                  ? "Simulated account data. No real funds move."
                  : "Hypothetical calculation; account records stay unchanged."}{" "}
            Check these values separately from the AI’s explanation.
          </small>
        </>
      )}
    </details>
  );
}

const fieldLabels: Record<string, string> = {
  budgetAmounts: "Planner costs",
  plannerSettings: "Planner settings",
  totals: "Planner totals",
  source: "Funding source",
  amount: "Amount",
  confirmedFunding: "Total confirmed funding",
  fundingAmount: "Total confirmed funding",
  livingReserve: "Living reserve",
  protectedReserveGBP: "Living reserve",
  last4: "Recipient account last four digits",
  recipientConfirmed: "Recipient confirmed",
  arrivalDate: "Arrival date",
  months: "Academic months",
  excludedCosts: "Excluded costs",
  selectedRoute: "Selected route",
};
function SavedChanges({
  changes,
  currency,
  monetary = false,
}: {
  changes: unknown;
  currency: string;
  monetary?: boolean;
}) {
  if (!changes || typeof changes !== "object") return null;
  return (
    <dl className="agent-saved-changes">
      {Object.entries(changes).map(([key, value]) => (
        <div key={key}>
          <dt>
            {fieldLabels[key] ??
              key
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (letter) => letter.toUpperCase())}
          </dt>
          <dd>
            {value && typeof value === "object" && !Array.isArray(value) ? (
              <SavedChanges
                changes={value}
                currency={currency}
                monetary={key === "budgetAmounts"}
              />
            ) : Array.isArray(value) ? (
              value.length ? (
                value.map((item, index) =>
                  item && typeof item === "object" ? (
                    <SavedChanges
                      key={index}
                      changes={item}
                      currency={currency}
                    />
                  ) : (
                    <span key={index}>
                      {index ? ", " : ""}
                      {String(item)}
                    </span>
                  ),
                )
              ) : (
                "None"
              )
            ) : typeof value === "number" &&
              (monetary ||
                [
                  "amount",
                  "confirmedFunding",
                  "fundingAmount",
                  "livingReserve",
                  "protectedReserveGBP",
                  "total",
                  "subtotal",
                  "arrival",
                  "monthly",
                  "daily",
                  "deposit",
                  "visaPackage",
                ].includes(key)) ? (
              money(value, currency)
            ) : typeof value === "boolean" ? (
              value ? (
                "Yes"
              ) : (
                "No"
              )
            ) : (
              String(value ?? "Not set")
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
