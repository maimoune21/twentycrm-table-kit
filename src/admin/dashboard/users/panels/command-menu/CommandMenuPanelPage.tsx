/**
 * LocalCommandMenu — Local Ctrl+K side-panel content.
 *
 * Rendered INSIDE the upstream SidePanelForDesktop slot (via `renderCandidatSidePanel`),
 * so it is mutually exclusive with the Ecole / Candidat detail side panels:
 * opening any one closes the others — same behavior as the existing detail panels.
 *
 * This is the content-only variant (no animated wrapper). The slide-in / width /
 * border / rounded-lg / bg are provided by SidePanelForDesktop.
 */

import { useEffect, useMemo, useRef, useState } from "react";

export type LocalCommandRecord = {
  id: string;
  name?: string;
  nomComplet?: string;
  email?: string;
  nomEcole?: string;
  ville?: string;
  photo?: string | null;
  premium?: boolean;
  [key: string]: unknown;
};

type LocalCommandMenuProps = {
  onClose: () => void;
  records?: LocalCommandRecord[];
  onNavigateToRecord?: (recordId: string) => void;
  onCreateNew?: () => void;
};

// ── Icons ──
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const IconArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export function LocalCommandMenu({
  onClose,
  records = [],
  onNavigateToRecord,
  onCreateNew,
}: LocalCommandMenuProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search on mount
  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, []);

  // Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // "C" shortcut for create (only when not typing in an input)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "c" && !(e.ctrlKey || e.metaKey)) {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        onCreateNew?.();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCreateNew]);

  const visibleRecords = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return records.slice(0, 8);
    return records
      .filter((r) => {
        const hay = [r.nomComplet, r.name, r.email, r.nomEcole, r.ville, r.id]
          .map((v) => String(v ?? "").toLowerCase())
          .join(" ");
        return hay.includes(needle);
      })
      .slice(0, 10);
  }, [records, search]);

  const handleSelectRecord = (id: string) => {
    onNavigateToRecord?.(id);
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Top bar — search input */}
      <div className="flex items-center gap-2 px-3 h-[52px] border-b border-gray-200 dark:border-gray-700 shrink-0">
        <span className="text-gray-400">
          <IconSearch />
        </span>
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type anything..."
          className="flex-1 bg-transparent border-none outline-none text-[0.875rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 placeholder:font-medium"
        />
        <button
          onClick={onClose}
          type="button"
          aria-label="Fermer"
          className="flex items-center justify-center w-7 h-7 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 cursor-pointer border-none bg-transparent transition-colors"
        >
          <IconX />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Actions section */}
        <div className="px-1 py-2">
          <div className="px-2 pb-1 text-[0.6875rem] font-medium text-gray-400 uppercase tracking-wider">
            Actions
          </div>
          <CommandMenuItem
            icon={<IconPlus />}
            label="Create new record"
            shortcut="C"
            onClick={() => onCreateNew?.()}
          />
        </div>

        {/* Records section */}
        <div className="px-1 py-2 border-t border-gray-200 dark:border-gray-700">
          <div className="px-2 pb-1 text-[0.6875rem] font-medium text-gray-400 uppercase tracking-wider">
            {search.trim() ? "Records" : "Recent records"}
          </div>
          {visibleRecords.length > 0 ? (
            visibleRecords.map((r) => (
              <RecordItem
                key={r.id}
                record={r}
                onClick={() => handleSelectRecord(r.id)}
              />
            ))
          ) : (
            <div className="px-3 py-4 text-center text-[0.8125rem] text-gray-400">
              {search.trim() ? "No results found" : "No records available"}
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-700 shrink-0 text-[0.75rem] text-gray-400">
        <span>
          <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[0.6875rem] font-mono">
            Esc
          </kbd>{" "}
          to close
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[0.6875rem] font-mono">
            ↑↓
          </kbd>{" "}
          to navigate
        </span>
      </div>
    </div>
  );
}

function CommandMenuItem({
  icon,
  label,
  shortcut,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="flex items-center gap-2 w-full px-2 py-1.5 rounded-sm text-[0.8125rem] text-left bg-transparent border-none cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      <span className="flex items-center justify-center w-5 h-5 text-gray-400 shrink-0">
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {shortcut && (
        <kbd className="text-[0.6875rem] text-gray-400 font-mono px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}

function RecordItem({
  record,
  onClick,
}: {
  record: LocalCommandRecord;
  onClick: () => void;
}) {
  const name = String(record.nomComplet ?? record.name ?? record.id ?? "");
  const subtitleParts = [record.email, record.nomEcole, record.ville]
    .map((v) => (v ? String(v) : ""))
    .filter(Boolean);
  const subtitle = subtitleParts.join(" • ");
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";
  const photo = record.photo ? String(record.photo) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 w-full px-2 py-1.5 rounded-sm text-left bg-transparent border-none cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-[0.6875rem] font-semibold text-gray-600 dark:text-gray-300 shrink-0 overflow-hidden">
        {photo ? (
          <img
            src={photo}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          initials
        )}
      </span>
      <span className="flex flex-col min-w-0 flex-1">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="truncate text-[0.8125rem] font-medium text-gray-800 dark:text-gray-100">
            {name}
          </span>
          {record.premium && (
            <span className="shrink-0 px-1 py-0 rounded text-[9px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              Premium
            </span>
          )}
        </span>
        {subtitle && (
          <span className="truncate text-[0.6875rem] text-gray-500 dark:text-gray-400">
            {subtitle}
          </span>
        )}
      </span>
      <span className="text-gray-300 dark:text-gray-600 shrink-0">
        <IconArrowRight />
      </span>
    </button>
  );
}
