import { createContext, useContext } from "react";
import type { MoveFocusDirection, TableCellPosition } from "../types";

export type RecordTableBodyContextProps = {
  recordGroupId?: string;
  onOpenTableCell: (cellPosition: TableCellPosition) => void;
  onMoveFocus: (direction: MoveFocusDirection) => void;
  onCloseTableCell: () => void;
  onMoveHoverToCurrentCell: (cellPosition: TableCellPosition) => void;
};

export const RecordTableBodyContext =
  createContext<RecordTableBodyContextProps>({} as RecordTableBodyContextProps);

export const useRecordTableBodyContextOrThrow =
  (): RecordTableBodyContextProps => {
    const context = useContext(RecordTableBodyContext);
    if (!context) {
      throw new Error(
        "useRecordTableBodyContextOrThrow must be used within RecordTableBodyContext.Provider",
      );
    }
    return context;
  };
