import { useState } from "react";
import { useAtom } from "jotai";
import {
  activeFiltersAtom,
  type FilterOperator,
  type ActiveFilter,
} from "../states/toolbarState";
import type { ColumnDefinition } from "../../types";
import { ChevronLeft, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

interface EmailFilterPanelProps {
  column: ColumnDefinition;
  onBack: () => void;
}

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "contains", label: "Contains" },
  { value: "doesNotContain", label: "Doesn't contain" },
  { value: "isEmpty", label: "Is empty" },
  { value: "isNotEmpty", label: "Is not empty" },
];

export const EmailFilterPanel = ({ column, onBack }: EmailFilterPanelProps) => {
  const [, setFilters] = useAtom(activeFiltersAtom);
  const [operator, setOperator] = useState<FilterOperator>("contains");
  const [searchText, setSearchText] = useState("");

  const handleApplyFilter = () => {
    // For isEmpty/isNotEmpty, no input needed
    if (operator === "isEmpty" || operator === "isNotEmpty") {
      const newFilter: ActiveFilter = {
        id: `filter-${column.fieldName}-${Date.now()}`,
        fieldName: column.fieldName,
        label: column.label,
        type: column.type,
        operator,
      };

      setFilters((prev) => [
        ...prev.filter((f) => f.fieldName !== column.fieldName),
        newFilter,
      ]);

      onBack();
      return;
    }

    // For contains/doesNotContain, text is required
    if (!searchText.trim()) {
      return;
    }

    const newFilter: ActiveFilter = {
      id: `filter-${column.fieldName}-${Date.now()}`,
      fieldName: column.fieldName,
      label: column.label,
      type: column.type,
      value: searchText,
      operator,
    };

    setFilters((prev) => [
      ...prev.filter((f) => f.fieldName !== column.fieldName),
      newFilter,
    ]);

    onBack();
  };

  const isTextOperator =
    operator === "contains" || operator === "doesNotContain";
  const canApply =
    operator === "isEmpty" ||
    operator === "isNotEmpty" ||
    (isTextOperator && searchText.trim().length > 0);

  return (
    <div className="w-full flex flex-col h-full bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl">
      {/* Header */}
      <div className="px-1 py-1.5 border-b border-white/30 dark:border-white/20 flex items-center gap-1">
        <button
          onClick={onBack}
          className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors shrink-0"
        >
          <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400" />
        </button>
        <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100">
          {column.label}
        </h3>
      </div>

      {/* Operator Select */}
      <div
        className="px-1 py-1 border-b border-white/30 dark:border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        <Select
          value={operator}
          onValueChange={(value) => setOperator(value as FilterOperator)}
          indicatorVisibility={false}
        >
          <SelectTrigger
            size="sm"
            className="h-7! py-0! rounded-sm! bg-white/30 dark:bg-gray-800/30 border! border-gray-100! dark:border-white/20 text-[11px]! text-gray-600 dark:text-gray-300"
          >
            <span className="text-[11px] text-gray-600 dark:text-gray-300">
              {OPERATORS.find((op) => op.value === operator)?.label ||
                "Select operator"}
            </span>
          </SelectTrigger>
          <SelectContent className="z-120 max-h-44 min-w-40">
            {OPERATORS.map((op) => (
              <SelectItem
                key={op.value}
                value={op.value}
                className="ps-2! pe-2! text-[10px] text-gray-500 dark:text-gray-400 data-[state=checked]:text-gray-700 dark:data-[state=checked]:text-gray-200"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                      operator === op.value
                        ? "border-gray-500"
                        : "border-gray-400 dark:border-gray-500"
                    }`}
                  >
                    {operator === op.value && (
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-gray-300" />
                    )}
                  </span>
                  <span>{op.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Text Input for contains/doesNotContain */}
      {isTextOperator && (
        <div className="px-1 py-0 border-b border-white/30 dark:border-white/20 bg-white/30 dark:bg-gray-800/30 backdrop-blur">
          <div className="relative">
            <Search
              size={12}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
            />
            <input
              autoFocus
              type="text"
              placeholder="Email"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && canApply) {
                  handleApplyFilter();
                }
              }}
              className="w-full py-1.5 pl-6 pr-2 text-[11px] border border-gray-100 rounded-md mx-auto text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 outline-none bg-transparent transition-colors"
            />
          </div>
        </div>
      )}

      {/* Flex spacer for layout */}
      <div className="flex-1" />

      {/* Footer with Apply Button */}
      <div className="px-2 py-2 dark:border-gray-700 bg-white dark:bg-gray-900 mt-1">
        <button
          onClick={handleApplyFilter}
          disabled={!canApply}
          className="w-full px-1 py-1.5 bg-gray-200/80 border border-gray-300/60 text-gray-600 text-[11px] font-medium rounded cursor-pointer hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Apply filter
        </button>
      </div>
    </div>
  );
};
