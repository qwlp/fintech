import type { ReactNode } from "react";
import { useState } from "react";
import {
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  History,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Button } from "../components/ui/button";
import SectionHelp from "../SectionHelp";
import { useWorkspaceMoney } from "../WorkspaceCurrency";
import type { AuditEvent } from "../types";

export function Security({
  audit,
  config,
  receipts,
}: {
  audit: AuditEvent[];
  config?: any;
  receipts?: ReactNode;
}) {
  const formatMoney = useWorkspaceMoney();
  const [activityOpen, setActivityOpen] = useState(false);

  const exportAudit = () => {
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = [
      "Event,Details,Actor,Time",
      ...audit.map((a) =>
        [a.type, a.detail, a.actor, a.timestamp].map(escape).join(","),
      ),
    ].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "movewise-audit.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const visibleAudit = activityOpen ? audit : audit.slice(0, 3);
  const activityNames: Record<string, string> = {
    PROFILE_UPDATED: "Profile updated",
    PLAN_CREATED: "Study plan created",
    AI_CONSENT: "AI access changed",
    AGENT_TOOL: "AI assistant used",
    PAYMENT_DETAILS_UPDATED: "Payment details updated",
    PAYMENT_RESET: "Payment restarted",
    RECIPIENT_VERIFIED: "University account checked",
    SANDBOX_INITIALIZED: "Demo payment set up",
    SANDBOX_QUOTES_REFRESHED: "Payment options refreshed",
    SPONSOR_ACCEPTED: "Sponsor connected",
    SPONSOR_PERMISSION: "Sponsor sharing updated",
    SPONSOR_REQUESTED: "Support requested",
    TUITION_PLAN_UPDATED: "Tuition plan updated",
    PAYMENT_COMPLETED: "Demo payment completed",
    PAYMENT_APPROVED: "Payment approved",
    PAYMENT_PREPARED: "Payment prepared",
    PROPOSAL_CREATED: "Payment prepared",
    PROPOSAL_APPROVED: "Payment approved",
  };

  return (
    <div id="security-center" className="page-stack security-workspace">
      <section className="page-intro">
        <h2>
          <ShieldCheck size={24} aria-hidden="true" />
          Security
        </h2>
        <div className="security-heading-actions">
          <SectionHelp section="Security" />
        </div>
      </section>
      <section
        className="security-safeguards"
        aria-labelledby="security-safeguards-title"
      >
        <h3 id="security-safeguards-title">Payment safeguards</h3>
        <div className="security-safeguard-row">
          <LockKeyhole size={19} aria-hidden="true" />
          <div>
            <strong>You approve payments</strong>
            <p>
              {config?.approvalRequired == null
                ? "Payment approval settings are not available yet."
                : config.approvalRequired
                  ? "Each payment needs your approval before it can be sent."
                  : "Approval is currently turned off for demo payments."}
            </p>
          </div>
        </div>
        <div className="security-safeguard-row">
          <CircleDollarSign size={19} aria-hidden="true" />
          <div>
            <strong>Maximum per payment</strong>
            <p>
              {config?.paymentLimit == null
                ? "Payment limit settings are not available yet."
                : `You can send up to ${formatMoney(config.paymentLimit)} in a single demo payment.`}
            </p>
          </div>
        </div>
        <div className="security-safeguard-row">
          <Clock3 size={19} aria-hidden="true" />
          <div>
            <strong>Time to send after approval</strong>
            <p>
              {config?.approvalExpiryMinutes == null
                ? "Approval time settings are not available yet."
                : `Send within ${config.approvalExpiryMinutes} minutes of approving. After that, you'll need to approve again.`}
            </p>
          </div>
        </div>
      </section>
      <section className="security-activity">
        <div className="security-section-heading">
          <h3>Recent activity</h3>
          {audit.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportAudit}>
              <Download size={15} aria-hidden="true" />
              Download history
            </Button>
          )}
        </div>
        {visibleAudit.length ? (
          <div
            className="security-event-list"
            role="region"
            aria-label="Recent activity"
          >
            {visibleAudit.map((a) => (
              <div className="security-event" key={a.id}>
                <span className="security-event-icon">
                  <History size={16} aria-hidden="true" />
                </span>
                <div className="security-event-copy">
                  <strong>
                    {activityNames[a.type] ??
                      (/PAYMENT|PROPOSAL/.test(a.type)
                        ? "Payment updated"
                        : /SPONSOR/.test(a.type)
                          ? "Sponsor details updated"
                          : /AI|TOOL/.test(a.type)
                            ? "AI assistant activity"
                            : "Account updated")}
                  </strong>
                  <details className="security-activity-details">
                    <summary>View details</summary>
                    <p>{a.detail}</p>
                    <p>By {a.actor}</p>
                  </details>
                </div>
                <div className="security-event-meta">
                  <span>{a.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="security-empty">
            No activity yet. Updates to your account will appear here.
          </p>
        )}
        {audit.length > 3 && (
          <Button
            variant="ghost"
            className="security-show-all"
            aria-expanded={activityOpen}
            onClick={() => setActivityOpen((open) => !open)}
          >
            {activityOpen ? "Show less" : "Show all activity"}
            <ChevronRight size={15} aria-hidden="true" />
          </Button>
        )}
      </section>
      {receipts && (
        <details className="security-receipts security-payment-history">
          <summary>
            <span>Payment history</span>
            <ChevronRight size={18} aria-hidden="true" />
          </summary>
          <p className="security-history-note">
            Check university account details and review your demo payments.
          </p>
          {receipts}
        </details>
      )}
    </div>
  );
}
