import { convertMoney } from "../../../shared/currency";
import {
  useWorkspaceCurrency,
  useWorkspaceMoney,
} from "../../WorkspaceCurrency";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function BalanceForecastChart() {
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();

  const months = [
    { m: "Sep", v: 7000, t: "Deposit + arrival" },
    { m: "Oct", v: 3500, t: "Tuition + living" },
    { m: "Nov", v: 1300, t: "Living" },
    { m: "Dec", v: 1300, t: "Living" },
    { m: "Jan", v: 3300, t: "Tuition + living" },
    { m: "Feb", v: 1300, t: "Living" },
  ].map((month) => ({ ...month, v: convertMoney(month.v, "GBP", currency) }));

  return (
    <div className="timeline-chart" aria-label="Six month cash-flow outlook">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={months}
          margin={{ top: 12, right: 8, left: -18, bottom: 0 }}
        >
          <defs>
            <linearGradient id="cashFlowFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-dusty-denim-500)"
                stopOpacity={0.28}
              />
              <stop
                offset="100%"
                stopColor="var(--color-dusty-denim-500)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--color-line)"
            strokeDasharray="3 4"
          />
          <XAxis
            dataKey="m"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-muted)", fontSize: 10 }}
            tickFormatter={(value) => formatMoney(value)}
          />
          <Tooltip
            itemStyle={{ color: "var(--color-ink)" }}
            formatter={(value) => [formatMoney(Number(value)), "Planned outflow"]}
            labelFormatter={(_, payload) => payload[0]?.payload?.t ?? ""}
            contentStyle={{
              background: "var(--color-surface)",
              color: "var(--color-ink)",
              border: "1px solid var(--color-line)",
              borderRadius: 8,
              boxShadow:
                "0 12px 30px color-mix(in srgb, var(--color-ink-black-900) 9.4%, transparent)",
              fontSize: 11,
            }}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke="var(--color-dusty-denim-500)"
            strokeWidth={2.5}
            fill="url(#cashFlowFill)"
            activeDot={{
              r: 5,
              fill: "var(--color-ink-black-500)",
              stroke: "var(--color-alabaster-grey-50)",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StaticForecastChart() {
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();

  const monthLabels = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
  return (
    <div
      className="balance-chart"
      role="img"
      aria-label={`Projected balance falls from ${formatMoney(convertMoney(8900, "GBP", currency))} in September to ${formatMoney(convertMoney(3000, "GBP", currency))} in February`}
    >
      <svg
        className="forecast-svg"
        viewBox="0 0 760 240"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity=".28" />
            <stop offset="1" stopColor="currentColor" stopOpacity=".02" />
          </linearGradient>
        </defs>
        {[30, 85, 140, 195].map((y, index) => (
          <g key={y}>
            <line x1="54" x2="748" y1={y} y2={y} className="forecast-grid" />
            <text x="0" y={y + 4} className="forecast-axis">
              {formatMoney(convertMoney((10 - index * 2.5) * 1000, "GBP", currency))}
            </text>
          </g>
        ))}
        <path
          className="forecast-area"
          d="M54 54 C105 78 145 105 193 118 S288 125 332 128 S430 136 470 150 S565 184 610 192 S700 204 748 210 L748 218 L54 218 Z"
        />
        <path
          className="forecast-line"
          d="M54 54 C105 78 145 105 193 118 S288 125 332 128 S430 136 470 150 S565 184 610 192 S700 204 748 210"
        />
        {monthLabels.map((month, index) => (
          <text
            key={month}
            x={54 + (694 / 5) * index}
            y="237"
            textAnchor={index === 0 ? "start" : index === 5 ? "end" : "middle"}
            className="forecast-label"
          >
            {month}
          </text>
        ))}
      </svg>
    </div>
  );
}
