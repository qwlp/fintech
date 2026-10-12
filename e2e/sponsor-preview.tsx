import { useState } from "react";
import { createRoot } from "react-dom/client";
import { SponsorConnectionLayout } from "../src/auth/SponsorConnect";
import { UserPlus, QrCode, Check, Unplug } from "lucide-react";
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { SponsorDashboardView } from "../src/auth/SponsorDashboard";
import type { FunctionReturnType } from "convex/server";
import { api } from "../convex/_generated/api";
import "../src/styles/styles.css";
import "../src/styles/typography.css";
import "../src/components/ui/ui.css";
import "../src/styles/dark-mode.css";
import "../src/styles/app-clean.css";
import "../src/styles/page-spacing.css";

type Student = FunctionReturnType<typeof api.sponsorLinks.dashboard>[number];
const fixture = [
  {
    id: "student-one",
    name: "Dara Chan",
    currency: "USD",
    commitment: 11627.91,
    permissions: ["Funding requests", "Sponsored tuition"],
    requests: [
      {
        id: "request-one",
        purpose: "Next semester tuition",
        amount: 1291.99,
        neededBy: "2026-11-01",
        status: "sent",
      },
      {
        id: "request-two",
        purpose: "Study essentials",
        amount: 300,
        neededBy: "",
        status: "fulfilled",
      },
    ],
    requestSummary: { requestedGBP: 1291.99, receivedGBP: 300 },
    financialOverview: null,
    tuition: {
      amountGBP: 2583.98,
      paidGBP: 0,
      deadline: "2026-11-01",
      status: "not_started",
      recentPayments: [],
    },
  },
] as unknown as Student[];
function Preview() {
  const mode = new URLSearchParams(location.search).get("mode");
  const [students, setStudents] = useState<Student[] | undefined>(
    mode === "loading" ? undefined : mode === "empty" ? [] : fixture,
  );
  return (
    <SponsorDashboardView
      name="Sokha Chan"
      students={students}
      onUpdate={async (id, amount) => {
        if (mode === "failure") throw new Error("Offline");
        setStudents((current) =>
          current?.map((s) => (s.id === id ? { ...s, commitment: amount } : s)),
        );
      }}
      onSetup={() => {
        location.hash = "setup";
      }}
      onSignOut={() => {
        location.hash = "signed-out";
      }}
      connections={
        <div className="sponsor-connect sponsor-accept">
          <SponsorConnectionLayout
            count={students?.length}
            invitation={
              <form onSubmit={(e) => e.preventDefault()}>
                <label htmlFor="preview-invite">Invitation code or link</label>
                <Input id="preview-invite" placeholder="ABCD-EF12-3456" />
                <div className="connection-actions">
                  <Button disabled>
                    <UserPlus size={16} />
                    Connect
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Scan QR"
                    title="Scan QR"
                  >
                    <QrCode size={18} />
                  </Button>
                </div>
              </form>
            }
            connections={
              <div className="connection-list">
                {students?.map((s) => (
                  <div className="connection-row" key={s.id}>
                    <span className="connection-avatar">DC</span>
                    <div className="connection-identity">
                      <strong>{s.name}</strong>
                      <span>Student</span>
                    </div>
                    <span className="connection-badge" aria-label="Connected">
                      <Check size={13} />
                    </span>
                    <button
                      className="disconnect-action"
                      aria-label={`Disconnect ${s.name}`}
                      title={`Disconnect ${s.name}`}
                    >
                      <Unplug size={17} />
                    </button>
                  </div>
                ))}
              </div>
            }
          />
        </div>
      }
    />
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
