// Barrel trimmed to only the symbols actually imported via
// `@/components/twenty-table` from outside this folder. Subpath imports
// (e.g. `@/components/twenty-table/toolbar/states/toolbarState`) continue
// to work directly against the source files.

export { RecordTable } from "./RecordTable";
export { RecordTableContext } from "./contexts";
export { useRecordTableSetup } from "./hooks/useRecordTableSetup";
export { IconPeople } from "./toolbar";
export type {
  ColumnDefinition,
  RecordData,
  SortDirection,
  BulkAction,
} from "./types";
export {
  selectedRowIdsAtom,
  selectedRowIdsArrayAtom,
} from "./states";

