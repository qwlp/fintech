import React from "react";
import ReactDOM from "react-dom/client";
import MobileNavigation from "../src/components/MobileNavigation";
import "../src/styles/brief.css";
import MovePlanner from "../src/features/planner/MovePlanner";
import { WorkspaceCurrencyProvider } from "../src/components/WorkspaceCurrency";
import "../src/styles/styles.css";
import "../src/styles/app-clean.css";
import "../src/components/ui/ui.css";
import "../src/styles/dark-mode.css";
const currency = new URLSearchParams(location.search).get("currency") ?? "GBP";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <WorkspaceCurrencyProvider currency={currency}>
    <main
      className="app-clean"
      style={{ padding: 16, maxWidth: 1440, margin: "auto" }}
    >
      <MovePlanner go={() => {}} />
      <MobileNavigation page="Move Planner" go={() => {}} />
    </main>
  </WorkspaceCurrencyProvider>,
);
