import { RECORD_TABLE_HTML_ID } from "../constants";

export const updateRecordTableCSSVariable = (
  cssVariableName: string,
  newValue: string,
) => {
  document
    .querySelector<HTMLDivElement>(`#${RECORD_TABLE_HTML_ID}`)
    ?.style.setProperty(cssVariableName, newValue);
};

export const getRecordTableColumnFieldWidthClassName = (
  recordFieldIndex: number,
) => {
  return `record-table-column-field-${recordFieldIndex}`;
};

export const getRecordTableColumnFieldWidthCSSVariableName = (
  recordFieldIndex: number,
) => {
  return `--record-table-column-field-${recordFieldIndex}`;
};
