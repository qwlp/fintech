import {
  Bot,
  CreditCard,
  LayoutDashboard,
  Route,
  UserRound,
} from "lucide-react";
import "./mobile-navigation.css";
export default function MobileNavigation({
  page,
  go,
}: {
  page: string;
  go: (
    page: "Dashboard" | "Move Planner" | "AI Agent" | "Payments" | "Profile",
  ) => void;
}) {
  return (
    <div className="mobile-navigation-shell">
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {(
          [
            ["Dashboard", LayoutDashboard, "Home"],
            ["Move Planner", Route, "Planner"],
            ["AI Agent", Bot, "Agent"],
            ["Payments", CreditCard, "Payments"],
            ["Profile", UserRound, "More"],
          ] as const
        ).map(([target, Icon, label]) => {
          const active =
            page === target ||
            (target === "Payments" && ["Wallet", "Exchange"].includes(page)) ||
            (target === "Profile" && ["Sponsors", "Security"].includes(page));
          return (
            <div
              key={target}
              className={`mobile-nav-item${active ? " is-active" : ""}`}
            >
              <button
                className="mobile-nav-link"
                onClick={() => go(target)}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={20} />
                <span>{label}</span>
              </button>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
