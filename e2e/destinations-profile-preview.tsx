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
    universityChoices: ["University of Manchester"],
    course: "Computing",
    avatarUrl: null as string | null,
  });
  const [config, setConfig] = useState({
    courseStart: "2027-09-01",
    sponsorSupport: "Yes",
    countryAccounts: [
      {
        id: "bank-one",
        country: "United States",
        label: "Bank of America · Bank account · •••• 1233 · Manual",
      },
    ],
  });
  const [funded, setFunded] = useState(1000);
  return (
    <WorkspaceCurrencyProvider currency={studyCurrency(account.countryTo)}>
      <Profile
        account={account}
        config={config}
        totals={{ funded, gap: 0, coverage: 100 }}
        go={() => {}}
        announce={(text) => {
          (window as any).announcement = text;
        }}
        onAddCountry={async () => true}
        onRemoveCountry={async (item) => {
          (window as any).removedAccount = item;
          if ((window as any).failAccountRemoval) return false;
          setConfig((current) => ({
            ...current,
            countryAccounts: current.countryAccounts.filter(
              (account) => account.id !== item.id,
            ),
          }));
          return true;
        }}
        onUploadPhoto={async (photo) => {
          if ((window as any).failPhotoUpload) return false;
          (window as any).savedPhoto = { type: photo.type, size: photo.size };
          setAccount((current) => ({
            ...current,
            avatarUrl: URL.createObjectURL(photo),
          }));
          return true;
        }}
        onRemovePhoto={async () => {
          setAccount((current) => ({ ...current, avatarUrl: null }));
          return true;
        }}
        onSave={async (profile, destinations, universityChoices) => {
          if ((window as any).failProfileSave) return false;
          (window as any).savedProfile = {
            profile,
            destinations,
            universityChoices,
          };
          setConfig((current) => ({
            ...current,
            courseStart: profile.start,
            sponsorSupport: profile.income,
          }));
          setAccount((current) => ({
            ...current,
            name: profile.name,
            course: profile.course,
            countryTo: profile.study,
            countriesTo: destinations,
            university: profile.university,
            universityChoices: universityChoices ?? [],
          }));
          setFunded(Number(profile.funding));
          return true;
        }}
      />
    </WorkspaceCurrencyProvider>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
