import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Assistant } from "../src/features/agent/Chat";
import AgentTour from "../src/features/agent/AgentTour";
import "../src/styles/styles.css";
import "../src/components/ui/ui.css";
import "../src/styles/chat.css";
function Preview() {
  const [enabled, setEnabled] = useState(false);
  return (
    <Assistant
      aiEnabled={enabled}
      messages={[]}
      onSend={async () => true}
      onNew={() => {}}
      onHistory={() => {}}
      onConsent={async (value) => {
        setEnabled(value);
        return true;
      }}
      tour={(privacyOpen) => (
        <AgentTour accountId="privacy-preview" autoOpen={!privacyOpen} />
      )}
    />
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
