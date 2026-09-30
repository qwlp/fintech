import { useEffect, useMemo, useRef, useState } from "react";
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
import { AnimatePresence, motion } from "motion/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DatabaseState = {
  account: {
    _id: string;
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
  { page: "Profile", icon: UserRound },
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
    nav.find(
      ({ page }) =>
        `#${page.toLowerCase().replace(" ", "-")}` === window.location.hash,
    )?.page ?? "Dashboard";
  const [page, setPage] = useState<Page>(pageFromHash);
  const [mobileNav, setMobileNav] = useState(false);
  const [localPaymentStatus, setLocalPaymentStatus] =
    useState<PaymentStatus>("not_started");
  const [localAudit, setLocalAudit] = useState<AuditEvent[]>(initialAudit);
  const [database, setDatabase] = useState<DatabaseState | null>(null);
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
    if (!client) return;
    const watch = client.watchQuery(convexApi.bootstrap, { email: demoEmail });
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
        setSyncState("error");
      }
    });
    return unsubscribe;
  }, []);

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
  const readNotifications = () => {
    setNotificationsOpen((open) => !open);
    if (account)
      void mutate(convexApi.markNotificationsRead, { accountId: account._id });
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
          <button className="profile" onClick={() => go("Profile")}>
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
              key={`${page}-${variation}`}
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
                />
              )}
              {page === "Move Planner" && (
                <MovePlanner go={go} config={database?.config?.move} />
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
                  announce={announce}
                  requestSent={account?.sponsorRequestSent}
                  onRequest={requestSponsor}
                  storedSponsors={database?.sponsors}
                  config={database?.config?.sponsorship}
                />
              )}
              {page === "Wallet" && (
                <Wallet storedWallets={database?.wallets} />
              )}
              {page === "Security" && (
                <Security audit={audit} config={database?.config?.security} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
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
      target: ".security-grid",
      eyebrow: "Stay in control",
      title: "Approval always stays with you",
      body:
        "Security controls, payment limits, and a complete activity history remain visible at every step.",
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
  const fallbackCategories = [
    {
      name: "Tuition",
      icon: GraduationCap,
      spend: 4000,
      budget: 6000,
      color: "var(--color-ink-black-600)",
    },
    {
      name: "Housing",
      icon: Home,
      spend: 5200,
      budget: 7800,
      color: "var(--color-dusty-denim-600)",
    },
    {
      name: "Living costs",
      icon: ReceiptText,
      spend: 3150,
      budget: 5100,
      color: "var(--color-prussian-blue-600)",
    },
    {
      name: "Visa & health",
      icon: ShieldCheck,
      spend: 1600,
      budget: 1600,
      color: "var(--color-alabaster-grey-600)",
    },
    {
      name: "Flight & arrival",
      icon: Plane,
      spend: 610,
      budget: 2100,
      color: "var(--color-dusk-blue-600)",
    },
  ];
  const dbCosts = database?.costs ?? [];
  const dbFunding = database?.funding ?? [];
  const dbTotal = dbCosts.length
    ? dbCosts.reduce((sum, item) => sum + item.amount, 0)
    : total;
  const dbFunded = dbFunding.length
    ? dbFunding
        .filter((item) => item.status === "confirmed")
        .reduce((sum, item) => sum + item.amount, 0)
    : funded;
  const dbGap = fundingGap(dbTotal, dbFunded);
  const dbCoverage = fundingCoverage(dbTotal, dbFunded);
  const categories = dbCosts.length
    ? dbCosts.map((item, index) => ({
        name: item.name,
        icon: [GraduationCap, Home, ReceiptText, ShieldCheck, Plane][index % 5],
        spend: item.paid ? item.amount : 0,
        budget: item.amount,
        color: ["var(--color-ink-black-600)", "var(--color-dusty-denim-600)", "var(--color-prussian-blue-600)", "var(--color-alabaster-grey-600)", "var(--color-dusk-blue-600)"][
          index % 5
        ],
      }))
    : fallbackCategories;
  const allocation = dbFunding.length
    ? [
        ...dbFunding.map((item, index) => ({
          name: item.name,
          value: item.amount,
          color: ["var(--color-ink-black-600)", "var(--color-dusty-denim-600)", "var(--color-prussian-blue-600)"][index % 3],
        })),
        ...(dbGap ? [{ name: "Gap", value: dbGap, color: "var(--color-dusk-blue-600)" }] : []),
      ]
    : [
        { name: "Savings", value: 8900, color: "var(--color-ink-black-600)" },
        { name: "Sponsor", value: 9000, color: "var(--color-dusty-denim-600)" },
        { name: "Scholarship", value: 4000, color: "var(--color-prussian-blue-600)" },
        { name: "Gap", value: 2700, color: "var(--color-dusk-blue-600)" },
      ];
  return (
    <div className="consumer-dashboard">
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
            Good morning, {database?.account.name.split(" ")[0] ?? "there"}
          </h2>
          <p>Your UK study plan, at a glance.</p>
        </div>
        <button onClick={() => go("AI Agent")}>
          <Sparkles size={16} /> Ask your agent
        </button>
      </section>
      <section className="money-hero" data-tour="readiness">
        <div>
          <span>READY TO FUND</span>
          <strong>{formatGBP(dbFunded)}</strong>
          <p>of {formatGBP(dbTotal)} planned</p>
        </div>
        <div className="hero-score">
          <strong>{Math.round(dbCoverage)}%</strong>
          <span>ready</span>
        </div>
        <div className="hero-progress">
          <i style={{ width: `${dbCoverage}%` }} />
        </div>
        <footer>
          <span>
            <b>{baseRunway.toFixed(1)}</b> months runway
          </span>
          <span>
            <b>{formatGBP(dbGap)}</b> still to cover
          </span>
          <button onClick={() => go("Move Planner")}>
            View plan <ArrowRight size={15} />
          </button>
        </footer>
      </section>
      <div className="insights-layout">
        <section className="spending-card">
          <div className="consumer-card-head">
            <div>
              <span>PLAN CATEGORIES</span>
              <h3>Planned spending</h3>
            </div>
            <button onClick={() => go("Move Planner")}>Show all</button>
          </div>
          <div className="category-labels">
            <span>Category</span>
            <span>Planned</span>
            <span>Budget</span>
          </div>
          {categories.map(({ name, icon: Icon, spend, budget, color }) => (
            <div className="category-row" key={name}>
              <div className="category-title">
                <Icon />
                <strong>{name}</strong>
              </div>
              <b>{formatGBP(spend)}</b>
              <span>{formatGBP(budget)}</span>
              <div className="category-track">
                <i
                  style={{
                    width: `${Math.min(100, (spend / budget) * 100)}%`,
                    background: color,
                  }}
                />
              </div>
            </div>
          ))}
        </section>
        <section className="allocation-card">
          <div className="consumer-card-head">
            <div>
              <span>FUNDING MIX</span>
              <h3>Funding mix</h3>
            </div>
          </div>
          <div className="allocation-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocation}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="88%"
                  paddingAngle={4}
                  cornerRadius={7}
                >
                  {allocation.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatGBP(Number(value))}
                  contentStyle={{
                    border: 0,
                    borderRadius: 12,
                    boxShadow: "0 12px 30px color-mix(in srgb, var(--color-dusty-denim-950) 13.3%, transparent)",
                    fontSize: 11,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div>
              <span>Funded</span>
              <strong>{formatGBP(dbFunded)}</strong>
              <small>of {formatGBP(dbTotal)}</small>
            </div>
          </div>
          <div className="allocation-legend">
            {allocation.map((item) => (
              <span key={item.name}>
                <i style={{ background: item.color }} />
                {item.name}
                <b>{Math.round((item.value / dbTotal) * 100)}%</b>
              </span>
            ))}
          </div>
        </section>
      </div>
      <section className="smart-insights" data-tour="next-action">
        <article className="cash-insight">
          <span>Cash flow this term</span>
          <strong>+£1,000</strong>
          <p>Sponsor funding on 15 November keeps you positive.</p>
          <button onClick={() => go("Dashboard")}>
            Open runway <ChevronRight />
          </button>
        </article>
        <article className="action-insight">
          <div className="insight-dot orange" />
          <div>
            <strong>
              {paid ? "Tuition payment complete" : "Tuition is due in 12 days"}
            </strong>
            <p>
              {paid
                ? "Your plan and audit trail are up to date."
                : "Save about $58 and arrive before the deadline."}
            </p>
          </div>
          <button onClick={() => go("Payments")}>
            {paid ? "View receipt" : "Review"} <ArrowRight />
          </button>
        </article>
        <article className="positive-insight">
          <div className="insight-dot green" />
          <div>
            <strong>Your runway is up 0.8 months</strong>
            <p>Lower arrival costs moved you ahead.</p>
          </div>
          <button onClick={() => go("AI Agent")}>Why?</button>
        </article>
      </section>
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
  const [tab, setTab] = useState("Convert"),
    [amount, setAmount] = useState(2500),
    [targetRate, setTargetRate] = useState(0.79);
  const bestRoute =
    database?.paymentRoutes.find((route) => route.recommended) ??
    database?.paymentRoutes[0];
  const rate = bestRoute?.fxRate ?? 0;
  const fee = bestRoute?.fee ?? 0;
  const received = amount * rate - fee;
  const alert = database?.rateAlerts.find(
    (item) => item.active && item.pair === "USD/GBP",
  );
  const visibleWallets = database?.wallets ?? [];
  return (
    <div className="workspace">
      <WorkspaceHeader
        number={4}
        title="Exchange desk"
        description="Manage currency exposure and compare the true cost of moving money."
        tabs={["Convert", "Balances", "Rate alerts"]}
        active={tab}
        setActive={setTab}
      />
      {tab === "Convert" && (
        <div className="exchange-workspace">
          <section className="exchange-form">
            <label>
              You send
              <span>
                <b>$</b>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
                <em>USD</em>
              </span>
            </label>
            <ArrowRight />
            <label>
              University receives
              <span>
                <b>£</b>
                <strong>
                  {received.toLocaleString("en-GB", {
                    maximumFractionDigits: 2,
                  })}
                </strong>
                <em>GBP</em>
              </span>
            </label>
            <dl>
              <div>
                <dt>Rate</dt>
                <dd>{rate} GBP</dd>
              </div>
              <div>
                <dt>Fee</dt>
                <dd>{formatUSD(fee)}</dd>
              </div>
              <div>
                <dt>Arrival</dt>
                <dd>{bestRoute?.delivery}</dd>
              </div>
            </dl>
            <button onClick={() => go("Payments")}>
              Review {bestRoute?.provider} <ArrowRight />
            </button>
          </section>
          <aside className="rate-context">
            <span>USD / GBP</span>
            <strong>{rate}</strong>
            <small>Demo rate · 29 Sep 2026</small>
            <div className="sparkline">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <p>
              A 5% weaker dollar would reduce this conversion by{" "}
              <b>£{(amount * rate * 0.05).toFixed(0)}</b>.
            </p>
          </aside>
        </div>
      )}
      {tab === "Balances" && (
        <div className="balance-ledger">
          {visibleWallets.map((w) => (
            <div key={w.currency}>
              <span>{w.currency}</span>
              <strong>
                {w.symbol}
                {w.amount.toLocaleString()}
              </strong>
              <small>{w.label}</small>
              <b>{formatGBP(w.gbpValue)}</b>
            </div>
          ))}
          <footer>
            <span>Total in GBP</span>
            <strong>
              {formatGBP(visibleWallets.reduce((s, w) => s + w.gbpValue, 0))}
            </strong>
          </footer>
        </div>
      )}
      {tab === "Rate alerts" && (
        <section className="alert-builder">
          <div>
            <Bell />
            <div>
              <h3>Notify me when USD strengthens</h3>
              <p>We will compare the demo mid-market rate with your target.</p>
            </div>
          </div>
          <label>
            Target rate{" "}
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={targetRate}
              onChange={(e) => setTargetRate(Number(e.target.value))}
            />
            <span>GBP per USD</span>
          </label>
          <button
            className={alert ? "sent" : ""}
            onClick={() => void onRateAlert(targetRate)}
          >
            {alert ? (
              <>
                <Check /> Alert active at {alert.targetRate}
              </>
            ) : (
              <>Create rate alert</>
            )}
          </button>
        </section>
      )}
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
}: {
  announce: (message: string) => void;
  account?: any;
  config?: any;
  totals: { funded: number; gap: number; coverage: number };
  onSave: (profile: Record<string, string>) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [profile, setProfile] = useState({
    name: account?.name ?? "",
    home: account?.countryFrom ?? "",
    study: account?.countryTo ?? "",
    university: account?.university ?? "",
    course: account?.course ?? "",
    start: config?.courseStart ?? "",
    status: config?.financialStatus ?? "",
    income: config?.sponsorSupport ?? "",
    funding: config?.confirmedFunding ?? "",
  });
  const update = (key: keyof typeof profile, value: string) =>
    setProfile((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    if (!account) return;
    setProfile({
      name: account.name,
      home: account.countryFrom,
      study: account.countryTo,
      university: account.university,
      course: account.course,
      start: config?.courseStart ?? "",
      status: config?.financialStatus ?? "",
      income: config?.sponsorSupport ?? "",
      funding: formatGBP(totals.funded),
    });
  }, [account, config, totals.funded]);
  return (
    <div className="page-stack profile-page">
      <section className="page-intro">
        <div>
          <span className="eyebrow">Student profile</span>
          <h2>Your financial passport</h2>
          <p>
            The details used to tailor costs, routes, banking, and sponsor
            recommendations.
          </p>
        </div>
        <button
          className="primary"
          onClick={async () => {
            if (editing) {
              const saved = await onSave(profile);
              if (!saved) return;
              announce("Profile saved to the database");
            }
            if (!editing) setDetailsOpen(true);
            setEditing(!editing);
          }}
        >
          {editing ? (
            <>
              <Check /> Save profile
            </>
          ) : (
            <>
              <Settings /> Edit profile
            </>
          )}
        </button>
      </section>
      <section className="profile-hero">
        <div className="profile-avatar">DC</div>
        <div>
          <h3>{profile.name}</h3>
          <p>
            {profile.course} · {profile.university}
          </p>
          <span>
            <MapPin /> {profile.home} <ArrowRight /> {profile.study}
          </span>
        </div>
        <b>{profile.status}</b>
      </section>
      <button
        className="disclosure-button"
        onClick={() => setDetailsOpen((open) => !open)}
      >
        {detailsOpen ? "Hide profile details" : "View profile details"}
        <ChevronRight />
      </button>
      {detailsOpen && (
        <div className="profile-grid">
          <section className="profile-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Personal & study</span>
                <h3>Core details</h3>
              </div>
              <GraduationCap />
            </div>
            <div className="field-grid">
              {(
                [
                  ["name", "Full name"],
                  ["home", "Home country"],
                  ["study", "Country of study"],
                  ["university", "University"],
                  ["course", "Programme"],
                  ["start", "Course start"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  <span>{label}</span>
                  {editing ? (
                    <input
                      value={profile[key]}
                      onChange={(e) => update(key, e.target.value)}
                    />
                  ) : (
                    <strong className="profile-value">{profile[key]}</strong>
                  )}
                </label>
              ))}
            </div>
          </section>
          <section className="profile-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Financial position</span>
                <h3>Funding snapshot</h3>
              </div>
              <WalletCards />
            </div>
            <div className="field-grid">
              {(
                [
                  ["status", "Financial status"],
                  ["income", "Sponsor support"],
                  ["funding", "Confirmed funding"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  <span>{label}</span>
                  {editing ? (
                    <input
                      value={profile[key]}
                      onChange={(e) => update(key, e.target.value)}
                    />
                  ) : (
                    <strong className="profile-value">{profile[key]}</strong>
                  )}
                </label>
              ))}
            </div>
            <div className="profile-summary">
              <span>
                <CheckCircle2 /> {Math.round(totals.coverage)}% funded
              </span>
              <strong>{formatGBP(totals.gap)} gap</strong>
              <p>
                Your move remains viable, but the emergency buffer is not fully
                funded.
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function MovePlanner({ go, config }: { go: (page: Page) => void; config?: any }) {
  const [months, setMonths] = useState(11);
  const [selectedRoute, setSelectedRoute] = useState(1);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const fallbackRoutes = [
    ["Fastest Route", "Phnom Penh → London · 1 stop", "18h 21m"],
    ["Budget Option", "Phnom Penh → London · 2 stops", "28h 35m"],
    ["Budget Option", "Phnom Penh → Bangkok · 1 stop", "23h 33m"],
    ["Balanced Choice", "Phnom Penh → London · 1 stop", "23h 31m"],
  ];
  const routes = (config?.routes?.length ? config.routes : fallbackRoutes)
    .map((route: any[], index: number) => ({
      name: index === 0 ? "Fastest Route" : index === 1 ? "Budget Option" : index === 2 ? "Budget Option" : route[0],
      detail: route[1],
      time: route[2],
    }));
  if (routes.length === 3) routes.push({ name: "Balanced Choice", detail: "Phnom Penh → London · 1 stop", time: "23h 31m" });
  const requirements = config?.requirements?.length ? config.requirements : [
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
          <p>Compare routes, prepare essential costs, and keep your arrival plan on track.</p>
        </div>
        <div className="move-arrival-date">
          <CalendarDays />
          <span>Planned arrival<strong>{config?.arrivalDate ?? "14 Sep 2026"}</strong></span>
        </div>
      </section>
      <section className="timeline-card">
        <div className="timeline-copy">
          <h2>Move timeline</h2>
          <div className="timeline-track">
            <div className="timeline-point"><b>1</b><span><strong>Transfer Funds</strong><small>{config?.readyBy ?? "07 Sep 2026"}</small></span></div>
            <i />
            <div className="timeline-point"><b>3</b><span><strong>Arrival</strong><small>{config?.arrivalDate ?? "14 Sep 2026"}</small></span></div>
          </div>
        </div>
        <div className="timeline-budget"><small>Estimated total budget</small><strong>£23,120</strong></div>
        <button onClick={() => go("AI Agent")}><Sparkles /> Ask AI to simplify details</button>
      </section>

      <div className="move-board-grid">
        <section className="route-choice-card">
          <h3><span><Plane /></span>Getting There</h3>
          <div className="route-choices">
            {routes.slice(0, 4).map((route: any, index: number) => {
              const Icon = routeIcons[index];
              return <button type="button" aria-pressed={selectedRoute === index} className={selectedRoute === index ? "selected" : ""} onClick={() => setSelectedRoute(index)} key={`${route.name}-${index}`}>
                <span className="route-kind"><Icon /></span>
                <span className="route-copy"><strong>{route.name}</strong><small>{route.detail}</small><em><Clock3 /> {route.time}</em></span>
                <i className="route-radio" />
              </button>;
            })}
          </div>
        </section>

        <div className="move-side-stack">
          <section className="horizon-card">
            <div className="horizon-title"><h3><CalendarDays /> Planning horizon</h3><span>4 costs ready</span></div>
            <div className="horizon-segments">{[1, 3, 6, 9, 12, 15, 18, 24].map((value, i) => <button type="button" aria-label={`${value} month planning horizon`} className={Math.abs(months - value) <= 1 || (months > 18 && i === 7) ? "active" : ""} onClick={() => setMonths(value)} key={value} />)}</div>
            <input aria-label="Planning horizon" type="range" min="1" max="24" value={months} onChange={(e) => setMonths(Number(e.target.value))} />
            <div className="horizon-meta"><span>Planning horizon</span><strong>£75/mo <i /></strong><span>{months} months</span></div>
          </section>

          <section className="cost-card">
            <h3><span><ReceiptText /></span>Upfront Costs</h3>
            <h4>1. Upfront Costs</h4>
            <div className="cost-list">
              {requirements.slice(0, 3).map(([name, status, amount]: string[], index: number) => <div className="paid" key={name}><i><Check /></i><span><strong>{index === 2 ? "Deposit" : name}</strong><small>{status}</small></span><em>Paid</em><b>{amount}</b></div>)}
            </div>
            <h4>2. Monthly Recurring Costs</h4>
            <div className="cost-list recurring-costs">
              {requirements.slice(3, 5).map(([name, status, amount]: string[]) => <div key={name}><i /><span><strong>{name === "Daily expenses" ? "Expenses" : name}</strong><small>{status}</small></span><b>{amount.replace(" / mo", "")}<small>/mo</small></b></div>)}
            </div>
          </section>
          <div className="move-actions"><button type="button" aria-expanded={detailsOpen} onClick={() => setDetailsOpen((open) => !open)}>{detailsOpen ? "Hide Details" : "View Details"}</button><button type="button" onClick={() => go("Payments")}>Manage Budget</button></div>
        </div>
      </div>
      {detailsOpen && <section className="move-detail-drawer">
        <div><small>Selected route</small><strong>{routes[selectedRoute]?.name}</strong><span>{routes[selectedRoute]?.detail} · {routes[selectedRoute]?.time}</span></div>
        <div><small>Apartment</small><strong>{config?.apartment ?? "Riverside House, Zone 2"}</strong><span>Balanced for university access and city connections.</span></div>
        <button type="button" onClick={() => go("Payments")}>Review payment plan <ArrowRight /></button>
      </section>}
    </div>
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
        <button onClick={() => go("AI Agent")}>
          <Sparkles /> Ask AI to adjust
        </button>
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
  return (
    <div className="payments-page payment-checkout">
      <section className="payment-checkout-header">
        <div>
          <span className="eyebrow">Tuition payment</span>
          <h2>Total: {formatGBP(amount)}</h2>
          <p>Choose a route and confirm the details.</p>
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
            <span>Payment route</span>
            <h3>How would you like to send?</h3>
          </div>
          <div className="payment-route-cards">
            {availableRoutes.map((r, index) => {
              const RouteIcon =
                r.id.includes("swift") || r.provider.toLowerCase().includes("bank")
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
                  <strong>{r.provider}</strong>
                  {r.recommended && <em>Best value</em>}
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
          <span className="eyebrow">Review</span>
          <h3>Payment details</h3>
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
          <small className="payment-sandbox-note">Sandbox · no real funds</small>
        </aside>
      </div>
    </div>
  );
}

function Sponsors({
  announce,
  requestSent,
  onRequest,
  storedSponsors,
  config,
}: {
  announce: (s: string) => void;
  requestSent?: boolean;
  onRequest: () => void;
  storedSponsors?: DatabaseState["sponsors"];
  config?: any;
}) {
  const [tab, setTab] = useState<"Sponsors" | "Requests" | "Privacy">(
    "Sponsors",
  );
  const visibleSponsors = storedSponsors ?? sponsors;
  const sponsor = visibleSponsors[0];
  const totalCommitment = sponsor?.commitment ?? 0;
  const transferred = config?.transferred ?? 0;
  const progress = totalCommitment
    ? Math.round((transferred / totalCommitment) * 100)
    : 0;
  const schedule = config?.schedule ?? [
    ["15 Nov 2026", "Living expenses", 1000],
    ["15 Jan 2027", "Tuition instalment", 2000],
  ];
  return (
    <div className="sponsor-reference-page">
      <section className="sponsor-reference-header">
        <div>
          <span>Sponsor coordination</span>
          <h2>Sponsor workspace</h2>
          <p>
            Coordinate contributions without exposing private spending or account
            balances.
          </p>
        </div>
        <div className="sponsor-reference-tabs" role="tablist">
          {(["Sponsors", "Requests", "Privacy"] as const).map((item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
              role="tab"
              aria-selected={tab === item}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {tab === "Sponsors" && sponsor && (
        <>
          <section className="sponsor-reference-summary">
            <div className="sponsor-reference-person">
              <div className="sponsor-reference-avatar">SC</div>
              <div>
                <small>Parent sponsor</small>
                <h3>{sponsor.name}</h3>
                <p>{sponsor.relationship} · Connected sponsor</p>
              </div>
              <button onClick={() => announce("Sponsor profile opened")}>
                Open profile
              </button>
            </div>
            <div className="sponsor-reference-commitment">
              <div className="commitment-total">
                <span>Annual commitment</span>
                <strong>{formatGBP(totalCommitment)}</strong>
                <i
                  style={
                    {
                      "--progress": `${progress * 3.6}deg`,
                    } as React.CSSProperties
                  }
                />
              </div>
              <div className="commitment-row received">
                <span>Received</span>
                <b>
                  <i style={{ width: `${progress}%` }} />
                </b>
                <strong>{formatGBP(transferred)}</strong>
              </div>
              <div className="commitment-row remaining">
                <span>Remaining</span>
                <b>
                  <i style={{ width: `${100 - progress}%` }} />
                </b>
                <strong>
                  {formatGBP(Math.max(0, totalCommitment - transferred))}
                </strong>
              </div>
            </div>
          </section>
          <section className="sponsor-reference-schedule">
            <div className="schedule-title">
              <h3>Contribution schedule</h3>
              <p>Upcoming Payments</p>
            </div>
            <div className="schedule-head">
              <span>Date</span>
              <span>Description</span>
              <span>Amount</span>
              <span>Status</span>
            </div>
            {schedule.map((item: any[], index: number) => (
              <div className="schedule-line" key={`${item[0]}-${item[1]}`}>
                <span>{item[0]}</span>
                <span>{item[1]}</span>
                <span>{formatGBP(Number(item[2]))}</span>
                <em className={index === 0 ? "paid" : "pending"}>
                  {index === 0 ? "Paid" : "Pending"}
                </em>
              </div>
            ))}
          </section>
        </>
      )}

      {tab === "Requests" && (
        <section className="sponsor-reference-panel">
          <span>Contribution request</span>
          <h3>
            Ask {sponsor?.name ?? "your sponsor"} for the next contribution
          </h3>
          <p>
            The request shares its purpose and amount, but no private account
            activity.
          </p>
          <button
            className="primary"
            disabled={requestSent}
            onClick={() => {
              onRequest();
              announce("Contribution request sent");
            }}
          >
            {requestSent ? (
              <>
                <Check /> Request sent
              </>
            ) : (
              <>
                <Send /> Request contribution
              </>
            )}
          </button>
        </section>
      )}

      {tab === "Privacy" && (
        <section className="sponsor-reference-panel privacy">
          <LockKeyhole />
          <span>Private by default</span>
          <h3>Your sponsor sees contributions, not your finances.</h3>
          <p>
            Wallet balances, transaction history, and personal spending remain
            hidden.
          </p>
        </section>
      )}
    </div>
  );
}
function Wallet({
  storedWallets,
}: {
  storedWallets?: DatabaseState["wallets"];
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [walletNotice, setWalletNotice] = useState("");
  const visibleWallets = storedWallets ?? wallets;
  const totalValue = visibleWallets.reduce((s, w) => s + w.gbpValue, 0);
  const exposure = visibleWallets.map((wallet) => ({
    ...wallet,
    percent: totalValue ? Math.round((wallet.gbpValue / totalValue) * 100) : 0,
  }));
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
          <h2>Your balances</h2>
          <p>One view across accounts. Rates are demo estimates.</p>
        </div>
        <div className="wallet-allocation" aria-label="Currency allocation">
          <i />
          <div className="wallet-allocation-labels">
            {exposure.map((wallet) => (
              <span key={wallet.currency}>
                <b className={`currency-${wallet.currency.toLowerCase()}`} />
                {wallet.currency} {wallet.percent}%
              </span>
            ))}
          </div>
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
function Security({ audit, config }: { audit: AuditEvent[]; config?: any }) {
  const [activityOpen, setActivityOpen] = useState(false);
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
      <section className="page-intro">
        <div>
          <span className="eyebrow">Controls & evidence</span>
          <h2>Security center</h2>
          <p>
            Review permissions, limits, approvals, and every consequential
            action.
          </p>
        </div>
        <span className="status success">
          <ShieldCheck /> All controls active
        </span>
      </section>
      <section className="security-grid">
        <div className="card control">
          <LockKeyhole />
          <div>
            <strong>Approval required</strong>
            <p>Every payment requires explicit student approval.</p>
          </div>
          <span>{config?.approvalRequired ? "On" : "Off"}</span>
        </div>
        <div className="card control">
          <CircleDollarSign />
          <div>
            <strong>Payment limit</strong>
            <p>Single sandbox transaction maximum.</p>
          </div>
          <span>{formatGBP(config?.paymentLimit ?? 0)}</span>
        </div>
        <div className="card control">
          <Clock3 />
          <div>
            <strong>Approval expiry</strong>
            <p>Unused authorizations expire automatically.</p>
          </div>
          <span>{config?.approvalExpiryMinutes ?? 0} min</span>
        </div>
      </section>
      <button
        className="disclosure-button"
        onClick={() => setActivityOpen((open) => !open)}
      >
        {activityOpen
          ? "Hide activity log"
          : `View activity log (${audit.length})`}
        <ChevronRight />
      </button>
      {activityOpen && (
        <section className="card section-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Immutable evidence</span>
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
      )}
    </div>
  );
}

export default App;
