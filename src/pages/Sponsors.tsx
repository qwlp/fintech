import { useState } from "react";
import { Check, LockKeyhole, Send } from "lucide-react";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import SponsorConnect from "../auth/SponsorConnect";
import { useWorkspaceCurrency, useWorkspaceMoney } from "../WorkspaceCurrency";
import { convertMoney } from "../../shared/currency";
import { sponsors as fallbackSponsors } from "../data";
import type { DatabaseState } from "../types/database";

export function Sponsors({
  connected,
  announce,
  requests = [],
  onRequest,
  storedSponsors,
  config,
  onPermission,
}: {
  onPermission?: (
    sponsorKey: string,
    permission: string,
    enabled: boolean,
  ) => Promise<boolean>;
  announce: (s: string) => void;
  requests?: DatabaseState["sponsorRequests"];
  onRequest: (request: {
    sponsorKey: string;
    amount: number;
    purpose: string;
    neededBy: string;
  }) => Promise<boolean>;
  connected?: boolean;
  storedSponsors?: DatabaseState["sponsors"];
  config?: any;
}) {
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();

  const [requestFor, setRequestFor] = useState<{
    key: string;
    name: string;
  } | null>(null);
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [sending, setSending] = useState(false);

  const requestAction = (person: { key: string; name: string }) => (
    <Button
      variant="outline"
      aria-label={`Request contribution from ${person.name}`}
      disabled={sending}
      aria-expanded={requestFor?.key === person.key}
      onClick={() => {
        if (requestFor?.key === person.key) {
          setRequestFor(null);
          return;
        }
        setAmount("");
        setPurpose("");
        setNeededBy("");
        setRequestFor(person);
      }}
    >
      <Send size={16} /> Request contribution
    </Button>
  );

  const requestDetails = (person: { key: string; name: string }) => {
    const history = requests
      .filter((request) => request.sponsorKey === person.key)
      .slice()
      .reverse();
    return (
      <div className="sponsor-profile-details">
        {requestFor?.key === person.key && (
          <section className="sponsor-reference-panel">
            <form
              className="sponsor-profile-request"
              onSubmit={async (event) => {
                event.preventDefault();
                if (sending) return;
                setSending(true);
                try {
                  const saved = await onRequest({
                    sponsorKey: requestFor.key,
                    amount: Number(amount),
                    purpose: purpose.trim(),
                    neededBy,
                  });
                  if (saved) {
                    announce(`Contribution request sent to ${requestFor.name}`);
                    setRequestFor(null);
                  } else announce("Could not send contribution request");
                } catch {
                  announce("Could not send contribution request");
                } finally {
                  setSending(false);
                }
              }}
            >
              <h3>Request a contribution from {requestFor.name}</h3>
              <p>
                The request shares its purpose and amount, but no private
                account activity.
              </p>
              <label>
                Amount ({currency})
                <Input
                  money
                  min="0.01"
                  max="1000000"
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={sending}
                />
              </label>
              <label>
                Purpose
                <Input
                  required
                  maxLength={500}
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  disabled={sending}
                />
              </label>
              <label>
                Needed by
                <Input
                  type="date"
                  value={neededBy}
                  onChange={(event) => setNeededBy(event.target.value)}
                  disabled={sending}
                />
              </label>
              <div>
                <Button type="submit" disabled={sending || !purpose.trim()}>
                  <Send size={16} />
                  {sending ? "Sending…" : "Send request"}
                </Button>{" "}
                <Button
                  type="button"
                  variant="outline"
                  disabled={sending}
                  onClick={() => setRequestFor(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </section>
        )}
        {history.length > 0 && (
          <details className="sponsor-profile-history">
            <summary>
              Contribution requests <span>{history.length}</span>
            </summary>
            {history.map((request) => (
              <article key={request._id} className="sponsor-request-history">
                <div className="sponsor-request-heading">
                  <strong>{request.purpose}</strong>
                  <strong>{formatMoney(request.amount)}</strong>
                </div>
                <div className="sponsor-request-meta">
                  <span>
                    {request.status === "sent" ? "Request sent" : "Received"}
                  </span>
                  {request.neededBy && (
                    <span>Needed by {request.neededBy}</span>
                  )}
                </div>
              </article>
            ))}
          </details>
        )}
      </div>
    );
  };

  const [tab, setTab] = useState<"Sponsors" | "Privacy">("Sponsors");
  const visibleSponsors =
    storedSponsors ?? fallbackSponsors.map((s) => ({ ...s, key: s.id }));
  const sponsor = visibleSponsors[0];
  const transferred = config?.transferred ?? 0;
  const schedule = config?.schedule ?? [
    ["15 Nov 2026", "Living expenses", convertMoney(1000, "GBP", currency)],
    ["15 Jan 2027", "Tuition instalment", convertMoney(2000, "GBP", currency)],
  ];
  const hasScheduleStatus = schedule.some((item: any[]) => Boolean(item[3]));

  return (
    <div className="sponsor-reference-page">
      <section className="sponsor-reference-header">
        <div>
          <h2>Sponsors</h2>
        </div>
        <div
          className="sponsor-reference-tabs"
          role="tablist"
          aria-label="Sponsor views"
        >
          {(["Sponsors", "Privacy"] as const).map((item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
              role="tab"
              id={`sponsor-tab-${item}`}
              aria-controls={`sponsor-panel-${item}`}
              tabIndex={tab === item ? 0 : -1}
              onKeyDown={(event) => {
                const views = ["Sponsors", "Privacy"] as const;
                const index = views.indexOf(item);
                const next =
                  event.key === "ArrowRight"
                    ? views[(index + 1) % views.length]
                    : event.key === "ArrowLeft"
                      ? views[(index + views.length - 1) % views.length]
                      : event.key === "Home"
                        ? views[0]
                        : event.key === "End"
                          ? views[views.length - 1]
                          : null;
                if (!next) return;
                event.preventDefault();
                setTab(next);
                document.getElementById(`sponsor-tab-${next}`)?.focus();
              }}
              aria-selected={tab === item}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {tab === "Sponsors" && connected && (
        <SponsorConnect
          role="Student"
          renderSponsorAction={requestAction}
          renderSponsorDetails={requestDetails}
        />
      )}

      {tab === "Sponsors" &&
        !connected &&
        visibleSponsors.map((sponsor) => (
          <div
            key={sponsor.key}
            className="sponsor-overview-content"
            role="tabpanel"
            id="sponsor-panel-Sponsors"
            aria-labelledby="sponsor-tab-Sponsors"
          >
            <section className="sponsor-reference-summary">
              <div className="sponsor-reference-person">
                <div className="sponsor-reference-avatar">
                  {sponsor.name
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <h3>{sponsor.name}</h3>
                  <p>{sponsor.relationship}</p>
                  {requestAction(sponsor)}
                </div>
              </div>
              <div className="sponsor-reference-commitment">
                <div className="commitment-total">
                  <span>Annual commitment</span>
                  <strong>{formatMoney(sponsor.commitment)}</strong>
                </div>
                <div className="commitment-row received">
                  <span>Received</span>
                  <strong>{formatMoney(transferred)}</strong>
                </div>
                <div className="commitment-row remaining">
                  <span>Remaining</span>
                  <strong>
                    {formatMoney(Math.max(0, sponsor.commitment - transferred))}
                  </strong>
                </div>
              </div>
            </section>
            <section
              className={`sponsor-reference-schedule ${hasScheduleStatus ? "" : "schedule-no-status"}`}
            >
              <div className="schedule-title">
                <h3>Contribution schedule</h3>
              </div>
              <div className="schedule-head">
                <span>Date</span>
                <span>Description</span>
                <span>Amount</span>
                {hasScheduleStatus && <span>Status</span>}
              </div>
              {schedule.map((item: any[]) => (
                <div className="schedule-line" key={`${item[0]}-${item[1]}`}>
                  <span>{item[0]}</span>
                  <span>{item[1]}</span>
                  <span>{formatMoney(Number(item[2]))}</span>
                  {hasScheduleStatus && <em>{item[3] ?? "—"}</em>}
                </div>
              ))}
            </section>
            {requestDetails(sponsor)}
          </div>
        ))}

      {tab === "Sponsors" && !sponsor && !connected && (
        <section
          role="tabpanel"
          id="sponsor-panel-Sponsors"
          aria-labelledby="sponsor-tab-Sponsors"
        >
          <p>No sponsors connected yet.</p>
        </section>
      )}

      {tab === "Privacy" && (
        <section
          className="sponsor-reference-panel privacy"
          role="tabpanel"
          id="sponsor-panel-Privacy"
          aria-labelledby="sponsor-tab-Privacy"
        >
          <LockKeyhole />
          <h3>Sharing with your sponsors</h3>
          <p>
            Choose what each sponsor can see. Financial overview shares
            aggregate planned and paid costs. Wallet balances stay private.
          </p>
          <div className="sponsor-privacy-grid">
            {visibleSponsors.map((sponsor) => (
              <section
                className="sponsor-privacy-card"
                key={sponsor.key}
                aria-label={`Sharing settings for ${sponsor.name}`}
              >
                <div className="sponsor-privacy-identity">
                  <span className="sponsor-privacy-avatar" aria-hidden="true">
                    {sponsor.name
                      .split(" ")
                      .filter(Boolean)
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div>
                    <h4>{sponsor.name}</h4>
                    <span>{sponsor.relationship}</span>
                  </div>
                </div>
                {[
                  "Commitment status",
                  "Sponsored tuition",
                  "Funding requests",
                  "Financial overview",
                ].map((permission) => (
                  <label className="sponsor-permission" key={permission}>
                    <Checkbox
                      checked={sponsor.permissions.includes(permission)}
                      disabled={!onPermission}
                      onCheckedChange={async (enabled) => {
                        const saved = await onPermission?.(
                          sponsor.key,
                          permission,
                          enabled === true,
                        );
                        announce(
                          saved
                            ? "Sharing preference saved"
                            : "Could not save sharing preference",
                        );
                      }}
                    />
                    {permission}
                  </label>
                ))}
              </section>
            ))}
          </div>
          {visibleSponsors.length === 0 && (
            <p>
              No sponsors connected yet. Add a sponsor in the Sponsors tab to
              manage their access.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
