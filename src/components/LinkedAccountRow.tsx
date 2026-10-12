import { CreditCard, Landmark, Trash2 } from "lucide-react";
import { getCountry } from "../../shared/study";
import "../styles/linked-accounts.css";
export type SavedCountryAccount = {
  id?: string;
  country: string;
  label: string;
  index: number;
};
export default function LinkedAccountRow({
  item,
  index,
  disabled,
  onRemove,
}: {
  item: Omit<SavedCountryAccount, "index">;
  index: number;
  disabled?: boolean;
  onRemove?: (item: SavedCountryAccount) => void;
}) {
  const country = getCountry(item.country);
  if (!country) return null;
  const parts = item.label.split(" · ");
  const Icon = parts.includes("Credit card") ? CreditCard : Landmark;
  return (
    <article className="linked-account-row">
      <span className="linked-account-icon">
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="linked-account-copy">
        <strong>{parts[0] || "Linked account"}</strong>
        {parts.length > 1 && <p>{parts.slice(1).join(" · ")}</p>}
        <span>
          <span aria-hidden="true">{country.flag}</span>
          {country.name}
        </span>
      </div>
      <div className="linked-account-actions">
        <span className="linked-account-currency">{country.currency}</span>
        {onRemove && (
          <button
            type="button"
            className="linked-account-remove"
            aria-label={`Remove ${parts[0] || "linked account"} ending ${item.label.match(/•••• (\d{4})/)?.[1] ?? "unknown"}`}
            title="Remove saved account"
            disabled={disabled}
            onClick={() =>
              onRemove({
                country: item.country,
                label: item.label,
                index,
                ...(item.id ? { id: item.id } : {}),
              })
            }
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}
