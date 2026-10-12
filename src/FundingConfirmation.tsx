import { AlertDialog } from "radix-ui";
import { Wallet } from "lucide-react";
import { formatCurrency } from "../shared/currency";
import { Button } from "./components/ui/button";
import "./styles/funding-confirmation.css";

export default function FundingConfirmation({
  open,
  amount,
  currency,
  busy,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  amount: number;
  currency: string;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="funding-confirmation-overlay" />
        <AlertDialog.Content
          className="funding-confirmation-dialog"
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <Wallet size={24} aria-hidden="true" />
          <AlertDialog.Title>
            Are you sure this is the amount?
          </AlertDialog.Title>
          <AlertDialog.Description>
            Your confirmed funding will be saved as:
          </AlertDialog.Description>
          <strong className="funding-confirmation-amount">
            {formatCurrency(amount, currency, 2)} <span>{currency}</span>
          </strong>
          <p>You can change this later in Profile.</p>
          <div className="funding-confirmation-actions">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" disabled={busy}>
                Edit amount
              </Button>
            </AlertDialog.Cancel>
            <Button disabled={busy} onClick={onConfirm}>
              {busy ? "Saving…" : "Yes, confirm amount"}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
