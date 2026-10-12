import { CircleHelp, X } from "lucide-react";
import { Popover } from "radix-ui";
import "../styles/section-help.css";

const descriptions: Record<string, string> = {
  Dashboard:
    "See your funding, upcoming costs and next steps for your move in one place.",
  "Move Planner":
    "Build your study budget, add expected costs and funding, and see how much you still need.",
  "AI Agent":
    "Ask questions about your study plan, compare tuition routes and prepare a sandbox payment for your review.",
  Payments:
    "Compare tuition payment routes, review quotes, manage balances and track your sandbox payments.",
  Sponsors:
    "Connect with the people supporting your studies and manage which parts of your plan they can see.",
  Security:
    "Review payment safeguards, recent account activity, and your demo payment history.",
  Profile:
    "Update your personal and study details, connect with sponsors and open your security settings.",
  Wallet:
    "Review your currency balances and their estimated value in your study currency.",
  Exchange:
    "Compare currencies and explore how exchange rate changes affect your funds.",
};

export default function SectionHelp({
  section,
  showLabel = false,
}: {
  section: string;
  showLabel?: boolean;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="section-help-trigger"
          aria-label={`About ${section}`}
        >
          <CircleHelp size={16} aria-hidden="true" />
          {showLabel && <span>About this section</span>}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="section-help-popover"
          side="bottom"
          align="end"
          sideOffset={12}
          collisionPadding={16}
          aria-label={`About ${section}`}
        >
          <strong>{section}</strong>
          <p>{descriptions[section]}</p>
          <Popover.Close asChild>
            <button
              type="button"
              className="section-help-close"
              aria-label="Close section help"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
