import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import {
  resizedColumnIdAtom,
  resizeOffsetAtom,
  columnWidthsAtom,
} from "../states";
import { useRecordTableContextOrThrow } from "../contexts";
import {
  RECORD_TABLE_COLUMN_MIN_WIDTH,
  RECORD_TABLE_HTML_ID,
} from "../constants";
import {
  updateRecordTableCSSVariable,
  getRecordTableColumnFieldWidthCSSVariableName,
} from "../utils";

/**
 * Hook managing column resize with real-time CSS variable updates.
 * Inspired by Twenty CRM's useResizeTableHeader.
 *
 * IMPORTANT: This hook must be called ONCE (in RecordTableHeader), not per
 * resize handle. It registers a single pair of pointermove / pointerup
 * listeners on `document` when a resize is active.
 *
 * Individual resize handles should use `useResizeHandlerState()` instead,
 * which only reads atoms without registering any listeners.
 *
 * Flow:
 *  1. pointerdown on resize handle → calls handleResizeStart(columnId, clientX)
 *  2. pointermove → updates CSS variable directly on the DOM (no React re-render)
 *  3. pointerup → persists final width to columnWidthsAtom + calls onColumnResize
 */
export const useResizeTableHeader = () => {
  const { visibleColumns, onColumnResize } = useRecordTableContextOrThrow();
  const [resizedColumnId, setResizedColumnId] = useAtom(resizedColumnIdAtom);
  const setResizeOffset = useSetAtom(resizeOffsetAtom);
  const columnWidths = useAtomValue(columnWidthsAtom);
  const setColumnWidths = useSetAtom(columnWidthsAtom);

  // Refs to avoid stale closures in pointermove/pointerup listeners
  const startXRef = useRef<number>(0);
  const initialWidthRef = useRef<number>(0);
  const resizedColumnIndexRef = useRef<number>(-1);
  const currentWidthRef = useRef<number>(0);
  const resizedColumnIdRef = useRef<string | null>(null);
  const minWidthRef = useRef<number>(RECORD_TABLE_COLUMN_MIN_WIDTH);
  const onColumnResizeRef = useRef(onColumnResize);
  onColumnResizeRef.current = onColumnResize;

  // Keep fresh references for the effect closure
  const visibleColumnsRef = useRef(visibleColumns);
  visibleColumnsRef.current = visibleColumns;
  const columnWidthsRef = useRef(columnWidths);
  columnWidthsRef.current = columnWidths;

  const handleResizeStart = useCallback(
    (columnId: string, startX: number) => {
      const cols = visibleColumnsRef.current;
      const widths = columnWidthsRef.current;
      const columnIndex = cols.findIndex((c) => c.id === columnId);
      const column = cols[columnIndex];
      if (!column) return;

      const width = widths[columnId] ?? column.size;

      resizedColumnIdRef.current = columnId;
      setResizedColumnId(columnId);
      startXRef.current = startX;
      initialWidthRef.current = width;
      currentWidthRef.current = width;
      resizedColumnIndexRef.current = columnIndex;
      minWidthRef.current = column.minSize ?? RECORD_TABLE_COLUMN_MIN_WIDTH;

      // Global cursor override during resize
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [setResizedColumnId],
  );

  useEffect(() => {
    if (!resizedColumnId) return;

    const handlePointerMove = (e: PointerEvent) => {
      const offset = e.clientX - startXRef.current;
      const newWidth = Math.max(
        minWidthRef.current,
        initialWidthRef.current + offset,
      );

      // Update CSS variable directly on the DOM for instant visual feedback.
      // No atom writes here — avoids re-renders that would overwrite this value.
      const columnIndex = resizedColumnIndexRef.current;
      if (columnIndex >= 0) {
        updateRecordTableCSSVariable(
          getRecordTableColumnFieldWidthCSSVariableName(columnIndex),
          `${newWidth}px`,
        );
      }

      currentWidthRef.current = newWidth;
    };

    const handlePointerUp = () => {
      const finalWidth = currentWidthRef.current;
      const columnId = resizedColumnIdRef.current;

      if (columnId) {
        // Persist final width to atom — triggers ONE re-render with the correct value
        setColumnWidths((prev) => ({
          ...prev,
          [columnId]: finalWidth,
        }));

        // Call external callback if provided
        onColumnResizeRef.current?.(columnId, finalWidth);
      }

      // Reset state
      resizedColumnIdRef.current = null;
      setResizedColumnId(null);
      setResizeOffset(0);

      // Reset cursor
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizedColumnId, setResizedColumnId, setResizeOffset, setColumnWidths]);

  const handleAutoFit = useCallback(
    (columnId: string) => {
      const cols = visibleColumnsRef.current;
      const columnIndex = cols.findIndex((c) => c.id === columnId);
      if (columnIndex < 0) return;

      const tableEl = document.getElementById(RECORD_TABLE_HTML_ID);
      if (!tableEl) return;

      // Measure all cells in this column by querying by CSS variable index
      const cssVarName =
        getRecordTableColumnFieldWidthCSSVariableName(columnIndex);

      // Temporarily set width to auto to measure natural content width
      // Approach: measure scrollWidth of each cell in this column
      const allRows = tableEl.querySelectorAll<HTMLElement>(
        '[data-testid^="row-id-"]',
      );
      let maxContentWidth = 0;

      // Measure header cell content
      const headerCells = tableEl.querySelectorAll<HTMLElement>(
        ".flex.flex-row.sticky",
      );
      if (headerCells.length > 0) {
        const headerRow = headerCells[0];
        const headerChildren = Array.from(headerRow.children) as HTMLElement[];
        // Skip drag-drop (index 0) and checkbox (index 1), data columns start at index 2
        const headerCell = headerChildren[columnIndex + 2];
        if (headerCell) {
          const innerContent = headerCell.querySelector<HTMLElement>(
            ".flex.items-center.gap-1\\.5",
          );
          if (innerContent) {
            maxContentWidth = Math.max(
              maxContentWidth,
              innerContent.scrollWidth + 16,
            ); // +padding
          }
        }
      }

      // Measure body cells
      allRows.forEach((row) => {
        const cells = Array.from(row.children) as HTMLElement[];
        // Skip drag-drop (0) and checkbox (1)
        const cell = cells[columnIndex + 2];
        if (cell) {
          // Temporarily remove width constraints to measure natural width
          const originalWidth = cell.style.width;
          const originalMinWidth = cell.style.minWidth;
          const originalMaxWidth = cell.style.maxWidth;

          cell.style.width = "auto";
          cell.style.minWidth = "auto";
          cell.style.maxWidth = "none";

          maxContentWidth = Math.max(maxContentWidth, cell.scrollWidth + 8);

          // Restore
          cell.style.width = originalWidth;
          cell.style.minWidth = originalMinWidth;
          cell.style.maxWidth = originalMaxWidth;
        }
      });

      if (maxContentWidth <= 0) return;

      // Clamp to per-column min width (or global fallback)
      const col = cols[columnIndex];
      const colMinWidth = col?.minSize ?? RECORD_TABLE_COLUMN_MIN_WIDTH;
      const finalWidth = Math.max(
        colMinWidth,
        maxContentWidth,
      );

      // Update CSS variable and persist
      updateRecordTableCSSVariable(cssVarName, `${finalWidth}px`);
      setColumnWidths((prev) => ({
        ...prev,
        [columnId]: finalWidth,
      }));

      onColumnResizeRef.current?.(columnId, finalWidth);
    },
    [setColumnWidths],
  );

  return {
    resizedColumnId,
    handleResizeStart,
    handleAutoFit,
    isResizing: resizedColumnId !== null,
    columnWidths,
  };
};

/**
 * Lightweight hook for individual resize handles.
 * Only reads the atom — does NOT register any document-level event listeners.
 * This avoids the 2N listener problem (N columns × 2 handles per column).
 */
export const useResizeHandlerState = () => {
  const resizedColumnId = useAtomValue(resizedColumnIdAtom);
  return { resizedColumnId };
};
