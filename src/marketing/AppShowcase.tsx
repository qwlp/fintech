import { Slider } from "../components/ui/slider";
import BudgetDonut, {
  planChartColors,
  FundingSourcesChart,
} from "../components/BudgetDonut";
import Brand from "../components/Brand";
import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
  useReducedMotion,
} from "motion/react";
import {
  ArrowRight,
  Check,
  CreditCard,
  GraduationCap,
  HeartHandshake,
  Landmark,
} from "lucide-react";
import { formatGBP } from "../lib/finance";
import "../styles/showcase.css";
function AnimatedAmount({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const amount = useMotionValue(value);
  const formatted = useTransform(amount, (n) => formatGBP(Math.round(n)));
  useEffect(() => {
    if (reduced) {
      amount.set(value);
      return;
    }
    const animation = animate(amount, value, {
      duration: 0.85,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => animation.stop();
  }, [value, reduced, amount]);
  return <motion.span>{formatted}</motion.span>;
}
const views = ["Study budget", "Sponsors", "Payments"];
export default function AppShowcase({
  compact = false,
}: {
  compact?: boolean;
}) {
  const reduced = useReducedMotion();
  const [view, setView] = useState(0);
  const [playing, setPlaying] = useState(!reduced);
  const [supported, setSupported] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const [visible, setVisible] = useState(false);
  const [living, setLiving] = useState(350);
  const [phase, setPhase] = useState(0);
  const total = 6000 + 7800 + living * 12;
  const funded = supported ? 14000 : 12000;
  const elapsed = useRef(0);
  const actionsShown = useRef(false);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.2 },
    );
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    elapsed.current = 0;
    actionsShown.current = false;
    setPhase(0);
  }, [view]);
  useEffect(() => {
    if (!playing || !visible) return;
    let previous = performance.now();
    let phaseStep = 0;
    let costAnimation: ReturnType<typeof animate> | undefined;
    const timer = setInterval(() => {
      const now = performance.now();
      const delta = now - previous;
      previous = now;
      if (document.hidden) return;
      elapsed.current += delta;
      if (view === 0 && elapsed.current > 1400 && phaseStep === 0) {
        phaseStep = 1;
        setPhase(1);
        costAnimation = animate(350, 500, {
          duration: 1.1,
          onUpdate: (value) => setLiving(Math.round(value / 25) * 25),
        });
      }
      if (view === 0 && elapsed.current > 4200 && phaseStep === 1) {
        phaseStep = 2;
        setPhase(2);
        costAnimation = animate(500, 350, {
          duration: 1,
          onUpdate: (value) => setLiving(Math.round(value / 25) * 25),
        });
      }
      if (view === 2 && elapsed.current > 1000 && phaseStep === 0) {
        phaseStep = 1;
        setPhase(1);
      }
      if (elapsed.current > 2400 && !actionsShown.current) {
        actionsShown.current = true;
        if (view === 1) {
          setSupported(true);
          setPhase(2);
        }
        if (view === 2) {
          setPrepared(true);
          setPhase(2);
        }
      }
      if (elapsed.current >= 6500) {
        elapsed.current = 0;
        if (view === 2) {
          setSupported(false);
          setPrepared(false);
        }
        setView((v) => (v + 1) % 3);
      }
    }, 50);
    return () => {
      clearInterval(timer);
      costAnimation?.stop();
    };
  }, [playing, visible, view]);
  useEffect(() => {
    if (playing || reduced) return;
    const resume = setTimeout(() => setPlaying(true), 12000);
    return () => clearTimeout(resume);
  }, [playing, reduced, view, living, supported, prepared]);
  const select = (index: number) => {
    setView(index);
    setPlaying(false);
  };
  return (
    <div
      ref={host}
      className={`app-showcase ${compact ? "showcase-compact" : ""}`}
    >
      <div className="demo-window">
        <aside className="demo-sidebar">
          <Brand />
          {[GraduationCap, HeartHandshake, CreditCard].map((Icon, i) => (
            <button
              type="button"
              key={views[i]}
              aria-label={views[i]}
              aria-pressed={view === i}
              onClick={() => select(i)}
            >
              <Icon size={18} />
              <span>{["Move Planner", "Sponsors", "Payments"][i]}</span>
            </button>
          ))}
        </aside>
        <div className="demo-main">
          <header className="demo-header">
            <Brand className="demo-mobile-brand" />
            <strong>My study plan</strong>
            <span>Sample data</span>
          </header>
          <div
            className="demo-tabs"
            role="tablist"
            aria-label="Preview screens"
          >
            {views.map((label, i) => (
              <button
                type="button"
                key={label}
                id={`demo-tab-${compact ? "small" : "full"}-${i}`}
                role="tab"
                aria-controls={`demo-panel-${compact ? "small" : "full"}`}
                aria-selected={view === i}
                onClick={() => select(i)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const next = (i + (e.key === "ArrowRight" ? 1 : 2)) % 3;
                    select(next);
                    (
                      e.currentTarget.parentElement?.children[
                        next
                      ] as HTMLElement
                    )?.focus();
                  }
                }}
              >
                {label}
                {view === i && (
                  <motion.span
                    className="demo-tab-line"
                    layoutId={`demo-line-${compact}`}
                    transition={{ duration: reduced ? 0 : 0.25 }}
                  />
                )}
              </button>
            ))}
          </div>
          <div
            id={`demo-panel-${compact ? "small" : "full"}`}
            role="tabpanel"
            aria-labelledby={`demo-tab-${compact ? "small" : "full"}-${view}`}
            className="demo-content"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view}
                initial={reduced ? false : { opacity: 0, x: 24, scale: 0.985 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{
                  pointerEvents: "none",
                  opacity: 0,
                  x: reduced ? 0 : -14,
                  scale: reduced ? 1 : 0.985,
                }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                {view === 0 ? (
                  <>
                    <div className="demo-title">
                      <h3>Your study year</h3>
                      <span>
                        {playing && phase === 1 ? "Adjusting costs" : "GBP"}
                      </span>
                    </div>
                    <div className="demo-metrics">
                      <div>
                        <span>Estimated costs</span>
                        <strong>
                          <AnimatedAmount value={total} />
                        </strong>
                      </div>
                      <div>
                        <span>Confirmed funding</span>
                        <strong>
                          <AnimatedAmount value={supported ? 14000 : 12000} />
                        </strong>
                      </div>
                    </div>
                    <div
                      className="demo-chart-layout"
                      aria-label={`Cost breakdown: tuition £6,000, rent £7,800, living ${formatGBP(living * 12)}`}
                    >
                      <div className="demo-donut">
                        <BudgetDonut
                          animated
                          costs={[
                            { name: "Tuition", amount: 6000 },
                            { name: "Rent", amount: 7800 },
                            { name: "Living", amount: living * 12 },
                          ]}
                        />
                        <div className="demo-donut-center">
                          <span>Total budget</span>
                          <strong>{formatGBP(total)}</strong>
                        </div>
                      </div>
                      <div className="demo-chart-legend">
                        {[
                          { name: "Tuition", amount: 6000 },
                          { name: "Rent", amount: 7800 },
                          { name: "Living", amount: living * 12 },
                        ].map((item, i) => (
                          <div key={item.name}>
                            <i style={{ background: planChartColors[i] }} />
                            <span>
                              {item.name}
                              <small>
                                {Math.round((item.amount / total) * 100)}% of
                                budget
                              </small>
                            </span>
                            <strong>{formatGBP(item.amount)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="demo-funding-coverage">
                      <span>{Math.round((funded / total) * 100)}% funded</span>
                      <div
                        role="progressbar"
                        aria-label="Sample study plan funded"
                        aria-valuenow={Math.round((funded / total) * 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <motion.i
                          initial={reduced ? false : { scaleX: 0 }}
                          animate={{ scaleX: Math.min(1, funded / total) }}
                          transition={{ duration: reduced ? 0 : 0.85 }}
                        />
                      </div>
                    </div>
                    <label
                      className={`demo-living-control ${playing && view === 0 && phase === 1 ? "is-demonstrating" : ""}`}
                    >
                      <span>
                        Monthly living <strong>{formatGBP(living)}</strong>
                      </span>
                      <Slider
                        aria-label="Sample monthly living costs"
                        min={250}
                        max={1000}
                        step={25}
                        value={[living]}
                        onValueChange={([value]) => {
                          setLiving(value);
                          setPlaying(false);
                        }}
                      />
                    </label>
                    <div className="demo-bottom">
                      <span>Still to fund</span>
                      <strong>
                        <AnimatedAmount value={Math.max(0, total - funded)} />
                      </strong>
                      <button
                        type="button"
                        className="demo-next-action"
                        aria-label="Explore sponsor support"
                        onClick={() => select(1)}
                      >
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </>
                ) : view === 1 ? (
                  <>
                    <div className="demo-title">
                      <h3>A shared study plan</h3>
                      <HeartHandshake size={22} />
                    </div>
                    <div className="demo-support">
                      <span className="demo-avatar">S</span>
                      <div>
                        <strong>Sample sponsor</strong>
                        <span>Tuition contribution</span>
                      </div>
                      <strong>£2,000</strong>
                    </div>
                    <div className="demo-contribution">
                      <span>
                        {supported
                          ? "Included in your sample budget"
                          : "Add support to your study budget"}
                      </span>
                      <motion.strong
                        animate={{
                          scale: supported && !reduced ? [1, 1.045, 1] : 1,
                        }}
                        transition={{ duration: 0.6 }}
                      >
                        <AnimatedAmount value={supported ? 14000 : 12000} />
                      </motion.strong>
                      <span>Total sample funding</span>
                    </div>
                    <div
                      className="demo-source-chart"
                      role="img"
                      aria-label={`Sample funding sources: savings £12,000, sponsor ${supported ? "£2,000" : "£0"}`}
                    >
                      <FundingSourcesChart
                        animated
                        compact
                        data={[
                          {
                            name: "Savings",
                            amount: 12000,
                            color: planChartColors[0],
                          },
                          {
                            name: "Sponsor",
                            amount: supported ? 2000 : 0,
                            color: planChartColors[1],
                          },
                        ]}
                      />
                    </div>
                    <button
                      type="button"
                      className="demo-action"
                      disabled={supported}
                      onClick={() => {
                        setSupported(true);
                        setPlaying(false);
                      }}
                    >
                      {supported ? (
                        <>
                          <Check size={17} /> Contribution added
                        </>
                      ) : (
                        <>
                          Add sample contribution <ArrowRight size={17} />
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="demo-title">
                      <h3>Your next tuition payment</h3>
                      <CreditCard size={22} />
                    </div>
                    <div className="demo-payment">
                      <span>Tuition instalment</span>
                      <strong>£2,000</strong>
                      <span>Sample university · GBP</span>
                    </div>
                    <div className="demo-payment-steps">
                      {[
                        "Review amount",
                        "Prepare payment",
                        "Ready to review",
                      ].map((label, i) => (
                        <motion.div
                          key={label}
                          initial={reduced ? false : { opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: reduced ? 0 : i * 0.15 }}
                        >
                          <motion.span
                            animate={{
                              scale: !reduced && phase === i ? [1, 1.15, 1] : 1,
                              backgroundColor:
                                prepared || i < phase ? "#315c85" : "#dee5ed",
                              color: prepared || i < phase ? "#fff" : "#364b63",
                            }}
                            transition={{ duration: 0.45 }}
                          >
                            {prepared || i < phase ? (
                              <Check size={12} />
                            ) : (
                              i + 1
                            )}
                          </motion.span>
                          {label}
                        </motion.div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="demo-action"
                      disabled={prepared}
                      onClick={() => {
                        setPrepared(true);
                        setPlaying(false);
                      }}
                    >
                      {prepared ? (
                        <>
                          <Check size={17} /> Sample payment prepared
                        </>
                      ) : (
                        <>
                          Prepare sample payment <ArrowRight size={17} />
                        </>
                      )}
                    </button>
                    <p className="demo-note">Preview only. No money is sent.</p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
