import { useRef, useState } from "react";
import { Dialog } from "radix-ui";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Landmark,
  LockKeyhole,
  X,
} from "lucide-react";
import SetupCountrySelect from "./SetupCountrySelect";
import { getCountry } from "../../shared/study";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import "../styles/link-account.css";

const commonBanks: Record<string, string[]> = {
  China: [
    "Bank of China",
    "ICBC",
    "China Construction Bank",
    "Agricultural Bank of China",
    "Bank of Communications",
    "China Merchants Bank",
  ],
  "United Kingdom": [
    "HSBC",
    "Barclays",
    "Lloyds Bank",
    "NatWest",
    "Santander",
    "Monzo",
    "Starling Bank",
  ],
  "United States": [
    "Chase",
    "Bank of America",
    "Wells Fargo",
    "Citibank",
    "Capital One",
    "U.S. Bank",
  ],
};

export default function LinkAccount({
  open,
  onOpenChange,
  onSave,
  defaultCountry = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (country: string, label: string) => Promise<boolean>;
  defaultCountry?: string;
}) {
  const returnFocus = useRef(document.activeElement as HTMLElement | null);
  const [kind, setKind] = useState<"bank" | "card">("bank");
  const [step, setStep] = useState<"details" | "review" | "done">("details");
  const [name, setName] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [country, setCountry] = useState(defaultCountry);
  const [suffix, setSuffix] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const label = `${name.trim()} · ${kind === "bank" ? "Bank account" : "Credit card"} · •••• ${suffix} · Manual`;
  const Icon = kind === "bank" ? Landmark : CreditCard;
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!saving) onOpenChange(value);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="link-account-overlay" />
        <Dialog.Content
          className="link-account-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current?.focus();
          }}
          onEscapeKeyDown={(event) => {
            if (saving) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (saving) event.preventDefault();
          }}
        >
          <Dialog.Close
            className="link-account-close"
            aria-label="Close account linking"
            disabled={saving}
          >
            <X size={19} />
          </Dialog.Close>
          <span className="link-account-icon">
            <Icon size={24} aria-hidden="true" />
          </span>
          <Dialog.Title>
            {step === "done"
              ? "Account added"
              : step === "review"
                ? "Review your account"
                : "Link an account"}
          </Dialog.Title>
          <Dialog.Description>
            {step === "done"
              ? "Your account is saved in your profile."
              : "Keep your bank accounts and cards together in your study plan."}
          </Dialog.Description>
          {step === "details" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (
                  !getCountry(country) ||
                  !name.trim() ||
                  !/^\d{4}$/.test(suffix)
                ) {
                  setError(
                    "Enter a name, choose a country, and add the last four digits.",
                  );
                  return;
                }
                setError("");
                setStep("review");
              }}
            >
              <div
                className="link-account-options"
                role="group"
                aria-label="Account type"
              >
                <button
                  type="button"
                  aria-pressed={kind === "bank"}
                  onClick={() => {
                    setKind("bank");
                    setName("");
                    setSelectedBank("");
                  }}
                >
                  <Landmark size={19} />
                  Bank account
                </button>
                <button
                  type="button"
                  aria-pressed={kind === "card"}
                  onClick={() => {
                    setKind("card");
                    setName("");
                    setSelectedBank("");
                  }}
                >
                  <CreditCard size={19} />
                  Credit card
                </button>
              </div>
              {kind === "bank" && (
                <div className="link-account-field">
                  <span id="link-bank-label">Bank</span>
                  <Select
                    value={selectedBank}
                    onValueChange={(value) => {
                      setSelectedBank(value);
                      setName(value === "other" ? "" : value);
                    }}
                  >
                    <SelectTrigger
                      className="link-bank-trigger"
                      aria-labelledby="link-bank-label"
                    >
                      <SelectValue placeholder="Choose your bank" />
                    </SelectTrigger>
                    <SelectContent
                      className="ui-select-content link-account-bank-menu"
                      position="popper"
                      collisionPadding={16}
                    >
                      {(commonBanks[country] ?? []).map((bank) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">Other bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(kind === "card" || selectedBank === "other") && (
                <label className="link-account-field">
                  {kind === "bank" ? "Bank name" : "Card name"}
                  <input
                    required
                    maxLength={60}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={
                      kind === "bank"
                        ? "Enter your bank name"
                        : "e.g. Visa credit card"
                    }
                  />
                </label>
              )}
              <div className="link-account-fields">
                <SetupCountrySelect
                  disabled={false}
                  label="Account country"
                  value={country}
                  menuClassName="link-account-country-menu"
                  onChange={(value) => {
                    setCountry(value);
                    if (kind === "bank") {
                      setSelectedBank("");
                      setName("");
                    }
                  }}
                />
                <label className="link-account-field">
                  Last four digits
                  <input
                    required
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    value={suffix}
                    onChange={(event) =>
                      setSuffix(
                        event.target.value.replace(/\D/g, "").slice(0, 4),
                      )
                    }
                    placeholder="1234"
                    autoComplete="off"
                  />
                </label>
              </div>
              <p className="link-account-note">
                <LockKeyhole size={16} />
                Only enter the last four digits. No passwords or full card
                numbers.
              </p>
              {error && (
                <p role="alert" className="link-account-error">
                  {error}
                </p>
              )}
              <button className="primary link-account-submit">Continue</button>
            </form>
          )}
          {step === "review" && (
            <>
              <div className="link-account-review">
                <Icon size={22} />
                <div>
                  <strong>{name.trim()}</strong>
                  <span>
                    {kind === "bank" ? "Bank account" : "Credit card"} · ••••{" "}
                    {suffix}
                  </span>
                  <span>
                    {country} · {getCountry(country)?.currency}
                  </span>
                </div>
              </div>
              <p className="link-account-note">
                This saves a manual record. Live bank connection, balance
                syncing, and payments are not enabled.
              </p>
              {error && (
                <p role="alert" className="link-account-error">
                  {error}
                </p>
              )}
              <div className="link-account-actions">
                <button
                  className="secondary"
                  disabled={saving}
                  onClick={() => {
                    setError("");
                    setStep("details");
                  }}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  className="primary"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    setError("");
                    try {
                      if (await onSave(country, label)) setStep("done");
                      else
                        setError(
                          "Could not save your account. Please try again.",
                        );
                    } catch {
                      setError(
                        "Could not save your account. Please try again.",
                      );
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  {saving ? "Saving…" : "Add account"}
                </button>
              </div>
            </>
          )}
          {step === "done" && (
            <>
              <div className="link-account-success" role="status">
                <CheckCircle2 size={22} />
                <div>
                  <strong>{name.trim()}</strong>
                  <span>•••• {suffix} · Saved as a manual record</span>
                </div>
              </div>
              <Dialog.Close className="primary link-account-submit">
                Done
              </Dialog.Close>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
