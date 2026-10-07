import { useState } from "react";
import { Dialog } from "radix-ui";
import { Button } from "./components/ui/button";
import { Bot, CircleHelp, X } from "lucide-react";
import "./agent-tour.css";
export default function AgentTour({ accountId }: { accountId?: string }) {
  const key = `movewise-agent-tour:${accountId ?? "session"}`;
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(key) !== "done";
    } catch {
      return true;
    }
  });
  const dismiss = () => {
    try {
      localStorage.setItem(key, "done");
    } catch {}
    setOpen(false);
  };
  return (
    <>
      <div className="agent-tour-toolbar">
        <Button
          className="agent-tour-trigger"
          variant="ghost"
          onClick={() => setOpen(true)}
        >
          <CircleHelp aria-hidden="true" />
          How the agent works
        </Button>
      </div>
      <Dialog.Root
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : dismiss())}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="agent-tour-overlay" />
          <Dialog.Content className="agent-tour-dialog">
            <span className="agent-tour-icon">
              <Bot size={24} aria-hidden="true" />
            </span>
            <Dialog.Close asChild>
              <button
                className="agent-tour-close"
                aria-label="Close agent tour"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
            <Dialog.Title>Meet your MoveWise agent</Dialog.Title>
            <Dialog.Description>
              Get help understanding your move and preparing a payment.
            </Dialog.Description>
            <ol>
              <li>
                <strong>Plan with your context.</strong> With AI consent
                enabled, the agent can use your saved plan, funding, balances
                and payment details.
              </li>
              <li>
                <strong>Try a question.</strong> “Compare my tuition routes” or
                “How much runway do I have?”
              </li>
              <li>
                <strong>You stay in control.</strong> The agent can draft a
                sandbox payment. You must review and approve the exact quote
                before sending. No real funds move.
              </li>
            </ol>
            <p className="agent-tour-note">
              Replies can be wrong. Check amounts, recipients and deadlines
              before acting.
            </p>
            <div className="agent-tour-actions">
              <Button variant="outline" onClick={dismiss}>
                Skip tour
              </Button>
              <Button onClick={dismiss}>Got it</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
