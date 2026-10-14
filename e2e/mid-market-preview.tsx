import React from "react";
import ReactDOM from "react-dom/client";
import MidMarketRate from "../src/components/MidMarketRate";
import "../src/styles/styles.css";
import "../src/components/ui/ui.css";
const target = new URLSearchParams(location.search).get("currency") ?? "GBP";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <main style={{ padding: 16 }}>
    <MidMarketRate source="USD" target={target} />
  </main>,
);
