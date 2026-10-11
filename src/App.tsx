import { useBackgroundChat } from "./lib/use-background-chat";
import {
  routeProviderName,
  routeProviderDetails,
} from "../shared/payment-routes";
import MovePlanner from "./MovePlanner";
import LinkAccount from "./LinkAccount";
import { comparisonRoute } from "../shared/payment-comparison";
import { calculateMove } from "../shared/move-planner";
export { default as MovePlanner } from "./MovePlanner";
import {
  WorkspaceCurrencyProvider,
  useWorkspaceCurrency,
  useWorkspaceMoney,
} from "./WorkspaceCurrency";
import {
  studyCurrency,
  walletValue,
  convertMoney,
  formatCurrency,
  currencyRate,
  convertMoneyText,
} from "../shared/currency";
import MobileNavigation from "./MobileNavigation";
import { tuitionQuote, quoteFingerprint } from "../convex/tuitionDecision";
import InfoHelp from "./InfoHelp";
import AgentTour from "./AgentTour";
import SectionHelp from "./SectionHelp";
import UniversitySelect from "./UniversitySelect";
import { countries, getCountry, getUniversity } from "../shared/study";
import SetupCountrySelect from "./SetupCountrySelect";
import "./brief.css";
import "./security.css";
import "./profile.css";
import { createPortal } from "react-dom";
import SponsorConnect from "./SponsorConnect";
import { Assistant, ChatHistory } from "./Chat";
import type { Id } from "../convex/_generated/dataModel";
import BudgetDonut, { planChartColors } from "./BudgetDonut";
import Brand from "./Brand";
import PaymentWorkspace from "./PaymentWorkspace";
import PaymentEvidence from "./PaymentEvidence";
import TuitionDecision from "./TuitionDecision";
import FundingConfirmation from "./FundingConfirmation";
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
  Download,
  ArrowRight,
  ArrowLeft,
  ArrowLeftRight,
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
  formatUSD,
  fundingCoverage,
  fundingGap,
  monthlyBurn,
  runway,
  resolvePlanFunding,
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
    countryFrom: string;
    countryTo: string;
    name: string;
    initials: string;
    role: string;
    planName: string;
    paymentStatus: PaymentStatus;
    selectedRoute: string;
    sponsorRequestSent: boolean;
    aiConsentAt?: number;
    setupComplete?: boolean;
  };
  auditEvents: Array<{
    _id: string;
    type: string;
    detail: string;
    timestamp: number;
    actor: string;
  }>;
  messages: Array<{
    _id: string;
    from: "agent" | "user";
    text: string;
    timestamp?: number;
    chatId?: string;
    toolResults?: { name: string; result: unknown }[];
  }>;
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
  toolExecutions?: Array<{
    name: string;
    arguments: unknown;
    result: unknown;
    timestamp: number;
  }>;
  paymentRoutes: Array<{
    sourceCurrency?: string;
    targetCurrency?: string;
    maxBusinessDays?: number;
    quotedAt?: number;
    quoteExpiresAt?: number;
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
  paymentProposals?: Array<{
    delivery: string;
    _id: string;
    recipient: string;
    recipientLast4: string;
    provider: string;
    amountMinor: number;
    totalMinor: number;
    feeMinor: number;
    fxRate: number;
    sourceCurrency: string;
    targetCurrency: string;
    status: string;
    expiresAt: number;
    createdAt: number;
    protectedReserveMinor?: number;
    remainingGBPMinor?: number;
    reference?: string;
  }>;
  ledgerEntries?: Array<{
    reference: string;
    currency: string;
    debitMinor: number;
    beforeMinor: number;
    afterMinor: number;
    recipient: string;
    receivedMinor: number;
    receivedCurrency: string;
    timestamp: number;
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
  { page: "Sponsors", icon: UsersRound },
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
    [...nav, { page: "Wallet" as Page }, { page: "Exchange" as Page }].find(
      ({ page }) =>
        `#${page.toLowerCase().replace(" ", "-")}` === window.location.hash,
    )?.page ?? "Dashboard";
  const [page, setPage] = useState<Page>(pageFromHash);
  useEffect(() => {
    const update = () => setPage(pageFromHash());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const [localPaymentStatus, setLocalPaymentStatus] =
    useState<PaymentStatus>("not_started");
  const [localAudit, setLocalAudit] = useState<AuditEvent[]>(initialAudit);
  const [database, setDatabase] = useState<DatabaseState | null>(null);
  // Legacy plans are denominated in GBP until the server rebases them.
  const currency =
    database?.config?.profile?.workspaceCurrency ??
    database?.config?.profile?.fundingCurrency ??
    "GBP";
  const formatMoney = (value: number) => formatCurrency(value, currency);
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
      if (
        !notificationPanel.current?.contains(target) &&
        !notificationButton.current?.contains(target)
      )
        setNotificationsOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        notificationButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
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
          if (!state.account.university && !configBackfillAttempted.current)
            setPage("Profile");
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
  useEffect(() => {
    if (!convexClient || !account || account.role !== "Student") return;
    void convexClient
      .mutation(convexApi.syncPaymentReminder, {
        accountId: account._id as any,
      })
      .catch(() => {});
  }, [
    account?._id,
    database?.config?.banking?.tuitionDeadline,
    account?.paymentStatus,
  ]);
  const visibleCosts =
    database?.costs.map((item) => ({ ...item, id: item.key })) ?? costs;
  const visibleFunding =
    database?.funding.map((item) => ({ ...item, id: item.key })) ?? funding;
  const planTotal = sumCosts(visibleCosts as any);
  const planFunded = resolvePlanFunding(
    visibleFunding,
    database?.config?.profile?.fundingAmount,
  ).total;
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
  const addAudit = (
    type: string,
    detail: string,
    actor = account?.name ?? "Student",
  ) =>
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
  const transition = async (next: "prepared" | "approved" | "completed") => {
    if (!account || !convexClient) return false;
    await convexClient.mutation(convexApi.transitionPayment, {
      accountId: account._id as any,
      next,
      expectedQuote:
        next === "prepared" &&
        database?.config?.banking &&
        database.paymentRoutes.find((r) => r.key === account.selectedRoute)
          ? quoteFingerprint(
              database.config.banking.paymentAmount,
              database.config.banking.recipient,
              database.config.banking.recipientAccountLast4,
              database.paymentRoutes.find(
                (r) => r.key === account.selectedRoute,
              )!,
            )
          : undefined,
      proposalId:
        next === "prepared"
          ? undefined
          : (database?.paymentProposals
              ?.slice()
              .sort((a, b) => b.createdAt - a.createdAt)[0]?._id as any),
    });
    return true;
  };
  const prepare = async () => {
    if (account) {
      if (!(await transition("prepared"))) return false;
    } else {
      setLocalPaymentStatus("prepared");
      addAudit(
        "PAYMENT_PREPARED",
        convertMoneyText(
          "£2,000 tuition payment prepared; no funds moved",
          "GBP",
          currency,
        ),
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
        convertMoneyText(
          "Explicit approval recorded for £2,000 tuition payment",
          "GBP",
          currency,
        ),
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
    } catch (error) {
      announce("Send not confirmed. Check Payments for the current status.");
      throw error;
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
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [activeChat, setActiveChat] = useState<string | undefined>(undefined);
  const newChat = () => {
    setActiveChat(crypto.randomUUID());
    setShowChatHistory(false);
    go("AI Agent");
  };
  const backgroundChat = useBackgroundChat(async ({ text, chatId }) => {
    if (!account || !convexClient) throw new Error("Sign in to send a message");
    await convexClient.action(convexApi.sendMessage, {
      accountId: account._id as Id<"accounts">,
      text,
      chatId,
    });
  }, announce);
  const sendMessage = (text: string) => backgroundChat.send(text, activeChat);
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
          pair: `USD/${currency}`,
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
            <code>bun run convex:dev</code>. MoveWise no longer substitutes
            hard-coded browser data when the database is unavailable.
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
          {syncState === "error" && (
            <Button onClick={() => location.reload()}>Retry connection</Button>
          )}
        </div>
      </main>
    );

  return (
    <WorkspaceCurrencyProvider currency={currency}>
      <div className={`app-shell app-clean variation-${variation}`}>
        <aside className="sidebar sidebar-clean">
          <Brand />
          <nav aria-label="Main navigation">
            {nav
              .filter(({ page: item }) => item !== "Profile")
              .map(({ page: item, icon: Icon }) => (
                <div className="sidebar-section" key={item}>
                  <button
                    className={
                      page === item ||
                      (item === "Payments" &&
                        ["Wallet", "Exchange"].includes(page))
                        ? "active"
                        : ""
                    }
                    aria-current={
                      page === item ||
                      (item === "Payments" &&
                        ["Wallet", "Exchange"].includes(page))
                        ? "page"
                        : undefined
                    }
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
                    {item === "AI Agent" && backgroundChat.pending && (
                      <small
                        role="status"
                        aria-label="AI agent working in background"
                      >
                        Working…
                      </small>
                    )}
                  </button>
                </div>
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
                  {(database?.notifications.filter((n) => !n.read).length ??
                    2) > 0 && (
                    <b>
                      {database?.notifications.filter((n) => !n.read).length ??
                        2}
                    </b>
                  )}
                </button>
                {notificationsOpen &&
                  createPortal(
                    <div
                      ref={notificationPanel}
                      id="notification-panel"
                      role="region"
                      aria-label="Notifications"
                      className="notification-popover notification-overlay"
                    >
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
                          <span>
                            Your{" "}
                            {formatMoney(convertMoney(2000, "GBP", currency))}{" "}
                            instalment is due in 12 days.
                          </span>
                        </div>
                      )}
                    </div>,
                    document.body,
                  )}
              </div>
            </div>
            <button
              className="btn secondary"
              onClick={() => {
                location.hash = "setup";
              }}
            >
              <Settings size={16} /> Set up account
            </button>
            <button className="btn secondary" onClick={onSignOut}>
              Sign out
            </button>
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
        <main className={page === "Dashboard" ? "dashboard-page" : ""}>
          <div className="content">
            <motion.div
              className="page-view"
              key={`${page}-${variation}`}
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              {(page !== "AI Agent" || showChatHistory) &&
                ![
                  "Payments",
                  "Wallet",
                  "Exchange",
                  "Profile",
                  "Security",
                ].includes(page) && (
                  <div className="page-help-tools">
                    <SectionHelp key={page} section={page} />
                  </div>
                )}
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
                  go={go}
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
                <MovePlanner
                  studyCountry={account?.countryTo}
                  university={account?.university}
                  annualTuition={
                    database?.costs?.find((cost) => cost.key === "tuition")
                      ?.amount ?? 0
                  }
                  go={go}
                  config={database?.config?.move}
                  accountId={account?._id}
                />
              )}
              {page === "AI Agent" &&
                (showChatHistory ? (
                  <ChatHistory
                    messages={database?.messages ?? []}
                    onNew={newChat}
                    onBack={() => setShowChatHistory(false)}
                    onOpen={(id) => {
                      setActiveChat(id);
                      setShowChatHistory(false);
                    }}
                  />
                ) : (
                  <Assistant
                    key={activeChat ?? "legacy"}
                    tour={<AgentTour accountId={account?._id} />}
                    messages={(database?.messages ?? []).filter(
                      (message) => message.chatId === activeChat,
                    )}
                    aiEnabled={!!account?.aiConsentAt}
                    onConsent={async (enabled) =>
                      account
                        ? mutate(convexApi.setAIConsent, {
                            accountId: account._id,
                            enabled,
                          })
                        : false
                    }
                    backgroundPending={
                      backgroundChat.pending?.chatId === activeChat
                        ? backgroundChat.pending?.text
                        : ""
                    }
                    backgroundBusy={!!backgroundChat.pending}
                    backgroundError={
                      backgroundChat.failure?.chatId === activeChat
                        ? backgroundChat.failure?.message
                        : ""
                    }
                    onSend={sendMessage}
                    onNew={newChat}
                    onHistory={() => setShowChatHistory(true)}
                  />
                ))}
              {["Payments", "Wallet", "Exchange"].includes(page) && (
                <PaymentWorkspace
                  sourceCurrency={
                    database?.paymentRoutes?.[0]?.sourceCurrency ?? "USD"
                  }
                  homeCountry={account?.countryFrom}
                  travelCountry={account?.countryTo}
                  help={
                    <div className="page-help-tools">
                      <SectionHelp key={page} section={page} />
                    </div>
                  }
                  initialView={
                    page === "Wallet"
                      ? "balances"
                      : page === "Exchange"
                        ? "exchange"
                        : "tuition"
                  }
                  balances={
                    <Wallet storedWallets={database?.wallets} go={go} />
                  }
                  exchange={
                    <ExchangeWorkspace
                      go={go}
                      database={database}
                      onRateAlert={createRateAlert}
                    />
                  }
                  accountId={account?._id}
                  banking={database?.config?.banking}
                  amount={database?.config?.banking?.paymentAmount}
                  recipient={database?.config?.banking?.recipient}
                  paymentStatus={paymentStatus}
                  plan={(comparison) =>
                    database?.config?.banking ? (
                      <WorkspaceCurrencyProvider
                        currency={comparison.targetCurrency}
                      >
                        <TuitionDecision
                          accountId={account?._id}
                          banking={{
                            ...database.config.banking,
                            paymentAmount: comparison.amount,
                          }}
                          reserveGBP={convertMoney(
                            database.config.security?.protectedReserveGBP ??
                              convertMoney(1000, "GBP", currency),
                            currency,
                            comparison.targetCurrency,
                          )}
                          wallets={database.wallets}
                          routes={database.paymentRoutes.map((route) =>
                            comparisonRoute(
                              route,
                              comparison.sourceCurrency,
                              comparison.targetCurrency,
                            ),
                          )}
                          selectedRoute={account?.selectedRoute}
                          paymentStatus={paymentStatus}
                          onSave={async (plan) => {
                            if (
                              !account ||
                              !(await mutate(convexApi.updateTuitionPlan, {
                                accountId: account._id,
                                ...plan,
                                protectedReserveGBP: convertMoney(
                                  plan.protectedReserveGBP,
                                  comparison.targetCurrency,
                                  currency,
                                ),
                              }))
                            )
                              throw new Error("Could not save payment plan");
                          }}
                          onSelect={selectRoute}
                        />
                      </WorkspaceCurrencyProvider>
                    ) : (
                      <PaymentEvidence
                        accountId={account?._id}
                        proposals={[]}
                        ledger={[]}
                        audit={[]}
                      />
                    )
                  }
                  review={
                    <Payments
                      status={paymentStatus}
                      paid={paid}
                      prepare={prepare}
                      approve={approve}
                      execute={execute}
                      reset={resetPayment}
                      accountId={account?._id}
                      storedRoute={account?.selectedRoute}
                      onSelectRoute={selectRoute}
                      proposal={
                        database?.paymentProposals
                          ?.slice()
                          .sort((a, b) => b.createdAt - a.createdAt)[0]
                      }
                      storedRoutes={database?.paymentRoutes}
                      config={{
                        ...database?.config?.banking,
                        transactionReference: database?.paymentProposals?.find(
                          (p) => p.status === "completed",
                        )?.reference,
                      }}
                    />
                  }
                />
              )}
              {page === "Sponsors" && (
                <Sponsors
                  connected={!!database}
                  onPermission={setSponsorPermission}
                  announce={announce}
                  requests={database?.sponsorRequests}
                  onRequest={createSponsorRequest}
                  storedSponsors={database?.sponsors}
                  config={database?.config?.sponsorship}
                />
              )}
              {page === "Security" && (
                <Security
                  audit={audit}
                  config={database?.config?.security}
                  receipts={
                    <PaymentEvidence
                      accountId={account?._id}
                      banking={database?.config?.banking}
                      proposals={database?.paymentProposals ?? []}
                      ledger={database?.ledgerEntries ?? []}
                      audit={database?.auditEvents ?? []}
                      tools={database?.toolExecutions ?? []}
                    />
                  }
                />
              )}
            </motion.div>
          </div>
        </main>
        <MobileNavigation page={page} go={go} />
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
              initial={
                reducedMotion ? false : { opacity: 0, y: 16, scale: 0.96 }
              }
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
    </WorkspaceCurrencyProvider>
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
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();

  const planCosts = database?.costs ?? costs;
  const { sources: planFunding, total: fundedTotal } = resolvePlanFunding(
    database?.funding ?? funding,
    database?.config?.profile?.fundingAmount,
  );
  const planTotal = planCosts.reduce((sum, item) => sum + item.amount, 0);
  const hasBudget = planTotal > 0;
  const confirmed = planFunding.filter((item) => item.status === "confirmed");
  const gap = fundingGap(planTotal, fundedTotal);
  const coverage = fundingCoverage(planTotal, fundedTotal);
  const move = database?.config?.move;
  const savedMove = move?.plannerSettings
    ? calculateMove(
        move.budgetAmounts ?? {},
        move.months ?? 12,
        move.plannerSettings,
        move.excludedCosts ?? [],
      )
    : null;
  const monthlyEssentials = savedMove
    ? savedMove.monthly +
      (move.excludedCosts?.includes("rent")
        ? 0
        : (move.budgetAmounts?.rent ?? 0))
    : planCosts
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
      </section>

      <div className="overview-top">
        <section
          className="funding-overview"
          data-tour="readiness"
          aria-labelledby="funding-heading"
        >
          <h3 id="funding-heading">Study plan funding</h3>
          <div className="funding-amount">
            <strong>{formatMoney(fundedTotal)}</strong>
            <span>
              {hasBudget ? `of ${formatMoney(planTotal)}` : "confirmed funding"}
            </span>
          </div>
          <div className="funding-progress-label">
            <span>
              {hasBudget ? `${Math.round(coverage)}% funded` : "Budget not set"}
            </span>
            <span>
              {!hasBudget
                ? "Set your budget to calculate funding progress"
                : gap > 0
                  ? `${formatMoney(gap)} left to fund`
                  : "Funding goal reached"}
            </span>
          </div>
          {hasBudget && (
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
          )}
          {!hasBudget && (
            <div className="budget-setup">
              <p>
                Your funding is saved. Add tuition, housing and living costs in
                the Move Planner to see your target and any funding gap.
              </p>
              <button
                className="dashboard-primary"
                onClick={() => go("Move Planner")}
              >
                Set your budget <ArrowRight size={16} />
              </button>
            </div>
          )}
          <dl className="plan-facts">
            <div>
              <dt>
                <Clock3 size={15} /> Savings runway
              </dt>
              <dd>
                {monthlyEssentials > 0 && liquidSavings > 0
                  ? runway(liquidSavings, monthlyEssentials).toFixed(1)
                  : "—"}
                <span> months</span>
              </dd>
            </div>
            <div>
              <dt>
                <WalletCards size={15} /> Monthly essentials
              </dt>
              <dd>
                {monthlyEssentials > 0 ? formatMoney(monthlyEssentials) : "—"}
              </dd>
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
            <strong>{formatMoney(tuition.amount)}</strong>
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
              {hasBudget ? "Edit plan" : "Create plan"} <ArrowRight size={15} />
            </button>
          </div>
          <div className="budget-breakdown">
            <figure
              className="spending-chart"
              aria-label={`Spending breakdown. Total budget ${formatMoney(planTotal)}. Category amounts and percentages follow below.`}
            >
              <div className="spending-donut">
                {planTotal > 0 ? (
                  <BudgetDonut currency={currency} costs={planCosts} />
                ) : (
                  <div className="empty-donut" />
                )}
                <div className="donut-total">
                  <span>Total budget</span>
                  <strong>{hasBudget ? formatMoney(planTotal) : "—"}</strong>
                  <span>
                    {hasBudget
                      ? `${move?.months ?? 12}-month plan`
                      : "Budget not set"}
                  </span>
                </div>
              </div>
              {!hasBudget && (
                <figcaption>Add costs in the Move Planner.</figcaption>
              )}
            </figure>
            <div
              className="budget-table"
              role="table"
              aria-label="Planned spending by category"
            >
              <div className="budget-table-head" role="row">
                <span role="columnheader">Category</span>
                <span role="columnheader">Share</span>
                <span role="columnheader">Budget</span>
              </div>
              {planCosts.map((item, index) => {
                const share =
                  planTotal > 0 ? (item.amount / planTotal) * 100 : 0;
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
                    <strong role="cell">{formatMoney(item.amount)}</strong>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        <section className="visual-funding" aria-labelledby="sources-heading">
          <div className="visual-card-head">
            <h3 id="sources-heading">Funding sources</h3>
            <button onClick={() => go("Profile")}>
              Manage <ArrowRight size={15} />
            </button>
          </div>
          {hasBudget && (
            <div className="funding-coverage-summary">
              <div>
                <strong>{Math.round(coverage)}%</strong>
                <span>of budget covered</span>
              </div>
              <div
                className="funding-coverage-track"
                role="img"
                aria-label={`${Math.round(coverage)}% confirmed, ${formatMoney(gap)} still to fund`}
              >
                <i style={{ width: `${coverage}%` }} />
              </div>
            </div>
          )}
          <div className="funding-source-list">
            {planFunding.map((item) => (
              <div className="funding-source" key={item.name}>
                <div>
                  <span>{item.name}</span>
                  <strong>{formatMoney(item.amount)}</strong>
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
                <strong>{formatMoney(gap)}</strong>
              </div>
              <button onClick={() => go("AI Agent")}>
                Find funding <ArrowRight size={15} />
              </button>
            </div>
          )}
        </section>
      </div>
      <nav className="dashboard-shortcuts" aria-label="Dashboard actions">
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
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();

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
            Extra monthly spending <b>{formatMoney(extraSpend)}</b>
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
            At {formatMoney(adjustedBurn)}/month, your current liquid funds
            reach approximately <b>{adjustedRunway.toFixed(1)} months</b>.
            Irregular tuition payments are excluded from this stress test.
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
            {formatMoney(convertMoney(3000, "GBP", currency))}{" "}
            <small>remaining</small>
          </strong>
        </div>
        <div className="sponsor-request">
          <div>
            <span>Next commitment</span>
            <strong>
              {formatMoney(convertMoney(1000, "GBP", currency))} by 15 November
            </strong>
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
          <span>
            {formatMoney(convertMoney(6000, "GBP", currency))} received
          </span>
          <span>
            {formatMoney(convertMoney(9000, "GBP", currency))} committed
          </span>
        </div>
      </section>
    );
  if (variation === 4) {
    const received = usdAmount * 0.774 * currencyRate("GBP", currency);
    return (
      <section className="variation-panel fx-tool">
        <div className="variation-heading">
          <div>
            <span>Variation 4 · Exchange desk</span>
            <h2>Preview a USD → {currency} conversion</h2>
          </div>
          <button onClick={() => go("Payments")}>
            Compare routes <ArrowRight />
          </button>
        </div>
        <div className="conversion">
          <label>
            You send <span>$</span>
            <Input
              money
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
            <strong>{formatCurrency(received, currency, 2)}</strong>
            <em>{currency}</em>
          </label>
        </div>
        <div className="rate-strip">
          <span>
            Demo rate{" "}
            <b>{(0.774 * currencyRate("GBP", currency)).toFixed(4)}</b>
          </span>
          <span>
            Provider fee <b>$8.40</b>
          </span>
          <span>
            Rate impact at −5%{" "}
            <b>
              {formatMoney(
                -usdAmount * 0.774 * currencyRate("GBP", currency) * 0.05,
              )}
            </b>
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
                  ? convertMoneyText(
                      "£2,700 funding gap remains",
                      "GBP",
                      currency,
                    )
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
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();

  const [tab, setTab] = useState("Forecast"),
    [extra, setExtra] = useState(() => convertMoney(250, "GBP", currency));
  const recurring =
    database?.costs.filter((item) => item.category === "Recurring") ?? [];
  const baseBurn =
    recurring.reduce((sum, item) => sum + item.amount / 12, 0) ||
    convertMoney(1300, "GBP", currency);
  const liquid =
    database?.wallets.reduce(
      (sum, item) => sum + walletValue(item, currency),
      0,
    ) ?? convertMoney(8900, "GBP", currency);
  const burnRate = baseBurn + extra,
    months = liquid / burnRate,
    currentMonths = liquid / baseBurn;
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
            <BalanceForecastChart />
          </section>
          <aside className="workspace-side">
            <h3>Pressure points</h3>
            <div className="signal danger">
              <span>12 Oct</span>
              <strong>
                {formatMoney(convertMoney(2000, "GBP", currency))} tuition
              </strong>
              <p>Largest outgoing payment in the next 30 days.</p>
            </div>
            <div className="signal">
              <span>15 Nov</span>
              <strong>
                {formatMoney(convertMoney(1000, "GBP", currency))} arriving
              </strong>
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
            Every extra {formatMoney(convertMoney(100, "GBP", currency))} per
            month removes approximately{" "}
            {(
              currentMonths -
              liquid / (baseBurn + convertMoney(100, "GBP", currency))
            ).toFixed(1)}{" "}
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
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();

  const [tab, setTab] = useState("Sponsors"),
    [amount, setAmount] = useState(() => convertMoney(1000, "GBP", currency)),
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
              <strong>{formatMoney(sponsor?.commitment ?? 0)}</strong>
            </div>
            <div>
              <span>Received</span>
              <strong>{formatMoney(transferred)}</strong>
            </div>
            <div>
              <span>Remaining</span>
              <strong>
                {formatMoney(
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
                <span>
                  {typeof x[2] === "number" ? formatMoney(x[2]) : x[2]}
                </span>
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
            <Input
              money
              min="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <em>{currency}</em>
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
            "Financial overview",
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

export function ExchangeWorkspace({
  go,
  database,
  onRateAlert,
}: {
  go: (p: Page) => void;
  database: DatabaseState | null;
  onRateAlert: (targetRate: number) => Promise<boolean>;
}) {
  const currency = useWorkspaceCurrency();

  const [amount, setAmount] = useState("2500");
  const [targetRate, setTargetRate] = useState(() =>
    String(0.79 * currencyRate("GBP", currency)),
  );
  useEffect(
    () => setTargetRate(String(0.79 * currencyRate("GBP", currency))),
    [currency],
  );
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
    (item) => item.active && item.pair === `USD/${currency}`,
  );
  const targetMoney = (value: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
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
    <section className="workspace fx-desk fx-conversion">
      <header className="fx-heading">
        <h2>
          <ArrowLeftRight size={24} aria-hidden="true" /> Exchange
        </h2>
      </header>
      <div className="fx-conversion-layout">
        <section
          className="fx-converter-panel"
          aria-label="Conversion estimate"
        >
          <div className="fx-conversion-heading">
            <h3>USD → {currency}</h3>
            <span className="fx-badge">
              <ShieldCheck size={14} aria-hidden="true" /> Sandbox
            </span>
          </div>
          <div className="fx-amounts">
            <label className="fx-label" htmlFor="fx-amount">
              <WalletCards size={15} aria-hidden="true" /> You send
            </label>
            <div className="fx-money-field">
              <Input
                id="fx-amount"
                aria-label="Amount to convert"
                className="fx-amount-input"
                money
                inputMode="decimal"
                min="0.01"
                value={amount}
                aria-invalid={!validAmount}
                aria-describedby={!validAmount ? "fx-amount-help" : undefined}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span className="fx-currency">USD</span>
            </div>
            <div className="fx-conversion-direction">
              <ArrowLeft
                className="fx-down-arrow"
                size={18}
                aria-hidden="true"
              />
            </div>
            <div className="fx-result">
              <span className="fx-label">
                <Landmark size={15} aria-hidden="true" /> You receive ·{" "}
                {currency}
              </span>
              <output aria-live="polite">
                {bestRoute && validAmount ? targetMoney(received) : "—"}
              </output>
            </div>
            {!validAmount && (
              <p id="fx-amount-help" className="fx-error">
                Enter an amount above zero.
              </p>
            )}
          </div>
          <div className="fx-quote-summary">
            <dl className="fx-breakdown">
              <div>
                <dt>
                  <ArrowLeftRight size={15} aria-hidden="true" /> Rate{" "}
                  <InfoHelp term="Exchange rate" />
                </dt>
                <dd>
                  {bestRoute
                    ? `1 USD = ${rate.toFixed(4)} ${currency}`
                    : "Unavailable"}
                </dd>
              </div>
              <div>
                <dt>
                  <ReceiptText size={15} aria-hidden="true" /> Fee{" "}
                  <InfoHelp term="Fees" />
                </dt>
                <dd>{bestRoute ? formatUSD(fee) : "—"}</dd>
              </div>
              <div>
                <dt>
                  <Clock3 size={15} aria-hidden="true" /> Arrival{" "}
                  <InfoHelp term="Arrival estimate" />
                </dt>
                <dd>{bestRoute?.delivery ?? "Unavailable"}</dd>
              </div>
              <div className="fx-total">
                <dt>
                  <WalletCards size={15} aria-hidden="true" /> Total · USD
                </dt>
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
              <GraduationCap size={18} aria-hidden="true" /> Tuition payment{" "}
              <ArrowRight size={18} />
            </Button>
          </div>
        </section>
        <aside className="fx-conversion-support">
          <details className="fx-alert-disclosure">
            <summary>
              <span>
                <Bell size={16} aria-hidden="true" /> Rate alert
              </span>
              <ChevronRight size={16} aria-hidden="true" />
            </summary>
            {alert && (
              <p className="fx-active-alert">
                Active target: {alert.targetRate} {currency} per USD
              </p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveAlert();
              }}
            >
              <label className="fx-label" htmlFor="fx-target">
                Target rate · {currency} per USD
              </label>
              <Input
                id="fx-target"
                className="fx-target-input"
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
              <p
                id="fx-target-help"
                className={validTarget ? "fx-hint" : "fx-error"}
              >
                {validTarget
                  ? `Current: ${bestRoute ? rate.toFixed(4) : "unavailable"} ${currency} per USD`
                  : "Enter a rate above zero."}
              </p>
              <Button
                type="submit"
                disabled={!validTarget || saving || !database}
              >
                {saving ? "Saving…" : alert ? "Update alert" : "Create alert"}
              </Button>
              <p role="status" className="fx-hint">
                {alertMessage}
              </p>
            </form>
          </details>
        </aside>
      </div>
    </section>
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
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();

  const [tab, setTab] = useState("Checklist"),
    [tasks, setTasks] = useState([true, true, false, false]);
  const taskData =
    storedTasks ??
    [
      ["visa", "Visa fee paid", "Receipt verified", true],
      [
        "housing",
        "Housing deposit reserved",
        convertMoneyText("£1,300 set aside", "GBP", currency),
        true,
      ],
      ["tuition", "Tuition instalment prepared", "Due in 12 days", false],
      [
        "emergency",
        "Emergency fund completed",
        convertMoneyText("£2,700 gap remains", "GBP", currency),
        false,
      ],
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
            <p>
              Next required action: prepare the{" "}
              {formatMoney(convertMoney(2000, "GBP", currency))} tuition
              instalment.
            </p>
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
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();

  const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
  return (
    <div
      className="balance-chart"
      role="img"
      aria-label={convertMoneyText(
        "Projected balance falls from £8,900 in September to £3,000 in February",
        "GBP",
        currency,
      )}
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
              {formatMoney(
                convertMoney((10 - index * 2.5) * 1000, "GBP", currency),
              )}
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
            formatter={(value) => [
              formatMoney(Number(value)),
              "Planned outflow",
            ]}
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
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();

  const planCosts = costs.map((cost) => ({
    ...cost,
    amount: convertMoney(cost.amount, "GBP", currency),
  }));
  const planFunding = funding.map((item) => ({
    ...item,
    amount: convertMoney(item.amount, "GBP", currency),
  }));
  const total = sumCosts(planCosts),
    funded = confirmedFunding(planFunding),
    gap = fundingGap(total, funded),
    coverage = fundingCoverage(total, funded);
  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <span className="eyebrow">China → United Kingdom</span>
          <h2>Your study-abroad plan</h2>
          <p>
            MSc Financial Technology · University of Manchester · September 2026
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
          value={formatMoney(total)}
          note="First academic year"
        />
        <Metric
          icon={WalletCards}
          label="Confirmed funding"
          value={formatMoney(funded)}
          note={`${Math.round(coverage)}% coverage`}
          tone="green"
        />
        <Metric
          icon={TrendingUp}
          label="Funding gap"
          value={formatMoney(gap)}
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
            <strong>{formatMoney(total)}</strong>
          </div>
          {planCosts.map((c) => (
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
              <strong>{formatMoney(c.amount)}</strong>
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
          {planFunding.map((f) => (
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
              <strong>{formatMoney(f.amount)}</strong>
            </div>
          ))}
          <div className="gap-box">
            <div>
              <span>Remaining funding gap</span>
              <strong>{formatMoney(gap)}</strong>
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

export function Profile({
  go,
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
  go: (page: Page) => void;
  onAddCountry: (country: string, label: string) => Promise<boolean>;
}) {
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingFunding, setConfirmingFunding] = useState(false);
  const [addingCountry, setAddingCountry] = useState(false);
  const [profile, setProfile] = useState({
    name: account?.name ?? "",
    home: getCountry(account?.countryFrom ?? "")?.name ?? "",
    study: getCountry(account?.countryTo ?? "")?.name ?? "",
    university:
      getUniversity(account?.countryTo ?? "", account?.university ?? "") ?? "",
    course: account?.course ?? "",
    start: config?.courseStart ?? "",
    status: config?.financialStatus ?? "",
    income: config?.sponsorSupport ?? "",
    funding: String(totals.funded),
  });
  const profileFieldIcons = {
    name: UserRound,
    home: Home,
    study: MapPin,
    university: Landmark,
    course: GraduationCap,
    start: CalendarDays,
    status: TrendingUp,
    income: UsersRound,
    funding: WalletCards,
  };
  const update = (key: keyof typeof profile, value: string) =>
    setProfile((current) => ({
      ...current,
      [key]: value,
      ...(key === "study" && value !== current.study
        ? {
            university: "",
            funding: String(
              convertMoney(
                Number(current.funding),
                studyCurrency(current.study),
                studyCurrency(value),
              ),
            ),
          }
        : {}),
    }));
  useEffect(() => {
    if (!account || editing) return;
    setProfile({
      name: account.name,
      home: getCountry(account.countryFrom)?.name ?? "",
      study: getCountry(account.countryTo)?.name ?? "",
      university: getUniversity(account.countryTo, account.university) ?? "",
      course: account.course,
      start: config?.courseStart ?? "",
      status: config?.financialStatus ?? "",
      income: config?.sponsorSupport ?? "",
      funding: String(totals.funded),
    });
  }, [account, config, totals.funded, editing]);
  const saveProfileEdits = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await onSave(profile);
      setConfirmingFunding(false);
      if (!saved) return;
      announce("Profile saved");
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      id="profile-workspace"
      className={`page-stack profile-page ${editing ? "profile-editing" : "profile-reading"}`}
    >
      <FundingConfirmation
        open={confirmingFunding}
        amount={Number(profile.funding)}
        currency={studyCurrency(profile.study)}
        busy={saving}
        onOpenChange={setConfirmingFunding}
        onConfirm={() => void saveProfileEdits()}
      />
      <section className="page-intro">
        <div>
          <h2>
            <UserRound size={22} aria-hidden="true" />
            Profile
          </h2>
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
            aria-label={editing ? "Save profile" : "Edit profile"}
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
                if (
                  Number(profile.funding) !== totals.funded ||
                  studyCurrency(profile.study) !== currency
                ) {
                  setConfirmingFunding(true);
                } else {
                  await saveProfileEdits();
                }
                return;
              }
              setEditing(!editing);
            }}
          >
            {editing ? (
              <>
                <Check aria-hidden="true" />
                <span className="profile-label-desktop">
                  {saving ? "Saving…" : "Save profile"}
                </span>
                <span className="profile-label-mobile">
                  {saving ? "Saving…" : "Save"}
                </span>
              </>
            ) : (
              <>
                <Settings aria-hidden="true" />
                <span className="profile-label-desktop">Edit profile</span>
                <span className="profile-label-mobile">Edit</span>
              </>
            )}
          </button>
          <SectionHelp section="Profile" />
        </div>
      </section>
      <div className="profile-secondary-nav">
        <Button variant="outline" onClick={() => go("Sponsors")}>
          <UsersRound size={16} aria-hidden="true" />
          Sponsors
        </Button>
        <Button
          variant="outline"
          aria-label="Security & activity"
          onClick={() => go("Security")}
        >
          <ShieldCheck size={16} aria-hidden="true" />
          <span className="profile-label-desktop">Security & activity</span>
          <span className="profile-label-mobile">Security</span>
        </Button>
      </div>
      <section className="profile-hero">
        <div className="profile-avatar">{account?.initials ?? "DC"}</div>
        <div>
          <h3>{profile.name}</h3>

          <span>
            <MapPin /> {profile.home} <ArrowRight /> {profile.study}
          </span>
          <p
            className="setup-directory-note profile-currencies"
            aria-label="Home and study currencies"
          >
            <WalletCards size={13} aria-hidden="true" />
            {getCountry(profile.home)?.currency ?? "—"}
            <ArrowRight size={12} aria-hidden="true" />
            {getCountry(profile.study)?.currency ?? currency}
          </p>
        </div>
      </section>
      <div className="profile-grid">
        <section className="profile-section">
          <div className="section-heading">
            <div>
              <h3>
                <GraduationCap size={18} aria-hidden="true" />
                Study
              </h3>
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
              .map(([key, label]) => {
                const Icon = profileFieldIcons[key];
                return (
                  <div
                    className="setup-field profile-data-row"
                    data-field={key}
                    key={key}
                  >
                    {!editing && (
                      <span className="profile-field-icon">
                        <Icon size={17} aria-hidden="true" />
                      </span>
                    )}
                    {!(
                      editing && ["home", "study", "university"].includes(key)
                    ) && <label htmlFor={`profile-${key}`}>{label}</label>}
                    {editing && (key === "home" || key === "study") ? (
                      <SetupCountrySelect
                        label={label}
                        value={profile[key]}
                        onChange={(value) => update(key, value)}
                        disabled={saving}
                      />
                    ) : editing && key === "university" ? (
                      <UniversitySelect
                        country={profile.study}
                        value={profile.university}
                        onChange={(value) => update("university", value)}
                        disabled={saving}
                      />
                    ) : editing ? (
                      <Input
                        id={`profile-${key}`}
                        value={profile[key]}
                        onChange={(e) => update(key, e.target.value)}
                      />
                    ) : (
                      <strong className="profile-value">
                        {profile[key] || "—"}
                      </strong>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
        <section className="profile-section">
          <div className="section-heading">
            <div>
              <h3>
                <WalletCards size={18} aria-hidden="true" />
                Funding
              </h3>
            </div>
            {!editing && (
              <button
                className="icon-text"
                aria-label="Edit funding"
                title="Edit funding"
                onClick={() => {
                  setEditing(true);
                  window.requestAnimationFrame(() =>
                    document.getElementById("profile-income")?.focus(),
                  );
                }}
              >
                <Settings size={16} aria-hidden="true" />
                <span className="profile-label-desktop">Edit funding</span>
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
              .map(([key, label]) => {
                const Icon = profileFieldIcons[key];
                return (
                  <label
                    className="profile-data-row"
                    data-field={key}
                    key={key}
                  >
                    {!editing && (
                      <span className="profile-field-icon">
                        <Icon size={17} aria-hidden="true" />
                      </span>
                    )}
                    <span className="profile-data-label">
                      {key === "funding" && editing
                        ? `Confirmed funding (${getCountry(profile.study)?.currency ?? currency})`
                        : label}
                    </span>
                    {editing ? (
                      <Input
                        id={`profile-${key}`}
                        aria-label={
                          key === "funding"
                            ? `Confirmed funding in ${getCountry(profile.study)?.currency ?? currency}`
                            : label
                        }
                        type={key === "funding" ? "number" : "text"}
                        min={key === "funding" ? 0 : undefined}
                        money={key === "funding"}
                        value={profile[key]}
                        onChange={(e) => update(key, e.target.value)}
                      />
                    ) : (
                      <strong className="profile-value">
                        {key === "funding"
                          ? formatCurrency(
                              Number(profile.funding),
                              getCountry(profile.study)?.currency ?? currency,
                            )
                          : profile[key] || "—"}
                      </strong>
                    )}
                  </label>
                );
              })}
          </div>
          <div className="profile-summary">
            <span>
              <CheckCircle2 /> {Math.round(totals.coverage)}% funded
            </span>
            <strong>{formatMoney(totals.gap)} gap</strong>
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
            <h3>
              <Landmark size={18} aria-hidden="true" />
              Accounts
            </h3>
          </div>
          <button className="secondary" onClick={() => setAddingCountry(true)}>
            <Plus size={16} /> Link bank or card
          </button>
        </div>
        {(config?.countryAccounts ?? [])
          .filter((item: { country: string }) => getCountry(item.country))
          .map((item: { country: string; label: string }, index: number) => (
            <div className="line-item" key={`${item.country}-${index}`}>
              <MapPin size={18} />
              <div>
                <strong>{item.country}</strong>
                <small>
                  {item.label} ·{" "}
                  {getCountry(item.country)?.currency ?? "Currency unavailable"}
                </small>
              </div>
            </div>
          ))}
        {!(config?.countryAccounts ?? []).some((item: { country: string }) =>
          getCountry(item.country),
        ) &&
          !addingCountry && (
            <p className="country-account-hint">
              Add a bank account or credit card to keep your account details in
              one place.
            </p>
          )}
        {addingCountry && (
          <LinkAccount
            open={addingCountry}
            onOpenChange={setAddingCountry}
            defaultCountry={profile.home}
            onSave={async (country, label) => {
              const saved = await onAddCountry(country, label);
              if (saved) announce("Account added to your profile");
              return saved;
            }}
          />
        )}
      </section>
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
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();

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
      detail: "Beijing → London · 1 stop",
      time: "16h 40m",
      cost: convertMoneyText("£610", "GBP", currency),
      ease: "Easiest",
      best: true,
    },
    {
      name: "Budget flight",
      detail: "Beijing → Shanghai → London · 2 stops",
      time: "22h 10m",
      cost: convertMoneyText("£480", "GBP", currency),
      ease: "More effort",
    },
    {
      name: "Flexible flight",
      detail: "Beijing → Guangzhou → London · 1 stop",
      time: "18h 25m",
      cost: convertMoneyText("£545", "GBP", currency),
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
          <span className="eyebrow">China → United Kingdom</span>
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
          <strong>{formatMoney(totalMove)}</strong>
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

export function Payments({
  accountId,
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
  proposal,
}: {
  accountId?: string;
  status: PaymentStatus;
  paid: boolean;
  prepare: () => Promise<boolean>;
  approve: () => Promise<boolean>;
  execute: () => Promise<boolean>;
  reset: () => Promise<boolean>;
  storedRoute?: string;
  onSelectRoute: (route: string) => Promise<boolean>;
  storedRoutes?: DatabaseState["paymentRoutes"];
  proposal?: NonNullable<DatabaseState["paymentProposals"]>[number];
  config?: any;
}) {
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();

  const availableRoutes = (storedRoutes ?? []).map((r) => {
    try {
      const quote = tuitionQuote(Number(config?.paymentAmount), r);
      return {
        ...r,
        id: r.key,
        sourceAmount: quote.sourceMinor / 100,
        totalMinor: quote.totalMinor,
      };
    } catch {
      return { ...r, id: r.key, sourceAmount: NaN, totalMinor: NaN };
    }
  });
  const [selected, setSelected] = useState(
    storedRoute ?? availableRoutes.find((r) => r.recommended)?.id ?? "wise",
  );
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [recipientDigits, setRecipientDigits] = useState("");
  const runAction = async (action: () => Promise<boolean>) => {
    if (busy) return;
    setBusy(true);
    setActionError("");
    try {
      if (!(await action())) setActionError("Could not save. Try again.");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message.split("Uncaught Error: ").pop()!.split("\n")[0]
          : "Could not save. Try again.",
      );
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
  }, [storedRoute, status, currency, config?.paymentAmount]);
  const [quoteClock, setQuoteClock] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setQuoteClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const activeProposal =
    status !== "not_started" && proposal?.status !== "cancelled"
      ? proposal
      : undefined;
  const route = (() => {
    const item = availableRoutes.find((r) => r.id === selected);
    return item
      ? {
          ...item,
          ...(activeProposal
            ? {
                provider: activeProposal.provider,
                totalMinor: activeProposal.totalMinor,
                sourceAmount:
                  (activeProposal.totalMinor - activeProposal.feeMinor) / 100,
                fee: activeProposal.feeMinor / 100,
                fxRate: activeProposal.fxRate,
                delivery: activeProposal.delivery,
              }
            : { sourceAmount: item.sourceAmount }),
        }
      : undefined;
  })();
  const amount = activeProposal
    ? activeProposal.amountMinor / 100
    : Number(config?.paymentAmount);
  const selectedQuote = availableRoutes.find((r) => r.id === selected);
  const quoteExpired =
    status !== "completed" &&
    (activeProposal
      ? activeProposal.expiresAt <= quoteClock
      : !selectedQuote?.quoteExpiresAt ||
        selectedQuote.quoteExpiresAt <= quoteClock);
  const ready =
    !quoteExpired &&
    (selectedQuote?.targetCurrency ?? "GBP") === currency &&
    Number.isFinite(amount) &&
    amount > 0 &&
    !!route &&
    route.fxRate > 0 &&
    config?.recipientVerified === true;
  const amountLabel =
    Number.isFinite(amount) && amount > 0
      ? new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: activeProposal?.targetCurrency ?? currency,
        }).format(amount)
      : "—";
  const recipient =
    activeProposal?.recipient ??
    config?.recipient ??
    "University of Manchester";
  const locked = status !== "not_started";
  const currentStep =
    status === "not_started" ? 1 : status === "prepared" ? 2 : 3;
  return (
    <div className="payments-page payment-checkout pay-simple">
      <div className="tuition-sandbox">
        <div id="sandbox-checkout" className="tuition-sandbox-content">
          <header className="pay-heading">
            <h2>Confirm payment</h2>
            <div className="pay-header-actions">
              {status !== "not_started" && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void runAction(reset)}
                >
                  <RotateCcw size={14} />
                  Reset payment
                </Button>
              )}
            </div>
          </header>
          {status !== "not_started" && (
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
          )}
          {paid && (
            <div className="pay-success" role="status">
              <CheckCircle2 size={20} />
              <strong>{amountLabel} sent</strong>
              <span>{config?.transactionReference}</span>
            </div>
          )}
          <div className="pay-grid">
            <Card className="pay-card pay-review">
              <CardContent className="compact-checkout-content">
                <div
                  className="pay-options"
                  role="group"
                  aria-label="Payment providers"
                >
                  {availableRoutes
                    .filter((r) => r.id === selected)
                    .map((r) => {
                      const RouteIcon =
                        r.id.includes("swift") ||
                        r.provider.toLowerCase().includes("bank")
                          ? Landmark
                          : r.id.includes("card") ||
                              r.provider.toLowerCase().includes("card")
                            ? CreditCard
                            : Send;
                      return (
                        <div key={r.id} className="pay-option selected">
                          <span className="pay-provider-icon">
                            <RouteIcon size={20} />
                          </span>
                          <span className="pay-provider">
                            <strong>{routeProviderName(r.provider)}</strong>
                            <small>
                              {routeProviderDetails(
                                r.provider,
                                r.targetCurrency ?? "GBP",
                              )}
                            </small>
                            <span>
                              <Clock3 size={13} />
                              {r.delivery}
                              {r.recommended && <em>Best value</em>}
                            </span>
                          </span>
                          <strong
                            className="pay-price"
                            aria-label={`Total cost in ${activeProposal?.sourceCurrency ?? r.sourceCurrency ?? "USD"}`}
                          >
                            {formatCurrency(
                              (activeProposal?.totalMinor ?? r.totalMinor) /
                                100,
                              activeProposal?.sourceCurrency ??
                                r.sourceCurrency ??
                                "USD",
                              2,
                            )}
                          </strong>
                          <span className="pay-radio" aria-hidden="true">
                            {route?.id === r.id && <Check size={12} />}
                          </span>
                        </div>
                      );
                    })}
                  {!availableRoutes.length && (
                    <p className="fx-hint">No providers available.</p>
                  )}
                </div>
                {config?.recipientVerified !== true &&
                  status === "not_started" && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void runAction(async () => {
                          if (!convexClient || !accountId) return false;
                          await convexClient.mutation(
                            convexApi.verifySandboxRecipient,
                            {
                              accountId: accountId as any,
                              last4: recipientDigits,
                            },
                          );
                          return true;
                        });
                      }}
                    >
                      <label>
                        Confirm recipient account last four digits
                        <Input
                          required
                          pattern="[0-9]{4}"
                          inputMode="numeric"
                          maxLength={4}
                          value={recipientDigits}
                          disabled={busy}
                          onChange={(e) => setRecipientDigits(e.target.value)}
                        />
                      </label>
                      <Button disabled={busy}>Confirm sandbox recipient</Button>
                    </form>
                  )}
                <div className="pay-recipient">
                  <Landmark size={20} />
                  <div>
                    <strong>{recipient}</strong>
                    <small>
                      ••••{" "}
                      {activeProposal?.recipientLast4 ??
                        config?.recipientAccountLast4 ??
                        "1842"}
                    </small>
                  </div>
                  <ShieldCheck
                    size={20}
                    aria-label={
                      config?.recipientVerified
                        ? "Sandbox recipient checked"
                        : "Unconfirmed sandbox recipient"
                    }
                    role="img"
                  >
                    <title>
                      {config?.recipientVerified
                        ? "Sandbox recipient checked"
                        : "Unconfirmed sandbox recipient"}
                    </title>
                  </ShieldCheck>
                </div>

                <div className="pay-amount">
                  <span>Recipient gets</span>
                  <strong>{amountLabel}</strong>
                </div>
                {!ready && (
                  <p className="fx-error" role="status">
                    {quoteExpired
                      ? "Quote expired. Refresh the comparison, or reset an active payment before refreshing."
                      : "Confirm the sandbox recipient above before preparing a payment."}
                  </p>
                )}
                <div className="payment-review-details">
                  <dl className="pay-details">
                    <div>
                      <dt>
                        <WalletCards size={16} />
                        You pay
                      </dt>
                      <dd>
                        {route
                          ? formatCurrency(
                              route.totalMinor / 100,
                              activeProposal?.sourceCurrency ??
                                route.sourceCurrency ??
                                "USD",
                              2,
                            )
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <ReceiptText size={16} />
                        Fee included <InfoHelp term="Fees" />
                      </dt>
                      <dd>
                        {route
                          ? formatCurrency(
                              route.fee,
                              activeProposal?.sourceCurrency ??
                                route.sourceCurrency ??
                                "USD",
                              2,
                            )
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <Activity size={16} />
                        Rate <InfoHelp term="Exchange rate" />
                      </dt>
                      <dd>
                        {route
                          ? `${route.fxRate} ${activeProposal?.targetCurrency ?? currency} / ${activeProposal?.sourceCurrency ?? route.sourceCurrency ?? "USD"}`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <Clock3 size={16} />
                        Arrival <InfoHelp term="Arrival estimate" />
                      </dt>
                      <dd>{route?.delivery ?? "—"}</dd>
                    </div>
                  </dl>
                </div>
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Sponsors({
  connected,
  announce,
  requests = [],
  onRequest,
  storedSponsors,
  config,
  onPermission,
}: {
  onPermission?: (
    sponsorKey: string,
    permission: string,
    enabled: boolean,
  ) => Promise<boolean>;
  announce: (s: string) => void;
  requests?: DatabaseState["sponsorRequests"];
  onRequest: (request: {
    sponsorKey: string;
    amount: number;
    purpose: string;
    neededBy: string;
  }) => Promise<boolean>;
  connected?: boolean;
  storedSponsors?: DatabaseState["sponsors"];
  config?: any;
}) {
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();

  const [requestFor, setRequestFor] = useState<{
    key: string;
    name: string;
  } | null>(null);
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [sending, setSending] = useState(false);
  const requestAction = (person: { key: string; name: string }) => (
    <Button
      variant="outline"
      aria-label={`Request contribution from ${person.name}`}
      disabled={sending}
      aria-expanded={requestFor?.key === person.key}
      onClick={() => {
        if (requestFor?.key === person.key) {
          setRequestFor(null);
          return;
        }
        setAmount("");
        setPurpose("");
        setNeededBy("");
        setRequestFor(person);
      }}
    >
      <Send size={16} /> Request contribution
    </Button>
  );
  const requestDetails = (person: { key: string; name: string }) => {
    const history = requests
      .filter((request) => request.sponsorKey === person.key)
      .slice()
      .reverse();
    return (
      <div className="sponsor-profile-details">
        {requestFor?.key === person.key && (
          <section className="sponsor-reference-panel">
            <form
              className="sponsor-profile-request"
              onSubmit={async (event) => {
                event.preventDefault();
                if (sending) return;
                setSending(true);
                try {
                  const saved = await onRequest({
                    sponsorKey: requestFor.key,
                    amount: Number(amount),
                    purpose: purpose.trim(),
                    neededBy,
                  });
                  if (saved) {
                    announce(`Contribution request sent to ${requestFor.name}`);
                    setRequestFor(null);
                  } else announce("Could not send contribution request");
                } catch {
                  announce("Could not send contribution request");
                } finally {
                  setSending(false);
                }
              }}
            >
              <h3>Request a contribution from {requestFor.name}</h3>
              <p>
                The request shares its purpose and amount, but no private
                account activity.
              </p>
              <label>
                Amount ({currency})
                <Input
                  money
                  min="0.01"
                  max="1000000"
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={sending}
                />
              </label>
              <label>
                Purpose
                <Input
                  required
                  maxLength={500}
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  disabled={sending}
                />
              </label>
              <label>
                Needed by
                <Input
                  type="date"
                  value={neededBy}
                  onChange={(event) => setNeededBy(event.target.value)}
                  disabled={sending}
                />
              </label>
              <div>
                <Button type="submit" disabled={sending || !purpose.trim()}>
                  <Send size={16} />
                  {sending ? "Sending…" : "Send request"}
                </Button>{" "}
                <Button
                  type="button"
                  variant="outline"
                  disabled={sending}
                  onClick={() => setRequestFor(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </section>
        )}
        {history.length > 0 && (
          <details className="sponsor-profile-history">
            <summary>
              Contribution requests <span>{history.length}</span>
            </summary>
            {history.map((request) => (
              <article key={request._id} className="sponsor-request-history">
                <div className="sponsor-request-heading">
                  <strong>{request.purpose}</strong>
                  <strong>{formatMoney(request.amount)}</strong>
                </div>
                <div className="sponsor-request-meta">
                  <span>
                    {request.status === "sent" ? "Request sent" : "Received"}
                  </span>
                  {request.neededBy && (
                    <span>Needed by {request.neededBy}</span>
                  )}
                </div>
              </article>
            ))}
          </details>
        )}
      </div>
    );
  };
  const [tab, setTab] = useState<"Sponsors" | "Privacy">("Sponsors");
  const visibleSponsors =
    storedSponsors ?? sponsors.map((s) => ({ ...s, key: s.id }));
  const sponsor = visibleSponsors[0];
  const transferred = config?.transferred ?? 0;
  const schedule = config?.schedule ?? [
    ["15 Nov 2026", "Living expenses", convertMoney(1000, "GBP", currency)],
    ["15 Jan 2027", "Tuition instalment", convertMoney(2000, "GBP", currency)],
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
          {(["Sponsors", "Privacy"] as const).map((item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
              role="tab"
              id={`sponsor-tab-${item}`}
              aria-controls={`sponsor-panel-${item}`}
              tabIndex={tab === item ? 0 : -1}
              onKeyDown={(event) => {
                const views = ["Sponsors", "Privacy"] as const;
                const index = views.indexOf(item);
                const next =
                  event.key === "ArrowRight"
                    ? views[(index + 1) % views.length]
                    : event.key === "ArrowLeft"
                      ? views[(index + views.length - 1) % views.length]
                      : event.key === "Home"
                        ? views[0]
                        : event.key === "End"
                          ? views[views.length - 1]
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

      {tab === "Sponsors" && connected && (
        <SponsorConnect
          role="Student"
          renderSponsorAction={requestAction}
          renderSponsorDetails={requestDetails}
        />
      )}

      {tab === "Sponsors" &&
        !connected &&
        visibleSponsors.map((sponsor) => (
          <div
            key={sponsor.key}
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
                  {requestAction(sponsor)}
                </div>
              </div>
              <div className="sponsor-reference-commitment">
                <div className="commitment-total">
                  <span>Annual commitment</span>
                  <strong>{formatMoney(sponsor.commitment)}</strong>
                </div>
                <div className="commitment-row received">
                  <span>Received</span>
                  <strong>{formatMoney(transferred)}</strong>
                </div>
                <div className="commitment-row remaining">
                  <span>Remaining</span>
                  <strong>
                    {formatMoney(Math.max(0, sponsor.commitment - transferred))}
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
                  <span>{formatMoney(Number(item[2]))}</span>
                  {hasScheduleStatus && <em>{item[3] ?? "—"}</em>}
                </div>
              ))}
            </section>
            {requestDetails(sponsor)}
          </div>
        ))}

      {tab === "Sponsors" && !sponsor && !connected && (
        <section
          role="tabpanel"
          id="sponsor-panel-Sponsors"
          aria-labelledby="sponsor-tab-Sponsors"
        >
          <p>No sponsors connected yet.</p>
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
          <h3>Sharing with your sponsors</h3>
          <p>
            Choose what each sponsor can see. Financial overview shares
            aggregate planned and paid costs. Wallet balances stay private.
          </p>
          <div className="sponsor-privacy-grid">
            {visibleSponsors.map((sponsor) => (
              <section
                className="sponsor-privacy-card"
                key={sponsor.key}
                aria-label={`Sharing settings for ${sponsor.name}`}
              >
                <div className="sponsor-privacy-identity">
                  <span className="sponsor-privacy-avatar" aria-hidden="true">
                    {sponsor.name
                      .split(" ")
                      .filter(Boolean)
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div>
                    <h4>{sponsor.name}</h4>
                    <span>{sponsor.relationship}</span>
                  </div>
                </div>
                {[
                  "Commitment status",
                  "Sponsored tuition",
                  "Funding requests",
                  "Financial overview",
                ].map((permission) => (
                  <label className="sponsor-permission" key={permission}>
                    <Checkbox
                      checked={sponsor.permissions.includes(permission)}
                      disabled={!onPermission}
                      onCheckedChange={async (enabled) => {
                        const saved = await onPermission?.(
                          sponsor.key,
                          permission,
                          enabled === true,
                        );
                        announce(
                          saved
                            ? "Sharing preference saved"
                            : "Could not save sharing preference",
                        );
                      }}
                    />
                    {permission}
                  </label>
                ))}
              </section>
            ))}
          </div>
          {visibleSponsors.length === 0 && (
            <p>
              No sponsors connected yet. Add a sponsor in the Sponsors tab to
              manage their access.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
export function Wallet({
  storedWallets,
  go,
}: {
  storedWallets?: DatabaseState["wallets"];
  go: (page: Page) => void;
}) {
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();

  const [detailsOpen, setDetailsOpen] = useState(false);
  const visibleWallets = storedWallets ?? wallets;
  const totalValue = visibleWallets.reduce(
    (sum, wallet) => sum + walletValue(wallet, currency),
    0,
  );
  const usdBalance = visibleWallets
    .filter((wallet) => wallet.currency === "USD")
    .reduce((sum, wallet) => sum + walletValue(wallet, currency), 0);
  return (
    <div className="page-stack balance-workspace">
      <section className="page-intro">
        <h2>Your balances</h2>
        <button className="primary" onClick={() => go("Exchange")}>
          <CircleDollarSign size={16} /> Convert currency
        </button>
      </section>
      <section className="balance-total">
        <span>Total in {currency}</span>
        <strong>{formatMoney(totalValue)}</strong>
        <small>Converted values use demo rates.</small>
      </section>
      <section className="balance-accounts" aria-label="Currency accounts">
        <div className="balance-table-head">
          <span>Account</span>
          <span>Balance</span>
          <span>{currency} equivalent</span>
        </div>
        {visibleWallets.map((wallet) => (
          <div className="balance-account-row" key={wallet.currency}>
            <div>
              <strong>{wallet.currency}</strong>
              <span>{wallet.label}</span>
            </div>
            <strong>{formatCurrency(wallet.amount, wallet.currency, 2)}</strong>
            <span>
              {formatMoney(walletValue(wallet, currency))}
              <small className="balance-rate">
                {wallet.amount > 0
                  ? `1 ${wallet.currency} ≈ ${(walletValue(wallet, currency) / wallet.amount).toFixed(4)} ${currency}`
                  : "Rate unavailable"}{" "}
                <InfoHelp term="Balance valuation" />
              </small>
            </span>
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
            A 5% fall in USD against {currency} would reduce the value of your
            current USD balance by approximately{" "}
            {formatMoney(usdBalance * 0.05)}.
          </p>
        </section>
      )}
    </div>
  );
}
export function Security({
  audit,
  config,
  receipts,
}: {
  audit: AuditEvent[];
  config?: any;
  receipts?: import("react").ReactNode;
}) {
  const formatMoney = useWorkspaceMoney();
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
  const visibleAudit = activityOpen ? audit : audit.slice(0, 3);
  const activityNames: Record<string, string> = {
    PROFILE_UPDATED: "Profile updated",
    PLAN_CREATED: "Study plan created",
    AI_CONSENT: "AI access changed",
    AGENT_TOOL: "AI assistant used",
    PAYMENT_DETAILS_UPDATED: "Payment details updated",
    PAYMENT_RESET: "Payment restarted",
    RECIPIENT_VERIFIED: "University account checked",
    SANDBOX_INITIALIZED: "Demo payment set up",
    SANDBOX_QUOTES_REFRESHED: "Payment options refreshed",
    SPONSOR_ACCEPTED: "Sponsor connected",
    SPONSOR_PERMISSION: "Sponsor sharing updated",
    SPONSOR_REQUESTED: "Support requested",
    TUITION_PLAN_UPDATED: "Tuition plan updated",
    PAYMENT_COMPLETED: "Demo payment completed",
    PAYMENT_APPROVED: "Payment approved",
    PAYMENT_PREPARED: "Payment prepared",
    PROPOSAL_CREATED: "Payment prepared",
    PROPOSAL_APPROVED: "Payment approved",
  };
  return (
    <div id="security-center" className="page-stack security-workspace">
      <section className="page-intro">
        <h2>
          <ShieldCheck size={24} aria-hidden="true" />
          Security
        </h2>
        <div className="security-heading-actions">
          <SectionHelp section="Security" />
        </div>
      </section>
      <section
        className="security-safeguards"
        aria-labelledby="security-safeguards-title"
      >
        <h3 id="security-safeguards-title">Payment safeguards</h3>
        <div className="security-safeguard-row">
          <LockKeyhole size={19} aria-hidden="true" />
          <div>
            <strong>You approve payments</strong>
            <p>
              {config?.approvalRequired == null
                ? "Payment approval settings are not available yet."
                : config.approvalRequired
                  ? "Each payment needs your approval before it can be sent."
                  : "Approval is currently turned off for demo payments."}
            </p>
          </div>
        </div>
        <div className="security-safeguard-row">
          <CircleDollarSign size={19} aria-hidden="true" />
          <div>
            <strong>Maximum per payment</strong>
            <p>
              {config?.paymentLimit == null
                ? "Payment limit settings are not available yet."
                : `You can send up to ${formatMoney(config.paymentLimit)} in a single demo payment.`}
            </p>
          </div>
        </div>
        <div className="security-safeguard-row">
          <Clock3 size={19} aria-hidden="true" />
          <div>
            <strong>Time to send after approval</strong>
            <p>
              {config?.approvalExpiryMinutes == null
                ? "Approval time settings are not available yet."
                : `Send within ${config.approvalExpiryMinutes} minutes of approving. After that, you’ll need to approve again.`}
            </p>
          </div>
        </div>
      </section>
      <section className="security-activity">
        <div className="security-section-heading">
          <h3>Recent activity</h3>
          {audit.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportAudit}>
              <Download size={15} aria-hidden="true" />
              Download history
            </Button>
          )}
        </div>
        {visibleAudit.length ? (
          <div
            className="security-event-list"
            role="region"
            aria-label="Recent activity"
          >
            {visibleAudit.map((a) => (
              <div className="security-event" key={a.id}>
                <span className="security-event-icon">
                  <History size={16} aria-hidden="true" />
                </span>
                <div className="security-event-copy">
                  <strong>
                    {activityNames[a.type] ??
                      (/PAYMENT|PROPOSAL/.test(a.type)
                        ? "Payment updated"
                        : /SPONSOR/.test(a.type)
                          ? "Sponsor details updated"
                          : /AI|TOOL/.test(a.type)
                            ? "AI assistant activity"
                            : "Account updated")}
                  </strong>
                  <details className="security-activity-details">
                    <summary>View details</summary>
                    <p>{a.detail}</p>
                    <p>By {a.actor}</p>
                  </details>
                </div>
                <div className="security-event-meta">
                  <span>{a.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="security-empty">
            No activity yet. Updates to your account will appear here.
          </p>
        )}
        {audit.length > 3 && (
          <Button
            variant="ghost"
            className="security-show-all"
            aria-expanded={activityOpen}
            onClick={() => setActivityOpen((open) => !open)}
          >
            {activityOpen ? "Show less" : "Show all activity"}
            <ChevronRight size={15} aria-hidden="true" />
          </Button>
        )}
      </section>
      {receipts && (
        <details className="security-receipts security-payment-history">
          <summary>
            <span>Payment history</span>
            <ChevronRight size={18} aria-hidden="true" />
          </summary>
          <p className="security-history-note">
            Check university account details and review your demo payments.
          </p>
          {receipts}
        </details>
      )}
    </div>
  );
}

export default App;
