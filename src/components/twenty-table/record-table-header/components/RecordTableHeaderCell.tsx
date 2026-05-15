import { useCallback, useState } from "react";
import { useAtomValue } from "jotai";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import type { ColumnDefinition, FieldType } from "../../types";
import { RecordTableHeaderResizeHandler } from "./RecordTableHeaderResizeHandler";
import { RecordTableHeaderContextMenu } from "./RecordTableHeaderContextMenu";
import { resizedColumnIdAtom } from "../../states";
import { useRecordTable } from "../../hooks/useRecordTable";
import { useRecordTableContextOrThrow } from "../../contexts";
import { useRowHeight } from "../../hooks/useRowHeight";
import {
  RECORD_TABLE_COLUMN_CHECKBOX_WIDTH,
  RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH,
} from "../../constants";
import {
  Award,
  BadgeCheck,
  Eye,
  MapPin,
  ReceiptText,
  School,
  SatelliteDish,
  Workflow,
  SquareCheckBig,
  Mail,
} from "lucide-react";

/** Small icon representing the field type (like Twenty) */
const FieldTypeIcon = ({
  type,
  fieldName,
}: {
  type: FieldType;
  fieldName?: string;
}) => {
  const cls = "size-3 text-gray-400 dark:text-gray-500 shrink-0";

  // Special case for ville (city) relation — show map pin icon
  if (type === "RELATION" && fieldName === "ville") {
    return <MapPin className="size-3 text-gray-400 shrink-0" />;
  }

  // Special case for école (school) relation — show graduation cap icon
  if (type === "RELATION" && fieldName === "nomEcole") {
    return <School className="size-3 text-gray-400 shrink-0" />;
  }

  // Special case for entreprise relation column
  if (fieldName === "entreprise") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-gray-500 shrink-0">
        <path d="M3 21l18 0" />
        <path d="M5 21v-14l8 -4v18" />
        <path d="M19 21v-10l-6 -4" />
        <path d="M9 9l0 .01" />
        <path d="M9 12l0 .01" />
        <path d="M9 15l0 .01" />
        <path d="M9 18l0 .01" />
      </svg>
    );
  }

  // Special case for login source column
  if (fieldName === "loginSource") {
    return <SatelliteDish className="size-3 -ml-3 shrink-0 text-gray-400" />;
  }

  // Special case for auth method column
  if (fieldName === "authMethod") {
    return <Workflow className="size-3 -ml-3 shrink-0 text-gray-400" />;
  }

  // Special case for email bounce column (compact alignment when column is shrunk)
  if (fieldName === "emailBounce") {
    return <Mail className="size-3 -ml-3 shrink-0 text-gray-400" />;
  }
  
  // Special case for premium affected count column
  if (fieldName === "premiumUpgradeCount") {
    return <BadgeCheck className="size-3 -ml-3 shrink-0 text-gray-400" />;
  }

  // Special case for premium column (compact icon like premiumUpgradeCount)
  if (fieldName === "premium") {
    return <BadgeCheck className="size-3 -ml-3 shrink-0 text-gray-400" />;
  }

  // Special case for labels RH column
  if (fieldName === "labelsRH") {
    return <Award className="size-3 text-gray-400 dark:text-gray-500 shrink-0" />;
  }

  // Special case for entreprise name column
  if (fieldName === "nom") {
    return (
      <svg
        className={cls}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M3 3h10M8 3v10M5 13h6" strokeLinecap="round" />
      </svg>
    );
  }

  // Special case for ID column (compact alignment when column is shrunk)
  if (fieldName === "id") {
    return (
      <svg
        className="size-3 -ml-3 text-gray-400 dark:text-gray-500 shrink-0"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M4 13l8-10M3 6h4M9 10h4" strokeLinecap="round" />
      </svg>
    );
  }

  // Special case for annonce origin (interne/externe) column
  if (fieldName === "annonceClient") {
    return <SquareCheckBig className="size-3 -ml-3 stroke-3 shrink-0 text-gray-400" />;
  }

  // Special case for statut column
  if (fieldName === "statut") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-gray-500 shrink-0">
        <path d="M7.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
        <path d="M3 6v5.172a2 2 0 0 0 .586 1.414l7.71 7.71a2.41 2.41 0 0 0 3.408 0l5.592 -5.592a2.41 2.41 0 0 0 0 -3.408l-7.71 -7.71a2 2 0 0 0 -1.414 -.586h-5.172a3 3 0 0 0 -3 3z" />
      </svg>
    );
  }

  // Special case for vues (views) column
  if (fieldName === "nbVue") {
    return <Eye className="size-3 -ml-3 text-gray-400 dark:text-gray-500 shrink-0" />;
  }

  // Special case for candidatures column
  if (fieldName === "candidatures") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="-ml-3 text-gray-400 dark:text-gray-500 shrink-0">
        <path d="M5 3m0 2a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z" />
        <path d="M9 7l6 0" />
        <path d="M9 11l6 0" />
        <path d="M9 15l4 0" />
      </svg>
    );
  }

  switch (type) {
    case "TEXT":
      return (
        <svg
          className={cls}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3 3h10M8 3v10M5 13h6" strokeLinecap="round" />
        </svg>
      );
    case "NUMBER":
    case "CURRENCY":
      return (
        <svg
          className={cls}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4 13l8-10M3 6h4M9 10h4" strokeLinecap="round" />
        </svg>
      );
    case "DATE":
      return (
        <svg
          className={cls}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="2" y="3" width="12" height="11" rx="1.5" />
          <path d="M2 7h12M5 1v3M11 1v3" strokeLinecap="round" />
        </svg>
      );
    case "EMAIL":
      return (
        <svg
          className={cls}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />
          <path
            d="M1.5 4.5l6.5 4 6.5-4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "PHONE":
      return (
        <svg
          className={cls}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            d="M3 2h3l1.5 4-2 1.5a8 8 0 003.5 3.5L10.5 9l4 1.5v3a1 1 0 01-1 1A12 12 0 012 3a1 1 0 011-1z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "URL":
      return (
        <svg
          className={cls}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            d="M6.5 9.5l3-3M5 10l-1.5 1.5a2 2 0 002.8 2.8L8 13M11 6l1.5-1.5a2 2 0 00-2.8-2.8L8 3"
            strokeLinecap="round"
          />
        </svg>
      );
    case "SELECT":
      return (
        <svg
          className={cls}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="2" y="4" width="12" height="3" rx="1.5" />
          <rect x="2" y="9" width="8" height="3" rx="1.5" />
        </svg>
      );
    case "BOOLEAN":
      return (
        <svg
          className={cls}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="2" y="3" width="12" height="10" rx="2" />
          <path d="M5 8l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "RELATION":
      return (
        <svg
          className={cls}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="5" cy="8" r="2.5" />
          <circle cx="11" cy="8" r="2.5" />
          <path d="M7.5 8h1" strokeLinecap="round" />
        </svg>
      );
    case "CV_SCORE":
      return (
        <svg
          className={cls}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            d="M9.5 1.5H4a1.5 1.5 0 00-1.5 1.5v10A1.5 1.5 0 004 14.5h8a1.5 1.5 0 001.5-1.5V5.5L9.5 1.5z"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 1.5V5.5H13.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M5.5 8.5h5M5.5 11h3" strokeLinecap="round" />
        </svg>
      );
    case "PHOTO_SCORE":
      return (
        <svg
          className={cls}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="2" y="3" width="12" height="10" rx="1.5" />
          <circle cx="5.5" cy="6.5" r="1.25" />
          <path
            d="M2 10.5l3-2.5 2 1.5 4-3 3 2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "PREMIUM_BADGE":
      return <BadgeCheck className="size-3 text-gray-400 shrink-0" />;
    case "MULTI_SELECT":
      return <ReceiptText className="size-3 text-gray-400 shrink-0" />;
    default:
      return null;
  }
};

type RecordTableHeaderCellProps = {
  column: ColumnDefinition;
  columnIndex: number;
  onResizeStart: (columnId: string, startX: number) => void;
  onAutoFit: (columnId: string) => void;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  isDragging?: boolean;
};

export const RecordTableHeaderCell = ({
  column,
  columnIndex,
  onResizeStart,
  onAutoFit,
  dragHandleProps,
  isDragging,
}: RecordTableHeaderCellProps) => {
  const { records, columns } = useRecordTableContextOrThrow();
  const { toggleSort, sortState } = useRecordTable(records, columns);
  const resizedColumnId = useAtomValue(resizedColumnIdAtom);
  const rowHeight = useRowHeight();

  const isResizing = resizedColumnId !== null;
  const isSorted = sortState?.fieldName === column.fieldName;
  const sortDirection = isSorted ? sortState?.direction : null;

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleSort = useCallback(() => {
    if (column.isSortable !== false) {
      toggleSort(column.fieldName);
    }
  }, [column, toggleSort]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleSortFromMenu = useCallback(
    (direction: "asc" | "desc") => {
      // Direct sort with specific direction
      if (
        sortState?.fieldName === column.fieldName &&
        sortState?.direction === direction
      )
        return;
      toggleSort(column.fieldName);
      // If already sorted but wrong direction, toggle again
      if (
        sortState?.fieldName === column.fieldName &&
        sortState?.direction !== direction
      ) {
        toggleSort(column.fieldName);
      }
    },
    [column.fieldName, sortState, toggleSort],
  );

  return (
    <div
      className={`
        relative flex items-center select-none shrink-0
        border-b border-r border-gray-200/80 dark:border-gray-700/80
        bg-white dark:bg-gray-900
        ${isResizing ? "" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}
        ${columnIndex === 0 ? "sticky z-20" : ""}
        ${isDragging ? "shadow-lg rounded opacity-90" : ""}
      `}
      style={{
        width: `var(--record-table-column-field-${columnIndex}, ${column.size}px)`,
        minWidth: `var(--record-table-column-field-${columnIndex}, ${column.size}px)`,
        maxWidth: `var(--record-table-column-field-${columnIndex}, ${column.size}px)`,
        height: rowHeight,
        left:
          columnIndex === 0
            ? RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH +
              RECORD_TABLE_COLUMN_CHECKBOX_WIDTH
            : undefined,
      }}
    >
      <RecordTableHeaderResizeHandler
        columnId={column.id}
        columnIndex={columnIndex}
        position="left"
        onResizeStart={onResizeStart}
        onAutoFit={onAutoFit}
      />

      <div
        className="flex items-center gap-1.5 px-2 w-full h-full cursor-pointer group/header"
        onClick={handleSort}
        onContextMenu={handleContextMenu}
        {...dragHandleProps}
      >
        {/* Drag grip icon — visible on hover */}
        <svg
          className="w-3 h-3 text-gray-300 dark:text-gray-600 shrink-0 opacity-0 group-hover/header:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <circle cx="5" cy="4" r="1.2" />
          <circle cx="11" cy="4" r="1.2" />
          <circle cx="5" cy="8" r="1.2" />
          <circle cx="11" cy="8" r="1.2" />
          <circle cx="5" cy="12" r="1.2" />
          <circle cx="11" cy="12" r="1.2" />
        </svg>

        <FieldTypeIcon type={column.type} fieldName={column.fieldName} />

        <span className="text-[12px] font-medium text-gray-400 dark:text-gray-400 truncate">
          {column.label}
        </span>

        {/* Sort indicator — visible when sorted, hint on hover otherwise */}
        {isSorted ? (
          <svg
            className={`w-3 h-3 text-blue-500 shrink-0 transition-transform ${
              sortDirection === "desc" ? "rotate-180" : ""
            }`}
            viewBox="0 0 12 12"
            fill="none"
          >
            <path d="M6 2l4 5H2l4-5z" fill="currentColor" />
          </svg>
        ) : column.isSortable !== false ? (
          <svg
            className="w-3 h-3 text-gray-300 dark:text-gray-600 shrink-0 opacity-0 group-hover/header:opacity-100 transition-opacity"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path d="M6 2l3 4H3l3-4zM6 10l3-4H3l3 4z" fill="currentColor" />
          </svg>
        ) : null}
      </div>

      <RecordTableHeaderResizeHandler
        columnId={column.id}
        columnIndex={columnIndex}
        position="right"
        onResizeStart={onResizeStart}
        onAutoFit={onAutoFit}
      />

      {contextMenu && (
        <RecordTableHeaderContextMenu
          column={column}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          onSort={column.isSortable !== false ? handleSortFromMenu : undefined}
          onAutoFit={() => onAutoFit(column.id)}
        />
      )}
    </div>
  );
};
