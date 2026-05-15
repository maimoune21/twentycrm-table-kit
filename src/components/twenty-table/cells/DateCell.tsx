import { useState, useRef, useEffect, useCallback } from "react";
import { useRecordTableContextOrThrow } from "../contexts";

type DateCellProps = {
  recordId: string;
  fieldName: string;
  value: string;
  isEditMode: boolean;
  onClose: () => void;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return dateStr;
  }
};

export const DateCell = ({
  recordId,
  fieldName,
  value,
  isEditMode,
  onClose,
}: DateCellProps) => {
  const { onCellChange } = useRecordTableContextOrThrow();
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditMode]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = useCallback(() => {
    if (editValue !== value && onCellChange) {
      onCellChange(recordId, fieldName, editValue);
    }
    onClose();
  }, [editValue, value, onCellChange, recordId, fieldName, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setEditValue(value);
        onClose();
      }
      e.stopPropagation();
    },
    [handleSave, value, onClose],
  );

  if (!isEditMode) {
    return (
      <div className="truncate pl-2 text-[0.8125rem] h-5 flex items-center text-gray-900 dark:text-gray-100 overflow-hidden text-ellipsis whitespace-nowrap">
        {formatDate(value)}
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      type="date"
      className="w-full h-full pl-2 text-[0.8125rem] bg-transparent border-none outline-none text-gray-900 dark:text-gray-100"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
    />
  );
};
