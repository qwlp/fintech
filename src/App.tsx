import { createPortal } from "react-dom";
import SponsorConnect from "./SponsorConnect";
import { Assistant, ChatHistory } from "./Chat";
import type { Id } from "../convex/_generated/dataModel";
import BudgetDonut, {planChartColors, FundingSourcesChart} from "./BudgetDonut";
import Brand from "./Brand";
import TuitionPlanner from "./TuitionPlanner";
import { Card, CardHeader, CardTitle, CardContent } from "./components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { Button } from "./components/ui/button";
import { Checkbox } from "./components/ui/checkbox";
import { Input } from "./components/ui/input";
import { DatePicker } from "./components/ui/date-picker";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./components/ui/select";
import {
  AirplaneTilt,
  CalendarBlank,
  Timer,
  Wallet as PlannerWallet,
  Path,
  Sparkle,
  PencilSimple,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
  RotateCcw,
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
import { convexApi, convexClient } from "./lib/convex";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DatabaseState = {
  account: {
    _id: string;
    university: string;
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
  messages: Array<{ _id: string; from: "agent" | "user"; text: string; timestamp?: number; chatId?: string }>;
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

function App({ onSignOut }: { onSignOut: () => void }) {
  const reducedMotion = useReducedMotion();
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
  const configBackfillAttempted = useRef(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationButton = useRef<HTMLButtonElement>(null);
  const notificationPanel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!notificationsOpen) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!notificationPanel.current?.contains(target) && !notificationButton.current?.contains(target)) setNotificationsOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setNotificationsOpen(false); notificationButton.current?.focus(); }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, [notificationsOpen]);
  const [executingPayment, setExecutingPayment] = useState(false);
  const [toast, setToast] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const initial = document.documentElement.dataset.theme;
    if (initial === "light" || initial === "dark") return initial;
    const saved = localStorage.getItem("financial-passport-theme");
    if (saved === "light" || saved === "dark") return saved;
    return "light";
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
      ?.setAttribute("content", theme === "dark" ? "#0e1116" : "#f3f3f1");
    try {
      localStorage.setItem("financial-passport-theme", theme);
    } catch {
      // Keep the toggle usable when browser storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    const client = convexClient;
    if (!client) return;
    const watch = client.watchQuery(convexApi.bootstrap, {});
    const update = () => {
      try {
        const result = watch.localQueryResult();
        if (result) {
          const state = result as DatabaseState;
          setDatabase(state);
          if (!state.account.university && !configBackfillAttempted.current) setPage("Profile");
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
    };
    const unsubscribe = watch.onUpdate(update);
    // The authentication screen may have already populated this query cache.
    update();
    return unsubscribe;
  }, []);

  const account = database?.account;
  const visibleCosts =
    database?.costs.map((item) => ({ ...item, id: item.key })) ?? costs;
  const visibleFunding =
    database?.funding.map((item) => ({ ...item, id: item.key })) ?? funding;
  const planTotal = sumCosts(visibleCosts as any);
  const planFunded =
    database?.config?.profile?.fundingAmount ??
    confirmedFunding(visibleFunding as any);
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
  const addAudit = (type: string, detail: string, actor = account?.name ?? "Student") =>
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
    if (account) {
      if (!(await transition("prepared"))) return false;
    } else {
      setLocalPaymentStatus("prepared");
      addAudit(
        "PAYMENT_PREPARED",
        "£2,000 tuition payment prepared; no funds moved",
        "MoveWise",
      );
    }
    announce("Payment prepared — approval is still required");
    return true;
  };
  const approve = async () => {
    if (account) {
      if (!(await transition("approved"))) return false;
    } else {
      setLocalPaymentStatus("approved");
      addAudit(
        "PAYMENT_APPROVED",
        "Explicit approval recorded for £2,000 tuition payment",
      );
    }
    announce("Approval recorded securely");
    return true;
  };
  const execute = async () => {
    if (paymentStatus !== "approved" || executingPayment) return false;
    setExecutingPayment(true);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      if (account) {
        const success = await Promise.race([
          transition("completed"),
          new Promise<boolean>((_, reject) => {
            timeout = setTimeout(
              () => reject(new Error("Send timed out")),
              15000,
            );
          }),
        ]);
        if (!success) return false;
      } else setLocalPaymentStatus("completed");
      announce("Sandbox payment completed");
      return true;
    } catch {
      announce("Send not confirmed. Check status or reset the sandbox.");
      return false;
    } finally {
      if (timeout) clearTimeout(timeout);
      setExecutingPayment(false);
    }
  };
  const resetPayment = async () => {
    if (!account || executingPayment) return false;
    const success = await mutate(convexApi.resetPayment, {
      accountId: account._id,
    });
    if (success) announce("Payment reset");
    return success;
  };
  const selectRoute = (route: string) =>
    account
      ? mutate(convexApi.setRoute, { accountId: account._id, route })
      : Promise.resolve(false);
  const toggleChecklist = (key: string) =>
    account
      ? void mutate(convexApi.toggleChecklist, { accountId: account._id, key })
      : undefined;
  const requestSponsor = () =>
    account
      ? void mutate(convexApi.requestSponsor, { accountId: account._id })
      : announce("Demo contribution request sent");
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [activeChat, setActiveChat] = useState<string | undefined>(undefined);
  const newChat = () => { setActiveChat(crypto.randomUUID()); setShowChatHistory(false); go("AI Agent"); };
  const sendMessage = async (text: string) => {
    if (!account || !convexClient) return false;
    try {
      await convexClient.action(convexApi.sendMessage, { accountId: account._id as Id<"accounts">, text, chatId: activeChat });
      return true;
    } catch {
      announce("AI reply unavailable. Please try again.");
      return false;
    }
  };
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
          fundingAmount: Number(profile.funding),
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
            <code>bun run convex:dev</code>. MoveWise no longer
            substitutes hard-coded browser data when the database is
            unavailable.
          </p>
        </div>
      </main>
    );
  if (!database)
    return (
      <main className="connection-screen">
        <div className="connection-content">
          <span className="spinner" />
          <h1>Loading MoveWise…</h1>
          <p>
            {syncState === "error"
              ? "The database could not be reached. Check the Convex deployment and retry."
              : "Reading the latest account, plan, and activity data."}
          </p>
        </div>
      </main>
    );

  return (
    <div className={`app-shell app-clean variation-${variation}`}>
      <aside className={`sidebar sidebar-clean ${mobileNav ? "open" : ""}`}>
        <button
          className="mobile-close"
          aria-label="Close menu"
          onClick={() => setMobileNav(false)}
        >
          <X />
        </button>
        <Brand />
        <nav aria-label="Main navigation">
          {nav
            .filter(({ page: item }) => item !== "Profile")
            .map(({ page: item, icon: Icon }) => (
              <button
                key={item}
                className={page === item ? "active" : ""}
                aria-current={page === item ? "page" : undefined}
                onClick={() => go(item)}
              >
                {page === item && (
                  <motion.span
                    className="nav-motion-indicator"
                    layoutId="active-navigation"
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 420, damping: 34 }
                    }
                    aria-hidden="true"
                  />
                )}
                <Icon size={19} />
                <span>{item}</span>
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tools" aria-label="Application controls">
            <button
              className="tour-trigger"
              aria-label="Take a tour"
              title="Take a tour"
              onClick={() => setTourOpen(true)}
            >
              <HelpCircle size={17} />
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
            </button>
            <div className="notification-wrap">
              <button
                ref={notificationButton}
                aria-controls="notification-panel"
                aria-label="Notifications"
                title="Notifications"
                aria-expanded={notificationsOpen}
                onClick={readNotifications}
              >
                <Bell size={19} />
                {(database?.notifications.filter((n) => !n.read).length ?? 2) >
                  0 && (
                  <b>
                    {database?.notifications.filter((n) => !n.read).length ?? 2}
                  </b>
                )}
              </button>
              {notificationsOpen && createPortal(
                <div ref={notificationPanel} id="notification-panel" role="region" aria-label="Notifications" className="notification-popover notification-overlay">
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
                </div>, document.body
              )}
            </div>
          </div>
          <button className="btn secondary" onClick={() => { location.hash = "setup"; }}><Settings size={16} /> Set up account</button>
          <button className="btn secondary" onClick={onSignOut}>Sign out</button>
          <button
            className={`profile ${page === "Profile" ? "active" : ""}`}
            aria-label="Open your profile"
            aria-current={page === "Profile" ? "page" : undefined}
            onClick={() => go("Profile")}
          >
            <span>{account?.initials ?? "DC"}</span>
            <div>
              <strong>{account?.name ?? "Dara Chan"}</strong>
              <small>{account?.role ?? "Student"}</small>
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
          <motion.div
            className="page-view"
            key={`${page}-${variation}`}
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
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
                onAddCountry={(country, label) =>
                  account
                    ? mutate(convexApi.addCountryAccount, {
                        accountId: account._id,
                        country,
                        label,
                      })
                    : Promise.resolve(false)
                }
              />
            )}
            {page === "Move Planner" && (
              <MovePlanner go={go} config={database?.config?.move} />
            )}
            {page === "AI Agent" && (
              showChatHistory ? (
                <ChatHistory messages={database?.messages ?? []} onNew={newChat}
                  onBack={() => setShowChatHistory(false)}
                  onOpen={(id) => { setActiveChat(id); setShowChatHistory(false); }} />
              ) : (
                <Assistant
                  key={activeChat ?? "legacy"}
                  messages={(database?.messages ?? []).filter((message) => message.chatId === activeChat)}
                  onSend={sendMessage}
                  onNew={newChat}
                  onHistory={() => setShowChatHistory(true)}
                />
              )
            )}
            {page === "Payments" && (
              <Payments
                status={paymentStatus}
                paid={paid}
                prepare={prepare}
                approve={approve}
                execute={execute}
                reset={resetPayment}
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
                connected={!!database}
                announce={announce}
                requestSent={account?.sponsorRequestSent}
                onRequest={requestSponsor}
                storedSponsors={database?.sponsors}
                config={database?.config?.sponsorship}
              />
            )}
            {page === "Wallet" && (
              <Wallet storedWallets={database?.wallets} go={go} />
            )}
            {page === "Security" && (
              <Security audit={audit} config={database?.config?.security} />
            )}
          </motion.div>
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
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast}
            className="toast"
            role="status"
            initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
            transition={{ duration: reducedMotion ? 0 : 0.22 }}
          >
            <CheckCircle2 size={18} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
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
  const steps = [
    {
      page: "Dashboard" as Page,
      target: '[data-tour="readiness"]',
      title: "Your funding",
      body: "See your balance and funding gap.",
    },
    {
      page: "Dashboard" as Page,
      target: '[data-tour="next-action"]',
      title: "Next up",
      body: "Your next deadline, at a glance.",
    },
    {
      page: "Move Planner" as Page,
      target: ".move-board",
      title: "Plan your move",
      body: "Compare travel and living costs.",
    },
    {
      page: "AI Agent" as Page,
      target: ".agent-layout",
      title: "Ask your agent",
      body: "Ask a question about your plan.",
    },
    {
      page: "Payments" as Page,
      target: ".pay-options",
      title: "Compare providers",
      body: "Choose a route, then approve the total.",
    },
    {
      page: "Security" as Page,
      target: ".security-grid",
      title: "Stay in control",
      body: "Manage limits and review activity.",
    },
  ];
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const startingPage = useRef(page);
  const startingVariation = useRef(variation);
  const current = steps[step];
  useEffect(() => {
    if (page !== "Dashboard") go("Dashboard");
    if (variation !== 1) chooseVariation(1);
  }, []);
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
    window.addEventListener("scroll", update, { passive: true, capture: true });
    window.addEventListener("resize", update);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [step, page, variation, current.target]);
  const move = (next: number) => {
    if (next < 0 || next >= steps.length) return;
    setRect(null);
    const item = steps[next];
    const desiredVariation = item.page === "Dashboard" ? 1 : variation;
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
      if (event.key === "Escape") exitTour(false);
      if (
        event.target instanceof HTMLElement &&
        (event.target.matches("input, textarea, select") ||
          event.target.isContentEditable)
      )
        return;
      if (event.key === "ArrowRight")
        step === steps.length - 1 ? exitTour(false) : move(step + 1);
      if (event.key === "ArrowLeft" && step > 0) move(step - 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
  const tourCardStyle = (() => {
    if (!rect || window.innerWidth <= 760) return undefined;
    const gap = 20;
    const width = Math.min(320, window.innerWidth - gap * 2);
    const height = 190;
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
    <div className="guide-layer">
      {rect && (
        <div
          className="guide-focus"
          aria-hidden="true"
          style={{
            left: rect.left - 4,
            top: rect.top - 4,
            width: rect.width + 8,
            height: rect.height + 8,
          }}
        />
      )}
      <Card
        className="guide-card"
        style={tourCardStyle}
        role="dialog"
        aria-label="Quick tour"
        aria-describedby="guide-description"
      >
        <div className="guide-header">
          <span className="guide-icon">
            <TourIcon size={18} />
          </span>
          <strong>{current.title}</strong>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close tour"
            title="Close tour"
            onClick={() => exitTour(false)}
          >
            <X size={16} />
          </Button>
        </div>
        <p id="guide-description">{current.body}</p>
        <div className="guide-footer">
          <div className="guide-dots" aria-label="Tour steps">
            {steps.map((item, i) => (
              <button
                key={item.title}
                aria-label={item.title}
                aria-current={i === step ? "step" : undefined}
                onClick={() => move(i)}
                title={item.title}
              />
            ))}
          </div>
          <span className="guide-count">
            {step + 1}/{steps.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            disabled={step === 0}
            aria-label="Previous step"
            title="Previous step"
            onClick={() => move(step - 1)}
          >
            <ArrowRight size={16} style={{ transform: "rotate(180deg)" }} />
          </Button>
          <Button
            size="sm"
            onClick={() =>
              step === steps.length - 1 ? exitTour(false) : move(step + 1)
            }
          >
            {step === steps.length - 1 ? "Done" : "Next"}
            {step === steps.length - 1 ? (
              <Check size={14} />
            ) : (
              <ArrowRight size={14} />
            )}
          </Button>
        </div>
      </Card>
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
  const categoryIcon = (name: string) => {
    const label = name.toLowerCase();
    if (label.includes("tuition")) return GraduationCap;
    if (label.includes("visa")) return ShieldCheck;
    if (label.includes("flight")) return Plane;
    if (label.includes("rent") || label.includes("housing")) return Home;
    if (label.includes("emergency")) return ShieldCheck;
    return ReceiptText;
  };
  const planCosts = database?.costs ?? costs;
  const planFunding = database?.funding ?? funding;
  const planTotal = planCosts.reduce((sum, item) => sum + item.amount, 0);
  const confirmed = planFunding.filter((item) => item.status === "confirmed");
  const fundedTotal = confirmed.reduce((sum, item) => sum + item.amount, 0);
  const gap = fundingGap(planTotal, fundedTotal);
  const coverage = fundingCoverage(planTotal, fundedTotal);
  const fundingChartData = [
    ...planFunding.map((item, index) => ({
      name: item.name,
      amount: item.amount,
      color:
        item.status === "confirmed"
          ? planChartColors[index % planChartColors.length]
          : "#94a3b8",
    })),
    ...(gap > 0
      ? [{ name: "Still to fund", amount: gap, color: "#c47e6a" }]
      : []),
  ];
  const monthlyEssentials =
    planCosts
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
        <button onClick={() => go("AI Agent")}>
          <Sparkles size={16} /> Ask your agent
        </button>
      </section>

      <div className="overview-top">
        <section
          className="funding-overview"
          data-tour="readiness"
          aria-labelledby="funding-heading"
        >
          <h3 id="funding-heading">Study plan funding</h3>
          <div className="funding-amount">
            <strong>{formatGBP(fundedTotal)}</strong>
            <span>of {formatGBP(planTotal)}</span>
          </div>
          <div className="funding-progress-label">
            <span>{Math.round(coverage)}% funded</span>
            <span>
              {gap > 0
                ? `${formatGBP(gap)} left to fund`
                : "Funding goal reached"}
            </span>
          </div>
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
          <dl className="plan-facts">
            <div>
              <dt>
                <Clock3 size={15} /> Savings runway
              </dt>
              <dd>
                {monthlyEssentials > 0
                  ? runway(liquidSavings, monthlyEssentials).toFixed(1)
                  : "—"}
                <span> months</span>
              </dd>
            </div>
            <div>
              <dt>
                <WalletCards size={15} /> Monthly essentials
              </dt>
              <dd>{formatGBP(monthlyEssentials)}</dd>
            </div>
          </dl>
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
            <strong>{formatGBP(tuition.amount)}</strong>
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
              Edit plan <ArrowRight size={15} />
            </button>
          </div>
          <figure
            className="spending-chart"
            aria-label={`Spending breakdown. Total budget ${formatGBP(planTotal)}. Category amounts and percentages follow below.`}
          >
            <div className="spending-donut">
              {planTotal > 0 ? (
                <BudgetDonut costs={planCosts} />
              ) : (
                <div className="empty-donut" />
              )}
              <div className="donut-total">
                <span>Total budget</span>
                <strong>{formatGBP(planTotal)}</strong>
                <span>Study plan</span>
              </div>
            </div>
            <figcaption>
              <strong>Where your money goes</strong>
              <span>Each slice shows a category’s share of your plan.</span>
            </figcaption>
          </figure>
          <div
            className="budget-table"
            role="table"
            aria-label="Planned spending by category"
          >
            <div className="budget-table-head" role="row">
              <span role="columnheader">Category</span>
              <span role="columnheader">Share of plan</span>
              <span role="columnheader">Budget</span>
            </div>
            {planCosts.map((item, index) => {
              const Icon = categoryIcon(item.name);
              const share = planTotal > 0 ? (item.amount / planTotal) * 100 : 0;
              const isPaid = item.paid || (paid && item === tuition);
              return (
                <div className="budget-table-row" role="row" key={item.name}>
                  <span className="budget-category" role="cell">
                    <span
                      className="chart-legend-dot"
                      style={{
                        background:
                          planChartColors[index % planChartColors.length],
                      }}
                      aria-hidden="true"
                    />
                    <Icon size={18} />
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
                  <strong role="cell">{formatGBP(item.amount)}</strong>
                </div>
              );
            })}
            <div className="budget-table-total" role="row">
              <span role="rowheader">Total</span>
              <strong role="cell">{formatGBP(planTotal)}</strong>
            </div>
          </div>
        </section>
        <section className="visual-funding" aria-labelledby="sources-heading">
          <div className="visual-card-head">
            <h3 id="sources-heading">Funding sources</h3>
            <button onClick={() => go("Sponsors")}>
              Manage <ArrowRight size={15} />
            </button>
          </div>
          {fundingChartData.length > 0 && (
            <figure
              className="funding-comparison"
              aria-label="Funding source amounts compared with the remaining funding gap. Exact amounts and confirmation statuses follow below."
            >
              <figcaption>
                <strong>How your plan is funded</strong>
                <span>Funding sources and the remaining gap · GBP</span>
              </figcaption>
              <div
                className="funding-bar-chart"
                style={{
                  height: Math.max(250, fundingChartData.length * 56 + 40),
                }}
              >
                <FundingSourcesChart data={fundingChartData} />
              </div>
            </figure>
          )}
          <div className="funding-source-list">
            {planFunding.map((item) => (
              <div className="funding-source" key={item.name}>
                <div>
                  <span>{item.name}</span>
                  <strong>{formatGBP(item.amount)}</strong>
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
            <p className="funding-empty">
              Add a funding source to start your plan.
            </p>
          )}
          {gap > 0 && (
            <div className="funding-gap">
              <div>
                <span>Still to fund</span>
                <strong>{formatGBP(gap)}</strong>
              </div>
              <button onClick={() => go("AI Agent")}>
                Explore funding options <ArrowRight size={15} />
              </button>
            </div>
          )}
        </section>
      </div>
      <nav className="dashboard-shortcuts" aria-label="Dashboard actions">
        <button onClick={() => go("Payments")}>
          <Send size={17} />
          Send money
        </button>
        <button onClick={() => go("Sponsors")}>
          <UsersRound size={17} />
          Invite a sponsor
        </button>
        <button onClick={() => go("Exchange")}>
          <Route size={17} />
          Compare transfer routes
        </button>
      </nav>
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
          <h2>{title}</h2>
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
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger aria-label="Request purpose">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="ui-select-content">
                {["Living expenses", "Tuition", "Emergency funding"].map(
                  (item) => (
                    <SelectItem value={item} key={item}>
                      {item}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </label>
          <label>
            Needed by
            <DatePicker
              label="Needed by"
              value={neededBy}
              onChange={setNeededBy}
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
  const [tab, setTab] = useState("convert");
  const [amount, setAmount] = useState("2500");
  const [targetRate, setTargetRate] = useState("0.79");
  const [saving, setSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const bestRoute =
    database?.paymentRoutes.find((route) => route.recommended) ??
    database?.paymentRoutes[0];
  const rate = bestRoute?.fxRate ?? 0;
  const fee = bestRoute?.fee ?? 0;
  const numericAmount = Number(amount);
  const validAmount =
    amount.trim() !== "" && Number.isFinite(numericAmount) && numericAmount > 0;
  // Route fees are charged in USD in addition to the source amount.
  const received = validAmount ? numericAmount * rate : 0;
  const validTarget =
    targetRate.trim() !== "" &&
    Number.isFinite(Number(targetRate)) &&
    Number(targetRate) > 0;
  const alert = database?.rateAlerts.find(
    (item) => item.active && item.pair === "USD/GBP",
  );
  const visibleWallets = database?.wallets ?? [];
  const gbp = (value: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  const saveAlert = async () => {
    if (!validTarget || saving) return;
    setSaving(true);
    setAlertMessage("");
    try {
      const success = await onRateAlert(Number(targetRate));
      setAlertMessage(success ? "Alert saved." : "Could not save. Try again.");
    } catch {
      setAlertMessage("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="workspace fx-desk">
      <header className="fx-heading">
        <h2>Exchange desk</h2>
      </header>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Exchange desk views" className="fx-tabs">
          <TabsTrigger value="convert">
            <CircleDollarSign size={16} />
            Convert
          </TabsTrigger>
          <TabsTrigger value="balances">
            <WalletCards size={16} />
            Balances
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell size={16} />
            Rate alerts
          </TabsTrigger>
        </TabsList>
        <TabsContent value="convert">
          <div className="fx-grid">
            <Card className="fx-card">
              <CardHeader>
                <div className="fx-card-heading">
                  <CardTitle>USD to GBP</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <label className="fx-label" htmlFor="fx-amount">
                  You send
                </label>
                <div className="fx-money-field">
                  <span aria-hidden="true">$</span>
                  <Input
                    className="fx-amount-input"
                    id="fx-amount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    aria-invalid={!validAmount}
                    aria-describedby={
                      !validAmount ? "fx-amount-help" : undefined
                    }
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <span className="fx-currency">USD</span>
                </div>
                <div className="fx-between">
                  <span />
                  <ArrowRight size={18} />
                  <span />
                </div>
                <div className="fx-receive">
                  <span className="fx-label">Recipient gets</span>
                  <div>
                    <output aria-live="polite">
                      {bestRoute ? gbp(received) : "—"}
                    </output>
                    <span className="fx-currency">GBP</span>
                  </div>
                </div>
                {!validAmount && (
                  <p id="fx-amount-help" className="fx-error">
                    Enter an amount above zero.
                  </p>
                )}
                <dl className="fx-breakdown">
                  <div>
                    <dt>
                      <Activity size={14} />
                      Rate
                    </dt>
                    <dd>
                      {bestRoute
                        ? `1 USD = ${rate.toFixed(4)} GBP`
                        : "Unavailable"}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <ReceiptText size={14} />
                      Fee
                    </dt>
                    <dd>{bestRoute ? formatUSD(fee) : "—"}</dd>
                  </div>
                  <div>
                    <dt>
                      <Clock3 size={14} />
                      Arrival
                    </dt>
                    <dd>{bestRoute?.delivery ?? "Unavailable"}</dd>
                  </div>
                  <div className="fx-total">
                    <dt>Total</dt>
                    <dd>
                      {bestRoute && validAmount
                        ? formatUSD(numericAmount + fee)
                        : "—"}
                    </dd>
                  </div>
                </dl>
                <Button
                  className="fx-primary"
                  disabled={!validAmount || !bestRoute}
                  onClick={() => go("Payments")}
                >
                  Review transfer
                  <ArrowRight size={18} />
                </Button>
              </CardContent>
            </Card>
            <div className="fx-side">
              <Card className="fx-card">
                <CardHeader>
                  <div className="fx-card-heading">
                    <CardTitle>
                      <Activity size={18} />
                      USD / GBP
                    </CardTitle>
                    <span
                      className="fx-badge fx-demo"
                      title="Demo quote, not a live market rate"
                    >
                      Demo quote
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="fx-rate">
                    {bestRoute ? rate.toFixed(4) : "—"}
                  </div>
                  <p className="fx-hint">Estimated provider quote</p>
                  <Button
                    variant="outline"
                    className="fx-secondary"
                    onClick={() => go("Payments")}
                  >
                    Compare providers
                    <ArrowRight size={16} />
                  </Button>
                </CardContent>
              </Card>
              <Card className="fx-card">
                <CardContent className="fx-risk">
                  <div>
                    <span className="fx-label">
                      <TrendingUp size={16} />
                      If USD falls 5%
                    </span>
                    <strong>−{gbp(received * 0.05)}</strong>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Set a rate alert"
                    title="Set rate alert"
                    onClick={() => setTab("alerts")}
                  >
                    <Bell size={18} />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="balances">
          <Card className="fx-card">
            <CardHeader>
              <CardTitle>
                <WalletCards size={18} />
                Balances
              </CardTitle>
            </CardHeader>
            <CardContent>
              {visibleWallets.length === 0 ? (
                <p className="fx-hint">No balances yet.</p>
              ) : (
                <div className="fx-wallets">
                  {visibleWallets.map((w) => (
                    <div className="fx-wallet" key={w.currency}>
                      <span className="fx-badge">{w.currency}</span>
                      <div>
                        <strong>
                          {w.symbol}
                          {w.amount.toLocaleString()}
                        </strong>
                        <p>{w.label}</p>
                      </div>
                      <span>
                        {gbp(w.gbpValue)}
                        <small>≈ GBP</small>
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="fx-balance-total">
                <span>Total · GBP</span>
                <strong>
                  {gbp(visibleWallets.reduce((sum, w) => sum + w.gbpValue, 0))}
                </strong>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="alerts">
          <Card className="fx-card fx-alert-card">
            <CardHeader>
              <CardTitle>
                <Bell size={18} />
                USD / GBP alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alert && (
                <p className="fx-active-alert">
                  <CheckCircle2 size={18} />
                  Active: {alert.targetRate} GBP
                </p>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveAlert();
                }}
              >
                <label className="fx-label" htmlFor="fx-target">
                  Target rate
                </label>
                <div className="fx-target-field">
                  <Input
                    className="fx-target-input"
                    id="fx-target"
                    type="number"
                    inputMode="decimal"
                    min="0.001"
                    step="0.001"
                    value={targetRate}
                    onChange={(e) => {
                      setTargetRate(e.target.value);
                      setAlertMessage("");
                    }}
                    aria-invalid={!validTarget}
                    aria-describedby="fx-target-help"
                  />
                  <span>GBP per USD</span>
                </div>
                <p
                  id="fx-target-help"
                  className={validTarget ? "fx-hint" : "fx-error"}
                >
                  {validTarget
                    ? `Current: ${bestRoute ? rate.toFixed(4) : "unavailable"} GBP per USD`
                    : "Enter a rate above zero."}
                </p>
                <Button
                  className="fx-primary"
                  type="submit"
                  disabled={!validTarget || saving || !database}
                >
                  {saving ? "Saving…" : alert ? "Update alert" : "Create alert"}
                  <Bell size={16} />
                </Button>
                <p role="status" className="fx-hint">
                  {alertMessage}
                </p>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
            <strong>
              {taskValues.filter(Boolean).length}/{taskValues.length}
            </strong>
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
            tickFormatter={(value) => `£${value / 1000}k`}
          />
          <Tooltip
            itemStyle={{ color: "var(--color-ink)" }}
            formatter={(value) => [formatGBP(Number(value)), "Planned outflow"]}
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
  onAddCountry,
}: {
  announce: (message: string) => void;
  account?: any;
  config?: any;
  totals: { funded: number; gap: number; coverage: number };
  onSave: (profile: Record<string, string>) => Promise<boolean>;
  onAddCountry: (country: string, label: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingCountry, setAddingCountry] = useState(false);
  const [country, setCountry] = useState("");
  const [accountLabel, setAccountLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [profile, setProfile] = useState({
    name: account?.name ?? "",
    home: account?.countryFrom ?? "",
    study: account?.countryTo ?? "",
    university: account?.university ?? "",
    course: account?.course ?? "",
    start: config?.courseStart ?? "",
    status: config?.financialStatus ?? "",
    income: config?.sponsorSupport ?? "",
    funding: String(totals.funded),
  });
  const update = (key: keyof typeof profile, value: string) =>
    setProfile((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    if (!account || editing) return;
    setProfile({
      name: account.name,
      home: account.countryFrom,
      study: account.countryTo,
      university: account.university,
      course: account.course,
      start: config?.courseStart ?? "",
      status: config?.financialStatus ?? "",
      income: config?.sponsorSupport ?? "",
      funding: String(totals.funded),
    });
  }, [account, config, totals.funded, editing]);
  return (
    <div className="page-stack profile-page">
      <section className="page-intro">
        <div>
          <h2>Profile</h2>
        </div>
        <div className="profile-edit-actions">
          {editing && (
            <button
              className="secondary"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          )}
          <button
            className="primary"
            disabled={saving}
            onClick={async () => {
              if (editing) {
                if (
                  !profile.funding.trim() ||
                  !Number.isFinite(Number(profile.funding)) ||
                  Number(profile.funding) < 0
                ) {
                  announce(
                    "Enter a valid confirmed funding amount of zero or more",
                  );
                  return;
                }
                setSaving(true);
                const saved = await onSave(profile);
                setSaving(false);
                if (!saved) return;
                announce("Profile saved");
              }
              setEditing(!editing);
            }}
          >
            {editing ? (
              <>
                <Check /> {saving ? "Saving…" : "Save profile"}
              </>
            ) : (
              <>
                <Settings /> Edit profile
              </>
            )}
          </button>
        </div>
      </section>
      <section className="profile-hero">
        <div className="profile-avatar">{account?.initials ?? "DC"}</div>
        <div>
          <h3>{profile.name}</h3>

          <span>
            <MapPin /> {profile.home} <ArrowRight /> {profile.study}
          </span>
        </div>
      </section>
      <div className="profile-grid">
        <section className="profile-section">
          <div className="section-heading">
            <div>
              <h3>Study details</h3>
            </div>
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
            )
              .filter(
                ([key]) =>
                  editing || !["name", "home", "study", "status"].includes(key),
              )
              .map(([key, label]) => (
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
              <h3>Funding</h3>
            </div>
            {!editing && (
              <button
                className="icon-text"
                onClick={() => {
                  setEditing(true);
                  window.requestAnimationFrame(() =>
                    document.getElementById("profile-income")?.focus(),
                  );
                }}
              >
                <Settings size={16} /> Edit funding
              </button>
            )}
          </div>
          <div className="field-grid">
            {(
              [
                ["status", "Financial status"],
                ["income", "Sponsor support"],
                ["funding", "Confirmed funding"],
              ] as const
            )
              .filter(
                ([key]) =>
                  editing || !["name", "home", "study", "status"].includes(key),
              )
              .map(([key, label]) => (
                <label key={key}>
                  <span>
                    {key === "funding" && editing
                      ? "Confirmed funding (£)"
                      : label}
                  </span>
                  {editing ? (
                    <input
                      id={`profile-${key}`}
                      aria-label={
                        key === "funding" ? "Confirmed funding in GBP" : label
                      }
                      type={key === "funding" ? "number" : "text"}
                      min={key === "funding" ? 0 : undefined}
                      step={key === "funding" ? "0.01" : undefined}
                      value={profile[key]}
                      onChange={(e) => update(key, e.target.value)}
                    />
                  ) : (
                    <strong className="profile-value">
                      {key === "funding"
                        ? formatGBP(Number(profile.funding))
                        : profile[key]}
                    </strong>
                  )}
                </label>
              ))}
          </div>
          <div className="profile-summary">
            <span>
              <CheckCircle2 /> {Math.round(totals.coverage)}% funded
            </span>
            <strong>{formatGBP(totals.gap)} gap</strong>
            <div
              className="profile-funding-track"
              role="progressbar"
              aria-label="Funding coverage"
              aria-valuenow={Math.round(totals.coverage)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${totals.coverage}%` }} />
            </div>
          </div>
        </section>
      </div>
      <section className="profile-section country-accounts">
        <div className="section-heading">
          <div>
            <h3>Country accounts</h3>
          </div>
          <button className="secondary" onClick={() => setAddingCountry(true)}>
            <Plus size={16} /> Add account
          </button>
        </div>
        {(config?.countryAccounts ?? []).map(
          (item: { country: string; label: string }, index: number) => (
            <div className="line-item" key={`${item.country}-${index}`}>
              <MapPin size={18} />
              <div>
                <strong>{item.country}</strong>
                <small>{item.label}</small>
              </div>
            </div>
          ),
        )}
        {!config?.countryAccounts?.length && !addingCountry && (
          <p className="country-account-hint">No additional accounts yet.</p>
        )}
        {addingCountry && (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!country.trim() || !accountLabel.trim() || adding) return;
              setAdding(true);
              const saved = await onAddCountry(
                country.trim(),
                accountLabel.trim(),
              );
              setAdding(false);
              if (saved) {
                setAddingCountry(false);
                setCountry("");
                setAccountLabel("");
                announce("Country account added");
              }
            }}
          >
            <div className="field-grid">
              <label>
                <span>Country</span>
                <input
                  autoFocus
                  required
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  placeholder="e.g. United States"
                />
              </label>
              <label>
                <span>Account name</span>
                <input
                  required
                  value={accountLabel}
                  onChange={(event) => setAccountLabel(event.target.value)}
                  placeholder="e.g. US study account"
                />
              </label>
            </div>
            <div className="country-account-actions">
              <button
                type="button"
                className="secondary"
                disabled={adding}
                onClick={() => setAddingCountry(false)}
              >
                Cancel
              </button>
              <button className="primary" disabled={adding}>
                {adding ? "Adding…" : "Add account"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function MovePlanner({
  go,
  config,
}: {
  go: (page: Page) => void;
  config?: any;
}) {
  const [months, setMonths] = useState(11);
  const [selectedRoute, setSelectedRoute] = useState(1);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [arrivalDate, setArrivalDate] = useState("");
  const [excludedCosts, setExcludedCosts] = useState<string[]>([]);
  const [budgetAmounts, setBudgetAmounts] = useState<Record<string, number>>(
    {},
  );
  const parseAmount = (value: string) =>
    Number(value.match(/[\d,]+(?:\.\d+)?/)?.[0].replaceAll(",", "") ?? 0);
  const initialDate = new Date(config?.arrivalDate ?? "14 Sep 2026");
  const dateValue =
    arrivalDate ||
    (Number.isNaN(initialDate.getTime())
      ? "2026-09-14"
      : `${initialDate.getFullYear()}-${String(initialDate.getMonth() + 1).padStart(2, "0")}-${String(initialDate.getDate()).padStart(2, "0")}`);
  const displayDate = new Date(`${dateValue}T12:00:00`).toLocaleDateString(
    "en-GB",
    { day: "2-digit", month: "short", year: "numeric" },
  );
  const fallbackRoutes = [
    ["Fastest route", "Phnom Penh → London · 1 stop", "16h 40m", "£610"],
    [
      "Budget friendly",
      "Phnom Penh → Bangkok → London · 2 stops",
      "22h 10m",
      "£480",
    ],
    ["Balanced", "Phnom Penh → Singapore → London · 1 stop", "18h 25m", "£545"],
  ];
  const routes = (config?.routes?.length ? config.routes : fallbackRoutes).map(
    (route: any[], index: number) => ({
      name:
        index === 0
          ? "Fastest route"
          : index === 1
            ? "Budget friendly"
            : index === 2
              ? "Balanced"
              : route[0],
      detail: route[1],
      time: route[2],
      cost: parseAmount(route[3] ?? fallbackRoutes[index]?.[3] ?? "0"),
    }),
  );
  const requirements = config?.requirements?.length
    ? config.requirements
    : [
        ["Visa & health surcharge", "Paid", "£1,600"],
        ["Flight", "Compare", "£480–610"],
        ["First month rent + deposit", "Reserved", "£1,950"],
        ["Utilities", "Estimated", "£145 / mo"],
        ["Daily expenses", "Budgeted", "£425 / mo"],
      ];
  const activeRoute = routes[Math.min(selectedRoute, routes.length - 1)];
  const costs = requirements.map(
    ([name, status, amount]: string[], index: number) => ({
      name,
      status,
      recurring: amount.includes("mo"),
      amount:
        index === 1
          ? activeRoute.cost
          : (budgetAmounts[name] ?? parseAmount(amount)),
    }),
  );
  const includedCosts = costs.filter(
    (cost: any) => !excludedCosts.includes(cost.name),
  );
  const upfrontTotal = includedCosts
    .filter((cost: any) => !cost.recurring)
    .reduce((sum: number, cost: any) => sum + cost.amount, 0);
  const monthlyTotal = includedCosts
    .filter((cost: any) => cost.recurring)
    .reduce((sum: number, cost: any) => sum + cost.amount, 0);
  const totalBudget = upfrontTotal + monthlyTotal * months;
  const arrivalBreakdown = includedCosts.map((cost: any, index: number) => ({
    name: cost.name,
    amount: cost.amount * (cost.recurring ? months : 1),
    color: planChartColors[index % planChartColors.length],
  }));
  const budgetOutlook = Array.from({ length: months + 1 }, (_, month) => ({
    month,
    upfront: upfrontTotal,
    living: monthlyTotal * month,
  }));
  const toggleCost = (name: string) =>
    setExcludedCosts((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  const renderCost = (cost: any) => (
    <div
      className={excludedCosts.includes(cost.name) ? "excluded" : "paid"}
      key={cost.name}
    >
      <Checkbox
        className="ui-cost-checkbox"
        aria-label={`Include ${cost.name} in budget`}
        checked={!excludedCosts.includes(cost.name)}
        onCheckedChange={() => toggleCost(cost.name)}
      />
      <span>
        <strong>{cost.name}</strong>
        <small>
          {cost.name === "Flight"
            ? `${activeRoute.name} · Estimated`
            : cost.status}
        </small>
      </span>
      {budgetOpen && cost.name !== "Flight" ? (
        <label className="cost-amount-edit">
          <span className="sr-only">{cost.name} in pounds</span>
          <span>£</span>
          <Input
            aria-label={`${cost.name} in pounds`}
            type="number"
            min="0"
            step="0.01"
            value={cost.amount}
            onChange={(event) =>
              setBudgetAmounts((current) => ({
                ...current,
                [cost.name]: Math.max(0, Number(event.target.value)),
              }))
            }
          />
          {cost.recurring && <small>/mo</small>}
        </label>
      ) : (
        <b>
          {formatGBP(cost.amount)}
          {cost.recurring && <small>/mo</small>}
        </b>
      )}
    </div>
  );

  return (
    <div className="move-board">
      <section className="move-board-header">
        <div>
          <h2>Plan your arrival</h2>
        </div>
        <DatePicker
          className="planner-date-picker"
          label="Planned arrival"
          value={dateValue}
          onChange={setArrivalDate}
        />
      </section>
      <section className="arrival-summary">
        <div>
          <span>Your estimated budget</span>
          <strong aria-live="polite">{formatGBP(totalBudget)}</strong>
          <small>For your arrival and {months} months in London</small>
        </div>
        <div className="arrival-summary-breakdown">
          <div>
            <small>Upfront</small>
            <strong>{formatGBP(upfrontTotal)}</strong>
          </div>
          <span>+</span>
          <div>
            <small>Monthly living costs</small>
            <strong>
              {formatGBP(monthlyTotal)} <small>× {months} months</small>
            </strong>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="planner-assist"
          onClick={() => go("AI Agent")}
        >
          <Sparkle weight="duotone" /> Get planning help
        </Button>
      </section>

      <section className="arrival-charts" aria-label="Arrival budget charts">
        <figure className="arrival-breakdown-chart">
          <figcaption>
            <strong>What makes up your budget</strong>
            <span>Included costs across your {months}-month stay</span>
          </figcaption>
          <div className="arrival-breakdown-body">
            <div
              className="spending-donut"
              role="img"
              aria-label={`Total estimated budget ${formatGBP(totalBudget)}. Breakdown listed alongside the chart.`}
            >
              {totalBudget > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={arrivalBreakdown.filter(
                        (cost: any) => cost.amount > 0,
                      )}
                      dataKey="amount"
                      nameKey="name"
                      innerRadius="70%"
                      outerRadius="94%"
                      paddingAngle={2}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {arrivalBreakdown
                        .filter((cost: any) => cost.amount > 0)
                        .map((cost: any) => (
                          <Cell key={cost.name} fill={cost.color} />
                        ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatGBP(Number(value))}
                      contentStyle={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-line)",
                        borderRadius: 8,
                        color: "var(--color-ink)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-donut" />
              )}
              <div className="donut-total">
                <span>Estimated total</span>
                <strong>{formatGBP(totalBudget)}</strong>
                <span>{months} months</span>
              </div>
            </div>
            <ul className="arrival-chart-legend">
              {arrivalBreakdown.map((cost: any) => (
                <li key={cost.name}>
                  <span
                    className="chart-legend-dot"
                    style={{ background: cost.color }}
                    aria-hidden="true"
                  />
                  <span>{cost.name}</span>
                  <strong>{formatGBP(cost.amount)}</strong>
                </li>
              ))}
              {arrivalBreakdown.length === 0 && (
                <li>Select costs below to build your budget.</li>
              )}
            </ul>
          </div>
        </figure>
        <figure className="arrival-outlook-chart">
          <figcaption>
            <strong>Your budget over time</strong>
            <span>
              {formatGBP(upfrontTotal)} upfront, then {formatGBP(monthlyTotal)}{" "}
              each month
            </span>
          </figcaption>
          <div
            className="arrival-outlook-plot"
            role="img"
            aria-label={`Cumulative estimated costs start at ${formatGBP(upfrontTotal)} on arrival and increase by ${formatGBP(monthlyTotal)} per month to ${formatGBP(totalBudget)} at month ${months}.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={budgetOutlook}
                margin={{ top: 16, right: 16, bottom: 4, left: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-line)"
                  strokeDasharray="3 4"
                />
                <XAxis
                  dataKey="month"
                  type="number"
                  domain={[0, months]}
                  tickCount={Math.min(months + 1, 6)}
                  allowDecimals={false}
                  tickFormatter={(value) =>
                    value === 0 ? "Arrival" : `Mo ${value}`
                  }
                  tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `£${Number(value) / 1000}k`}
                  width={52}
                  tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(value) =>
                    Number(value) === 0 ? "Arrival" : `Month ${value}`
                  }
                  formatter={(value, name) => [
                    formatGBP(Number(value)),
                    name === "upfront"
                      ? "Upfront costs"
                      : "Living costs to date",
                  ]}
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-line)",
                    borderRadius: 8,
                    color: "var(--color-ink)",
                  }}
                />
                <Area
                  type="linear"
                  dataKey="upfront"
                  stackId="budget"
                  stroke="#315c85"
                  fill="#315c85"
                  fillOpacity={0.18}
                  isAnimationActive={false}
                />
                <Area
                  type="linear"
                  dataKey="living"
                  stackId="budget"
                  stroke="#4b8f8a"
                  fill="#4b8f8a"
                  fillOpacity={0.3}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="arrival-outlook-key">
            <span>
              <i style={{ background: "#315c85" }} />
              Upfront costs
            </span>
            <span>
              <i style={{ background: "#4b8f8a" }} />
              Living costs to date
            </span>
          </div>
        </figure>
      </section>
      <div className="move-board-grid">
        <section className="route-choice-card">
          <h3>Flight routes</h3>
          <p className="move-help">Flight prices are estimates.</p>
          <div className="route-choices">
            {routes.slice(0, 4).map((route: any, index: number) => {
              return (
                <Button
                  variant="outline"
                  type="button"
                  aria-pressed={selectedRoute === index}
                  className={selectedRoute === index ? "selected" : ""}
                  onClick={() => setSelectedRoute(index)}
                  key={`${route.name}-${index}`}
                >
                  <span className="route-copy">
                    <strong>
                      {route.name}
                      <b className="mode-price">{formatGBP(route.cost)}</b>
                    </strong>
                    <small>{route.detail}</small>
                    <em>
                      <Timer /> {route.time}
                    </em>
                  </span>
                  <i className="route-radio" />
                </Button>
              );
            })}
          </div>
        </section>

        <div className="move-side-stack">
          <section className="cost-card">
            <div className="planner-cost-heading">
              <div>
                <h3>Your costs</h3>
                <p className="move-help">
                  Choose which costs to include in your estimate.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="planner-edit"
                aria-pressed={budgetOpen}
                onClick={() => setBudgetOpen((open) => !open)}
              >
                <PencilSimple />
                {budgetOpen ? "Done editing" : "Edit amounts"}
              </Button>
            </div>
            <div className="planner-duration">
              <label htmlFor="arrival-months">Length of stay</label>
              <Select
                value={String(months)}
                onValueChange={(value) => setMonths(Number(value))}
              >
                <SelectTrigger
                  id="arrival-months"
                  className="ui-duration-trigger"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="ui-select-content">
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((month) => (
                    <SelectItem key={month} value={String(month)}>
                      {month} {month === 1 ? "month" : "months"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="cost-groups">
              <section
                className="cost-group"
                aria-labelledby="upfront-costs-heading"
              >
                <div className="cost-group-heading">
                  <span className="cost-group-icon">
                    <Plane size={18} />
                  </span>
                  <div>
                    <h4 id="upfront-costs-heading">Before you arrive</h4>
                    <span>One-time costs</span>
                  </div>
                </div>
                <div className="cost-group-total">
                  <strong>{formatGBP(upfrontTotal)}</strong>
                  <span>Included upfront</span>
                </div>
                <div className="cost-list">
                  {costs.filter((cost: any) => !cost.recurring).map(renderCost)}
                </div>
              </section>
              <section
                className="cost-group"
                aria-labelledby="monthly-costs-heading"
              >
                <div className="cost-group-heading">
                  <span className="cost-group-icon">
                    <CalendarDays size={18} />
                  </span>
                  <div>
                    <h4 id="monthly-costs-heading">Each month</h4>
                    <span>Ongoing living costs</span>
                  </div>
                </div>
                <div className="cost-group-total">
                  <strong>
                    {formatGBP(monthlyTotal)}
                    <small>/mo</small>
                  </strong>
                  <span>
                    {formatGBP(monthlyTotal * months)} over {months}{" "}
                    {months === 1 ? "month" : "months"}
                  </span>
                </div>
                <div className="cost-list recurring-costs">
                  {costs.filter((cost: any) => cost.recurring).map(renderCost)}
                </div>
              </section>
            </div>

            <p className="planner-estimate-note">
              Estimates only. Confirm prices before booking.
            </p>
          </section>
        </div>
      </div>
      <div className="planner-arrival-note">
        <CalendarBlank weight="duotone" />
        <span>
          Arrival <strong>{displayDate}</strong> ·{" "}
          {config?.apartment ?? "Riverside House, Zone 2"}
        </span>
      </div>
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

function Payments({
  status,
  paid,
  prepare,
  approve,
  execute,
  reset,
  storedRoute,
  onSelectRoute,
  storedRoutes,
  config,
}: {
  status: PaymentStatus;
  paid: boolean;
  prepare: () => Promise<boolean>;
  approve: () => Promise<boolean>;
  execute: () => Promise<boolean>;
  reset: () => Promise<boolean>;
  storedRoute?: string;
  onSelectRoute: (route: string) => Promise<boolean>;
  storedRoutes?: DatabaseState["paymentRoutes"];
  config?: any;
}) {
  const availableRoutes =
    storedRoutes?.map((r) => ({ ...r, id: r.key })) ?? routes;
  const [selected, setSelected] = useState(
    storedRoute ?? availableRoutes.find((r) => r.recommended)?.id ?? "wise",
  );
  const [consent, setConsent] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const runAction = async (action: () => Promise<boolean>) => {
    if (busy) return;
    setBusy(true);
    setActionError("");
    try {
      if (!(await action())) setActionError("Could not save. Try again.");
    } catch {
      setActionError("Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  };
  const selectProvider = async (id: string) => {
    const previous = selected;
    setSelected(id);
    setConsent(false);
    await runAction(async () => {
      const success = await onSelectRoute(id);
      if (!success) setSelected(previous);
      return success;
    });
  };
  useEffect(() => {
    if (storedRoute) setSelected(storedRoute);
    setConsent(false);
  }, [storedRoute, status]);
  const route =
    availableRoutes.find((r) => r.id === selected) ?? availableRoutes[0];
  const amount = Number(config?.paymentAmount);
  const ready =
    Number.isFinite(amount) && amount > 0 && !!route && route.fxRate > 0;
  const amountLabel = ready ? formatGBP(amount) : "—";
  const recipient = config?.recipient ?? "Example UK University";
  const locked = !["not_started", "prepared"].includes(status);
  const currentStep =
    status === "not_started" ? 1 : status === "prepared" ? 2 : 3;
  return (
    <div className="payments-page payment-checkout pay-simple">
      <TuitionPlanner />
      <div className="tuition-sandbox">
        <Button
          variant="secondary"
          size="sm"
          className="tuition-demo-button"
          aria-expanded={showSandbox}
          aria-controls="sandbox-checkout"
          onClick={() => setShowSandbox((value) => !value)}
        >
          <CreditCard size={16} />
          {showSandbox ? "Close demo" : "Payment demo"}
          <ChevronRight size={14} />
        </Button>
        {showSandbox && (
          <div id="sandbox-checkout" className="tuition-sandbox-content">
            <header className="pay-heading">
              <h2>Sandbox payment</h2>
              <div className="pay-header-actions">
                <span className="fx-badge">Sandbox</span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy || status === "not_started"}
                  onClick={() => void runAction(reset)}
                >
                  <RotateCcw size={14} />
                  Reset payment
                </Button>
              </div>
            </header>
            <div className="pay-progress" aria-label="Payment progress">
              {["Choose", "Approve", "Send"].map((label, i) => (
                <div
                  key={label}
                  className={i + 1 <= currentStep ? "active" : ""}
                  aria-current={i + 1 === currentStep ? "step" : undefined}
                >
                  <span>
                    {i + 1 < currentStep ? <Check size={12} /> : i + 1}
                  </span>
                  {label}
                </div>
              ))}
            </div>
            {paid && (
              <div className="pay-success" role="status">
                <CheckCircle2 size={20} />
                <strong>{amountLabel} sent</strong>
                <span>{config?.transactionReference}</span>
              </div>
            )}
            <div className="pay-grid">
              <Card className="pay-card">
                <CardHeader>
                  <CardTitle>Choose a provider</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="pay-options"
                    role="group"
                    aria-label="Payment providers"
                  >
                    {availableRoutes.map((r) => {
                      const RouteIcon =
                        r.id.includes("swift") ||
                        r.provider.toLowerCase().includes("bank")
                          ? Landmark
                          : r.id.includes("card") ||
                              r.provider.toLowerCase().includes("card")
                            ? CreditCard
                            : Send;
                      return (
                        <Button
                          variant="outline"
                          type="button"
                          key={r.id}
                          disabled={locked || busy}
                          className={`pay-option ${route?.id === r.id ? "selected" : ""}`}
                          aria-pressed={route?.id === r.id}
                          onClick={() => void selectProvider(r.id)}
                        >
                          <span className="pay-provider-icon">
                            <RouteIcon size={20} />
                          </span>
                          <span className="pay-provider">
                            <strong>{r.provider}</strong>
                            <span>
                              <Clock3 size={13} />
                              {r.delivery}
                              {r.recommended && <em>Best value</em>}
                            </span>
                          </span>
                          <strong
                            className="pay-price"
                            aria-label="Total cost in USD"
                          >
                            {formatUSD(routeEffectiveCost(r))}
                          </strong>
                          <span className="pay-radio" aria-hidden="true">
                            {route?.id === r.id && <Check size={12} />}
                          </span>
                        </Button>
                      );
                    })}
                    {!availableRoutes.length && (
                      <p className="fx-hint">No providers available.</p>
                    )}
                  </div>
                  <div className="pay-recipient">
                    <Landmark size={20} />
                    <div>
                      <strong>{recipient}</strong>
                      <small>
                        •••• {config?.recipientAccountLast4 ?? "1842"}
                      </small>
                    </div>
                    <ShieldCheck
                      size={20}
                      aria-label="Verified recipient"
                      role="img"
                    >
                      <title>Verified recipient</title>
                    </ShieldCheck>
                  </div>
                </CardContent>
              </Card>
              <Card className="pay-card pay-review">
                <CardHeader>
                  <CardTitle>Review</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="pay-amount">
                    <span>Recipient gets</span>
                    <strong>{amountLabel}</strong>
                  </div>
                  {!ready && (
                    <p className="fx-error" role="status">
                      Payment details unavailable.
                    </p>
                  )}
                  <dl className="pay-details">
                    <div>
                      <dt>
                        <WalletCards size={16} />
                        You pay
                      </dt>
                      <dd>
                        {route ? formatUSD(routeEffectiveCost(route)) : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <ReceiptText size={16} />
                        Fee included
                      </dt>
                      <dd>{route ? formatUSD(route.fee) : "—"}</dd>
                    </div>
                    <div>
                      <dt>
                        <Activity size={16} />
                        Rate
                      </dt>
                      <dd>{route ? `${route.fxRate} GBP / USD` : "—"}</dd>
                    </div>
                    <div>
                      <dt>
                        <Clock3 size={16} />
                        Arrival
                      </dt>
                      <dd>{route?.delivery ?? "—"}</dd>
                    </div>
                  </dl>
                  {status === "not_started" && (
                    <Button
                      className="pay-action"
                      disabled={!ready || busy}
                      onClick={() => void runAction(prepare)}
                    >
                      {busy ? "Saving…" : "Continue"}
                      <ArrowRight size={16} />
                    </Button>
                  )}
                  {status === "prepared" && (
                    <>
                      <label className="pay-consent">
                        <Checkbox
                          checked={consent}
                          onCheckedChange={(checked) =>
                            setConsent(checked === true)
                          }
                          disabled={!ready}
                        />
                        <span>Recipient and total are correct</span>
                      </label>
                      <Button
                        className="pay-action"
                        disabled={!consent || !ready || busy}
                        onClick={() => void runAction(approve)}
                      >
                        {busy ? "Saving…" : "Approve"}
                        <LockKeyhole size={16} />
                      </Button>
                    </>
                  )}
                  {status === "approved" && (
                    <Button
                      className="pay-action"
                      disabled={!ready || busy}
                      onClick={() => void runAction(execute)}
                    >
                      Send {amountLabel}
                      <ArrowRight size={16} />
                    </Button>
                  )}
                  {status === "processing" && (
                    <Button className="pay-action" disabled>
                      <span className="spinner" />
                      Sending…
                    </Button>
                  )}
                  {status === "completed" && (
                    <div className="pay-done">
                      <CheckCircle2 size={18} />
                      Sent
                    </div>
                  )}
                  {actionError && (
                    <p className="fx-error" role="alert">
                      {actionError}
                    </p>
                  )}
                  <small className="pay-sandbox">
                    <ShieldCheck size={13} />
                    No real funds
                  </small>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Sponsors({
  connected,
  announce,
  requestSent,
  onRequest,
  storedSponsors,
  config,
}: {
  announce: (s: string) => void;
  requestSent?: boolean;
  onRequest: () => void;
  connected?: boolean;
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
  const schedule = config?.schedule ?? [
    ["15 Nov 2026", "Living expenses", 1000],
    ["15 Jan 2027", "Tuition instalment", 2000],
  ];
  const hasScheduleStatus = schedule.some((item: any[]) => Boolean(item[3]));
  return (
    <div className="sponsor-reference-page">
      <section className="sponsor-reference-header">
        <div>
          <h2>Sponsors</h2>
        </div>
        <div
          className="sponsor-reference-tabs"
          role="tablist"
          aria-label="Sponsor views"
        >
          {(["Sponsors", "Requests", "Privacy"] as const).map((item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
              role="tab"
              id={`sponsor-tab-${item}`}
              aria-controls={`sponsor-panel-${item}`}
              tabIndex={tab === item ? 0 : -1}
              onKeyDown={(event) => {
                const views = ["Sponsors", "Requests", "Privacy"] as const;
                const index = views.indexOf(item);
                const next =
                  event.key === "ArrowRight"
                    ? views[(index + 1) % views.length]
                    : event.key === "ArrowLeft"
                      ? views[(index + views.length - 1) % views.length]
                      : event.key === "Home"
                        ? views[0]
                        : event.key === "End"
                          ? views[2]
                          : null;
                if (!next) return;
                event.preventDefault();
                setTab(next);
                document.getElementById(`sponsor-tab-${next}`)?.focus();
              }}
              aria-selected={tab === item}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {tab === "Sponsors" && connected && <SponsorConnect role="Student" />}

      {tab === "Sponsors" && sponsor && !connected && (
        <div
          className="sponsor-overview-content"
          role="tabpanel"
          id="sponsor-panel-Sponsors"
          aria-labelledby="sponsor-tab-Sponsors"
        >
          <section className="sponsor-reference-summary">
            <div className="sponsor-reference-person">
              <div className="sponsor-reference-avatar">
                {sponsor.name
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div>
                <h3>{sponsor.name}</h3>
                <p>{sponsor.relationship}</p>
              </div>
            </div>
            <div className="sponsor-reference-commitment">
              <div className="commitment-total">
                <span>Annual commitment</span>
                <strong>{formatGBP(totalCommitment)}</strong>
              </div>
              <div className="commitment-row received">
                <span>Received</span>
                <strong>{formatGBP(transferred)}</strong>
              </div>
              <div className="commitment-row remaining">
                <span>Remaining</span>
                <strong>
                  {formatGBP(Math.max(0, totalCommitment - transferred))}
                </strong>
              </div>
            </div>
          </section>
          <section
            className={`sponsor-reference-schedule ${hasScheduleStatus ? "" : "schedule-no-status"}`}
          >
            <div className="schedule-title">
              <h3>Contribution schedule</h3>
            </div>
            <div className="schedule-head">
              <span>Date</span>
              <span>Description</span>
              <span>Amount</span>
              {hasScheduleStatus && <span>Status</span>}
            </div>
            {schedule.map((item: any[]) => (
              <div className="schedule-line" key={`${item[0]}-${item[1]}`}>
                <span>{item[0]}</span>
                <span>{item[1]}</span>
                <span>{formatGBP(Number(item[2]))}</span>
                {hasScheduleStatus && <em>{item[3] ?? "—"}</em>}
              </div>
            ))}
          </section>
        </div>
      )}

      {tab === "Sponsors" && !sponsor && !connected && (
        <section
          role="tabpanel"
          id="sponsor-panel-Sponsors"
          aria-labelledby="sponsor-tab-Sponsors"
        >
          <p>No sponsors connected yet.</p>
        </section>
      )}
      {tab === "Requests" && (
        <section
          className="sponsor-reference-panel"
          role="tabpanel"
          id="sponsor-panel-Requests"
          aria-labelledby="sponsor-tab-Requests"
        >
          <h3>Request a contribution from {sponsor?.name ?? "your sponsor"}</h3>
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
        <section
          className="sponsor-reference-panel privacy"
          role="tabpanel"
          id="sponsor-panel-Privacy"
          aria-labelledby="sponsor-tab-Privacy"
        >
          <LockKeyhole />
          <h3>What your sponsor can see</h3>
          <p>
            Contributions are shared. Wallet balances, transaction history, and
            personal spending stay private.
          </p>
        </section>
      )}
    </div>
  );
}
function Wallet({
  storedWallets,
  go,
}: {
  storedWallets?: DatabaseState["wallets"];
  go: (page: Page) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const visibleWallets = storedWallets ?? wallets;
  const totalValue = visibleWallets.reduce(
    (sum, wallet) => sum + wallet.gbpValue,
    0,
  );
  const usdBalance =
    visibleWallets.find((wallet) => wallet.currency === "USD")?.gbpValue ?? 0;
  return (
    <div className="page-stack balance-workspace">
      <section className="page-intro">
        <h2>Your balances</h2>
        <button className="primary" onClick={() => go("Exchange")}>
          <CircleDollarSign size={16} /> Convert currency
        </button>
      </section>
      <section className="balance-total">
        <span>Total in GBP</span>
        <strong>{formatGBP(totalValue)}</strong>
        <small>Converted values use demo rates.</small>
      </section>
      <section className="balance-accounts" aria-label="Currency accounts">
        <div className="balance-table-head">
          <span>Account</span>
          <span>Balance</span>
          <span>GBP equivalent</span>
        </div>
        {visibleWallets.map((wallet) => (
          <div className="balance-account-row" key={wallet.currency}>
            <div>
              <strong>{wallet.currency}</strong>
              <span>{wallet.label}</span>
            </div>
            <strong>
              {wallet.symbol}
              {wallet.amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </strong>
            <span>{formatGBP(wallet.gbpValue)}</span>
          </div>
        ))}
        {visibleWallets.length === 0 && <p>No currency accounts yet.</p>}
      </section>
      <button
        className="disclosure-button"
        aria-expanded={detailsOpen}
        onClick={() => setDetailsOpen((open) => !open)}
      >
        {detailsOpen ? "Hide currency analysis" : "View currency analysis"}
        <ChevronRight size={16} />
      </button>
      {detailsOpen && (
        <section className="balance-analysis">
          <h3>Currency exposure</h3>
          <dl>
            {visibleWallets.map((wallet) => (
              <div key={wallet.currency}>
                <dt>{wallet.currency}</dt>
                <dd>
                  {totalValue
                    ? ((wallet.gbpValue / totalValue) * 100).toFixed(1)
                    : "0"}
                  % of total
                </dd>
              </div>
            ))}
          </dl>
          <p>
            A 5% fall in USD against GBP would reduce the value of your current
            USD balance by approximately {formatGBP(usdBalance * 0.05)}.
          </p>
        </section>
      )}
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
    link.download = "movewise-audit.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <div className="page-stack security-workspace">
      <section className="page-intro">
        <div>
          <h2>Security center</h2>
        </div>
      </section>
      <section className="security-grid">
        <div className="card control">
          <LockKeyhole />
          <div>
            <strong>Approval required</strong>
            <p>Every payment requires explicit student approval.</p>
          </div>
          <span>
            {config?.approvalRequired == null
              ? "Unavailable"
              : config.approvalRequired
                ? "On"
                : "Off"}
          </span>
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
        aria-expanded={activityOpen}
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
              <h3>Activity log</h3>
            </div>
            <button className="secondary" onClick={exportAudit}>
              <History /> Export CSV
            </button>
          </div>
          <div
            className="audit-table"
            role="region"
            aria-label="Activity log"
            tabIndex={0}
          >
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
