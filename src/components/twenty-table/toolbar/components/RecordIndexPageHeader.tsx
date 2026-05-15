import { type ReactNode } from "react";

type RecordIndexPageHeaderProps = {
  /** Icon to display (e.g. building, people) */
  icon?: ReactNode;
  /** Page title (e.g. "Companies", "People") */
  title: string;
  /** record count to display next to title */
  recordCount?: number;
  /** Right-side action buttons */
  children?: ReactNode;
  /** Tabs to display (e.g. Candidats, Recruteurs, etc.) */
  tabsSlot?: ReactNode;
};

/**
 * Top page header bar — matches Twenty's PageHeader (52px min-height).
 * Contains: icon + title on left, action buttons on right.
 */
export const RecordIndexPageHeader = ({
  icon,
  title,
  recordCount,
  children,
  tabsSlot,
}: RecordIndexPageHeaderProps) => {
  return (
    <div className="flex items-center min-h-10 px-4 gap-2">
      {/* Left section: Icon + Title */}
      <div className="flex items-center gap-1 min-w-0">
        {icon && (
          <div className="flex items-center justify-center w-6 h-6 text-gray-500 dark:text-gray-400 shrink-0">
            {icon}
          </div>
        )}
        <h1 className="text-[0.8125rem] font-semibold text-gray-500 dark:text-gray-100 truncate">
          {title}
        </h1>
        {recordCount !== undefined && (
          <span className="text-[12px] text-gray-400 dark:text-gray-500 shrink-0">
           ({recordCount})
          </span>
        )}
      </div>

      {tabsSlot}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right section: Action buttons */}
      <div className="flex items-center gap-1 shrink-0">{children}</div>
    </div>
  );
};

// ── Preset buttons matching Twenty ──

type PageHeaderButtonProps = {
  onClick?: () => void;
  children: ReactNode;
  variant?: "default" | "primary";
  title?: string;
};

export const PageHeaderButton = ({
  onClick,
  children,
  variant = "default",
  title,
}: PageHeaderButtonProps) => {
  const base =
    "flex items-center gap-1.5 px-2.5 h-8 rounded-sm text-[11.5px] font-medium cursor-pointer transition-colors select-none border-none";
  const variants = {
    default:
      "bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
  };
  return (
    <button className={`${base} ${variants[variant]}`} onClick={onClick} title={title}>
      {children}
    </button>
  );
};

/** "+" icon (14px) */
export const IconPlus = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/** Command/Search icon (14px) */
export const IconCommand = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
  </svg>
);

/** Building icon (for "Companies") */
export const IconBuilding = () => (
  <svg
    width="12.5"
    height="12.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    className="mb-0.5"
    strokeLinejoin="round"
  >
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M8 10h.01M16 10h.01M12 14h.01M8 14h.01M16 14h.01" />
  </svg>
);

/** People icon */
export const IconPeople = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mb-0.5"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
