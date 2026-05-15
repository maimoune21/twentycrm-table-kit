import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useMemo } from "react";
import {
  tableSortStateAtom,
  tableFiltersAtom,
  numberOfRowsAtom,
  rowPositionsAtom,
} from "../states";
import {
  hiddenColumnIdsAtom,
  columnPositionsAtom,
} from "../toolbar/states/toolbarState";
import type {
  RecordData,
  ColumnDefinition,
  FilterState,
  SortDirection,
} from "../types";

export const useRecordTable = (
  records: RecordData[],
  columns: ColumnDefinition[],
) => {
  const sortState = useAtomValue(tableSortStateAtom);
  const filters = useAtomValue(tableFiltersAtom);
  const hiddenColumnIds = useAtomValue(hiddenColumnIdsAtom);
  const columnPositions = useAtomValue(columnPositionsAtom);
  const rowPositions = useAtomValue(rowPositionsAtom);
  const setSortState = useSetAtom(tableSortStateAtom);
  const setFilters = useSetAtom(tableFiltersAtom);
  const setNumberOfRows = useSetAtom(numberOfRowsAtom);

  // Filtering
  const filteredRecords = useMemo(() => {
    if (filters.length === 0) return records;

    return records.filter((record) =>
      filters.every((filter) => {
        const value = String(record[filter.fieldName] ?? "").toLowerCase();
        const filterValue = filter.value.toLowerCase();

        switch (filter.operator) {
          case "contains":
            return value.includes(filterValue);
          case "equals":
            return value === filterValue;
          case "startsWith":
            return value.startsWith(filterValue);
          case "endsWith":
            return value.endsWith(filterValue);
          default:
            return true;
        }
      }),
    );
  }, [records, filters]);

  // Sorting
  const sortedRecords = useMemo(() => {
    if (!sortState || !sortState.direction) return filteredRecords;

    return [...filteredRecords].sort((a, b) => {
      const aVal = a[sortState.fieldName];
      const bVal = b[sortState.fieldName];

      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const comparison = String(aVal).localeCompare(String(bVal));
      return sortState.direction === "asc" ? comparison : -comparison;
    });
  }, [filteredRecords, sortState]);

  // Apply manual row ordering from drag & drop
  const orderedRecords = useMemo(() => {
    if (Object.keys(rowPositions).length === 0) return sortedRecords;
    return [...sortedRecords].sort((a, b) => {
      const posA = rowPositions[a.id];
      const posB = rowPositions[b.id];
      if (posA === undefined && posB === undefined) return 0;
      if (posA === undefined) return 1;
      if (posB === undefined) return -1;
      return posA - posB;
    });
  }, [sortedRecords, rowPositions]);

  // Update row count
  useMemo(() => {
    setNumberOfRows(orderedRecords.length);
  }, [orderedRecords.length, setNumberOfRows]);

  // Columns that are visible (respecting hiddenColumnIds atom)
  // Note: isVisible in column definition only sets the INITIAL hidden state
  // Once initialized, hiddenColumnIdsAtom is the single source of truth
  const visibleColumns = useMemo(
    () =>
      columns
        .filter((col) => !hiddenColumnIds.has(col.id))
        .sort((a, b) => {
          const posA = columnPositions[a.id] ?? a.position;
          const posB = columnPositions[b.id] ?? b.position;
          return posA - posB;
        }),
    [columns, hiddenColumnIds, columnPositions],
  );

  const toggleSort = useCallback(
    (fieldName: string) => {
      setSortState((current) => {
        if (current?.fieldName === fieldName) {
          const nextDirection: SortDirection =
            current.direction === "asc"
              ? "desc"
              : current.direction === "desc"
                ? null
                : "asc";
          if (nextDirection === null) return null;
          return { fieldName, direction: nextDirection };
        }
        return { fieldName, direction: "asc" };
      });
    },
    [setSortState],
  );

  const addFilter = useCallback(
    (filter: FilterState) => {
      setFilters((prev) => [...prev, filter]);
    },
    [setFilters],
  );

  const removeFilter = useCallback(
    (fieldName: string) => {
      setFilters((prev) => prev.filter((f) => f.fieldName !== fieldName));
    },
    [setFilters],
  );

  const clearFilters = useCallback(() => {
    setFilters([]);
  }, [setFilters]);

  return {
    processedRecords: orderedRecords,
    visibleColumns,
    sortState,
    filters,
    toggleSort,
    addFilter,
    removeFilter,
    clearFilters,
    totalCount: records.length,
    filteredCount: sortedRecords.length,
  };
};
