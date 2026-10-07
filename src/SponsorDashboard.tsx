import { convertMoney, formatCurrency } from "../shared/currency";
import DataBoundary from "./DataBoundary";
import "./brief.css";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  CirclePoundSterling,
  Users,
  Inbox,
  ShieldCheck,
  Pencil,
  Check,
  X,
  LoaderCircle,
  CalendarDays,
} from "lucide-react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import SponsorConnect from "./SponsorConnect";
import "./sponsor-dashboard.css";

export default function SponsorDashboard(props: { name: string }) {
  return (
    <DataBoundary>
      <SponsorOverview {...props} />
    </DataBoundary>
  );
}
function SponsorOverview({ name }: { name: string }) {
  const students = useQuery(api.sponsorLinks.dashboard, {});
  const update = useMutation(api.sponsorLinks.updateCommitment);
  const [selected, setSelected] = useState<Id<"sponsors"> | null>(null);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const student = students?.find((s) => s.id === selected) ?? students?.[0];
  const currency = student?.currency ?? "GBP";
  const money = (amount: number) => formatCurrency(amount, currency, 2);
  const pending =
    students?.reduce(
      (total, s) =>
        total + s.requests.filter((r) => r.status === "sent").length,
      0,
    ) ?? 0;
  return (
    <div className="sponsor-desk">
      <div className="sponsor-desk-heading">
        <div>
          <span className="auth-eyebrow">Sponsor account</span>
          <h1>Your students</h1>
          <p>Welcome, {name.split(" ")[0]}.</p>
        </div>
        <ShieldCheck size={28} aria-label="Student-controlled access" />
      </div>
      <div className="sponsor-desk-stats">
        <div>
          <Users size={20} />
          <strong>{students?.length ?? "—"}</strong>
          <span>Students</span>
        </div>
        <div>
          <CirclePoundSterling size={20} />
          <strong>
            {students
              ? formatCurrency(
                  students.reduce(
                    (total, s) =>
                      total + convertMoney(s.commitment, s.currency, currency),
                    0,
                  ),
                  currency,
                  2,
                )
              : "—"}
          </strong>
          <span>Annual commitment · {currency} equivalent</span>
        </div>
        <div>
          <Inbox size={20} />
          <strong>{students ? pending : "—"}</strong>
          <span>Open requests</span>
        </div>
      </div>
      {students === undefined ? (
        <div className="sponsor-desk-empty" role="status">
          <LoaderCircle className="connect-spin" />
          Loading students…
        </div>
      ) : student ? (
        <section className="sponsor-student-detail">
          <div className="sponsor-student-picker" aria-label="Select student">
            {students.map((s) => (
              <button
                key={s.id}
                aria-pressed={student.id === s.id}
                onClick={() => {
                  setSelected(s.id);
                  setEditing(false);
                  setMessage("");
                }}
              >
                <span>{s.name.slice(0, 1).toUpperCase()}</span>
                {s.name}
              </button>
            ))}
          </div>
          <div className="sponsor-detail-heading">
            <h2>{student.name}</h2>
            <span>
              <ShieldCheck size={15} />
              Connected
            </span>
          </div>
          <div className="sponsor-commitment">
            <div>
              <span>Annual commitment · {currency}</span>
              <strong>{money(student.commitment)}</strong>
            </div>
            {!editing && (
              <Button
                variant="outline"
                onClick={() => {
                  setAmount(String(student.commitment));
                  setEditing(true);
                  setMessage("");
                }}
              >
                <Pencil size={15} />
                Edit
              </Button>
            )}
          </div>
          {editing && (
            <form
              className="sponsor-commitment-form"
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                setMessage("");
                try {
                  await update({ id: student.id, amount: Number(amount) });
                  setEditing(false);
                  setMessage("Commitment saved.");
                } catch {
                  setMessage("Could not save. Check the amount and try again.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label htmlFor="annual-commitment">
                Annual amount · {currency}
              </label>
              <div>
                <Input
                  id="annual-commitment"
                  type="number"
                  min="0"
                  max="1000000000"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                  disabled={busy}
                />
                <Button disabled={busy}>
                  <Check size={16} />
                  Save
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  aria-label="Cancel commitment edit"
                  onClick={() => setEditing(false)}
                >
                  <X size={18} />
                </Button>
              </div>
              <small>A pledge; no money is transferred.</small>
            </form>
          )}
          {message && (
            <p role="status" className="sponsor-save-message">
              {message}
            </p>
          )}
          <section
            className="sponsor-financial-summary"
            aria-label="Shared financial overview"
          >
            <h3>Shared financial overview</h3>
            {student.financialOverview ? (
              <>
                <dl className="route-quick-facts">
                  <div>
                    <dt>Planned budget · {currency}</dt>
                    <dd>{money(student.financialOverview.plannedGBP)}</dd>
                  </div>
                  <div>
                    <dt>Costs marked paid</dt>
                    <dd>{money(student.financialOverview.paidGBP)}</dd>
                  </div>
                  <div>
                    <dt>Planned costs remaining</dt>
                    <dd>
                      {money(
                        Math.max(
                          0,
                          student.financialOverview.plannedGBP -
                            student.financialOverview.paidGBP,
                        ),
                      )}
                    </dd>
                  </div>
                </dl>
                {student.financialOverview.categories.length ? (
                  <div className="sponsor-category-breakdown">
                    <h4>Cost distribution</h4>
                    {student.financialOverview.categories.map((category) => (
                      <div key={category.category}>
                        <strong>{category.category}</strong>
                        <span>
                          {money(category.paidGBP)} paid /{" "}
                          {money(category.plannedGBP)} planned
                        </span>
                        <progress
                          aria-label={`${category.category} share of planned budget`}
                          max={Math.max(
                            1,
                            student.financialOverview!.plannedGBP,
                          )}
                          value={category.plannedGBP}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No saved budget costs yet.</p>
                )}
                <p>
                  Derived from saved planned costs and their paid flags; this is
                  not a complete bank spending history.
                </p>
              </>
            ) : (
              <p>
                Budget overview is private. The student can share aggregate
                planned and paid costs by enabling Financial overview.
              </p>
            )}
            {student.requestSummary && (
              <dl className="route-quick-facts">
                <div>
                  <dt>Open funding requests</dt>
                  <dd>{money(student.requestSummary.requestedGBP)}</dd>
                </div>
                <div>
                  <dt>Received contributions</dt>
                  <dd>{money(student.requestSummary.receivedGBP)}</dd>
                </div>
                <div>
                  <dt>Commitment remaining</dt>
                  <dd>
                    {money(
                      Math.max(
                        0,
                        student.commitment - student.requestSummary.receivedGBP,
                      ),
                    )}
                  </dd>
                </div>
              </dl>
            )}
            {student.tuition ? (
              <>
                <dl className="route-quick-facts">
                  <div>
                    <dt>Current tuition payment</dt>
                    <dd>{money(student.tuition.amountGBP)}</dd>
                  </div>
                  <div>
                    <dt>Payment progress</dt>
                    <dd>{student.tuition.status.replaceAll("_", " ")}</dd>
                  </div>
                  <div>
                    <dt>Tuition sent · sandbox</dt>
                    <dd>{money(student.tuition.paidGBP)}</dd>
                  </div>
                  <div>
                    <dt>Deadline</dt>
                    <dd>{student.tuition.deadline ?? "Not set"}</dd>
                  </div>
                </dl>
                <h4>Recent tuition payments</h4>
                {student.tuition.recentPayments.length ? (
                  <ul>
                    {student.tuition.recentPayments.map((payment, index) => (
                      <li key={index}>
                        {formatCurrency(payment.amountGBP, payment.currency, 2)}{" "}
                        · {new Date(payment.timestamp).toLocaleDateString()}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No tuition payments yet.</p>
                )}
              </>
            ) : (
              <p>
                No tuition information shared. The student can enable Sponsored
                tuition in their sharing settings.
              </p>
            )}
            <p>
              Only permitted aggregates and tuition progress are shared. Wallet
              balances and private transaction details remain private.
            </p>
          </section>
          <div className="sponsor-request-heading">
            <h3>
              <Inbox size={18} />
              Funding requests
            </h3>
          </div>
          {!student.permissions.includes("Funding requests") ? (
            <div className="sponsor-desk-empty">
              <ShieldCheck size={24} />
              <p>The student hasn’t shared requests yet.</p>
            </div>
          ) : !student.requests.length ? (
            <div className="sponsor-desk-empty">
              <Inbox size={24} />
              <p>No requests yet.</p>
            </div>
          ) : (
            <div className="sponsor-request-list">
              {student.requests.map((r) => (
                <article key={r.id}>
                  <div>
                    <strong>{r.purpose}</strong>
                    <span>
                      <CalendarDays size={14} />
                      {r.neededBy || "No due date"}
                    </span>
                  </div>
                  <strong>{money(r.amount)}</strong>
                  <span className="sponsor-request-status">
                    {r.status === "sent" ? "Requested" : "Received"}
                  </span>
                </article>
              ))}
            </div>
          )}
          <p className="sponsor-privacy-note">
            <ShieldCheck size={14} />
            Students control sharing. Personal balances stay private.
          </p>
        </section>
      ) : (
        <div className="sponsor-desk-empty sponsor-first-student">
          <Users size={32} />
          <h2>Your first connection starts here</h2>
          <p>Ask your student for an invitation code.</p>
        </div>
      )}
      <section className="sponsor-connect-panel">
        <SponsorConnect role="Sponsor" />
      </section>
    </div>
  );
}
