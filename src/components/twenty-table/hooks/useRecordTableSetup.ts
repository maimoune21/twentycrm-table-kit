import { useMemo } from "react";
import { useRecordTable } from "./useRecordTable";
import type { ColumnDefinition, RecordData } from "../types";

/**
 * Hook to setup RecordTableContext value.
 * Useful when you need the context outside of RecordTable component.
 *
 * @example
 * ```tsx
 * const contextValue = useRecordTableSetup(columns, records);
 *
 * return (
 *   <RecordTableContext.Provider value={contextValue}>
 *     <div className="flex flex-row">
 *       <RecordTable columns={columns} records={records} />
 *       <SidePanel />
 *     </div>
 *   </RecordTableContext.Provider>
 * );
 * ```
 */
export const useRecordTableSetup = (
  columns: ColumnDefinition[],
  records: RecordData[],
  tableId: string = "default",
  onCellChange?: (recordId: string, fieldName: string, value: unknown) => void,
  onRecordClick?: (recordId: string) => void,
  onColumnResize?: (columnId: string, newSize: number) => void,
  onColumnReorder?: (fromIndex: number, toIndex: number) => void,
  onCreateRecord?: (data: Record<string, unknown>) => Promise<boolean>,
  customRecordPage?: (recordId: string) => React.ReactNode,
  onNameChange?: (
    recordId: string,
    prenom: string,
    nom: string,
  ) => Promise<void>,
) => {
  const { processedRecords, visibleColumns } = useRecordTable(records, columns);

  return useMemo(
    () => ({
      recordTableId: tableId,
      columns,
      records: processedRecords,
      visibleColumns,
      onCellChange,
      onRecordClick,
      onColumnResize,
      onColumnReorder,
      onCreateRecord,
      customRecordPage,
      onNameChange,
    }),
    [
      tableId,
      columns,
      processedRecords,
      visibleColumns,
      onCellChange,
      onRecordClick,
      onColumnResize,
      onColumnReorder,
      onCreateRecord,
      customRecordPage,
      onNameChange,
    ],
  );
};
