/**
 * Effect component to synchronize toolbar states between old and new systems
 * Keeps activeFiltersAtom/activeSortsAtom in sync with what users interact with
 * Also persists filters/sorts in URL params so they survive page refresh
 */

import { useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  activeFiltersAtom,
  activeSortsAtom,
  hiddenColumnIdsAtom,
  columnPositionsAtom,
  type ActiveFilter,
  type ActiveSort,
} from "@/components/twenty-table/toolbar/states/toolbarState";
import {
  tableSortStateAtom,
  tableFiltersAtom,
} from "@/components/twenty-table/states";
import type { ColumnDefinition } from "@/components/twenty-table";

// ── URL persistence helpers ──

function filtersToUrlParam(filters: ActiveFilter[]): string {
  if (filters.length === 0) return "";
  const serializable = filters.map(
    ({ id, label, type, fieldName, operator, value }) => ({
      id,
      label,
      type,
      fieldName,
      operator,
      value,
    }),
  );
  return btoa(encodeURIComponent(JSON.stringify(serializable)));
}

function sortsToUrlParam(sorts: ActiveSort[]): string {
  if (sorts.length === 0) return "";
  const serializable = sorts.map(({ id, label, fieldName, direction }) => ({
    id,
    label,
    fieldName,
    direction,
  }));
  return btoa(encodeURIComponent(JSON.stringify(serializable)));
}

/** Update a URL search param without triggering navigation */
function setUrlParam(key: string, value: string) {
  const url = new URL(window.location.href);
  if (value) {
    url.searchParams.set(key, value);
  } else {
    url.searchParams.delete(key);
  }
  window.history.replaceState({}, "", url.toString());
}

/**
 * Initialize hidden columns based on column definitions (isVisible: false)
 * Only runs once on mount
 */
export function useInitializeHiddenColumns(columns: ColumnDefinition[]) {
  const setHiddenIds = useSetAtom(hiddenColumnIdsAtom);
  const setColumnPositions = useSetAtom(columnPositionsAtom);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Find columns with isVisible: false
    const defaultHiddenIds = columns
      .filter((col) => col.isVisible === false)
      .map((col) => col.id);

    if (defaultHiddenIds.length > 0) {
      setHiddenIds(new Set(defaultHiddenIds));
    }

    // Reset column position overrides so initial render follows constants.position
    // (prevents stale DnD order leaking between admin tables/pages)
    setColumnPositions({});
  }, [columns, setHiddenIds, setColumnPositions]);
}

/** Read filters from current URL (reusable at mount time) */
function readFiltersFromUrl(): ActiveFilter[] {
  try {
    const param = new URL(window.location.href).searchParams.get("filters");
    if (!param) return [];
    return JSON.parse(decodeURIComponent(atob(param)));
  } catch {
    return [];
  }
}

/** Read sorts from current URL (reusable at mount time) */
function readSortsFromUrl(): ActiveSort[] {
  try {
    const param = new URL(window.location.href).searchParams.get("sorts");
    if (!param) return [];
    return JSON.parse(decodeURIComponent(atob(param)));
  } catch {
    return [];
  }
}

/**
 * Sync old atoms to new atoms when table sort/filter change
 * This ensures RecordTableHeaderCell clicks update the toolbar atoms
 * Also persists filters/sorts in URL so they survive page refresh
 *
 * On mount: re-reads the current URL to scope filters/sorts per page
 * (avoids contamination when navigating between V2 pages in SPA mode)
 */
export function useToolbarStateSync() {
  const tableSort = useAtomValue(tableSortStateAtom);
  const tableFilters = useAtomValue(tableFiltersAtom);
  const setSorts = useSetAtom(activeSortsAtom);
  const setFilters = useSetAtom(activeFiltersAtom);

  // Read current atom values for URL sync
  const currentFilters = useAtomValue(activeFiltersAtom);
  const currentSorts = useAtomValue(activeSortsAtom);

  // ── On mount: scope atoms to current page URL ──
  // Re-reads URL so each V2 page gets its own filters/sorts.
  // Works correctly with StrictMode (mount → cleanup → remount).
  useEffect(() => {
    const urlFilters = readFiltersFromUrl();
    const urlSorts = readSortsFromUrl();

    setFilters(urlFilters);
    setSorts(urlSorts);

    return () => {
      setFilters([]);
      setSorts([]);
    };
  }, [setFilters, setSorts]);

  // ── Persist filters to URL on change ──
  useEffect(() => {
    setUrlParam("filters", filtersToUrlParam(currentFilters));
  }, [currentFilters]);

  // ── Persist sorts to URL on change ──
  useEffect(() => {
    setUrlParam("sorts", sortsToUrlParam(currentSorts));
  }, [currentSorts]);

  // Sync table sort to active sorts
  useEffect(() => {
    if (tableSort) {
      setSorts((current) => {
        const existing = current.find(
          (s) => s.fieldName === tableSort.fieldName,
        );
        if (existing?.direction === tableSort.direction) {
          return current; // No change
        }
        // Update or add
        if (existing) {
          return current.map((s) =>
            s.fieldName === tableSort.fieldName
              ? { ...s, direction: tableSort.direction }
              : s,
          );
        } else {
          return [
            ...current,
            {
              id: `${tableSort.fieldName}-${Date.now()}`,
              fieldName: tableSort.fieldName,
              label: tableSort.fieldName,
              direction: tableSort.direction,
            },
          ];
        }
      });
    } else {
      // tableSort is null (initial state or user cleared via header click)
      // Don't overwrite URL-loaded sorts with empty state
      setSorts((current) => (current.length > 0 ? current : []));
    }
  }, [tableSort, setSorts]);

  // Sync table filters to active filters
  useEffect(() => {
    setFilters((current) => {
      // Don't let empty old-system state overwrite URL-loaded filters
      if (tableFilters.length === 0) return current;

      if (tableFilters.length === current.length) {
        // Check if they're the same
        const allSame = tableFilters.every((tf) =>
          current.some(
            (cf) =>
              cf.fieldName === tf.fieldName &&
              cf.operator === tf.operator &&
              cf.value === tf.value,
          ),
        );
        if (allSame) return current;
      }

      // Replace
      return tableFilters.map((tf) => ({
        id: `${tf.fieldName}-${Date.now()}`,
        fieldName: tf.fieldName,
        operator: tf.operator,
        value: tf.value,
        label: tf.fieldName,
        type: "TEXT" as const,
      }));
    });
  }, [tableFilters, setFilters]);
}
