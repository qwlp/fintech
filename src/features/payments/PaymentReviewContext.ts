import { createContext } from "react";

// Route details can open the enclosing workspace's owner-review step.
export const PaymentReviewContext = createContext<(() => void) | null>(null);
