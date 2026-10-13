import UniversityLabel from "../components/UniversityLabel";
import "../styles/setup.css";
import { useId, useState } from "react";
import { Popover } from "radix-ui";
import { Check, ChevronDown, Search } from "lucide-react";
import { universities, getCountry, getUniversity } from "../../shared/study";

export default function UniversitySelect({
  country,
  value,
  onChange,
  disabled = false,
  label = "University · optional",
  allowClear = true,
}: {
  country: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  allowClear?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const names = universities[getCountry(country)?.name ?? ""] ?? [];
  const search = query.trim();
  const matches = names.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase()),
  );
  const choose = (name: string) => {
    onChange(name);
    setOpen(false);
  };
  return (
    <div className="setup-field">
      <span id={`${id}-label`}>{label}</span>
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
            role="combobox"
            aria-labelledby={`${id}-label`}
            aria-expanded={open}
            aria-haspopup="listbox"
            disabled={disabled || !country}
          >
            <span className={!value ? "is-placeholder" : ""}>
              {getUniversity(country, value) ? (
                <UniversityLabel name={getUniversity(country, value)!} />
              ) : (
                "Search for your university"
              )}
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
                placeholder={`Search in ${country}…`}
                maxLength={100}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    e.currentTarget
                      .closest(".setup-country-menu")
                      ?.querySelector<HTMLButtonElement>('[role="option"]')
                      ?.focus();
                  }
                }}
              />
            </div>
            <div
              role="listbox"
              aria-label={`Universities in ${country}`}
              className="setup-country-options"
              onKeyDown={(e) => {
                if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key))
                  return;
                e.preventDefault();
                const buttons = Array.from(
                  e.currentTarget.querySelectorAll<HTMLButtonElement>(
                    '[role="option"]',
                  ),
                );
                const index = buttons.indexOf(
                  document.activeElement as HTMLButtonElement,
                );
                const next =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? buttons.length - 1
                      : (index +
                          (e.key === "ArrowDown" ? 1 : -1) +
                          buttons.length) %
                        buttons.length;
                buttons[next]?.focus();
              }}
            >
              {matches.map((name) => (
                <button
                  key={name}
                  type="button"
                  role="option"
                  aria-selected={value === name}
                  onClick={() => choose(name)}
                >
                  <UniversityLabel name={name} />
                  {value === name && <Check size={16} />}
                </button>
              ))}
              {!matches.length && (
                <p>No matching universities in the approved list.</p>
              )}
              {value && allowClear && (
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => choose("")}
                >
                  Clear university
                </button>
              )}
            </div>
            <p className="setup-directory-note">
              Approved universities in {country}.
            </p>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
