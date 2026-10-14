import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CreditCard,
  CircleDollarSign,
  WalletCards,
  LayoutDashboard,
  Route,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import type { Page } from "../types/database";

type Variation = 1 | 2 | 3 | 4 | 5;
export type TourStep = {
  page: Page;
  target: string;
  title: string;
  body: string;
  tip?: string;
};
const defaultSteps: TourStep[] = [
  {
    page: "Dashboard",
    target: ".funding-overview",
    title: "Your move at a glance",
    body: "Track your budget, funding gap and upcoming tuition.",
  },
  {
    page: "Move Planner",
    target: ".move-plan-settings",
    title: "Build your budget",
    body: "Pick university estimates, then adjust travel and living costs.",
  },
  {
    page: "Move Planner",
    target: ".planner-save-bar",
    title: "Keep your plan",
    body: "Save your budget to update your dashboard and funding gap.",
  },
  {
    page: "Profile",
    target: "#profile-workspace .profile-hero",
    title: "Keep details current",
    body: "Edit your studies, funding and country accounts here.",
  },
  {
    page: "Payments",
    target: ".payment-comparison-bar",
    title: "Compare tuition costs",
    body: "Defaults are ready. Change currencies or amount, then compare.",
    tip: "Quotes include fees. Payments are simulated.",
  },
  {
    page: "Wallet",
    target: ".balance-accounts",
    title: "See your balances",
    body: "View each currency account and its value in your study currency.",
  },
  {
    page: "Exchange",
    target: ".fx-converter-panel",
    title: "Check exchange costs",
    body: "Estimate conversions and set rate alerts before transferring.",
  },
  {
    page: "Sponsors",
    target: ".sponsor-reference-page",
    title: "Plan support together",
    body: "Track sponsor support and choose what each sponsor can see.",
  },
  {
    page: "AI Agent",
    target: ".assistant-welcome, .assistant-composer",
    title: "Ask about your plan",
    body: "Try “How much can I spend each month?”",
    tip: "AI privacy controls access. You approve any proposed changes.",
  },
  {
    page: "Security",
    target: ".security-safeguards, .security-workspace",
    title: "You stay in control",
    body: "Manage payment limits, approvals and account activity.",
    tip: "Replay anytime from Home’s help menu.",
  },
];
const icons = {
  Dashboard: LayoutDashboard,
  Profile: UserRound,
  "Move Planner": Route,
  "AI Agent": Bot,
  Payments: CreditCard,
  Exchange: CircleDollarSign,
  Sponsors: UsersRound,
  Wallet: WalletCards,
  Security: ShieldCheck,
};

export function Tour({
  page,
  variation,
  go,
  chooseVariation,
  close,
  steps = defaultSteps,
  onStep,
  onFinish,
  finishLabel = "Start planning",
}: {
  page: Page;
  variation: Variation;
  go: (page: Page) => void;
  chooseVariation: (value: Variation) => void;
  close: () => void;
  steps?: TourStep[];
  onStep?: (index: number) => void;
  onFinish?: () => void;
  finishLabel?: string;
}) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const startingPage = useRef(page);
  const startingVariation = useRef(variation);
  const originalFocus = useRef(document.activeElement);
  const current = steps[step];
  const Icon = icons[current.page];

  useEffect(() => {
    onStep?.(step);
    if (page !== current.page) go(current.page);
    if (current.page === "Dashboard" && variation !== 1) chooseVariation(1);
  }, [step]);

  useEffect(() => {
    title.current?.focus({ preventScroll: true });
    if (page !== current.page) {
      setRect(null);
      return;
    }
    let found: Element | null = null;
    let frame = 0;
    const update = () => {
      // Transforms during page transitions move the target without resizing it.
      // Keep measuring while the tour is open, including late-mounted targets.
      frame = requestAnimationFrame(update);
      const element = document.querySelector(current.target);
      if (!element) return setRect(null);
      if (element !== found) {
        found = element;
        element.scrollIntoView({ behavior: "instant", block: "center" });
      }
      const next = element.getBoundingClientRect();
      setRect((previous) =>
        previous &&
        previous.x === next.x &&
        previous.y === next.y &&
        previous.width === next.width &&
        previous.height === next.height
          ? previous
          : next,
      );
    };
    frame = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [step, page, current.target]);

  const move = (next: number) => {
    if (next < 0 || next >= steps.length) return;
    setRect(null);
    setStep(next);
  };
  const exit = (finish: boolean) => {
    close();
    if (startingVariation.current !== variation)
      chooseVariation(startingVariation.current);
    if (finish && onFinish) onFinish();
    else go(finish ? "Move Planner" : startingPage.current);
    requestAnimationFrame(() => {
      if (
        originalFocus.current instanceof HTMLElement &&
        originalFocus.current.isConnected
      )
        originalFocus.current.focus({ preventScroll: true });
    });
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        exit(false);
        return;
      }
      if (
        event.target instanceof HTMLElement &&
        (event.target.matches("input, textarea, select, [role=combobox]") ||
          event.target.isContentEditable)
      )
        return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        step === steps.length - 1 ? exit(true) : move(step + 1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(step - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const cardStyle = (() => {
    if (!rect) return undefined;
    const gap = 16;
    const mobile = innerWidth <= 800;
    const width = mobile ? innerWidth - 32 : 360;
    const height = card.current?.offsetHeight ?? 240;
    const bottom = innerHeight - height - (mobile ? 100 : gap);
    const candidates = [
      { left: gap, top: gap },
      { left: innerWidth - width - gap, top: gap },
      { left: gap, top: Math.max(gap, bottom) },
      { left: innerWidth - width - gap, top: Math.max(gap, bottom) },
    ];
    const overlap = (pos: { left: number; top: number }) =>
      Math.max(
        0,
        Math.min(pos.left + width, rect.right + 8) -
          Math.max(pos.left, rect.left - 8),
      ) *
      Math.max(
        0,
        Math.min(pos.top + height, rect.bottom + 8) -
          Math.max(pos.top, rect.top - 8),
      );
    // Prefer the bottom corner when it leaves the highlighted control visible.
    candidates.reverse();
    candidates.sort((a, b) => overlap(a) - overlap(b));
    return { ...candidates[0], right: "auto", bottom: "auto", width };
  })();
  const focusTop = rect ? Math.max(8, rect.top - 5) : 0;
  const focusLeft = rect ? Math.max(8, rect.left - 5) : 0;
  const focusRight = rect ? Math.min(innerWidth - 8, rect.right + 5) : 0;
  const focusBottom = rect
    ? Math.min(innerHeight - (innerWidth <= 800 ? 88 : 8), rect.bottom + 5)
    : 0;

  return createPortal(
    <div className="guide-layer">
      {rect && focusBottom > focusTop && focusRight > focusLeft && (
        <div
          className="guide-focus"
          aria-hidden="true"
          style={{
            left: focusLeft,
            top: focusTop,
            width: focusRight - focusLeft,
            height: focusBottom - focusTop,
          }}
        />
      )}
      <div
        ref={card}
        className="guide-card"
        style={cardStyle}
        role="dialog"
        aria-labelledby="guide-title"
        aria-describedby="guide-description"
      >
        <div
          className="guide-progress"
          aria-label={`Step ${step + 1} of ${steps.length}`}
        >
          <i style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        <div className="guide-meta">
          <span>{step === 0 ? "Welcome to MoveWire" : current.page}</span>
          <span>
            {step + 1} of {steps.length}
          </span>
          <button
            aria-label="Close tour"
            title="Close tour"
            onClick={() => exit(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="guide-header">
          <span className="guide-icon">
            <Icon size={22} aria-hidden="true" />
          </span>
          <h2 ref={title} tabIndex={-1} id="guide-title">
            {current.title}
          </h2>
        </div>
        <p id="guide-description">{current.body}</p>
        {current.tip && <p className="guide-tip">{current.tip}</p>}
        <div className="guide-footer">
          <button className="guide-skip" onClick={() => exit(false)}>
            Skip tour
          </button>
          <Button
            variant="ghost"
            size="icon"
            disabled={step === 0}
            aria-label="Previous step"
            onClick={() => move(step - 1)}
          >
            <ArrowLeft size={17} />
          </Button>
          <Button
            size="sm"
            onClick={() =>
              step === steps.length - 1 ? exit(true) : move(step + 1)
            }
          >
            {step === steps.length - 1 ? finishLabel : "Next"}
            {step === steps.length - 1 ? (
              <Check size={16} />
            ) : (
              <ArrowRight size={16} />
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
