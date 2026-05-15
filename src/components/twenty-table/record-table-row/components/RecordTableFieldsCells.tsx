import { useRecordTableContextOrThrow } from "../../contexts/RecordTableContext";
import { useRecordTableRowContextOrThrow } from "../../contexts/RecordTableRowContext";
import { RecordTableCellContext } from "../../contexts/RecordTableCellContext";
import { RecordTableCellContainer } from "../../record-table-cell/components/RecordTableCellContainer";
import {
  RECORD_TABLE_COLUMN_CHECKBOX_WIDTH,
  RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH,
} from "../../constants";

type RecordTableFieldsCellsProps = {
  rowIndex: number;
};

export const RecordTableFieldsCells = ({
  rowIndex,
}: RecordTableFieldsCellsProps) => {
  const { visibleColumns } = useRecordTableContextOrThrow();
  const { isSelected, isSidePanelActive, isFocused } =
    useRecordTableRowContextOrThrow();
  const isRowHighlighted = isSelected || isSidePanelActive;

  // Calculate left position for sticky columns
  const stickyOffset =
    RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH +
    RECORD_TABLE_COLUMN_CHECKBOX_WIDTH;

  return (
    <>
      {visibleColumns.map((column, columnIndex) => {
        const isSticky = columnIndex === 0; // Only first column (Name) is sticky

        return (
          <RecordTableCellContext.Provider
            key={column.id}
            value={{
              columnDefinition: column,
              cellPosition: { row: rowIndex, column: columnIndex },
            }}
          >
            <div
              style={{
                width: `var(--record-table-column-field-${columnIndex}, ${column.size}px)`,
                minWidth: `var(--record-table-column-field-${columnIndex}, ${column.size}px)`,
                maxWidth: `var(--record-table-column-field-${columnIndex}, ${column.size}px)`,
                flexShrink: 0,
                ...(isSticky && {
                  position: "sticky",
                  left: stickyOffset,
                  zIndex: 15,
                }),
              }}
              className={
                isSticky
                  ? isRowHighlighted
                    ? "bg-blue-50/95 dark:bg-blue-900/20 backdrop-blur-sm"
                    : isFocused
                      ? "bg-gray-50/95 dark:bg-gray-800/55 backdrop-blur-sm"
                      : "bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm"
                  : ""
              }
            >
              <RecordTableCellContainer />
            </div>
          </RecordTableCellContext.Provider>
        );
      })}
    </>
  );
};
