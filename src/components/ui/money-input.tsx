import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  formatMoneyInput,
  parseMoneyInput,
  changeMoneyAmount,
} from "../../lib/money-input";
import "./money-input.css";

type Props = React.ComponentProps<"input"> & { moneyControls?: boolean };
export const MoneyInput = React.forwardRef<HTMLInputElement, Props>(
  function MoneyInput(
    {
      value,
      onChange,
      onKeyDown,
      min = 0,
      max,
      disabled,
      readOnly,
      moneyControls = true,
      className,
      ...props
    },
    forwardedRef,
  ) {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const [editingValue, setEditingValue] = React.useState<string | null>(null);
    const raw =
      editingValue !== null && Number(editingValue) === Number(value ?? "")
        ? editingValue
        : String(value ?? "");
    const displayed = formatMoneyInput(raw);
    const minimum = Number(min);
    const maximum = max == null ? Infinity : Number(max);
    const amount = Number(raw || 0);
    const label = props["aria-label"] ?? "amount";
    React.useEffect(() => {
      const valid =
        !raw ||
        (/^\d+(\.\d{0,2})?$/.test(raw) &&
          Number.isFinite(amount) &&
          amount >= minimum &&
          amount <= maximum);
      inputRef.current?.setCustomValidity(
        valid
          ? ""
          : `Enter an amount between ${minimum.toLocaleString("en-US")} and ${Number.isFinite(maximum) ? maximum.toLocaleString("en-US") : "the allowed limit"}, with up to two decimal places.`,
      );
    }, [raw, amount, minimum, maximum]);
    const emit = (next: string, event: React.SyntheticEvent) => {
      const input = inputRef.current;
      if (!input) return;
      setEditingValue(next);
      // Keep the existing form handlers working with an unformatted numeric value.
      const target = new Proxy(input, {
        get(node, key) {
          if (key === "value") return next;
          if (key === "valueAsNumber") return next === "" ? NaN : Number(next);
          const result = Reflect.get(node, key, node);
          return typeof result === "function" ? result.bind(node) : result;
        },
      });
      onChange?.({
        ...event,
        target,
        currentTarget: target,
      } as React.ChangeEvent<HTMLInputElement>);
    };
    const change = (direction: number, event: React.SyntheticEvent) => {
      if (disabled || readOnly) return;
      emit(
        String(changeMoneyAmount(amount, direction, minimum, maximum)),
        event,
      );
    };
    return (
      <span className="money-input-control" data-controls={moneyControls}>
        <input
          {...props}
          type="text"
          role="spinbutton"
          inputMode="decimal"
          className={className}
          value={displayed}
          disabled={disabled}
          readOnly={readOnly}
          aria-valuemin={minimum}
          aria-valuemax={Number.isFinite(maximum) ? maximum : undefined}
          aria-valuenow={raw && Number.isFinite(amount) ? amount : undefined}
          ref={(node) => {
            inputRef.current = node;
            if (typeof forwardedRef === "function") forwardedRef(node);
            else if (forwardedRef) forwardedRef.current = node;
          }}
          onChange={(event) => {
            const next = parseMoneyInput(event.target.value);
            if (next === null) return;
            const position =
              event.target.selectionStart ?? event.target.value.length;
            const digitsBefore = event.target.value
              .slice(0, position)
              .replace(/,/g, "").length;
            emit(next, event);
            requestAnimationFrame(() => {
              const input = inputRef.current;
              if (!input || document.activeElement !== input) return;
              let cursor = 0,
                count = 0;
              while (cursor < input.value.length && count < digitsBefore) {
                if (input.value[cursor] !== ",") count++;
                cursor++;
              }
              input.setSelectionRange(cursor, cursor);
            });
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (
              !event.defaultPrevented &&
              ["ArrowUp", "ArrowDown"].includes(event.key)
            ) {
              event.preventDefault();
              change(event.key === "ArrowUp" ? 1 : -1, event);
            }
          }}
        />
        {moneyControls && (
          <span className="money-input-actions">
            <button
              type="button"
              aria-label={`Increase ${label} by 1`}
              title="Increase by 1"
              disabled={disabled || readOnly || amount >= maximum}
              onClick={(event) => change(1, event)}
            >
              <ChevronUp size={13} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Decrease ${label} by 1`}
              title="Decrease by 1"
              disabled={disabled || readOnly || amount <= minimum}
              onClick={(event) => change(-1, event)}
            >
              <ChevronDown size={13} aria-hidden="true" />
            </button>
          </span>
        )}
      </span>
    );
  },
);
