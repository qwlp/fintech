import { useEffect, useState } from "react";
import type { Id } from "../convex/_generated/dataModel";
import { convexApi, convexClient } from "./lib/convex";
import FundingConfirmation from "./FundingConfirmation";
import { Button } from "./components/ui/button";
import { formatCurrency } from "../shared/currency";

type Change = {
  executionId: string;
  status: string;
  amount: number;
  currency: string;
};
export default function AgentFundingChange({ initial }: { initial: Change }) {
  const [change, setChange] = useState(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!convexClient) return;
    const watch = convexClient.watchQuery(convexApi.agentFundingChange, {
      executionId: initial.executionId as Id<"toolExecutions">,
    });
    const update = () => {
      try {
        const result = watch.localQueryResult();
        if (result) setChange(result);
      } catch {
        setError(
          "Could not load this funding change. Try again after signing in.",
        );
      }
    };
    const unsubscribe = watch.onUpdate(update);
    update();
    return unsubscribe;
  }, [initial.executionId]);
  const resolve = async (confirm: boolean) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (!convexClient) throw new Error("Sign in to review this change.");
      const result = await convexClient.mutation(
        convexApi.resolveAgentFundingChange,
        { executionId: change.executionId as Id<"toolExecutions">, confirm },
      );
      setChange((current) => ({ ...current, status: result.status }));
      setOpen(false);
    } catch (error) {
      setOpen(false);
      setError(
        error instanceof Error
          ? error.message.replace(/^.*?Uncaught Error:\s*/, "").split("\n")[0]
          : "Could not save this funding change.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="agent-funding-change" aria-label="Agent funding change">
      <strong>
        {change.status === "saved"
          ? "Funding saved"
          : change.status === "cancelled"
            ? "Funding change discarded"
            : "Confirm your funding amount"}
      </strong>
      <p>
        {formatCurrency(change.amount, change.currency, 2)} {change.currency}
      </p>
      {change.status === "pending_confirmation" && (
        <>
          <p>This change has not been saved yet.</p>
          <div className="agent-funding-actions">
            <Button
              size="sm"
              disabled={busy || !convexClient}
              onClick={() => setOpen(true)}
            >
              Review funding amount
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !convexClient}
              onClick={() => void resolve(false)}
            >
              Discard change
            </Button>
          </div>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <FundingConfirmation
        open={open}
        amount={change.amount}
        currency={change.currency}
        busy={busy}
        onOpenChange={setOpen}
        onConfirm={() => void resolve(true)}
      />
    </section>
  );
}
