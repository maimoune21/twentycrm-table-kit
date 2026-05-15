import { useCallback } from "react";
import { useResizeHandlerState } from "../../hooks/useResizeTableHeader";
import { useRecordTableContextOrThrow } from "../../contexts";

type RecordTableHeaderResizeHandlerProps = {
  columnId: string;
  columnIndex: number;
  position: "left" | "right";
  /** Passed down from RecordTableHeader — the single instance of handleResizeStart */
  onResizeStart: (columnId: string, startX: number) => void;
  /** Double-click auto-fits column width to content */
  onAutoFit: (columnId: string) => void;
};

/**
 * Resize handle placed at the left or right edge of a header cell.
 *
 * - `position="right"` → resizes the current column (columnIndex)
 * - `position="left"`  → resizes the **previous** column (columnIndex − 1),
 *   matching the behaviour of Twenty CRM where the border between two columns
 *   belongs to the column on the left.
 *
 * The first column's left handler is not rendered (nothing to resize).
 *
 * NOTE: This component does NOT call `useResizeTableHeader()`. It receives
 * `onResizeStart` as a prop and reads the `resizedColumnId` atom via the
 * lightweight `useResizeHandlerState()` hook. This avoids registering 2N
 * document-level event listeners (one per handle).
 */
export const RecordTableHeaderResizeHandler = ({
  columnId: _columnId,
  columnIndex,
  position,
  onResizeStart,
  onAutoFit,
}: RecordTableHeaderResizeHandlerProps) => {
  const { visibleColumns } = useRecordTableContextOrThrow();
  const { resizedColumnId } = useResizeHandlerState();

  // Determine target column: left handle resizes previous column
  const targetColumn =
    position === "left"
      ? visibleColumns[columnIndex - 1]
      : visibleColumns[columnIndex];

  const targetColumnId = targetColumn?.id;
  const isResizing = resizedColumnId === targetColumnId;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!targetColumnId) return;
      e.preventDefault();
      onResizeStart(targetColumnId, e.clientX);
    },
    [targetColumnId, onResizeStart],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!targetColumnId) return;
      e.preventDefault();
      e.stopPropagation();
      onAutoFit(targetColumnId);
    },
    [targetColumnId, onAutoFit],
  );

  // Don't render left handler for the first column
  if (position === "left" && columnIndex === 0) return null;

  return (
    <div
      className={`
        absolute top-0 bottom-0 cursor-col-resize
        ${position === "left" ? "-left-px" : "-right-px"}
        w-2.5 z-1
        group/resize
      `}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className={`
          absolute top-0 bottom-0 w-0.5
          ${position === "left" ? "left-0" : "right-0"}
          ${isResizing ? "bg-blue-500" : "bg-transparent group-hover/resize:bg-blue-400"}
          transition-colors
        `}
      />
    </div>
  );
};
