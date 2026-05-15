import { useState, useRef, useEffect, useCallback } from "react";
import { useRecordTableContextOrThrow } from "../contexts";

type EmailCellProps = {
  recordId: string;
  fieldName: string;
  value: string;
  isEditMode: boolean;
  onClose: () => void;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EmailCell = ({
  recordId,
  fieldName,
  value,
  isEditMode,
  onClose,
}: EmailCellProps) => {
  const { onCellChange } = useRecordTableContextOrThrow();
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditMode && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditMode]);

  useEffect(() => {
    setEditValue(value);
    setError("");
  }, [value]);

  const validateEmail = (email: string): boolean => {
    if (!email.trim()) {
      setError("L'email est requis");
      return false;
    }
    if (!EMAIL_REGEX.test(email)) {
      setError("Email invalide");
      return false;
    }
    setError("");
    return true;
  };

  const handleSave = useCallback(() => {
    if (validateEmail(editValue)) {
      if (editValue !== value && onCellChange) {
        onCellChange(recordId, fieldName, editValue);
      }
      onClose();
    }
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
        setError("");
        onClose();
      }
      e.stopPropagation();
    },
    [handleSave, value, onClose],
  );

  if (!isEditMode) {
    return (
      <div className="truncate pl-2 text-[0.8125rem] h-5 flex items-center text-gray-900 dark:text-gray-100 overflow-hidden text-ellipsis whitespace-nowrap">
        {value || "—"}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      <input
        ref={inputRef}
        type="email"
        className={`w-full h-full pl-2 text-[0.8125rem] bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 ${
          error ? "ring-1 ring-red-500" : ""
        }`}
        value={editValue}
        onChange={(e) => {
          setEditValue(e.target.value);
          setError("");
        }}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder="example@email.com"
      />
      {error && (
        <div className="text-xs text-red-500 px-2 py-0.5">{error}</div>
      )}
    </div>
  );
};
