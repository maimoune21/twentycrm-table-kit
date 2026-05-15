export const RECORD_TABLE_ROW_HEIGHT = 32;

export type RecordTableRowHeightSize = "compact" | "standard" | "comfortable";

export const RECORD_TABLE_ROW_HEIGHTS: Record<
  RecordTableRowHeightSize,
  number
> = {
  compact: 32,
  standard: 40,
  comfortable: 52,
};
