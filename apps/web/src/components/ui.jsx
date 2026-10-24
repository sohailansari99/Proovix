const ICONS = {
  grid: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
  user: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 20c0-4 3.6-6 8-6s8 2 8 6"],
  target: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"],
  file: ["M7 3h7l5 5v13H7z", "M14 3v5h5", "M10 15l2 2 3.5-4"],
  arrow: ["M5 12h14", "M13 6l6 6-6 6"],
  plus: ["M12 5v14", "M5 12h14"],
  trash: ["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 13h10l1-13", "M9 7V4h6v3"],
  edit: ["M4 20h4L19 9l-4-4L4 16z"],
  check: ["M5 12l5 5L20 7"],
  x: ["M6 6l12 12", "M18 6L6 18"],
  spark: ["M12 3l2 5.5 5.5 2-5.5 2-2 5.5-2-5.5-5.5-2 5.5-2z"],
  link: [
    "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1",
    "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  ],
  chevron: ["M6 9l6 6 6-6"],
};

export function Icon({ name, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {(ICONS[name] || []).map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

const STATUS = {
  UNVERIFIED: ["No evidence yet", "neutral"],
  PENDING: ["Awaiting review", "pending"],
  VERIFIED: ["Verified", "verified"],
  REJECTED: ["Rejected", "rejected"],
};

export function StatusBadge({ status }) {
  const [label, tone] = STATUS[status] || STATUS.UNVERIFIED;
  return <span className={`badge badge-${tone}`}>{label}</span>;
}

export function NeedProfile({ onNavigate }) {
  return (
    <section className="empty-page">
      <div className="empty-icon">
        <Icon name="user" size={26} />
      </div>
      <h1>Set up your profile first</h1>
      <p>
        Skills and evidence belong to your candidate profile. It only needs your
        name and a username to get started.
      </p>
      <button
        className="button button-primary"
        onClick={() => onNavigate("profile")}
      >
        Set up profile
        <span aria-hidden="true">
          <Icon name="arrow" size={16} />
        </span>
      </button>
    </section>
  );
}