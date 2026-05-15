import { useState, useRef, useEffect, useCallback } from "react";
import { useRecordTableContextOrThrow } from "../contexts";
import { useFloating, offset, flip, shift } from "@floating-ui/react";

type RelationOption = {
  id: string;
  label: string;
  avatarUrl?: string;
};

type RelationCellProps = {
  recordId: string;
  fieldName: string;
  value: string;
  options: RelationOption[];
  isEditMode: boolean;
  onClose: () => void;
};

export const RelationCell = ({
  recordId,
  fieldName,
  value,
  options,
  isEditMode,
  onClose,
}: RelationCellProps) => {
  const { onCellChange } = useRecordTableContextOrThrow();
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    middleware: [offset(4), flip(), shift()],
  });

  const selectedRelation = options.find((o) => o.id === value);

  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    if (isEditMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditMode]);

  const handleSelect = useCallback(
    (optionId: string) => {
      if (onCellChange) {
        onCellChange(recordId, fieldName, optionId);
      }
      onClose();
    },
    [onCellChange, recordId, fieldName, onClose],
  );

  useEffect(() => {
    if (!isEditMode) return;

    const handleClickOutside = (e: MouseEvent) => {
      const floating = refs.floating.current;
      const reference = refs.reference.current;
      if (
        floating &&
        !floating.contains(e.target as Node) &&
        reference &&
        !(reference as HTMLElement).contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditMode, onClose, refs]);

  if (!isEditMode) {
    return (
      <div className="flex items-center gap-2 px-2 h-full">
        {selectedRelation ? (
          <>
            {selectedRelation.avatarUrl ? (
              <img
                src={selectedRelation.avatarUrl}
                alt=""
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                {selectedRelation.label.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
              {selectedRelation.label}
            </span>
          </>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative h-full"
      ref={refs.setReference as React.Ref<HTMLDivElement>}
    >
      <input
        ref={inputRef}
        className="w-full h-full px-2 text-sm bg-transparent border-none outline-none text-gray-900 dark:text-gray-100"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
      />

      <div
        ref={refs.setFloating}
        style={floatingStyles}
        className="absolute z-50 min-w-[220px] max-h-[200px] overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1"
      >
        {filteredOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
              option.id === value ? "bg-gray-50 dark:bg-gray-700/50" : ""
            }`}
          >
            {option.avatarUrl ? (
              <img
                src={option.avatarUrl}
                alt=""
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                {option.label.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="truncate">{option.label}</span>
          </button>
        ))}
        {filteredOptions.length === 0 && (
          <div className="px-3 py-2 text-sm text-gray-400">No results</div>
        )}
      </div>
    </div>
  );
};
