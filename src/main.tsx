import React from "react";
import ReactDOM from "react-dom/client";
import { AuthenticatedApp, AuthScreen } from "./Auth";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { convexClient } from "./lib/convex";
import "./styles.css";
import "./headerless.css";
import "./payments.css";
import "./experience.css";
import "./dashboard-surfaces.css";
import "./workspace-polish.css";
import "./typography.css";
import "./components/ui/ui.css";
import "./dark-mode.css";
import "./agent-layout.css";
import "./exchange.css";
import "./sidebar.css";
import "./payment-simple.css";
import "./tour.css";
import "./dashboard-visual.css";
import "./app-clean.css";
import "./motion.css";
import "./page-spacing.css";
import "./country-budget.css";
import "./chat.css";

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
