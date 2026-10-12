import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Profile } from "../src/pages/Profile";
import { WorkspaceCurrencyProvider } from "../src/components/WorkspaceCurrency";
import { studyCurrency } from "../shared/currency";
import "../src/styles/styles.css";
import "../src/styles/setup.css";
import "../src/styles/profile.css";
import "../src/styles/dark-mode.css";
import "../src/components/ui/ui.css";
function Preview() {
  const [account, setAccount] = useState({
    name: "Student",
    initials: "S",
    role: "Student",
    countryFrom: "China",
    countryTo: "United Kingdom",
    countriesTo: ["United Kingdom"],
    university: "University of Manchester",
    course: "Computing",
  });
  const [funded, setFunded] = useState(1000);
  return (
    <WorkspaceCurrencyProvider currency={studyCurrency(account.countryTo)}>
      <Profile
        account={account}
        config={{}}
        totals={{ funded, gap: 0, coverage: 100 }}
        go={() => {}}
        announce={(text) => {
          (window as any).announcement = text;
        }}
        onAddCountry={async () => true}
        onSave={async (profile, destinations) => {
          (window as any).savedProfile = { profile, destinations };
          setAccount((current) => ({
            ...current,
            countryTo: profile.study,
            countriesTo: destinations,
            university: profile.university,
          }));
          setFunded(Number(profile.funding));
          return true;
        }}
      />
    </WorkspaceCurrencyProvider>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
