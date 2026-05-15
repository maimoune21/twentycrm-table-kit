import { useHotkeys } from "react-hotkeys-hook";
import { useRecordTableCellFocus } from "./useRecordTableCellFocus";
import { useRecordTableSelection } from "./useRecordTableSelection";
import { useRecordTableContextOrThrow } from "../contexts";

export const useRecordTableHotkeys = () => {
  useRecordTableContextOrThrow();
  const {
    focusedPosition,
    moveFocus,
    openCellEditMode,
    closeCellEditMode,
    isEditMode,
  } = useRecordTableCellFocus();
  const { selectAllRows } = useRecordTableSelection();

  // Arrow keys for navigation
  useHotkeys(
    "up",
    (e) => {
      e.preventDefault();
      if (!isEditMode) moveFocus("up");
    },
    { enableOnFormTags: false },
    [isEditMode, moveFocus],
  );

  useHotkeys(
    "down",
    (e) => {
      e.preventDefault();
      if (!isEditMode) moveFocus("down");
    },
    { enableOnFormTags: false },
    [isEditMode, moveFocus],
  );

  useHotkeys(
    "left",
    (e) => {
      e.preventDefault();
      if (!isEditMode) moveFocus("left");
    },
    { enableOnFormTags: false },
    [isEditMode, moveFocus],
  );

  useHotkeys(
    "right",
    (e) => {
      e.preventDefault();
      if (!isEditMode) moveFocus("right");
    },
    { enableOnFormTags: false },
    [isEditMode, moveFocus],
  );

  // Enter to edit cell
  useHotkeys(
    "enter",
    (e) => {
      e.preventDefault();
      if (focusedPosition && !isEditMode) {
        openCellEditMode(focusedPosition);
      } else if (isEditMode) {
        closeCellEditMode();
      }
    },
    { enableOnFormTags: true },
    [focusedPosition, isEditMode, openCellEditMode, closeCellEditMode],
  );

  // Escape to close edit mode
  useHotkeys(
    "escape",
    () => {
      if (isEditMode) {
        closeCellEditMode();
      }
    },
    { enableOnFormTags: true },
    [isEditMode, closeCellEditMode],
  );

  // Ctrl+A to select all
  useHotkeys(
    "mod+a",
    (e) => {
      e.preventDefault();
      selectAllRows();
    },
    [selectAllRows],
  );

  // Tab to move right
  useHotkeys(
    "tab",
    (e) => {
      e.preventDefault();
      if (!isEditMode) {
        moveFocus("right");
      }
    },
    { enableOnFormTags: true },
    [isEditMode, moveFocus],
  );

  // Shift+Tab to move left
  useHotkeys(
    "shift+tab",
    (e) => {
      e.preventDefault();
      if (!isEditMode) {
        moveFocus("left");
      }
    },
    { enableOnFormTags: true },
    [isEditMode, moveFocus],
  );
};
