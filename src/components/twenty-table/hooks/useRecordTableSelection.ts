import { useAtom, useSetAtom } from "jotai";
import { useCallback } from "react";
import {
  selectedRowIdsAtom,
  focusedRowIndexAtom,
  activeRowIndexAtom,
  isRowFocusActiveAtom,
  numberOfRowsAtom,
} from "../states";
import { useRecordTableContextOrThrow } from "../contexts";

export const useRecordTableSelection = () => {
  const { records } = useRecordTableContextOrThrow();
  const [selectedRowIds, setSelectedRowIds] = useAtom(selectedRowIdsAtom);
  const setNumberOfRows = useSetAtom(numberOfRowsAtom);

  const selectRow = useCallback(
    (rowId: string) => {
      setSelectedRowIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.add(rowId);
        return next;
      });
    },
    [setSelectedRowIds],
  );

  const deselectRow = useCallback(
    (rowId: string) => {
      setSelectedRowIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.delete(rowId);
        return next;
      });
    },
    [setSelectedRowIds],
  );

  const toggleRowSelection = useCallback(
    (rowId: string) => {
      setSelectedRowIds((prev: Set<string>) => {
        const next = new Set(prev);
        if (next.has(rowId)) {
          next.delete(rowId);
        } else {
          next.add(rowId);
        }
        return next;
      });
    },
    [setSelectedRowIds],
  );

  const selectAllRows = useCallback(() => {
    const allIds = new Set(records.map((r) => r.id));
    setSelectedRowIds(allIds);
    setNumberOfRows(records.length);
  }, [records, setSelectedRowIds, setNumberOfRows]);

  const deselectAllRows = useCallback(() => {
    setSelectedRowIds(new Set<string>());
  }, [setSelectedRowIds]);

  const selectRange = useCallback(
    (fromIndex: number, toIndex: number) => {
      const min = Math.min(fromIndex, toIndex);
      const max = Math.max(fromIndex, toIndex);
      const rangeIds = records.slice(min, max + 1).map((r) => r.id);
      setSelectedRowIds((prev: Set<string>) => {
        const next = new Set(prev);
        rangeIds.forEach((id) => next.add(id));
        return next;
      });
    },
    [records, setSelectedRowIds],
  );

  return {
    selectedRowIds,
    selectRow,
    deselectRow,
    toggleRowSelection,
    selectAllRows,
    deselectAllRows,
    selectRange,
    selectedCount: selectedRowIds.size,
    isAllSelected: selectedRowIds.size === records.length && records.length > 0,
    isSomeSelected:
      selectedRowIds.size > 0 && selectedRowIds.size < records.length,
  };
};

export const useRowFocus = () => {
  const [focusedRowIndex, setFocusedRowIndex] = useAtom(focusedRowIndexAtom);
  const [activeRowIndex, setActiveRowIndex] = useAtom(activeRowIndexAtom);
  const [isFocusActive, setIsFocusActive] = useAtom(isRowFocusActiveAtom);

  return {
    focusedRowIndex,
    setFocusedRowIndex,
    activeRowIndex,
    setActiveRowIndex,
    isFocusActive,
    setIsFocusActive,
  };
};
