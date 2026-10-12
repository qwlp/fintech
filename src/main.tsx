import React from "react";
import ReactDOM from "react-dom/client";
import { AuthenticatedApp, AuthScreen } from "./auth/Auth";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { convexClient } from "./lib/convex";
import "./styles/styles.css";
import "./styles/headerless.css";
import "./styles/payments.css";
import "./styles/experience.css";
import "./styles/dashboard-surfaces.css";
import "./styles/workspace-polish.css";
import "./styles/typography.css";
import "./components/ui/ui.css";
import "./styles/dark-mode.css";
import "./styles/agent-layout.css";
import "./styles/exchange.css";
import "./styles/sidebar.css";
import "./styles/payment-simple.css";
import "./styles/tour.css";
import "./styles/dashboard-visual.css";
import "./styles/app-clean.css";
import "./styles/motion.css";
import "./styles/page-spacing.css";
import "./styles/country-budget.css";
import "./styles/chat.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {convexClient ? (
      <ConvexAuthProvider client={convexClient}>
        <AuthenticatedApp />
      </ConvexAuthProvider>
    ) : (
      <AuthScreen configured={false} />
    )}
  </React.StrictMode>,
);
