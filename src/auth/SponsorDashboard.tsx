import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Dialog } from "radix-ui";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowDownToLine,
  Eye,
  UserPlus,
  LockKeyhole,
  ArrowRight,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  Link2,
  LoaderCircle,
  LogOut,
  Moon,
  Sun,
  Pencil,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "../../convex/_generated/dataModel";
import { convertMoney, formatCurrency } from "../../shared/currency";
import DataBoundary from "../components/DataBoundary";
import Brand from "../components/Brand";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import SponsorConnect from "./SponsorConnect";
import "../styles/sponsor-dashboard.css";
import "../styles/motion.css";

type Student = FunctionReturnType<typeof api.sponsorLinks.dashboard>[number];
type View = "Overview" | "Students" | "Requests" | "Activity" | "Connections";
type Props = {
  name: string;
  onSignOut: () => void;
  onSetup: () => void;
  error?: string;
};
const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Students", icon: GraduationCap },
  { name: "Requests", icon: Inbox },
  { name: "Activity", icon: Clock3 },
  { name: "Connections", icon: Link2 },
] as const;

export default function SponsorDashboard(props: Props) {
  return (
    <DataBoundary>
      <SponsorOverview {...props} />
    </DataBoundary>
  );
}
function SponsorOverview(props: Props) {
  const students = useQuery(api.sponsorLinks.dashboard, {});
  const update = useMutation(api.sponsorLinks.updateCommitment);
  return (
    <SponsorDashboardView
      {...props}
      students={students}
      onUpdate={(id, amount) => update({ id, amount })}
      connections={<SponsorConnect role="Sponsor" />}
    />
  );
}

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function SupportProgress({
  max = 1,
  value = 0,
  "aria-label": label,
}: React.ComponentProps<"progress">) {
  const reducedMotion = useReducedMotion();
  const maximum = Math.max(1, Number(max));
  const current = Math.max(0, Math.min(maximum, Number(value)));
  return (
    <div
      className="sd-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={maximum}
      aria-valuenow={current}
    >
      <motion.span
        initial={reducedMotion ? false : { scaleX: 0 }}
        animate={{ scaleX: current / maximum }}
        transition={{
          duration: reducedMotion ? 0 : 0.7,
          ease: [0.22, 1, 0.36, 1],
        }}
      />
    </div>
  );
}

// Prefix formula-like values so exported student-entered text is safe in spreadsheets.
const csv = (value: string | number) =>
  `"${String(value)
    .replace(/^[=+@\-\t\r]/, "'$&")
    .replaceAll('"', '""')}"`;

export function SponsorDashboardView({
  name,
  students,
  onUpdate,
  connections,
  onSignOut,
  onSetup,
  error,
}: Props & {
  students: Student[] | undefined;
  onUpdate: (id: Id<"sponsors">, amount: number) => Promise<unknown>;
  connections: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const [accountMenu, setAccountMenu] = useState(false);
  const [theme, setTheme] = useState(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", next === "dark" ? "#0e1116" : "#f3f3f1");
    try {
      localStorage.setItem("financial-passport-theme", next);
    } catch {
      /* Theme still works when storage is unavailable. */
    }
  };
  useEffect(() => {
    if (!accountMenu) return;
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        !event.target.closest(".sd-topbar-right")
      )
        setAccountMenu(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountMenu(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [accountMenu]);
  const [view, setView] = useState<View>("Overview");
  const [selected, setSelected] = useState<Id<"sponsors"> | null>(null);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Open");
  const [review, setReview] = useState<{
    student: Student;
    request: Student["requests"][number];
  } | null>(null);
  const student = students?.find((s) => s.id === selected) ?? students?.[0];
  const currency = student?.currency ?? "USD";
  const money = (amount: number, unit: string = currency) =>
    formatCurrency(amount, unit, 2);
  const requests = (students ?? []).flatMap((student) =>
    student.requests.map((request) => ({ student, request })),
  );
  const open = requests.filter(({ request }) => request.status === "sent");
  const received = requests.filter(
    ({ request }) => request.status === "fulfilled",
  );
  const total = (key: "commitment" | "received") =>
    (students ?? []).reduce(
      (sum, s) =>
        sum +
        convertMoney(
          key === "commitment"
            ? s.commitment
            : (s.requestSummary?.receivedGBP ?? 0),
          s.currency,
          currency,
        ),
      0,
    );
  const navigate = (next: View) => {
    setView(next);
    setAccountMenu(false);
    setSearch("");
    setMessage("");
    setEditing(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const select = (s: Student) => {
    setSelected(s.id);
    navigate("Students");
  };
  const edit = (s: Student) => {
    select(s);
    setAmount(String(s.commitment));
    setEditing(true);
  };
  const exportRequests = () => {
    download(
      "movewire-funding-requests.csv",
      [
        "Student,Purpose,Amount,Currency,Needed by,Status",
        ...requests.map(({ student: s, request: r }) =>
          [
            s.name,
            r.purpose,
            r.amount,
            s.currency,
            r.neededBy,
            r.status === "sent" ? "Open" : "Received",
          ]
            .map(csv)
            .join(","),
        ),
      ].join("\r\n"),
      "text/csv;charset=utf-8",
    );
    setMessage("Request summary downloaded.");
  };
  const initials = (value: string) =>
    value
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  const empty = (title: string, description: string) => (
    <div className="sd-empty">
      {title.includes("private") ? (
        <LockKeyhole size={28} />
      ) : (
        <Inbox size={28} />
      )}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  );
  const requestRow = ({
    student: s,
    request: r,
  }: (typeof requests)[number]) => (
    <article className="sd-request-row" key={r.id}>
      <span className="sd-request-icon">
        <Wallet size={19} />
      </span>
      <div className="sd-row-title">
        <strong>{r.purpose}</strong>
        <span>
          {s.name} · {r.neededBy ? `Due ${r.neededBy}` : "No due date"}
        </span>
      </div>
      <div className="sd-row-amount">
        <strong>{money(r.amount, s.currency)}</strong>
        <span
          className={`sd-badge ${r.status === "sent" ? "sd-badge-amber" : ""}`}
        >
          {r.status === "sent" ? "Pending" : "Received"}
        </span>
      </div>
      <Button
        variant="outline"
        size="icon"
        className="sd-icon-action"
        aria-label="Review"
        title="Review request"
        onClick={() => setReview({ student: s, request: r })}
      >
        <ArrowRight size={17} />
      </Button>
    </article>
  );
  return (
    <div className="sponsor-shell">
      <a className="sd-skip" href="#sponsor-content">
        Skip to content
      </a>
      <aside className="sd-sidebar">
        <div className="sd-brand">
          <Brand href="#workspace" />
          <span>Sponsor account</span>
        </div>
        <nav aria-label="Sponsor navigation">
          {navigation.map(({ name: item, icon: Icon }) => (
            <button
              key={item}
              aria-current={view === item ? "page" : undefined}
              onClick={() => navigate(item)}
            >
              {view === item && (
                <motion.span
                  className="sd-nav-indicator"
                  layoutId="sponsor-desktop-nav"
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 420, damping: 34 }
                  }
                />
              )}
              <Icon size={20} />
              <span>{item}</span>
              {item === "Requests" && open.length > 0 && <b>{open.length}</b>}
            </button>
          ))}
        </nav>
        <div className="sd-sidebar-bottom">
          <div className="sd-sidebar-tools">
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={onSetup}
              aria-label="Account settings"
              title="Account settings"
            >
              <Settings2 size={18} />
            </button>
            <button onClick={onSignOut} aria-label="Sign out" title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
          <div className="sd-account">
            <span className="sd-avatar">{initials(name)}</span>
            <div>
              <strong>{name}</strong>
              <span>Sponsor account</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="sd-main">
        <header className="sd-topbar">
          <div>
            <span className="sd-desktop-label">Your workspace</span>
            <Brand className="sd-mobile-brand" />
          </div>
          <div className="sd-topbar-right">
            <span className="sd-secure" title="Student-controlled sharing">
              <ShieldCheck size={15} />
            </span>
            <button
              className="sd-profile-button"
              onClick={() => setAccountMenu(!accountMenu)}
              aria-label="Account menu"
              aria-expanded={accountMenu}
            >
              {initials(name)}
            </button>
            {accountMenu && (
              <div className="sd-account-menu">
                <button onClick={toggleTheme}>
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </button>
                <button onClick={onSetup}>
                  <Settings2 size={16} />
                  Account settings
                </button>
                <button onClick={onSignOut}>
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>
        <main id="sponsor-content" className="sd-content" tabIndex={-1}>
          <motion.div
            className="sd-page-view"
            key={view}
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reducedMotion ? 0 : 0.32,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="sd-page-heading">
              <div>
                <span className="sd-eyebrow">Sponsor workspace</span>
                <h1>
                  {view === "Overview"
                    ? `Welcome back, ${name.split(" ")[0]}.`
                    : view === "Students"
                      ? "Your students"
                      : view === "Requests"
                        ? "Funding requests"
                        : view === "Activity"
                          ? "Activity"
                          : "Connections"}
                </h1>
              </div>
              {view !== "Connections" && (
                <Button
                  className="sd-primary sd-icon-action"
                  size="icon"
                  aria-label="Connect student"
                  title="Connect student"
                  onClick={() => navigate("Connections")}
                >
                  <UserPlus size={19} />
                </Button>
              )}
            </div>
            {error && (
              <p className="sd-feedback" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="sd-feedback" role="status">
                {message}
              </p>
            )}
            {students === undefined ? (
              <div className="sd-empty" role="status">
                <LoaderCircle className="connect-spin" />
                Loading…
              </div>
            ) : (
              <>
                {view === "Overview" && (
                  <>
                    <div className="sd-stats">
                      <div>
                        <span>
                          <Users size={19} />
                          Students
                        </span>
                        <strong>{students.length}</strong>
                      </div>
                      <div>
                        <span>
                          <CircleDollarSign size={19} />
                          Annual commitment
                        </span>
                        <strong>{money(total("commitment"))}</strong>
                        <small>{currency} equivalent</small>
                      </div>
                      <button onClick={() => navigate("Requests")}>
                        <span>
                          <Inbox size={19} />
                          Open requests
                        </span>
                        <strong>
                          {open.length}
                          <ArrowRight size={22} />
                        </strong>
                      </button>
                    </div>
                    <div className="sd-overview-grid">
                      <section className="sd-card sd-students-card">
                        <div className="sd-section-heading">
                          <div>
                            <h2>Your students</h2>
                          </div>
                          <button
                            className="sd-icon-action sd-text-button"
                            aria-label="View all"
                            title="View all"
                            onClick={() => navigate("Students")}
                          >
                            <Users size={18} />
                          </button>
                        </div>
                        {students.length ? (
                          students.map((s) => (
                            <div className="sd-student-card" key={s.id}>
                              <div className="sd-student-identity">
                                <span className="sd-avatar sd-avatar-large">
                                  {initials(s.name)}
                                </span>
                                <div>
                                  <button onClick={() => select(s)}>
                                    {s.name}
                                    <ChevronRight size={16} />
                                  </button>
                                  <span>
                                    <ShieldCheck size={13} />
                                    Connected
                                  </span>
                                </div>
                              </div>
                              <div className="sd-student-pledge">
                                <span>Annual commitment</span>
                                <strong>
                                  {money(s.commitment, s.currency)}
                                </strong>
                              </div>
                              <div className="sd-student-progress">
                                <div>
                                  <span>Received</span>
                                  <strong>
                                    {money(
                                      s.requestSummary?.receivedGBP ?? 0,
                                      s.currency,
                                    )}
                                  </strong>
                                </div>
                                <SupportProgress
                                  aria-label={`Confirmed contribution progress for ${s.name}`}
                                  max={Math.max(1, s.commitment)}
                                  value={Math.min(
                                    s.commitment,
                                    s.requestSummary?.receivedGBP ?? 0,
                                  )}
                                />
                              </div>
                              <div className="sd-student-actions">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="sd-icon-action"
                                  aria-label="Edit commitment"
                                  title="Edit commitment"
                                  onClick={() => edit(s)}
                                >
                                  <Pencil size={17} />
                                </Button>
                                <button
                                  className="sd-icon-action sd-text-button"
                                  aria-label="Student details"
                                  title="Student details"
                                  onClick={() => select(s)}
                                >
                                  <Eye size={18} />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <>
                            {empty(
                              "No students yet",
                              "Use a student invitation code.",
                            )}
                            <Button
                              className="sd-empty-action"
                              onClick={() => navigate("Connections")}
                            >
                              Connect student <ArrowRight size={16} />
                            </Button>
                          </>
                        )}
                      </section>
                      <section className="sd-card sd-overview-requests">
                        <div className="sd-section-heading">
                          <div>
                            <h2>
                              Requests{" "}
                              {open.length > 0 && (
                                <span className="sd-count">{open.length}</span>
                              )}
                            </h2>
                          </div>
                          <button
                            className="sd-icon-action sd-text-button"
                            aria-label="All requests"
                            title="All requests"
                            onClick={() => navigate("Requests")}
                          >
                            <ArrowRight size={18} />
                          </button>
                        </div>
                        {open.length
                          ? open.slice(0, 3).map(requestRow)
                          : empty("Nothing pending", "")}
                      </section>
                    </div>
                  </>
                )}
                {view === "Students" && (
                  <>
                    {students.length ? (
                      <>
                        <div
                          className="sd-student-tabs"
                          aria-label="Select student"
                        >
                          {students.map((s) => (
                            <button
                              key={s.id}
                              aria-pressed={s.id === student?.id}
                              onClick={() => {
                                setSelected(s.id);
                                setEditing(false);
                                setMessage("");
                              }}
                            >
                              <span className="sd-avatar">
                                {initials(s.name)}
                              </span>
                              {s.name}
                            </button>
                          ))}
                        </div>
                        {student && (
                          <>
                            <section className="sd-card sd-detail-card">
                              <div className="sd-section-heading">
                                <div>
                                  <h2>{student.name}</h2>
                                </div>
                                <span
                                  className="sd-badge"
                                  title="Connected"
                                  aria-label="Connected"
                                >
                                  <ShieldCheck size={15} />
                                </span>
                              </div>
                              <div className="sd-commitment">
                                <div>
                                  <span>Annual commitment · {currency}</span>
                                  <strong>{money(student.commitment)}</strong>
                                  <small>Pledge only · no transfer</small>
                                </div>
                                {!editing && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="sd-icon-action"
                                    aria-label="Edit commitment"
                                    title="Edit commitment"
                                    onClick={() => edit(student)}
                                  >
                                    <Pencil size={17} />
                                  </Button>
                                )}
                              </div>
                              {editing && (
                                <form
                                  className="sd-edit-form"
                                  onSubmit={async (e) => {
                                    e.preventDefault();
                                    const value = Number(amount);
                                    if (
                                      !Number.isFinite(value) ||
                                      value < 0 ||
                                      value > 1e9 ||
                                      !amount.trim()
                                    )
                                      return;
                                    setBusy(true);
                                    setMessage("");
                                    try {
                                      await onUpdate(student.id, value);
                                      setEditing(false);
                                      setMessage("Commitment saved.");
                                    } catch {
                                      setMessage("Could not save. Try again.");
                                    } finally {
                                      setBusy(false);
                                    }
                                  }}
                                >
                                  <label htmlFor="annual-commitment">
                                    Annual amount in {currency}
                                  </label>
                                  <div>
                                    <Input
                                      id="annual-commitment"
                                      money
                                      min="0"
                                      max="1000000000"

                                      required
                                      autoFocus
                                      disabled={busy}
                                      value={amount}
                                      onChange={(e) =>
                                        setAmount(e.target.value)
                                      }
                                    />
                                    <Button
                                      className="sd-primary sd-icon-action"
                                      size="icon"
                                      aria-label="Save commitment"
                                      title="Save commitment"
                                      disabled={busy}
                                    >
                                      {busy ? (
                                        <LoaderCircle
                                          className="connect-spin"
                                          size={16}
                                        />
                                      ) : (
                                        <Check size={16} />
                                      )}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="sd-icon-action"
                                      aria-label="Cancel"
                                      title="Cancel"
                                      disabled={busy}
                                      onClick={() => setEditing(false)}
                                    >
                                      <X size={18} />
                                    </Button>
                                  </div>
                                </form>
                              )}
                            </section>
                            <div className="sd-detail-grid">
                              <section className="sd-card">
                                <div className="sd-section-heading">
                                  <div>
                                    <h2>Shared budget</h2>
                                  </div>
                                  <Wallet size={20} />
                                </div>
                                {student.financialOverview ? (
                                  <>
                                    <dl className="sd-facts">
                                      <div>
                                        <dt>Planned budget</dt>
                                        <dd>
                                          {money(
                                            student.financialOverview
                                              .plannedGBP,
                                          )}
                                        </dd>
                                      </div>
                                      <div>
                                        <dt>Marked paid</dt>
                                        <dd>
                                          {money(
                                            student.financialOverview.paidGBP,
                                          )}
                                        </dd>
                                      </div>
                                      <div>
                                        <dt>Remaining costs</dt>
                                        <dd>
                                          {money(
                                            Math.max(
                                              0,
                                              student.financialOverview
                                                .plannedGBP -
                                                student.financialOverview
                                                  .paidGBP,
                                            ),
                                          )}
                                        </dd>
                                      </div>
                                    </dl>
                                    {student.financialOverview.categories.map(
                                      (c) => (
                                        <div
                                          className="sd-category"
                                          key={c.category}
                                        >
                                          <div>
                                            <strong>{c.category}</strong>
                                            <span>{money(c.plannedGBP)}</span>
                                          </div>
                                          <SupportProgress
                                            aria-label={`${c.category} paid progress`}
                                            max={Math.max(1, c.plannedGBP)}
                                            value={c.paidGBP}
                                          />
                                          <small>
                                            {money(c.paidGBP)} marked paid
                                          </small>
                                        </div>
                                      ),
                                    )}
                                  </>
                                ) : (
                                  empty(
                                    "Budget is private",
                                    "Ask your student to share their budget.",
                                  )
                                )}
                              </section>
                              <section className="sd-card">
                                <div className="sd-section-heading">
                                  <div>
                                    <h2>Tuition progress</h2>
                                  </div>
                                  <GraduationCap size={21} />
                                </div>
                                {student.tuition ? (
                                  <>
                                    <div className="sd-tuition-amount">
                                      <span>Current tuition payment</span>
                                      <strong>
                                        {money(student.tuition.amountGBP)}
                                      </strong>
                                      <span className="sd-badge">
                                        {student.tuition.status.replaceAll(
                                          "_",
                                          " ",
                                        )}
                                      </span>
                                    </div>
                                    <dl className="sd-facts">
                                      <div>
                                        <dt>Deadline</dt>
                                        <dd>
                                          {student.tuition.deadline ||
                                            "Not set"}
                                        </dd>
                                      </div>
                                      <div>
                                        <dt>Tuition sent · sandbox</dt>
                                        <dd>
                                          {money(student.tuition.paidGBP)}
                                        </dd>
                                      </div>
                                    </dl>
                                  </>
                                ) : (
                                  empty(
                                    "Tuition is private",
                                    "Ask your student to share tuition.",
                                  )
                                )}
                              </section>
                            </div>
                            <section className="sd-card">
                              <div className="sd-section-heading">
                                <h2>Funding requests</h2>
                                <button
                                  className="sd-icon-action sd-text-button"
                                  aria-label="All requests"
                                  title="All requests"
                                  onClick={() => navigate("Requests")}
                                >
                                  <ArrowRight size={18} />
                                </button>
                              </div>
                              {student.requests.length
                                ? requests
                                    .filter((r) => r.student.id === student.id)
                                    .map(requestRow)
                                : empty("No shared requests", "")}
                            </section>
                          </>
                        )}
                      </>
                    ) : (
                      <section className="sd-card">
                        {empty(
                          "No students yet",
                          "Use a student invitation code.",
                        )}
                        <Button
                          className="sd-empty-action"
                          onClick={() => navigate("Connections")}
                        >
                          Connect student
                        </Button>
                      </section>
                    )}
                  </>
                )}
                {view === "Requests" && (
                  <section className="sd-card">
                    <div className="sd-request-toolbar">
                      <div className="sd-filters" aria-label="Request status">
                        {["Open", "Received", "All"].map((f) => (
                          <button
                            key={f}
                            aria-pressed={filter === f}
                            onClick={() => setFilter(f)}
                          >
                            {f}
                            {f === "Open" && <span>{open.length}</span>}
                          </button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="sd-icon-action"
                        aria-label="Export CSV"
                        title="Export CSV"
                        disabled={!requests.length}
                        onClick={exportRequests}
                      >
                        <ArrowDownToLine size={16} />
                      </Button>
                    </div>
                    <label className="sd-search">
                      <Search size={18} />
                      <Input
                        aria-label="Search funding requests"
                        placeholder="Search student or purpose…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    {(() => {
                      const visible = requests.filter(
                        ({ student: s, request: r }) =>
                          (filter === "All" ||
                            (filter === "Open"
                              ? r.status === "sent"
                              : r.status === "fulfilled")) &&
                          `${s.name} ${r.purpose}`
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                      );
                      return visible.length
                        ? visible.map(requestRow)
                        : empty(
                            search
                              ? "No matching requests"
                              : filter === "Open"
                                ? "You’re all caught up"
                                : "No requests here yet",
                            search
                              ? "Try another student name or purpose."
                              : "",
                          );
                    })()}
                  </section>
                )}
                {view === "Activity" && (
                  <>
                    <div className="sd-stats sd-activity-stats">
                      <div>
                        <span>
                          <CircleDollarSign size={19} />
                          Confirmed contributions
                        </span>
                        <strong>{money(total("received"))}</strong>
                        <small>{currency} equivalent</small>
                      </div>
                      <div>
                        <span>
                          <Check size={19} />
                          Requests received
                        </span>
                        <strong>{received.length}</strong>
                      </div>
                    </div>
                    <section className="sd-card">
                      <div className="sd-section-heading">
                        <div>
                          <h2>Contribution records</h2>
                        </div>
                      </div>
                      {received.map(requestRow)}
                      {students.flatMap((s) =>
                        (s.tuition?.recentPayments ?? []).map((p, i) => (
                          <article
                            className="sd-request-row"
                            key={`${s.id}-${i}`}
                          >
                            <span className="sd-request-icon">
                              <GraduationCap size={19} />
                            </span>
                            <div className="sd-row-title">
                              <strong>Tuition payment · sandbox</strong>
                              <span>
                                {s.name} ·{" "}
                                {new Date(p.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            <strong>{money(p.amountGBP, p.currency)}</strong>
                            <span className="sd-badge">Sandbox record</span>
                          </article>
                        )),
                      )}
                      {!received.length &&
                        !students.some(
                          (s) => s.tuition?.recentPayments.length,
                        ) &&
                        empty("No activity yet", "")}
                    </section>
                  </>
                )}
                {view === "Connections" && (
                  <section className="sd-card sd-connections">
                    {connections}
                  </section>
                )}
              </>
            )}
            <footer
              className="sd-footer"
              title="Students control sharing. Personal balances stay private."
            >
              <ShieldCheck size={14} />
              <span>Student-controlled sharing</span>
            </footer>
          </motion.div>
        </main>
      </div>
      <nav className="sd-mobile-nav" aria-label="Mobile sponsor navigation">
        {navigation.map(({ name: item, icon: Icon }) => (
          <button
            key={item}
            aria-current={view === item ? "page" : undefined}
            onClick={() => navigate(item)}
          >
            {view === item && (
              <motion.span
                className="sd-nav-indicator"
                layoutId="sponsor-mobile-nav"
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 34 }
                }
              />
            )}
            <span>
              <Icon size={20} />
              {item === "Requests" && open.length > 0 && <b>{open.length}</b>}
            </span>
            {item === "Connections" ? "Connect" : item}
          </button>
        ))}
      </nav>
      <Dialog.Root
        open={review !== null}
        onOpenChange={(opened) => {
          if (!opened) setReview(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="sd-dialog-overlay" />
          <Dialog.Content className="sd-dialog">
            {review && (
              <>
                <Dialog.Close
                  className="sd-dialog-close"
                  aria-label="Close request"
                >
                  <X size={20} />
                </Dialog.Close>
                <span className="sd-eyebrow">FUNDING REQUEST</span>
                <Dialog.Title>{review.request.purpose}</Dialog.Title>
                <Dialog.Description>{review.student.name}</Dialog.Description>
                <strong className="sd-review-amount">
                  {money(review.request.amount, review.student.currency)}
                </strong>
                <dl className="sd-facts">
                  <div>
                    <dt>Needed by</dt>
                    <dd>{review.request.neededBy || "No due date"}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      {review.request.status === "sent"
                        ? "Pending"
                        : "Received by student"}
                    </dd>
                  </div>
                </dl>
                <p className="sd-note">
                  Arrange payment with your student. They confirm receipt. This
                  download is not a payment.
                </p>
                <Button
                  className="sd-primary"
                  onClick={() =>
                    download(
                      "movewire-funding-request.txt",
                      `MoveWire funding request\nStudent: ${review.student.name}\nPurpose: ${review.request.purpose}\nAmount: ${money(review.request.amount, review.student.currency)}\nNeeded by: ${review.request.neededBy || "Not set"}\nStatus: ${review.request.status === "sent" ? "Open" : "Received"}\n\nArrange payment directly with the student. This document is not a payment receipt.`,
                      "text/plain;charset=utf-8",
                    )
                  }
                >
                  <ArrowDownToLine size={16} />
                  Download request
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    select(review.student);
                    setReview(null);
                  }}
                >
                  View student
                </Button>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
