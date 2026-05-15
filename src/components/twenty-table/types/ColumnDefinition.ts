export type FieldType =
  | "TEXT"
  | "NUMBER"
  | "DATE"
  | "SELECT"
  | "RELATION"
  | "BOOLEAN"
  | "EMAIL"
  | "PHONE"
  | "URL"
  | "CURRENCY"
  | "ENTERPRISE_LOGO"
  | "CV_SCORE"
  | "PHOTO_SCORE"
  | "PREMIUM_BADGE"
  | "MULTI_SELECT";

export type SelectOption = {
  label: string;
  value: string;
  color?: string;
};

export type ColumnDefinition = {
  id: string;
  label: string;
  fieldName: string;
  type: FieldType;
  size: number;
  /** Per-column minimum width in px (overrides global RECORD_TABLE_COLUMN_MIN_WIDTH) */
  minSize?: number;
  position: number;
  isLabelIdentifier?: boolean;
  /** When true, shows the navigate arrow icon on hover (like isLabelIdentifier) instead of the edit pencil */
  isNavigable?: boolean;
  isVisible?: boolean;
  isFilterable?: boolean;
  isSortable?: boolean;
  options?: SelectOption[];
  renderCell?: (record: any) => React.ReactNode;
  onCellClick?: (recordId: string, record: any) => void;
  onEditButtonClick?: (recordId: string, record: any) => void;
};
