import React from "react";
import ReactDOM from "react-dom/client";
import { ExchangeWorkspace } from "../src/pages/dashboard/ExchangeWorkspace";
import { WorkspaceCurrencyProvider } from "../src/components/WorkspaceCurrency";
import "../src/styles/styles.css";
import "../src/styles/app-clean.css";
import "../src/components/ui/ui.css";
import "../src/styles/exchange.css";
import "../src/styles/dark-mode.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <main
    className="app-clean"
    style={{ padding: 16, maxWidth: 1200, margin: "auto" }}
  >
    <WorkspaceCurrencyProvider currency="CNY">
      <ExchangeWorkspace
        go={() => {}}
        database={
          {
            paymentRoutes: [
              {
                provider: "Sandbox Standard",
                fxRate: 7.1208,
                fee: 8.4,
                delivery: "1 business day",
                recommended: true,
              },
            ],
            rateAlerts: [],
            wallets: [],
          } as any
        }
        onRateAlert={async () => true}
      />
    </WorkspaceCurrencyProvider>
  </main>,
);
