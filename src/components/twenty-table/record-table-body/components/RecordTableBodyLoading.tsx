import { useRowHeight } from "../../hooks/useRowHeight";
import {
  RECORD_TABLE_COLUMN_CHECKBOX_WIDTH,
  RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH,
} from "../../constants";

type RecordTableBodyLoadingProps = {
  columnCount: number;
  rowCount?: number;
};

export const RecordTableBodyLoading = ({
  columnCount,
  rowCount = 5,
}: RecordTableBodyLoadingProps) => {
  const rowHeight = useRowHeight();

  return (
    <div className="flex flex-col animate-pulse">
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex flex-row"
          style={{ height: rowHeight }}
        >
          {/* Drag handle placeholder */}
          <div
            className="border-r border-b border-gray-200/80 dark:border-gray-700/80"
            style={{
              width: RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH,
              minWidth: RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH,
              maxWidth: RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH,
            }}
          />
          {/* Checkbox placeholder */}
          <div
            className="border-r border-b border-gray-200/80 dark:border-gray-700/80 flex items-center justify-center"
            style={{
              width: RECORD_TABLE_COLUMN_CHECKBOX_WIDTH,
              minWidth: RECORD_TABLE_COLUMN_CHECKBOX_WIDTH,
              maxWidth: RECORD_TABLE_COLUMN_CHECKBOX_WIDTH,
            }}
          >
            <div className="w-3.5 h-3.5 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          {/* Cell placeholders */}
          {Array.from({ length: columnCount }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="border-r border-b border-gray-200/80 dark:border-gray-700/80 flex items-center px-2"
              style={{
                width: `var(--record-table-column-field-${colIndex}, 160px)`,
                minWidth: `var(--record-table-column-field-${colIndex}, 160px)`,
                maxWidth: `var(--record-table-column-field-${colIndex}, 160px)`,
                flexShrink: 0,
              }}
            >
              <div
                className="h-3 bg-gray-200 dark:bg-gray-700 rounded"
                style={{ width: `${50 + Math.random() * 40}%` }}
              />
            </div>
          ))}
          <div className="flex-1 border-b border-gray-200/80 dark:border-gray-700/80" />
        </div>
      ))}
    </div>
  );
};
