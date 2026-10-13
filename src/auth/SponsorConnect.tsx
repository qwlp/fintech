import { Dialog } from "radix-ui";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  UserPlus,
  ShieldCheck,
  Copy,
  Check,
  QrCode,
  RefreshCw,
  Users,
  Unplug,
  X,
  LoaderCircle,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { QRCodeSVG } from "qrcode.react";
import type { IScannerControls } from "@zxing/browser";
import { api } from "../../convex/_generated/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import "../styles/sponsor-connect.css";

function readCode(value: string) {
  if (/^[\da-f]{12}$/i.test(value.replace(/[\s-]/g, "")))
    return value.replace(/[\s-]/g, "");
  try {
    const url = new URL(value);
    if (url.origin !== location.origin) throw new Error();
    return new URLSearchParams(url.hash.split("?")[1]).get("invite") ?? "";
  } catch {
    return "";
  }
}

export default function SponsorConnect({
  role,
  renderSponsorAction,
  renderSponsorDetails,
}: {
  role: "Student" | "Sponsor";
  renderSponsorDetails?: (sponsor: { key: string; name: string }) => ReactNode;
  renderSponsorAction?: (sponsor: { key: string; name: string }) => ReactNode;
}) {
  const data = useQuery(api.sponsorLinks.overview, {});
  const create = useMutation(api.sponsorLinks.createInvite);
  const connect = useMutation(api.sponsorLinks.connect);
  const disconnect = useMutation(api.sponsorLinks.disconnect);
  const [code, setCode] = useState(
    () =>
      new URLSearchParams(location.hash.split("?")[1]).get("invite") ??
      sessionStorage.getItem("sponsor-invite") ??
      "",
  );
  const [inviteExpanded, setInviteExpanded] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [now, setNow] = useState(Date.now());
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!scanning || !video.current) return;
    const element = video.current;
    let cancelled = false;
    import("@zxing/browser")
      .then(({ BrowserQRCodeReader }) => {
        if (cancelled) return;
        return new BrowserQRCodeReader().decodeFromVideoDevice(
          undefined,
          element,
          (result) => {
            if (!result || cancelled) return;
            const found = readCode(result.getText());
            if (!found) {
              setMessage("Scan a MoveWire sponsor invitation.");
              return;
            }
            setCode(found);
            setScanning(false);
            setMessage(
              "Invitation scanned. Select Connect to student to accept.",
            );
          },
        );
      })
      .then((c) => {
        if (!c) return;
        if (cancelled) c.stop();
        else controls.current = c;
      })
      .catch(() => {
        if (!cancelled) {
          setScanning(false);
          setMessage(
            "Camera unavailable. Allow camera access or enter the shared code.",
          );
        }
      });
    return () => {
      cancelled = true;
      controls.current?.stop();
      controls.current = null;
    };
  }, [scanning]);
  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message.replace(/^.*Uncaught Error: /, "").split("\n")[0]
          : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const invite =
    data?.invite && data.invite.expiresAt > now ? data.invite : null;
  const link = invite
    ? `${location.origin}${location.pathname}#register-sponsor?invite=${invite.code}`
    : "";
  const acceptForm = (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = readCode(code);
          if (!parsed) {
            setMessage(
              "Enter the 12-character invitation code or paste the invitation link.",
            );
            return;
          }
          void run(async () => {
            await connect({ code: parsed });
            setCode("");
            sessionStorage.removeItem("sponsor-invite");
            if (location.hash.includes("invite=")) location.hash = "";
          }, "Connected to student.");
        }}
      >
        <label htmlFor="sponsor-invite-code">Invitation code or link</label>
        <Input
          spellCheck={false}
          autoCapitalize="characters"
          id="sponsor-invite-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ABCD-EF12-3456"
          autoComplete="off"
          required
        />
        <div className="connection-actions">
          <Button type="submit" disabled={busy || !data || !code.trim()}>
            {busy ? (
              <LoaderCircle size={16} className="connect-spin" />
            ) : (
              <ArrowUpRight size={16} />
            )}
            {busy ? "Connecting…" : "Connect"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            aria-pressed={scanning}
            aria-label={scanning ? "Stop camera" : "Scan QR"}
            title={scanning ? "Stop camera" : "Scan QR"}
            size="icon"
            onClick={() => setScanning((s) => !s)}
          >
            <QrCode size={16} />
          </Button>
        </div>
      </form>
      {scanning && (
        <video
          ref={video}
          className="invite-camera"
          autoPlay
          muted
          playsInline
          aria-label="Invitation QR scanner"
        />
      )}
    </>
  );
  const connectionList = (
    <>
      {!!data?.links.length && (
        <div className="connection-list">
          {!data ? (
            <p>Loading connections…</p>
          ) : !data.links.length ? (
            <p>No connections yet.</p>
          ) : (
            data.links.map((l) => (
              <div className="connection-row" key={l.id}>
                <div className="connection-avatar">
                  {l.name
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="connection-identity">
                  <strong>{l.name}</strong>
                  <span>{role === "Student" ? "Sponsor" : "Student"}</span>
                </div>
                <span
                  className="connection-badge"
                  title="Connected"
                  aria-label="Connected"
                >
                  <Check size={13} />
                  {role === "Student" && "Connected"}
                </span>
                {role === "Student" && renderSponsorAction?.(l)}
                {disconnecting === l.id ? (
                  <div className="disconnect-confirm">
                    <span>Disconnect?</span>
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await disconnect({ id: l.id });
                          setDisconnecting(null);
                        }, "Connection removed.")
                      }
                    >
                      Remove
                    </button>
                    <button onClick={() => setDisconnecting(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="disconnect-action"
                    disabled={busy}
                    aria-label={`Disconnect ${l.name}`}
                    title={`Disconnect ${l.name}`}
                    onClick={() => setDisconnecting(l.id)}
                  >
                    <Unplug size={17} />
                  </button>
                )}
                {role === "Student" && renderSponsorDetails?.(l)}
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
  if (role === "Sponsor")
    return (
      <motion.section
        className="sponsor-connect sponsor-accept"
        aria-label="Sponsor connections"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <SponsorConnectionLayout
          invitation={
            <>
              {acceptForm}
              {message && (
                <p className="connection-message" role="status">
                  {message}
                </p>
              )}
            </>
          }
          connections={connectionList}
          count={data?.links.length}
        />
      </motion.section>
    );
  return (
    <Dialog.Root open={inviteExpanded} onOpenChange={setInviteExpanded}>
      <motion.section
        className="sponsor-connect"
        aria-label="Sponsor connections"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {role === "Student" && (
          <div className="sponsor-list-heading">
            <h2>
              Your sponsors <span>{data?.links.length ?? 0}</span>
            </h2>
            <Dialog.Trigger asChild>
              <Button
                variant="outline"
                onClick={() => {
                  setMessage("");
                  if (data && !invite)
                    void run(() => create({}), "Invitation ready");
                }}
              >
                + Invite sponsor
              </Button>
            </Dialog.Trigger>
          </div>
        )}
        {role === "Student" ? (
          <Dialog.Portal>
            <Dialog.Overlay className="invite-modal-backdrop" />
            <Dialog.Content className="sponsor-connect invite-modal">
              <div className="invite-modal-heading">
                <div>
                  <Dialog.Title>Invite a sponsor</Dialog.Title>
                  <Dialog.Description className="sr-only">
                    Scan the QR or copy the code to connect.
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  className="invite-modal-close"
                  aria-label="Close invitation"
                >
                  <X size={18} />
                </Dialog.Close>
              </div>
              <div className="invite-workspace">
                <div className="invite-main">
                  {invite ? (
                    <>
                      <div className="invite-display invite-combined">
                        <div className="invite-qr">
                          <QRCodeSVG
                            value={link}
                            size={160}
                            marginSize={4}
                            title="Sponsor invitation QR code"
                          />
                        </div>
                        <div
                          className="invite-digits"
                          aria-label="Invitation code"
                        >
                          {invite.code.match(/.{1,4}/g)?.map((part, i) => (
                            <span key={i}>{part}</span>
                          ))}
                        </div>
                        <Button
                          className="invite-copy"
                          aria-label="Copy code"
                          disabled={busy}
                          onClick={() =>
                            run(
                              () => navigator.clipboard.writeText(invite.code),
                              "Code copied",
                            )
                          }
                        >
                          {message === "Code copied" ? (
                            <Check size={16} />
                          ) : (
                            <Copy size={16} />
                          )}
                          {message === "Code copied" ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      <div className="invite-footer">
                        <span>
                          {Math.max(
                            1,
                            Math.ceil((invite.expiresAt - now) / 3600000),
                          )}
                          h left · Single use
                        </span>
                        <button
                          disabled={busy}
                          aria-label="New code"
                          title="Generate a new invitation"
                          onClick={() =>
                            run(() => create({}), "New invitation ready")
                          }
                        >
                          <RefreshCw
                            size={14}
                            className={busy ? "connect-spin" : ""}
                          />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="invite-start">
                      <div className="invite-start-symbol">
                        <QrCode size={36} />
                      </div>
                      <Button
                        disabled={busy || !data}
                        onClick={() =>
                          run(() => create({}), "Invitation ready")
                        }
                      >
                        {busy ? (
                          <LoaderCircle size={16} className="connect-spin" />
                        ) : (
                          <ArrowUpRight size={16} />
                        )}
                        Create invitation
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              {message &&
                ![
                  "Invitation ready",
                  "New invitation ready",
                  "Code copied",
                ].includes(message) && (
                  <p className="connection-message" role="status">
                    {message}
                  </p>
                )}
            </Dialog.Content>
          </Dialog.Portal>
        ) : (
          acceptForm
        )}
        {message &&
          !inviteExpanded &&
          !["Code copied", "Invitation ready", "New invitation ready"].includes(
            message,
          ) && (
            <p role="status" className="connection-message">
              {message}
            </p>
          )}
        {connectionList}
      </motion.section>
    </Dialog.Root>
  );
}

export function SponsorConnectionLayout({
  invitation,
  connections,
  count,
}: {
  invitation: ReactNode;
  connections: ReactNode;
  count?: number;
}) {
  return (
    <div className="sd-connection-layout">
      <section className="sd-invite-card" aria-label="Add student">
        <div className="sd-connection-card-heading">
          <span className="sd-connection-symbol">
            <UserPlus size={21} />
          </span>
          <h2>Add student</h2>
        </div>
        <p className="sd-invite-hint">Paste an invite or scan QR.</p>
        {invitation}
        <div className="sd-invite-privacy">
          <ShieldCheck size={15} />
          <span>Student-controlled access</span>
        </div>
      </section>
      <section className="sd-linked-students" aria-label="Connected students">
        <div className="sd-connection-card-heading">
          <h2>Students</h2>
          {count !== undefined && <span className="sd-count">{count}</span>}
        </div>
        {count === undefined ? (
          <div className="sd-empty" role="status">
            <LoaderCircle className="connect-spin" size={24} />
          </div>
        ) : count > 0 ? (
          connections
        ) : (
          <div className="sd-empty">
            <Users size={28} />
            <h3>No connections yet</h3>
          </div>
        )}
      </section>
    </div>
  );
}
