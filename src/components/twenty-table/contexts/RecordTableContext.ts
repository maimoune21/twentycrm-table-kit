import { createContext, useContext } from "react";
import type { ColumnDefinition, RecordData } from "../types";

export type RecordTableContextValue = {
  recordTableId: string;
  columns: ColumnDefinition[];
  records: RecordData[];
  visibleColumns: ColumnDefinition[];
  onCellChange?: (recordId: string, fieldName: string, value: unknown) => void;
  onRecordClick?: (recordId: string) => void;
  onColumnResize?: (columnId: string, newSize: number) => void;
  onColumnReorder?: (fromIndex: number, toIndex: number) => void;
  onCreateRecord?: (data: Record<string, unknown>) => Promise<boolean>;
  customRecordPage?: (recordId: string) => React.ReactNode;
  onNameChange?: (
    recordId: string,
    prenom: string,
    nom: string,
  ) => Promise<void>;
};

export const RecordTableContext = createContext<RecordTableContextValue | null>(
  null,
);

export const useRecordTableContextOrThrow = (): RecordTableContextValue => {
  const context = useContext(RecordTableContext);
  if (!context) {
    throw new Error(
      "useRecordTableContextOrThrow must be used within RecordTableContext.Provider",
    );
  }
  return context;
};
