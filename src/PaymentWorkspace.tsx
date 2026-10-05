import { useState, type ReactNode } from "react";
import { GraduationCap, ArrowRight, ShieldCheck, ReceiptText, Calculator, ArrowLeftRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { Button } from "./components/ui/button";
import TuitionPlanner from "./TuitionPlanner";
import "./tuition-decision.css";

export default function PaymentWorkspace({ plan, review, activity, amount, recipient, paymentStatus }: {
  plan: ReactNode; review: ReactNode; activity: ReactNode;
  amount?: number; recipient?: string; paymentStatus: string;
}) {
  const [view, setView] = useState(paymentStatus === "not_started" ? "plan" : "review");
  return <section className="payment-workspace">
    <div className="payment-workspace-heading">
      <div className="payment-workspace-title"><span className="tuition-heading-icon"><GraduationCap size={24} /></span><div><h1>Tuition payments</h1><p>Plan your payment, compare routes and review before sending.</p></div></div>
      <span className="payment-workspace-sandbox">Sandbox · No real funds move</span>
    </div>
    {amount !== undefined && <div className="payment-workspace-summary"><div><span>Tuition amount</span><strong>{new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount)}</strong></div><div><span>Recipient</span><strong>{recipient || "Example UK University"}</strong></div><div><span>Payment status</span><strong>{({ not_started: "Not started", prepared: "Ready to review", approved: "Approved", completed: "Completed" } as Record<string, string>)[paymentStatus] ?? paymentStatus.replaceAll("_", " ")}</strong></div></div>}
    <Tabs value={view} onValueChange={setView}>
      <TabsList className="payment-workspace-tabs" aria-label="Tuition payment views">
        <TabsTrigger value="plan"><ArrowLeftRight size={16} /> Plan & compare</TabsTrigger>
        <TabsTrigger value="review"><ShieldCheck size={16} /> Review & pay</TabsTrigger>
        <TabsTrigger value="activity"><ReceiptText size={16} /> Activity & receipts</TabsTrigger>
        <TabsTrigger value="estimate"><Calculator size={16} /> Cost calculator</TabsTrigger>
      </TabsList>
      <TabsContent value="plan">{plan}<div className="payment-next-step"><div><strong>Ready to review?</strong><p>Check the recipient, total cost and protected living funds before approving.</p></div><Button onClick={() => setView("review")}>Review & pay <ArrowRight size={16} /></Button></div></TabsContent>
      <TabsContent value="review">{review}</TabsContent>
      <TabsContent value="activity">{activity}</TabsContent>
      <TabsContent value="estimate"><p className="payment-calculator-intro">Explore estimated costs for another destination. These estimates are separate from your saved payment plan.</p><TuitionPlanner /></TabsContent>
    </Tabs>
  </section>;
}
