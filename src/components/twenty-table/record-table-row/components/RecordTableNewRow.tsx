import { useCallback, useRef, useEffect, useMemo, useState } from "react";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { Loader2 } from "lucide-react";
import { useRecordTableContextOrThrow } from "../../contexts/RecordTableContext";
import { NewRowContext } from "../../contexts/NewRowContext";
import {
  isPendingNewRowAtom,
  pendingNewRowDataAtom,
  columnWidthsAtom,
} from "../../states";
import {
  RECORD_TABLE_COLUMN_CHECKBOX_WIDTH,
  RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH,
} from "../../constants";
import { useRowHeight } from "../../hooks/useRowHeight";
import { RecordTableNewRowCell } from "../../record-table-cell/components/RecordTableNewRowCell";
import type { ColumnDefinition } from "../../types";

type RecordTableNewRowProps = {
  onSave: (data: Record<string, unknown>) => Promise<boolean>; // Returns true if save succeeded
  onCancel: () => void;
  /** Required field names for validation */
  requiredFields?: string[];
};

// Expands nomComplet into two separate virtual columns (prénom + nom)
type VirtualColumn = {
  column: ColumnDefinition;
  virtualField?: "prenom" | "nom";
  virtualLabel?: string;
  originalIndex: number;
};

// Cancel confirmation dialog component
const CancelConfirmDialog = ({
  isOpen,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-dialog-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 max-w-sm mx-4">
        <h3
          id="cancel-dialog-title"
          className="text-lg font-medium text-gray-900 dark:text-white mb-2"
        >
          Annuler la création ?
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Les données saisies seront perdues. Voulez-vous vraiment annuler ?
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm font-medium rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Continuer l'édition
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-sm font-medium rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export const RecordTableNewRow = ({
  onSave,
  onCancel,
  requiredFields: explicitRequiredFields,
}: RecordTableNewRowProps) => {
  const { visibleColumns } = useRecordTableContextOrThrow();
  const [pendingData, setPendingData] = useAtom(pendingNewRowDataAtom);
  const setIsPending = useSetAtom(isPendingNewRowAtom);
  const columnWidths = useAtomValue(columnWidthsAtom);
  const rowRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<Map<number, HTMLInputElement | null>>(new Map());
  const rowHeight = useRowHeight();

  // Derive required fields: use explicit if provided, otherwise detect from columns
  const requiredFields = useMemo(() => {
    if (explicitRequiredFields) return explicitRequiredFields;
    // Auto-detect: the label identifier column is always required
    const labelCol = visibleColumns.find((c) => c.isLabelIdentifier);
    if (labelCol) {
      // If it's a nomComplet column (candidats), require prenom + nom + email
      if (labelCol.fieldName === "nomComplet") return ["prenom", "nom", "email"];
      return [labelCol.fieldName];
    }
    return [];
  }, [explicitRequiredFields, visibleColumns]);

  // New UX states
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Calculate left position for sticky columns
  const stickyOffset =
    RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH +
    RECORD_TABLE_COLUMN_CHECKBOX_WIDTH;

  // Expand columns: nomComplet becomes two virtual columns (prénom + nom)
  const virtualColumns = useMemo((): VirtualColumn[] => {
    const result: VirtualColumn[] = [];
    visibleColumns.forEach((col, idx) => {
      if (col.fieldName === "nomComplet" && col.isLabelIdentifier) {
        // Split into two virtual columns
        result.push({
          column: col,
          virtualField: "prenom",
          virtualLabel: "Prénom",
          originalIndex: idx,
        });
        result.push({
          column: col,
          virtualField: "nom",
          virtualLabel: "Nom",
          originalIndex: idx,
        });
      } else {
        result.push({ column: col, originalIndex: idx });
      }
    });
    return result;
  }, [visibleColumns]);

  // Check if user has entered any data
  const hasDataEntered = useMemo(() => {
    return Object.values(pendingData).some(
      (val) => val !== undefined && val !== null && String(val).trim() !== "",
    );
  }, [pendingData]);

  // Validate required fields
  const validateFields = useCallback(() => {
    const errors: Record<string, string> = {};
    for (const field of requiredFields) {
      const value = pendingData[field];
      if (!value || String(value).trim() === "") {
        errors[field] = "Ce champ est requis";
      }
    }
    // Email format validation
    const email = pendingData.email;
    if (
      email &&
      typeof email === "string" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      errors.email = "Format d'email invalide";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [pendingData, requiredFields]);

  // Check if form is valid for enabling save button
  const isFormValid = useMemo(() => {
    for (const field of requiredFields) {
      const value = pendingData[field];
      if (!value || String(value).trim() === "") {
        return false;
      }
    }
    return true;
  }, [pendingData, requiredFields]);

  // Auto scroll to new row on mount
  useEffect(() => {
    if (rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

  // Focus first input on mount + screen reader announcement
  useEffect(() => {
    setTimeout(() => {
      const firstInput = inputRefs.current.get(0);
      firstInput?.focus();
    }, 100);

    // Screen reader announcement
    const announcement = document.createElement("div");
    announcement.setAttribute("role", "status");
    announcement.setAttribute("aria-live", "polite");
    announcement.className = "sr-only";
    announcement.textContent =
      "Nouvelle ligne de création ouverte. Remplissez les champs requis.";
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
  }, []);

  // Mark field as touched
  const markFieldTouched = useCallback((fieldName: string) => {
    setTouchedFields((prev) => new Set([...prev, fieldName]));
  }, []);

  const handleFieldChange = useCallback(
    (fieldName: string, value: unknown) => {
      setPendingData((prev) => ({
        ...prev,
        [fieldName]: value,
      }));
      // Clear validation error when user types
      if (validationErrors[fieldName]) {
        setValidationErrors((prev) => {
          const next = { ...prev };
          delete next[fieldName];
          return next;
        });
      }
    },
    [setPendingData, validationErrors],
  );

  const handleSave = useCallback(async () => {
    // Validate all fields first
    if (!validateFields()) {
      // Mark all required fields as touched to show errors
      setTouchedFields(new Set(requiredFields));
      return;
    }

    setIsLoading(true);
    try {
      const success = await onSave(pendingData);
      if (success) {
        // Show success flash
        setShowSuccessFlash(true);
        setTimeout(() => {
          setPendingData({});
          setIsPending(false);
        }, 300);
      }
    } finally {
      setIsLoading(false);
    }
    // If not successful, keep the data so user can fix and retry
  }, [
    onSave,
    pendingData,
    setPendingData,
    setIsPending,
    validateFields,
    requiredFields,
  ]);

  // Confirm cancel and close
  const handleConfirmCancel = useCallback(() => {
    setShowCancelConfirm(false);
    setPendingData({});
    setIsPending(false);
    onCancel();
  }, [setPendingData, setIsPending, onCancel]);

  // Attempt to cancel - show confirmation if data was entered
  const attemptCancel = useCallback(() => {
    if (hasDataEntered) {
      setShowCancelConfirm(true);
    } else {
      handleConfirmCancel();
    }
  }, [hasDataEntered, handleConfirmCancel]);

  // Navigate to a specific cell
  const navigateToCell = useCallback(
    (cellIndex: number) => {
      const clampedIndex = Math.max(
        0,
        Math.min(cellIndex, virtualColumns.length - 1),
      );
      const input = inputRefs.current.get(clampedIndex);
      if (input) {
        input.focus();
      }
    },
    [virtualColumns.length],
  );

  // Create keyboard handler for cells - Tab moves between cells
  const createCellKeyHandler = useCallback(
    (cellIndex: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        attemptCancel();
        return;
      }

      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
        return;
      }

      // Tab navigation between cells (focus trap within row)
      if (e.key === "Tab") {
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+Tab: go to previous cell, wrap to last if at first
          if (cellIndex > 0) {
            navigateToCell(cellIndex - 1);
          } else {
            // Wrap to save button (focus trap)
            const saveBtn =
              rowRef.current?.querySelector<HTMLButtonElement>(
                "[data-save-btn]",
              );
            saveBtn?.focus();
          }
        } else {
          // Tab: go to next cell or to save button at the end
          if (cellIndex < virtualColumns.length - 1) {
            navigateToCell(cellIndex + 1);
          } else {
            // Focus save button
            const saveBtn =
              rowRef.current?.querySelector<HTMLButtonElement>(
                "[data-save-btn]",
              );
            saveBtn?.focus();
          }
        }
        return;
      }

      // Arrow key navigation (when at start/end of input)
      const target = e.target as HTMLInputElement;
      if (
        e.key === "ArrowRight" &&
        target.selectionStart === target.value?.length
      ) {
        if (cellIndex < virtualColumns.length - 1) {
          e.preventDefault();
          navigateToCell(cellIndex + 1);
        }
        return;
      }

      if (e.key === "ArrowLeft" && target.selectionStart === 0) {
        if (cellIndex > 0) {
          e.preventDefault();
          navigateToCell(cellIndex - 1);
        }
        return;
      }
    },
    [attemptCancel, handleSave, navigateToCell, virtualColumns.length],
  );

  // Handle keyboard navigation (fallback for container)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        attemptCancel();
        return;
      }

      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        handleSave();
        return;
      }
    },
    [attemptCancel, handleSave],
  );

  // Handle button keyboard events for focus trap
  const handleButtonKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Tab" && !e.shiftKey) {
        // Tab from cancel button wraps back to first input
        e.preventDefault();
        navigateToCell(0);
      }
    },
    [navigateToCell],
  );

  // Context value for cells to access pending data and update function
  const contextValue = useMemo(
    () => ({
      pendingData,
      onFieldChange: handleFieldChange,
      isLoading,
      validationErrors,
      touchedFields,
      markFieldTouched,
      requiredFields,
    }),
    [
      pendingData,
      handleFieldChange,
      isLoading,
      validationErrors,
      touchedFields,
      markFieldTouched,
      requiredFields,
    ],
  );

  // Register input ref
  const setInputRef = useCallback(
    (index: number, el: HTMLInputElement | null) => {
      inputRefs.current.set(index, el);
    },
    [],
  );

  return (
    <NewRowContext.Provider value={contextValue}>
      {/* Cancel confirmation dialog */}
      <CancelConfirmDialog
        isOpen={showCancelConfirm}
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelConfirm(false)}
      />

      <div
        ref={rowRef}
        role="form"
        aria-label="Formulaire de création d'enregistrement"
        className={`
          flex flex-row group/row relative
          ${
            showSuccessFlash
              ? "bg-green-100/50 dark:bg-green-900/20"
              : "bg-blue-50/30 dark:bg-blue-900/10"
          }
          transition-colors duration-300
        `}
        style={{ minWidth: "max-content" }}
        onKeyDown={handleKeyDown}
      >
        {/* Drag and drop placeholder - empty */}
        <div
          className="shrink-0 border-b border-gray-200/80 dark:border-gray-700/80"
          style={{
            width: RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH,
            height: rowHeight,
          }}
        />

        {/* Checkbox placeholder with + icon */}
        <div
          className="shrink-0 flex items-center justify-center border-b border-gray-200/80 dark:border-gray-700/80 sticky left-0 z-10 bg-blue-50/80 dark:bg-blue-900/20"
          style={{
            width: RECORD_TABLE_COLUMN_CHECKBOX_WIDTH,
            height: rowHeight,
          }}
        >
          <div className="w-5 h-5 rounded border-2 border-blue-500 flex items-center justify-center bg-blue-500 text-white">
            <svg
              className="w-3 h-3"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M8 3v10M3 8h10" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Field cells - with virtual columns for prénom/nom */}
        {virtualColumns.map((vCol, vIndex) => {
          const { column, virtualField, virtualLabel, originalIndex } = vCol;

          // Use resized width from atom, fallback to original column size
          const resolvedWidth = columnWidths[column.id] ?? column.size;

          // For virtual columns (prénom/nom), the CSS variable points to the
          // original column's index. We use half the resolved width per virtual half.
          const isVirtual = !!virtualField;
          const cssVarRef = `var(--record-table-column-field-${originalIndex}, ${resolvedWidth}px)`;

          // Sticky left calculation for first-column cells
          let leftPosition = stickyOffset;
          for (let i = 0; i < vIndex; i++) {
            const prevVCol = virtualColumns[i];
            const prevWidth =
              columnWidths[prevVCol.column.id] ?? prevVCol.column.size;
            leftPosition += prevVCol.virtualField ? prevWidth / 2 : prevWidth;
          }

          const isSticky = originalIndex === 0;

          // Width style: virtual columns get half the CSS variable width,
          // normal columns use the full CSS variable.
          const widthStyle = isVirtual
            ? {
                width: `calc(${cssVarRef} / 2)`,
                minWidth: `calc(${cssVarRef} / 2)`,
                maxWidth: `calc(${cssVarRef} / 2)`,
              }
            : {
                width: cssVarRef,
                minWidth: cssVarRef,
                maxWidth: cssVarRef,
              };

          return (
            <div
              key={`${column.id}-${virtualField || "main"}`}
              style={{
                ...widthStyle,
                flexShrink: 0,
                ...(isSticky && {
                  position: "sticky",
                  left: leftPosition,
                  zIndex: 15,
                }),
              }}
              className={isSticky ? "bg-blue-50/95 dark:bg-blue-900/30" : ""}
            >
              <RecordTableNewRowCell
                columnDefinition={column}
                virtualField={virtualField}
                virtualLabel={virtualLabel}
                inputRef={(el: HTMLInputElement | null) =>
                  setInputRef(vIndex, el)
                }
                onKeyDown={createCellKeyHandler(vIndex)}
              />
            </div>
          );
        })}

        {/* Last empty cell to fill remaining space */}
        <div className="flex-1 border-b border-gray-200/80 dark:border-gray-700/80" />

        {/* Save/Cancel buttons on the right */}
        <div
          className="shrink-0 flex items-center gap-2 px-3 border-b border-gray-200/80 dark:border-gray-700/80 sticky right-0 z-20 bg-white dark:bg-gray-900"
          style={{ height: rowHeight }}
        >
          <button
            data-save-btn
            onClick={handleSave}
            disabled={isLoading || !isFormValid}
            className={`
              px-3 py-1.5 text-sm font-medium rounded transition-colors
              flex items-center gap-1.5
              ${
                isLoading || !isFormValid
                  ? "bg-blue-400 cursor-not-allowed text-white/80"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }
            `}
            title="Enregistrer (Ctrl+Enter)"
            aria-label="Enregistrer le nouvel enregistrement"
            aria-describedby="save-shortcut"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Enregistrement...</span>
              </>
            ) : (
              <>
                <span>Enregistrer</span>
                <kbd className="hidden sm:inline-block ml-1 px-1 py-0.5 text-[10px] bg-blue-700/50 rounded">
                  ⌘↵
                </kbd>
              </>
            )}
          </button>
          <span id="save-shortcut" className="sr-only">
            Raccourci: Ctrl+Entrée
          </span>
          <button
            onClick={attemptCancel}
            disabled={isLoading}
            onKeyDown={handleButtonKeyDown}
            className={`
              px-3 py-1.5 text-sm font-medium rounded transition-colors
              ${
                isLoading
                  ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed text-gray-400"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }
            `}
            title="Annuler (Échap)"
            aria-label="Annuler la création"
          >
            Annuler
          </button>
        </div>
      </div>
    </NewRowContext.Provider>
  );
};
