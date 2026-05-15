import { RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH } from "../../constants";
import { useRowHeight } from "../../hooks/useRowHeight";

export const RecordTableHeaderDragDropColumn = () => {
  const rowHeight = useRowHeight();

  return (
    <div
      className="shrink-0 border-b border-r border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-900 sticky left-0"
      style={{
        width: RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH,
        minWidth: RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH,
        maxWidth: RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH,
        height: rowHeight,
        zIndex: 14,
      }}
    />
  );
};
