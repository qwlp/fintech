import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import LinkAccount from "../src/LinkAccount";
import "../src/styles.css";
import "../src/typography.css";
import "../src/components/ui/ui.css";
import "../src/dark-mode.css";
function Preview() {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState("");
  return (
    <>
      <button onClick={() => setOpen(true)}>Link bank or card</button>
      <output>{saved}</output>
      {open && (
        <LinkAccount
          open={open}
          onOpenChange={setOpen}
          defaultCountry="United Kingdom"
          onSave={async (country, label) => {
            if (label.startsWith("Fail")) throw new Error("Offline");
            setSaved(`${country}: ${label}`);
            return true;
          }}
        />
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
