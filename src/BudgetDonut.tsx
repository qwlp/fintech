import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useReducedMotion } from "motion/react";
import { formatMoney } from "./MoneyAmount";
import { formatGBP } from "./lib/finance";
function MeasuredChart({ children }: { children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const [sized, setSized] = useState(false);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setSized(entry.contentRect.width > 0 && entry.contentRect.height > 0),
    );
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={host} style={{ width: "100%", height: "100%", minWidth: 0 }}>
      {sized && children}
    </div>
  );
}
export const planChartColors = [
  "#315c85",
  "#4b8f8a",
  "#d4a35b",
  "#8c79ad",
  "#649bc0",
  "#c47e6a",
  "#859b62",
];
export default function BudgetDonut({
  costs,
  animated = false,
  currency = "GBP",
}: {
  costs: { name: string; amount: number }[];
  animated?: boolean;
  currency?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <MeasuredChart>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={costs.filter((item) => item.amount > 0)}
            dataKey="amount"
            nameKey="name"
            innerRadius="70%"
            outerRadius="94%"
            paddingAngle={2}
            stroke="none"
            isAnimationActive={animated && !reduced}
            animationDuration={850}
          >
            {costs
              .filter((item) => item.amount > 0)
              .map((item) => (
                <Cell
                  key={item.name}
                  fill={
                    planChartColors[
                      costs.findIndex((cost) => cost.name === item.name) %
                        planChartColors.length
                    ]
                  }
                />
              ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatMoney(Number(value), currency)}
            contentStyle={{
              background: "var(--color-surface, #fff)",
              border: "1px solid var(--color-line, #d8e0e8)",
              borderRadius: 8,
              color: "var(--color-ink, #0c1927)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </MeasuredChart>
  );
}

export function FundingSourcesChart({
  data,
  animated = false,
  compact = false,
}: {
  data: { name: string; amount: number; color: string }[];
  animated?: boolean;
  compact?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <MeasuredChart>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{
            top: 8,
            right: compact ? 10 : 32,
            bottom: compact ? 0 : 16,
            left: compact ? 0 : 8,
          }}
          barSize={compact ? 14 : 22}
        >
          <CartesianGrid
            horizontal={false}
            stroke="var(--color-line, #d8e0e8)"
            strokeDasharray="3 4"
          />
          <XAxis
            type="number"
            tickFormatter={(value) => `£${Number(value) / 1000}k`}
            tick={{ fill: "var(--color-muted, #4f637d)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={
              compact
                ? 65
                : Math.max(
                    130,
                    ...data.map((item) => item.name.length * 6.5 + 16),
                  )
            }
            tick={{ fill: "var(--color-muted, #4f637d)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--color-line, #d8e0e8)", fillOpacity: 0.25 }}
            formatter={(value) => [formatGBP(Number(value)), "Amount"]}
            contentStyle={{
              background: "var(--color-surface, #fff)",
              border: "1px solid var(--color-line, #d8e0e8)",
              borderRadius: 8,
              color: "var(--color-ink, #0c1927)",
            }}
          />
          <Bar
            dataKey="amount"
            radius={[0, 5, 5, 0]}
            isAnimationActive={animated && !reduced}
            animationDuration={800}
          >
            {data.map((item, i) => (
              <Cell key={`${item.name}-${i}`} fill={item.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </MeasuredChart>
  );
}
