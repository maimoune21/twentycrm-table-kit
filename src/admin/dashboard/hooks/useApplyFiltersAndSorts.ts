/**
 * Hook to apply active filters and sorts from toolbar atoms to records
 * Synchronizes activeFiltersAtom and activeSortsAtom with actual data transformation
 */

import { useMemo } from "react";
import { useAtomValue } from "jotai";
import {
  activeFiltersAtom,
  activeSortsAtom,
} from "@/components/twenty-table/toolbar/states/toolbarState";
import type { RecordData } from "@/components/twenty-table";

/**
 * Apply only sorts from toolbar (for use when filters are applied server-side via API)
 */
export function useApplySorts(records: RecordData[]) {
  const activeSorts = useAtomValue(activeSortsAtom);

  return useMemo(() => {
    if (activeSorts.length === 0) return records;

    const result = [...records];

    // Sort by each active sort in reverse order (last first)
    for (let i = activeSorts.length - 1; i >= 0; i--) {
      const sort = activeSorts[i];

      result.sort((a, b) => {
        const aVal = a[sort.fieldName as keyof RecordData] ?? "";
        const bVal = b[sort.fieldName as keyof RecordData] ?? "";

        // Handle null/undefined
        if (aVal === "" && bVal === "") return 0;
        if (aVal === "") return sort.direction === "asc" ? 1 : -1;
        if (bVal === "") return sort.direction === "asc" ? -1 : 1;

        // Compare values
        let comparison = 0;
        if (typeof aVal === "number" && typeof bVal === "number") {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sort.direction === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [records, activeSorts]);
}

export function useApplyFiltersAndSorts(records: RecordData[]) {
  const activeFilters = useAtomValue(activeFiltersAtom);
  const activeSorts = useAtomValue(activeSortsAtom);

  // Apply filters
  const filteredRecords = useMemo(() => {
    if (activeFilters.length === 0) return records;

    return records.filter((record) =>
      activeFilters.every((filter) => {
        const value = record[filter.fieldName as keyof RecordData] ?? "";
        const filterValue = String(filter.value).toLowerCase();

        switch (filter.operator) {
          case "contains":
            return String(value).toLowerCase().includes(filterValue);
          case "equals":
            return String(value).toLowerCase() === filterValue;
          case "startsWith":
            return String(value).toLowerCase().startsWith(filterValue);
          case "endsWith":
            return String(value).toLowerCase().endsWith(filterValue);
          default:
            return true;
        }
      }),
    );
  }, [records, activeFilters]);

  // Apply sorts
  const sortedRecords = useMemo(() => {
    if (activeSorts.length === 0) return filteredRecords;

    const result = [...filteredRecords];

    // Sort by each active sort in reverse order (last first)
    for (let i = activeSorts.length - 1; i >= 0; i--) {
      const sort = activeSorts[i];

      result.sort((a, b) => {
        const aVal = a[sort.fieldName as keyof RecordData] ?? "";
        const bVal = b[sort.fieldName as keyof RecordData] ?? "";

        // Handle null/undefined
        if (aVal === "" && bVal === "") return 0;
        if (aVal === "") return sort.direction === "asc" ? 1 : -1;
        if (bVal === "") return sort.direction === "asc" ? -1 : 1;

        // Compare values
        let comparison = 0;
        if (typeof aVal === "number" && typeof bVal === "number") {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sort.direction === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [filteredRecords, activeSorts]);

  return sortedRecords;
}
