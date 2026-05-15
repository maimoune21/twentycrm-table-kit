import { useState, useEffect, useRef } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";

interface Company {
  entreprise_id: number;
  entreprise_name: string;
  logo_url?: string;
  media_id?: number;
  statut?: string;
}

interface CompanyFilterPanelProps {
  column: ColumnDefinition;
  onBack: () => void;
}

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "equals", label: "Is" },
  { value: "contains", label: "Contains" },
  { value: "isEmpty", label: "Is empty" },
  { value: "isNotEmpty", label: "Is not empty" },
];

export const CompanyFilterPanel = ({
  column,
  onBack,
}: CompanyFilterPanelProps) => {
  const [, setFilters] = useAtom(activeFiltersAtom);
  const [operator, setOperator] = useState<FilterOperator>("equals");
  const [search, setSearch] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<number>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial 10 companies
  useEffect(() => {
    const loadInitialCompanies = async () => {
      setLoading(true);
      try {
        setCompanies([]);
      } catch (error) {
        console.error("Error loading companies:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialCompanies();
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!search.trim()) {
      // Reload initial companies
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          setCompanies([]);
        } catch (error) {
          console.error("Error loading companies:", error);
        } finally {
          setLoading(false);
        }
      }, 300);
    } else {
      // Search
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          setCompanies([]);
        } catch (error) {
          console.error("Error searching companies:", error);
        } finally {
          setLoading(false);
        }
      }, 300);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const handleToggleCompany = (id: number) => {
    const newSelected = new Set(selectedCompanies);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCompanies(newSelected);
  };

  const handleApplyFilter = () => {
    if (
      operator !== "isEmpty" &&
      operator !== "isNotEmpty" &&
      selectedCompanies.size === 0
    ) {
      return;
    }

    // For IS: store comma-separated IDs → backend param entreprise_ids
    // For CONTAINS: store comma-separated names → backend param entreprise_contains
    const selectedIds = Array.from(selectedCompanies).join(",");
    const selectedNames = Array.from(selectedCompanies)
      .map((id) => companies.find((c) => c.entreprise_id === id)?.entreprise_name)
      .filter(Boolean)
      .join(",");

    let filterValue: string | undefined;
    if (operator === "isEmpty" || operator === "isNotEmpty") {
      filterValue = undefined;
    } else if (operator === "equals") {
      filterValue = selectedIds; // IDs for backend entreprise_ids
    } else {
      filterValue = selectedNames; // Names for backend entreprise_contains
    }

    const newFilter: ActiveFilter = {
      id: `filter-${column.fieldName}-${Date.now()}`,
      fieldName: column.fieldName,
      label: column.label,
      type: column.type,
      value: filterValue,
      operator,
    };

    setFilters((prev) => [
      ...prev.filter((f) => f.fieldName !== column.fieldName),
      newFilter,
    ]);

    onBack();
  };

  const canApply =
    operator === "isEmpty" ||
    operator === "isNotEmpty" ||
    selectedCompanies.size > 0;

  const getCompanyInitials = (name?: string | null): string => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getCompanyColor = (id: number): string => {
    const colors = [
      "bg-red-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-yellow-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-cyan-500",
      "bg-orange-500",
      "bg-teal-500",
    ];
    return colors[id % colors.length];
  };

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
      <div className="px-1 py-1 border-b border-white/30 dark:border-white/20" onClick={(e) => e.stopPropagation()}>
        <Select value={operator} onValueChange={(value) => setOperator(value as FilterOperator)} indicatorVisibility={false}>
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

      {/* Search Input */}
      {operator !== "isEmpty" && operator !== "isNotEmpty" && (
        <div className="relative px-0 py-0 border border-gray-100 mx-1 mb-1 rounded-md dark:border-white/20 bg-white/30 dark:bg-gray-800/30 backdrop-blur">
          <Search
            size={13}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none"
          />
          <input
            autoFocus
            type="text"
            placeholder="Company"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-[11px] text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 outline-none bg-transparent transition-colors"
          />
        </div>
      )}

      {/* Companies List */}
      {operator !== "isEmpty" && operator !== "isNotEmpty" && (
        <div className="flex-1 min-h-0 mb-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-xs text-gray-500">Loading...</div>
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-xs text-gray-400 dark:text-gray-500">
                No companies found
              </div>
            </div>
          ) : (
            <div className="pl-0.5 pb-1.5 border border-gray-100 rounded-md mx-1 dark:border-white/20">
              <ScrollArea className="h-44" onWheel={(e) => e.stopPropagation()}>
                <div className="space-y-0.5 pr-2">
                  {companies.map((company, index) => {
                    const isSelected = selectedCompanies.has(company.entreprise_id);
                    return (
                      <button
                        key={company.entreprise_id}
                        type="button"
                        onClick={() => handleToggleCompany(company.entreprise_id)}
                        className={`flex items-center h-9 px-2 py-0 text-[11px] text-left border-none cursor-pointer transition-colors rounded-sm gap-1.5 w-full ${
                          isSelected
                            ? "bg-gray-100/70 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200"
                            : "bg-transparent text-gray-700 dark:text-gray-100 hover:bg-white/10 dark:hover:bg-white/8"
                        }`}
                      >
                        <span
                          className={`flex items-center justify-center w-3 h-3 rounded border shrink-0 transition-colors ${
                            isSelected
                              ? "border-gray-500 bg-gray-500 text-white"
                              : "border-gray-400 dark:border-gray-500 bg-transparent"
                          }`}
                        >
                          {isSelected && (
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

                        {company.logo_url ? (
                          <img
                            src={company.logo_url}
                            alt={company.entreprise_name}
                            className="w-4 h-4 rounded-[3px] object-cover shrink-0 bg-gray-100"
                          />
                        ) : (
                          <div
                            className={`w-4 h-4 rounded-[3px] ${getCompanyColor(index)} flex items-center justify-center shrink-0`}
                          >
                            <span className="text-[8px] font-bold text-white">
                              {getCompanyInitials(company.entreprise_name)}
                            </span>
                          </div>
                        )}

                        <span className="min-w-0 flex-1 leading-tight">
                          <span className="block truncate font-medium">
                            {company.entreprise_name || "Unnamed"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}

      {/* Footer with Apply Button */}
      <div className="px-2 pt-1.5 pb-1 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <button
          onClick={handleApplyFilter}
          disabled={!canApply}
          className="w-full px-3 py-1.5 bg-gray-200/80 border border-gray-300/60 text-gray-600 text-[11px] font-medium rounded cursor-pointer hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Apply filter
        </button>
      </div>
    </div>
  );
};
