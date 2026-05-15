import { useState, useRef, useEffect, useCallback } from "react";
import { useRecordTableContextOrThrow } from "../contexts";
import { QuillEditor } from "@/admin/dashboard/components/QuillEditor";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type TextCellProps = {
  recordId: string;
  fieldName: string;
  value: string;
  isEditMode: boolean;
  onClose: () => void;
};

export const TextCell = ({
  recordId,
  fieldName,
  value,
  isEditMode,
  onClose,
}: TextCellProps) => {
  const { onCellChange } = useRecordTableContextOrThrow();
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDescriptionField = fieldName.toLowerCase() === "description";

  useEffect(() => {
    if (isEditMode && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
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

  const handleCancel = useCallback(() => {
    setEditValue(value);
    onClose();
  }, [value, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
      e.stopPropagation();
    },
    [handleSave, handleCancel],
  );

  if (!isEditMode) {
    return (
      <div className="truncate pl-2 text-[0.8125rem] h-5 flex items-center text-gray-900 dark:text-gray-100 overflow-hidden text-ellipsis whitespace-nowrap">
        {value || "—"}
      </div>
    );
  }

  if (isDescriptionField) {
    return (
      <Popover
        open={isEditMode}
        onOpenChange={(open) => {
          if (!open) handleCancel();
        }}
      >
        <PopoverTrigger asChild>
          <div className="w-full h-full" />
        </PopoverTrigger>

        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-120 p-0 w-[min(900px,calc(100vw-2rem))] max-h-[calc(100vh-1.5rem)] overflow-hidden"
          style={{
            maxHeight:
              "min(calc(100vh - 1.5rem), calc(var(--radix-popover-content-available-height, 100vh) - 0.5rem))",
          }}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Modifier la description
              </span>
              <span className="text-[10px] text-gray-400">Éditeur enrichi</span>
            </div>

            <div className="p-3 overflow-hidden flex-1 min-h-0">
              <QuillEditor
                value={editValue}
                onChange={setEditValue}
                placeholder="Entrez la description…"
              />
            </div>

            <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 rounded-b-lg">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCancel();
                }}
                className="cursor-pointer px-3 py-1.5 text-xs rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSave();
                }}
                className="cursor-pointer px-3 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <input
      ref={inputRef}
      className="w-full h-full pl-2 text-[0.8125rem] bg-transparent border-none outline-none text-gray-900 dark:text-gray-100"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
    />
  );
};
