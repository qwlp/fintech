export type ToolResult = { name: string; result: unknown };
const labels: Record<string, string> = {
  compare_payment_routes: "Tuition route comparison",
  stress_test_fx: "Currency stress scenario",
  simulate_budget: "Monthly budget scenario",
  prepare_tuition_payment: "Payment proposal",
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
  return (
    <details className="agent-calculation">
      <summary>
        {labels[tool.name] ?? "Calculation details"} · recorded result
      </summary>
      {typeof result.error === "string" ? (
        <p>Calculation could not complete: {result.error}</p>
      ) : (
        <>
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
                          <td>{route.provider}</td>
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
              Proposal {result.proposal.status}: {result.proposal.provider}.
              Recipient receives{" "}
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
            {result.sandbox
              ? "Simulated account data. No real funds move."
              : "Hypothetical calculation; account records stay unchanged."}{" "}
            Check these values separately from the AI’s explanation.
          </small>
        </>
      )}
    </details>
  );
}
