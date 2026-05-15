import { useRecordTableSelection } from "../../hooks/useRecordTableSelection";
import { RECORD_TABLE_COLUMN_CHECKBOX_WIDTH } from "../../constants";
import { useRowHeight } from "../../hooks/useRowHeight";

export const RecordTableHeaderCheckboxColumn = () => {
  const { isAllSelected, isSomeSelected, selectAllRows, deselectAllRows } =
    useRecordTableSelection();
  const rowHeight = useRowHeight();

  const handleClick = () => {
    if (isAllSelected || isSomeSelected) {
      deselectAllRows();
    } else {
      selectAllRows();
    }
  };

  return (
    <div
      className="flex items-center justify-center shrink-0 border-b border-r border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-900 sticky cursor-pointer"
      style={{
        width: RECORD_TABLE_COLUMN_CHECKBOX_WIDTH,
        minWidth: RECORD_TABLE_COLUMN_CHECKBOX_WIDTH,
        maxWidth: RECORD_TABLE_COLUMN_CHECKBOX_WIDTH,
        height: rowHeight,
        left: 12,
        zIndex: 14,
      }}
      onClick={handleClick}
    >
      <input
        type="checkbox"
        checked={isAllSelected}
        ref={(input) => {
          if (input) {
            input.indeterminate = isSomeSelected;
          }
        }}
        onChange={() => {}}
        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
      />
    </div>
  );
};
