import { type ReactNode } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { RecordTableRowDraggableContext } from "../../contexts/RecordTableRowDraggableContext";
import { useRecordTableRowContextOrThrow } from "../../contexts/RecordTableRowContext";
import { useRowHeight } from "../../hooks/useRowHeight";

type RecordTableDraggableTrProps = {
  recordId: string;
  draggableIndex: number;
  children: ReactNode;
};

export const RecordTableDraggableTr = ({
  recordId,
  draggableIndex,
  children,
}: RecordTableDraggableTrProps) => {
  const { isSelected, isSidePanelActive, isFocused } = useRecordTableRowContextOrThrow();
  const rowHeight = useRowHeight();
  const isRowHighlighted = isSelected || isSidePanelActive;

  return (
    <Draggable draggableId={recordId} index={draggableIndex}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`
            flex flex-row group/row
            transition-colors duration-100
            ${snapshot.isDragging ? "shadow-lg bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 opacity-90" : ""}
            ${isRowHighlighted && !snapshot.isDragging ? "bg-blue-50/60 dark:bg-blue-900/15 hover:bg-blue-50/80 dark:hover:bg-blue-900/25" : ""}
            ${isFocused && !isRowHighlighted && !snapshot.isDragging ? "bg-gray-50/70 dark:bg-gray-800/40 hover:bg-gray-100/80 dark:hover:bg-gray-800/60" : ""}
            ${!isRowHighlighted && !isFocused && !snapshot.isDragging ? "hover:bg-gray-50 dark:hover:bg-gray-800/50" : ""}
          `}
          style={{
            ...provided.draggableProps.style,
            height: rowHeight,
            minWidth: "max-content",
          }}
          data-testid={`row-id-${recordId}`}
        >
          <RecordTableRowDraggableContext.Provider
            value={{
              isDragging: snapshot.isDragging,
              dragHandleProps: provided.dragHandleProps,
            }}
          >
            {children}
          </RecordTableRowDraggableContext.Provider>
        </div>
      )}
    </Draggable>
  );
};
