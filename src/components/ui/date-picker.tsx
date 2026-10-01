import { useState } from "react";
import { CalendarBlank } from "@phosphor-icons/react";
import { format } from "date-fns";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "../../lib/utils";

export function DatePicker({ value, onChange, label, className }: {
  value: string; onChange: (value: string) => void; label: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const parsed = value ? new Date(`${value}T12:00:00`) : undefined;
  const date = parsed && !Number.isNaN(parsed.getTime()) ? parsed : undefined;
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button type="button" variant="outline" className={cn("ui-date-trigger", className)} aria-label={`${label}: ${date ? format(date, "d MMM yyyy") : "Choose date"}`}>
        <CalendarBlank weight="duotone" /><span><small>{label}</small><strong>{date ? format(date, "d MMM yyyy") : "Choose date"}</strong></span>
      </Button>
    </PopoverTrigger>
    <PopoverContent className="ui-popover" align="end" sideOffset={8}>
      <Calendar className="ui-calendar" mode="single" selected={date} defaultMonth={date} autoFocus onSelect={(selected) => {
        if (selected) { onChange(format(selected, "yyyy-MM-dd")); setOpen(false); }
      }} />
    </PopoverContent>
  </Popover>;
}
