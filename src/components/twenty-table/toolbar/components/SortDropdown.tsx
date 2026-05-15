import { useState, useCallback } from "react";
import { useAtom } from "jotai";
import {
  Dropdown,
  DropdownHeader,
  DropdownSearchInput,
  DropdownSeparator,
  DropdownMenuItem,
} from "./Dropdown";
import { HeaderDropdownButton } from "./HeaderDropdownButton";
import {
  activeSortsAtom,
  sortDropdownOpenAtom,
  type ActiveSort,
} from "../states/toolbarState";
import type { ColumnDefinition, SortDirection } from "../../types";

const FieldLabelIcon = ({ label }: { label: string }) => {
  const labelLower = label.toLowerCase();

  const icons: Record<string, React.ReactNode> = {
    "nom complet": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      </svg>
    ),
    email: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 5L2 7" />
      </svg>
    ),
    entreprise: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M2 11h20M6 7V4M18 7V4" />
      </svg>
    ),
    fonction: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    ville: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
    lieu: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
    état: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    statut: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    gsm: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
    "téléphone": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
    premium: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L15 10H23L17 15L19 23L12 19L5 23L7 15L1 10H9L12 2Z" />
      </svg>
    ),
    offres: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 3h-8v4h8V3z" />
      </svg>
    ),
    "crédit": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20M6 17h12" />
      </svg>
    ),
    id: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="16" height="16" rx="2" />
        <path d="M9 9h6M9 15h6" />
      </svg>
    ),
    titre: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 3h-8v4h8V3z" />
      </svg>
    ),
    cv: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="11" x2="15" y2="11" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
    "état cv": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M9 15l2 2 4-4" />
      </svg>
    ),
    photo: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17 4l2-2" />
      </svg>
    ),
    "école": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 15H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3" />
        <path d="M17 15h3a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-3" />
        <path d="M12 13V9m0 0L2 5m10-4l10 4v7" />
      </svg>
    ),
    niveau: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
    "site web": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    taille: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    partenaire: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    lien: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    annonce: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    "type contrat": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    "type(s) de contrat": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    "type(s) de stage": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 7l-8-4-8 4v10l8 4 8-4V7z" />
        <polyline points="12 12 12 22" />
        <polyline points="12 12 3 7" />
        <polyline points="12 12 21 7" />
      </svg>
    ),
    "métiers": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9a6 6 0 1 0 12 0A6 6 0 0 0 6 9z" />
        <path d="M12 3v4m0 8v4" />
      </svg>
    ),
    "créé par": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    ),
    "nom": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M2 11h20M6 7V4M18 7V4" />
      </svg>
    ),
    "d.connexion": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
    ),
    "inscrit le": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="16" height="16" rx="2" ry="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M9 16l2 2 4-4" />
      </svg>
    ),
    "date création": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="16" height="16" rx="2" ry="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
    "candidats": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    "télétravail": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    // ── Abonnements ──
    "utilisateur": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      </svg>
    ),
    "produit": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    "montant": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v2m0 8v2M9 9h4.5a1.5 1.5 0 0 1 0 3H10a1.5 1.5 0 0 0 0 3H15" />
      </svg>
    ),
    "début": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="16" height="16" rx="2" ry="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M8 14l2 2 4-4" />
      </svg>
    ),
    "renouvellement": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M23 4v6h-6" />
        <path d="M1 20v-6h6" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    ),
    "code": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="4" y1="9" x2="20" y2="9" />
        <line x1="4" y1="15" x2="20" y2="15" />
        <line x1="10" y1="3" x2="8" y2="21" />
        <line x1="16" y1="3" x2="14" y2="21" />
      </svg>
    ),
    "créé": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="16" height="16" rx="2" ry="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
    "fin": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="16" height="16" rx="2" ry="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M9 14l2 2 4-4" />
      </svg>
    ),
  };

  const icon = Object.entries(icons).find(([key]) => labelLower.includes(key))?.[1] || null;

  return (
    <span className="flex items-center justify-center w-4 h-4 text-gray-500 dark:text-gray-300 shrink-0">
      {icon || (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="16" height="16" rx="2" />
        </svg>
      )}
    </span>
  );
};

const IconArrowUp = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

const IconArrowDown = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </svg>
);

type SortDropdownProps = {
  columns: ColumnDefinition[];
};

/**
 * Sort dropdown matching Twenty's ObjectSortDropdownButton.
 * Select direction → Select field.
 */
export const SortDropdown = ({ columns }: SortDropdownProps) => {
  const [open, setOpen] = useAtom(sortDropdownOpenAtom);
  const [sorts, setSorts] = useAtom(activeSortsAtom);
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<SortDirection>("asc");

  const sortableColumns = columns.filter((c) => c.isSortable !== false);
  const filteredColumns = sortableColumns.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase()),
  );

  // Fields already sorted
  const sortedFieldNames = new Set(sorts.map((s) => s.fieldName));

  const handleOpenChange = useCallback(
    (v: boolean) => {
      setOpen(v);
      if (!v) {
        setSearch("");
        setDirection("asc");
      }
    },
    [setOpen],
  );

  const handleAddSort = (col: ColumnDefinition) => {
    const newSort: ActiveSort = {
      id: `sort-${col.fieldName}-${Date.now()}`,
      fieldName: col.fieldName,
      label: col.label,
      direction: direction,
    };
    setSorts((prev) => [...prev, newSort]);
    handleOpenChange(false);
  };

  return (
    <Dropdown
      open={open}
      onOpenChange={handleOpenChange}
      width={240}
      align="right"
      trigger={
        <HeaderDropdownButton
          label="Sort"
          isActive={sorts.length > 0}
          isOpen={open}
          onClick={() => handleOpenChange(!open)}
        />
      }
    >
      <DropdownHeader title="Sort" onClose={() => handleOpenChange(false)} />

      {/* Direction selector */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/10 dark:border-white/10">
        <button
          onClick={() => setDirection("asc")}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[0.8125rem] border-none cursor-pointer transition-colors ${
            direction === "asc"
              ? "bg-blue-600/20 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
              : "bg-transparent text-gray-500 dark:text-gray-400 hover:bg-white/10 dark:hover:bg-white/8"
          }`}
        >
          <IconArrowUp /> Ascending
        </button>
        <button
          onClick={() => setDirection("desc")}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[0.8125rem] border-none cursor-pointer transition-colors ${
            direction === "desc"
              ? "bg-blue-600/20 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
              : "bg-transparent text-gray-500 dark:text-gray-400 hover:bg-white/10 dark:hover:bg-white/8"
          }`}
        >
          <IconArrowDown /> Descending
        </button>
      </div>

      <DropdownSeparator />

      <DropdownSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search fields"
      />

      <div className="max-h-[calc(100vh-200px)] overflow-y-auto py-1 px-0.5">
        <div className="px-2 pt-2 pb-1.5 text-[0.6875rem] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-widest">
          Available fields
        </div>
        {filteredColumns.map((col) => (
          <DropdownMenuItem
            key={col.id}
            icon={<FieldLabelIcon label={col.label} />}
            label={col.label}
            disabled={sortedFieldNames.has(col.fieldName)}
            onClick={() => handleAddSort(col)}
          />
        ))}
        {filteredColumns.length === 0 && (
          <div className="px-2 py-3 text-center text-[0.8125rem] text-gray-400">
            No fields found
          </div>
        )}
      </div>
    </Dropdown>
  );
};
