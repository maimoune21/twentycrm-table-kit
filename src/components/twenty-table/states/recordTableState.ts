import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import type { TableCellPosition, SortState, FilterState } from "../types";
import type { RecordTableRowHeightSize } from "../constants";

// ── Row Selection ──
export const selectedRowIdsAtom = atom<Set<string>>(new Set<string>());

export const isRowSelectedAtomFamily = atomFamily((rowId: string) =>
  atom(
    (get) => get(selectedRowIdsAtom).has(rowId),
    (get, set, selected: boolean) => {
      const current = new Set(get(selectedRowIdsAtom));
      if (selected) {
        current.add(rowId);
      } else {
        current.delete(rowId);
      }
      set(selectedRowIdsAtom, current);
    },
  ),
);

// ── Row Focus ──
export const focusedRowIndexAtom = atom<number | null>(null);
export const activeRowIndexAtom = atom<number | null>(null);

export const isRowFocusedAtomFamily = atomFamily((rowIndex: number) =>
  atom((get) => get(focusedRowIndexAtom) === rowIndex),
);

export const isRowActiveAtomFamily = atomFamily((rowIndex: number) =>
  atom((get) => get(activeRowIndexAtom) === rowIndex),
);

export const isRowFocusActiveAtom = atom<boolean>(false);

// ── Cell Focus & Edit ──
export const focusedCellPositionAtom = atom<TableCellPosition | null>(null);
export const editModeCellPositionAtom = atom<TableCellPosition | null>(null);
export const hoverCellPositionAtom = atom<TableCellPosition | null>(null);

export const isCellInEditModeAtom = atom<boolean>(
  (get) => get(editModeCellPositionAtom) !== null,
);

// ── Table Scroll State ──
export const isScrolledHorizontallyAtom = atom<boolean>(false);
export const isScrolledVerticallyAtom = atom<boolean>(false);

// ── Column Resize ──
export const resizedColumnIdAtom = atom<string | null>(null);
export const resizeOffsetAtom = atom<number>(0);

// ── Row Positions (drag & drop reorder) ──
export const rowPositionsAtom = atom<Record<string, number>>({});

// ── Column Widths (persisted after resize) ──
export const columnWidthsAtom = atom<Record<string, number>>({});

// ── Table Width ──
export const tableWidthAtom = atom<number>(0);
export const numberOfRowsAtom = atom<number>(0);

// ── Table Loading ──
export const isTableInitialLoadingAtom = atom<boolean>(false);

// ── Sort & Filter ──
export const tableSortStateAtom = atom<SortState | null>(null);
export const tableFiltersAtom = atom<FilterState[]>([]);

// ── Derived: Selected row IDs as array ──
export const selectedRowIdsArrayAtom = atom<string[]>((get) =>
  Array.from(get(selectedRowIdsAtom)),
);

// ── Derived: All rows selected status ──
export const allRowsSelectedStatusAtom = atom((get) => {
  const selectedIds = get(selectedRowIdsAtom);
  const totalRows = get(numberOfRowsAtom);
  if (selectedIds.size === 0) return "none" as const;
  if (selectedIds.size === totalRows) return "all" as const;
  return "some" as const;
});

// ── Pending New Row (inline creation like Twenty) ──
export const isPendingNewRowAtom = atom<boolean>(false);

// ── Row Height Size ──
export const rowHeightSizeAtom = atom<RecordTableRowHeightSize>("compact");
export const pendingNewRowDataAtom = atom<Record<string, unknown>>({});

// ── Side Panel ──
export type SidePanelPage = "root" | "record";
export const sidePanelOpenedAtom = atom<boolean>(false);
export const sidePanelPageAtom = atom<SidePanelPage>("root");
export const sidePanelRecordIdAtom = atom<string | null>(null);
export const sidePanelWidthAtom = atom<number>(400);
export const sidePanelSearchAtom = atom<string>("");

// Navigation stack for back button (Twenty-style)
export type SidePanelNavigationItem = {
  page: SidePanelPage;
  recordId?: string | null;
  recordNameSingular?: string | null;
};
export const sidePanelNavigationStackAtom = atom<SidePanelNavigationItem[]>([]);
