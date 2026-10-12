import { useState } from "react";
import { ArrowRight, Check, LockKeyhole, Send } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../components/ui/select";
import { DatePicker } from "../../components/ui/date-picker";
import { convertMoney } from "../../../shared/currency";
import { useWorkspaceCurrency, useWorkspaceMoney } from "../../components/WorkspaceCurrency";
import type { DatabaseState, Page } from "../../types/database";

function WorkspaceHeader({
  number,
  title,
  description,
  tabs,
  active,
  setActive,
}: {
  number: number;
  title: string;
  description: string;
  tabs: string[];
  active: string;
  setActive: (tab: string) => void;
}) {
  return (
    <>
      <section className="workspace-title">
        <div><h2>{title}</h2></div>
      </section>
      <nav className="workspace-tabs" aria-label={`${title} views`}>
        {tabs.map((tab) => (
          <button
            className={active === tab ? "active" : ""}
            aria-pressed={active === tab}
            onClick={() => setActive(tab)}
            key={tab}
          >
            {tab}
          </button>
        ))}
      </nav>
    </>
  );
}

export function SponsorWorkspace({
  go,
  database,
  onRequest,
  onPermission,
}: {
  go: (p: Page) => void;
  database: DatabaseState | null;
  onRequest: (request: {
    sponsorKey: string;
    amount: number;
    purpose: string;
    neededBy: string;
  }) => Promise<boolean>;
  onPermission: (sponsorKey: string, permission: string, enabled: boolean) => Promise<boolean>;
}) {
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();
  const [tab, setTab] = useState("Sponsors");
  const [amount, setAmount] = useState(() => convertMoney(1000, "GBP", currency));
  const [purpose, setPurpose] = useState("Living expenses");
  const [neededBy, setNeededBy] = useState("2026-11-15");

  const sponsor = database?.sponsors[0];
  const sponsorConfig = database?.config?.sponsorship;
  const sent = Boolean(database?.sponsorRequests.some((r) => r.status === "sent"));
  const transferred = Number(sponsorConfig?.transferred ?? 0);

  return (
    <div className="workspace">
      <WorkspaceHeader
        number={3}
        title="Sponsor workspace"
        description="Coordinate contributions without exposing private spending or account balances."
        tabs={["Sponsors", "Requests", "Privacy"]}
        active={tab}
        setActive={setTab}
      />
      {tab === "Sponsors" && (
        <div className="sponsor-workspace">
          <section className="sponsor-profile">
            <div className="initial">SC</div>
            <div>
              <span>Parent sponsor</span>
              <h3>{sponsor?.name}</h3>
              <p>{sponsor?.relationship} · Connected sponsor</p>
            </div>
            <button onClick={() => go("Sponsors")}>Open profile</button>
          </section>
          <div className="commitment-board">
            <div>
              <span>Annual commitment</span>
              <strong>{formatMoney(sponsor?.commitment ?? 0)}</strong>
            </div>
            <div>
              <span>Received</span>
              <strong>{formatMoney(transferred)}</strong>
            </div>
            <div>
              <span>Remaining</span>
              <strong>{formatMoney(Math.max(0, (sponsor?.commitment ?? 0) - transferred))}</strong>
            </div>
          </div>
          <section className="schedule">
            <h3>Contribution schedule</h3>
            {(sponsorConfig?.schedule ?? []).map((x: any[]) => (
              <div key={x[0]}>
                <time>{x[0]}</time>
                <strong>{x[1]}</strong>
                <span>{typeof x[2] === "number" ? formatMoney(x[2]) : x[2]}</span>
                <em>{x[3]}</em>
              </div>
            ))}
          </section>
        </div>
      )}
      {tab === "Requests" && (
        <section className="request-builder">
          <div>
            <span>Request from</span>
            <strong>{sponsor?.name}</strong>
          </div>
          <label>
            Amount
            <Input money min="1" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            <em>{currency}</em>
          </label>
          <label>
            Purpose
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger aria-label="Request purpose"><SelectValue /></SelectTrigger>
              <SelectContent className="ui-select-content">
                {["Living expenses", "Tuition", "Emergency funding"].map((item) => (
                  <SelectItem value={item} key={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label>
            Needed by
            <DatePicker label="Needed by" value={neededBy} onChange={setNeededBy} />
          </label>
          <button
            className={sent ? "sent" : ""}
            disabled={!sponsor || sent}
            onClick={() =>
              sponsor && void onRequest({ sponsorKey: sponsor.key, amount, purpose, neededBy })
            }
          >
            {sent ? <><Check /> Request sent</> : <>Send funding request <Send /></>}
          </button>
        </section>
      )}
      {tab === "Privacy" && (
        <section className="privacy-panel">
          <div className="privacy-intro">
            <LockKeyhole />
            <div>
              <h3>Purpose-limited access</h3>
              <p>Your sponsor sees only information required to fulfill their commitment.</p>
            </div>
          </div>
          {["Commitment status", "Sponsored tuition", "Funding requests", "Financial overview"].map(
            (label) => (
              <button
                onClick={() =>
                  sponsor && void onPermission(sponsor.key, label, !sponsor.permissions.includes(label))
                }
                key={label}
              >
                <span>{label}</span>
                <i className={sponsor?.permissions.includes(label) ? "on" : ""}>
                  {sponsor?.permissions.includes(label) ? "Visible" : "Private"}
                </i>
              </button>
            ),
          )}
        </section>
      )}
    </div>
  );
}
