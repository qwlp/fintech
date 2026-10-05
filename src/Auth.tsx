import SponsorDashboard from "./SponsorDashboard";
import Brand from "./Brand";
import { Component, type ReactNode, useEffect, useState } from "react";
import AppShowcase from "./AppShowcase";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import {
  GraduationCap,
  HeartHandshake,
  Landmark,
  ArrowRight,
  Eye,
  EyeOff,
  LogOut,
} from "lucide-react";
import App from "./App";
import Home from "./Home";
import Setup from "./Setup";
import { convexApi } from "./lib/convex";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import "./auth.css";

function usePageHash() {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => {
    const update = () => {
      setHash(location.hash);
      if (
        location.hash === "#home" ||
        location.hash === "#login" ||
        location.hash.startsWith("#register")
      )
        window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return hash;
}
export function AuthScreen({ configured = true }: { configured?: boolean }) {
  const hash = usePageHash();
  const invite = new URLSearchParams(hash.split("?")[1]).get("invite");
  if (invite && /^[A-Fa-f0-9]{12}$/.test(invite))
    sessionStorage.setItem("sponsor-invite", invite);
  if (!hash.startsWith("#register") && hash !== "#login") return <Home />;
  return configured ? (
    <AuthForm
      key={hash}
      registerInitially={hash.startsWith("#register")}
      initialRole={hash.startsWith("#register-sponsor") ? "Sponsor" : "Student"}
    />
  ) : (
    <main className="auth-shell">
      <section className="auth-panel">
        <Landmark size={32} />
        <h1>Connect MoveWise</h1>
        <p>
          Configure VITE_CONVEX_URL and run the Convex backend to enable secure
          accounts.
        </p>
      </section>
    </main>
  );
}
function AuthForm({
  registerInitially,
  initialRole,
}: {
  registerInitially: boolean;
  initialRole: string;
}) {
  const { signIn } = useAuthActions();
  const [register, setRegister] = useState(registerInitially);
  const [role, setRole] = useState(initialRole);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    if (register && !String(data.get("name")).trim()) {
      setError("Enter your full name.");
      return;
    }
    if (register && data.get("password") !== data.get("confirm")) {
      setError("Your passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signIn("password", {
        flow: register ? "signUp" : "signIn",
        email: String(data.get("email")).trim().toLowerCase(),
        password: String(data.get("password")),
        ...(register ? { name: String(data.get("name")).trim(), role } : {}),
      });
    } catch {
      setError(
        register
          ? "Could not create your account. This email may already be registered. Try signing in."
          : "Could not sign in. Check your email and password and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={`auth-shell ${register ? "auth-register" : "auth-login"}`}>
      <section className="auth-story">
        <Brand href="#home" />
        <div className="auth-visual">
          <AppShowcase compact />
        </div>
      </section>
      <section className="auth-panel">
        <a className="auth-back" href="#home">
          ← Back to home
        </a>
        <div className="auth-mobile-brand">
          <Brand href="#home" />
        </div>
        <h2>{register ? "Create your account" : "Sign in to your account"}</h2>
        <form onSubmit={submit} aria-busy={busy}>
          {register && (
            <>
              <fieldset className="auth-roles">
                <legend>Account type</legend>
                {["Student", "Sponsor"].map((type) => (
                  <label key={type} className={role === type ? "selected" : ""}>
                    <input
                      type="radio"
                      name="role"
                      value={type}
                      checked={role === type}
                      onChange={() => setRole(type)}
                      disabled={busy}
                    />
                    {type === "Student" ? (
                      <GraduationCap />
                    ) : (
                      <HeartHandshake />
                    )}
                    <strong>{type}</strong>
                  </label>
                ))}
              </fieldset>
              <label className="auth-field">
                Full name
                <Input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={100}
                  disabled={busy}
                  placeholder="Your full name"
                />
              </label>
            </>
          )}
          <label className="auth-field">
            Email address
            <Input
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={busy}
              placeholder="you@example.com"
            />
          </label>
          <label className="auth-field">
            Password
            <div className="auth-password">
              <Input
                name="password"
                type={visible ? "text" : "password"}
                autoComplete={register ? "new-password" : "current-password"}
                required
                minLength={register ? 8 : undefined}
                disabled={busy}
                placeholder={
                  register ? "At least 8 characters" : "Enter your password"
                }
              />
              <button
                type="button"
                aria-label={visible ? "Hide password" : "Show password"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {register && (
            <label className="auth-field">
              Confirm password
              <Input
                name="confirm"
                type={visible ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                disabled={busy}
                placeholder="Enter your password again"
              />
            </label>
          )}
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <Button className="auth-submit" type="submit" disabled={busy}>
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
            <ArrowRight size={18} />
          </Button>
        </form>
        <p className="auth-switch">
          {register ? "Already have an account?" : "New to MoveWise?"}{" "}
          <button
            disabled={busy}
            onClick={() => {
              setRegister(!register);
              setError("");
              location.hash = register ? "login" : "register";
            }}
          >
            {register ? "Sign in" : "Create an account"}
          </button>
        </p>
      </section>
    </main>
  );
}
export function AuthenticatedApp() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  if (isLoading)
    return (
      <main className="connection-screen" role="status">
        Restoring your session…
      </main>
    );
  return isAuthenticated ? (
    <WorkspaceRecovery>
      <AccountWorkspace />
    </WorkspaceRecovery>
  ) : (
    <AuthScreen />
  );
}
class WorkspaceBoundary extends Component<
  { children: ReactNode; onSignOut: () => Promise<void> },
  { failed: boolean; busy: boolean; message: string }
> {
  state = { failed: false, busy: false, message: "" };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="connection-screen">
        <section className="connection-content" role="alert">
          <Landmark size={32} />
          <h1>We couldn’t open your workspace.</h1>
          <p>Try reloading, or sign out and sign in again.</p>
          <Button onClick={() => location.reload()}>Reload workspace</Button>
          <Button
            variant="outline"
            disabled={this.state.busy}
            onClick={async () => {
              this.setState({ busy: true, message: "" });
              try {
                await this.props.onSignOut();
              } catch {
                this.setState({
                  busy: false,
                  message: "Could not sign out. Please reload and try again.",
                });
              }
            }}
          >
            Sign out
          </Button>
          {this.state.message && <p>{this.state.message}</p>}
        </section>
      </main>
    );
  }
}
function WorkspaceRecovery({ children }: { children: ReactNode }) {
  const { signOut } = useAuthActions();
  return (
    <WorkspaceBoundary
      onSignOut={async () => {
        await signOut();
        location.hash = "login";
      }}
    >
      {children}
    </WorkspaceBoundary>
  );
}
function AccountWorkspace() {
  const hash = usePageHash();
  const accountData = useQuery(convexApi.bootstrap, {});
  const { signOut } = useAuthActions();
  const [error, setError] = useState("");
  useEffect(() => {
    if (accountData?.account.setupComplete === false && hash !== "#setup")
      location.hash = "setup";
  }, [accountData?.account.setupComplete, hash]);
  const logout = async () => {
    try {
      await signOut();
      location.hash = "home";
    } catch {
      setError("Could not sign out. Please try again.");
    }
  };
  if (!accountData)
    return (
      <main className="connection-screen" role="status">
        Loading your account…
      </main>
    );
  if (hash === "#setup" || accountData.account.setupComplete === false)
    return (
      <Setup
        account={accountData.account}
        config={accountData.config.profile}
        onDone={() => {
          location.hash = "workspace";
        }}
        onSignOut={logout}
      />
    );
  if (accountData.account.role === "Sponsor")
    return (
      <main className="sponsor-workspace">
        <header>
          <Brand href="/" />
          <Button
            variant="outline"
            onClick={() => {
              location.hash = "setup";
            }}
          >
            Set up account
          </Button>
          <Button variant="outline" onClick={logout}>
            <LogOut size={16} />
            Sign out
          </Button>
        </header>
        <section className="sponsor-account-content">
          <SponsorDashboard name={accountData.account.name} />
          {error && <p role="alert">{error}</p>}
        </section>
      </main>
    );
  return (
    <>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      <App onSignOut={logout} />
    </>
  );
}
