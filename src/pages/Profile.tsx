import LinkedAccountRow from "../components/LinkedAccountRow";
import ProfilePhoto from "../components/ProfilePhoto";
import { AlertDialog } from "radix-ui";
import AccountMenu from "../components/AccountMenu";
import UniversityLabel from "../components/UniversityLabel";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Pencil,
  GraduationCap,
  Home,
  Landmark,
  MapPin,
  MoreHorizontal,
  Plus,
  Settings,
  ShieldCheck,
  TrendingUp,
  Trash2,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { DatePicker } from "../components/ui/date-picker";
import "../styles/profile-workflow.css";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import CourseSelect from "../components/CourseSelect";
import FundingConfirmation from "../features/payments/FundingConfirmation";
import LinkAccount from "../auth/LinkAccount";
import SectionHelp from "../components/SectionHelp";
import DestinationCountries from "../auth/DestinationCountries";
import SetupCountrySelect from "../auth/SetupCountrySelect";
import UniversityMultiSelect from "../auth/UniversityMultiSelect";
import {
  useWorkspaceCurrency,
  useWorkspaceMoney,
} from "../components/WorkspaceCurrency";
import {
  formatCurrency,
  studyCurrency,
  convertMoney,
} from "../../shared/currency";
import {
  universitySelections,
  destinationCountries,
  getCountry,
  getUniversity,
} from "../../shared/study";
import type { Page } from "../types/database";

export function Profile({
  go,
  announce,
  account,
  config,
  totals,
  onSave,
  onAddCountry,
  onSetup,
  onSignOut,
  onRemoveCountry,
  onUploadPhoto,
  onRemovePhoto,
}: {
  announce: (message: string) => void;
  account?: any;
  config?: any;
  totals: { funded: number; gap: number; coverage: number };
  onSave: (
    profile: Record<string, string>,
    destinations: string[],
    universityChoices?: string[],
  ) => Promise<boolean>;
  go: (page: Page) => void;
  onAddCountry: (country: string, label: string) => Promise<boolean>;
  onSetup?: () => void;
  onSignOut?: () => void;
  onRemoveCountry?: (item: {
    id?: string;
    country: string;
    label: string;
    index: number;
  }) => Promise<boolean>;
  onUploadPhoto?: (photo: Blob) => Promise<boolean>;
  onRemovePhoto?: () => Promise<boolean>;
}) {
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();

  const [removingAccount, setRemovingAccount] = useState<{
    id?: string;
    country: string;
    label: string;
    index: number;
  } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editSection, setEditSection] = useState<"all" | "study" | "funding">(
    "all",
  );
  const [error, setError] = useState("");
  const editingStudy = editing && editSection !== "funding";
  const universityTrigger = useRef<HTMLButtonElement>(null);
  const [universityRequired, setUniversityRequired] = useState(false);
  const editingFunding = editing && editSection !== "study";
  const [saving, setSaving] = useState(false);
  const [confirmingFunding, setConfirmingFunding] = useState(false);
  const [addingCountry, setAddingCountry] = useState(false);
  const [destinations, setDestinations] = useState<string[]>(
    destinationCountries(account ?? { countryTo: "" }),
  );
  const [universityChoices, setUniversityChoices] = useState<string[]>(
    universitySelections(account ?? { university: "" }),
  );
  const savedProfile = {
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
  };
  const [profile, setProfile] = useState(savedProfile);
  const hasChanges =
    JSON.stringify(universityChoices) !==
      JSON.stringify(universitySelections(account ?? { university: "" })) ||
    JSON.stringify(profile) !== JSON.stringify(savedProfile) ||
    JSON.stringify([...destinations].sort()) !==
      JSON.stringify(destinationCountries(account ?? { countryTo: "" }).sort());

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
      ...((key === "university" && value !== current.university) ||
      (key === "study" && value !== current.study)
        ? { course: "" }
        : {}),
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
    setDestinations(destinationCountries(account));
    setUniversityChoices(universitySelections(account));
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

  useEffect(() => {
    if (!editing || !hasChanges) return;
    const protectDraft = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protectDraft);
    return () => window.removeEventListener("beforeunload", protectDraft);
  }, [editing, hasChanges]);

  const saveProfileEdits = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await onSave(profile, destinations, universityChoices);
      setConfirmingFunding(false);
      if (!saved) {
        setError("Couldn’t save your changes. Please try again.");
        return;
      }
      announce("Profile saved");
      setEditing(false);
      setError("");
    } catch {
      setConfirmingFunding(false);
      setError("Couldn’t save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const requestSave = async () => {
    if (saving || !hasChanges) return;
    setError("");
    if (!profile.name.trim()) {
      setError("Enter your full name");
      document.getElementById("profile-name")?.focus();
      return;
    }
    if (editing) {
      if (!profile.home || (account?.role === "Student" && !profile.study)) {
        setError("Choose your home country and at least one destination");
        return;
      }
      if (
        !profile.funding.trim() ||
        !Number.isFinite(Number(profile.funding)) ||
        Number(profile.funding) < 0
      ) {
        setError("Enter a valid confirmed funding amount of zero or more");
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
  };
  const beginEdit = (section: "all" | "study" | "funding") => {
    setEditSection(section);
    setError("");
    setEditing(true);
    window.requestAnimationFrame(() =>
      document
        .getElementById(
          section === "funding" ? "profile-funding" : "profile-name",
        )
        ?.focus(),
    );
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void requestSave();
      }}
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
          {onSetup && onSignOut && (
            <AccountMenu onSetup={onSetup} onSignOut={onSignOut}>
              <button
                type="button"
                className="profile-account-menu-trigger"
                aria-label="Open account menu"
              >
                <MoreHorizontal size={18} aria-hidden="true" />
              </button>
            </AccountMenu>
          )}
          {!editing && (
            <button
              type="button"
              className="primary"
              aria-label="Edit profile"
              onClick={() => beginEdit("all")}
            >
              <Pencil size={16} aria-hidden="true" />
              <span className="profile-label-desktop">Edit profile</span>
              <span className="profile-label-mobile">Edit</span>
            </button>
          )}
          <SectionHelp section="Profile" />
        </div>
      </section>
      <div className="profile-secondary-nav">
        <Button type="button" variant="outline" onClick={() => go("Sponsors")}>
          <UsersRound size={16} aria-hidden="true" />
          Sponsors
        </Button>
        <Button
          type="button"
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
        <ProfilePhoto
          url={account?.avatarUrl}
          initials={account?.initials ?? "DC"}
          onUpload={onUploadPhoto}
          onRemove={onRemovePhoto}
        />
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
        <section
          className={`profile-section profile-study ${editingStudy ? "is-editing" : ""}`}
        >
          <div className="section-heading">
            <div>
              <h3>
                <GraduationCap size={18} aria-hidden="true" />
                Study
              </h3>
            </div>
            {!editing && (
              <button
                type="button"
                className="icon-text"
                aria-label="Edit study details"
                onClick={() => beginEdit("study")}
              >
                <Pencil size={16} aria-hidden="true" />
                Edit study
              </button>
            )}
          </div>
          {!editingStudy && (
            <div className="setup-field destination-countries">
              <span>Destination countries</span>
              <ul className="destination-list">
                {destinations.map((country) => (
                  <li key={country}>
                    <span className="destination-name">
                      <span aria-hidden="true">
                        {getCountry(country)?.flag}
                      </span>
                      {country}
                      <small>{getCountry(country)?.currency}</small>
                    </span>
                    {country === profile.study && <small>Primary</small>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="field-grid">
            {(
              [
                ["name", "Full name"],
                ["home", "Home country"],
                ["study", "Country of study"],
                ["university", "Universities"],
                ["course", "Programme"],
                ["start", "Course start"],
              ] as const
            )
              .filter(
                ([key]) =>
                  editingStudy ||
                  !["name", "home", "study", "status"].includes(key),
              )
              .map(([key, label]) => {
                const Icon = profileFieldIcons[key];
                return (
                  <div
                    className="setup-field profile-data-row"
                    data-field={key}
                    key={key}
                  >
                    {!editingStudy && (
                      <span className="profile-field-icon">
                        <Icon size={17} aria-hidden="true" />
                      </span>
                    )}
                    {!(
                      editingStudy &&
                      ["home", "study", "university", "course"].includes(key)
                    ) && <label htmlFor={`profile-${key}`}>{label}</label>}
                    {editingStudy && key === "study" ? (
                      <DestinationCountries
                        concise
                        value={destinations}
                        primary={profile.study}
                        disabled={saving}
                        onChange={(selected, primary) => {
                          setDestinations(selected);
                          const choices = universityChoices.filter((name) =>
                            selected.some((country) =>
                              getUniversity(country, name),
                            ),
                          );
                          setUniversityChoices(choices);
                          update("study", primary);
                          setProfile((current) => ({
                            ...current,
                            university:
                              choices.find((name) =>
                                getUniversity(primary, name),
                              ) ?? "",
                          }));
                        }}
                      />
                    ) : editingStudy && key === "home" ? (
                      <SetupCountrySelect
                        label={label}
                        value={profile[key]}
                        onChange={(value) => update(key, value)}
                        disabled={saving}
                      />
                    ) : editingStudy && key === "university" ? (
                      <UniversityMultiSelect
                        triggerRef={universityTrigger}
                        guidance={
                          universityRequired && !profile.university
                            ? `Choose a university in ${profile.study} first.`
                            : undefined
                        }
                        primary={profile.study}
                        countries={destinations}
                        value={universityChoices}
                        onChange={(choices) => {
                          setUniversityChoices(choices);
                          update(
                            "university",
                            choices.find((name) =>
                              getUniversity(profile.study, name),
                            ) ?? "",
                          );
                        }}
                        disabled={saving}
                      />
                    ) : editingStudy && key === "course" ? (
                      <CourseSelect
                        onUniversityRequired={() => {
                          setUniversityRequired(true);
                          universityTrigger.current?.scrollIntoView({
                            block: "nearest",
                            behavior: "smooth",
                          });
                          universityTrigger.current?.focus({
                            preventScroll: true,
                          });
                        }}
                        university={profile.university}
                        value={profile.course}
                        onChange={(value) => update("course", value)}
                        disabled={saving}
                      />
                    ) : editingStudy && key === "start" ? (
                      <DatePicker
                        label="Course start"
                        compact
                        value={
                          profile.start.length === 7
                            ? `${profile.start}-01`
                            : profile.start
                        }
                        onChange={(value) => update("start", value)}
                        disabled={saving}
                      />
                    ) : editingStudy ? (
                      <Input
                        id={`profile-${key}`}
                        disabled={saving}
                        value={profile[key]}
                        onChange={(e) => update(key, e.target.value)}
                      />
                    ) : (
                      <strong
                        className={`profile-value ${key === "university" ? "university-shortlist-values" : ""}`}
                      >
                        {key === "university"
                          ? universityChoices.length
                            ? universityChoices.map((name) => (
                                <UniversityLabel key={name} name={name} />
                              ))
                            : "—"
                          : profile[key] || "—"}
                      </strong>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
        <section
          className={`profile-section profile-funding ${editingFunding ? "is-editing" : ""}`}
        >
          <div className="section-heading">
            <div>
              <h3>
                <WalletCards size={18} aria-hidden="true" />
                Funding
              </h3>
            </div>
            {!editing && (
              <button
                type="button"
                className="icon-text"
                aria-label="Edit funding"
                title="Edit funding"
                onClick={() => beginEdit("funding")}
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
                  editingFunding ||
                  !["name", "home", "study", "status"].includes(key),
              )
              .map(([key, label]) => {
                const Icon = profileFieldIcons[key];
                return (
                  <label
                    className="profile-data-row"
                    data-field={key}
                    key={key}
                  >
                    {!editingFunding && (
                      <span className="profile-field-icon">
                        <Icon size={17} aria-hidden="true" />
                      </span>
                    )}
                    <span className="profile-data-label">
                      {key === "funding" && editingFunding
                        ? `Confirmed funding (${getCountry(profile.study)?.currency ?? currency})`
                        : label}
                    </span>
                    {editingFunding ? (
                      <Input
                        id={`profile-${key}`}
                        disabled={saving}
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
          <button
            type="button"
            className="secondary"
            onClick={() => setAddingCountry(true)}
          >
            <Plus size={16} /> Link bank or card
          </button>
        </div>
        <div className="linked-accounts-list">
          {(config?.countryAccounts ?? [])
            .map(
              (
                item: { id?: string; country: string; label: string },
                index: number,
              ) => ({ item, index }),
            )
            .filter(({ item }: { item: { country: string } }) =>
              getCountry(item.country),
            )
            .map(
              ({
                item,
                index,
              }: {
                item: { id?: string; country: string; label: string };
                index: number;
              }) => {
                return (
                  <LinkedAccountRow
                    key={item.id ?? `${item.country}-${index}`}
                    item={item}
                    index={index}
                    disabled={removing}
                    onRemove={
                      onRemoveCountry
                        ? (selected) => {
                            setRemoveError("");
                            setRemovingAccount(selected);
                          }
                        : undefined
                    }
                  />
                );
              },
            )}
        </div>
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
      <AlertDialog.Root
        open={!!removingAccount}
        onOpenChange={(open) => {
          if (!open && !removing) {
            setRemovingAccount(null);
            setRemoveError("");
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="funding-confirmation-overlay" />
          <AlertDialog.Content
            className="funding-confirmation-dialog"
            onEscapeKeyDown={(event) => {
              if (removing) event.preventDefault();
            }}
          >
            <AlertDialog.Title>Remove saved account?</AlertDialog.Title>
            <AlertDialog.Description>
              {removingAccount?.label} · {removingAccount?.country}. This
              removes the saved details from your profile. Your bank account,
              wallet balances and payment history stay intact.
            </AlertDialog.Description>
            {removeError && <p role="alert">{removeError}</p>}
            <div className="funding-confirmation-actions">
              <AlertDialog.Cancel asChild>
                <Button type="button" variant="outline" disabled={removing}>
                  Keep account
                </Button>
              </AlertDialog.Cancel>
              <Button
                type="button"
                disabled={removing}
                onClick={async () => {
                  if (!removingAccount || removing) return;
                  setRemoving(true);
                  setRemoveError("");
                  try {
                    if (!(await onRemoveCountry?.(removingAccount)))
                      throw new Error("Remove failed");
                    setRemovingAccount(null);
                    announce("Saved account removed");
                  } catch {
                    setRemoveError(
                      "Couldn’t remove this account. Refresh your profile and try again.",
                    );
                  } finally {
                    setRemoving(false);
                  }
                }}
              >
                <Trash2 size={16} />
                {removing ? "Removing…" : "Remove account"}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      {editing && (
        <div className="profile-save-bar">
          <div>
            <strong>
              {editSection === "study"
                ? "Editing study details"
                : editSection === "funding"
                  ? "Editing funding"
                  : "Editing profile"}
            </strong>
            <span role="status">
              {hasChanges ? "Unsaved changes" : "No changes yet"}
            </span>
            {error && <p role="alert">{error}</p>}
          </div>
          <div className="profile-save-buttons">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setEditing(false);
                setError("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              aria-label="Save profile"
              disabled={saving || !hasChanges}
            >
              <Check size={16} aria-hidden="true" />
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
