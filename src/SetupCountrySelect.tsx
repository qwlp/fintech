import { useState } from "react";
import { Popover } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";

const countries = [
  { name: "China", flag: "🇨🇳" },
  { name: "United Kingdom", flag: "🇬🇧" },
  { name: "Cambodia", flag: "🇰🇭" },
  { name: "United States", flag: "🇺🇸" },
  { name: "Australia", flag: "🇦🇺" },
];

export default function SetupCountrySelect({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedCountry = countries.find((country) => country.name === value);
  return (
    <div className="setup-field">
      <span id={`${label.replaceAll(" ", "-")}-label`}>{label}</span>
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
        }}
      >
        <Popover.Trigger asChild>
          <button
            type="button"
            className="setup-country-trigger"
            role="combobox"
            aria-labelledby={`${label.replaceAll(" ", "-")}-label`}
            aria-expanded={open}
            aria-haspopup="listbox"
            disabled={disabled}
          >
            <span className={!value ? "is-placeholder" : ""}>
              {selectedCountry && (
                <span className="setup-country-flag" aria-hidden="true">
                  {selectedCountry.flag}
                </span>
              )}
              {value || "Choose a country"}
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
            <div
              role="listbox"
              aria-label={label}
              className="setup-country-options"
              onKeyDown={(e) => {
                const buttons = Array.from(
                  e.currentTarget.querySelectorAll<HTMLButtonElement>(
                    '[role="option"]',
                  ),
                );
                const current = buttons.indexOf(
                  document.activeElement as HTMLButtonElement,
                );
                if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
                  e.preventDefault();
                  const next =
                    e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? buttons.length - 1
                        : (current +
                            (e.key === "ArrowDown" ? 1 : -1) +
                            buttons.length) %
                          buttons.length;
                  buttons[next]?.focus();
                }
              }}
            >
              {countries.map((country) => (
                <button
                  key={country.name}
                  type="button"
                  role="option"
                  aria-selected={country.name === value}
                  onClick={() => {
                    onChange(country.name);
                    setOpen(false);
                  }}
                >
                  <span className="setup-country-option-label">
                    <span className="setup-country-flag" aria-hidden="true">
                      {country.flag}
                    </span>
                    {country.name}
                  </span>
                  {country.name === value && <Check size={16} />}
                </button>
              ))}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
