import { useCallback } from "react";
import { useRecordTableRowContextOrThrow } from "../../contexts";
import { useRecordTableSelection } from "../../hooks/useRecordTableSelection";
import {
  RECORD_TABLE_COLUMN_CHECKBOX_WIDTH,
  RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH,
} from "../../constants";
import { useRowHeight } from "../../hooks/useRowHeight";

export const RecordTableCellCheckbox = () => {
  const { recordId, isSelected, isSidePanelActive, rowIndex } = useRecordTableRowContextOrThrow();
  const { toggleRowSelection, selectRange } = useRecordTableSelection();
  const rowHeight = useRowHeight();
  const isRowHighlighted = isSelected || isSidePanelActive;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.shiftKey) {
        selectRange(0, rowIndex);
      } else {
        toggleRowSelection(recordId);
      }
    },
    [recordId, rowIndex, toggleRowSelection, selectRange],
  );

  return (
    <div
      className={`
        flex items-center justify-center shrink-0 border-r border-b border-gray-200/80 dark:border-gray-700/80
        cursor-pointer select-none sticky z-20
        ${isRowHighlighted ? "bg-blue-50 dark:bg-blue-900/20" : "bg-white dark:bg-gray-900"}
      `}
      style={{
        width: RECORD_TABLE_COLUMN_CHECKBOX_WIDTH,
        minWidth: RECORD_TABLE_COLUMN_CHECKBOX_WIDTH,
        maxWidth: RECORD_TABLE_COLUMN_CHECKBOX_WIDTH,
        height: rowHeight,
        left: RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH,
        zIndex: 14,
      }}
      onClick={handleClick}
    >
      {/* Checkbox: always visible when selected, only on row hover otherwise */}
      <div
        className={`flex items-center justify-center ${isSelected ? "opacity-100" : "opacity-0 group-hover/row:opacity-100"} transition-opacity`}
      >
        <div
          className={`w-4 h-4 rounded-[3px] border flex items-center justify-center transition-colors ${
            isSelected
              ? "bg-blue-500 border-blue-500"
              : "border-gray-300 dark:border-gray-500 hover:border-gray-400"
          }`}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 6l2.5 2.5 4.5-4.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};
