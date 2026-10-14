import { CircleHelp, X } from "lucide-react";
import { Popover } from "radix-ui";
const explanations: Record<string, string> = {
  "Extra processing days":
    "Extra business days added to the provider’s estimated transfer time to allow for bank or university processing. A route must arrive with this extra time before your tuition deadline. Choose 0–5 days; weekends are excluded.",
  "Living costs to keep":
    "Money you want to keep available for rent, food, transport and other living costs after paying tuition and fees. Enter an amount in the displayed currency. This amount is protected when checking whether you can afford a payment; it is not an extra payment fee.",
  "Payment score":
    "A score out of 10 for this comparison: up to 5 points for cost versus the cheapest option, 2 for speed, 2 for meeting your funding and deadline needs, and 1 for a current quote. This is a calculated demo score, not a customer rating.",
  "Exchange rate":
    "How much study currency one unit of the source currency buys. Sandbox quotes are estimates, not live provider rates.",
  "Provider quote":
    "A provider's rate and fee, valid until the displayed expiry. Expired quotes need an explicit refresh and fresh approval.",
  Fees: "The upfront provider or SWIFT fee is included in your total. Education platforms embed a 1.5% FX spread; banks embed 2.5%, or 0.3% when sending CNY. Fintech uses the reference rate with a 0.35% conversion fee.",
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
