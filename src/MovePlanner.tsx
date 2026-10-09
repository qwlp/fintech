import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Wallet,
  Plane,
  FileCheck,
  GraduationCap,
  House,
  ShieldCheck,
  BookOpen,
  Package,
  Coffee,
  HandCoins,
  Check,
  ChevronRight,
  SlidersHorizontal,
  Layers,
  Info,
  Save,
  ArrowRight,
  Bus,
  Phone,
  Shirt,
  Utensils,
  HeartPulse,
  Fingerprint,
  BadgePercent,
  UserRound,
  Clock,
} from "lucide-react";
import profiles from "../shared/move-planner-data.json";
import {
  calculateMove,
  moveFields,
  migrateMoveAmounts,
  defaultMoveSettings,
  type MoveSettings,
  type MoveField,
} from "../shared/move-planner";
import { convertMoney } from "../shared/currency";
import { useWorkspaceCurrency, useWorkspaceMoney } from "./WorkspaceCurrency";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Checkbox } from "./components/ui/checkbox";
import { DatePicker } from "./components/ui/date-picker";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./components/ui/select";
import BudgetDonut from "./BudgetDonut";
import { convexApi, convexClient } from "./lib/convex";
import "./move-planner.css";

const groups: {
  name: string;
  fields: [MoveField, string][];
  alternatives?: string;
}[] = [
  {
    name: "Flights",
    fields: [["flight", "One-way flight"]],
    alternatives: "Flights",
  },
  {
    name: "Visa package",
    fields: [
      ["visa", "Visa fee"],
      ["holdFund", "Hold fund / proof of funds"],
      ["health", "Health surcharge / residence permit"],
      ["medical", "Medical exam"],
      ["biometrics", "Biometrics"],
    ],
    alternatives: "Visa / Funds Proof",
  },
  { name: "Tuition", fields: [["tuition", "Annual tuition"]] },
  {
    name: "Accommodation",
    fields: [["rent", "Monthly rent"]],
    alternatives: "Accommodation",
  },
  {
    name: "Insurance",
    fields: [["insurance", "Annual insurance / optional top-up"]],
    alternatives: "Insurance",
  },
  { name: "Books & equipment", fields: [["books", "Books & equipment"]] },
  { name: "Settling in", fields: [["settling", "Settling in"]] },
  {
    name: "Living expenses",
    fields: [
      ["food", "Food per day"],
      ["transport", "Local transport per day"],
      ["phone", "Phone & internet per day"],
      ["laundry", "Laundry per day"],
      ["personal", "Personal expenses per day"],
      ["social", "Social buffer per day"],
    ],
    alternatives: "Daily Living",
  },
  { name: "Funding & payment", fields: [], alternatives: "Funding / Payment" },
];
const categoryIcons = [
  Wallet,
  Plane,
  FileCheck,
  GraduationCap,
  House,
  ShieldCheck,
  BookOpen,
  Package,
  Coffee,
  HandCoins,
];
const fieldIcons: Partial<Record<MoveField, typeof Wallet>> = {
  flight: Plane,
  visa: FileCheck,
  holdFund: Wallet,
  health: HeartPulse,
  medical: HeartPulse,
  biometrics: Fingerprint,
  tuition: GraduationCap,
  rent: House,
  insurance: ShieldCheck,
  books: BookOpen,
  settling: Package,
  food: Utensils,
  transport: Bus,
  phone: Phone,
  laundry: Shirt,
  personal: UserRound,
  social: Coffee,
  monthlyLiving: Wallet,
};
const settingIcons: Record<string, typeof Wallet> = {
  "University estimates": GraduationCap,
  "Academic months": CalendarDays,
  Deposit: House,
  "Living expense basis": Clock,
};
const housing = [
  [1200, 2400, 3500, 6500],
  [1500, 2700, 4350, 4000],
  [1800, 2700, 2000, 4000],
  [(250 * 52) / 12, (345 * 52) / 12, (395 * 52) / 12, (215 * 52) / 12],
  [(150 * 52) / 12, (230 * 52) / 12, (205 * 52) / 12, (127.5 * 52) / 12],
  [881, 1180, 1220, 688],
  [13250 / 9, 14000 / 9, 1600, 3250],
  [21950 / 9, 1450, 2000, 2750],
  [19900 / 9, 14500 / 9, 1400, 2750],
];
const flights = [
  [450, 625, 900],
  [450, 650, 975],
  [420, 600, 900],
  [350, 550, 950],
  [320, 515, 875],
  [340, 550, 950],
  [525, 725, 1100],
  [490, 700, 1025],
  [490, 700, 1025],
];
const daily = [
  [100, 185, 300],
  [105, 200, 325],
  [90, 165, 270],
  [30, 47.5, 70],
  [23, 36, 52.5],
  [23, 37.5, 57.5],
  [42.5, 65, 95],
  [37.5, 60, 87.5],
  [37.5, 60, 87.5],
];
const insurance = [
  [800, 1150],
  [800, 1150],
  [800, 1150],
  [0, 420],
  [0, 330],
  [0, 330],
  [5800, 3000],
  [2750, 2000],
  [3885, 2750],
];
export default function MovePlanner({
  go,
  studyCountry,
  university,
  annualTuition = 0,
  config,
  accountId,
}: {
  go: (page: "AI Agent" | "Dashboard") => void;
  studyCountry?: string;
  university?: string;
  annualTuition?: number;
  config?: any;
  accountId?: string;
}) {
  const currency = useWorkspaceCurrency(),
    money = useWorkspaceMoney();
  const initialUniversity = profiles.findIndex(
    (p) =>
      p.country === studyCountry &&
      !!university &&
      (p.name
        .toLowerCase()
        .replaceAll("’", "'")
        .includes(university.toLowerCase().replaceAll("’", "'")) ||
        (p.id === 8 && university === "University of California, Los Angeles")),
  );
  const [settings, setSettings] = useState<MoveSettings>({
    ...defaultMoveSettings,
    university: initialUniversity,
  });
  const [amounts, setAmounts] = useState<Partial<Record<MoveField, number>>>({
    tuition: annualTuition,
  });
  const [months, setMonths] = useState(12),
    [date, setDate] = useState("");
  const [excluded, setExcluded] = useState<string[]>([]),
    [category, setCategory] = useState<string | null>(() =>
      matchMedia("(max-width: 767px)").matches ? null : "Your costs",
    );
  const [overview, setOverview] = useState(false),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState("");
  const profile = profiles[settings.university];
  const update = (key: MoveField, value: number) => {
    setAmounts((a) => ({
      ...a,
      [key]: Math.max(0, Number.isFinite(value) ? value : 0),
    }));
    setMessage("");
  };
  function apply(id: number, next: MoveSettings) {
    if (id < 0) return;
    const p = profiles[id],
      convert = (n: number) => convertMoney(n, p.currency, currency);
    const d = convert(daily[id][next.lifestyle] ?? daily[id][0]);
    setAmounts((a) => ({
      ...a,
      flight: convertMoney(
        flights[id][next.flightOption] ?? flights[id][0],
        "USD",
        currency,
      ),
      rent: convert(housing[id][next.housing] ?? housing[id][0]),
      insurance: convert(
        insurance[id][next.insuranceOption] ?? insurance[id][0],
      ),
      visa:
        id < 3
          ? convertMoney(85, "USD", currency)
          : id < 6
            ? convert(558)
            : convert(535),
      health: convert(id < 3 ? 600 : id < 6 ? 776 : 0),
      food: d * 0.5,
      transport: d * 0.15,
      phone: d * 0.05,
      laundry: d * 0.05,
      personal: d * 0.15,
      social: d * 0.1,
      monthlyLiving: d * 30,
    }));
  }
  useEffect(() => {
    const next = {
      ...defaultMoveSettings,
      university: initialUniversity,
      ...config?.plannerSettings,
    };
    setSettings(next);
    setMonths(config?.months ?? 12);
    setDate(
      config?.arrivalDateISO ??
        (config?.arrivalDate
          ? new Date(config.arrivalDate).toISOString().slice(0, 10)
          : ""),
    );
    setExcluded(config?.excludedCosts ?? []);
    if (config?.plannerSettings) setAmounts(config.budgetAmounts ?? {});
    else {
      setAmounts({ tuition: annualTuition });
      apply(next.university, next);
      const migrated = migrateMoveAmounts(config, currency, convertMoney);
      if (Object.keys(migrated).length) {
        setAmounts((a) => ({ ...a, ...migrated }));
        if (migrated.monthlyLiving !== undefined)
          setSettings((s) => ({ ...s, livingMode: "monthly" }));
      }
    }
  }, [config, initialUniversity, annualTuition, currency]);
  const total = calculateMove(amounts, months, settings, excluded);
  const signature = (
    planMonths: number,
    planDate: string,
    planAmounts: Partial<Record<MoveField, number>>,
    planSettings: MoveSettings,
    planExcluded: string[],
  ) =>
    JSON.stringify([
      planMonths,
      planDate,
      moveFields.map((key) => planAmounts[key] ?? 0),
      Object.keys(defaultMoveSettings).map(
        (key) => planSettings[key as keyof MoveSettings],
      ),
      [...planExcluded].sort(),
    ]);
  const hasUnsavedChanges =
    !config?.plannerSettings ||
    signature(months, date, amounts, settings, excluded) !==
      signature(
        config.months ?? 12,
        config.arrivalDateISO ?? "",
        config.budgetAmounts ?? {},
        config.plannerSettings,
        config.excludedCosts ?? [],
      );
  const group = groups.find((g) => g.name === category);
  const CategoryIcon =
    categoryIcons[
      ["Your costs", ...groups.map((g) => g.name)].indexOf(category ?? "")
    ] ?? Wallet;
  const alternatives =
    profile && group?.alternatives
      ? Object.entries(profile.alternatives).find(([name]) =>
          name.startsWith(group.alternatives!),
        )?.[1]
      : undefined;
  function choice(
    label: string,
    value: string,
    options: { value: string; label: string }[],
    onChange: (value: string) => void,
  ) {
    const Icon = settingIcons[label] ?? SlidersHorizontal;
    return (
      <label className="move-field">
        <span>
          <Icon size={15} aria-hidden="true" />
          {label}
        </span>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger aria-label={label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="ui-select-content">
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
    );
  }
  function fields(rows: [MoveField, string][]) {
    return (
      <div className="move-fields">
        {rows.map(([key, label]) => {
          const Icon = fieldIcons[key] ?? Wallet;
          return (
            <label
              className={`move-field ${excluded.includes(key) ? "move-field-excluded" : ""}`}
              key={key}
            >
              <span>
                <Checkbox
                  aria-label={`Include ${label}`}
                  checked={!excluded.includes(key)}
                  onCheckedChange={(checked) =>
                    setExcluded((e) =>
                      checked
                        ? e.filter((k) => k !== key)
                        : [...new Set([...e, key])],
                    )
                  }
                />{" "}
                <Icon size={16} aria-hidden="true" />
                {label}
              </span>
              <Input
                aria-label={`${label} in ${currency}`}
                type="number"
                min="0"
                step="0.01"
                value={amounts[key] ?? 0}
                onChange={(e) => update(key, Number(e.target.value))}
              />
            </label>
          );
        })}
      </div>
    );
  }
  return (
    <div id="move-planner" className="move-board move-planner-complete">
      <section className="move-board-header">
        <div>
          <h2>
            <Plane size={24} aria-hidden="true" />
            Plan your arrival
          </h2>
        </div>
        <DatePicker
          className="planner-date-picker"
          label="Arrival date (optional)"
          value={date}
          onChange={setDate}
        />
      </section>
      <section className="arrival-summary">
        <div>
          <span>
            <Wallet size={16} aria-hidden="true" />
            First-year budget
          </span>
          <strong aria-live="polite">{money(total.total)}</strong>
          <small>
            {months} academic months ·{" "}
            {studyCountry || profile?.country || "Your study destination"}
          </small>
        </div>
        <div className="arrival-summary-breakdown">
          <div>
            <small>
              <Plane size={16} aria-hidden="true" />
              Arrival costs
            </small>
            <strong>{money(total.arrival)}</strong>
          </div>
          <div>
            <small>
              <ShieldCheck size={16} aria-hidden="true" />
              Buffer · {settings.contingency}%
            </small>
            <strong>{money(total.contingency)}</strong>
          </div>
        </div>
      </section>
      <section className="move-plan-settings" aria-label="Plan settings">
        {choice(
          "University estimates",
          String(settings.university),
          [
            { value: "-1", label: "Enter your own costs" },
            ...profiles
              .filter((p) => !studyCountry || p.country === studyCountry)
              .map((p) => ({ value: String(p.id), label: p.name })),
          ],
          (value) => {
            const next = { ...defaultMoveSettings, university: Number(value) };
            setSettings(next);
            if (next.university < 0) setAmounts({ tuition: annualTuition });
            else apply(next.university, next);
            setExcluded([]);
            setMessage("");
          },
        )}
        {choice(
          "Academic months",
          String(months),
          Array.from({ length: 24 }, (_, i) => ({
            value: String(i + 1),
            label: `${i + 1} months`,
          })),
          (value) => setMonths(Number(value)),
        )}
        {choice(
          "Deposit",
          String(settings.depositMonths),
          [1, 2].map((n) => ({
            value: String(n),
            label: `${n} month${n > 1 ? "s" : ""} of rent`,
          })),
          (value) =>
            setSettings((s) => ({ ...s, depositMonths: Number(value) })),
        )}
        <label className="move-field">
          <span>
            <BadgePercent size={15} aria-hidden="true" />
            Buffer %
          </span>
          <Input
            aria-label="Contingency percentage"
            type="number"
            min="0"
            max="100"
            value={settings.contingency}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                contingency: Math.min(
                  100,
                  Math.max(0, Number(e.target.value) || 0),
                ),
              }))
            }
          />
        </label>
      </section>
      <section
        className={`planner-category-layout ${category ? "has-category" : ""}`}
      >
        <div className="planner-categories" aria-label="Planning categories">
          <span className="planner-nav-label">YOUR BUDGET</span>
          {["Your costs", ...groups.map((g) => g.name)].map((name, index) => {
            const Icon = categoryIcons[index];
            const amount = total.breakdown.find(
              (row) => row.name === name,
            )?.amount;
            return (
              <button
                key={name}
                aria-label={name}
                aria-pressed={category === name}
                onClick={() => setCategory(name)}
              >
                <span>
                  <Icon size={18} />
                  {name}
                </span>
                {amount !== undefined ? (
                  <small>{money(amount)}</small>
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>
            );
          })}
        </div>
        <div className="planner-category-detail">
          {category ? (
            <>
              <Button
                variant="ghost"
                className="planner-category-back"
                onClick={() => setCategory(null)}
              >
                <ArrowLeft size={16} />
                Back to categories
              </Button>
              <div className="planner-detail-heading">
                <div className="planner-category-title">
                  <span className="planner-heading-icon">
                    <CategoryIcon size={23} aria-hidden="true" />
                  </span>
                  <h3>{category}</h3>
                </div>
                {category !== "Funding & payment" && (
                  <div className="planner-category-total">
                    <small>Total · {currency}</small>
                    <strong>
                      {money(
                        category === "Your costs"
                          ? total.total
                          : (total.breakdown.find(
                              (row) => row.name === category,
                            )?.amount ?? 0),
                      )}
                    </strong>
                  </div>
                )}
              </div>
              {category === "Your costs" ? (
                <>
                  <dl className="move-cost-breakdown">
                    {total.breakdown.map((row) => (
                      <div key={row.name}>
                        <dt>
                          <span className="planner-breakdown-icon">
                            {(() => {
                              const Icon =
                                categoryIcons[
                                  [
                                    "Your costs",
                                    ...groups.map((g) => g.name),
                                  ].indexOf(row.name)
                                ] ?? ShieldCheck;
                              return <Icon size={17} aria-hidden="true" />;
                            })()}
                          </span>
                          {row.name}
                        </dt>
                        <dd>{money(row.amount)}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="planner-context-note">
                    Daily expenses: {money(total.daily)} · Monthly living:{" "}
                    {money(total.monthly)}
                  </p>
                </>
              ) : (
                <>
                  {!!group?.fields.length && (
                    <div className="planner-amount-editor">
                      <div className="planner-editor-heading">
                        <strong>
                          <SlidersHorizontal size={16} aria-hidden="true" />
                          Amounts
                        </strong>
                        <span className="planner-currency-badge">
                          {currency}
                        </span>
                      </div>
                      {category === "Living expenses" &&
                        choice(
                          "Living expense basis",
                          settings.livingMode,
                          [
                            {
                              value: "daily",
                              label: "Daily expenses × 30 × academic months",
                            },
                            {
                              value: "monthly",
                              label: "Monthly living × academic months",
                            },
                          ],
                          (value) =>
                            setSettings((s) => ({
                              ...s,
                              livingMode: value as "daily" | "monthly",
                            })),
                        )}
                      {group &&
                        fields(
                          category === "Living expenses" &&
                            settings.livingMode === "monthly"
                            ? [["monthlyLiving", "Monthly living"]]
                            : group.fields,
                        )}
                    </div>
                  )}
                  {alternatives && (
                    <section className="planner-estimates">
                      <div className="planner-estimates-heading">
                        <h4>
                          <Layers size={16} aria-hidden="true" />
                          Options
                        </h4>
                        <span className="planner-currency-badge">
                          {category === "Funding & payment"
                            ? "Approaches"
                            : "Samples"}
                        </span>
                      </div>
                      <div className="move-alternatives">
                        {alternatives.rows.map((row, index) => (
                          <article
                            key={row[0]}
                            data-selected={
                              (category === "Flights"
                                ? settings.flightOption
                                : category === "Accommodation"
                                  ? settings.housing
                                  : category === "Insurance"
                                    ? settings.insuranceOption
                                    : category === "Visa package"
                                      ? settings.proofOption
                                      : category === "Funding & payment"
                                        ? settings.fundingOption
                                        : settings.lifestyle) === index
                            }
                          >
                            <div className="planner-option-copy">
                              <strong>
                                <CategoryIcon size={18} aria-hidden="true" />
                                {row[0]}
                              </strong>
                              <details className="planner-option-details">
                                <summary aria-label={`Details for ${row[0]}`}>
                                  <Info size={14} aria-hidden="true" />
                                  <span>Details</span>
                                </summary>
                                <p>{row.slice(2).join(" · ")}</p>
                              </details>
                            </div>
                            <span className="planner-option-price">
                              {row[1]}
                            </span>
                            {!["Visa package", "Funding & payment"].includes(
                              category!,
                            ) && (
                              <Button
                                variant="outline"
                                aria-label="Use sample estimate"
                                aria-pressed={
                                  (category === "Flights"
                                    ? settings.flightOption
                                    : category === "Accommodation"
                                      ? settings.housing
                                      : category === "Insurance"
                                        ? settings.insuranceOption
                                        : settings.lifestyle) === index
                                }
                                onClick={() => {
                                  const key =
                                    category === "Flights"
                                      ? "flightOption"
                                      : category === "Accommodation"
                                        ? "housing"
                                        : category === "Insurance"
                                          ? "insuranceOption"
                                          : "lifestyle";
                                  const next = { ...settings, [key]: index };
                                  setSettings(next);
                                  const id = settings.university;
                                  if (key === "flightOption")
                                    update(
                                      "flight",
                                      convertMoney(
                                        flights[id][index],
                                        "USD",
                                        currency,
                                      ),
                                    );
                                  else if (key === "housing")
                                    update(
                                      "rent",
                                      convertMoney(
                                        housing[id][index],
                                        profile.currency,
                                        currency,
                                      ),
                                    );
                                  else if (key === "insuranceOption")
                                    update(
                                      "insurance",
                                      convertMoney(
                                        insurance[id][index],
                                        profile.currency,
                                        currency,
                                      ),
                                    );
                                  else {
                                    const d = convertMoney(
                                      daily[id][index],
                                      profile.currency,
                                      currency,
                                    );
                                    setAmounts((a) => ({
                                      ...a,
                                      food: d * 0.5,
                                      transport: d * 0.15,
                                      phone: d * 0.05,
                                      laundry: d * 0.05,
                                      personal: d * 0.15,
                                      social: d * 0.1,
                                      monthlyLiving: d * 30,
                                    }));
                                  }
                                }}
                              >
                                <Check
                                  size={14}
                                  className="planner-option-check"
                                />
                                <span className="planner-option-use">
                                  <ArrowRight size={14} aria-hidden="true" />
                                  Use estimate
                                </span>
                                <span className="planner-option-selected">
                                  Selected
                                </span>
                              </Button>
                            )}
                            {["Visa package", "Funding & payment"].includes(
                              category!,
                            ) && (
                              <Button
                                variant="outline"
                                aria-label="Select approach"
                                aria-pressed={
                                  (category === "Visa package"
                                    ? settings.proofOption
                                    : settings.fundingOption) === index
                                }
                                onClick={() =>
                                  setSettings((s) => ({
                                    ...s,
                                    [category === "Visa package"
                                      ? "proofOption"
                                      : "fundingOption"]: index,
                                  }))
                                }
                              >
                                <Check
                                  size={14}
                                  className="planner-option-check"
                                />
                                <span className="planner-option-use">
                                  <ArrowRight size={14} aria-hidden="true" />
                                  Choose
                                </span>
                                <span className="planner-option-selected">
                                  Selected
                                </span>
                              </Button>
                            )}
                          </article>
                        ))}
                      </div>
                    </section>
                  )}
                  {category === "Accommodation" && (
                    <details className="planner-budget-notes">
                      <summary>
                        <Info size={15} aria-hidden="true" />
                        Budget notes
                        <ChevronRight size={14} aria-hidden="true" />
                      </summary>
                      <p>
                        Rent × {months} months + {settings.depositMonths}-month
                        deposit ({money(total.deposit)}). Annual and weekly
                        samples are normalized to monthly rent; meal bundles may
                        overlap food costs.
                      </p>
                    </details>
                  )}
                  {category === "Visa package" && (
                    <details className="planner-budget-notes">
                      <summary>
                        <Info size={15} aria-hidden="true" />
                        Budget notes
                        <ChevronRight size={14} aria-hidden="true" />
                      </summary>
                      <p>
                        Hold funds are included in this planning total as
                        requested. They represent money held, and may also cover
                        tuition or living costs. UK health surcharge is counted
                        here once; optional insurance top-up is separate. Enter
                        surcharge for your full visa duration.
                      </p>
                    </details>
                  )}
                  {category === "Funding & payment" && (
                    <details className="planner-budget-notes">
                      <summary>
                        <Info size={15} aria-hidden="true" />
                        Budget notes
                        <ChevronRight size={14} aria-hidden="true" />
                      </summary>
                      <p>
                        Selecting an approach records your plan. Scholarships
                        and loans need separate approval; choosing Sponsor Mode
                        does not authorize a payment.
                      </p>
                    </details>
                  )}
                  {!profile && alternatives === undefined && (
                    <p className="move-help">
                      Enter your own amounts, or select a university for
                      samples.
                    </p>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <h3>Set up your move</h3>
              <p>Choose a category to edit your plan.</p>
            </>
          )}
        </div>
      </section>
      <div className="planner-save-bar">
        <div className="planner-save-summary">
          <span>First-year budget</span>
          <strong>
            {money(total.total)} <small>{currency}</small>
          </strong>
        </div>
        <div className="planner-save-action">
          <p role="status">
            {message && message !== "Move plan saved."
              ? message
              : saving
                ? "Saving…"
                : hasUnsavedChanges
                  ? "Unsaved changes"
                  : "Saved"}
          </p>
          {!hasUnsavedChanges && !saving ? (
            <Button onClick={() => go("Dashboard")}>
              View dashboard <ArrowRight size={16} />
            </Button>
          ) : (
            <Button
              disabled={saving || !accountId}
              onClick={async () => {
                if (!convexClient || !accountId) return;
                setSaving(true);
                setMessage("");
                try {
                  await convexClient.mutation(convexApi.saveMovePlan, {
                    accountId: accountId as any,
                    months,
                    selectedRoute: settings.flightOption,
                    arrivalDate: date,
                    excludedCosts: excluded,
                    budgetAmounts: amounts,
                    plannerSettings: settings,
                  });
                  setMessage("Move plan saved.");
                } catch {
                  setMessage(
                    "Could not save. Check your amounts and try again.",
                  );
                } finally {
                  setSaving(false);
                }
              }}
            >
              <Save size={16} aria-hidden="true" />
              {saving ? "Saving…" : "Save move plan"}
            </Button>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        className="planner-overview-toggle"
        aria-expanded={overview}
        onClick={() => setOverview((o) => !o)}
      >
        <CalendarDays size={18} />{" "}
        {overview ? "Hide budget overview" : "Budget overview"}
      </Button>
      {overview && (
        <section className="move-overview">
          <div className="move-donut">
            <BudgetDonut costs={total.breakdown} currency={currency} />
          </div>
          <dl className="move-cost-breakdown">
            {total.breakdown.map((row) => (
              <div key={row.name}>
                <dt>
                  <span className="planner-breakdown-icon">
                    {(() => {
                      const Icon =
                        categoryIcons[
                          ["Your costs", ...groups.map((g) => g.name)].indexOf(
                            row.name,
                          )
                        ] ?? ShieldCheck;
                      return <Icon size={17} aria-hidden="true" />;
                    })()}
                  </span>
                  {row.name}
                </dt>
                <dd>{money(row.amount)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
