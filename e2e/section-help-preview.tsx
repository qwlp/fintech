import React from "react";
import { createRoot } from "react-dom/client";
import SectionHelp from "../src/SectionHelp.tsx";
import "../src/styles.css";
import "../src/components/ui/ui.css";
import "../src/sidebar.css";
import "../src/dark-mode.css";
const sections = [
  "Dashboard",
  "Move Planner",
  "AI Agent",
  "Payments",
  "Sponsors",
  "Security",
];
createRoot(document.getElementById("root")).render(
  React.createElement(
    "aside",
    {
      className: "sidebar sidebar-clean open",
      style: {
        position: "fixed",
        left: 0,
        top: 0,
        width: 280,
        height: "100dvh",
        transform: "none",
      },
    },
    React.createElement(
      "nav",
      { "aria-label": "Main navigation" },
      sections.map((section) =>
        React.createElement(
          "div",
          { className: "sidebar-section", key: section },
          React.createElement(
            "button",
            { onClick: () => (location.hash = section) },
            section,
          ),
          React.createElement(SectionHelp, { section }),
        ),
      ),
    ),
  ),
);
