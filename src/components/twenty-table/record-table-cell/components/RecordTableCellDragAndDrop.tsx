import { useRecordTableRowDraggableContext } from "../../contexts";
import { RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH } from "../../constants";
import { useRowHeight } from "../../hooks/useRowHeight";

export const RecordTableCellDragAndDrop = () => {
  const { dragHandleProps, isDragging } = useRecordTableRowDraggableContext();
  const rowHeight = useRowHeight();

  return (
    <div
      className={`
        flex items-center justify-center shrink-0 border-r border-b border-gray-200/80 dark:border-gray-700/80
        cursor-grab active:cursor-grabbing sticky left-0
        ${isDragging ? "opacity-50" : ""}
        group/drag
        bg-white dark:bg-gray-900
      `}
      style={{
        width: RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH,
        minWidth: RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH,
        maxWidth: RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH,
        height: rowHeight,
        zIndex: 14,
      }}
      {...dragHandleProps}
    >
      <svg
        className="w-3 h-3 text-gray-300 dark:text-gray-600 opacity-0 group-hover/row:opacity-100 transition-opacity"
        viewBox="0 0 6 10"
        fill="currentColor"
      >
        <circle cx="1.5" cy="1.5" r="1" />
        <circle cx="4.5" cy="1.5" r="1" />
        <circle cx="1.5" cy="5" r="1" />
        <circle cx="4.5" cy="5" r="1" />
        <circle cx="1.5" cy="8.5" r="1" />
        <circle cx="4.5" cy="8.5" r="1" />
      </svg>
    </div>
  );
};
