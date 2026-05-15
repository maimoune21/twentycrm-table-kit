import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { selectedRowIdsAtom, allRowsSelectedStatusAtom } from "../../states";
import { useRecordTableSelection } from "../../hooks/useRecordTableSelection";
import type { BulkAction } from "../../types";

type RecordTableBulkActionBarProps = {
  actions?: BulkAction[];
};

export const RecordTableBulkActionBar = ({
  actions = [],
}: RecordTableBulkActionBarProps) => {
  const selectedRowIds = useAtomValue(selectedRowIdsAtom);
  const allRowsStatus = useAtomValue(allRowsSelectedStatusAtom);
  const { deselectAllRows, selectAllRows } = useRecordTableSelection();
  const selectedCount = selectedRowIds.size;

  const handleDeselectAll = useCallback(() => {
    deselectAllRows();
  }, [deselectAllRows]);

  const handleSelectAll = useCallback(() => {
    selectAllRows();
  }, [selectAllRows]);

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50
            flex items-center gap-2 px-4 py-2.5
            bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900
            rounded-xl shadow-2xl shadow-black/20
            border border-gray-700 dark:border-gray-300"
        >
          {/* Selection count */}
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}
          </span>

          {/* Select all / Deselect all toggle */}
          {allRowsStatus !== "all" && (
            <button
              onClick={handleSelectAll}
              className="text-xs px-2 py-1 rounded-md
                bg-white/10 dark:bg-black/10
                hover:bg-white/20 dark:hover:bg-black/20
                transition-colors whitespace-nowrap"
            >
              Tout sélectionner
            </button>
          )}

          {/* Separator */}
          <div className="w-px h-5 bg-gray-600 dark:bg-gray-400" />

          {/* Custom actions */}
          {actions.map((action, idx) => {
            const variantClasses = {
              default:
                "bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20",
              danger:
                "bg-red-500/20 hover:bg-red-500/30 text-red-300 dark:text-red-600",
              success:
                "bg-green-500/20 hover:bg-green-500/30 text-green-300 dark:text-green-600",
              warning:
                "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 dark:text-yellow-600",
            };

            return (
              <button
                key={idx}
                onClick={() => action.onClick(Array.from(selectedRowIds))}
                disabled={action.isLoading}
                className={`
                  flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md
                  transition-colors whitespace-nowrap
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${variantClasses[action.variant || "default"]}
                `}
                title={action.label}
              >
                {action.isLoading ? (
                  <svg
                    className="w-3.5 h-3.5 animate-spin"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <circle
                      cx="8"
                      cy="8"
                      r="6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="30"
                      strokeDashoffset="10"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  action.icon && (
                    <span className="w-3.5 h-3.5 flex items-center justify-center">
                      {action.icon}
                    </span>
                  )
                )}
                <span>{action.label}</span>
              </button>
            );
          })}

          {/* Separator */}
          <div className="w-px h-5 bg-gray-600 dark:bg-gray-400" />

          {/* Deselect (close) button */}
          <button
            onClick={handleDeselectAll}
            className="p-1 rounded-md
              hover:bg-white/20 dark:hover:bg-black/20
              transition-colors"
            title="Désélectionner tout"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
