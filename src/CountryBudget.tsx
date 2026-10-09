import { getCountry } from "../shared/study";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Globe2, Minus, Plus } from "lucide-react";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import BudgetDonut, { planChartColors } from "./BudgetDonut";
import MoneyAmount, { formatMoney } from "./MoneyAmount";
const destinations = [
  {
    name: "United Kingdom",
    tuition: "6000",
    living: "1000",
    funding: "12000",
  },
  {
    name: "United States",
    tuition: "18000",
    living: "1500",
    funding: "24000",
  },
  {
    name: "China",
    tuition: "40000",
    living: "5000",
    funding: "80000",
  },
].map((destination) => ({ ...destination, ...getCountry(destination.name)! }));
type Budget = {
  tuition: string;
  living: string;
  funding: string;
  months: string;
};
export default function CountryBudget() {
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState(0);
  const [automatic, setAutomatic] = useState(!reduced);
  const [visible, setVisible] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>(() =>
    destinations.map((d) => ({ ...d, months: "12" })),
  );
  const host = useRef<HTMLElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.3 },
    );
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!automatic || !visible || reduced) return;
    const interval = setInterval(() => {
      if (!document.hidden) setSelected((v) => (v + 1) % destinations.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [automatic, visible, reduced]);
  const country = destinations[selected],
    budget = budgets[selected];
  const number = (n: string) => Math.max(0, Number(n) || 0);
  const tuition = number(budget.tuition),
    living = number(budget.living) * number(budget.months),
    funding = number(budget.funding);
  const total = tuition + living,
    gap = Math.max(0, total - funding),
    coverage = total ? Math.min(100, (funding / total) * 100) : 0;
  const update = (field: keyof Budget, value: string) => {
    setAutomatic(false);
    setBudgets((rows) =>
      rows.map((row, i) => (i === selected ? { ...row, [field]: value } : row)),
    );
  };
  const costs = [
    { name: "Tuition", amount: tuition },
    { name: "Living", amount: living },
  ];
  return (
    <section
      ref={host}
      className="country-budget"
      aria-labelledby="budget-heading"
    >
      <header className="country-budget-header">
        <h2 id="budget-heading">Try a study budget.</h2>
        <span>Editable sample</span>
      </header>
      <div
        className="country-budget-tabs"
        role="tablist"
        aria-label="Study destination"
      >
        {destinations.map((d, i) => (
          <button
            type="button"
            key={d.code}
            role="tab"
            id={`country-tab-${d.code}`}
            aria-controls="country-budget-panel"
            aria-selected={selected === i}
            tabIndex={selected === i ? 0 : -1}
            onClick={() => {
              setSelected(i);
              setAutomatic(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const next =
                  (i + (e.key === "ArrowRight" ? 1 : destinations.length - 1)) %
                  destinations.length;
                setSelected(next);
                setAutomatic(false);
                (
                  e.currentTarget.parentElement?.children[next] as HTMLElement
                )?.focus();
              }
            }}
          >
            <img
              className="country-flag"
              src={`/flags/${d.code}.svg`}
              alt=""
              aria-hidden="true"
            />
            <span>{d.name}</span>
            {selected === i && (
              <motion.i
                className="country-active-line"
                layoutId="country-selection"
                transition={{ duration: reduced ? 0 : 0.3 }}
              />
            )}
          </button>
        ))}
      </div>
      <div
        className="country-budget-panel"
        id="country-budget-panel"
        role="tabpanel"
        aria-labelledby={`country-tab-${country.code}`}
      >
        <div className="country-budget-editor">
          <div className="country-budget-currency">
            <Globe2 size={17} />
            <strong>{country.name}</strong>
            <span>{country.currency}</span>
          </div>
          <div className="home-budget-inputs">
            {(
              [
                { field: "tuition", label: "Annual tuition" },
                { field: "living", label: "Monthly living costs" },
                { field: "months", label: "Months abroad" },
                { field: "funding", label: "Confirmed funding" },
              ] as const
            ).map(({ field, label }) => (
              <div className="budget-field" key={field}>
                <label htmlFor={`country-budget-${field}`}>{label}</label>
                <span className="budget-number-control">
                  <Input
                    type="number"
                    id={`country-budget-${field}`}
                    min="0"
                    max={field === "months" ? 120 : undefined}
                    value={budget[field]}
                    onChange={(e) => update(field, e.target.value)}
                  />
                  <span className="budget-number-actions">
                    {[-1, 1].map((direction) => (
                      <Button
                        key={direction}
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`${direction < 0 ? "Decrease" : "Increase"} ${label.toLowerCase()}`}
                        disabled={
                          (direction < 0 && number(budget[field]) === 0) ||
                          (direction > 0 &&
                            field === "months" &&
                            number(budget[field]) >= 120)
                        }
                        onClick={() =>
                          update(
                            field,
                            String(
                              Math.min(
                                field === "months" ? 120 : Infinity,
                                Math.max(
                                  0,
                                  number(budget[field]) +
                                    direction *
                                      (field === "months"
                                        ? 1
                                        : field === "living"
                                          ? 50
                                          : 500),
                                ),
                              ),
                            ),
                          )
                        }
                      >
                        {direction < 0 ? (
                          <Minus size={14} />
                        ) : (
                          <Plus size={14} />
                        )}
                      </Button>
                    ))}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className="country-budget-coverage">
            <span>{Math.round(coverage)}% funded</span>
            <div
              role="progressbar"
              aria-label="Budget funding coverage"
              aria-valuenow={Math.round(coverage)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <motion.i
                animate={{ scaleX: coverage / 100 }}
                transition={{ duration: reduced ? 0 : 0.65 }}
              />
            </div>
          </div>
        </div>
        <div className="country-budget-visual">
          <div
            className="country-budget-donut"
            role="img"
            aria-label={`Tuition ${formatMoney(tuition, country.currency)}, living ${formatMoney(living, country.currency)}`}
          >
            <BudgetDonut costs={costs} animated currency={country.currency} />
            <div className="country-budget-donut-label">
              <span>{country.currency}</span>
              <strong>Study year</strong>
            </div>
          </div>
          <div className="country-budget-legend">
            {costs.map((item, i) => (
              <span key={item.name}>
                <i style={{ background: planChartColors[i] }} />
                {item.name}
              </span>
            ))}
          </div>
          <dl className="home-budget-results">
            <div>
              <dt>Estimated total</dt>
              <dd key={`total-${country.currency}`}>
                <MoneyAmount value={total} currency={country.currency} />
              </dd>
            </div>
            <div>
              <dt>Still to fund</dt>
              <dd key={`gap-${country.currency}`}>
                <MoneyAmount value={gap} currency={country.currency} />
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <p className="country-budget-note">
        Sample figures, not local cost estimates. Tuition + living only. Not
        saved.
      </p>
    </section>
  );
}
