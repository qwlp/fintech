import { useEffect, useState } from "react";
import { BookOpen, GraduationCap, ExternalLink } from "lucide-react";
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
}: {
  university: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  allowManual?: boolean;
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
  return (
    <div className="course-selection">
      <div className="course-selection-fields">
        <label className="course-selection-field">
          <span>
            <GraduationCap size={15} aria-hidden="true" />
            Degree level
          </span>
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
          <span>
            <BookOpen size={15} aria-hidden="true" />
            Course
          </span>
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
