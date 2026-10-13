import { useId, useState } from "react";
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
}: {
  countries: string[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const toggle = (name: string) =>
    onChange(
      value.includes(name)
        ? value.filter((item) => item !== name)
        : [...value, name],
    );
  return (
    <div className="setup-field university-shortlist">
      <span id={`${id}-label`}>Universities · optional</span>
      <p className="setup-directory-note">
        Shortlist universities in your selected destinations. You can choose
        more than one.
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
            aria-labelledby={`${id}-label`}
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
              {countries.map((country) => {
                const matches = (
                  universities[getCountry(country)?.name ?? ""] ?? []
                ).filter((name) =>
                  name.toLowerCase().includes(query.trim().toLowerCase()),
                );
                return matches.length ? (
                  <div key={country}>
                    <p className="university-country-heading">
                      {getCountry(country)?.flag} {country}
                    </p>
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
              {!countries.some((country) =>
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
