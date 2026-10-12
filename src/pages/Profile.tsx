import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  GraduationCap,
  Home,
  Landmark,
  MapPin,
  Plus,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import FundingConfirmation from "../FundingConfirmation";
import LinkAccount from "../auth/LinkAccount";
import SectionHelp from "../SectionHelp";
import SetupCountrySelect from "../auth/SetupCountrySelect";
import UniversitySelect from "../auth/UniversitySelect";
import { useWorkspaceCurrency, useWorkspaceMoney } from "../WorkspaceCurrency";
import { formatCurrency, studyCurrency, convertMoney } from "../../shared/currency";
import { countries, getCountry, getUniversity } from "../../shared/study";
import type { Page } from "../types/database";

export function Profile({
  go,
  announce,
  account,
  config,
  totals,
  onSave,
  onAddCountry,
}: {
  announce: (message: string) => void;
  account?: any;
  config?: any;
  totals: { funded: number; gap: number; coverage: number };
  onSave: (profile: Record<string, string>) => Promise<boolean>;
  go: (page: Page) => void;
  onAddCountry: (country: string, label: string) => Promise<boolean>;
}) {
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingFunding, setConfirmingFunding] = useState(false);
  const [addingCountry, setAddingCountry] = useState(false);
  const [profile, setProfile] = useState({
    name: account?.name ?? "",
    home: getCountry(account?.countryFrom ?? "")?.name ?? "",
    study: getCountry(account?.countryTo ?? "")?.name ?? "",
    university:
      getUniversity(account?.countryTo ?? "", account?.university ?? "") ?? "",
    course: account?.course ?? "",
    start: config?.courseStart ?? "",
    status: config?.financialStatus ?? "",
    income: config?.sponsorSupport ?? "",
    funding: String(totals.funded),
  });

  const profileFieldIcons = {
    name: UserRound,
    home: Home,
    study: MapPin,
    university: Landmark,
    course: GraduationCap,
    start: CalendarDays,
    status: TrendingUp,
    income: UsersRound,
    funding: WalletCards,
  };

  const update = (key: keyof typeof profile, value: string) =>
    setProfile((current) => ({
      ...current,
      [key]: value,
      ...(key === "study" && value !== current.study
        ? {
            university: "",
            funding: String(
              convertMoney(
                Number(current.funding),
                studyCurrency(current.study),
                studyCurrency(value),
              ),
            ),
          }
        : {}),
    }));

  useEffect(() => {
    if (!account || editing) return;
    setProfile({
      name: account.name,
      home: getCountry(account.countryFrom)?.name ?? "",
      study: getCountry(account.countryTo)?.name ?? "",
      university: getUniversity(account.countryTo, account.university) ?? "",
      course: account.course,
      start: config?.courseStart ?? "",
      status: config?.financialStatus ?? "",
      income: config?.sponsorSupport ?? "",
      funding: String(totals.funded),
    });
  }, [account, config, totals.funded, editing]);

  const saveProfileEdits = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await onSave(profile);
      setConfirmingFunding(false);
      if (!saved) return;
      announce("Profile saved");
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="profile-workspace"
      className={`page-stack profile-page ${editing ? "profile-editing" : "profile-reading"}`}
    >
      <FundingConfirmation
        open={confirmingFunding}
        amount={Number(profile.funding)}
        currency={studyCurrency(profile.study)}
        busy={saving}
        onOpenChange={setConfirmingFunding}
        onConfirm={() => void saveProfileEdits()}
      />
      <section className="page-intro">
        <div>
          <h2>
            <UserRound size={22} aria-hidden="true" />
            Profile
          </h2>
        </div>
        <div className="profile-edit-actions">
          {editing && (
            <button
              className="secondary"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          )}
          <button
            className="primary"
            aria-label={editing ? "Save profile" : "Edit profile"}
            disabled={saving}
            onClick={async () => {
              if (editing) {
                if (
                  !profile.funding.trim() ||
                  !Number.isFinite(Number(profile.funding)) ||
                  Number(profile.funding) < 0
                ) {
                  announce(
                    "Enter a valid confirmed funding amount of zero or more",
                  );
                  return;
                }
                if (
                  Number(profile.funding) !== totals.funded ||
                  studyCurrency(profile.study) !== currency
                ) {
                  setConfirmingFunding(true);
                } else {
                  await saveProfileEdits();
                }
                return;
              }
              setEditing(!editing);
            }}
          >
            {editing ? (
              <>
                <Check aria-hidden="true" />
                <span className="profile-label-desktop">
                  {saving ? "Saving…" : "Save profile"}
                </span>
                <span className="profile-label-mobile">
                  {saving ? "Saving…" : "Save"}
                </span>
              </>
            ) : (
              <>
                <Settings aria-hidden="true" />
                <span className="profile-label-desktop">Edit profile</span>
                <span className="profile-label-mobile">Edit</span>
              </>
            )}
          </button>
          <SectionHelp section="Profile" />
        </div>
      </section>
      <div className="profile-secondary-nav">
        <Button variant="outline" onClick={() => go("Sponsors")}>
          <UsersRound size={16} aria-hidden="true" />
          Sponsors
        </Button>
        <Button
          variant="outline"
          aria-label="Security & activity"
          onClick={() => go("Security")}
        >
          <ShieldCheck size={16} aria-hidden="true" />
          <span className="profile-label-desktop">Security & activity</span>
          <span className="profile-label-mobile">Security</span>
        </Button>
      </div>
      <section className="profile-hero">
        <div className="profile-avatar">{account?.initials ?? "DC"}</div>
        <div>
          <h3>{profile.name}</h3>
          <span>
            <MapPin /> {profile.home} <ArrowRight /> {profile.study}
          </span>
          <p
            className="setup-directory-note profile-currencies"
            aria-label="Home and study currencies"
          >
            <WalletCards size={13} aria-hidden="true" />
            {getCountry(profile.home)?.currency ?? "—"}
            <ArrowRight size={12} aria-hidden="true" />
            {getCountry(profile.study)?.currency ?? currency}
          </p>
        </div>
      </section>
      <div className="profile-grid">
        <section className="profile-section">
          <div className="section-heading">
            <div>
              <h3>
                <GraduationCap size={18} aria-hidden="true" />
                Study
              </h3>
            </div>
          </div>
          <div className="field-grid">
            {(
              [
                ["name", "Full name"],
                ["home", "Home country"],
                ["study", "Country of study"],
                ["university", "University"],
                ["course", "Programme"],
                ["start", "Course start"],
              ] as const
            )
              .filter(
                ([key]) =>
                  editing || !["name", "home", "study", "status"].includes(key),
              )
              .map(([key, label]) => {
                const Icon = profileFieldIcons[key];
                return (
                  <div
                    className="setup-field profile-data-row"
                    data-field={key}
                    key={key}
                  >
                    {!editing && (
                      <span className="profile-field-icon">
                        <Icon size={17} aria-hidden="true" />
                      </span>
                    )}
                    {!(
                      editing && ["home", "study", "university"].includes(key)
                    ) && <label htmlFor={`profile-${key}`}>{label}</label>}
                    {editing && (key === "home" || key === "study") ? (
                      <SetupCountrySelect
                        label={label}
                        value={profile[key]}
                        onChange={(value) => update(key, value)}
                        disabled={saving}
                      />
                    ) : editing && key === "university" ? (
                      <UniversitySelect
                        country={profile.study}
                        value={profile.university}
                        onChange={(value) => update("university", value)}
                        disabled={saving}
                      />
                    ) : editing ? (
                      <Input
                        id={`profile-${key}`}
                        value={profile[key]}
                        onChange={(e) => update(key, e.target.value)}
                      />
                    ) : (
                      <strong className="profile-value">
                        {profile[key] || "—"}
                      </strong>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
        <section className="profile-section">
          <div className="section-heading">
            <div>
              <h3>
                <WalletCards size={18} aria-hidden="true" />
                Funding
              </h3>
            </div>
            {!editing && (
              <button
                className="icon-text"
                aria-label="Edit funding"
                title="Edit funding"
                onClick={() => {
                  setEditing(true);
                  window.requestAnimationFrame(() =>
                    document.getElementById("profile-income")?.focus(),
                  );
                }}
              >
                <Settings size={16} aria-hidden="true" />
                <span className="profile-label-desktop">Edit funding</span>
              </button>
            )}
          </div>
          <div className="field-grid">
            {(
              [
                ["status", "Financial status"],
                ["income", "Sponsor support"],
                ["funding", "Confirmed funding"],
              ] as const
            )
              .filter(
                ([key]) =>
                  editing || !["name", "home", "study", "status"].includes(key),
              )
              .map(([key, label]) => {
                const Icon = profileFieldIcons[key];
                return (
                  <label
                    className="profile-data-row"
                    data-field={key}
                    key={key}
                  >
                    {!editing && (
                      <span className="profile-field-icon">
                        <Icon size={17} aria-hidden="true" />
                      </span>
                    )}
                    <span className="profile-data-label">
                      {key === "funding" && editing
                        ? `Confirmed funding (${getCountry(profile.study)?.currency ?? currency})`
                        : label}
                    </span>
                    {editing ? (
                      <Input
                        id={`profile-${key}`}
                        aria-label={
                          key === "funding"
                            ? `Confirmed funding in ${getCountry(profile.study)?.currency ?? currency}`
                            : label
                        }
                        type={key === "funding" ? "number" : "text"}
                        min={key === "funding" ? 0 : undefined}
                        money={key === "funding"}
                        value={profile[key]}
                        onChange={(e) => update(key, e.target.value)}
                      />
                    ) : (
                      <strong className="profile-value">
                        {key === "funding"
                          ? formatCurrency(
                              Number(profile.funding),
                              getCountry(profile.study)?.currency ?? currency,
                            )
                          : profile[key] || "—"}
                      </strong>
                    )}
                  </label>
                );
              })}
          </div>
          <div className="profile-summary">
            <span>
              <CheckCircle2 /> {Math.round(totals.coverage)}% funded
            </span>
            <strong>{formatMoney(totals.gap)} gap</strong>
            <div
              className="profile-funding-track"
              role="progressbar"
              aria-label="Funding coverage"
              aria-valuenow={Math.round(totals.coverage)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${totals.coverage}%` }} />
            </div>
          </div>
        </section>
      </div>
      <section className="profile-section country-accounts">
        <div className="section-heading">
          <div>
            <h3>
              <Landmark size={18} aria-hidden="true" />
              Accounts
            </h3>
          </div>
          <button className="secondary" onClick={() => setAddingCountry(true)}>
            <Plus size={16} /> Link bank or card
          </button>
        </div>
        {(config?.countryAccounts ?? [])
          .filter((item: { country: string }) => getCountry(item.country))
          .map((item: { country: string; label: string }, index: number) => (
            <div className="line-item" key={`${item.country}-${index}`}>
              <MapPin size={18} />
              <div>
                <strong>{item.country}</strong>
                <small>
                  {item.label} ·{" "}
                  {getCountry(item.country)?.currency ?? "Currency unavailable"}
                </small>
              </div>
            </div>
          ))}
        {!(config?.countryAccounts ?? []).some((item: { country: string }) =>
          getCountry(item.country),
        ) &&
          !addingCountry && (
            <p className="country-account-hint">
              Add a bank account or credit card to keep your account details in
              one place.
            </p>
          )}
        {addingCountry && (
          <LinkAccount
            open={addingCountry}
            onOpenChange={setAddingCountry}
            defaultCountry={profile.home}
            onSave={async (country, label) => {
              const saved = await onAddCountry(country, label);
              if (saved) announce("Account added to your profile");
              return saved;
            }}
          />
        )}
      </section>
    </div>
  );
}
