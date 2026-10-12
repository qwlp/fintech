import { useId, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Popover } from "radix-ui";
import { countries, getCountry } from "../../shared/study";
import "../styles/destinations.css";

export default function DestinationCountries({
  value,
  primary,
  onChange,
  disabled = false,
}: {
  value: string[];
  primary: string;
  onChange: (countries: string[], primary: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const available = countries.filter((country) =>
    `${country.name} ${country.code} ${country.currency}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const toggle = (country: string) => {
    const next = value.includes(country)
      ? value.filter((item) => item !== country)
      : [...value, country];
    onChange(next, next.includes(primary) ? primary : (next[0] ?? ""));
  };
  return (
    <div className="setup-field destination-countries">
      <span id={`${id}-label`}>Destination countries</span>
      <p className="destination-help" id={`${id}-help`}>
        Add the countries you’re considering. Your primary destination sets your
        university, budget currency, and payment routes.
      </p>
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          setQuery("");
        }}
      >
        <Popover.Trigger asChild>
          <button
            type="button"
            className="setup-country-trigger"
            disabled={disabled}
            aria-labelledby={`${id}-label`}
            aria-describedby={`${id}-help`}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span>
              {value.length
                ? `${value.length} ${value.length === 1 ? "destination" : "destinations"} selected`
                : "Choose destinations"}
            </span>
            <ChevronDown size={19} />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="setup-country-menu"
            sideOffset={8}
            align="start"
            collisionPadding={16}
          >
            <div className="setup-country-search">
              <Search size={16} />
              <input
                aria-label="Search destination countries"
                placeholder="Search countries…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    event.currentTarget
                      .closest(".setup-country-menu")
                      ?.querySelector<HTMLButtonElement>('[role="option"]')
                      ?.focus();
                  }
                }}
              />
            </div>
            <div
              role="listbox"
              aria-label="Destination countries"
              aria-multiselectable="true"
              className="setup-country-options"
              onKeyDown={(event) => {
                const buttons = Array.from(
                  event.currentTarget.querySelectorAll<HTMLButtonElement>(
                    '[role="option"]',
                  ),
                );
                const index = buttons.indexOf(
                  document.activeElement as HTMLButtonElement,
                );
                if (
                  ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) &&
                  buttons.length
                ) {
                  event.preventDefault();
                  buttons[
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? buttons.length - 1
                        : (index +
                            (event.key === "ArrowDown" ? 1 : -1) +
                            buttons.length) %
                          buttons.length
                  ]?.focus();
                }
              }}
            >
              {available.map((country) => (
                <button
                  type="button"
                  key={country.name}
                  role="option"
                  aria-label={country.name}
                  disabled={disabled}
                  aria-selected={value.includes(country.name)}
                  onClick={() => toggle(country.name)}
                >
                  <span className="setup-country-option-label">
                    <span className="setup-country-flag" aria-hidden="true">
                      {country.flag}
                    </span>
                    {country.name}
                    <small>{country.currency}</small>
                  </span>
                  {value.includes(country.name) && <Check size={16} />}
                </button>
              ))}
              {!available.length && <p>No countries found.</p>}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <ul className="destination-list" aria-label="Selected destinations">
        {value.map((country) => (
          <li key={country}>
            <span className="destination-name">
              <span aria-hidden="true">{getCountry(country)?.flag}</span>
              {country}
              <small>{getCountry(country)?.currency}</small>
            </span>
            <div className="destination-actions">
              <button
                type="button"
                className="destination-primary"
                disabled={disabled || country === primary}
                aria-label={
                  country === primary
                    ? `${country} is the primary destination`
                    : `Make ${country} primary`
                }
                onClick={() => onChange(value, country)}
              >
                {country === primary ? (
                  <>
                    <Check size={13} /> Primary
                  </>
                ) : (
                  "Make primary"
                )}
              </button>
              <button
                type="button"
                className="destination-remove"
                disabled={disabled}
                aria-label={`Remove ${country}`}
                onClick={() => toggle(country)}
              >
                <X size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <span className="sr-only" aria-live="polite">
        {value.length} destinations selected.{" "}
        {primary
          ? `Primary destination: ${primary}.`
          : "Choose a destination to continue."}
      </span>
    </div>
  );
}
