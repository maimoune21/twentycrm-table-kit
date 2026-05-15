import { useAtom, useSetAtom } from "jotai";
import { useCallback } from "react";
import {
  focusedCellPositionAtom,
  editModeCellPositionAtom,
  hoverCellPositionAtom,
} from "../states";
import type { TableCellPosition, MoveFocusDirection } from "../types";
import { useRecordTableContextOrThrow } from "../contexts";

export const useRecordTableCellFocus = () => {
  const { visibleColumns, records } = useRecordTableContextOrThrow();
  const [focusedPosition, setFocusedPosition] = useAtom(
    focusedCellPositionAtom,
  );
  const [editPosition, setEditPosition] = useAtom(editModeCellPositionAtom);
  const setHoverPosition = useSetAtom(hoverCellPositionAtom);

  const focusCell = useCallback(
    (position: TableCellPosition) => {
      setFocusedPosition(position);
    },
    [setFocusedPosition],
  );

  const unfocusCell = useCallback(() => {
    setFocusedPosition(null);
  }, [setFocusedPosition]);

  const openCellEditMode = useCallback(
    (position: TableCellPosition) => {
      setEditPosition(position);
    },
    [setEditPosition],
  );

  const closeCellEditMode = useCallback(() => {
    setEditPosition(null);
  }, [setEditPosition]);

  const moveHoverToCell = useCallback(
    (position: TableCellPosition) => {
      setHoverPosition(position);
    },
    [setHoverPosition],
  );

  const moveFocus = useCallback(
    (direction: MoveFocusDirection) => {
      setFocusedPosition((current) => {
        if (!current) return current;

        const maxRow = records.length - 1;
        const maxCol = visibleColumns.length - 1;

        switch (direction) {
          case "up":
            return current.row > 0
              ? { ...current, row: current.row - 1 }
              : current;
          case "down":
            return current.row < maxRow
              ? { ...current, row: current.row + 1 }
              : current;
          case "left":
            return current.column > 0
              ? { ...current, column: current.column - 1 }
              : current;
          case "right":
            return current.column < maxCol
              ? { ...current, column: current.column + 1 }
              : current;
          default:
            return current;
        }
      });
    },
    [setFocusedPosition, records.length, visibleColumns.length],
  );

  return {
    focusedPosition,
    editPosition,
    focusCell,
    unfocusCell,
    openCellEditMode,
    closeCellEditMode,
    moveHoverToCell,
    moveFocus,
    isEditMode: editPosition !== null,
  };
};
