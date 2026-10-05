import { Plane } from "lucide-react";
import "./brand.css";
export default function Brand({
  href,
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  const content = (
    <>
      <span className="passport-brand-mark">
        <Plane size={21} />
      </span>
      <span className="passport-brand-name">
        <strong>Financial</strong>
        <span>Passport</span>
      </span>
    </>
  );
  return href ? (
    <a
      href={href}
      className={`passport-brand ${className}`}
      aria-label="Financial Passport"
    >
      {content}
    </a>
  ) : (
    <div className={`passport-brand ${className}`}>{content}</div>
  );
}
