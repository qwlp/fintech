import "./styles/brand.css";
export default function Brand({
  href,
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  const content = <strong className="movewise-wordmark">MoveWise</strong>;
  return href ? (
    <a
      href={href}
      className={`passport-brand ${className}`}
      aria-label="MoveWise"
    >
      {content}
    </a>
  ) : (
    <div className={`passport-brand ${className}`}>{content}</div>
  );
}
