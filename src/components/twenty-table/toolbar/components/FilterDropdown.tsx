import { useState, useCallback } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  Dropdown,
  DropdownHeader,
  DropdownSearchInput,
  DropdownSeparator,
  DropdownMenuItem,
} from "./Dropdown";
import { HeaderDropdownButton } from "./HeaderDropdownButton";
import {
  activeFiltersAtom,
  filterDropdownOpenAtom,
  hiddenColumnIdsAtom,
  type ActiveFilter,
  type FilterOperator,
} from "../states/toolbarState";
import type { ColumnDefinition } from "../../types";
import { CompanyFilterPanel } from "./CompanyFilterPanel";
import { FullNameFilterPanel } from "./FullNameFilterPanel";
import { EmailFilterPanel } from "./EmailFilterPanel";
import { FonctionFilterPanel } from "./FonctionFilterPanel";
import { VilleFilterPanel } from "./VilleFilterPanel";
import { EcoleFilterPanel } from "./EcoleFilterPanel";
import { CvFilterPanel } from "./CvFilterPanel";
import { GsmFilterPanel } from "./GsmFilterPanel";
import { MetierFilterPanel } from "./MetierFilterPanel";
import { TypeStageFilterPanel } from "./TypeStageFilterPanel";
import { MultiOptionCheckboxFilterPanel } from "./MultiOptionCheckboxFilterPanel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { ChevronLeft, Crown, School } from "lucide-react";

// ── Icons ──
const IconFilter = () => (
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
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const FieldLabelIcon = ({ label }: { label: string }) => {
  const labelLower = label.toLowerCase();

  const icons: Record<string, React.ReactNode> = {
    // ── Candidats / Recruteurs ──
    "nom complet": (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      </svg>
    ),
    email: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="2" y="4" width="20" height="15" rx="2" />
        <path d="m22 7-10 5L2 7" />
      </svg>
    ),
    entreprise: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M2 11h20M6 7V4M18 7V4" />
      </svg>
    ),
    fonction: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    ville: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
    télétravail: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    téléphone: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
    gsm: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
    cv: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="11" x2="15" y2="11" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
    école: <School className="size-3.5" />,
    niveau: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="9" y1="7" x2="15" y2="7" />
        <line x1="9" y1="11" x2="15" y2="11" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
    "type(s) de contrat": (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    "type(s) de stage": (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M20 7l-8-4-8 4v10l8 4 8-4V7z" />
        <polyline points="12 12 12 22" />
        <polyline points="12 12 3 7" />
        <polyline points="12 12 21 7" />
      </svg>
    ),
    "type contrat": (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    métiers: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M6 9a6 6 0 1 0 12 0A6 6 0 0 0 6 9z" />
        <path d="M12 3v4m0 8v4" />
        <path d="M7.5 7.5h2m5 0h2" />
        <path d="M7.5 12.5h2m5 0h2" />
      </svg>
    ),
    // ── Offres ──
    titre: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 3h-8v4h8V3z" />
      </svg>
    ),
    statut: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    lieu: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
    annonce: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    lien: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    état: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    premium: <Crown className="size-3.5" />,
    id: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="4" width="15" height="15" rx="2" />
        <path d="M9 9h6M9 15h6" />
      </svg>
    ),
    offres: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 3h-8v4h8V3z" />
      </svg>
    ),
    crédit: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20M6 17h12" />
      </svg>
    ),
    // ── Entreprises ──
    "site web": (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    taille: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    partenaire: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    photo: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="2" y="4" width="20" height="15" rx="2" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17 4l2-2" />
      </svg>
    ),
    "état cv": (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M9 15l2 2 4-4" />
      </svg>
    ),
    nom: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M2 11h20M6 7V4M18 7V4" />
      </svg>
    ),
    "créé par": (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    ),
    // ── Abonnements ──
    utilisateur: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      </svg>
    ),
    produit: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    montant: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v2m0 8v2M9 9h4.5a1.5 1.5 0 0 1 0 3H10a1.5 1.5 0 0 0 0 3H15" />
      </svg>
    ),
    début: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="4" width="15" height="15" rx="2" ry="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M8 14l2 2 4-4" />
      </svg>
    ),
    renouvellement: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M23 4v6h-6" />
        <path d="M1 20v-6h6" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    ),
    code: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <line x1="4" y1="9" x2="20" y2="9" />
        <line x1="4" y1="15" x2="20" y2="15" />
        <line x1="10" y1="3" x2="8" y2="21" />
        <line x1="16" y1="3" x2="14" y2="21" />
      </svg>
    ),
    créé: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="4" width="15" height="15" rx="2" ry="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
    fin: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="4" width="15" height="15" rx="2" ry="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M9 14l2 2 4-4" />
      </svg>
    ),
  };

  const icon =
    Object.entries(icons).find(([key]) => labelLower.includes(key))?.[1] ||
    null;

  return (
    <span className="flex items-center justify-center w-4.5 h-4.5 text-gray-500 dark:text-gray-300 shrink-0">
      {icon || (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="3" width="15" height="15" rx="2" />
        </svg>
      )}
    </span>
  );
};

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "contains", label: "contains" },
  { value: "equals", label: "equals" },
  { value: "isEmpty", label: "is empty" },
  { value: "isNotEmpty", label: "is not empty" },
];

type FilterDropdownProps = {
  columns: ColumnDefinition[];
};

/**
 * Filter dropdown matching Twenty's ViewBarFilterDropdown.
 * Step 1: select a field → Step 2: configure operator + value.
 */
export const FilterDropdown = ({ columns }: FilterDropdownProps) => {
  const [open, setOpen] = useAtom(filterDropdownOpenAtom);
  const [filters, setFilters] = useAtom(activeFiltersAtom);
  const hiddenIds = useAtomValue(hiddenColumnIdsAtom);
  const [search, setSearch] = useState("");
  const [selectedField, setSelectedField] = useState<ColumnDefinition | null>(
    null,
  );
  const [operator, setOperator] = useState<FilterOperator>("contains");
  const [value, setValue] = useState("");

  const filterableColumns = columns.filter((c) => c.isFilterable !== false);

  // Split into visible and hidden columns
  const visibleFilterableColumns = filterableColumns.filter(
    (c) => c.isVisible !== false && !hiddenIds.has(c.id),
  );
  const hiddenFilterableColumns = filterableColumns.filter(
    (c) => c.isVisible === false || hiddenIds.has(c.id),
  );

  // Apply search to both
  const filteredVisibleColumns = visibleFilterableColumns.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredHiddenColumns = hiddenFilterableColumns.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase()),
  );

  const handleOpenChange = useCallback(
    (v: boolean) => {
      setOpen(v);
      if (!v) {
        setSelectedField(null);
        setSearch("");
        setValue("");
        setOperator("contains");
      }
    },
    [setOpen],
  );

  const handleSelectField = (col: ColumnDefinition) => {
    const existingFilter = filters.find((f) => f.fieldName === col.fieldName);
    setSelectedField(col);
    setValue(existingFilter?.value ? String(existingFilter.value) : "");
    setOperator(
      (existingFilter?.operator as FilterOperator | undefined) ??
        (col.fieldName === "emailBounce" || col.fieldName === "premium"
          ? "equals"
          : "contains"),
    );
  };

  const handleApplyFilter = () => {
    if (!selectedField) return;

    // isEmpty and isNotEmpty don't need a value
    const needsValue = operator !== "isEmpty" && operator !== "isNotEmpty";
    if (needsValue && !value.trim()) return;

    const newFilter: ActiveFilter = {
      id: `filter-${selectedField.fieldName}-${Date.now()}`,
      fieldName: selectedField.fieldName,
      label: selectedField.label,
      type: selectedField.type,
      value: needsValue ? value.trim() : undefined,
      operator: operator as ActiveFilter["operator"],
    };
    setFilters((prev) => {
      // Remove any existing filter with the same fieldName, then add the new one
      return [
        ...prev.filter((f) => f.fieldName !== selectedField.fieldName),
        newFilter,
      ];
    });
    handleOpenChange(false);
  };

  const handleSelectAndApply = (val: string) => {
    setValue(val);
    if (!selectedField) return;
    const newFilter: ActiveFilter = {
      id: `filter-${selectedField.fieldName}-${Date.now()}`,
      fieldName: selectedField.fieldName,
      label: selectedField.label,
      type: selectedField.type,
      value: val.trim(),
      operator: operator as ActiveFilter["operator"],
    };
    setFilters((prev) => {
      // Remove any existing filter with the same fieldName, then add the new one
      return [
        ...prev.filter((f) => f.fieldName !== selectedField.fieldName),
        newFilter,
      ];
    });
    handleOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleApplyFilter();
  };

  return (
    <Dropdown
      open={open}
      onOpenChange={handleOpenChange}
      width={300}
      align="right"
      trigger={
        <HeaderDropdownButton
          label="Filter"
          isActive={filters.length > 0}
          isOpen={open}
          onClick={() => handleOpenChange(!open)}
        />
      }
    >
      {!selectedField ? (
        // Step 1: Field selection
        <>
          <DropdownHeader
            title="Filter"
            onClose={() => handleOpenChange(false)}
          />
          <DropdownSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search fields"
          />
          <div className="max-h-[calc(100vh-180px)] overflow-y-auto py-1 px-0.5">
            {/* Visible fields section */}
            {filteredVisibleColumns.length > 0 && (
              <>
                <div className="px-2 pt-2 pb-1.5 text-[9.5px] font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-widest">
                  Visible fields
                </div>
                {filteredVisibleColumns.map((col) => (
                  <DropdownMenuItem
                    key={col.id}
                    icon={<FieldLabelIcon label={col.label} />}
                    label={col.label}
                    onClick={() => handleSelectField(col)}
                  />
                ))}
              </>
            )}

            {/* Hidden fields section */}
            {filteredHiddenColumns.length > 0 && (
              <>
                <DropdownSeparator />
                <div className="px-2 pt-2 pb-1.5 text-[9.5px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  Hidden fields
                </div>
                {filteredHiddenColumns.map((col) => (
                  <DropdownMenuItem
                    key={col.id}
                    icon={<FieldLabelIcon label={col.label} />}
                    label={col.label}
                    onClick={() => handleSelectField(col)}
                  />
                ))}
              </>
            )}

            {filteredVisibleColumns.length === 0 &&
              filteredHiddenColumns.length === 0 && (
                <div className="px-2 py-3 text-center text-[0.8125rem] text-gray-400 dark:text-gray-500">
                  No fields found
                </div>
              )}
          </div>
        </>
      ) : selectedField.fieldName === "entreprise" ? (
        // Step 2b: Company filter with custom panel
        <CompanyFilterPanel
          column={selectedField}
          onBack={() => setSelectedField(null)}
        />
      ) : selectedField.fieldName === "nomComplet" ? (
        // Step 2c: Full name filter with custom panel
        <FullNameFilterPanel
          column={selectedField}
          onBack={() => setSelectedField(null)}
        />
      ) : selectedField.fieldName === "email" ? (
        // Step 2d: Email filter with custom panel
        <EmailFilterPanel
          column={selectedField}
          onBack={() => setSelectedField(null)}
        />
      ) : selectedField.fieldName === "fonction" ? (
        // Step 2e: Fonction filter with custom panel
        <FonctionFilterPanel
          column={selectedField}
          onBack={() => setSelectedField(null)}
        />
      ) : selectedField.fieldName === "ville" ? (
        // Step 2f: Ville filter with custom panel
        <VilleFilterPanel
          column={selectedField}
          onBack={() => setSelectedField(null)}
        />
      ) : selectedField.fieldName === "nomEcole" ? (
        // Step 2f+: Ecole filter with async search + multi-select
        <EcoleFilterPanel
          column={selectedField}
          onBack={() => setSelectedField(null)}
        />
      ) : selectedField.fieldName === "gsm" ? (
        // Step 2g: GSM filter with contains, is, empty, not empty
        <GsmFilterPanel
          column={selectedField}
          onBack={() => setSelectedField(null)}
        />
      ) : selectedField.fieldName === "metiers" ? (
        // Step 2h: Metiers filter with async search + multi-select
        <MetierFilterPanel
          column={selectedField}
          onBack={() => setSelectedField(null)}
        />
      ) : selectedField.fieldName === "typeStage" ? (
        // Step 2i: Type Stage filter with async search + multi-select
        <TypeStageFilterPanel
          column={selectedField}
          onBack={() => setSelectedField(null)}
        />
      ) : selectedField.fieldName === "typeContrat" ||
        selectedField.fieldName === "niveauEtudes" ||
        selectedField.fieldName === "typeEntreprise" ||
        selectedField.fieldName === "tailleEntreprise" ||
        selectedField.fieldName === "annonceClient" ? (
        // Step 2i+: Static options with checkbox multi-select + apply
        <MultiOptionCheckboxFilterPanel
          column={selectedField}
          onBack={() => setSelectedField(null)}
        />
      ) : selectedField.fieldName === "cv" ? (
        // Step 2j: CV filter panel (presence + states + score)
        <CvFilterPanel
          column={selectedField}
          onBack={() => setSelectedField(null)}
        />
      ) : selectedField.fieldName === "etatCV" ||
        selectedField.fieldName === "photoScore" ||
        selectedField.fieldName === "etatPhoto" ? (
        // Step 2k+: Static options for CV/photo states
        <MultiOptionCheckboxFilterPanel
          column={selectedField}
          onBack={() => setSelectedField(null)}
        />
      ) : selectedField.fieldName === "etat" ? (
        <>
          <div className="px-1 py-1.5 border-b border-white/30 dark:border-white/20 flex items-center gap-1">
            <button
              onClick={() => setSelectedField(null)}
              className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors shrink-0"
            >
              <ChevronLeft
                size={18}
                className="text-gray-600 dark:text-gray-400"
              />
            </button>
            <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100">
              {`Filter by ${selectedField.label}`}
            </h3>
          </div>

          <div className="px-1.5 border-b border-white/30 dark:border-white/20">
            {(selectedField.options || []).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setValue((prev) =>
                    prev === String(opt.value) ? "" : String(opt.value),
                  )
                }
                className={`flex items-center h-7 px-2 py-0 text-[11px] text-left border-none cursor-pointer transition-colors rounded-sm gap-1.5 w-full ${
                  value === String(opt.value)
                    ? "bg-gray-100/70 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200"
                    : "bg-transparent text-gray-700 dark:text-gray-100 hover:bg-white/10 dark:hover:bg-white/8"
                }`}
              >
                <span
                  className={`flex items-center justify-center w-3 h-3 rounded border shrink-0 transition-colors ${
                    value === String(opt.value)
                      ? "border-gray-500 bg-gray-500 text-white"
                      : "border-gray-400 dark:border-gray-500 bg-transparent"
                  }`}
                >
                  {value === String(opt.value) && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path
                        d="M1.5 4l2 2 3-3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span className="flex-1 truncate">{opt.label}</span>
              </button>
            ))}
          </div>

          <div className="px-2 py-1.5 border-t border-white/30 dark:border-white/20">
            <button
              onClick={handleApplyFilter}
              disabled={!value.trim()}
              className="w-full px-1 py-1.5 bg-gray-200/80 border border-gray-300/60 text-gray-600 text-[11px] font-medium rounded cursor-pointer hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Apply filter
            </button>
          </div>
        </>
      ) : selectedField.fieldName === "emailBounce" ||
        selectedField.fieldName === "premium" ||
        selectedField.fieldName === "partenaire" ||
        selectedField.fieldName === "statut" ||
        selectedField.fieldName === "typeLieu" ? (
        <>
          <div className="px-1 py-1.5 border-b border-white/30 dark:border-white/20 flex items-center gap-1">
            <button
              onClick={() => setSelectedField(null)}
              className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors shrink-0"
            >
              <ChevronLeft
                size={18}
                className="text-gray-600 dark:text-gray-400"
              />
            </button>
            <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100">
              {`Filter by ${selectedField.label}`}
            </h3>
          </div>

          <div className="px-1.5 border-b border-white/30 dark:border-white/20">
            {(selectedField.options || []).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue(String(opt.value))}
                className={`flex items-center h-7 px-2 py-0 text-[11px] text-left border-none cursor-pointer transition-colors rounded-sm gap-1.5 w-full ${
                  value === String(opt.value)
                    ? "bg-gray-100/70 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200"
                    : "bg-transparent text-gray-700 dark:text-gray-100 hover:bg-white/10 dark:hover:bg-white/8"
                }`}
              >
                <span
                  className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${
                    value === String(opt.value)
                      ? "border-gray-500"
                      : "border-gray-400 dark:border-gray-500"
                  }`}
                >
                  {value === String(opt.value) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-gray-300" />
                  )}
                </span>
                <span className="flex-1 truncate">{opt.label}</span>
              </button>
            ))}
          </div>

          <div className="px-2 py-1.5 border-t border-white/30 dark:border-white/20">
            <button
              onClick={handleApplyFilter}
              disabled={!value.trim()}
              className="w-full px-1 py-1.5 bg-gray-200/80 border border-gray-300/60 text-gray-600 text-[11px] font-medium rounded cursor-pointer hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Apply filter
            </button>
          </div>
        </>
      ) : (
        // Step 2: Configure filter
        <>
          {selectedField.fieldName === "id" ||
          selectedField.fieldName === "offres" ||
          selectedField.fieldName === "nom" ||
          selectedField.fieldName === "titre" ||
          selectedField.fieldName === "annonceClient" ? (
            <div className="px-1 py-1.5 border-b border-white/30 dark:border-white/20 flex items-center gap-1">
              <button
                onClick={() => setSelectedField(null)}
                className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors shrink-0"
              >
                <ChevronLeft
                  size={18}
                  className="text-gray-600 dark:text-gray-400"
                />
              </button>
              <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100">
                {`Filter by ${selectedField.label}`}
              </h3>
            </div>
          ) : (
            <DropdownHeader
              title={`Filter by ${selectedField.label}`}
              onClose={() => setSelectedField(null)}
            />
          )}
          {/* Operator select */}
          <div
            className="px-2 py-1.5 border-b border-white/10 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <Select
              value={operator}
              onValueChange={(value) => setOperator(value as FilterOperator)}
              indicatorVisibility={false}
            >
              <SelectTrigger
                size="sm"
                className="h-7! py-0! rounded-sm! bg-white/30 dark:bg-gray-800/30 border! border-gray-100! dark:border-white/20 text-[11px]! text-gray-600 dark:text-gray-300"
              >
                <span className="text-[11px] text-gray-600 dark:text-gray-300">
                  {OPERATORS.find((op) => op.value === operator)?.label ||
                    "Select operator"}
                </span>
              </SelectTrigger>
              <SelectContent className="z-120 max-h-44 min-w-40">
                {OPERATORS.map((op) => (
                  <SelectItem
                    key={op.value}
                    value={op.value}
                    className="ps-2! pe-2! text-[10px] text-gray-500 dark:text-gray-400 data-[state=checked]:text-gray-700 dark:data-[state=checked]:text-gray-200"
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                          operator === op.value
                            ? "border-gray-500"
                            : "border-gray-400 dark:border-gray-500"
                        }`}
                      >
                        {operator === op.value && (
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-gray-300" />
                        )}
                      </span>
                      <span>{op.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Value input */}
          {operator !== "isEmpty" && operator !== "isNotEmpty" && (
            <div className="px-2 py-1.5" onKeyDown={handleKeyDown}>
              {selectedField.options && selectedField.options.length > 0 ? (
                <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                  {selectedField.options.map((opt) => {
                    const dotColor: Record<string, string> = {
                      green: "bg-emerald-500",
                      gray: "bg-gray-400",
                      red: "bg-red-500",
                      amber: "bg-amber-500",
                      yellow: "bg-yellow-400",
                      purple: "bg-purple-500",
                      orange: "bg-orange-500",
                    };
                    const dot = (
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${dotColor[opt.color ?? "gray"] ?? "bg-gray-400"}`}
                      />
                    );
                    return (
                      <DropdownMenuItem
                        key={opt.value}
                        icon={dot}
                        label={opt.label}
                        active={value === opt.value}
                        onClick={() => handleSelectAndApply(opt.value)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="relative">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    autoFocus
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Enter value..."
                    className="w-full bg-transparent border border-gray-200 dark:border-white/10 rounded pl-7 pr-2 py-1.5 text-[11px] text-gray-900 dark:text-gray-100 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:focus:border-white/20 transition-colors"
                  />
                </div>
              )}
            </div>
          )}

          <DropdownSeparator />

          {/* Apply button */}
          <div className="px-2 py-1.5">
            <button
              onClick={handleApplyFilter}
              disabled={
                operator !== "isEmpty" &&
                operator !== "isNotEmpty" &&
                !value.trim()
              }
              className="w-full px-1 py-1.5 bg-gray-200/80 border border-gray-300/60 text-gray-600 text-[11px] font-medium rounded cursor-pointer hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Apply filter
            </button>
          </div>
        </>
      )}
    </Dropdown>
  );
};

export { IconFilter };
