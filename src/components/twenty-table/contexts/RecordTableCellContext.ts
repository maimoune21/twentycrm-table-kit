import { createContext, useContext } from "react";
import type { TableCellPosition } from "../types";
import type { ColumnDefinition } from "../types";

export type RecordTableCellContextValue = {
  columnDefinition: ColumnDefinition;
  cellPosition: TableCellPosition;
};

export const RecordTableCellContext =
  createContext<RecordTableCellContextValue>({} as RecordTableCellContextValue);

export const useRecordTableCellContext = () =>
  useContext(RecordTableCellContext);
