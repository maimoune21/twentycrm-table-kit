import { useCallback, useState } from "react";
import { useAtomValue } from "jotai";
import { useRecordTableCellContext } from "../../contexts";
import { useRecordTableRowContextOrThrow } from "../../contexts";
import { useRecordTableContextOrThrow } from "../../contexts";
import {
  editModeCellPositionAtom,
  focusedCellPositionAtom,
} from "../../states";
import { RecordTableCellDisplayMode } from "./RecordTableCellDisplayMode";
import { RecordTableCellEditMode } from "./RecordTableCellEditMode";
import { useRecordTableCellFocus } from "../../hooks/useRecordTableCellFocus";
import { useRecordSidePanel } from "../../hooks/useRecordSidePanel";
import { useRowHeight } from "../../hooks/useRowHeight";
import { parsePhoneNumber } from "libphonenumber-js";

const ECOLE_SIDEPANEL_INITIAL_TAB_KEY_PREFIX = "ecole-sidepanel-initial-tab:";

const queueEcoleSidePanelInitialTab = (
  recordId: string,
  fieldName: string,
) => {
  if (typeof window === "undefined") return;

  let targetTab: string | null = null;
  if (fieldName === "calendarPreview") {
    targetTab = "calendar";
  } else if (fieldName === "campusSitesPreview") {
    targetTab = "ecolesAdmin";
  }

  if (!targetTab) return;

  try {
    window.sessionStorage.setItem(
      `${ECOLE_SIDEPANEL_INITIAL_TAB_KEY_PREFIX}${recordId}`,
      targetTab,
    );
  } catch {
    // Ignore storage errors and fallback to default tab behavior.
  }
};

const formatGsmForCopy = (rawValue: string): string => {
  const value = String(rawValue || "").trim();
  if (!value) return "";

  try {
    const parsed = parsePhoneNumber(value);
    if (parsed?.countryCallingCode && parsed?.nationalNumber) {
      const countryCode = `+${parsed.countryCallingCode}`;
      const national = String(parsed.nationalNumber).replace(/\D/g, "");
      const chunks = national.match(/.{1,3}/g) || [];
      return [countryCode, ...chunks].join(" ");
    }
  } catch {
    // fallback below
  }

  const normalized = value.replace(/\s+/g, "");
  if (normalized.startsWith("+")) {
    const digitsOnly = normalized.replace(/\D/g, "");
    if (!digitsOnly) return value;
    const countryDigits = digitsOnly.slice(0, 3);
    const restDigits = digitsOnly.slice(3);
    const chunks = restDigits.match(/.{1,3}/g) || [];
    return [`+${countryDigits}`, ...chunks].join(" ");
  }

  return value;
};

export const RecordTableCellContainer = () => {
  const { columnDefinition, cellPosition } = useRecordTableCellContext();
  const { recordId } = useRecordTableRowContextOrThrow();
  const { records } = useRecordTableContextOrThrow();
  const editPosition = useAtomValue(editModeCellPositionAtom);
  const focusedPosition = useAtomValue(focusedCellPositionAtom);
  const { openCellEditMode, closeCellEditMode, focusCell } =
    useRecordTableCellFocus();
  const { openRecordInSidePanel } = useRecordSidePanel();
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const rowHeight = useRowHeight();

  const record = records.find((r) => r.id === recordId);
  const value = record?.[columnDefinition.fieldName];

  const isEditMode =
    editPosition?.row === cellPosition.row &&
    editPosition?.column === cellPosition.column;

  const isFocused =
    focusedPosition?.row === cellPosition.row &&
    focusedPosition?.column === cellPosition.column;

  const handleClick = useCallback(() => {
    if (columnDefinition.onCellClick && record) {
      columnDefinition.onCellClick(recordId, record);
      return;
    }
    if (columnDefinition.onEditButtonClick && record) {
      columnDefinition.onEditButtonClick(recordId, record);
      return;
    }
    if (columnDefinition.isLabelIdentifier) {
      queueEcoleSidePanelInitialTab(recordId, columnDefinition.fieldName);
      openRecordInSidePanel(recordId);
      return;
    }
    if (columnDefinition.isNavigable) {
      queueEcoleSidePanelInitialTab(recordId, columnDefinition.fieldName);
      openRecordInSidePanel(recordId);
      return;
    }
    // Only open edit mode if the column is editable
    if (columnDefinition.isEditable === false) return;
    // Single click opens edit mode directly
    openCellEditMode(cellPosition);
  }, [
    openCellEditMode,
    cellPosition,
    columnDefinition.onCellClick,
    columnDefinition.isLabelIdentifier,
    columnDefinition.isNavigable,
    columnDefinition.onEditButtonClick,
    openRecordInSidePanel,
    recordId,
    record,
  ]);

  const handleDoubleClick = useCallback(() => {
    if (columnDefinition.isEditable === false) return;
    openCellEditMode(cellPosition);
  }, [openCellEditMode, cellPosition, columnDefinition.isEditable]);

  const handleCloseEdit = useCallback(() => {
    closeCellEditMode();
  }, [closeCellEditMode]);

  const handleCopyClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (value != null || columnDefinition.fieldName === "recruteurs") {
        const rawText = String(value ?? "");
        let textToCopy = rawText;

        if (columnDefinition.fieldName === "gsm") {
          textToCopy = formatGsmForCopy(rawText);
        }
        if (columnDefinition.fieldName === "recruteurs") {
          const recruiters = (record as any)?._recruteurs;
          if (Array.isArray(recruiters) && recruiters.length > 0) {
            textToCopy = recruiters
              .map((rec: any) =>
                [rec?.prenom, rec?.nom].filter(Boolean).join(" ") ||
                rec?.username ||
                `R${rec?.id ?? ""}`,
              )
              .join(", ");
          }
        }

        if (textToCopy.trim()) {
          navigator.clipboard.writeText(textToCopy);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }
      }
    },
    [value, columnDefinition.fieldName, record],
  );

  const handleEditButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (columnDefinition.onEditButtonClick && record) {
        columnDefinition.onEditButtonClick(recordId, record);
      } else if (columnDefinition.isLabelIdentifier) {
        queueEcoleSidePanelInitialTab(recordId, columnDefinition.fieldName);
        openRecordInSidePanel(recordId);
      } else if (columnDefinition.isNavigable) {
        queueEcoleSidePanelInitialTab(recordId, columnDefinition.fieldName);
        openRecordInSidePanel(recordId);
      } else if (columnDefinition.isEditable === false) {
        return;
      } else {
        openCellEditMode(cellPosition);
      }
    },
    [
      columnDefinition.isLabelIdentifier,
      columnDefinition.isNavigable,
      columnDefinition.onEditButtonClick,
      openRecordInSidePanel,
      recordId,
      record,
      openCellEditMode,
      cellPosition,
      columnDefinition.isEditable,
    ],
  );

  const isCopyEnabledField =
    columnDefinition.type === "EMAIL" ||
    columnDefinition.type === "PHONE" ||
    columnDefinition.fieldName === "nom" ||
    columnDefinition.fieldName === "recruteurs" ||
    columnDefinition.fieldName === "nomComplet" ||
    columnDefinition.fieldName === "titre" ||
    columnDefinition.fieldName === "entreprise" ||
    columnDefinition.fieldName === "nomEcole" ||
    columnDefinition.fieldName === "ecole";

  return (
    <div
      className={`
        group/cell relative flex items-center border-r border-b border-gray-200/80 dark:border-gray-700/80
        transition-colors duration-75 cursor-pointer select-none
        ${isEditMode ? "z-30 ring-2 ring-blue-500 ring-inset bg-white dark:bg-gray-800" : ""}
        ${isFocused && !isEditMode ? "ring-1 ring-blue-400 ring-inset bg-blue-50/30 dark:bg-blue-900/10" : ""}
        ${isHovered && !isFocused && !isEditMode ? "bg-gray-50/80 dark:bg-gray-800/50" : ""}
      `}
      style={{ height: rowHeight }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cell hover outline (like Twenty) */}
      {isHovered && !isEditMode && !isFocused && (
        <div className="absolute inset-0 pointer-events-none border border-gray-300/60 dark:border-gray-600/60 z-10" />
      )}

      {isEditMode ? (
        <RecordTableCellEditMode
          recordId={recordId}
          columnDefinition={columnDefinition}
          value={value}
          onClose={handleCloseEdit}
        />
      ) : (
        <RecordTableCellDisplayMode
          columnDefinition={columnDefinition}
          value={value}
          record={record}
        />
      )}

      {/* Edit button on hover (like Twenty's RecordTableCellEditButton) */}
      {isHovered &&
        !isEditMode &&
        (columnDefinition.isEditable !== false ||
          isCopyEnabledField ||
          columnDefinition.isLabelIdentifier ||
          columnDefinition.isNavigable ||
          columnDefinition.fieldName === "emailBounce") && (
        <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-1 z-20 border border-gray-200 dark:border-gray-600 rounded-md bg-white/50 dark:bg-gray-800/50 px-1">
          {/* Copy button for EMAIL and PHONE cells */}
          {isCopyEnabledField && (
            <button
              onClick={handleCopyClick}
              className="flex items-center justify-center w-6 h-6 rounded-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Copy value"
            >
              {copied ? (
                <svg
                  className="w-3.5 h-3.5 text-green-600 dark:text-green-400"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M3 8l3.5 3.5L13 5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect
                    x="5"
                    y="5"
                    width="8"
                    height="8"
                    rx="1"
                    strokeLinecap="round"
                  />
                  <path d="M3 11V3a1 1 0 011-1h8" strokeLinecap="round" />
                </svg>
              )}
            </button>
          )}

          {/* Edit button */}
          <button
            onClick={handleEditButtonClick}
            className="flex items-center justify-center w-6 h-6 rounded-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title={(columnDefinition.isLabelIdentifier || columnDefinition.isNavigable) ? "Open record" : "Edit"}
          >
            {(columnDefinition.isLabelIdentifier || columnDefinition.isNavigable) ? (
              /* Arrow up-right icon (like Twenty for label identifier) */
              <svg
                className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M6 3.5h6.5V10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M12.5 3.5L3.5 12.5" strokeLinecap="round" />
              </svg>
            ) : (
              /* Pencil icon (like Twenty for editable cells) */
              <svg
                className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M11.5 1.5l3 3-9 9H2.5v-3z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M9.5 3.5l3 3" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
