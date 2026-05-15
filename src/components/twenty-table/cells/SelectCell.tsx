import { useEffect, useCallback } from "react";
import { useRecordTableContextOrThrow } from "../contexts";
import type { SelectOption } from "../types";
import { useFloating, offset, flip, shift } from "@floating-ui/react";
import { Tag } from "./Tag";
import { CircleX } from "lucide-react";

const HOVER_BG: Record<string, string> = {
  green: "hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
  red: "hover:bg-red-50 dark:hover:bg-red-950/30",
  blue: "hover:bg-blue-50 dark:hover:bg-blue-950/30",
  yellow: "hover:bg-amber-50 dark:hover:bg-amber-950/30",
  purple: "hover:bg-purple-50 dark:hover:bg-purple-950/30",
  orange: "hover:bg-amber-50 dark:hover:bg-amber-950/30",
  gray: "hover:bg-gray-50 dark:hover:bg-gray-800/50",
  turquoise: "hover:bg-teal-50 dark:hover:bg-teal-950/30",
  pink: "hover:bg-pink-50 dark:hover:bg-pink-950/30",
};

const ACTIVE_BG: Record<string, string> = {
  green: "bg-emerald-50/80 dark:bg-emerald-950/40",
  red: "bg-red-50/80 dark:bg-red-950/40",
  blue: "bg-blue-50/80 dark:bg-blue-950/40",
  yellow: "bg-amber-50/80 dark:bg-amber-950/40",
  purple: "bg-purple-50/80 dark:bg-purple-950/40",
  orange: "bg-amber-50/80 dark:bg-amber-950/40",
  gray: "bg-gray-50/80 dark:bg-gray-800/40",
  turquoise: "bg-teal-50/80 dark:bg-teal-950/40",
  pink: "bg-pink-50/80 dark:bg-pink-950/40",
};

type SelectCellProps = {
  recordId: string;
  fieldName: string;
  value: string;
  options: SelectOption[];
  isEditMode: boolean;
  onClose: () => void;
};

export const SelectCell = ({
  recordId,
  fieldName,
  value,
  options,
  isEditMode,
  onClose,
}: SelectCellProps) => {
  const { onCellChange } = useRecordTableContextOrThrow();
  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    middleware: [offset(4), flip(), shift()],
  });

  // Find selected option but exclude the clear option (value="") from display
  const selectedOption = options.find((o) => o.value === value && o.value !== "");

  const handleSelect = useCallback(
    (optionValue: string) => {
      // Prevent setting empty value unless there's already a value (via the clear button)
      if (optionValue === "" && !value) {
        return;
      }
      if (onCellChange) {
        onCellChange(recordId, fieldName, optionValue);
      }
      // Use setTimeout to ensure close happens after React processes the state update
      setTimeout(() => onClose(), 0);
    },
    [onCellChange, recordId, fieldName, onClose, value],
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

  return (
    <div className="relative pl-2 flex items-center h-full">
      <div
        ref={refs.setReference as React.Ref<HTMLDivElement>}
        className="flex items-center"
      >
        {selectedOption ? (
          <Tag
            text={selectedOption.label}
            color={
              (selectedOption.color as
                | "green"
                | "red"
                | "blue"
                | "yellow"
                | "purple"
                | "orange"
                | "gray") ?? "gray"
            }
            preventShrink
          />
        ) : (
          <span className="text-[0.8125rem] text-gray-400/80 dark:text-gray-500">
            —
          </span>
        )}
      </div>

      {isEditMode && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className="absolute z-50 min-w-[220px] bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700/80 rounded-lg shadow-2xl shadow-black/12 dark:shadow-black/40 py-1 animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-sm"
        >
          {/* Header with gradient accent */}
          {/* <div className="px-3 pt-2 pb-2 mb-1 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <span className="flex h-4 w-1 rounded-full bg-linear-to-b from-blue-500 to-violet-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 select-none">
              Choisir un statut
            </span>
          </div> */}

          <div className="px-1 py-0.5 flex flex-col gap-0.5">
            {options.filter((o) => o.value !== "").map((option) => {
              const color = option.color ?? "gray";
              const isActive = option.value === value;
              const hoverBg = HOVER_BG[color] ?? "hover:bg-gray-50 dark:hover:bg-gray-800/50";
              const activeBg = ACTIVE_BG[color] ?? "";

              return (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`
                    w-full text-left px-1.5 py-2 flex items-center gap-1.5
                    text-[13px] font-medium rounded-md
                    transition-all duration-150 cursor-pointer
                    ${isActive
                      ? `${activeBg} text-gray-900 dark:text-gray-50 ring-1 ring-inset ring-gray-200/60 dark:ring-gray-700/60`
                      : `${hoverBg} text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100`
                    }
                  `}
                >
                  {/* Simple square check indicator */}
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 bg-transparent transition-colors"
                  >
                    {isActive && (
                      <svg
                        className="size-2.5! text-primary"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                      >
                        <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                      </svg>
                    )}
                  </span>

                  {/* Label */}
                  <span className="flex-1 truncate text-xs text-gray-600">{option.label}</span>
                </button>
              );
            })}
          </div>
          {/* Clear button — only rendered when a clear option (value="") exists and there's an active value */}
          {options.some((o) => o.value === "") && value && (
            <div className="px-1 pb-1 border-t border-gray-100 dark:border-gray-800 mt-0.5 pt-1">
              <button
                onClick={() => handleSelect("")}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] cursor-pointer border border-gray-200 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 font-medium transition-colors"
              >
                <CircleX className="size-3 text-gray-600 mb-0.5" />
                {options.find((o) => o.value === "")?.label}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
