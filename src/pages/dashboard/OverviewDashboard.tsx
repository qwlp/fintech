import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  GraduationCap,
  WalletCards,
} from "lucide-react";
import BudgetDonut, { planChartColors } from "../../components/BudgetDonut";
import {
  useWorkspaceCurrency,
  useWorkspaceMoney,
} from "../../components/WorkspaceCurrency";
import { calculateMove } from "../../../shared/move-planner";
import {
  funding as fallbackFunding,
  costs as fallbackCosts,
} from "../../lib/data";
import {
  fundingGap,
  fundingCoverage,
  runway,
  resolvePlanFunding,
} from "../../lib/finance";
import type { DatabaseState, Page } from "../../types/database";

export function OverviewDashboard({
  paid,
  go,
  database,
}: {
  paid: boolean;
  go: (page: Page) => void;
  database: DatabaseState | null;
}) {
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();

  const planCosts = database?.costs ?? fallbackCosts;
  const { sources: planFunding, total: fundedTotal } = resolvePlanFunding(
    database?.funding ?? fallbackFunding,
    database?.config?.profile?.fundingAmount,
  );
  const planTotal = planCosts.reduce((sum, item) => sum + item.amount, 0);
  const hasBudget = planTotal > 0;
  const confirmed = planFunding.filter((item) => item.status === "confirmed");
  const gap = fundingGap(planTotal, fundedTotal);
  const coverage = fundingCoverage(planTotal, fundedTotal);
  const move = database?.config?.move;
  const savedMove = move?.plannerSettings
    ? calculateMove(
        move.budgetAmounts ?? {},
        move.months ?? 12,
        move.plannerSettings,
        move.excludedCosts ?? [],
      )
    : null;
  const monthlyEssentials = savedMove
    ? savedMove.monthly +
      (move.excludedCosts?.includes("rent")
        ? 0
        : (move.budgetAmounts?.rent ?? 0))
    : planCosts
        .filter(
          (item) =>
            item.category === "Recurring" &&
            !item.name.toLowerCase().includes("tuition"),
        )
        .reduce((sum, item) => sum + item.amount, 0) / 12;
  const liquidSavings = confirmed
    .filter((item) => item.type.toLowerCase() === "savings")
    .reduce((sum, item) => sum + item.amount, 0);
  const tuition = planCosts.find((item) =>
    item.name.toLowerCase().includes("tuition"),
  );
  const tuitionPaid = paid || tuition?.paid;
  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 18
        ? "Good afternoon"
        : "Good evening";

  return (
    <div className="consumer-dashboard visual-dashboard">
      <section className="consumer-welcome">
        <div>
          <span>
            {new Intl.DateTimeFormat("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date())}
          </span>
          <h2>
            {greeting}, {database?.account.name.split(" ")[0] ?? "there"}
          </h2>
        </div>
      </section>

      <div className="overview-top">
        <section
          className="funding-overview"
          data-tour="readiness"
          aria-labelledby="funding-heading"
        >
          <h3 id="funding-heading">Funding</h3>
          <div className="funding-amount">
            <strong>{formatMoney(fundedTotal)}</strong>
            <span>{hasBudget ? `of ${formatMoney(planTotal)}` : "saved"}</span>
          </div>
          {hasBudget && (
            <div className="funding-progress-label">
              <span>{Math.round(coverage)}% funded</span>
              <span>
                {gap > 0
                  ? `${formatMoney(gap)} left to fund`
                  : "Funding goal reached"}
              </span>
            </div>
          )}
          {hasBudget && (
            <div
              className="funding-progress"
              role="progressbar"
              aria-label="Study plan funded"
              aria-valuenow={Math.round(coverage)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <i style={{ width: `${coverage}%` }} />
            </div>
          )}
          {!hasBudget && (
            <div className="budget-setup">
              <p>Add costs to see your funding gap.</p>
              <button
                className="dashboard-primary"
                onClick={() => go("Move Planner")}
              >
                Set your budget <ArrowRight size={16} />
              </button>
            </div>
          )}
          {hasBudget && (
            <dl className="plan-facts">
              <div>
                <dt>
                  <Clock3 size={15} /> Savings runway
                </dt>
                <dd>
                  {monthlyEssentials > 0 && liquidSavings > 0
                    ? runway(liquidSavings, monthlyEssentials).toFixed(1)
                    : "—"}
                  <span> months</span>
                </dd>
              </div>
              <div>
                <dt>
                  <WalletCards size={15} /> Monthly essentials
                </dt>
                <dd>
                  {monthlyEssentials > 0 ? formatMoney(monthlyEssentials) : "—"}
                </dd>
              </div>
            </dl>
          )}
        </section>
        {tuition && (
          <section
            className="payment-summary"
            data-tour="next-action"
            aria-labelledby="tuition-heading"
          >
            <h3 id="tuition-heading">
              <GraduationCap size={19} />{" "}
              {tuitionPaid ? "Tuition paid" : "Tuition payment"}
            </h3>
            <strong>{formatMoney(tuition.amount)}</strong>
            <span className="payment-schedule">
              {tuitionPaid ? (
                <CheckCircle2 size={15} />
              ) : (
                <CalendarDays size={15} />
              )}
              {tuitionPaid ? "Receipt available" : tuition.due}
            </span>
            <button
              className="dashboard-primary"
              onClick={() => go("Payments")}
            >
              {tuitionPaid ? "View receipt" : "Review payment"}
              <ArrowRight size={16} />
            </button>
          </section>
        )}
      </div>

      <div className="budget-funding-grid">
        <section className="visual-budget" aria-labelledby="budget-heading">
          <div className="visual-card-head">
            <h3 id="budget-heading">Planned spending</h3>
            <button onClick={() => go("Move Planner")}>
              {hasBudget ? "Edit plan" : "Create plan"} <ArrowRight size={15} />
            </button>
          </div>
          {hasBudget ? (
            <div className="budget-breakdown">
              <figure
                className="spending-chart"
                aria-label={`Spending breakdown. Total budget ${formatMoney(planTotal)}.`}
              >
                <div className="spending-donut">
                  <BudgetDonut currency={currency} costs={planCosts} />
                  <div className="donut-total">
                    <span>Total budget</span>
                    <strong>{formatMoney(planTotal)}</strong>
                    <span>{`${move?.months ?? 12}-month plan`}</span>
                  </div>
                </div>
              </figure>
              <div
                className="budget-table"
                role="table"
                aria-label="Planned spending by category"
              >
                <div className="budget-table-head" role="row">
                  <span role="columnheader">Category</span>
                  <span role="columnheader">Share</span>
                  <span role="columnheader">Budget</span>
                </div>
                {planCosts.map((item, index) => {
                  const share =
                    planTotal > 0 ? (item.amount / planTotal) * 100 : 0;
                  const isPaid = item.paid || (paid && item === tuition);
                  return (
                    <div
                      className="budget-table-row"
                      role="row"
                      key={item.name}
                    >
                      <span className="budget-category" role="cell">
                        <span
                          className="chart-legend-dot"
                          style={{
                            background:
                              planChartColors[index % planChartColors.length],
                          }}
                          aria-hidden="true"
                        />
                        <span>{item.name}</span>
                        {isPaid && (
                          <Check
                            size={14}
                            aria-label="Paid"
                            className="budget-paid"
                          />
                        )}
                      </span>
                      <span className="budget-distribution" role="cell">
                        <span>{Math.round(share)}%</span>
                      </span>
                      <strong role="cell">{formatMoney(item.amount)}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="funding-empty">No costs added yet.</p>
          )}
        </section>
        <section className="visual-funding" aria-labelledby="sources-heading">
          <div className="visual-card-head">
            <h3 id="sources-heading">Funding sources</h3>
            <button onClick={() => go("Profile")}>
              Manage <ArrowRight size={15} />
            </button>
          </div>
          {hasBudget && (
            <div className="funding-coverage-summary">
              <div>
                <strong>{Math.round(coverage)}%</strong>
                <span>of budget covered</span>
              </div>
              <div
                className="funding-coverage-track"
                role="img"
                aria-label={`${Math.round(coverage)}% confirmed, ${formatMoney(gap)} still to fund`}
              >
                <i style={{ width: `${coverage}%` }} />
              </div>
            </div>
          )}
          <div className="funding-source-list">
            {planFunding.map((item) => (
              <div className="funding-source" key={item.name}>
                <div>
                  <span>{item.name}</span>
                  <strong>{formatMoney(item.amount)}</strong>
                </div>
                <span className="source-availability">
                  {item.status === "confirmed"
                    ? item.available
                    : "Not yet confirmed"}
                </span>
              </div>
            ))}
          </div>
          {planFunding.length === 0 && (
            <p className="funding-empty">No funding sources yet.</p>
          )}
          {gap > 0 && (
            <div className="funding-gap">
              <div>
                <span>Still to fund</span>
                <strong>{formatMoney(gap)}</strong>
              </div>
              <button onClick={() => go("AI Agent")}>
                Find funding <ArrowRight size={15} />
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
