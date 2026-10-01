import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  Banknote,
  Bell,
  Bot,
  Building2,
  Bus,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileCheck2,
  GraduationCap,
  HelpCircle,
  History,
  Home,
  Landmark,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  MapPin,
  Menu,
  Moon,
  Plane,
  Plus,
  QrCode,
  ReceiptText,
  Route,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Train,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  costs,
  funding,
  initialAudit,
  routes,
  sponsors,
  wallets,
} from "./data";
import {
  confirmedFunding,
  formatGBP,
  formatUSD,
  fundingCoverage,
  fundingGap,
  monthlyBurn,
  routeEffectiveCost,
  runway,
  sumCosts,
} from "./lib/finance";
import type { AuditEvent, PaymentStatus } from "./types";
import { convexApi, convexClient, demoEmail } from "./lib/convex";
import type { Id } from "../convex/_generated/dataModel";
import { AnimatePresence, motion } from "motion/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MoveType = "study" | "work" | "relocation" | "travel";
type MoveProfileSummary = { id: Id<"accounts">; name: string; type: MoveType; countryFrom: string; countryTo: string };
type NewMoveProfile = { name: string; type: MoveType; countryFrom: string; countryTo: string; arrivalDate: string };

type NewSponsor = { userCode: string; email: string; name: string; relationship: string; commitment: number; nextDate: string };

type BudgetAllocation = { category: string; amount: number };

type DatabaseState = {
  userCode: string;
  sponsorLinks: Array<{ _id: Id<"sponsorLinks">; name: string; email: string; relationship: string; commitment: number; nextDate: string }>;
  moveProfiles: MoveProfileSummary[];
  account: {
    _id: string;
    countryFrom: string;
    countryTo: string;
    university: string;
    course: string;
    moveType?: MoveType;
    name: string;
    initials: string;
    role: string;
    planName: string;
    paymentStatus: PaymentStatus;
    selectedRoute: string;
    sponsorRequestSent: boolean;
  };
  auditEvents: Array<{
    _id: string;
    type: string;
    detail: string;
    timestamp: number;
    actor: string;
  }>;
  messages: Array<{ _id: string; from: "agent" | "user"; text: string }>;
  notifications: Array<{
    _id: string;
    title: string;
    detail: string;
    read: boolean;
  }>;
  checklist: Array<{
    key: string;
    label: string;
    detail: string;
    done: boolean;
  }>;
  costs: Array<{
    key: string;
    name: string;
    category: string;
    amount: number;
    due: string;
    paid?: boolean;
  }>;
  funding: Array<{
    key: string;
    name: string;
    type: string;
    amount: number;
    status: string;
    available: string;
  }>;
  sponsors: Array<{
    key: string;
    name: string;
    relationship: string;
    commitment: number;
    nextDate: string;
    permissions: string[];
  }>;
  wallets: Array<{
    currency: string;
    symbol: string;
    amount: number;
    gbpValue: number;
    label: string;
  }>;
  paymentRoutes: Array<{
    key: string;
    provider: string;
    sourceAmount: number;
    fee: number;
    fxRate: number;
    delivery: string;
    recommended?: boolean;
  }>;
  config: Record<string, any>;
  sponsorRequests: Array<{
    _id: string;
    sponsorKey: string;
    amount: number;
    purpose: string;
    neededBy: string;
    status: "sent" | "fulfilled";
  }>;
  rateAlerts: Array<{
    _id: string;
    pair: string;
    targetRate: number;
    active: boolean;
  }>;
};

type Page =
  | "Dashboard"
  | "Profile"
  | "Move Planner"
  | "AI Agent"
  | "Payments"
  | "Exchange"
  | "Sponsors"
  | "Wallet"
  | "Security";
type Variation = 1 | 2 | 3 | 4 | 5;
const nav: { page: Page; icon: typeof Home }[] = [
  { page: "Dashboard", icon: LayoutDashboard },
  { page: "Move Planner", icon: Route },
  { page: "AI Agent", icon: Bot },
  { page: "Payments", icon: CreditCard },
  { page: "Exchange", icon: CircleDollarSign },
  { page: "Sponsors", icon: UsersRound },
  { page: "Wallet", icon: WalletCards },
  { page: "Security", icon: ShieldCheck },
];
const total = sumCosts(costs),
  funded = confirmedFunding(funding),
  gap = fundingGap(total, funded),
  coverage = fundingCoverage(total, funded);
const burn = monthlyBurn(650, [250, 80, 70, 55, 120, 75]),
  baseRunway = runway(8900, burn);

function App() {
  const pageFromHash = (): Page =>
    [...nav.map((item) => item.page), "Profile" as Page].find(
      (page) => `#${page.toLowerCase().replace(" ", "-")}` === window.location.hash,
    ) ?? "Dashboard";
  const [page, setPage] = useState<Page>(pageFromHash);
  const [mobileNav, setMobileNav] = useState(false);
  const [localPaymentStatus, setLocalPaymentStatus] =
    useState<PaymentStatus>("not_started");
  const [localAudit, setLocalAudit] = useState<AuditEvent[]>(initialAudit);
  const [database, setDatabase] = useState<DatabaseState | null>(null);
  const [workspaceId, setWorkspaceId] = useState<Id<"accounts"> | undefined>(() => {
    const stored = localStorage.getItem("financial-passport-workspace");
    return stored ? stored as Id<"accounts"> : undefined;
  });
  const [syncState, setSyncState] = useState<
    "demo" | "connecting" | "synced" | "error"
  >(convexClient ? "connecting" : "demo");
  const seeded = useRef(false);
  const configBackfillAttempted = useRef(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [executingPayment, setExecutingPayment] = useState(false);
  const [toast, setToast] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("financial-passport-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const [tourOpen, setTourOpen] = useState(
    () => new URLSearchParams(location.search).get("tour") === "on",
  );
  const [variation, setVariation] = useState<Variation>(() => {
    const requested = Number(new URLSearchParams(location.search).get("v"));
    return (
      requested >= 1 && requested <= 5
        ? requested
        : Number(localStorage.getItem("financial-passport-variation") || 1)
    ) as Variation;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#08121b" : "#f3f3f1");
    localStorage.setItem("financial-passport-theme", theme);
  }, [theme]);

  useEffect(() => {
    const client = convexClient;
    if (!client || new URLSearchParams(window.location.search).has("sponsor")) return;
    const watch = client.watchQuery(convexApi.bootstrap, { email: demoEmail, ...(workspaceId ? { workspaceId } : {}) });
    const unsubscribe = watch.onUpdate(() => {
      try {
        const result = watch.localQueryResult();
        if (result === null && !seeded.current) {
          seeded.current = true;
          void client
            .mutation(convexApi.seedDemo, {})
            .catch(() => setSyncState("error"));
          return;
        }
        if (result) {
          const state = result as DatabaseState;
          setDatabase(state);
          setSyncState("synced");
          if (!configBackfillAttempted.current) {
            configBackfillAttempted.current = true;
            void client
              .mutation(convexApi.ensureConfig, {
                accountId: state.account._id as any,
              })
              .catch(() => setSyncState("error"));
          }
        }
      } catch {
        if (workspaceId) {
          localStorage.removeItem("financial-passport-workspace");
          setWorkspaceId(undefined);
        } else setSyncState("error");
      }
    });
    return unsubscribe;
  }, [workspaceId]);

  const account = database?.account;
  const visibleCosts =
    database?.costs.map((item) => ({ ...item, id: item.key })) ?? costs;
  const visibleFunding =
    database?.funding.map((item) => ({ ...item, id: item.key })) ?? funding;
  const planTotal = sumCosts(visibleCosts as any);
  const planFunded = confirmedFunding(visibleFunding as any);
  const planGap = fundingGap(planTotal, planFunded);
  const planCoverage = fundingCoverage(planTotal, planFunded);
  const paymentStatus = executingPayment
    ? "processing"
    : (account?.paymentStatus ?? localPaymentStatus);
  const paid = paymentStatus === "completed";
  const audit = database
    ? database.auditEvents.map((event) => ({
        id: event._id,
        type: event.type,
        detail: event.detail,
        actor: event.actor,
        timestamp: new Date(event.timestamp).toLocaleString("en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      }))
    : localAudit;
  const mutate = async (fn: any, args: Record<string, unknown>) => {
    if (!convexClient) return false;
    try {
      await convexClient.mutation(fn, args);
      return true;
    } catch {
      setSyncState("error");
      announce("Could not save that change — please try again");
      return false;
    }
  };

  const announce = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  };
  const closeTour = () => {
    localStorage.setItem("financial-passport-tour", "done");
    setTourOpen(false);
  };
  const chooseVariation = (value: Variation) => {
    const url = new URL(location.href);
    url.searchParams.set("v", String(value));
    history.replaceState(null, "", url);
    localStorage.setItem("financial-passport-variation", String(value));
    setVariation(value);
    if (page !== "Dashboard") go("Dashboard");
  };
  const addAudit = (type: string, detail: string, actor = "Dara Chan") =>
    setLocalAudit((a) => [
      {
        id: crypto.randomUUID(),
        type,
        detail,
        timestamp: new Date().toLocaleString("en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
        actor,
      },
      ...a,
    ]);
  const transition = async (next: "prepared" | "approved" | "completed") =>
    account
      ? mutate(convexApi.transitionPayment, { accountId: account._id, next })
      : false;
  const prepare = async () => {
    if (account) await transition("prepared");
    else {
      setLocalPaymentStatus("prepared");
      addAudit(
        "PAYMENT_PREPARED",
        "£2,000 tuition payment prepared; no funds moved",
        "Financial Passport",
      );
    }
    announce("Payment prepared — approval is still required");
  };
  const approve = async () => {
    if (account) await transition("approved");
    else {
      setLocalPaymentStatus("approved");
      addAudit(
        "PAYMENT_APPROVED",
        "Explicit approval recorded for £2,000 tuition payment",
      );
    }
    announce("Approval recorded securely");
  };
  const execute = () => {
    if (paymentStatus !== "approved") return;
    setExecutingPayment(true);
    if (!account) setLocalPaymentStatus("processing");
    window.setTimeout(async () => {
      if (account) await transition("completed");
      else {
        setLocalPaymentStatus("completed");
        addAudit(
          "PAYMENT_EXECUTED",
          "Sandbox transaction TX-DEMO-842913 completed",
          "Sandbox Provider A",
        );
      }
      setExecutingPayment(false);
      announce("Sandbox payment completed");
    }, 900);
  };
  const selectRoute = (route: string) =>
    account
      ? void mutate(convexApi.setRoute, { accountId: account._id, route })
      : undefined;
  const toggleChecklist = (key: string) =>
    account
      ? void mutate(convexApi.toggleChecklist, { accountId: account._id, key })
      : undefined;
  const requestSponsor = () =>
    account
      ? void mutate(convexApi.requestSponsor, { accountId: account._id })
      : announce("Demo contribution request sent");
  const sendMessage = (text: string) =>
    account
      ? void mutate(convexApi.sendMessage, { accountId: account._id, text })
      : undefined;
  const saveProfile = (profile: Record<string, string>) =>
    account
      ? mutate(convexApi.updateProfile, {
          accountId: account._id,
          name: profile.name,
          countryFrom: profile.home,
          countryTo: profile.study,
          university: profile.university,
          course: profile.course,
          courseStart: profile.start,
          financialStatus: profile.status,
          sponsorSupport: profile.income,
        })
      : Promise.resolve(false);
  const createSponsorRequest = (request: {
    sponsorKey: string;
    amount: number;
    purpose: string;
    neededBy: string;
  }) =>
    account
      ? mutate(convexApi.createSponsorRequest, {
          accountId: account._id,
          ...request,
        })
      : Promise.resolve(false);
  const setSponsorPermission = (
    sponsorKey: string,
    permission: string,
    enabled: boolean,
  ) =>
    account
      ? mutate(convexApi.setSponsorPermission, {
          accountId: account._id,
          sponsorKey,
          permission,
          enabled,
        })
      : Promise.resolve(false);
  const createRateAlert = (targetRate: number) =>
    account
      ? mutate(convexApi.createRateAlert, {
          accountId: account._id,
          pair: "USD/GBP",
          targetRate,
        })
      : Promise.resolve(false);
  const addSponsor = (sponsor: NewSponsor) => mutate(convexApi.sendSponsorLinkRequest, sponsor);
  const saveBudget = (allocations: BudgetAllocation[]) =>
    mutate(convexApi.saveBudget, { allocations, ...(workspaceId ? { workspaceId } : {}) });
  const readNotifications = () => {
    setNotificationsOpen((open) => !open);
    if (account)
      void mutate(convexApi.markNotificationsRead, { accountId: account._id });
  };
  const switchWorkspace = (id: Id<"accounts">) => {
    if (id === account?._id) return;
    setDatabase(null);
    setNotificationsOpen(false);
    setWorkspaceId(id);
    localStorage.setItem("financial-passport-workspace", id);
    setPage("Profile");
    window.history.replaceState(null, "", "#profile");
    window.scrollTo(0, 0);
  };
  const createMove = async (profile: NewMoveProfile) => {
    if (!convexClient) return false;
    try {
      const id = await convexClient.mutation(convexApi.createMoveProfile, profile);
      switchWorkspace(id);
      return true;
    } catch {
      announce("Could not create the move profile. Please try again.");
      return false;
    }
  };

  const go = (p: Page) => {
    setPage(p);
    window.history.replaceState(
      null,
      "",
      `#${p.toLowerCase().replace(" ", "-")}`,
    );
    setMobileNav(false);
    window.scrollTo(0, 0);
  };

  if (new URLSearchParams(window.location.search).has("sponsor")) return <main className="sponsor-connect-page"><Sponsors sponsorOnly storedSponsors={[]} requests={[]} onAdd={addSponsor} onRequest={async () => false} onPermission={async () => false} /></main>;

  if (!convexClient)
    return (
      <main className="connection-screen">
        <div className="card section-card">
          <Landmark />
          <h1>Database connection required</h1>
          <p>
            Set <code>VITE_CONVEX_URL</code> and run{" "}
            <code>bun run convex:dev</code>. Financial Passport no longer
            substitutes hard-coded browser data when the database is
            unavailable.
          </p>
        </div>
      </main>
    );
  if (!database)
    return (
      <main className="connection-screen">
        <div className="card section-card">
          <span className="spinner" />
          <h1>Loading your financial passport…</h1>
          <p>
            {syncState === "error"
              ? "The database could not be reached. Check the Convex deployment and retry."
              : "Reading the latest account, plan, and activity data."}
          </p>
        </div>
      </main>
    );

  return (
    <div className={`app-shell variation-${variation}`}>
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <button
          className="mobile-close"
          aria-label="Close menu"
          onClick={() => setMobileNav(false)}
        >
          <X />
        </button>
        <div className="brand">
          <div className="brand-mark">
            <Plane size={19} />
          </div>
          <div>
            <strong>Financial</strong>
            <span>Passport</span>
          </div>
        </div>
        <nav aria-label="Main navigation">
          {nav.map(({ page: item, icon: Icon }) => (
            <button
              key={item}
              className={page === item ? "active" : ""}
              onClick={() => go(item)}
            >
              <Icon size={19} />
              <span>{item}</span>
              {item === "Payments" && <i>1</i>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tools" aria-label="Application controls">
            <button className="tour-trigger" onClick={() => setTourOpen(true)}>
              <HelpCircle size={17} />
              <span>Tour</span>
            </button>
            <button
              className="theme-toggle"
              onClick={() =>
                setTheme((current) => (current === "dark" ? "light" : "dark"))
              }
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
            <div className="notification-wrap">
              <button aria-label="Notifications" onClick={readNotifications}>
                <Bell size={19} />
                <span>Alerts</span>
                {(database?.notifications.filter((n) => !n.read).length ?? 2) >
                  0 && (
                  <b>
                    {database?.notifications.filter((n) => !n.read).length ?? 2}
                  </b>
                )}
              </button>
              {notificationsOpen && (
                <div className="notification-popover">
                  <strong>Notifications</strong>
                  {(database?.notifications ?? []).map((n) => (
                    <div key={n._id}>
                      <b>{n.title}</b>
                      <span>{n.detail}</span>
                    </div>
                  ))}
                  {database?.notifications.length === 0 && (
                    <span>You're all caught up.</span>
                  )}
                  {!database && (
                    <div>
                      <b>Tuition due soon</b>
                      <span>Your £2,000 instalment is due in 12 days.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            className={`profile ${page === "Profile" ? "active" : ""}`}
            aria-label="Open your profile"
            aria-current={page === "Profile" ? "page" : undefined}
            onClick={() => go("Profile")}
          >
            <span>{account?.initials ?? "DC"}</span>
            <div>
              <strong>{account?.name ?? "Dara Chan"}</strong>
              <small>
                {account?.role ?? "Student"} · {account?.planName ?? "UK Study Plan"}
              </small>
            </div>
            <ChevronRight size={17} />
          </button>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="scrim"
          aria-label="Close menu"
          onClick={() => setMobileNav(false)}
        />
      )}
      <button
        className="menu"
        aria-label="Open menu"
        onClick={() => setMobileNav(true)}
      >
        <Menu />
      </button>
      <main className={page === "Dashboard" ? "dashboard-page" : ""}>
        <div className="content">
          <AnimatePresence mode="wait">
            <motion.div
              className="page-view"
              key={`${account?._id}-${page}-${variation}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {page === "Dashboard" && (
                <Dashboard
                  paid={paid}
                  go={go}
                  variation={1}
                  checklist={database?.checklist}
                  toggleChecklist={toggleChecklist}
                  database={database}
                  onSponsorRequest={createSponsorRequest}
                  onSponsorPermission={setSponsorPermission}
                  onRateAlert={createRateAlert}
                />
              )}
              {page === "Profile" && (
                <Profile
                  announce={announce}
                  account={account}
                  config={database?.config?.profile}
                  totals={{
                    funded: planFunded,
                    gap: planGap,
                    coverage: planCoverage,
                  }}
                  onSave={saveProfile}
                  moves={database.moveProfiles ?? [{ id: account!._id as Id<"accounts">, name: account!.planName, type: account!.moveType ?? "study", countryFrom: account!.countryFrom, countryTo: account!.countryTo }]}
                  onSwitch={switchWorkspace}
                  onCreate={createMove}
                />
              )}
              {page === "Move Planner" && (
                <MovePlanner go={go} config={database?.config?.move} essentials={database?.checklist ?? []} toggleEssential={toggleChecklist} />
              )}
              {page === "AI Agent" && (
                <Agent
                  storedMessages={database?.messages}
                  onSend={sendMessage}
                />
              )}
              {page === "Payments" && (
                <Payments
                  status={paymentStatus}
                  paid={paid}
                  prepare={prepare}
                  approve={approve}
                  execute={execute}
                  storedRoute={account?.selectedRoute}
                  onSelectRoute={selectRoute}
                  storedRoutes={database?.paymentRoutes}
                  config={database?.config?.banking}
                  costs={database?.costs ?? []}
                />
              )}
              {page === "Exchange" && (
                <ExchangeWorkspace
                  go={go}
                  database={database}
                  onRateAlert={createRateAlert}
                />
              )}
              {page === "Sponsors" && (
                <Sponsors
                  userCode={database?.userCode ?? ""}
                  links={database?.sponsorLinks ?? []}
                  onRespond={(requestId, accept) => mutate(convexApi.respondSponsorLink, { requestId, accept, ...(workspaceId ? { workspaceId } : {}) })}
                  onAdd={addSponsor}
                  onRequest={createSponsorRequest}
                  onPermission={setSponsorPermission}
                  storedSponsors={database?.sponsors ?? []}
                  requests={database?.sponsorRequests ?? []}
                  config={database?.config?.sponsorship}
                />
              )}
              {page === "Wallet" && (
                <Wallet
                  storedWallets={database?.wallets}
                  budget={database?.config?.budget?.allocations}
                  costs={database?.costs ?? []}
                  onSaveBudget={saveBudget}
                />
              )}
              {page === "Security" && (
                <Security audit={audit} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      {page !== "AI Agent" && !mobileNav && !tourOpen && (
        <button
          type="button"
          className="agent-launcher"
          aria-label="Open AI Agent"
          title="Ask your AI agent"
          onClick={() => go("AI Agent")}
        >
          <Bot size={22} aria-hidden="true" />
        </button>
      )}
      {tourOpen && (
        <Tour
          page={page}
          variation={variation}
          go={go}
          chooseVariation={chooseVariation}
          close={closeTour}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}

function Tour({
  page,
  variation,
  go,
  chooseVariation,
  close,
}: {
  page: Page;
  variation: Variation;
  go: (p: Page) => void;
  chooseVariation: (value: Variation) => void;
  close: () => void;
}) {
  const steps: Array<{
    page: Page;
    variation?: Variation;
    target?: string;
    eyebrow: string;
    title: string;
    body: string;
    tip?: string;
  }> = [
    {
      page: "Dashboard",
      eyebrow: "Quick tour",
      title: "Your financial command centre",
      body:
        "See your funding, upcoming commitments, and safest next action without hunting through the app.",
      tip: "Seven focused stops. Use Next or your arrow keys to move through them.",
    },
    {
      page: "Dashboard",
      target: '[data-tour="readiness"]',
      eyebrow: "Funding",
      title: "Know exactly where you stand",
      body:
        "Coverage, remaining gap, and runway update together whenever your plan changes.",
    },
    {
      page: "Dashboard",
      target: '[data-tour="next-action"]',
      eyebrow: "Next up",
      title: "One clear next action",
      body:
        "Upcoming cash flow and deadlines are translated into the most useful thing to do next.",
    },
    {
      page: "Move Planner",
      target: ".timeline-card",
      eyebrow: "Plan",
      title: "Plan the whole move",
      body:
        "Compare travel options and keep tuition, arrival costs, and monthly spending in one place.",
    },
    {
      page: "AI Agent",
      target: ".chat",
      eyebrow: "Ask",
      title: "Ask using your real plan",
      body:
        "Explore your funding gap, rent scenarios, runway, or next payment in plain language.",
    },
    {
      page: "Payments",
      target: ".payment-route-card.selected",
      eyebrow: "Pay",
      title: "Compare the real cost",
      body:
        "Review total cost, delivery time, and the verified recipient before you approve anything.",
    },
    {
      page: "Security",
      target: ".audit-table",
      eyebrow: "Activity",
      title: "Follow your activity",
      body:
        "Review account changes, payment actions, and sponsor requests in your activity log.",
      tip: "You’re ready. Reopen this tour anytime from the sidebar.",
    },
  ];
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const startingPage = useRef(page);
  const startingVariation = useRef(variation);
  const current = steps[step];
  const TourIcon = {
    Dashboard: LayoutDashboard,
    Profile: UserRound,
    "Move Planner": Route,
    "AI Agent": Bot,
    Payments: CreditCard,
    Exchange: CircleDollarSign,
    Sponsors: UsersRound,
    Wallet: WalletCards,
    Security: ShieldCheck,
  }[current.page];
  useEffect(() => {
    const update = () => {
      if (!current.target) return setRect(null);
      const element = document.querySelector(current.target);
      if (!element) return setRect(null);
      setRect(element.getBoundingClientRect());
    };
    const timer = window.setTimeout(() => {
      const element = current.target
        ? document.querySelector(current.target)
        : null;
      element?.scrollIntoView({
        behavior: "auto",
        block: window.innerWidth <= 760 ? "start" : "center",
      });
      if (element && window.innerWidth <= 760) window.scrollBy(0, -88);
      requestAnimationFrame(update);
    }, 60);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [step, page, variation, current.target]);
  const move = (next: number) => {
    if (next < 0 || next >= steps.length) return;
    setRect(null);
    const item = steps[next];
    const desiredVariation =
      item.page === "Dashboard" ? (item.variation ?? 1) : variation;
    if (item.page === "Dashboard" && variation !== desiredVariation)
      chooseVariation(desiredVariation);
    if (item.page !== page) go(item.page);
    setStep(next);
  };
  const exitTour = (restore: boolean) => {
    if (restore) {
      if (startingVariation.current !== variation)
        chooseVariation(startingVariation.current);
      if (startingPage.current !== page) go(startingPage.current);
    }
    close();
  };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") exitTour(true);
      if (event.key === "ArrowRight")
        step === steps.length - 1 ? exitTour(false) : move(step + 1);
      if (event.key === "ArrowLeft" && step > 0) move(step - 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
  const cardSide =
    rect && rect.left + rect.width / 2 > window.innerWidth / 2
      ? "left"
      : "right";
  const cardVertical =
    rect && rect.top > window.innerHeight - rect.bottom ? "top" : "bottom";
  const tourCardStyle = (() => {
    if (!rect || window.innerWidth <= 760) return undefined;
    const gap = 20;
    const width = Math.min(430, window.innerWidth - gap * 2);
    const height = current.tip ? 500 : 450;
    const candidates = [
      { left: gap, top: gap },
      { left: window.innerWidth - width - gap, top: gap },
      { left: gap, top: window.innerHeight - height - gap },
      {
        left: window.innerWidth - width - gap,
        top: window.innerHeight - height - gap,
      },
    ];
    const overlap = (candidate: { left: number; top: number }) => {
      const overlapWidth = Math.max(
        0,
        Math.min(candidate.left + width, rect.right + 12) -
          Math.max(candidate.left, rect.left - 12),
      );
      const overlapHeight = Math.max(
        0,
        Math.min(candidate.top + height, rect.bottom + 12) -
          Math.max(candidate.top, rect.top - 12),
      );
      const cardCenterX = candidate.left + width / 2;
      const cardCenterY = candidate.top + height / 2;
      const distance = Math.hypot(
        cardCenterX - (rect.left + rect.width / 2),
        cardCenterY - (rect.top + rect.height / 2),
      );
      return overlapWidth * overlapHeight * 1000 - distance;
    };
    const best = candidates.sort((a, b) => overlap(a) - overlap(b))[0];
    return {
      left: best.left,
      top: Math.max(gap, best.top),
      right: "auto",
      bottom: "auto",
    };
  })();
  return (
    <div
      className="tour-layer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <div className={`tour-shade ${rect ? "has-focus" : ""}`} />
      {rect && (
        <div
          className="tour-focus"
          style={{
            left: rect.left - 8,
            top: rect.top - 8,
            width: rect.width + 16,
            height: rect.height + 16,
          }}
        />
      )}
      <section
        className={`tour-card tour-card-${cardSide} tour-card-${cardVertical}`}
        style={tourCardStyle}
      >
        <button
          className="tour-close"
          onClick={() => exitTour(true)}
          aria-label="Close tour and return"
        >
          <X />
        </button>
        <div className="tour-card-heading">
          <span className="tour-step-icon">
            <TourIcon />
          </span>
          <div className="tour-meta">
            <span>{current.eyebrow}</span>
            <b>
              Step {step + 1} of {steps.length}
            </b>
          </div>
        </div>
        <h2 id="tour-title">{current.title}</h2>
        <p>{current.body}</p>
        {current.tip && (
          <div className="tour-tip">
            <Sparkles /> <span>{current.tip}</span>
          </div>
        )}
        <div className="tour-progress">
          {steps.map((item, i) => (
            <button
              aria-label={`Go to step ${i + 1}`}
              aria-current={i === step ? "step" : undefined}
              className={i <= step ? "done" : ""}
              onClick={() => move(i)}
              key={i}
              title={item.title}
            >
              <span>{i + 1}</span>
            </button>
          ))}
        </div>
        <div className="tour-actions">
          {step > 0 ? (
            <button onClick={() => move(step - 1)}>← Back</button>
          ) : (
            <button onClick={() => exitTour(true)}>Skip tour</button>
          )}
          <button
            className="tour-next"
            onClick={() =>
              step === steps.length - 1 ? exitTour(false) : move(step + 1)
            }
          >
            {step === steps.length - 1 ? "Done" : "Next"} <ArrowRight />
          </button>
        </div>
        <small className="tour-keys">Use ← → to navigate</small>
      </section>
    </div>
  );
}

function Dashboard({
  paid,
  go,
  variation,
  checklist,
  toggleChecklist,
  database,
  onSponsorRequest,
  onSponsorPermission,
  onRateAlert,
}: {
  paid: boolean;
  go: (p: Page) => void;
  variation: Variation;
  checklist?: DatabaseState["checklist"];
  toggleChecklist: (key: string) => void;
  database: DatabaseState | null;
  onSponsorRequest: (request: {
    sponsorKey: string;
    amount: number;
    purpose: string;
    neededBy: string;
  }) => Promise<boolean>;
  onSponsorPermission: (
    sponsorKey: string,
    permission: string,
    enabled: boolean,
  ) => Promise<boolean>;
  onRateAlert: (targetRate: number) => Promise<boolean>;
}) {
  if (variation === 2) return <RunwayWorkspace database={database} />;
  if (variation === 3)
    return (
      <SponsorWorkspace
        go={go}
        database={database}
        onRequest={onSponsorRequest}
        onPermission={onSponsorPermission}
      />
    );
  if (variation === 4)
    return (
      <ExchangeWorkspace
        go={go}
        database={database}
        onRateAlert={onRateAlert}
      />
    );
  if (variation === 5)
    return (
      <DepartureWorkspace
        go={go}
        storedTasks={checklist}
        onToggle={toggleChecklist}
        config={database?.config?.departure}
      />
    );
  return <OverviewDashboard paid={paid} go={go} database={database} />;
}

function OverviewDashboard({
  paid,
  go,
  database,
}: {
  paid: boolean;
  go: (page: Page) => void;
  database: DatabaseState | null;
}) {
  const planCosts = database?.costs ?? [];
  const planFunding = database?.funding ?? [];
  const planned = planCosts.reduce((sum, item) => sum + item.amount, 0);
  const confirmed = planFunding
    .filter((item) => item.status === "confirmed")
    .reduce((sum, item) => sum + item.amount, 0);
  const coverage = fundingCoverage(planned, confirmed);
  const gap = fundingGap(planned, confirmed);
  const essentials = database?.checklist ?? [];
  const completed = essentials.filter((item) => item.done).length;
  const readiness = essentials.length
    ? Math.round((completed / essentials.length) * 100)
    : 0;
  const move = database?.config?.move ?? {};
  const arrival = move.arrivalDate;
  const arrivalTime = arrival ? Date.parse(arrival) : NaN;
  const daysAway = Number.isFinite(arrivalTime)
    ? Math.ceil((arrivalTime - Date.now()) / 86400000)
    : null;
  const destination = database?.account.countryTo || "your destination";
  const nextTask = essentials.find((item) => !item.done);
  const milestones = [
    {
      title: "Visa",
      icon: FileCheck2,
      task: essentials.find((item) => /visa/i.test(item.key)),
      page: "Move Planner" as Page,
    },
    {
      title: "Housing",
      icon: Home,
      task: essentials.find((item) => /housing/i.test(item.key)),
      page: "Move Planner" as Page,
    },
    {
      title: "Funding",
      icon: Landmark,
      task: essentials.find((item) => /emergency|fund/i.test(item.key)),
      page: "Sponsors" as Page,
    },
    {
      title: "Arrival",
      icon: Plane,
      task: undefined,
      page: "Move Planner" as Page,
    },
  ];
  return (
    <div className="consumer-dashboard move-dashboard">
      <header className="move-dashboard-welcome">
        <div>
          <h2>Hello, {database?.account.name.split(" ")[0] ?? "there"}</h2>
        </div>
      </header>

      <section className="dashboard-overview dashboard-panel">
        <div className="dashboard-overview-copy">
          <span className="dashboard-status">
            <CheckCircle2 size={15} />{" "}
            {gap === 0 ? "Fully funded" : "Plan in progress"}
          </span>
          <h1>
            {daysAway !== null && daysAway > 0
              ? `${destination} is ${daysAway} days away.`
              : `Your next chapter in ${destination}.`}
          </h1>

          <div className="dashboard-overview-actions">
            <button
              className="dashboard-primary"
              onClick={() => go(paid ? "Move Planner" : "Payments")}
            >
              {paid ? "Continue plan" : "Review payment"}
              <ArrowRight size={16} />
            </button>
            <button
              className="dashboard-text-button"
              onClick={() => go("Move Planner")}
            >
              View plan
            </button>
          </div>
        </div>
        <div className="dashboard-destination">
          <span className="dashboard-destination-tag">
            <MapPin size={14} /> {destination}
          </span>
          <svg
            className="dashboard-city"
            viewBox="0 0 420 240"
            aria-hidden="true"
          >
            <path
              d="M0 185 Q110 155 220 190 T420 175 V240 H0Z"
              fill="currentColor"
              opacity=".12"
            />
            <g fill="currentColor" opacity=".22">
              <path d="M25 190V105h35v85M75 190V130h45v60M140 190V90h48v100M205 190V115h45v75M320 190V98h55v92" />
              <path d="M270 190V65h20v125M264 65h32l-16-24zM277 41V18h6v23" />
            </g>
            <g stroke="currentColor" fill="none" opacity=".45" strokeWidth="3">
              <circle cx="105" cy="104" r="44" />
              <path d="M105 60v88M61 104h88M74 73l62 62M74 135l62-62M105 104L76 191M105 104l29 87M0 193h420" />
            </g>
          </svg>
          <div>
            <Plane size={24} />
            <h2>{destination}</h2>
            <p>
              <CalendarDays size={16} />{" "}
              {arrival ? `Arrival · ${arrival}` : "Arrival date not set"}
            </p>
          </div>
        </div>
      </section>

      <div className="dashboard-summary-grid">
        <section
          className="dashboard-panel dashboard-readiness"
          data-tour="readiness"
        >
          <div className="dashboard-card-heading">
            <h3>Readiness score</h3>
          </div>
          <div className="dashboard-score-summary">
            <div
              className="dashboard-score-ring"
              style={{
                background: `conic-gradient(var(--color-info) ${readiness}%, var(--color-line) 0)`,
              }}
            >
              <div>
                <strong>{readiness}</strong>
                <span>of 100</span>
              </div>
            </div>
            <div>
              <h4>
                {completed}/{essentials.length} essentials complete
              </h4>
              <p>
                {readiness === 100
                  ? "Ready to go"
                  : `${essentials.length - completed} remaining`}
              </p>
            </div>
          </div>
        </section>
        <section className="dashboard-panel dashboard-fund">
          <div className="dashboard-card-heading dashboard-heading-action">
            <div>
              <h3>Move fund</h3>
            </div>
            <span className="dashboard-currency">GBP</span>
          </div>
          <div className="dashboard-fund-amounts">
            <div>
              <small>Confirmed</small>
              <strong>{formatGBP(confirmed)}</strong>
            </div>
            <div>
              <small>Goal</small>
              <b>{formatGBP(planned)}</b>
            </div>
          </div>
          <div
            className="dashboard-fund-track"
            role="progressbar"
            aria-label="Funding coverage"
            aria-valuenow={Math.round(coverage)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <i style={{ width: `${Math.min(100, coverage)}%` }} />
          </div>
          <div className="dashboard-fund-caption">
            <strong>{Math.round(coverage)}% funded</strong>
            <span>{formatGBP(gap)} remaining</span>
          </div>
          <div className="dashboard-funding-sources">
            {planFunding.slice(0, 3).map((item) => (
              <div key={item.key}>
                <span>{item.name}</span>
                <strong>{formatGBP(item.amount)}</strong>
                <small>{item.status}</small>
              </div>
            ))}
          </div>
        </section>
        <section className="dashboard-panel dashboard-move-timeline">
          <div className="dashboard-card-heading dashboard-heading-action">
            <div>
              <h3>Move timeline</h3>
            </div>
            <span className="dashboard-status">
              <Clock3 size={14} />{" "}
              {daysAway !== null && daysAway > 0
                ? `${daysAway} days`
                : "In progress"}
            </span>
          </div>
          <div className="dashboard-milestones">
            {milestones.map(({ title, icon: Icon, task, page }) => (
              <button
                className={task?.done ? "done" : ""}
                key={title}
                onClick={() => go(page)}
              >
                <span className="dashboard-milestone-dot">
                  {task?.done && <Check size={14} />}
                </span>
                <strong>
                  <Icon size={15} />
                  {title}
                </strong>
                <small>
                  {task
                    ? task.done
                      ? "Complete"
                      : "To prepare"
                    : arrival || "Plan arrival"}
                </small>
              </button>
            ))}
          </div>
          <div className="dashboard-next-action" data-tour="next-action">
            <span className="dashboard-next-icon">
              <ReceiptText size={20} />
            </span>
            <div>
              <small>Next action</small>
              <strong>
                {paid
                  ? (nextTask?.label ?? "Review move plan")
                  : "Review tuition payment"}
              </strong>
            </div>
            <button
              className="dashboard-primary"
              onClick={() => go(paid ? "Move Planner" : "Payments")}
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function VariationPanel({
  variation,
  go,
}: {
  variation: Variation;
  go: (p: Page) => void;
}) {
  const [extraSpend, setExtraSpend] = useState(250);
  const [requestSent, setRequestSent] = useState(false);
  const [usdAmount, setUsdAmount] = useState(2500);
  const [tasks, setTasks] = useState([true, true, false, false]);
  if (variation === 1) return null;
  if (variation === 2) {
    const adjustedBurn = 1300 + extraSpend,
      adjustedRunway = 8900 / adjustedBurn;
    return (
      <section className="variation-panel runway-tool">
        <div className="variation-heading">
          <div>
            <span>Variation 2 · Runway lab</span>
            <h2>How long will your money last?</h2>
          </div>
          <strong>
            {adjustedRunway.toFixed(1)} <small>months</small>
          </strong>
        </div>
        <div className="runway-controls">
          <label>
            Extra monthly spending <b>{formatGBP(extraSpend)}</b>
            <input
              type="range"
              min="0"
              max="800"
              step="25"
              value={extraSpend}
              onChange={(e) => setExtraSpend(Number(e.target.value))}
            />
          </label>
          <div className="runway-track">
            <i
              style={{
                width: `${Math.min(100, (adjustedRunway / 12) * 100)}%`,
              }}
            />
            <span>Today</span>
            <span>12 months</span>
          </div>
          <p>
            At {formatGBP(adjustedBurn)}/month, your current liquid funds reach
            approximately <b>{adjustedRunway.toFixed(1)} months</b>. Irregular
            tuition payments are excluded from this stress test.
          </p>
        </div>
      </section>
    );
  }
  if (variation === 3)
    return (
      <section className="variation-panel sponsor-tool">
        <div className="variation-heading">
          <div>
            <span>Variation 3 · Sponsor desk</span>
            <h2>Coordinate the next contribution</h2>
          </div>
          <strong>
            £3,000 <small>remaining</small>
          </strong>
        </div>
        <div className="sponsor-request">
          <div>
            <span>Next commitment</span>
            <strong>£1,000 by 15 November</strong>
            <p>
              Sokha sees the tuition obligation and commitment status, not your
              wallet or personal spending.
            </p>
          </div>
          <button
            className={requestSent ? "sent" : ""}
            onClick={() => setRequestSent(true)}
          >
            {requestSent ? (
              <>
                <Check /> Request sent
              </>
            ) : (
              <>
                Request contribution <Send />
              </>
            )}
          </button>
        </div>
        <div className="commitment-line">
          <i style={{ width: "67%" }} />
          <span>£6,000 received</span>
          <span>£9,000 committed</span>
        </div>
      </section>
    );
  if (variation === 4) {
    const received = usdAmount * 0.774 - 8.4;
    return (
      <section className="variation-panel fx-tool">
        <div className="variation-heading">
          <div>
            <span>Variation 4 · Exchange desk</span>
            <h2>Preview a USD → GBP conversion</h2>
          </div>
          <button onClick={() => go("Payments")}>
            Compare routes <ArrowRight />
          </button>
        </div>
        <div className="conversion">
          <label>
            You send <span>$</span>
            <input
              type="number"
              min="10"
              value={usdAmount}
              onChange={(e) =>
                setUsdAmount(Math.max(0, Number(e.target.value)))
              }
            />
            <em>USD</em>
          </label>
          <ArrowRight />
          <label>
            Estimated arrival{" "}
            <strong>
              £{received.toLocaleString("en-GB", { maximumFractionDigits: 2 })}
            </strong>
            <em>GBP</em>
          </label>
        </div>
        <div className="rate-strip">
          <span>
            Demo rate <b>0.774</b>
          </span>
          <span>
            Provider fee <b>$8.40</b>
          </span>
          <span>
            Rate impact at −5% <b>−£{(usdAmount * 0.774 * 0.05).toFixed(0)}</b>
          </span>
        </div>
      </section>
    );
  }
  const labels = [
    "Visa and health surcharge paid",
    "Housing deposit reserved",
    "Tuition instalment prepared",
    "Emergency fund fully covered",
  ];
  const complete = tasks.filter(Boolean).length;
  return (
    <section className="variation-panel checklist-tool">
      <div className="variation-heading">
        <div>
          <span>Variation 5 · Departure checklist</span>
          <h2>{complete} of 4 financial tasks complete</h2>
        </div>
        <strong>{Math.round((complete / 4) * 100)}%</strong>
      </div>
      <div className="task-list">
        {labels.map((label, i) => (
          <button
            key={label}
            onClick={() =>
              setTasks((items) =>
                items.map((item, index) => (index === i ? !item : item)),
              )
            }
          >
            <span className={tasks[i] ? "checked" : ""}>
              {tasks[i] && <Check />}
            </span>
            <strong>{label}</strong>
            <small>
              {i === 2
                ? "Due in 12 days"
                : i === 3
                  ? "£2,700 funding gap remains"
                  : "Verified"}
            </small>
          </button>
        ))}
      </div>
    </section>
  );
}

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
        <div>
          <span>
            {number === 2
              ? "Cash-flow planning"
              : number === 3
                ? "Sponsor coordination"
                : number === 4
                  ? "Currency planning"
                  : "Departure readiness"}
          </span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
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

function RunwayWorkspace({ database }: { database: DatabaseState | null }) {
  const [tab, setTab] = useState("Forecast"),
    [extra, setExtra] = useState(250);
  const recurring =
    database?.costs.filter((item) => item.category === "Recurring") ?? [];
  const baseBurn =
    recurring.reduce((sum, item) => sum + item.amount / 12, 0) || 1300;
  const liquid =
    database?.wallets.reduce((sum, item) => sum + item.gbpValue, 0) || 8900;
  const burnRate = baseBurn + extra,
    months = liquid / burnRate,
    currentMonths = liquid / baseBurn;
  const bills = (database?.costs ?? []).map((item) => [
    item.due,
    item.name,
    formatGBP(item.amount),
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
            <BalanceForecastChart />
          </section>
          <aside className="workspace-side">
            <h3>Pressure points</h3>
            <div className="signal danger">
              <span>12 Oct</span>
              <strong>£2,000 tuition</strong>
              <p>Largest outgoing payment in the next 30 days.</p>
            </div>
            <div className="signal">
              <span>15 Nov</span>
              <strong>£1,000 arriving</strong>
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
            Additional monthly spending <strong>{formatGBP(extra)}</strong>
            <input
              type="range"
              min="0"
              max="900"
              step="25"
              value={extra}
              onChange={(e) => setExtra(Number(e.target.value))}
            />
          </label>
          <div className="scenario-compare">
            <div>
              <span>Current plan</span>
              <strong>{currentMonths.toFixed(1)} months</strong>
              <small>{formatGBP(baseBurn)} / month</small>
            </div>
            <ArrowRight />
            <div>
              <span>Adjusted plan</span>
              <strong>{months.toFixed(1)} months</strong>
              <small>{formatGBP(burnRate)} / month</small>
            </div>
          </div>
          <p className="workspace-note">
            Every extra £100 per month removes approximately{" "}
            {(currentMonths - liquid / (baseBurn + 100)).toFixed(1)} months of
            simple runway over this period.
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
              <b className={row[2].startsWith("+") ? "positive" : ""}>
                {row[2]}
              </b>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function SponsorWorkspace({
  go,
  database,
  onRequest,
  onPermission,
}: {
  go: (p: Page) => void;
  database: DatabaseState | null;
  onRequest: (request: {
    sponsorKey: string;
    amount: number;
    purpose: string;
    neededBy: string;
  }) => Promise<boolean>;
  onPermission: (
    sponsorKey: string,
    permission: string,
    enabled: boolean,
  ) => Promise<boolean>;
}) {
  const [tab, setTab] = useState("Sponsors"),
    [amount, setAmount] = useState(1000),
    [purpose, setPurpose] = useState("Living expenses"),
    [neededBy, setNeededBy] = useState("2026-11-15");
  const sponsor = database?.sponsors[0],
    sponsorConfig = database?.config?.sponsorship;
  const sent = Boolean(
    database?.sponsorRequests.some((request) => request.status === "sent"),
  );
  const transferred = Number(sponsorConfig?.transferred ?? 0);
  return (
    <div className="workspace">
      <WorkspaceHeader
        number={3}
        title="Sponsor workspace"
        description="Coordinate contributions without exposing private spending or account balances."
        tabs={["Sponsors", "Requests", "Privacy"]}
        active={tab}
        setActive={setTab}
      />
      {tab === "Sponsors" && (
        <div className="sponsor-workspace">
          <section className="sponsor-profile">
            <div className="initial">SC</div>
            <div>
              <span>Parent sponsor</span>
              <h3>{sponsor?.name}</h3>
              <p>{sponsor?.relationship} · Connected sponsor</p>
            </div>
            <button onClick={() => go("Sponsors")}>Open profile</button>
          </section>
          <div className="commitment-board">
            <div>
              <span>Annual commitment</span>
              <strong>{formatGBP(sponsor?.commitment ?? 0)}</strong>
            </div>
            <div>
              <span>Received</span>
              <strong>{formatGBP(transferred)}</strong>
            </div>
            <div>
              <span>Remaining</span>
              <strong>
                {formatGBP(
                  Math.max(0, (sponsor?.commitment ?? 0) - transferred),
                )}
              </strong>
            </div>
          </div>
          <section className="schedule">
            <h3>Contribution schedule</h3>
            {(sponsorConfig?.schedule ?? []).map((x: any[]) => (
              <div key={x[0]}>
                <time>{x[0]}</time>
                <strong>{x[1]}</strong>
                <span>{x[2]}</span>
                <em>{x[3]}</em>
              </div>
            ))}
          </section>
        </div>
      )}
      {tab === "Requests" && (
        <section className="request-builder">
          <div>
            <span>Request from</span>
            <strong>{sponsor?.name}</strong>
          </div>
          <label>
            Amount
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <em>GBP</em>
          </label>
          <label>
            Purpose
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            >
              <option>Living expenses</option>
              <option>Tuition</option>
              <option>Emergency funding</option>
            </select>
          </label>
          <label>
            Needed by
            <input
              type="date"
              value={neededBy}
              onChange={(e) => setNeededBy(e.target.value)}
            />
          </label>
          <button
            className={sent ? "sent" : ""}
            disabled={!sponsor || sent}
            onClick={() =>
              sponsor &&
              void onRequest({
                sponsorKey: sponsor.key,
                amount,
                purpose,
                neededBy,
              })
            }
          >
            {sent ? (
              <>
                <Check /> Request sent
              </>
            ) : (
              <>
                Send funding request <Send />
              </>
            )}
          </button>
        </section>
      )}
      {tab === "Privacy" && (
        <section className="privacy-panel">
          <div className="privacy-intro">
            <LockKeyhole />
            <div>
              <h3>Purpose-limited access</h3>
              <p>
                Your sponsor sees only information required to fulfill their
                commitment.
              </p>
            </div>
          </div>
          {[
            "Commitment status",
            "Sponsored tuition",
            "Funding requests",
            "Wallet balances",
          ].map((label, i) => (
            <button
              onClick={() =>
                sponsor &&
                void onPermission(
                  sponsor.key,
                  label,
                  !sponsor.permissions.includes(label),
                )
              }
              key={label}
            >
              <span>{label}</span>
              <i className={sponsor?.permissions.includes(label) ? "on" : ""}>
                {sponsor?.permissions.includes(label) ? "Visible" : "Private"}
              </i>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}

function ExchangeWorkspace({
  go,
  database,
  onRateAlert,
}: {
  go: (p: Page) => void;
  database: DatabaseState | null;
  onRateAlert: (targetRate: number) => Promise<boolean>;
}) {
  const [amount, setAmount] = useState(2500);
  const [targetRate, setTargetRate] = useState(0.79);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const bestRoute =
    database?.paymentRoutes.find((route) => route.recommended) ??
    database?.paymentRoutes[0];
  const rate = bestRoute?.fxRate ?? 0;
  const fee = bestRoute?.fee ?? 0;
  const validAmount = Number.isFinite(amount) && amount > fee && rate > 0;
  const received = validAmount ? (amount - fee) * rate : 0;
  const alert = database?.rateAlerts.find(
    (item) => item.active && item.pair === "USD/GBP",
  );
  const visibleWallets = database?.wallets ?? [];
  return (
    <div className="exchange-page-compact">
      <header className="exchange-compact-header">
        <h2>Exchange</h2>
        <span>USD → GBP · Demo estimate</span>
      </header>
      <div className="exchange-unified-panel">
        <section
          className="exchange-compact-converter"
          aria-labelledby="exchange-converter-title"
        >
          <h3 id="exchange-converter-title">Convert currency</h3>
          <div className="exchange-amounts">
            <label className="exchange-amount-box" htmlFor="exchange-send">
              <span>You send</span>
              <div>
                <b aria-hidden="true">$</b>
                <input
                  id="exchange-send"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(Number(event.target.value))}
                />
                <em>USD</em>
              </div>
            </label>
            <ArrowRight size={18} aria-hidden="true" />
            <div className="exchange-amount-box exchange-receive">
              <span>Estimated receipt</span>
              <div>
                <strong>
                  {received.toLocaleString("en-GB", {
                    style: "currency",
                    currency: "GBP",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
                <em>GBP</em>
              </div>
            </div>
          </div>
          <dl className="exchange-quote-details">
            <div>
              <dt>Rate</dt>
              <dd>{rate ? `${rate} GBP / USD` : "Unavailable"}</dd>
            </div>
            <div>
              <dt>Fee</dt>
              <dd>{formatUSD(fee)}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{bestRoute?.delivery ?? "Unavailable"}</dd>
            </div>
          </dl>
          <button
            className="exchange-primary-action"
            disabled={!validAmount}
            onClick={() => go("Payments")}
          >
            Review payment routes <ArrowRight size={16} />
          </button>
        </section>
        <section
          className="exchange-compact-alert"
          aria-labelledby="exchange-alert-title"
        >
          <h3 id="exchange-alert-title">
            <Bell size={17} /> Rate alert
          </h3>
          {alert && (
            <span className="exchange-alert-active">
              <CheckCircle2 size={14} /> Active at {alert.targetRate} GBP / USD
            </span>
          )}
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!Number.isFinite(targetRate) || targetRate <= 0) return;
              setSaving(true);
              setFeedback("");
              try {
                setFeedback(
                  (await onRateAlert(targetRate))
                    ? "Rate alert saved."
                    : "Could not save the alert. Try again.",
                );
              } catch {
                setFeedback("Could not save the alert. Try again.");
              } finally {
                setSaving(false);
              }
            }}
          >
            <label htmlFor="exchange-target">Notify me at (GBP per USD)</label>
            <div className="exchange-alert-controls">
              <input
                id="exchange-target"
                type="number"
                inputMode="decimal"
                step="0.001"
                min="0.001"
                required
                value={targetRate}
                onChange={(event) => setTargetRate(Number(event.target.value))}
              />
              <button
                type="submit"
                disabled={
                  saving || !Number.isFinite(targetRate) || targetRate <= 0
                }
              >
                {saving ? "Saving…" : alert ? "Update alert" : "Set alert"}
              </button>
            </div>
          </form>
          <p className="exchange-rate-impact">
            A 5% weaker USD reduces this estimate by{" "}
            <strong>{formatGBP(received * 0.05)}</strong>.
          </p>
          {feedback && (
            <p className="exchange-alert-feedback" role="status">
              {feedback}
            </p>
          )}
        </section>
        <section
          className="exchange-compact-balances"
          aria-labelledby="exchange-balances-title"
        >
          <div className="exchange-balances-heading">
            <h3 id="exchange-balances-title">Your balances</h3>
            <span>
              Total{" "}
              <strong>
                {formatGBP(
                  visibleWallets.reduce(
                    (sum, wallet) => sum + wallet.gbpValue,
                    0,
                  ),
                )}
              </strong>
            </span>
          </div>
          <div className="exchange-balance-grid">
            {visibleWallets.map((wallet) => (
              <div key={wallet.currency}>
                <span>{wallet.currency}</span>
                <strong>
                  {wallet.symbol}
                  {wallet.amount.toLocaleString("en-GB", {
                    maximumFractionDigits: 2,
                  })}
                </strong>
                <small>≈ {formatGBP(wallet.gbpValue)}</small>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function DepartureWorkspace({
  go,
  storedTasks,
  onToggle,
  config,
}: {
  go: (p: Page) => void;
  storedTasks?: DatabaseState["checklist"];
  onToggle: (key: string) => void;
  config?: any;
}) {
  const [tab, setTab] = useState("Checklist"),
    [tasks, setTasks] = useState([true, true, false, false]);
  const taskData =
    storedTasks ??
    [
      ["visa", "Visa fee paid", "Receipt verified", true],
      ["housing", "Housing deposit reserved", "£1,300 set aside", true],
      ["tuition", "Tuition instalment prepared", "Due in 12 days", false],
      ["emergency", "Emergency fund completed", "£2,700 gap remains", false],
    ].map(([key, label, detail, done]) => ({
      key: key as string,
      label: label as string,
      detail: detail as string,
      done: done as boolean,
    }));
  const taskValues = storedTasks?.map((x) => x.done) ?? tasks;
  const toggle = (key: string, i: number) =>
    storedTasks
      ? onToggle(key)
      : setTasks((items) => items.map((v, j) => (i === j ? !v : v)));
  return (
    <div className="workspace">
      <WorkspaceHeader
        number={5}
        title="Departure control"
        description="One place for the money, documents, and deadlines required before you fly."
        tabs={["Checklist", "Documents", "Deadlines"]}
        active={tab}
        setActive={setTab}
      />
      {tab === "Checklist" && (
        <div className="departure-grid">
          <section className="departure-score">
            <strong>{taskValues.filter(Boolean).length}/4</strong>
            <span>financial tasks complete</span>
            <div>
              {taskValues.map((done, i) => (
                <i className={done ? "done" : ""} key={i} />
              ))}
            </div>
            <p>Next required action: prepare the £2,000 tuition instalment.</p>
            <button onClick={() => go("Payments")}>
              Review payment <ArrowRight />
            </button>
          </section>
          <section className="departure-tasks">
            {taskData.map((task, i) => (
              <button key={task.key} onClick={() => toggle(task.key, i)}>
                <i className={taskValues[i] ? "checked" : ""}>
                  {taskValues[i] && <Check />}
                </i>
                <span>
                  <strong>{task.label}</strong>
                  <small>{task.detail}</small>
                </span>
              </button>
            ))}
          </section>
        </div>
      )}
      {tab === "Documents" && (
        <section className="document-list">
          {(config?.documents ?? []).map((x: string[]) => (
            <div key={x[0]}>
              <FileCheck2 />
              <span>
                <strong>{x[0]}</strong>
                <small>{x[2]}</small>
              </span>
              <em className={x[1] === "Missing" ? "missing" : ""}>{x[1]}</em>
            </div>
          ))}
        </section>
      )}
      {tab === "Deadlines" && (
        <section className="deadline-track">
          {(config?.deadlines ?? []).map((item: string[]) => (
            <div key={item[0] + item[1]}>
              <time>{item[0]}</time>
              <span>
                <strong>{item[1]}</strong>
                <small>{item[2]}</small>
              </span>
              {item[3] && <b>{item[3]}</b>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  note,
  tone = "",
}: {
  icon: typeof Home;
  label: string;
  value: string;
  note: string;
  tone?: string;
}) {
  return (
    <div className="metric card">
      <span className={`metric-icon ${tone}`}>
        <Icon />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <span>{note}</span>
      </div>
    </div>
  );
}
function BalanceForecastChart() {
  const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
  return (
    <div
      className="balance-chart"
      role="img"
      aria-label="Projected balance falls from £8,900 in September to £3,000 in February"
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
              £{10 - index * 2.5}k
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
        {months.map((month, index) => (
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
function Timeline() {
  const months = [
    { m: "Sep", v: 7000, t: "Deposit + arrival" },
    { m: "Oct", v: 3500, t: "Tuition + living" },
    { m: "Nov", v: 1300, t: "Living" },
    { m: "Dec", v: 1300, t: "Living" },
    { m: "Jan", v: 3300, t: "Tuition + living" },
    { m: "Feb", v: 1300, t: "Living" },
  ];
  return (
    <div className="timeline-chart" aria-label="Six month cash-flow outlook">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={months}
          margin={{ top: 12, right: 8, left: -18, bottom: 0 }}
        >
          <defs>
            <linearGradient id="cashFlowFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-dusty-denim-500)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--color-dusty-denim-500)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--color-dusty-denim-100)"
            strokeDasharray="3 4"
          />
          <XAxis
            dataKey="m"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-dusty-denim-600)", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-dusty-denim-500)", fontSize: 10 }}
            tickFormatter={(value) => `£${value / 1000}k`}
          />
          <Tooltip
            formatter={(value) => [formatGBP(Number(value)), "Planned outflow"]}
            labelFormatter={(_, payload) => payload[0]?.payload?.t ?? ""}
            contentStyle={{
              border: "1px solid var(--color-dusty-denim-100)",
              borderRadius: 8,
              boxShadow: "0 12px 30px color-mix(in srgb, var(--color-ink-black-900) 9.4%, transparent)",
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

function Plan({ announce }: { announce: (message: string) => void }) {
  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <span className="eyebrow">Cambodia → United Kingdom</span>
          <h2>Your study-abroad plan</h2>
          <p>
            MSc Financial Technology · Example UK University · September 2026
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => announce("Plan editing is protected in this sandbox")}
        >
          <Settings size={16} /> Edit plan
        </button>
      </section>
      <section className="metrics">
        <Metric
          icon={ReceiptText}
          label="Projected cost"
          value={formatGBP(total)}
          note="First academic year"
        />
        <Metric
          icon={WalletCards}
          label="Confirmed funding"
          value={formatGBP(funded)}
          note={`${Math.round(coverage)}% coverage`}
          tone="green"
        />
        <Metric
          icon={TrendingUp}
          label="Funding gap"
          value={formatGBP(gap)}
          note="Action recommended"
          tone="amber"
        />
        <Metric
          icon={Activity}
          label="Runway"
          value={`${baseRunway.toFixed(1)} months`}
          note="Irregular bills included"
          tone="blue"
        />
      </section>
      <div className="two-col">
        <section className="card section-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Cost plan</span>
              <h3>Year-one estimate</h3>
            </div>
            <strong>{formatGBP(total)}</strong>
          </div>
          {costs.map((c) => (
            <div className="line-item" key={c.id}>
              <span className="check-circle">
                {c.paid ? (
                  <Check />
                ) : c.category === "Recurring" ? (
                  <ReceiptText />
                ) : (
                  <Plane />
                )}
              </span>
              <div>
                <strong>{c.name}</strong>
                <small>
                  {c.category} · {c.due}
                </small>
              </div>
              <strong>{formatGBP(c.amount)}</strong>
            </div>
          ))}
        </section>
        <section className="card section-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Funding sources</span>
              <h3>Committed funds</h3>
            </div>
            <button
              className="icon-text"
              onClick={() =>
                announce("Funding source form opened in demo mode")
              }
            >
              <Plus size={16} /> Add
            </button>
          </div>
          {funding.map((f) => (
            <div className="line-item" key={f.id}>
              <span className="check-circle green">
                <Check />
              </span>
              <div>
                <strong>{f.name}</strong>
                <small>
                  {f.type} · {f.available}
                </small>
              </div>
              <strong>{formatGBP(f.amount)}</strong>
            </div>
          ))}
          <div className="gap-box">
            <div>
              <span>Remaining funding gap</span>
              <strong>{formatGBP(gap)}</strong>
            </div>
            <div className="progress">
              <span style={{ width: `${coverage}%` }} />
            </div>
            <small>{Math.round(coverage)}% of projected costs confirmed</small>
          </div>
        </section>
      </div>
    </div>
  );
}

function Profile({
  announce,
  account,
  config,
  totals,
  onSave,
  moves,
  onSwitch,
  onCreate,
}: {
  announce: (message: string) => void;
  account?: DatabaseState["account"];
  config?: any;
  totals: { funded: number; gap: number; coverage: number };
  onSave: (profile: Record<string, string>) => Promise<boolean>;
  moves: MoveProfileSummary[];
  onSwitch: (id: Id<"accounts">) => void;
  onCreate: (profile: NewMoveProfile) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<NewMoveProfile>({
    name: "",
    type: "study",
    countryFrom: account?.countryFrom ?? "",
    countryTo: "",
    arrivalDate: "",
  });
  const values = () => ({
    name: account?.name ?? "",
    home: account?.countryFrom ?? "",
    study: account?.countryTo ?? "",
    university: account?.university ?? "",
    course: account?.course ?? "",
    start: config?.courseStart ?? "",
    status: config?.financialStatus ?? "",
    income: config?.sponsorSupport ?? "",
  });
  const [profile, setProfile] = useState(values);
  useEffect(() => {
    if (!editing) setProfile(values());
  }, [account, config, editing]);
  const type = account?.moveType ?? "study";
  const types = {
    study: { label: "Study", icon: GraduationCap },
    work: { label: "Work", icon: Building2 },
    relocation: { label: "Relocation", icon: Home },
    travel: { label: "Travel", icon: Plane },
  };
  const MoveIcon = types[type].icon;
  const fields: Array<[keyof typeof profile, string]> = [
    ["name", "Full name"],
    ["home", "From"],
    ["study", "Destination"],
    ["university", type === "study" ? "University" : "Organisation / host"],
    [
      "course",
      type === "study" ? "Programme" : type === "work" ? "Role" : "Purpose",
    ],
    ["start", type === "study" ? "Study start" : "Move date"],
    ["status", "Financial status"],
    ["income", "Sponsor support"],
  ];
  const initials = profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <div className="move-profiles-page">
      <header className="move-profiles-header">
        <div>
          <h2>Your move profiles</h2>
          <p>Choose a workspace for each move.</p>
        </div>
        <button
          className="move-profile-primary"
          type="button"
          disabled={moves.length >= 20}
          aria-expanded={adding}
          aria-controls="new-move-profile"
          onClick={() => {
            setAdding(!adding);
            setError("");
          }}
        >
          <Plus size={17} /> Add move
        </button>
      </header>
      {adding && (
        <form
          id="new-move-profile"
          className="new-move-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setCreating(true);
            setError("");
            try {
              if (!(await onCreate(draft)))
                setError("Could not create this move. Please try again.");
            } finally {
              setCreating(false);
            }
          }}
        >
          <h3>Create a move profile</h3>
          <p>Starts with its own budget, sponsors, payments, and activity.</p>
          <div className="new-move-fields">
            <label>
              Profile name
              <input
                required
                maxLength={80}
                value={draft.name}
                placeholder="e.g. Singapore work move"
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </label>
            <label>
              Move type
              <select
                value={draft.type}
                onChange={(event) =>
                  setDraft({ ...draft, type: event.target.value as MoveType })
                }
              >
                {Object.entries(types).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              From
              <input
                required
                maxLength={80}
                value={draft.countryFrom}
                onChange={(event) =>
                  setDraft({ ...draft, countryFrom: event.target.value })
                }
              />
            </label>
            <label>
              Destination
              <input
                required
                maxLength={80}
                value={draft.countryTo}
                placeholder="Country or city"
                onChange={(event) =>
                  setDraft({ ...draft, countryTo: event.target.value })
                }
              />
            </label>
            <label>
              Planned arrival
              <input
                required
                type="date"
                value={draft.arrivalDate}
                onChange={(event) =>
                  setDraft({ ...draft, arrivalDate: event.target.value })
                }
              />
            </label>
          </div>
          <div className="move-profile-form-actions">
            <button
              type="button"
              disabled={creating}
              onClick={() => setAdding(false)}
            >
              Cancel
            </button>
            <button
              className="move-profile-primary"
              type="submit"
              disabled={
                creating ||
                !draft.name.trim() ||
                !draft.countryFrom.trim() ||
                !draft.countryTo.trim()
              }
            >
              {creating ? "Creating…" : "Create & switch"}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      )}
      {error && (
        <p className="move-profile-error" role="alert">
          {error}
        </p>
      )}
      <section
        className="move-profile-picker"
        aria-label="Choose your move workspace"
      >
        {moves.map((move) => {
          const Icon = types[move.type].icon;
          const active = move.id === account?._id;
          return (
            <button
              type="button"
              className={active ? "active" : ""}
              aria-pressed={active}
              key={move.id}
              onClick={() => onSwitch(move.id)}
            >
              <span className="move-picker-icon">
                <Icon size={23} />
              </span>
              <span className="move-picker-name">
                <strong>{move.name}</strong>
                <small>
                  {types[move.type].label} · {move.countryTo}
                </small>
              </span>
              <span className="move-picker-status">
                {active ? (
                  <>
                    <Check size={14} /> Active
                  </>
                ) : (
                  <ChevronRight size={17} />
                )}
              </span>
            </button>
          );
        })}
      </section>
      <section className="move-profile-detail">
        <div className="move-profile-identity">
          <div className="move-profile-avatar" aria-hidden="true">
            {initials}
          </div>
          <div>
            <span className="move-profile-type">
              <MoveIcon size={14} /> {types[type].label} profile
            </span>
            <h3>{profile.name}</h3>
            <p>
              <MapPin size={14} />
              {profile.home}
              <ArrowRight size={14} />
              {profile.study}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing(!editing);
              setError("");
            }}
            disabled={saving}
          >
            {editing ? "Cancel edit" : "Edit details"}
            <Settings size={15} />
          </button>
        </div>
        <form
          className="move-profile-details-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            setError("");
            try {
              if (await onSave(profile)) {
                setEditing(false);
                announce("Move profile saved.");
              } else setError("Could not save the profile. Please try again.");
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="move-profile-fields">
            {fields.map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                {editing ? (
                  <input
                    disabled={saving}
                    required={["name", "home", "study"].includes(key)}
                    maxLength={120}
                    value={profile[key]}
                    onChange={(event) =>
                      setProfile({ ...profile, [key]: event.target.value })
                    }
                  />
                ) : (
                  <strong>{profile[key] || "Not set"}</strong>
                )}
              </label>
            ))}
          </div>
          {editing && (
            <div className="move-profile-form-actions">
              <button
                className="move-profile-primary"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save details"}
                <Check size={16} />
              </button>
            </div>
          )}
        </form>
        <div className="move-profile-funding">
          <div>
            <span>Confirmed funding</span>
            <strong>{formatGBP(totals.funded)}</strong>
          </div>
          <div>
            <span>Funding gap</span>
            <strong>{formatGBP(totals.gap)}</strong>
          </div>
          <div>
            <span>Plan funded</span>
            <strong>{Math.round(totals.coverage)}%</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

function MovePlanner({
  go,
  config,
  essentials,
  toggleEssential,
}: {
  go: (page: Page) => void;
  config?: any;
  essentials: DatabaseState["checklist"];
  toggleEssential: (key: string) => void;
}) {
  const [months, setMonths] = useState(11);
  const [selectedRoute, setSelectedRoute] = useState(1);
  const fallbackRoutes = [
    ["Fastest Route", "Phnom Penh → London · 1 stop", "18h 21m"],
    ["Budget Option", "Phnom Penh → London · 2 stops", "28h 35m"],
    ["Budget Option", "Phnom Penh → Bangkok · 1 stop", "23h 33m"],
    ["Balanced Choice", "Phnom Penh → London · 1 stop", "23h 31m"],
  ];
  const routes = (config?.setupEmpty ? [] : config?.routes?.length ? config.routes : fallbackRoutes).map(
    (route: any[], index: number) => ({
      name:
        index === 0
          ? "Fastest Route"
          : index === 1
            ? "Budget Option"
            : index === 2
              ? "Budget Option"
              : route[0],
      detail: route[1],
      time: route[2],
    }),
  );
  if (routes.length === 3)
    routes.push({
      name: "Balanced Choice",
      detail: "Phnom Penh → London · 1 stop",
      time: "23h 31m",
    });
  const requirements = config?.setupEmpty ? [] : config?.requirements?.length
    ? config.requirements
    : [
        ["Visa & health surcharge", "Paid", "£1,600"],
        ["Flight", "Compare", "£480–610"],
        ["First month rent + deposit", "Reserved", "£1,950"],
        ["Utilities", "Estimated", "£145 / mo"],
        ["Daily expenses", "Budgeted", "£425 / mo"],
      ];
  const routeIcons = [Clock3, Banknote, Plane, Route];

  return (
    <div className="move-board">
      <section className="move-board-header">
        <div>
          <span>Move planning</span>
          <h2>Plan your arrival</h2>
          <p>
            Compare routes, prepare essential costs, and keep your arrival plan
            on track.
          </p>
        </div>
      </section>
      <div className="move-options-card">
        <div className="move-mode-stack">
          <section className="route-choice-card">
            <h3>
              <span>
                <Plane />
              </span>
              Mode
            </h3>
            <div className="route-choices">
              {!routes.length && <p>Route options will appear when your travel plan is set up.</p>}
              {routes.slice(0, 4).map((route: any, index: number) => {
                const Icon = routeIcons[index];
                return (
                  <button
                    type="button"
                    aria-pressed={selectedRoute === index}
                    className={selectedRoute === index ? "selected" : ""}
                    onClick={() => setSelectedRoute(index)}
                    key={`${route.name}-${index}`}
                  >
                    <span className="route-kind">
                      <Icon />
                    </span>
                    <span className="route-copy">
                      <strong>{route.name}</strong>
                      <small>{route.detail}</small>
                      <em>
                        <Clock3 /> {route.time}
                      </em>
                    </span>
                    <i className="route-radio" />
                  </button>
                );
              })}
            </div>
          </section>


        </div>

        <div className="move-side-stack">
          <section className="cost-card">
            <h3>
              <span>
                <ReceiptText />
              </span>
              Upfront Costs
            </h3>
            <h4>1. Upfront Costs</h4>
            {!requirements.length && <p>No costs added yet. Set your budget in Wallet.</p>}
            <div className="cost-list">
              {requirements
                .slice(0, 3)
                .map(([name, status, amount]: string[], index: number) => (
                  <div className="paid" key={name}>
                    <i>
                      <Check />
                    </i>
                    <span>
                      <strong>{index === 2 ? "Deposit" : name}</strong>
                      <small>{status}</small>
                    </span>
                    <em>Paid</em>
                    <b>{amount}</b>
                  </div>
                ))}
            </div>
            <h4>2. Monthly Recurring Costs</h4>
            <div className="cost-list recurring-costs">
              {requirements
                .slice(3, 5)
                .map(([name, status, amount]: string[]) => (
                  <div key={name}>
                    <i />
                    <span>
                      <strong>
                        {name === "Daily expenses" ? "Expenses" : name}
                      </strong>
                      <small>{status}</small>
                    </span>
                    <b>
                      {amount.replace(" / mo", "")}
                      <small>/mo</small>
                    </b>
                  </div>
                ))}
            </div>
            <button
              className="manage-budget-button"
              type="button"
              onClick={() => go("Wallet")}
            >
              Manage Budget <ArrowRight size={16} />
            </button>
          </section>
        </div>
      </div>
      <div className="move-schedule-grid">
        <section className="timeline-card">
          <div className="timeline-copy">
            <h2>Move timeline</h2>
            <div className="timeline-track">
              <div className="timeline-point">
                <b>1</b>
                <span>
                  <strong>Transfer Funds</strong>
                  <small>{config?.readyBy ?? "07 Sep 2026"}</small>
                </span>
              </div>
              <i />
              <div className="timeline-point">
                <b>3</b>
                <span>
                  <strong>Arrival</strong>
                  <small>{config?.arrivalDate ?? "14 Sep 2026"}</small>
                </span>
              </div>
            </div>
          </div>
          <div className="timeline-budget">
            <small>Estimated total budget</small>
            <strong>{config?.setupEmpty ? "Set your budget" : "£23,120"}</strong>
          </div>
          <section className="move-essentials-card">
            <h3>
              <FileCheck2 size={19} /> Move essentials{" "}
              <small>
                {essentials.filter((item) => item.done).length}/
                {essentials.length}
              </small>
            </h3>
            <div className="move-essential-list">
              {essentials.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  aria-pressed={item.done}
                  onClick={() => toggleEssential(item.key)}
                >
                  <span
                    className={`move-essential-check ${item.done ? "done" : ""}`}
                  >
                    {item.done && <Check size={14} />}
                  </span>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <span className="move-essential-status">
                    {item.done ? "Complete" : "To do"}
                  </span>
                </button>
              ))}
              {!essentials.length && <p>No move essentials yet.</p>}
            </div>
          </section>
        </section>
        <PlanningCalendar
          arrival={config?.arrivalDate ?? "14 Sep 2026"}
          months={months}
          setMonths={setMonths}
        />
      </div>
    </div>
  );
}

function PlanningCalendar({
  arrival,
  months,
  setMonths,
}: {
  arrival: string;
  months: number;
  setMonths: (months: number) => void;
}) {
  const parsed = new Date(arrival);
  const arrivalDate = Number.isNaN(parsed.getTime()) ? null : parsed;
  const initialDate = arrivalDate ?? new Date();
  const [offset, setOffset] = useState(0);
  const viewedMonth = new Date(
    Date.UTC(
      initialDate.getUTCFullYear(),
      initialDate.getUTCMonth() + offset,
      1,
    ),
  );
  const year = viewedMonth.getUTCFullYear();
  const month = viewedMonth.getUTCMonth();
  const leadingDays = (viewedMonth.getUTCDay() + 6) % 7;
  const dayCount = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Math.ceil((leadingDays + dayCount) / 7) * 7;
  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(viewedMonth);
  return (
    <section
      className="horizon-card planning-calendar"
      aria-label="Planning horizon calendar"
    >
      <div className="horizon-title">
        <h3>
          <CalendarDays /> Planning horizon
        </h3>
      </div>
      <div className="planning-calendar-arrival">
        <span>
          <Plane size={17} /> Planned arrival
        </span>
        <strong>{arrival}</strong>
      </div>
      <div className="planning-calendar-month">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setOffset((value) => value - 1)}
        >
          <ChevronRight className="calendar-previous" size={17} />
        </button>
        <strong aria-live="polite">{monthLabel}</strong>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setOffset((value) => value + 1)}
        >
          <ChevronRight size={17} />
        </button>
      </div>
      <div className="planning-calendar-grid" aria-label={monthLabel}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <span className="calendar-weekday" key={day}>
            {day}
          </span>
        ))}
        {Array.from({ length: cells }, (_, index) => {
          const day = index - leadingDays + 1;
          if (day < 1 || day > dayCount)
            return <span key={index} aria-hidden="true" />;
          const isArrival =
            arrivalDate?.getUTCFullYear() === year &&
            arrivalDate.getUTCMonth() === month &&
            arrivalDate.getUTCDate() === day;
          return (
            <span
              key={index}
              className={`calendar-day ${isArrival ? "arrival-day" : ""}`}
              aria-label={
                isArrival
                  ? `${day} ${monthLabel}, planned arrival`
                  : `${day} ${monthLabel}`
              }
            >
              {day}
            </span>
          );
        })}
      </div>
      {offset !== 0 && (
        <button
          type="button"
          className="calendar-return"
          onClick={() => setOffset(0)}
        >
          Back to {arrivalDate ? "arrival month" : "current month"}
        </button>
      )}
      <div className="planning-calendar-horizon">
        <label htmlFor="planning-horizon">
          Planning horizon{" "}
          <strong>
            {months} {months === 1 ? "month" : "months"}
          </strong>
        </label>
        <input
          id="planning-horizon"
          type="range"
          min="1"
          max="24"
          value={months}
          onChange={(event) => setMonths(Number(event.target.value))}
        />
      </div>
    </section>
  );
}

function LegacyMovePlanner({
  go,
  config,
}: {
  go: (page: Page) => void;
  config?: any;
}) {
  const [months, setMonths] = useState(12);
  const [locationOpen, setLocationOpen] = useState(false);
  const oneTime = config?.oneTime ?? 0,
    recurring = config?.monthly ?? 0,
    tuition = config?.tuition ?? 0,
    totalMove = oneTime + recurring * months + tuition;
  const routes = (config?.routes ?? []).map((r: any[]) => ({
    name: r[0],
    detail: r[1],
    time: r[2],
    cost: r[3],
    ease: r[4],
    best: r[5],
  })); /* offline renders an empty state */
  /*
  const legacyRoutes = [
    {
      name: "Direct flight",
      detail: "Phnom Penh → London · 1 stop",
      time: "16h 40m",
      cost: "£610",
      ease: "Easiest",
      best: true,
    },
    {
      name: "Budget flight",
      detail: "Phnom Penh → Bangkok → London · 2 stops",
      time: "22h 10m",
      cost: "£480",
      ease: "More effort",
    },
    {
      name: "Flexible flight",
      detail: "Phnom Penh → Singapore → London · 1 stop",
      time: "18h 25m",
      cost: "£545",
      ease: "Good balance",
    },
  ]; */
  const transportIcons = [Train, Bus, CircleDollarSign];
  const transport = (config?.transport ?? []).map(
    (item: any[], index: number) => ({
      icon: transportIcons[index] ?? CircleDollarSign,
      name: item[0],
      detail: item[1],
      cost: item[2],
    }),
  );
  return (
    <div className="page-stack move-page">
      <section className="page-intro">
        <div>
          <span className="eyebrow">Cambodia → United Kingdom</span>
          <h2>Move planner</h2>
          <p>
            Arrival requirements, real living costs, routes, and transport in
            one decision view.
          </p>
        </div>
        <div className="arrival-chip">
          <CalendarDays />
          <span>
            Planned arrival<strong>{config?.arrivalDate}</strong>
          </span>
        </div>
      </section>
      <section className="move-summary">
        <div>
          <span>Estimated move + {months} months</span>
          <strong>{formatGBP(totalMove)}</strong>
          <small>Includes tuition, arrival and living costs</small>
        </div>
        <div>
          <span>Ready by</span>
          <strong>{config?.readyBy}</strong>
          <small>Recommended funds-transfer date</small>
        </div>
      </section>
      <div className="planner-grid">
        <section className="planner-panel">
          <div className="panel-title">
            <span>
              <FileCheck2 />
            </span>
            <div>
              <small>Arrival readiness</small>
              <h3>Requirements</h3>
            </div>
            <b>4 of 6 ready</b>
          </div>
          {(config?.requirements ?? []).map(
            ([name, status, amount]: string[]) => (
              <div className="requirement" key={name}>
                <i
                  className={
                    status === "Paid" ||
                    status === "Reserved" ||
                    status === "Budgeted"
                      ? "done"
                      : ""
                  }
                >
                  {status === "Paid" ||
                  status === "Reserved" ||
                  status === "Budgeted" ? (
                    <Check />
                  ) : null}
                </i>
                <span>
                  <strong>{name}</strong>
                  <small>{status}</small>
                </span>
                <b>{amount}</b>
              </div>
            ),
          )}
          <label className="months-control">
            <span>Planning horizon</span>
            <input
              type="range"
              min="1"
              max="24"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
            />
            <b>{months} months</b>
          </label>
        </section>
        <section className="planner-panel route-panel">
          <div className="panel-title">
            <span>
              <Plane />
            </span>
            <div>
              <small>Route comparison</small>
              <h3>Getting there</h3>
            </div>
          </div>
          {routes.map((route: any) => (
            <article
              className={route.best ? "best-route" : ""}
              key={route.name}
            >
              <div>
                <strong>
                  {route.name}
                  {route.best && <em>Recommended</em>}
                </strong>
                <p>{route.detail}</p>
              </div>
              <span>
                {route.time}
                <small>{route.ease}</small>
              </span>
              <b>{route.cost}</b>
            </article>
          ))}
        </section>
      </div>
      <button
        className="disclosure-button"
        onClick={() => setLocationOpen((open) => !open)}
      >
        {locationOpen
          ? "Hide location details"
          : "View apartment & transport details"}
        <ChevronRight />
      </button>
      {locationOpen && (
        <section className="location-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Apartment location</span>
              <h3>{config?.apartment}</h3>
              <p>
                Balanced for university access, groceries, and city connections.
              </p>
            </div>
            <span className="status success">
              <Check /> Best overall fit
            </span>
          </div>
          <div className="location-grid">
            <div className="mini-map">
              <span className="map-home">
                <Home />
              </span>
              <span className="map-uni">
                <GraduationCap />
              </span>
              <i />
              <b>4.8 km</b>
            </div>
            <div className="distance-list">
              <div>
                <span>
                  <GraduationCap />
                  University
                </span>
                <strong>18 min</strong>
                <small>Train · 4.8 km</small>
              </div>
              <div>
                <span>
                  <Building2 />
                  City centre
                </span>
                <strong>22 min</strong>
                <small>Bus · 6.1 km</small>
              </div>
              <div>
                <span>
                  <Landmark />
                  Bank branch
                </span>
                <strong>7 min</strong>
                <small>Walk · 0.6 km</small>
              </div>
            </div>
            <div className="transport-list">
              {transport.map(({ icon: Icon, ...item }: any) => (
                <div key={item.name}>
                  <Icon />
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <b>{item.cost}</b>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Agent({
  storedMessages,
  onSend,
}: {
  storedMessages?: DatabaseState["messages"];
  onSend: (text: string) => void;
}) {
  const [messages, setMessages] = useState([
    {
      from: "agent",
      text: "Good morning, Dara. I can explain your plan, simulate changes, or help prepare your upcoming tuition payment.",
    },
  ]);
  const [input, setInput] = useState("");
  const reply = (question: string) => {
    if (!question.trim()) return;
    if (storedMessages) {
      onSend(question);
    } else
      setMessages((m) => [
        ...m,
        { from: "user", text: question },
        {
          from: "agent",
          text: question.toLowerCase().includes("rent")
            ? "A £900/month apartment adds £3,000 over 12 months. Your funding gap would rise from £2,700 to £5,700, and estimated runway would fall from 6.8 to 5.7 months. I would keep rent near £650 unless you confirm more funding."
            : question.toLowerCase().includes("payment") ||
                question.toLowerCase().includes("tuition")
              ? "Your £2,000 instalment is due in 12 days. Provider A has the lowest estimated total cost and a verified recipient. I can take you to the review—execution still requires your explicit approval."
              : "Your plan is 89% funded. The immediate priority is the £2,000 tuition instalment, followed by confirming your sponsor contribution for 15 November.",
        },
      ]);
    setInput("");
  };
  const visibleMessages = storedMessages ?? messages;
  const starters = [
    "How much can I safely spend each month?",
    "Explain my current funding gap",
    "What should I pay next?",
    "How will a £900 rent change my runway?",
  ];
  return (
    <div className="agent-layout">
      <section className="chat agent-chat-workspace">
        <div className="agent-conversation">
          {visibleMessages.length <= 1 && (
            <div className="agent-welcome-state">
              <span className="agent-welcome-icon">
                <Sparkles />
              </span>
              <h2>How can I help with your plan?</h2>
              <p>
                Ask about funding, spending, payments, or your move to the UK.
              </p>
              <div className="agent-capabilities">
                <span>
                  <TrendingUp /> Plan
                </span>
                <span>
                  <ReceiptText /> Explain
                </span>
                <span>
                  <CircleDollarSign /> Compare
                </span>
                <span>
                  <GraduationCap /> Prepare
                </span>
              </div>
              <div className="agent-starters">
                {starters.map((starter) => (
                  <button key={starter} onClick={() => reply(starter)}>
                    {starter}
                    <ArrowRight />
                  </button>
                ))}
              </div>
            </div>
          )}
          {visibleMessages.length > 1 && (
            <div className="messages">
              {visibleMessages.map((m, i) => (
                <div
                  className={`message ${m.from}`}
                  key={"_id" in m ? String(m._id) : i}
                >
                  {m.from === "agent" && <Bot size={17} />}
                  <p>{m.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="agent-composer-wrap">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              reply(input);
            }}
          >
            <input
              aria-label="Ask your financial agent"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your plan, runway, or payments…"
            />
            <div className="agent-composer-meta">
              <span>
                <ShieldCheck /> Plan-aware
              </span>
              <span>Informational guidance</span>
            </div>
            <button aria-label="Send">
              <Send />
            </button>
          </form>
          <small className="disclaimer">
            Financial actions always require your approval.
          </small>
        </div>
      </section>
    </div>
  );
}

function Payments({
  status,
  paid,
  prepare,
  approve,
  execute,
  storedRoute,
  onSelectRoute,
  storedRoutes,
  config,
  costs,
}: {
  status: PaymentStatus;
  paid: boolean;
  prepare: () => void;
  approve: () => void;
  execute: () => void;
  storedRoute?: string;
  onSelectRoute: (route: string) => void;
  storedRoutes?: DatabaseState["paymentRoutes"];
  config?: any;
  costs: DatabaseState["costs"];
}) {
  const [localSelected, setLocalSelected] = useState("wise");
  const [consent, setConsent] = useState(false);
  const selected = storedRoute ?? localSelected;
  const setSelected = (route: string) => {
    setLocalSelected(route);
    onSelectRoute(route);
  };
  const availableRoutes =
    storedRoutes?.map((r) => ({ ...r, id: r.key })) ?? routes;
  const route =
    availableRoutes.find((r) => r.id === selected) ?? availableRoutes[0];
  const amount = config?.paymentAmount ?? 0;
  const recipient = config?.recipient ?? "Example UK University";
  const currentStep =
    status === "not_started" ? 1 : status === "prepared" ? 2 : 3;
  const paymentSteps = ["Route", "Confirm", "Send"];
  if (!availableRoutes.length || amount <= 0) return (
    <div className="payments-page payment-checkout"><section className="payment-checkout-header"><div><h2>Payments</h2><p>No payment has been set up for this move yet.</p></div></section><UpcomingPayments costs={costs} /></div>
  );
  return (
    <div className="payments-page payment-checkout">
      <section className="payment-checkout-header">
        <div>
          <span className="eyebrow">Tuition payment</span>
          <h2>Payments</h2>
          <p>Compare routes, review the total, and approve.</p>
        </div>
        <ol className="payment-steps" aria-label="Payment progress">
          {paymentSteps.map((label, index) => {
            const step = index + 1;
            return (
              <li
                className={
                  step === currentStep
                    ? "active"
                    : step < currentStep
                      ? "complete"
                      : ""
                }
                aria-current={step === currentStep ? "step" : undefined}
                key={label}
              >
                <span>{step < currentStep ? <Check /> : step}</span>
                <b>{label}</b>
              </li>
            );
          })}
        </ol>
      </section>
      {paid && (
        <div className="success-banner payment-success-banner">
          <CheckCircle2 />
          <div>
            <strong>Payment completed</strong>
            <p>
              {formatGBP(amount)} delivered to {recipient} · Reference{" "}
              {config?.transactionReference}
            </p>
          </div>
        </div>
      )}
      <div className="payment-checkout-grid">
        <section className="payment-route-panel">
          <div className="payment-section-heading">
            <h3>Choose a payment route</h3>
          </div>
          <div className="payment-route-cards">
            {availableRoutes.map((r, index) => {
              const RouteIcon =
                r.id.includes("swift") ||
                r.provider.toLowerCase().includes("bank")
                  ? Landmark
                  : r.id.includes("card") ||
                      r.provider.toLowerCase().includes("card")
                    ? CreditCard
                    : Send;
              return (
                <button
                  type="button"
                  className={`payment-route-card ${selected === r.id ? "selected" : ""}`}
                  aria-pressed={selected === r.id}
                  onClick={() => setSelected(r.id)}
                  key={r.id}
                >
                  <span className="payment-route-select">
                    {selected === r.id ? <Check /> : index + 1}
                  </span>
                  <span className="payment-route-icon">
                    <RouteIcon />
                  </span>
                  <span className="payment-route-provider">
                    <strong>{r.provider}</strong>
                    {r.recommended && <em>Best value</em>}
                  </span>
                  <span className="payment-route-stat">
                    <small>Total cost</small>
                    <b>{formatUSD(routeEffectiveCost(r))}</b>
                  </span>
                  <span className="payment-route-stat">
                    <small>Arrives</small>
                    <b>{r.delivery}</b>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="payment-recipient-card">
            <div className="payment-recipient-copy">
              <span>Recipient</span>
              <strong>{recipient}</strong>
              <small>
                Account •••• {config?.recipientAccountLast4 ?? "1842"} ·{" "}
                {config?.swift ?? "EXUKGB2L"}
              </small>
            </div>
            <span className="payment-recipient-verified">
              <ShieldCheck /> Verified
            </span>
            <div className="payment-recipient-icon">
              <Landmark />
            </div>
          </div>
        </section>
        <aside className="payment-checkout-review">
          <h3>Payment summary</h3>
          <div className="payment-total-row">
            <span>University receives</span>
            <strong>{formatGBP(amount)}</strong>
          </div>
          <dl className="payment-summary-list">
            <div>
              <dt>You send</dt>
              <dd>{formatUSD(route.sourceAmount)}</dd>
            </div>
            <div>
              <dt>Provider fee</dt>
              <dd>{formatUSD(route.fee)}</dd>
            </div>
            <div>
              <dt>Exchange rate</dt>
              <dd>{route.fxRate} GBP / USD</dd>
            </div>
          </dl>
          <div className="payment-arrival-card">
            <span>
              <small>Expected arrival</small>
              <strong>{config?.sendBy ?? route.delivery}</strong>
            </span>
            <CalendarDays />
          </div>
          <div className="payment-control-note">
            <ShieldCheck />
            <div>
              <strong>You stay in control</strong>
              <p>Nothing moves until you approve.</p>
            </div>
          </div>
          {status === "not_started" && (
            <button className="payment-action" onClick={prepare}>
              Prepare payment <ArrowRight />
            </button>
          )}
          {status === "prepared" && (
            <>
              <label className="payment-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>I checked the recipient and total.</span>
              </label>
              <button
                className="payment-action"
                disabled={!consent}
                onClick={approve}
              >
                Approve payment <LockKeyhole />
              </button>
            </>
          )}
          {status === "approved" && (
            <button className="payment-action" onClick={execute}>
              Send payment <ArrowRight />
            </button>
          )}
          {status === "processing" && (
            <button className="payment-action" disabled>
              <span className="spinner" /> Processing securely…
            </button>
          )}
          {status === "completed" && (
            <button className="payment-action complete">
              <CheckCircle2 /> Payment complete
            </button>
          )}
          <small className="payment-sandbox-note">
            Sandbox · no real funds
          </small>
        </aside>
        <UpcomingPayments costs={costs} />
      </div>
    </div>
  );
}

function UpcomingPayments({ costs }: { costs: DatabaseState["costs"] }) {
  const upcoming = costs.filter((item) => !item.paid);
  return (
    <section className="planner-upcoming-payments">
      <div className="dashboard-card-heading">
        <h3>Upcoming payments</h3>
      </div>
      <div className="dashboard-task-list">
        {upcoming.length ? (
          upcoming.map((item) => (
            <div key={item.key} className="dashboard-task">
              <span className="dashboard-task-date">
                <CalendarDays size={18} />
                <small>{item.due || "Planned"}</small>
              </span>
              <span>
                <strong>{item.name}</strong>
                <small>
                  {formatGBP(item.amount)} · {item.category}
                </small>
              </span>
            </div>
          ))
        ) : (
          <p className="dashboard-empty">
            <CheckCircle2 size={20} /> All planned payments are complete.
          </p>
        )}
      </div>
    </section>
  );
}

function Sponsors({
  sponsorOnly = false,
  userCode = "",
  links = [],
  onRespond,
  storedSponsors,
  config,
  requests,
  onAdd,
  onRequest,
  onPermission,
}: {
  sponsorOnly?: boolean;
  userCode?: string;
  links?: DatabaseState["sponsorLinks"];
  onRespond?: (id: Id<"sponsorLinks">, accept: boolean) => Promise<boolean>;
  storedSponsors: DatabaseState["sponsors"];
  config?: any;
  requests: DatabaseState["sponsorRequests"];
  onAdd: (sponsor: NewSponsor) => Promise<boolean>;
  onRequest: (request: {
    sponsorKey: string;
    amount: number;
    purpose: string;
    neededBy: string;
  }) => Promise<boolean>;
  onPermission: (
    sponsorKey: string,
    permission: string,
    enabled: boolean,
  ) => Promise<boolean>;
}) {
  const [adding, setAdding] = useState(sponsorOnly);
  const [saving, setSaving] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [reviewing, setReviewing] = useState<Id<"sponsorLinks"> | null>(null);
  const [draft, setDraft] = useState({
    userCode: "",
    email: "",
    name: "",
    relationship: "Parent",
    commitment: "",
    nextDate: "",
  });
  const [request, setRequest] = useState({
    amount: "",
    purpose: "Living expenses",
    neededBy: "",
  });
  const [requesting, setRequesting] = useState(false);
  const [permissionSaving, setPermissionSaving] = useState(false);
  const selected = storedSponsors.find(
    (sponsor) => sponsor.key === selectedKey,
  );
  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(date);
  };
  return (
    <div className="sponsors-id-page">
      <header className="sponsors-id-header">
        <div>
          <h2>{sponsorOnly ? "Connect with a user" : "Your sponsors"}</h2>
          <p>
            {sponsorOnly
              ? "Send a request using their move code."
              : "Review sponsor requests and manage contributions."}
          </p>
        </div>
        {sponsorOnly && (
          <button
            type="button"
            className="sponsor-primary"
            aria-expanded={adding}
            aria-controls="add-sponsor-form"
            onClick={() => {
              setAdding(!adding);
              setFeedback("");
            }}
          >
            <Plus size={17} />{" "}
            {sponsorOnly ? "Request form" : "Sponsor request form"}
          </button>
        )}
      </header>
      {!sponsorOnly && (
        <section className="sponsor-code-panel">
          <div>
            <h3>Your move code</h3>
            <p>Share this code and link with your sponsor.</p>
            <code>{userCode}</code>
          </div>
          <div>
            <button
              className="sponsor-primary"
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(userCode);
                  setFeedback("Code copied.");
                } catch {
                  setFeedback("Copy the code shown above.");
                }
              }}
            >
              Copy code
            </button>
            <a
              href={`${window.location.pathname}?sponsor=1`}
              target="_blank"
              rel="noreferrer"
            >
              Open sponsor form <ArrowRight size={15} />
            </a>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${window.location.origin}${window.location.pathname}?sponsor=1`,
                  );
                  setFeedback("Sponsor link copied.");
                } catch {
                  setFeedback("Open the sponsor form and copy its address.");
                }
              }}
            >
              Copy sponsor link
            </button>
          </div>
        </section>
      )}
      {!sponsorOnly && links.length > 0 && (
        <section className="sponsor-incoming">
          <h3>
            Pending requests <span>{links.length}</span>
          </h3>
          {links.map((link) => (
            <article key={link._id}>
              <div>
                <strong>{link.name}</strong>
                <small>
                  {link.relationship} · {link.email}
                </small>
                <small>
                  {formatGBP(link.commitment)} committed ·{" "}
                  {formatDate(link.nextDate)}
                </small>
              </div>
              <div>
                {[true, false].map((accept) => (
                  <button
                    type="button"
                    key={String(accept)}
                    className={accept ? "sponsor-primary" : ""}
                    disabled={reviewing !== null}
                    onClick={async () => {
                      setReviewing(link._id);
                      try {
                        const saved = await onRespond?.(link._id, accept);
                        setFeedback(
                          saved
                            ? `Request ${accept ? "accepted" : "declined"}.`
                            : "Could not review this request.",
                        );
                      } finally {
                        setReviewing(null);
                      }
                    }}
                  >
                    {reviewing === link._id
                      ? "…"
                      : accept
                        ? "Accept"
                        : "Decline"}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}
      {adding && (
        <form
          id="add-sponsor-form"
          className="sponsor-add-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            setFeedback("");
            try {
              const saved = await onAdd({
                userCode: draft.userCode.trim(),
                email: draft.email.trim(),
                name: draft.name.trim(),
                relationship: draft.relationship.trim(),
                commitment: Number(draft.commitment),
                nextDate: draft.nextDate,
              });
              if (saved) {
                setAdding(false);
                setDraft({
                  userCode: "",
                  email: "",
                  name: "",
                  relationship: "Parent",
                  commitment: "",
                  nextDate: "",
                });
                setFeedback(
                  "Request sent. The user must accept before you are linked.",
                );
              } else
                setFeedback(
                  "Could not send the request. Check the code and details, or whether a request is already pending.",
                );
            } catch {
              setFeedback(
                "Could not send the request. Check the code and details, or whether a request is already pending.",
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          <h3>Send a sponsor request</h3>
          <p>For sponsors: enter the user’s move code and your details.</p>
          <div className="sponsor-add-fields">
            <label>
              User’s move code
              <input
                required
                value={draft.userCode}
                onChange={(event) =>
                  setDraft({ ...draft, userCode: event.target.value })
                }
                placeholder="FP-…"
              />
            </label>
            <label>
              Your email
              <input
                required
                type="email"
                maxLength={254}
                value={draft.email}
                onChange={(event) =>
                  setDraft({ ...draft, email: event.target.value })
                }
              />
            </label>
            <label>
              Name
              <input
                required
                maxLength={80}
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
                placeholder="Full name"
              />
            </label>
            <label>
              Relationship
              <input
                required
                maxLength={60}
                value={draft.relationship}
                onChange={(event) =>
                  setDraft({ ...draft, relationship: event.target.value })
                }
                placeholder="Parent, family, organisation…"
              />
            </label>
            <label>
              Commitment (GBP)
              <input
                required
                type="number"
                inputMode="decimal"
                min="0"
                max="1000000000"
                step="0.01"
                value={draft.commitment}
                onChange={(event) =>
                  setDraft({ ...draft, commitment: event.target.value })
                }
                placeholder="0.00"
              />
            </label>
            <label>
              Next contribution
              <input
                required
                type="date"
                value={draft.nextDate}
                onChange={(event) =>
                  setDraft({ ...draft, nextDate: event.target.value })
                }
              />
            </label>
          </div>
          <div className="sponsor-form-actions">
            <button
              type="button"
              disabled={saving}
              onClick={() => setAdding(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="sponsor-primary"
              disabled={
                saving ||
                !draft.userCode.trim() ||
                !draft.email.trim() ||
                !draft.name.trim() ||
                !draft.relationship.trim()
              }
            >
              {saving ? "Sending…" : "Send request"}
              <Check size={16} />
            </button>
          </div>
        </form>
      )}
      {feedback && (
        <p className="sponsor-feedback" role="status">
          {feedback}
        </p>
      )}
      <div className="sponsor-id-grid">
        {storedSponsors.map((sponsor) => {
          const initials = sponsor.name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase();
          const sponsorRequests = requests.filter(
            (item) => item.sponsorKey === sponsor.key,
          );
          return (
            <article
              className={`sponsor-id-card ${selectedKey === sponsor.key ? "selected" : ""}`}
              key={sponsor.key}
            >
              <div className="sponsor-id-top">
                <span>
                  <UsersRound size={14} /> Financial Passport
                </span>
                <span className="sponsor-id-tag">Sponsor</span>
              </div>
              <div className="sponsor-id-person">
                <div className="sponsor-id-avatar" aria-hidden="true">
                  {initials}
                </div>
                <div>
                  <h3>{sponsor.name}</h3>
                  <span>{sponsor.relationship}</span>
                </div>
              </div>
              <dl className="sponsor-id-facts">
                <div>
                  <dt>Commitment</dt>
                  <dd>{formatGBP(sponsor.commitment)}</dd>
                </div>
                <div>
                  <dt>Next contribution</dt>
                  <dd>{formatDate(sponsor.nextDate)}</dd>
                </div>
              </dl>
              <div className="sponsor-id-footer">
                <span>
                  {
                    sponsorRequests.filter((item) => item.status === "sent")
                      .length
                  }{" "}
                  pending requests
                </span>
                <button
                  type="button"
                  aria-expanded={selectedKey === sponsor.key}
                  aria-controls="sponsor-details"
                  onClick={() => {
                    setSelectedKey(
                      selectedKey === sponsor.key ? null : sponsor.key,
                    );
                    setRequest({
                      amount: "",
                      purpose: "Living expenses",
                      neededBy: "",
                    });
                    setFeedback("");
                  }}
                >
                  {selectedKey === sponsor.key
                    ? "Close details"
                    : "View details"}
                  <ChevronRight size={15} />
                </button>
              </div>
            </article>
          );
        })}
        <button
          type="button"
          className="sponsor-add-tile"
          onClick={() => {
            setAdding(true);
            setFeedback("");
          }}
        >
          <span>
            <Plus size={24} />
          </span>
          <strong>Add a sponsor</strong>
          <small>Family, friends or an organisation</small>
        </button>
      </div>
      {selected && (
        <section
          id="sponsor-details"
          className="sponsor-details-panel"
          aria-label={`Details for ${selected.name}`}
        >
          <div className="sponsor-details-heading">
            <h3>{selected.name}</h3>
            <button
              type="button"
              aria-label="Close sponsor details"
              onClick={() => setSelectedKey(null)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="sponsor-details-grid">
            <div>
              <h4>Contribution request</h4>
              <form
                className="sponsor-request-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setRequesting(true);
                  setFeedback("");
                  try {
                    const sent = await onRequest({
                      sponsorKey: selected.key,
                      amount: Number(request.amount),
                      purpose: request.purpose.trim(),
                      neededBy: request.neededBy,
                    });
                    setFeedback(
                      sent
                        ? `Request sent to ${selected.name}.`
                        : "Could not send the request. Try again.",
                    );
                  } catch {
                    setFeedback("Could not send the request. Try again.");
                  } finally {
                    setRequesting(false);
                  }
                }}
              >
                <label>
                  Amount (GBP)
                  <input
                    required
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    value={request.amount}
                    onChange={(event) =>
                      setRequest({ ...request, amount: event.target.value })
                    }
                  />
                </label>
                <label>
                  Purpose
                  <input
                    required
                    maxLength={120}
                    value={request.purpose}
                    onChange={(event) =>
                      setRequest({ ...request, purpose: event.target.value })
                    }
                  />
                </label>
                <label>
                  Needed by
                  <input
                    required
                    type="date"
                    value={request.neededBy}
                    onChange={(event) =>
                      setRequest({ ...request, neededBy: event.target.value })
                    }
                  />
                </label>
                <button
                  className="sponsor-primary"
                  type="submit"
                  disabled={requesting}
                >
                  {requesting ? "Sending…" : "Request contribution"}
                  <Send size={15} />
                </button>
              </form>
              <div className="sponsor-request-history">
                {requests
                  .filter((item) => item.sponsorKey === selected.key)
                  .map((item) => (
                    <div key={item._id}>
                      <span>
                        {item.purpose}
                        <small>
                          {formatDate(item.neededBy)} · {item.status}
                        </small>
                      </span>
                      <strong>{formatGBP(item.amount)}</strong>
                    </div>
                  ))}
              </div>
              {selected.key === "sp1" && config?.schedule?.length > 0 && (
                <div className="sponsor-planned-schedule">
                  <h4>Planned contributions</h4>
                  {config.schedule.map((item: any[]) => (
                    <div key={`${item[0]}-${item[1]}`}>
                      <span>
                        {item[1]}
                        <small>{item[0]}</small>
                      </span>
                      <strong>{formatGBP(Number(item[2]))}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="sponsor-sharing">
              <h4>
                <LockKeyhole size={16} /> Sharing permissions
              </h4>
              <p>Choose what this sponsor can view.</p>
              {[
                "Commitment status",
                "Sponsored tuition",
                "Funding requests",
                "Wallet balances",
              ].map((permission) => (
                <button
                  type="button"
                  role="switch"
                  aria-checked={selected.permissions.includes(permission)}
                  disabled={permissionSaving}
                  key={permission}
                  onClick={async () => {
                    setPermissionSaving(true);
                    try {
                      await onPermission(
                        selected.key,
                        permission,
                        !selected.permissions.includes(permission),
                      );
                    } finally {
                      setPermissionSaving(false);
                    }
                  }}
                >
                  <span>{permission}</span>
                  <strong>
                    {selected.permissions.includes(permission)
                      ? "Shared"
                      : "Private"}
                  </strong>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function BudgetEditor({
  budget,
  costs,
  available,
  onSave,
  allocation,
}: {
  budget?: BudgetAllocation[];
  costs: DatabaseState["costs"];
  available: number;
  allocation: ReactNode;
  onSave: (allocations: BudgetAllocation[]) => Promise<boolean>;
}) {
  const [rows, setRows] = useState(() =>
    (
      budget ??
      costs
        .slice(0, 20)
        .map((item) => ({ category: item.name, amount: item.amount }))
    ).map((item) => ({
      id: crypto.randomUUID(),
      category: item.category,
      amount: String(item.amount),
    })),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const total = rows.reduce(
    (sum, row) =>
      sum + (Number.isFinite(Number(row.amount)) ? Number(row.amount) : 0),
    0,
  );
  const remaining = available - total;
  const updateRow = (
    id: string,
    field: "category" | "amount",
    value: string,
  ) => {
    setRows((items) =>
      items.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
    setMessage("");
    setError("");
  };
  return (
    <form
      className="wallet-budget-card"
      onSubmit={async (event) => {
        event.preventDefault();
        const allocations = rows.map((row) => ({
          category: row.category.trim(),
          amount: Number(row.amount),
        }));
        if (
          allocations.some(
            (row, index) =>
              !row.category ||
              !rows[index].amount.trim() ||
              !Number.isFinite(row.amount) ||
              row.amount < 0 ||
              row.amount > 1_000_000_000,
          )
        ) {
          setError("Enter a category and a valid amount for each row.");
          return;
        }
        if (
          new Set(allocations.map((row) => row.category.toLowerCase())).size !==
          allocations.length
        ) {
          setError("Use a different name for each category.");
          return;
        }
        setSaving(true);
        setError("");
        setMessage("");
        try {
          const saved = await onSave(allocations);
          if (saved) setMessage("Budget saved.");
          else setError("Could not save your budget. Please try again.");
        } catch {
          setError("Could not save your budget. Please try again.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="wallet-budget-heading">
        <div>
          <h3>Your move budget</h3>
          <p>Set aside an amount for each category. All amounts in GBP.</p>
        </div>
        <span className="dashboard-currency">GBP</span>
      </div>
      <div className="wallet-budget-summary">
        <div>
          <span>Planned spending</span>
          <strong>{formatGBP(total)}</strong>
        </div>
        <div>
          <span>Available balance</span>
          <strong>{formatGBP(available)}</strong>
        </div>
        <div className={remaining < 0 ? "over-budget" : ""}>
          <span>
            {remaining < 0 ? "Over available balance" : "Unallocated"}
          </span>
          <strong>{formatGBP(Math.abs(remaining))}</strong>
        </div>
      </div>
      <div className="wallet-budget-content">
      {allocation}
      <fieldset disabled={saving}>
        <legend className="budget-sr-only">Budget categories</legend>
        <div className="wallet-budget-labels" aria-hidden="true">
          <span>Category</span>
          <span>Amount (GBP)</span>
        </div>
        <div className="wallet-budget-rows">
          {rows.map((row, index) => (
            <div className="wallet-budget-row" key={row.id}>
              <input
                aria-label={`Category ${index + 1}`}
                maxLength={60}
                required
                value={row.category}
                placeholder="e.g. Groceries"
                onChange={(event) =>
                  updateRow(row.id, "category", event.target.value)
                }
              />
              <div className="wallet-budget-amount">
                <span aria-hidden="true">£</span>
                <input
                  aria-label={`Amount for ${row.category || `category ${index + 1}`} in GBP`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="1000000000"
                  step="0.01"
                  required
                  value={row.amount}
                  placeholder="0.00"
                  onChange={(event) =>
                    updateRow(row.id, "amount", event.target.value)
                  }
                />
              </div>
              <button
                type="button"
                className="budget-remove"
                aria-label={`Remove ${row.category || `category ${index + 1}`}`}
                onClick={() => {
                  setRows((items) =>
                    items.filter((item) => item.id !== row.id),
                  );
                  setMessage("");
                  setError("");
                }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        {!rows.length && (
          <p className="wallet-budget-empty">
            Add a category to start your budget.
          </p>
        )}
        <div className="wallet-budget-actions">
          <button
            type="button"
            disabled={rows.length >= 20}
            onClick={() => {
              setRows((items) => [
                ...items,
                { id: crypto.randomUUID(), category: "", amount: "" },
              ]);
              setMessage("");
              setError("");
            }}
          >
            <Plus size={16} /> Add category
          </button>
          <button type="submit" className="budget-save">
            {saving ? "Saving…" : "Save budget"}
            <Check size={16} />
          </button>
        </div>
      </fieldset>
      </div>
      {error && (
        <p className="wallet-budget-feedback" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="wallet-budget-feedback" role="status">
          {message}
        </p>
      )}
    </form>
  );
}

function Wallet({
  storedWallets,
  budget,
  costs,
  onSaveBudget,
}: {
  storedWallets?: DatabaseState["wallets"];
  budget?: BudgetAllocation[];
  costs: DatabaseState["costs"];
  onSaveBudget: (allocations: BudgetAllocation[]) => Promise<boolean>;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [walletNotice, setWalletNotice] = useState("");
  const visibleWallets = storedWallets ?? wallets;
  const totalValue = visibleWallets.reduce((s, w) => s + w.gbpValue, 0);
  const exposure = visibleWallets.map((wallet) => ({
    ...wallet,
    percent: totalValue ? Math.round((wallet.gbpValue / totalValue) * 100) : 0,
  }));
  const allocationColors = ["var(--color-dusty-denim-600)", "var(--color-dusty-denim-400)", "var(--color-dusty-denim-300)"];
  let allocationStart = 0;
  const allocationStops = visibleWallets.map((wallet, index) => {
    const start = allocationStart;
    allocationStart += totalValue > 0 ? wallet.gbpValue / totalValue * 100 : 0;
    return `${allocationColors[index % allocationColors.length]} ${start}% ${allocationStart}%`;
  });
  const allocationGradient = totalValue > 0 ? `conic-gradient(${allocationStops.join(", ")})` : "var(--color-line)";
  const foreignShare = exposure
    .filter((wallet) => wallet.currency !== "GBP")
    .reduce((sum, wallet) => sum + wallet.percent, 0);
  const usdBalance =
    visibleWallets.find((wallet) => wallet.currency === "USD")?.gbpValue ?? 0;
  const flags: Record<string, string> = { USD: "🇺🇸", GBP: "🇬🇧", KHR: "🇰🇭" };
  const notifyWallet = (message: string) => {
    setWalletNotice(message);
    window.setTimeout(() => setWalletNotice(""), 2400);
  };
  return (
    <div className="wallet-page-redesign">
      <section className="wallet-redesign-intro">
        <div>
          <span className="eyebrow">Multi-currency wallet</span>
          <h2>Wallet & budget</h2>
          <p>Plan your spending and view your balances.</p>
        </div>

        <div className="total-balance">
          <span>Total available</span>
          <strong>{formatGBP(totalValue)} ↗</strong>
        </div>

      </section>
      <section className="wallet-account-grid">
        {visibleWallets.map((w) => (
          <article className="wallet-account-card" key={w.currency}>
            <div className="wallet-account-heading">
              <strong>
                <span>{flags[w.currency] ?? "◉"}</span> {w.currency} account
              </strong>
              <small>{w.label}</small>
            </div>
            <div className="wallet-account-balance">
              <strong>
                {w.symbol}
                {w.amount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
              <span>≈ {formatGBP(w.gbpValue)}</span>
            </div>
            <div className="wallet-account-actions">
              <button
                onClick={() =>
                  notifyWallet(`Add funds opened for ${w.currency}`)
                }
              >
                Add funds
              </button>
              <button
                onClick={() => notifyWallet(`Managing ${w.currency} account`)}
              >
                Manage
              </button>
            </div>
          </article>
        ))}
      </section>
      <BudgetEditor
        budget={budget}
        costs={costs}
        available={totalValue}
        onSave={onSaveBudget}
        allocation={
      <section className="wallet-allocation-section" aria-labelledby="wallet-allocation-heading">
        <div className="wallet-allocation-heading"><h3 id="wallet-allocation-heading">Currency allocation</h3><p>Share of your available balance in GBP.</p></div>
        <div className="wallet-allocation" aria-label="Currency allocation">
          <i aria-hidden="true" style={{ background: allocationGradient }} />
          <div className="wallet-allocation-labels">
            {exposure.map((wallet, index) => <div className="wallet-allocation-row" key={wallet.currency}>
              <span><b style={{ background: allocationColors[index % allocationColors.length] }} />{wallet.currency}</span>
              <strong>{wallet.percent}%</strong><small>{formatGBP(wallet.gbpValue)}</small>
            </div>)}
          </div>
        </div>
      </section>
        }
      />
      <div className="wallet-page-footer">
        <span>Rates are demo estimates.</span>
        <button onClick={() => setDetailsOpen((open) => !open)}>
          {detailsOpen ? "Hide currency analysis" : "View currency analysis"}
          <ChevronRight />
        </button>
      </div>
      {detailsOpen && (
        <section className="card section-card wallet-analysis-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Currency exposure</span>
              <h3>Your study currency is GBP</h3>
            </div>
            <span className="status warning">{foreignShare}% held abroad</span>
          </div>
          <div className="exposure">
            {exposure.map((wallet) => (
              <div
                key={wallet.currency}
                style={{ width: `${wallet.percent}%` }}
              >
                {wallet.currency} {wallet.percent}%
              </div>
            ))}
          </div>
          <div className="agent-note">
            <Bot />
            <p>
              <strong>Exchange-rate sensitivity</strong>
              <br />A 5% weakening of USD against GBP would add roughly{" "}
              {formatGBP(usdBalance * 0.05)} to the GBP cost of converting your
              current USD balance.
            </p>
          </div>
        </section>
      )}
      {walletNotice && <div className="wallet-notice">{walletNotice}</div>}
    </div>
  );
}

function Security({ audit }: { audit: AuditEvent[] }) {
  const exportAudit = () => {
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = [
      "Event,Details,Actor,Time",
      ...audit.map((a) =>
        [a.type, a.detail, a.actor, a.timestamp].map(escape).join(","),
      ),
    ].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "financial-passport-audit.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <div className="page-stack">
      <section className="card section-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Security</span>
            <h3>Activity log</h3>
          </div>
          <button className="secondary" onClick={exportAudit}>
            <History /> Export CSV
          </button>
        </div>
        <div className="audit-table">
          <div className="audit-head">
            <span>Event</span>
            <span>Details</span>
            <span>Actor</span>
            <span>Time</span>
          </div>
          {!audit.length && <p>No activity recorded yet.</p>}
          {audit.map((a) => (
            <div className="audit-row" key={a.id}>
              <strong>{a.type.replaceAll("_", " ")}</strong>
              <span>{a.detail}</span>
              <span>{a.actor}</span>
              <span>{a.timestamp}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default App;
