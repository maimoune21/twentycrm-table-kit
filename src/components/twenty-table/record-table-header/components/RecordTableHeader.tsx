import { useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useSetAtom } from "jotai";
import { useRecordTableContextOrThrow } from "../../contexts";
import { RecordTableHeaderCell } from "./RecordTableHeaderCell";
import { RecordTableHeaderCheckboxColumn } from "./RecordTableHeaderCheckboxColumn";
import { RecordTableHeaderDragDropColumn } from "./RecordTableHeaderDragDropColumn";
import { TABLE_Z_INDEX } from "../../constants";
import { useResizeTableHeader } from "../../hooks/useResizeTableHeader";
import { columnPositionsAtom } from "../../toolbar/states/toolbarState";

export const RecordTableHeader = () => {
  const { visibleColumns, onColumnReorder } = useRecordTableContextOrThrow();
  const setColumnPositions = useSetAtom(columnPositionsAtom);

  // Single instance of the resize hook — registers ONE pair of
  // pointermove / pointerup listeners on `document` (not 2N).
  const { handleResizeStart, handleAutoFit } = useResizeTableHeader();

  const handleColumnDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      // DnD indices are 0-based for draggable columns (which start at column 1)
      const from = result.source.index + 1;
      const to = result.destination.index + 1;
      if (from === to) return;

      // Reorder the visibleColumns array locally to compute new positions
      const reordered = [...visibleColumns];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);

      // Update columnPositionsAtom so visibleColumns re-sorts correctly
      const newPositions: Record<string, number> = {};
      reordered.forEach((col, i) => {
        newPositions[col.id] = i;
      });
      setColumnPositions(newPositions);

      onColumnReorder?.(from, to);
    },
    [visibleColumns, onColumnReorder, setColumnPositions],
  );

  return (
    <DragDropContext onDragEnd={handleColumnDragEnd}>
      <Droppable
        droppableId="record-table-header-columns"
        direction="horizontal"
        type="COLUMN"
      >
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-row sticky top-0 bg-white dark:bg-gray-900"
            style={{ zIndex: TABLE_Z_INDEX.headerRow, minWidth: "max-content" }}
          >
            <RecordTableHeaderDragDropColumn />
            <RecordTableHeaderCheckboxColumn />

            {/* First column rendered outside Draggable — stays sticky on horizontal scroll.
                @hello-pangea/dnd applies transform on Draggable wrappers which breaks
                position:sticky, so column 0 is excluded from DnD. */}
            {visibleColumns.length > 0 && (
              <RecordTableHeaderCell
                column={visibleColumns[0]}
                columnIndex={0}
                onResizeStart={handleResizeStart}
                onAutoFit={handleAutoFit}
              />
            )}

            {/* Remaining columns are draggable */}
            {visibleColumns.slice(1).map((column, i) => (
              <Draggable
                key={column.id}
                draggableId={`col-${column.id}`}
                index={i}
              >
                {(dragProvided, snapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    style={{
                      ...dragProvided.draggableProps.style,
                      // Keep width during drag to avoid layout shift
                      ...(snapshot.isDragging
                        ? { zIndex: 100, opacity: 0.85 }
                        : {}),
                    }}
                  >
                    <RecordTableHeaderCell
                      column={column}
                      columnIndex={i + 1}
                      onResizeStart={handleResizeStart}
                      onAutoFit={handleAutoFit}
                      dragHandleProps={dragProvided.dragHandleProps}
                      isDragging={snapshot.isDragging}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {/* Last empty column to fill remaining space */}
            <div className="flex-1 border-b border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-900" />
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};
