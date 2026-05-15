import { useEffect, useRef } from "react";
import { useAtom } from "jotai";
import { columnWidthsAtom } from "../states";

const STORAGE_KEY_PREFIX = "record-table-column-widths";

/**
 * Persists column widths to localStorage, keyed by tableId.
 *
 * - On mount: loads saved widths into the atom (if any).
 * - On atom change: debounced save to localStorage (300ms).
 *
 * Call this once per table instance (inside RecordTableInner).
 */
export const useColumnWidthPersistence = (tableId: string) => {
  const [columnWidths, setColumnWidths] = useAtom(columnWidthsAtom);
  const isInitializedRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const key = `${STORAGE_KEY_PREFIX}-${tableId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          setColumnWidths(parsed);
        }
      }
    } catch {
      // Ignore corrupted data
    }
    isInitializedRef.current = true;
  }, [tableId, setColumnWidths]);

  // Debounced save to localStorage on change
  useEffect(() => {
    if (!isInitializedRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const key = `${STORAGE_KEY_PREFIX}-${tableId}`;
        if (Object.keys(columnWidths).length > 0) {
          localStorage.setItem(key, JSON.stringify(columnWidths));
        }
      } catch {
        // localStorage might be full or unavailable
      }
    }, 300);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [tableId, columnWidths]);
};
