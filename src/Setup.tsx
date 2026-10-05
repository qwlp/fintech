import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  GraduationCap,
  MapPin,
  Wallet,
  X,
} from "lucide-react";
import { useMutation } from "convex/react";
import type { Doc } from "../convex/_generated/dataModel";
import { convexApi } from "./lib/convex";
import Brand from "./Brand";
import SetupCountrySelect from "./SetupCountrySelect";
import { DatePicker } from "./components/ui/date-picker";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import "./setup.css";

export default function Setup({
  account,
  config,
  onDone,
  onSignOut,
}: {
  account: Doc<"accounts">;
  config?: {
    courseStart?: string;
    fundingAmount?: number;
    sponsorSupport?: string;
  };
  onDone: () => void;
  onSignOut: () => void;
}) {
  const sponsor = account.role === "Sponsor";
  const steps = sponsor
    ? ["About you", "Ready"]
    : ["Your move", "Your studies", "Your funding"];
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const startDate = config?.courseStart ? new Date(config.courseStart) : null;
  const startValue = /^\d{4}-\d{2}$/.test(config?.courseStart ?? "")
    ? `${config!.courseStart!}-01`
    : startDate && !Number.isNaN(startDate.getTime())
      ? `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`
      : "";
  const [values, setValues] = useState({
    name: account.name,
    countryFrom: account.countryFrom,
    countryTo: account.countryTo,
    university: account.university,
    course: account.course,
    courseStart: startValue,
    fundingAmount: String(config?.fundingAmount ?? 0),
    sponsorSupport: config?.sponsorSupport ?? "Not sure yet",
  });
  const save = useMutation(convexApi.completeSetup);
  const reduced = useReducedMotion();
  const heading = useRef<HTMLHeadingElement>(null);
  const update = (key: keyof typeof values, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));
  const field = (
    key: keyof typeof values,
    label: string,
    placeholder = "",
    type = "text",
    required = false,
  ) => (
    <label className="setup-field" key={key}>
      {label}
      <Input
        value={values[key]}
        onChange={(e) => update(key, e.target.value)}
        placeholder={placeholder}
        type={type}
        required={required}
        maxLength={type === "text" ? 100 : undefined}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "0.01" : undefined}
        disabled={busy}
      />
    </label>
  );
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (
      step === 0 &&
      (!values.countryFrom || (!sponsor && !values.countryTo))
    ) {
      setError("Choose your countries to continue.");
      return;
    }
    if (step < steps.length - 1) {
      setDirection(1);
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      await save({ ...values, fundingAmount: Number(values.fundingAmount) });
      setSaved(true);
    } catch {
      setError("Couldn’t save. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const Icon = saved
    ? Check
    : step === 0
      ? MapPin
      : step === 1
        ? GraduationCap
        : Wallet;
  return (
    <main className="setup-page">
      <header className="setup-header">
        <Brand />
        <button onClick={account.setupComplete ? onDone : onSignOut}>
          {account.setupComplete && <X size={16} aria-hidden="true" />}
          {account.setupComplete ? "Close" : "Sign out"}
        </button>
      </header>
      <motion.section
        className="setup-card"
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {!saved && (
          <div
            className="setup-progress"
            aria-label={`Step ${step + 1} of ${steps.length}`}
          >
            {steps.map((label, index) => (
              <div
                key={label}
                className={index <= step ? "is-active" : ""}
                aria-current={index === step ? "step" : undefined}
              >
                <span>
                  <motion.i
                    animate={{ scaleX: index <= step ? 1 : 0 }}
                    transition={{ duration: reduced ? 0 : 0.35 }}
                  />
                </span>
                <small>{label}</small>
              </div>
            ))}
          </div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={saved ? "saved" : step}
            onAnimationComplete={() => heading.current?.focus()}
            initial={{
              opacity: 0,
              x: reduced ? 0 : direction * 40,
              y: reduced ? 0 : 12,
            }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: reduced ? 0 : direction * -24 }}
            transition={{ duration: reduced ? 0 : 0.36 }}
          >
            <motion.div
              className={`setup-icon ${saved ? "is-saved" : ""}`}
              initial={!reduced ? { scale: 0.65, rotate: -15 } : false}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 16 }}
            >
              <Icon size={27} />
            </motion.div>
            <h1 ref={heading} tabIndex={-1}>
              {saved
                ? "You’re all set."
                : sponsor
                  ? step === 0
                    ? "Let’s make it yours."
                    : "Ready to support."
                  : [
                      "Where are you headed?",
                      "A little about your studies.",
                      "Start with what you have.",
                    ][step]}
            </h1>
            <p className="setup-caption">
              {saved
                ? "Your next chapter starts here."
                : sponsor
                  ? step === 0
                    ? "Just the essentials."
                    : "Connect with your student in your workspace."
                  : [
                      "Your home. Your next chapter.",
                      "You can add the details later.",
                      "You can change this anytime.",
                    ][step]}
            </p>
            {saved ? (
              <Button className="setup-next" onClick={onDone}>
                Open workspace <ArrowRight size={17} />
              </Button>
            ) : (
              <form onSubmit={submit}>
                <fieldset disabled={busy} className="setup-fields">
                  {step === 0 && (
                    <>
                      {field("name", "Your name", "Full name", "text", true)}
                      <SetupCountrySelect
                        label="Home country"
                        value={values.countryFrom}
                        onChange={(value) => update("countryFrom", value)}
                        disabled={busy}
                      />
                      {!sponsor && (
                        <SetupCountrySelect
                          label="Study country"
                          value={values.countryTo}
                          onChange={(value) => update("countryTo", value)}
                          disabled={busy}
                        />
                      )}
                    </>
                  )}
                  {!sponsor && step === 1 && (
                    <>
                      {field(
                        "university",
                        "University · optional",
                        "University name",
                      )}
                      {field(
                        "course",
                        "Course · optional",
                        "What will you study?",
                      )}
                      <div className="setup-field">
                        <span>Start date · optional</span>
                        <DatePicker
                          label="Start date"
                          value={values.courseStart}
                          onChange={(value) => update("courseStart", value)}
                          className="setup-date-trigger"
                        />
                      </div>
                    </>
                  )}
                  {!sponsor && step === 2 && (
                    <>
                      {field(
                        "fundingAmount",
                        "Confirmed funding (£)",
                        "0",
                        "number",
                        true,
                      )}
                      <label className="setup-field">
                        Sponsor support
                        <select
                          value={values.sponsorSupport}
                          onChange={(e) =>
                            update("sponsorSupport", e.target.value)
                          }
                        >
                          {["Not sure yet", "Yes", "No"].map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                  {sponsor && step === 1 && (
                    <div className="setup-summary">
                      <Check size={19} />
                      <span>
                        {values.name}
                        <small>{values.countryFrom}</small>
                      </span>
                    </div>
                  )}
                </fieldset>
                {error && (
                  <p role="alert" className="setup-error">
                    {error}
                  </p>
                )}
                <div className="setup-actions">
                  {step > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setDirection(-1);
                        setError("");
                        setStep(step - 1);
                      }}
                    >
                      <ArrowLeft size={16} /> Back
                    </Button>
                  )}
                  <Button type="submit" disabled={busy}>
                    {busy
                      ? "Saving…"
                      : step === steps.length - 1
                        ? "Finish setup"
                        : "Continue"}
                    {busy ? (
                      <LoaderCircle className="setup-spinner" size={16} />
                    ) : (
                      <ArrowRight size={16} />
                    )}
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.section>
    </main>
  );
}
