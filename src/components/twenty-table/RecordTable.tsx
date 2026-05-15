import { useMemo, useCallback, useRef, useEffect, useContext } from "react";
import { type DropResult } from "@hello-pangea/dnd";
import { useSetAtom, useAtomValue } from "jotai";
import { RecordTableContext } from "./contexts/RecordTableContext";
import { RecordTableHeader } from "./record-table-header/components/RecordTableHeader";
import { RecordTableBody } from "./record-table-body/components/RecordTableBody";
import { RecordTableBodyLoading } from "./record-table-body/components/RecordTableBodyLoading";
import { RecordTableBulkActionBar } from "./record-table-body/components/RecordTableBulkActionBar";
import { useRecordTable } from "./hooks/useRecordTable";
import { useRecordTableHotkeys } from "./hooks/useRecordTableHotkeys";
import { useColumnWidthPersistence } from "./hooks/useColumnWidthPersistence";
import { useScrollShadow } from "./hooks/useScrollShadow";
import {
  numberOfRowsAtom,
  columnWidthsAtom,
  resizedColumnIdAtom,
  rowPositionsAtom,
} from "./states";
import { RECORD_TABLE_HTML_ID } from "./constants";
import type { ColumnDefinition, RecordData, BulkAction } from "./types";
import type { ReactNode } from "react";
import "./styles/scrollbars.css";
// Import framer-motion for transitions if needed
import { motion } from "framer-motion";

type RecordTableProps = {
  /** Unique table identifier */
  tableId?: string;
  /** Column definitions */
  columns: ColumnDefinition[];
  /** Data records */
  records: RecordData[];
  /** Loading state */
  isLoading?: boolean;
  /** Called when a cell value changes */
  onCellChange?: (recordId: string, fieldName: string, value: unknown) => void;
  /** Called when a record row is clicked */
  onRecordClick?: (recordId: string) => void;
  /** Called when a column is resized */
  onColumnResize?: (columnId: string, newSize: number) => void;
  /** Called when columns are reordered */
  onColumnReorder?: (fromIndex: number, toIndex: number) => void;
  /** Called when rows are reordered via drag & drop */
  onRowReorder?: (fromIndex: number, toIndex: number) => void;
  /** Called when a new record is created inline */
  onCreateRecord?: (data: Record<string, unknown>) => Promise<boolean>;
  /** Called when inline creation is cancelled */
  onCancelCreate?: () => void;
  /** Bulk actions shown in floating bar when rows are selected */
  bulkActions?: BulkAction[];
  /** Side panel or other content rendered inside the context (has access to RecordTableContext) */
  children?: ReactNode;
};

const RecordTableInner = ({
  tableId = "default",
  columns,
  records,
  isLoading = false,
  onCellChange,
  onRecordClick,
  onColumnResize,
  onColumnReorder,
  onRowReorder,
  onCreateRecord,
  onCancelCreate,
  bulkActions,
  children,
}: RecordTableProps) => {
  const { processedRecords, visibleColumns } = useRecordTable(records, columns);

  const setNumberOfRows = useSetAtom(numberOfRowsAtom);
  const setRowPositions = useSetAtom(rowPositionsAtom);
  const tableRef = useRef<HTMLDivElement>(null);

  // Persist column widths to localStorage
  useColumnWidthPersistence(tableId);

  // Scroll shadow indicators
  const scrollShadows = useScrollShadow(tableRef);

  // Check if we're already inside a Provider
  const providedContext = useContext(RecordTableContext);
  const hasProvidedContext = providedContext !== null;

  useEffect(() => {
    setNumberOfRows(processedRecords.length);
  }, [processedRecords.length, setNumberOfRows]);

  // Read persisted column widths (set by useResizeTableHeader on resize end)
  const columnWidths = useAtomValue(columnWidthsAtom);
  const resizedColumnId = useAtomValue(resizedColumnIdAtom);

  // Column width inline styles (CSS variables like Twenty)
  // Uses persisted width from atom if available, otherwise falls back to column.size.
  //
  // IMPORTANT: We SKIP the column currently being resized. During drag, its CSS
  // variable is set directly on the DOM by useResizeTableHeader. If we included
  // it here the inline style would overwrite the DOM value on every re-render,
  // causing "snapping" artefacts.
  const columnWidthStyles = useMemo(() => {
    const style: Record<string, string> = {};
    for (let i = 0; i < visibleColumns.length; i++) {
      const col = visibleColumns[i];
      if (col.id === resizedColumnId) continue; // managed by DOM during drag
      const width = columnWidths[col.id] ?? col.size;
      style[`--record-table-column-field-${i}`] = `${width}px`;
    }
    return style;
  }, [visibleColumns, columnWidths, resizedColumnId]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const from = result.source.index;
      const to = result.destination.index;
      if (from === to) return;

      // Reorder processedRecords locally to compute new positions
      const reordered = [...processedRecords];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);

      // Update rowPositionsAtom so useRecordTable re-sorts correctly
      const newPositions: Record<string, number> = {};
      reordered.forEach((record, i) => {
        newPositions[record.id] = i;
      });
      setRowPositions(newPositions);

      onRowReorder?.(from, to);
    },
    [processedRecords, onRowReorder, setRowPositions],
  );

  const contextValue = useMemo(
    () => ({
      recordTableId: tableId,
      columns,
      records: processedRecords,
      visibleColumns,
      onCellChange,
      onRecordClick,
      onColumnResize,
      onColumnReorder,
      onCreateRecord,
    }),
    [
      tableId,
      columns,
      processedRecords,
      visibleColumns,
      onCellChange,
      onRecordClick,
      onColumnResize,
      onColumnReorder,
      onCreateRecord,
    ],
  );

  // If already inside a Provider, just render content
  if (hasProvidedContext) {
    return (
      <>
        <RecordTableHotkeysWrapper />
        {/* Twenty pattern: flex row — table grows to fill */}
        <div className="flex flex-row w-full h-full min-h-0">
          <div
            className="flex flex-col min-w-0 min-h-0 relative"
            style={{ flex: "1 1 0", width: 0 }}
          >
            <div
              id={RECORD_TABLE_HTML_ID}
              ref={tableRef}
              className="
                relative flex flex-col h-full min-h-0
                bg-white dark:bg-gray-900
                overflow-auto
                text-sm
              "
              style={columnWidthStyles as React.CSSProperties}
            >
              <RecordTableHeader />
              {isLoading ? (
                <RecordTableBodyLoading columnCount={visibleColumns.length} />
              ) : processedRecords.length === 0 ? (
                <RecordTableEmptyState />
              ) : (
                <RecordTableBody
                  records={processedRecords}
                  onDragEnd={handleDragEnd}
                  onCreateRecord={onCreateRecord}
                  onCancelCreate={onCancelCreate}
                />
              )}
              {/* <RecordTableFooter
                totalCount={records.length}
                filteredCount={processedRecords.length}
              /> */}
              {/* <RecordTableBulkActionBar actions={bulkActions} /> */}
            </div>
            <ScrollShadowOverlays shadows={scrollShadows} />
          </div>
          {children}
        </div>
      </>
    );
  }

  // If not inside a Provider, provide one (backward compatibility)
  return (
    <RecordTableContext.Provider value={contextValue}>
      <>
        <RecordTableHotkeysWrapper />
        {/* Twenty pattern: flex row — table grows to fill, side panel is shrink-0 */}
        <div className="flex flex-row w-full h-full min-h-0">
          <div
            className="flex flex-col min-w-0 min-h-0 relative"
            style={{ flex: "1 1 0", width: 0 }}
          >
            <div
              id={RECORD_TABLE_HTML_ID}
              ref={tableRef}
              className="
                relative flex flex-col h-full min-h-0
                bg-white dark:bg-gray-900
                overflow-auto
                text-sm
              "
              style={columnWidthStyles as React.CSSProperties}
            >
              <RecordTableHeader />
              {isLoading ? (
                <RecordTableBodyLoading columnCount={visibleColumns.length} />
              ) : processedRecords.length === 0 ? (
                <RecordTableEmptyState />
              ) : (
                <RecordTableBody
                  records={processedRecords}
                  onDragEnd={handleDragEnd}
                  onCreateRecord={onCreateRecord}
                  onCancelCreate={onCancelCreate}
                />
              )}
              <RecordTableFooter
                totalCount={records.length}
                filteredCount={processedRecords.length}
              />
              <RecordTableBulkActionBar actions={bulkActions} />
            </div>
            <ScrollShadowOverlays shadows={scrollShadows} />
          </div>
          {/* Side panel slot — rendered inside context so it has access to records/columns */}
          {children}
        </div>
      </>
    </RecordTableContext.Provider>
  );
};

const RecordTableHotkeysWrapper = () => {
  useRecordTableHotkeys();
  return null;
};

type ScrollShadowOverlaysProps = {
  shadows: {
    showLeft: boolean;
    showRight: boolean;
    showTop: boolean;
    showBottom: boolean;
  };
};

const ScrollShadowOverlays = ({ shadows }: ScrollShadowOverlaysProps) => (
  <>
    {/* Left shadow */}
    <div
      className={`
        absolute left-0 top-0 bottom-0 w-4 pointer-events-none z-30
        bg-linear-to-r from-black/6 dark:from-black/20 to-transparent
        transition-opacity duration-200
        ${shadows.showLeft ? "opacity-100" : "opacity-0"}
      `}
    />
    {/* Right shadow */}
    <div
      className={`
        absolute right-0 top-0 bottom-0 w-4 pointer-events-none z-30
        bg-linear-to-l from-black/6 dark:from-black/20 to-transparent
        transition-opacity duration-200
        ${shadows.showRight ? "opacity-100" : "opacity-0"}
      `}
    />
    {/* Bottom shadow (subtle) */}
    <div
      className={`
        absolute left-0 right-0 bottom-0 h-3 pointer-events-none z-30
        bg-linear-to-t from-black/4 dark:from-black/15 to-transparent
        transition-opacity duration-200
        ${shadows.showBottom ? "opacity-100" : "opacity-0"}
      `}
    />
  </>
);

const RecordTableEmptyState = () => (
  <div className="flex items-center justify-center py-16 text-gray-400 dark:text-gray-500">
    <div className="flex flex-col items-center gap-4 max-w-xs text-center">
      {/* Illustrated empty state SVG */}
      <svg
        className="w-24 h-24 text-gray-200 dark:text-gray-700"
        viewBox="0 0 96 96"
        fill="none"
      >
        {/* Table outline */}
        <rect
          x="12"
          y="20"
          width="72"
          height="56"
          rx="6"
          stroke="currentColor"
          strokeWidth="2"
        />
        {/* Header row */}
        <rect
          x="12"
          y="20"
          width="72"
          height="14"
          rx="6"
          fill="currentColor"
          opacity="0.15"
        />
        <line
          x1="12"
          y1="34"
          x2="84"
          y2="34"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        {/* Column dividers */}
        <line
          x1="36"
          y1="20"
          x2="36"
          y2="76"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.4"
        />
        <line
          x1="60"
          y1="20"
          x2="60"
          y2="76"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.4"
        />
        {/* Row lines */}
        <line
          x1="12"
          y1="48"
          x2="84"
          y2="48"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.3"
        />
        <line
          x1="12"
          y1="62"
          x2="84"
          y2="62"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.3"
        />
        {/* Dashed placeholder cells */}
        <rect
          x="17"
          y="39"
          width="14"
          height="3"
          rx="1.5"
          fill="currentColor"
          opacity="0.15"
        />
        <rect
          x="41"
          y="39"
          width="14"
          height="3"
          rx="1.5"
          fill="currentColor"
          opacity="0.1"
        />
        <rect
          x="65"
          y="39"
          width="14"
          height="3"
          rx="1.5"
          fill="currentColor"
          opacity="0.1"
        />
        <rect
          x="17"
          y="53"
          width="14"
          height="3"
          rx="1.5"
          fill="currentColor"
          opacity="0.1"
        />
        <rect
          x="41"
          y="53"
          width="10"
          height="3"
          rx="1.5"
          fill="currentColor"
          opacity="0.08"
        />
        <rect
          x="65"
          y="53"
          width="12"
          height="3"
          rx="1.5"
          fill="currentColor"
          opacity="0.08"
        />
        {/* Magnifying glass overlay */}
        <circle
          cx="68"
          cy="64"
          r="12"
          stroke="currentColor"
          strokeWidth="2.5"
          opacity="0.5"
          fill="white"
          fillOpacity="0.5"
        />
        <line
          x1="76.5"
          y1="72.5"
          x2="84"
          y2="80"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.5"
        />
        {/* Question mark in magnifying glass */}
        <text
          x="68"
          y="69"
          textAnchor="middle"
          fill="currentColor"
          fontSize="14"
          fontWeight="600"
          opacity="0.4"
        >
          ?
        </text>
      </svg>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Aucun enregistrement
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Il n'y a pas encore de données à afficher. Essayez de modifier vos
          filtres ou d'ajouter un nouvel enregistrement.
        </p>
      </div>
    </div>
  </div>
);

const RecordTableFooter = ({
  totalCount,
  filteredCount,
}: {
  totalCount: number;
  filteredCount: number;
}) => (
  <div className="flex items-end h-full justify-between px-3 pt-1.5 pb-1 border-t border-gray-200/80 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/30 text-xs text-gray-500 dark:text-gray-400">
    <span>
      {filteredCount === totalCount
        ? `${totalCount} record${totalCount !== 1 ? "s" : ""}`
        : `${filteredCount} of ${totalCount} records`}
    </span>
  </div>
);

/**
 * RecordTableContent — renders just the table without context provider.
 * Use inside RecordTableContext.Provider.
 */
const RecordTableContent = (props: RecordTableProps) => {
  return (
    <div className="h-full w-full min-h-0 min-w-0 overflow-hidden">
      <RecordTableInner {...props} />
    </div>
  );
};


export const RecordTable = (props: RecordTableProps) => {
  return (
    <div className="h-full w-full min-h-0 min-w-0 overflow-hidden">
      <RecordTableInner {...props} />
    </div>
  );
};
