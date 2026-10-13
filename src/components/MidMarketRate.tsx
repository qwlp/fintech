import { deployment } from "../lib/deployment";
import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Button } from "./ui/button";
import "../styles/mid-market-rate.css";

type Observation = { date: string; base: string; quote: string; rate: number };
const cache = new Map<string, { fetchedAt: number; rates: Observation[] }>();

export default function MidMarketRate({
  source,
  target,
}: {
  source: string;
  target: string;
}) {
  const [data, setData] = useState<{
    pair: string;
    rates: Observation[];
  } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const pair = `${source}/${target}`;
  useEffect(() => {
    setFailed(false);
    const controller = new AbortController();
    let active = true;
    const today = new Date().toISOString().slice(0, 10);
    if (source === target) {
      setData({
        pair,
        rates: [{ date: today, base: source, quote: target, rate: 1 }],
      });
      return;
    }
    const cached = cache.get(pair);
    if (
      attempt === 0 &&
      cached &&
      Date.now() - cached.fetchedAt < 15 * 60_000
    ) {
      setData({ pair, rates: cached.rates });
      return;
    }
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const from = new Date(Date.now() - 14 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    void (async () => {
      try {
        if (!deployment.fxRatesUrl)
          throw new Error("Rate service is not configured");
        const url = new URL(deployment.fxRatesUrl, window.location.origin);
        url.searchParams.set("base", source);
        url.searchParams.set("quotes", target);
        url.searchParams.set("from", from);
        url.searchParams.set("to", today);
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("Rate unavailable");
        const payload: unknown = await response.json();
        if (!Array.isArray(payload)) throw new Error("Invalid rate data");
        let rates = payload
          .filter(
            (row): row is Observation =>
              row &&
              row.base === source &&
              row.quote === target &&
              typeof row.date === "string" &&
              /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
              Number.isFinite(row.rate) &&
              row.rate > 0,
          )
          .sort((a, b) => a.date.localeCompare(b.date));
        if (!rates.length) {
          // A date window may contain no observations (holidays or clock skew).
          url.searchParams.delete("from");
          url.searchParams.delete("to");
          const latestResponse = await fetch(url, {
            signal: controller.signal,
          });
          if (!latestResponse.ok) throw new Error("Rate unavailable");
          const latestPayload: unknown = await latestResponse.json();
          if (Array.isArray(latestPayload)) {
            rates = latestPayload
              .filter(
                (row): row is Observation =>
                  row &&
                  row.base === source &&
                  row.quote === target &&
                  typeof row.date === "string" &&
                  /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
                  Number.isFinite(row.rate) &&
                  row.rate > 0,
              )
              .sort((a, b) => a.date.localeCompare(b.date));
          }
        }
        if (!rates.length) throw new Error("No rates available");
        if (active) {
          cache.set(pair, { fetchedAt: Date.now(), rates });
          setData({ pair, rates });
        }
      } catch {
        if (active) setFailed(true);
      } finally {
        clearTimeout(timeout);
      }
    })();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [source, target, pair, attempt]);

  const rates = data?.pair === pair && !failed ? data.rates : [];
  const latest = rates.at(-1);
  const previous = rates.at(-2);
  const change =
    latest && previous ? (latest.rate / previous.rate - 1) * 100 : null;
  const low = Math.min(...rates.map((row) => row.rate));
  const high = Math.max(...rates.map((row) => row.rate));
  const points = rates
    .map(
      (row, i) =>
        `${4 + (i / Math.max(1, rates.length - 1)) * 96},${36 - ((row.rate - low) / (high - low || 1)) * 28}`,
    )
    .join(" ");

  return (
    <aside className="mid-market-rate" aria-label="Mid-market exchange rate">
      <div className="mid-market-rate-copy">
        <span className="mid-market-rate-label">Mid-market exchange rate</span>
        <strong aria-live="polite">
          {latest
            ? `1 ${source} = ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(latest.rate)} ${target}`
            : failed
              ? "Rate unavailable"
              : `Loading ${source} → ${target}…`}
        </strong>
        {latest && (
          <small>
            {change !== null && (
              <span className="mid-market-rate-change">
                {change >= 0 ? (
                  <ArrowUpRight size={13} />
                ) : (
                  <ArrowDownRight size={13} />
                )}
                {change >= 0 ? "+" : ""}
                {change.toFixed(2)}% vs. {previous!.date}
              </span>
            )}
            <span>Daily reference · {latest.date}</span>
          </small>
        )}
      </div>
      {rates.length > 1 && (
        <svg
          className="mid-market-rate-chart"
          data-direction={
            change !== null && change > 0
              ? "up"
              : change !== null && change < 0
                ? "down"
                : "flat"
          }
          viewBox="0 0 104 44"
          role="img"
          aria-label={`${source} to ${target} rate trend from ${rates[0].date} to ${latest!.date}`}
        >
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <div className="mid-market-rate-actions">
        {(failed || (latest && source !== target)) && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={
              failed ? "Retry exchange rate" : "Refresh exchange rate"
            }
            onClick={() => {
              setData(null);
              setAttempt((value) => value + 1);
            }}
          >
            <RefreshCw size={13} aria-hidden="true" />{" "}
            {failed ? "Retry" : "Refresh rate"}
          </Button>
        )}
        {deployment.fxSourceUrl && (
          <a
            className="mid-market-rate-source"
            href={deployment.fxSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${deployment.fxSourceLabel} (opens in a new tab)`}
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </aside>
  );
}
