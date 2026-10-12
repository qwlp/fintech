import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Bell,
  Bot,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  Moon,
  Route,
  Settings,
  ShieldCheck,
  Sun,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { WorkspaceCurrencyProvider } from "./components/WorkspaceCurrency";
import { Button } from "./components/ui/button";
import Brand from "./components/Brand";
import MobileNavigation from "./components/MobileNavigation";
import SectionHelp from "./components/SectionHelp";
import AgentTour from "./features/agent/AgentTour";
import MovePlanner from "./features/planner/MovePlanner";
import PaymentWorkspace from "./features/payments/PaymentWorkspace";
import PaymentEvidence from "./features/payments/PaymentEvidence";
import TuitionDecision from "./features/payments/TuitionDecision";
import FundingConfirmation from "./features/payments/FundingConfirmation";
import { Assistant, ChatHistory } from "./features/agent/Chat";
import { Dashboard, ExchangeWorkspace } from "./pages/Dashboard";
import { Profile } from "./pages/Profile";
import { Payments } from "./pages/Payments";
import { Sponsors } from "./pages/Sponsors";
import { Wallet } from "./pages/Wallet";
import { Security } from "./pages/Security";
import { Tour } from "./components/Tour";
import { convexApi, convexClient } from "./lib/convex";
import { useBackgroundChat } from "./lib/use-background-chat";
import { comparisonRoute } from "../shared/payment-comparison";
import { convertMoney, convertMoneyText, formatCurrency } from "../shared/currency";
import { quoteFingerprint } from "../convex/tuitionDecision";
import {
  fundingCoverage,
  fundingGap,
  resolvePlanFunding,
  sumCosts,
} from "./lib/finance";
import { initialAudit, costs, funding } from "./lib/data";
import type { AuditEvent, PaymentStatus } from "./types/app";
import type { DatabaseState, Page } from "./types/database";
import type { Id } from "../convex/_generated/dataModel";
import "./styles/brief.css";
import "./styles/security.css";
import "./styles/profile.css";

type Variation = 1 | 2 | 3 | 4 | 5;

const nav: { page: Page; icon: typeof UserRound }[] = [
  { page: "Dashboard", icon: LayoutDashboard },
  { page: "Profile", icon: UserRound },
  { page: "Move Planner", icon: Route },
  { page: "AI Agent", icon: Bot },
  { page: "Payments", icon: CreditCard },
  { page: "Sponsors", icon: UsersRound },
  { page: "Security", icon: ShieldCheck },
];

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

  const [localPaymentStatus, setLocalPaymentStatus] = useState<PaymentStatus>("not_started");
  const [localAudit, setLocalAudit] = useState<AuditEvent[]>(initialAudit);
  const [database, setDatabase] = useState<DatabaseState | null>(null);
  const currency =
    database?.config?.profile?.workspaceCurrency ??
    database?.config?.profile?.fundingCurrency ??
    "GBP";
  const [syncState, setSyncState] = useState<"demo" | "connecting" | "synced" | "error">(
    convexClient ? "connecting" : "demo",
  );
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
    } catch {}
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
              .mutation(convexApi.ensureConfig, { accountId: state.account._id as any })
              .catch(() => setSyncState("error"));
          }
        }
      } catch {
        setSyncState("error");
      }
    };
    const unsubscribe = watch.onUpdate(update);
    update();
    return unsubscribe;
  }, []);

  const account = database?.account;
  useEffect(() => {
    if (!convexClient || !account || account.role !== "Student") return;
    void convexClient
      .mutation(convexApi.syncPaymentReminder, { accountId: account._id as any })
      .catch(() => {});
  }, [account?._id, database?.config?.banking?.tuitionDeadline, account?.paymentStatus]);

  const visibleCosts = database?.costs.map((item) => ({ ...item, id: item.key })) ?? costs;
  const visibleFunding = database?.funding.map((item) => ({ ...item, id: item.key })) ?? funding;
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
              database.paymentRoutes.find((r) => r.key === account.selectedRoute)!,
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
      addAudit("PAYMENT_PREPARED", convertMoneyText("£2,000 tuition payment prepared; no funds moved", "GBP", currency), "MoveWise");
    }
    announce("Payment prepared — approval is still required");
    return true;
  };

  const approve = async () => {
    if (account) {
      if (!(await transition("approved"))) return false;
    } else {
      setLocalPaymentStatus("approved");
      addAudit("PAYMENT_APPROVED", convertMoneyText("Explicit approval recorded for £2,000 tuition payment", "GBP", currency));
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
            timeout = setTimeout(() => reject(new Error("Send timed out")), 15000);
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
    const success = await mutate(convexApi.resetPayment, { accountId: account._id });
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
      ? mutate(convexApi.createSponsorRequest, { accountId: account._id, ...request })
      : Promise.resolve(false);

  const setSponsorPermission = (sponsorKey: string, permission: string, enabled: boolean) =>
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
    window.history.replaceState(null, "", `#${p.toLowerCase().replace(" ", "-")}`);
    window.scrollTo(0, 0);
  };

  if (!convexClient)
    return (
      <main className="connection-screen">
        <div className="card section-card">
          <h1>Database connection required</h1>
          <p>
            Set <code>VITE_CONVEX_URL</code> and run <code>bun run convex:dev</code>.
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
                      (item === "Payments" && ["Wallet", "Exchange"].includes(page))
                        ? "active"
                        : ""
                    }
                    aria-current={
                      page === item ||
                      (item === "Payments" && ["Wallet", "Exchange"].includes(page))
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
                      <small role="status" aria-label="AI agent working in background">
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
                onClick={() => setTheme((c) => (c === "dark" ? "light" : "dark"))}
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
                  {(database?.notifications.filter((n) => !n.read).length ?? 2) > 0 && (
                    <b>{database?.notifications.filter((n) => !n.read).length ?? 2}</b>
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
                    </div>,
                    document.body,
                  )}
              </div>
            </div>
            <button className="btn secondary" onClick={() => { location.hash = "setup"; }}>
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
                !["Payments", "Wallet", "Exchange", "Profile", "Security"].includes(page) && (
                  <div className="page-help-tools">
                    <SectionHelp key={page} section={page} />
                  </div>
                )}
              {page === "Dashboard" && (
                <Dashboard
                  paid={paid}
                  go={go}
                  variation={variation}
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
                  totals={{ funded: planFunded, gap: planGap, coverage: planCoverage }}
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
                    database?.costs?.find((cost) => cost.key === "tuition")?.amount ?? 0
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
                    onOpen={(id?: string) => {
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
                    onConsent={async (enabled: boolean) =>
                      account
                        ? mutate(convexApi.setAIConsent, { accountId: account._id, enabled })
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
                  sourceCurrency={database?.paymentRoutes?.[0]?.sourceCurrency ?? "USD"}
                  homeCountry={account?.countryFrom}
                  travelCountry={account?.countryTo}
                  help={
                    <div className="page-help-tools">
                      <SectionHelp key={page} section={page} />
                    </div>
                  }
                  initialView={
                    page === "Wallet" ? "balances" : page === "Exchange" ? "exchange" : "tuition"
                  }
                  balances={<Wallet storedWallets={database?.wallets} go={go} />}
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
                      <WorkspaceCurrencyProvider currency={comparison.targetCurrency}>
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
                            comparisonRoute(route, comparison.sourceCurrency, comparison.targetCurrency),
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
    </WorkspaceCurrencyProvider>
  );
}

export default App;
