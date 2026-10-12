import { OverviewDashboard } from "./dashboard/OverviewDashboard";
import { RunwayWorkspace } from "./dashboard/RunwayWorkspace";
import { SponsorWorkspace } from "./dashboard/SponsorWorkspace";
import { ExchangeWorkspace } from "./dashboard/ExchangeWorkspace";
import { DepartureWorkspace } from "./dashboard/DepartureWorkspace";
import type { DatabaseState, Page } from "../types/database";

type Variation = 1 | 2 | 3 | 4 | 5;

export function Dashboard({
  paid,
  go,
  variation,
  checklist,
  toggleChecklist,
  database,
  onSponsorRequest,
  onSponsorPermission,
  onRateAlert,
}: {
  paid: boolean;
  go: (p: Page) => void;
  variation: Variation;
  checklist?: DatabaseState["checklist"];
  toggleChecklist: (key: string) => void;
  database: DatabaseState | null;
  onSponsorRequest: (request: {
    sponsorKey: string;
    amount: number;
    purpose: string;
    neededBy: string;
  }) => Promise<boolean>;
  onSponsorPermission: (
    sponsorKey: string,
    permission: string,
    enabled: boolean,
  ) => Promise<boolean>;
  onRateAlert: (targetRate: number) => Promise<boolean>;
}) {
  if (variation === 2) return <RunwayWorkspace database={database} />;
  if (variation === 3)
    return (
      <SponsorWorkspace
        go={go}
        database={database}
        onRequest={onSponsorRequest}
        onPermission={onSponsorPermission}
      />
    );
  if (variation === 4)
    return (
      <ExchangeWorkspace go={go} database={database} onRateAlert={onRateAlert} />
    );
  if (variation === 5)
    return (
      <DepartureWorkspace
        go={go}
        storedTasks={checklist}
        onToggle={toggleChecklist}
        config={database?.config?.departure}
      />
    );
  return <OverviewDashboard paid={paid} go={go} database={database} />;
}

export { ExchangeWorkspace } from "./dashboard/ExchangeWorkspace";
