import { useState, useCallback } from "react";
import { useAtom } from "jotai";
import { Dropdown, DropdownSeparator, DropdownMenuItem } from "./Dropdown";
import { HeaderDropdownButton } from "./HeaderDropdownButton";
import {
  optionsDropdownOpenAtom,
  hiddenColumnIdsAtom,
  columnPositionsAtom,
} from "../states/toolbarState";
import { rowHeightSizeAtom } from "../../states";
import type { RecordTableRowHeightSize } from "../../constants";
import type { ColumnDefinition } from "../../types";
import { Lock } from "lucide-react";

const IconListDetails = () => (
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
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);

const IconCopy = () => (
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
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const IconChevronRight = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IconPlus = () => (
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
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconEyeOff = () => (
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
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const IconDragHandle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="9" cy="5" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="9" cy="19" r="1.5" />
    <circle cx="15" cy="5" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="15" cy="19" r="1.5" />
  </svg>
);

const IconArrowLeft = () => (
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
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

// Column label icons - unique icon per field label
const getColumnLabelIcon = (label: string) => {
  const labelLower = label.toLowerCase();

  const icons: Record<string, React.ReactNode> = {
    "nom complet": (
      <svg
        width="14"
        height="14"
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
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 5L2 7" />
      </svg>
    ),
    entreprise: (
      <svg
        width="14"
        height="14"
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
        width="14"
        height="14"
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
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
    lieu: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
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
    statut: (
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
    gsm: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
    téléphone: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
    premium: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 2L15 10H23L17 15L19 23L12 19L5 23L7 15L1 10H9L12 2Z" />
      </svg>
    ),
    offres: (
      <svg
        width="14"
        height="14"
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
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20M6 17h12" />
      </svg>
    ),
    id: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 9h6M9 15h6" />
      </svg>
    ),
    titre: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 3h-8v4h8V3z" />
      </svg>
    ),
    cv: (
      <svg
        width="14"
        height="14"
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
    "état cv": (
      <svg
        width="14"
        height="14"
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
    photo: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17 4l2-2" />
      </svg>
    ),
    école: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M7 15H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3" />
        <path d="M17 15h3a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-3" />
        <path d="M12 13V9m0 0L2 5m10-4l10 4v7" />
      </svg>
    ),
    niveau: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
    "site web": (
      <svg
        width="14"
        height="14"
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
        width="14"
        height="14"
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
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    lien: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    annonce: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    "type contrat": (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    "type(s) de contrat": (
      <svg
        width="14"
        height="14"
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
        width="14"
        height="14"
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
    métiers: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M6 9a6 6 0 1 0 12 0A6 6 0 0 0 6 9z" />
        <path d="M12 3v4m0 8v4" />
      </svg>
    ),
    "créé par": (
      <svg
        width="14"
        height="14"
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
    nom: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M2 11h20M6 7V4M18 7V4" />
      </svg>
    ),
    "d.connexion": (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
    ),
    "inscrit le": (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M9 16l2 2 4-4" />
      </svg>
    ),
    "date création": (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
    candidats: (
      <svg
        width="14"
        height="14"
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
    télétravail: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  };

  const icon =
    Object.entries(icons).find(([key]) => labelLower.includes(key))?.[1] ||
    null;

  return (
    icon || (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    )
  );
};

type OptionsDropdownProps = {
  columns: ColumnDefinition[];
};

type ContentView = "main" | "fields" | "hidden";

const ROW_HEIGHT_OPTIONS: { label: string; value: RecordTableRowHeightSize }[] =
  [
    { label: "Compact", value: "compact" },
    { label: "Standard", value: "standard" },
    { label: "Comfortable", value: "comfortable" },
  ];

/**
 * Options dropdown matching Twenty's ObjectOptionsDropdown.
 * Contains: Fields visibility, Row height, Copy link to view.
 */
export const OptionsDropdown = ({ columns }: OptionsDropdownProps) => {
  const [open, setOpen] = useAtom(optionsDropdownOpenAtom);
  const [hiddenIds, setHiddenIds] = useAtom(hiddenColumnIdsAtom);
  const [columnPositions, setColumnPositions] = useAtom(columnPositionsAtom);
  const [rowHeightSize, setRowHeightSize] = useAtom(rowHeightSizeAtom);
  const [contentView, setContentView] = useState<ContentView>("main");
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  // Count visible columns (only hiddenIds determines visibility, not isVisible)
  const visibleCount = columns.filter((c) => !hiddenIds.has(c.id)).length;

  const handleOpenChange = useCallback(
    (v: boolean) => {
      setOpen(v);
      if (!v) setContentView("main");
    },
    [setOpen],
  );

  const toggleColumn = (colId: string) => {
    setHiddenIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(colId)) {
        next.delete(colId);
      } else {
        next.add(colId);
      }
      return next;
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    handleOpenChange(false);
  };

  const visibleColumns = columns
    .filter((col) => !hiddenIds.has(col.id))
    .sort((a, b) => {
      const posA = columnPositions[a.id] ?? a.position;
      const posB = columnPositions[b.id] ?? b.position;
      return posA - posB;
    });

  const handleDragStart = (columnId: string) => {
    setDraggedColumnId(columnId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (targetColumnId: string) => {
    if (!draggedColumnId || draggedColumnId === targetColumnId) {
      setDraggedColumnId(null);
      return;
    }

    const draggedIndex = visibleColumns.findIndex(
      (c) => c.id === draggedColumnId,
    );
    const targetIndex = visibleColumns.findIndex(
      (c) => c.id === targetColumnId,
    );

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedColumnId(null);
      return;
    }

    // Create new order by removing dragged column and inserting at target position
    const newVisibleOrder = visibleColumns.filter(
      (c) => c.id !== draggedColumnId,
    );
    newVisibleOrder.splice(targetIndex, 0, visibleColumns[draggedIndex]);

    // Assign new positions to all visible columns
    const newPositions: Record<string, number> = {};
    newVisibleOrder.forEach((col, idx) => {
      newPositions[col.id] = idx;
    });

    setColumnPositions(newPositions);
    setDraggedColumnId(null);
  };

  return (
    <Dropdown
      open={open}
      onOpenChange={handleOpenChange}
      width={220}
      align="right"
      trigger={
        <HeaderDropdownButton
          label="Options"
          isOpen={open}
          onClick={() => handleOpenChange(!open)}
        />
      }
    >
      {contentView === "main" ? (
        <>
          <div className="flex flex-col gap-0.5 py-1 px-0.5">
            <DropdownMenuItem
              icon={<Lock className="size-3" />}
              label="Default View"
              onClick={() => {}}
            />
          </div>
          <DropdownSeparator />
          <div className="flex flex-col gap-0.5 py-1 px-0.5">
            <DropdownMenuItem
              icon={<IconListDetails />}
              label="Fields"
              rightText={`${visibleCount} shown`}
              rightTextColor="text-green-600 dark:text-green-400"
              rightIcon={<IconChevronRight />}
              onClick={() => setContentView("fields")}
            />
          </div>
          <DropdownSeparator />
          <div className="flex flex-col gap-0.5 py-1 px-0.5">
            <div className="px-2 py-1 text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Row Height
            </div>
            {ROW_HEIGHT_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                label={opt.label}
                className="text-[10px]! h-6!"
                rightText={rowHeightSize === opt.value ? "✓" : ""}
                rightTextColor="text-blue-500"
                onClick={() => setRowHeightSize(opt.value)}
              />
            ))}
          </div>
          <DropdownSeparator />
          <div className="flex flex-col gap-0.5 py-1 px-0.5">
            <DropdownMenuItem
              icon={<IconCopy />}
              label="Copy link to view"
              onClick={handleCopyLink}
            />
          </div>
          <DropdownSeparator />
          <div className="flex flex-col gap-0.5 py-1 px-1">
            <DropdownMenuItem
              icon={<IconPlus />}
              label="Create custom view"
              onClick={() => {}}
            />
          </div>
        </>
      ) : contentView === "fields" ? (
        <>
          <div className="flex items-center gap-2 px-2 py-2 border-b border-white/10 dark:border-white/10">
            <button
              onClick={() => setContentView("main")}
              className="flex items-center justify-center w-6 h-6 rounded hover:bg-white/10 dark:hover:bg-white/8 text-gray-500 dark:text-gray-300 cursor-pointer border-none bg-transparent transition-colors"
            >
              <IconArrowLeft />
            </button>
            <span className="text-[0.8125rem] font-semibold text-gray-900 dark:text-white">
              Fields
            </span>
          </div>

          <div className="max-h-[calc(100vh-140px)] overflow-y-auto py-1 px-0.5 flex flex-col gap-0.5">
            {visibleColumns.map((col) => {
              return (
                <div
                  key={col.id}
                  draggable
                  onDragStart={() => handleDragStart(col.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(col.id)}
                  onDragLeave={(e) => e.preventDefault()}
                  className={`group flex items-center h-8 px-2 py-0 text-[0.8125rem] text-gray-700 dark:text-gray-100 bg-transparent hover:bg-white/10 dark:hover:bg-white/8 rounded-sm transition-colors gap-1 cursor-move ${
                    draggedColumnId === col.id
                      ? "opacity-50 bg-white/15 dark:bg-white/10"
                      : ""
                  }`}
                >
                  <span className="flex items-center justify-center w-4 h-4 text-gray-400 dark:text-gray-300 shrink-0 cursor-grab active:cursor-grabbing">
                    <IconDragHandle />
                  </span>
                  <span className="flex items-center justify-center w-4 h-4 text-gray-500 dark:text-gray-300 shrink-0">
                    {getColumnLabelIcon(col.label)}
                  </span>
                  <span className="flex-1 truncate">{col.label}</span>
                  <button
                    onClick={() => toggleColumn(col.id)}
                    className="flex items-center justify-center w-4 h-4 text-gray-400 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 dark:hover:text-red-400 cursor-pointer"
                  >
                    <IconEyeOff />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="border-t border-white/10 dark:border-white/10 py-1 px-0.5">
            <button
              onClick={() => setContentView("hidden")}
              className="flex items-center h-8 px-2 py-0 text-[0.8125rem] text-gray-700 dark:text-gray-100 bg-transparent hover:bg-white/10 dark:hover:bg-white/8 rounded-sm transition-colors gap-2 w-full"
            >
              <span className="flex items-center justify-center w-4 h-4 text-gray-500 dark:text-gray-300 shrink-0">
                <IconEyeOff />
              </span>
              <span className="flex-1 truncate text-left">Hidden Fields</span>
              <span className="text-gray-500 dark:text-gray-300">
                <IconChevronRight />
              </span>
            </button>
          </div>
        </>
      ) : contentView === "hidden" ? (
        <>
          <div className="flex items-center gap-2 px-2 py-2 border-b border-white/10 dark:border-white/10">
            <button
              onClick={() => setContentView("fields")}
              className="flex items-center justify-center w-6 h-6 rounded hover:bg-white/10 dark:hover:bg-white/8 text-gray-500 dark:text-gray-300 cursor-pointer border-none bg-transparent transition-colors"
            >
              <IconArrowLeft />
            </button>
            <span className="text-[0.8125rem] font-semibold text-gray-900 dark:text-white">
              Hidden Fields
            </span>
          </div>

          <div className="max-h-[calc(100vh-140px)] overflow-y-auto py-1 px-0.5 flex flex-col gap-0.5">
            {columns
              .filter((col) => hiddenIds.has(col.id))
              .map((col) => (
                <div
                  key={col.id}
                  className="flex items-center h-8 px-2 py-0 text-[0.8125rem] text-gray-700 dark:text-gray-100 bg-transparent hover:bg-white/10 dark:hover:bg-white/8 rounded-sm transition-colors gap-1"
                >
                  <span className="flex items-center justify-center w-4 h-4 text-gray-500 dark:text-gray-300 shrink-0">
                    {getColumnLabelIcon(col.label)}
                  </span>
                  <span className="flex-1 truncate">{col.label}</span>
                  <button
                    onClick={() => toggleColumn(col.id)}
                    className="flex items-center justify-center w-4 h-4 text-gray-400 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 cursor-pointer transition-colors"
                  >
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
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
              ))}
          </div>
        </>
      ) : null}
    </Dropdown>
  );
};
