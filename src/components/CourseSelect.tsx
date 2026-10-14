import { useEffect, useState } from "react";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import {
  coursesForUniversity,
  getCourse,
  type DegreeLevel,
} from "../../shared/courses";
import { formatCurrency } from "../../shared/currency";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";
import { Input } from "./ui/input";
import "../styles/course-select.css";

export default function CourseSelect({
  university,
  value,
  onChange,
  disabled = false,
  allowManual = true,
  onUniversityRequired,
}: {
  university: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  allowManual?: boolean;
  onUniversityRequired?: () => void;
}) {
  const selected = getCourse(university, value);
  const [level, setLevel] = useState<DegreeLevel>(
    selected?.level ?? "undergraduate",
  );
  const [manual, setManual] = useState(!!value && !selected);
  useEffect(() => {
    if (selected) setLevel(selected.level);
    setManual(!!value && !selected);
  }, [university, value, selected]);
  const courses = coursesForUniversity(university, level);
  if (!university) {
    return (
      <div className="course-university-prompt">
        <div>
          <strong>Choose your university first</strong>
          <p>Then select your degree level and course.</p>
        </div>
        {onUniversityRequired && (
          <button
            type="button"
            disabled={disabled}
            onClick={onUniversityRequired}
          >
            Choose university <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="course-selection">
      <div className="course-selection-fields">
        <label className="course-selection-field">
          <span>Degree level</span>
          <Select
            value={level}
            disabled={disabled || !university}
            onValueChange={(next) => {
              setLevel(next as DegreeLevel);
              setManual(false);
              onChange("");
            }}
          >
            <SelectTrigger aria-label="Degree level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="ui-select-content">
              <SelectItem value="undergraduate">Undergraduate</SelectItem>
              <SelectItem value="postgraduate">Postgraduate</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="course-selection-field">
          <span>Course</span>
          <Select
            value={manual ? "manual" : (selected?.id ?? "")}
            disabled={disabled || !university}
            onValueChange={(next) => {
              if (next === "manual") {
                setManual(true);
                onChange("Other course");
              } else {
                setManual(false);
                onChange(getCourse(university, next)!.name);
              }
            }}
          >
            <SelectTrigger aria-label="Course">
              <SelectValue
                placeholder={
                  university
                    ? "Choose your course"
                    : "Choose a university first"
                }
              />
            </SelectTrigger>
            <SelectContent className="ui-select-content">
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name}
                </SelectItem>
              ))}
              {allowManual && (
                <SelectItem value="manual">
                  Other course · enter details
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </label>
      </div>
      {manual && (
        <Input
          aria-label="Other course name"
          placeholder="Course name"
          value={value === "Other course" ? "" : value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value || "Other course")}
        />
      )}
      {selected && (
        <div className="course-tuition-note" aria-live="polite">
          <strong>
            {selected.annualTuition === null
              ? "Enter tuition from your offer"
              : `${formatCurrency(selected.annualTuition, selected.currency)} / academic year`}
          </strong>
          <span>
            International · {selected.feeYear}
            {selected.note ? ` · ${selected.note}` : ""}
          </span>
          <a href={selected.source} target="_blank" rel="noopener noreferrer">
            University fee source <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>
      )}
    </div>
  );
}
