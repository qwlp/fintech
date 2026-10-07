import { CircleHelp, X } from "lucide-react";
import { Popover } from "radix-ui";
const explanations: Record<string, string> = {
  "Exchange rate":
    "How much study currency one unit of the source currency buys. Sandbox quotes are estimates, not live provider rates.",
  "Provider quote":
    "A provider's rate and fee, valid until the displayed expiry. Expired quotes need an explicit refresh and fresh approval.",
  Fees: "The provider fee is included in your total source-currency cost. This sandbox does not model additional card or SWIFT charges.",
  Availability:
    "A route must cover tuition, preserve your living funds and meet your deadline before it can be selected.",
  "Arrival estimate":
    "Estimated business days, with your safety buffer. Bank holidays, cutoffs and university processing may add time.",
  "Balance valuation":
    "Study-currency equivalents use stored sandbox valuations. They are estimates and are not live exchange rates.",
  "Local account":
    "An account in the destination country that may support domestic transfers.",
  SWIFT:
    "An international bank messaging network. Intermediary banks may charge fees.",
  "Payment status":
    "Prepare saves exact terms; approve records your consent; send completes a simulated debit and receipt.",
};
export default function InfoHelp({ term }: { term: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="info-help"
          aria-label={`About ${term.toLowerCase()}`}
        >
          <CircleHelp size={15} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="brief-popover"
          collisionPadding={12}
          sideOffset={6}
        >
          <strong>{term}</strong>
          <p>{explanations[term]}</p>
          <Popover.Close asChild>
            <button className="secondary" aria-label="Close explanation">
              <X size={14} /> Close
            </button>
          </Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
