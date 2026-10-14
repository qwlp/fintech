import { useId, useState, type Ref } from "react";
import { Popover } from "radix-ui";
import { Check, ChevronDown, Search, X } from "lucide-react";
import UniversityLabel from "../components/UniversityLabel";
import { getCountry, universities } from "../../shared/study";
import "../styles/setup.css";

export default function UniversityMultiSelect({
  countries,
  value,
  onChange,
  disabled = false,
  guidance,
  triggerRef,
  primary,
}: {
  countries: string[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  guidance?: string;
  triggerRef?: Ref<HTMLButtonElement>;
  primary?: string;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeCountry, setActiveCountry] = useState("");
  const visibleCountries = countries.filter(
    (country) =>
      country ===
      (countries.includes(activeCountry)
        ? activeCountry
        : (primary ?? countries[0])),
  );
  const toggle = (name: string) =>
    onChange(
      value.includes(name)
        ? value.filter((item) => item !== name)
        : [...value, name],
    );
  return (
    <div className="setup-field university-shortlist">
      <span id={`${id}-label`}>Universities · optional</span>
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          setQuery("");
          if (next) setActiveCountry(primary ?? countries[0] ?? "");
        }}
      >
        <Popover.Trigger asChild>
          <button
            ref={triggerRef}
            type="button"
            className={`setup-country-trigger${guidance ? " setup-university-highlight" : ""}`}
            aria-labelledby={`${id}-label`}
            aria-describedby={guidance ? `${id}-guidance` : undefined}
            disabled={disabled || !countries.length}
          >
            <span>
              {value.length
                ? `${value.length} ${value.length === 1 ? "university" : "universities"} selected`
                : "Choose universities"}
            </span>
            <ChevronDown size={19} />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="setup-country-menu"
            align="start"
            sideOffset={8}
            collisionPadding={16}
          >
            {countries.length > 1 && (
              <div
                className="university-country-tabs"
                role="group"
                aria-label="University destination"
              >
                {countries.map((country) => (
                  <button
                    key={country}
                    type="button"
                    aria-pressed={visibleCountries.includes(country)}
                    onClick={() => {
                      setActiveCountry(country);
                      setQuery("");
                    }}
                  >
                    {getCountry(country)?.flag} {country}
                  </button>
                ))}
              </div>
            )}
            <div className="setup-country-search">
              <Search size={16} />
              <input
                aria-label="Search universities"
                placeholder="Search universities…"
                value={query}
                maxLength={100}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div
              className="setup-country-options"
              role="group"
              aria-labelledby={`${id}-label`}
            >
              {visibleCountries.map((country) => {
                const matches = (
                  universities[getCountry(country)?.name ?? ""] ?? []
                ).filter((name) =>
                  name.toLowerCase().includes(query.trim().toLowerCase()),
                );
                return matches.length ? (
                  <div key={country}>
                    {matches.map((name) => (
                      <label className="university-choice" key={name}>
                        <input
                          type="checkbox"
                          checked={value.includes(name)}
                          disabled={disabled}
                          onChange={() => toggle(name)}
                        />
                        <UniversityLabel name={name} />
                        {value.includes(name) && (
                          <Check size={16} aria-hidden="true" />
                        )}
                      </label>
                    ))}
                  </div>
                ) : null;
              })}
              {!visibleCountries.some((country) =>
                (universities[getCountry(country)?.name ?? ""] ?? []).some(
                  (name) =>
                    name.toLowerCase().includes(query.trim().toLowerCase()),
                ),
              ) && <p>No matching universities.</p>}
            </div>
            <div className="university-picker-footer">
              <span>{value.length} selected</span>
              <button type="button" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {guidance && (
        <p
          id={`${id}-guidance`}
          className="setup-university-guidance"
          role="status"
        >
          {guidance}
        </p>
      )}
      {!!value.length && (
        <ul className="university-shortlist-items">
          {value.map((name) => (
            <li key={name}>
              <UniversityLabel name={name} />
              <button
                type="button"
                disabled={disabled}
                aria-label={`Remove ${name}`}
                onClick={() => toggle(name)}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
