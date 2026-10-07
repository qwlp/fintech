import { useWorkspaceCurrency } from "./WorkspaceCurrency";
import { useEffect } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  useReducedMotion,
} from "motion/react";
export function formatMoney(value: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
export default function MoneyAmount({
  value,
  currency: suppliedCurrency,
}: {
  value: number;
  currency?: string;
}) {
  const workspaceCurrency = useWorkspaceCurrency();
  const currency = suppliedCurrency ?? workspaceCurrency;
  const reduced = useReducedMotion();
  const amount = useMotionValue(value);
  const formatted = useTransform(amount, (n) =>
    formatMoney(Math.round(n), currency),
  );
  useEffect(() => {
    formatted.set(formatMoney(Math.round(amount.get()), currency));
    if (reduced) {
      amount.set(value);
      return;
    }
    const animation = animate(amount, value, {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => animation.stop();
  }, [value, currency, reduced, amount, formatted]);
  return <motion.span>{formatted}</motion.span>;
}
