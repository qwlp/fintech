import React from "react";
import ReactDOM from "react-dom/client";
import MobileNavigation from "../src/MobileNavigation";
import "../src/brief.css";
import { MovePlanner } from "../src/App";
import { WorkspaceCurrencyProvider } from "../src/WorkspaceCurrency";
import "../src/styles.css";
import "../src/app-clean.css";
import "../src/components/ui/ui.css";
import "../src/dark-mode.css";
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
