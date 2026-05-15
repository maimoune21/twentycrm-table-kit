export type {
  ColumnDefinition,
  FieldType,
  SelectOption,
} from "./ColumnDefinition";
export type { TableCellPosition } from "./TableCellPosition";
export type { AllRowsSelectedStatus } from "./AllRowSelectedStatus";
export type { MoveFocusDirection } from "./MoveFocusDirection";

export type RecordData = Record<string, unknown> & { id: string };

export type SortDirection = "asc" | "desc" | null;

export type SortState = {
  fieldName: string;
  direction: SortDirection;
};

export type FilterState = {
  fieldName: string;
  value?: string;
  operator:
    | "contains"
    | "doesNotContain"
    | "equals"
    | "startsWith"
    | "endsWith"
    | "isEmpty"
    | "isNotEmpty";
};

export type BulkAction = {
  label: string;
  icon: React.ReactNode;
  variant?: "default" | "danger" | "success" | "warning";
  onClick: (selectedIds: string[]) => void | Promise<void>;
  isLoading?: boolean;
};
