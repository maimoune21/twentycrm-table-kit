import { useEffect } from "react";
import type { ColumnDefinition } from "../../types";
import { TextCell } from "../../cells/TextCell";
import { EmailCell } from "../../cells/EmailCell";
import { PhoneCell } from "../../cells/PhoneCell";
import { SelectCell } from "../../cells/SelectCell";
import { DateCell } from "../../cells/DateCell";
import { RelationCell } from "../../cells/RelationCell";
import { RelationSelectCell } from "../../cells/RelationSelectCell";
import { BooleanCell } from "../../cells/BooleanCell";
import { MultiRelationSelectCell } from "../../cells/MultiRelationSelectCell";
import { useRecordTableContextOrThrow } from "../../contexts";

type RecordTableCellEditModeProps = {
  recordId: string;
  columnDefinition: ColumnDefinition;
  value: unknown;
  onClose: () => void;
};

export const RecordTableCellEditMode = ({
  recordId,
  columnDefinition,
  value,
  onClose,
}: RecordTableCellEditModeProps) => {
  const { onCellChange } = useRecordTableContextOrThrow();

  switch (columnDefinition.type) {
    case "EMAIL":
      return (
        <EmailCell
          recordId={recordId}
          fieldName={columnDefinition.fieldName}
          value={String(value ?? "")}
          isEditMode={true}
          onClose={onClose}
        />
      );
    case "TEXT":
    case "URL":
    case "NUMBER":
    case "CURRENCY":
      return (
        <TextCell
          recordId={recordId}
          fieldName={columnDefinition.fieldName}
          value={String(value ?? "")}
          isEditMode={true}
          onClose={onClose}
        />
      );
    case "PHONE":
      return (
        <PhoneCell
          recordId={recordId}
          fieldName={columnDefinition.fieldName}
          value={String(value ?? "")}
          isEditMode={true}
          onClose={onClose}
        />
      );
    case "SELECT":
      return (
        <SelectCell
          recordId={recordId}
          fieldName={columnDefinition.fieldName}
          value={String(value ?? "")}
          options={columnDefinition.options ?? []}
          isEditMode={true}
          onClose={onClose}
        />
      );
    case "DATE":
      return (
        <DateCell
          recordId={recordId}
          fieldName={columnDefinition.fieldName}
          value={String(value ?? "")}
          isEditMode={true}
          onClose={onClose}
        />
      );
    case "BOOLEAN":
      return (
        <BooleanCell
          recordId={recordId}
          fieldName={columnDefinition.fieldName}
          value={!!value}
          isEditMode={true}
          onClose={onClose}
        />
      );
    case "RELATION":
    case "ENTERPRISE_LOGO":
      return (
        <RelationSelectCell
          recordId={recordId}
          fieldName={
            columnDefinition.fieldName === "entreprise"
              ? "entreprise"
              : columnDefinition.fieldName
          }
          value={String(value ?? "")}
          isEditMode={true}
          onClose={onClose}
        />
      );
    case "MULTI_SELECT": {
      let onSearch = (columnDefinition as any).onSearch as
        | ((query: string) => Promise<Array<{ value: string; label: string }>>)
        | undefined;
      return (
        <MultiRelationSelectCell
          recordId={recordId}
          fieldName={columnDefinition.fieldName}
          value={Array.isArray(value) ? value : []}
          options={columnDefinition.options ?? []}
          onSearch={onSearch}
          onClose={onClose}
        />
      );
    }
    case "CV_SCORE":
    case "PHOTO_SCORE":
    case "PREMIUM_BADGE":
      // Not inline-editable
      return <CloseEditMode onClose={onClose} />;
    default:
      return (
        <TextCell
          recordId={recordId}
          fieldName={columnDefinition.fieldName}
          value={String(value ?? "")}
          isEditMode={true}
          onClose={onClose}
        />
      );
  }
};

const CloseEditMode = ({ onClose }: { onClose: () => void }) => {
  useEffect(() => {
    onClose();
  }, [onClose]);
  return null;
};
