import { atom } from "jotai";
import type { ColumnDefinition, SortState, FilterState } from "../../types";

// ── URL bootstrap helpers (read once at module load for page refresh) ──
function readFiltersFromUrl(): ActiveFilter[] {
  try {
    if (typeof window === "undefined") return [];
    const param = new URL(window.location.href).searchParams.get("filters");
    if (!param) return [];
    const parsed = JSON.parse(decodeURIComponent(atob(param)));
    if (!Array.isArray(parsed)) return [];
    return parsed.map((f: any) => ({
      ...f,
      value:
        typeof f.value === "object" && f.value !== null
          ? JSON.stringify(f.value)
          : f.value,
    }));
  } catch {
    return [];
  }
}

function readSortsFromUrl(): ActiveSort[] {
  try {
    if (typeof window === "undefined") return [];
    const param = new URL(window.location.href).searchParams.get("sorts");
    if (!param) return [];
    return JSON.parse(decodeURIComponent(atob(param)));
  } catch {
    return [];
  }
}

// ── Filter state ──
export type FilterOperator = FilterState["operator"];

export type ActiveFilter = FilterState & {
  id: string;
  label: string; // column label for display
  type: ColumnDefinition["type"];
};

export const activeFiltersAtom = atom<ActiveFilter[]>(readFiltersFromUrl());

// ── Sort state ──
export type ActiveSort = SortState & {
  id: string;
  label: string; // column label for display
};

export const activeSortsAtom = atom<ActiveSort[]>(readSortsFromUrl());

// ── Dropdown open states ──
export const filterDropdownOpenAtom = atom(false);
export const sortDropdownOpenAtom = atom(false);
export const optionsDropdownOpenAtom = atom(false);

// ── View name ──
export const currentViewNameAtom = atom("All Records");

// ── Column visibility (for Options) ──
export const hiddenColumnIdsAtom = atom<Set<string>>(new Set<string>());

// ── Column positions (for drag-and-drop reordering) ──
export const columnPositionsAtom = atom<Record<string, number>>({});
