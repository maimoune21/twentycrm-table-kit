import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import {
  activeFiltersAtom,
  type ActiveFilter,
  type FilterOperator,
} from "../states/toolbarState";
import type { ColumnDefinition } from "../../types";
import { ChevronLeft, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

interface MultiOptionCheckboxFilterPanelProps {
  column: ColumnDefinition;
  onBack: () => void;
}

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "equals", label: "Is" },
  { value: "contains", label: "Contains" },
  { value: "isEmpty", label: "Is empty" },
  { value: "isNotEmpty", label: "Is not empty" },
];

export const MultiOptionCheckboxFilterPanel = ({
  column,
  onBack,
}: MultiOptionCheckboxFilterPanelProps) => {
  const [filters, setFilters] = useAtom(activeFiltersAtom);
  const [operator, setOperator] = useState<FilterOperator>("equals");
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const allOptions = column.options || [];
  const allOptionValues = allOptions.map((opt) => String(opt.value));
  const filteredOptions = allOptions.filter((opt) =>
    String(opt.label).toLowerCase().includes(search.toLowerCase()),
  );
  const isAllSelected =
    allOptionValues.length > 0 && selectedValues.length === allOptionValues.length;

  useEffect(() => {
    const currentFilters = filters.filter((f) => f.fieldName === column.fieldName);
    const first = currentFilters[0];
    setOperator((first?.operator as FilterOperator) ?? "equals");

    const current = currentFilters
      .filter((f) => f.fieldName === column.fieldName)
      .map((f) => String(f.value ?? "").trim())
      .filter(Boolean);
    setSelectedValues(Array.from(new Set(current)));
  }, [filters, column.fieldName]);

  const handleToggleValue = (value: string) => {
    setSelectedValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const handleSelectAll = () => {
    // Toggle all options on/off
    setSelectedValues(isAllSelected ? [] : allOptionValues);
  };

  const handleApplyFilters = () => {
    if (operator === "isEmpty" || operator === "isNotEmpty") {
      const emptyFilter: ActiveFilter = {
        id: `filter-${column.fieldName}-${Date.now()}`,
        fieldName: column.fieldName,
        label: column.label,
        type: column.type,
        value: "",
        operator,
      };

      setFilters((prev) => [
        ...prev.filter((f) => f.fieldName !== column.fieldName),
        emptyFilter,
      ]);
      onBack();
      return;
    }

    if (selectedValues.length === 0) {
      setFilters((prev) =>
        prev.filter((f) => f.fieldName !== column.fieldName),
      );
      onBack();
      return;
    }

    const optionFilters: ActiveFilter[] = selectedValues.map((value) => ({
      id: `filter-${column.fieldName}-${value}-${Date.now()}`,
      fieldName: column.fieldName,
      label: column.label,
      type: column.type,
      value,
      operator,
    }));

    setFilters((prev) => [
      ...prev.filter((f) => f.fieldName !== column.fieldName),
      ...optionFilters,
    ]);

    onBack();
  };

  return (
    <div className="w-full flex flex-col h-full bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl">
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
      <div className="px-1 py-1 border-b border-white/30 dark:border-white/20" onClick={(e) => e.stopPropagation()}>
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
              {OPERATORS.find((op) => op.value === operator)?.label || "Select operator"}
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

      {operator !== "isEmpty" && operator !== "isNotEmpty" && (
        <div className="relative px-0 py-0 border border-gray-100 mx-1 my-1 rounded-md dark:border-white/20 bg-white/30 dark:bg-gray-800/30 backdrop-blur">
          <Search
            size={13}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none"
          />
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-7 pr-2 py-1.5 text-[11px] text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 outline-none bg-transparent transition-colors"
          />
        </div>
      )}

      {operator !== "isEmpty" && operator !== "isNotEmpty" && (
      <div className="px-1.5 pb-1.5 border-b border-white/30 dark:border-white/20">
        <button
          onClick={handleSelectAll}
          className={`flex items-center h-7 px-2 py-0 text-[11px] text-left border-none cursor-pointer transition-colors rounded-sm gap-1.5 w-full ${
            isAllSelected
              ? "bg-gray-100/70 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200"
              : "bg-transparent text-gray-700 dark:text-gray-100 hover:bg-white/10 dark:hover:bg-white/8"
          }`}
        >
          <span
            className={`flex items-center justify-center w-3 h-3 rounded border shrink-0 transition-colors ${
              isAllSelected
                ? "border-gray-500 bg-gray-500 text-white"
                : "border-gray-400 dark:border-gray-500 bg-transparent"
            }`}
          >
            {isAllSelected && (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path
                  d="M1.5 4l2 2 3-3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <span className="flex-1 truncate">Tout</span>
        </button>

        {filteredOptions.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => handleToggleValue(String(opt.value))}
            className={`flex items-center h-7 px-2 py-0 text-[11px] text-left border-none cursor-pointer transition-colors rounded-sm gap-1.5 w-full ${
              selectedValues.includes(String(opt.value))
                ? "bg-gray-100/70 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200"
                : "bg-transparent text-gray-700 dark:text-gray-100 hover:bg-white/10 dark:hover:bg-white/8"
            }`}
          >
            <span
              className={`flex items-center justify-center w-3 h-3 rounded border shrink-0 transition-colors ${
                selectedValues.includes(String(opt.value))
                  ? "border-gray-500 bg-gray-500 text-white"
                  : "border-gray-400 dark:border-gray-500 bg-transparent"
              }`}
            >
              {selectedValues.includes(String(opt.value)) && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path
                    d="M1.5 4l2 2 3-3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            {(opt as any).logo && (
              <img
                src={(opt as any).logo}
                alt={opt.label}
                className="w-3 h-3 object-contain shrink-0"
              />
            )}
            <span className="flex-1 truncate">{opt.label}</span>
          </button>
        ))}

        {filteredOptions.length === 0 && (
          <div className="px-2 py-2 text-[11px] text-gray-500 dark:text-gray-400">
            Aucun résultat
          </div>
        )}
      </div>
      )}

      <div className="px-2 py-1.5 border-t border-white/30 dark:border-white/20">
        <button
          onClick={handleApplyFilters}
          className="w-full px-3 py-1.5 bg-gray-200/80 border border-gray-300/60 text-gray-600 text-[11px] font-medium rounded cursor-pointer hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Appliquer filtre
        </button>
      </div>
    </div>
  );
};
