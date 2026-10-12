import SectionHelp from "../src/components/SectionHelp";
import MobileNavigation from "../src/components/MobileNavigation";
import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import MovePlanner from "../src/features/planner/MovePlanner";
import { Profile } from "../src/pages/Profile";
import { Wallet } from "../src/pages/Wallet";
import AgentTour from "../src/features/agent/AgentTour";
import InfoHelp from "../src/components/InfoHelp";
import "../src/styles/styles.css";
import "../src/components/ui/ui.css";
import "../src/styles/workspace-polish.css";
import "../src/styles/headerless.css";
import "../src/styles/experience.css";
import "../src/styles/app-clean.css";
import "../src/styles/page-spacing.css";
import "../src/styles/brief.css";
import "../src/styles/dark-mode.css";
import "../src/styles/setup.css";
function Preview() {
  const [view, setView] = useState("Planner");
  const [account, setAccount] = useState({
    name: "Test Student",
    initials: "TS",
    countryFrom: "China",
    countryTo: "United Kingdom",
    university: "University of Manchester",
    course: "Computing",
  });
  return (
    <div className="app-clean">
      <main style={{ padding: 16, maxWidth: 1100, margin: "auto" }}>
        <nav aria-label="Preview sections">
          {["Planner", "Profile", "Agent", "Balances"].map((item) => (
            <button key={item} onClick={() => setView(item)}>
              {item}
            </button>
          ))}
        </nav>
        <div className="page-help-tools">
          <SectionHelp
            key={view}
            section={
              view === "Planner"
                ? "Move Planner"
                : view === "Agent"
                  ? "AI Agent"
                  : "Profile"
            }
          />
        </div>
        {view === "Planner" && (
          <MovePlanner
            go={() => {}}
            config={{
              requirements: [
                ["Visa & health surcharge", "Estimated", "£1600"],
                ["Flight", "Compare", "£480"],
                ["Rent deposit", "Estimated", "£1950"],
                ["Utilities", "Estimated", "£145 / mo"],
              ],
            }}
          />
        )}
        {view === "Profile" && (
          <Profile
            go={() => {}}
            account={account}
            announce={() => {}}
            totals={{ funded: 5000, gap: 0, coverage: 100 }}
            onAddCountry={async () => true}
            onSave={async (profile) => {
              setAccount({
                ...account,
                name: profile.name,
                countryFrom: profile.home,
                countryTo: profile.study,
              });
              return true;
            }}
          />
        )}
        {view === "Agent" && <AgentTour accountId="preview" />}
        {view === "Balances" && (
          <Wallet
            go={() => {}}
            storedWallets={[
              {
                currency: "USD",
                symbol: "$",
                amount: 5000,
                gbpValue: 3870,
                label: "Sandbox dollars",
              },
            ]}
          />
        )}
        <InfoHelp term="Exchange rate" />
        <MobileNavigation
          page={
            view === "Planner"
              ? "Move Planner"
              : view === "Agent"
                ? "AI Agent"
                : "Profile"
          }
          go={(page) =>
            setView(
              page === "Move Planner"
                ? "Planner"
                : page === "AI Agent"
                  ? "Agent"
                  : "Profile",
            )
          }
        />
      </main>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(<Preview />);
