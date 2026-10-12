import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { convertMoney, walletValue } from "../../../shared/currency";
import { useWorkspaceCurrency, useWorkspaceMoney } from "../../components/WorkspaceCurrency";
import { StaticForecastChart } from "../../components/charts/ForecastCharts";
import type { DatabaseState } from "../../types/database";

function WorkspaceHeader({
  number,
  title,
  description,
  tabs,
  active,
  setActive,
}: {
  number: number;
  title: string;
  description: string;
  tabs: string[];
  active: string;
  setActive: (tab: string) => void;
}) {
  return (
    <>
      <section className="workspace-title">
        <div><h2>{title}</h2></div>
      </section>
      <nav className="workspace-tabs" aria-label={`${title} views`}>
        {tabs.map((tab) => (
          <button
            className={active === tab ? "active" : ""}
            aria-pressed={active === tab}
            onClick={() => setActive(tab)}
            key={tab}
          >
            {tab}
          </button>
        ))}
      </nav>
    </>
  );
}

export function RunwayWorkspace({ database }: { database: DatabaseState | null }) {
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();
  const [tab, setTab] = useState("Forecast");
  const [extra, setExtra] = useState(() => convertMoney(250, "GBP", currency));

  const recurring = database?.costs.filter((item) => item.category === "Recurring") ?? [];
  const baseBurn =
    recurring.reduce((sum, item) => sum + item.amount / 12, 0) ||
    convertMoney(1300, "GBP", currency);
  const liquid =
    database?.wallets.reduce((sum, item) => sum + walletValue(item, currency), 0) ??
    convertMoney(8900, "GBP", currency);
  const burnRate = baseBurn + extra;
  const months = liquid / burnRate;
  const currentMonths = liquid / baseBurn;
  const bills = (database?.costs ?? []).map((item) => [
    item.due,
    item.name,
    formatMoney(item.amount),
  ]);

  return (
    <div className="workspace">
      <WorkspaceHeader
        number={2}
        title="Runway planner"
        description="Forecast when money arrives, when it leaves, and where the plan becomes tight."
        tabs={["Forecast", "Scenarios", "Bills"]}
        active={tab}
        setActive={setTab}
      />
      {tab === "Forecast" && (
        <div className="workspace-grid">
          <section className="workspace-primary">
            <div className="panel-head">
              <div>
                <span>Projected liquid balance</span>
                <h3>September 2026—February 2027</h3>
              </div>
              <strong>{currentMonths.toFixed(1)} months</strong>
            </div>
            <StaticForecastChart />
          </section>
          <aside className="workspace-side">
            <h3>Pressure points</h3>
            <div className="signal danger">
              <span>12 Oct</span>
              <strong>{formatMoney(convertMoney(2000, "GBP", currency))} tuition</strong>
              <p>Largest outgoing payment in the next 30 days.</p>
            </div>
            <div className="signal">
              <span>15 Nov</span>
              <strong>{formatMoney(convertMoney(1000, "GBP", currency))} arriving</strong>
              <p>Parent sponsor contribution confirmed.</p>
            </div>
            <button onClick={() => setTab("Scenarios")}>
              Stress-test this plan <ArrowRight />
            </button>
          </aside>
        </div>
      )}
      {tab === "Scenarios" && (
        <div className="scenario-workspace">
          <label>
            Additional monthly spending <strong>{formatMoney(extra)}</strong>
            <input
              type="range"
              min="0"
              max={convertMoney(900, "GBP", currency)}
              step={convertMoney(25, "GBP", currency)}
              value={extra}
              onChange={(e) => setExtra(Number(e.target.value))}
            />
          </label>
          <div className="scenario-compare">
            <div>
              <span>Current plan</span>
              <strong>{currentMonths.toFixed(1)} months</strong>
              <small>{formatMoney(baseBurn)} / month</small>
            </div>
            <ArrowRight />
            <div>
              <span>Adjusted plan</span>
              <strong>{months.toFixed(1)} months</strong>
              <small>{formatMoney(burnRate)} / month</small>
            </div>
          </div>
          <p className="workspace-note">
            Every extra {formatMoney(convertMoney(100, "GBP", currency))} per month removes
            approximately{" "}
            {(currentMonths - liquid / (baseBurn + convertMoney(100, "GBP", currency))).toFixed(1)}{" "}
            months of simple runway over this period.
          </p>
        </div>
      )}
      {tab === "Bills" && (
        <section className="data-panel">
          <div className="data-head">
            <span>Date</span>
            <span>Obligation</span>
            <span>Amount</span>
          </div>
          {bills.map((row) => (
            <div className="data-row" key={row[0] + row[1]}>
              <span>{row[0]}</span>
              <strong>{row[1]}</strong>
              <b className={row[2].startsWith("+") ? "positive" : ""}>{row[2]}</b>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
