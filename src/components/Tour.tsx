import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Bot,
  Check,
  CreditCard,
  Home,
  LayoutDashboard,
  Route,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import type { Page } from "../types/database";

type Variation = 1 | 2 | 3 | 4 | 5;

export function Tour({
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
    Exchange: Home,
    Sponsors: UsersRound,
    Wallet: Home,
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
