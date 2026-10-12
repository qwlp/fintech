import "../styles/profile-photo.css";
export default function AccountAvatar({
  url,
  initials,
  className = "",
}: {
  url?: string | null;
  initials: string;
  className?: string;
}) {
  return (
    <span className={`account-avatar ${className}`} aria-hidden="true">
      <span>{initials}</span>
      {url && (
        <img
          key={url}
          src={url}
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
    </span>
  );
}
