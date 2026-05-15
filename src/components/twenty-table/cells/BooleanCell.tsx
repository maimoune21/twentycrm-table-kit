import { useState, useEffect, useCallback } from "react";
import { useRecordTableContextOrThrow } from "../contexts";
import { Check, X } from "lucide-react";

type BooleanCellProps = {
  recordId: string;
  fieldName: string;
  value: boolean;
  isEditMode: boolean;
  onClose: () => void;
};

export const BooleanCell = ({
  recordId,
  fieldName,
  value,
  isEditMode,
  onClose,
}: BooleanCellProps) => {
  const { onCellChange } = useRecordTableContextOrThrow();
  const [isChecked, setIsChecked] = useState(!!value);

  useEffect(() => {
    setIsChecked(!!value);
  }, [value]);

  const handleToggle = useCallback(async () => {
    const newValue = !isChecked;
    setIsChecked(newValue);

    if (onCellChange) {
      onCellChange(recordId, fieldName, newValue);
    }

    onClose();
  }, [isChecked, recordId, fieldName, onCellChange, onClose]);

  if (!isEditMode) {
    return (
      <div className="pl-2 flex items-center h-full">
        {isChecked ? (
          <div className="inline-flex items-center justify-center w-5 h-5 rounded bg-green-100 dark:bg-green-900">
            <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
          </div>
        ) : (
          <div className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-100 dark:bg-gray-700">
            <X className="w-3 h-3 text-gray-400 dark:text-gray-500" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pl-2 flex items-center h-full">
      <button
        onClick={handleToggle}
        className={`relative inline-flex w-12 h-5 rounded-full transition-colors ${
          isChecked
            ? "bg-green-500 hover:bg-green-600"
            : "bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700"
        }`}
        style={{
          border: "none",
          cursor: "pointer",
        }}
      >
        <span
          className={`inline-block w-4 h-4 rounded-full bg-white transition-transform ${
            isChecked ? "translate-x-5" : "translate-x-1"
          }`}
          style={{
            marginTop: "2px",
          }}
        />
      </button>
    </div>
  );
};
