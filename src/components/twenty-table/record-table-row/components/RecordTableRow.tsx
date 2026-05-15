import { useAtomValue } from "jotai";
import { RecordTableRowContext } from "../../contexts/RecordTableRowContext";
import { RecordTableDraggableTr } from "./RecordTableDraggableTr";
import { RecordTableFieldsCells } from "./RecordTableFieldsCells";
import { RecordTableCellCheckbox } from "../../record-table-cell/components/RecordTableCellCheckbox";
import { RecordTableCellDragAndDrop } from "../../record-table-cell/components/RecordTableCellDragAndDrop";
import {
  selectedRowIdsAtom,
  focusedRowIndexAtom,
  activeRowIndexAtom,
} from "../../states";
import {
  isSidePanelOpenedAtom,
  sidePanelRecordIdAtom,
} from "../../side-panel/states";

type RecordTableRowProps = {
  recordId: string;
  rowIndex: number;
};

export const RecordTableRow = ({ recordId, rowIndex }: RecordTableRowProps) => {
  const selectedRowIds = useAtomValue(selectedRowIdsAtom);
  const focusedRowIndex = useAtomValue(focusedRowIndexAtom);
  const activeRowIndex = useAtomValue(activeRowIndexAtom);
  const isSidePanelOpened = useAtomValue(isSidePanelOpenedAtom);
  const sidePanelRecordId = useAtomValue(sidePanelRecordIdAtom);

  const isSelected = selectedRowIds.has(recordId);
  const isSidePanelActive =
    !!isSidePanelOpened && !!sidePanelRecordId && sidePanelRecordId === recordId;
  const isFocused = focusedRowIndex === rowIndex;
  const isActive = activeRowIndex === rowIndex;

  return (
    <RecordTableRowContext.Provider
      value={{
        recordId,
        rowIndex,
        isSelected,
        isSidePanelActive,
        isFocused,
        isActive,
      }}
    >
      <RecordTableDraggableTr recordId={recordId} draggableIndex={rowIndex}>
        <RecordTableCellDragAndDrop />
        <RecordTableCellCheckbox />
        <RecordTableFieldsCells rowIndex={rowIndex} />
        {/* Last empty cell to fill remaining space */}
        <div
          className={`flex-1 border-b border-gray-200/80 dark:border-gray-700/80 ${
            isSelected || isSidePanelActive
              ? "bg-blue-50/60 dark:bg-blue-900/15"
              : "bg-white dark:bg-gray-900"
          }`}
        />
      </RecordTableDraggableTr>
    </RecordTableRowContext.Provider>
  );
};
