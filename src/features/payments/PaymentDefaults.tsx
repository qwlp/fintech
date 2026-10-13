import { useEffect, useRef, useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { convexApi, convexClient } from "../../lib/convex";
import { Button } from "../../components/ui/button";

async function initializeDefaults(accountId: string) {
  if (!convexClient) throw new Error("Payment service unavailable.");
  await convexClient.mutation(convexApi.initializePaymentSandbox, {
    accountId: accountId as Id<"accounts">,
  });
}

// Mounted only while the account has no saved payment defaults. The reactive
// bootstrap replaces this with the comparison as soon as setup completes.
export default function PaymentDefaults({
  accountId,
  initialize = initializeDefaults,
}: {
  accountId?: string;
  initialize?: (accountId: string) => Promise<unknown>;
}) {
  const attempted = useRef<string | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!accountId || attempted.current === accountId) return;
    attempted.current = accountId;
    setError("");
    void initialize(accountId).catch((cause: unknown) => {
      const message = cause instanceof Error ? cause.message : "";
      // Another tab may have initialized the account first; bootstrap will
      // deliver its saved defaults without another setup request.
      if (message.includes("Payment sandbox already exists")) return;
      setError("Could not load payment options. Please try again.");
    });
  }, [accountId, initialize, retry]);
  return (
    <section aria-label="Payment options" aria-busy={!error}>
      {error ? (
        <>
          <p role="alert">{error}</p>
          <Button
            onClick={() => {
              attempted.current = null;
              setRetry((value) => value + 1);
            }}
          >
            Try again
          </Button>
        </>
      ) : (
        <p role="status">Loading payment options…</p>
      )}
    </section>
  );
}
