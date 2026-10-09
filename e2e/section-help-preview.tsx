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
function Preview() {
  const [section, setSection] = React.useState("Dashboard");
  return (
    <main style={{ padding: 24 }}>
      <div className="page-help-tools">
        <SectionHelp key={section} section={section} />
      </div>
      <nav aria-label="Preview sections">
        {sections.map((item) => (
          <button key={item} onClick={() => setSection(item)}>
            {item}
          </button>
        ))}
      </nav>
    </main>
  );
}
createRoot(document.getElementById("root")).render(<Preview />);
