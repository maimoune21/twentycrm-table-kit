import { createContext, useContext } from "react";

export type RecordTableRowContextValue = {
  recordId: string;
  rowIndex: number;
  isSelected: boolean;
  isSidePanelActive: boolean;
  isFocused: boolean;
  isActive: boolean;
};

export const RecordTableRowContext = createContext<RecordTableRowContextValue>(
  {} as RecordTableRowContextValue,
);

export const useRecordTableRowContextOrThrow =
  (): RecordTableRowContextValue => {
    const context = useContext(RecordTableRowContext);
    if (!context) {
      throw new Error(
        "useRecordTableRowContextOrThrow must be used within RecordTableRowContext.Provider",
      );
    }
    return context;
  };
