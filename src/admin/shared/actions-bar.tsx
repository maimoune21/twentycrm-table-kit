import { useAtomValue, useSetAtom } from "jotai";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import type { ReactNode } from "react";

import {
  selectedRowIdsAtom,
  selectedRowIdsArrayAtom,
  type BulkAction,
} from "@/components/twenty-table";

const IconTrash = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const IconDownload = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconX = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const IconCheck = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const IconBan = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m4.9 4.9 14.2 14.2" />
  </svg>
);

const IconSparkles = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3l1.9 4.3L18 9l-4.1 1.7L12 15l-1.9-4.3L6 9l4.1-1.7L12 3z" />
  </svg>
);

type LocalSelectionActionBarProps = {
  onDelete?: (ids: string[]) => void;
  onExport?: (ids: string[]) => void;
  bulkActions?: BulkAction[];
  visibleRecordIds?: string[];
};

export const LocalSelectionActionBar = ({
  onDelete,
  onExport,
  bulkActions,
  visibleRecordIds,
}: LocalSelectionActionBarProps) => {
  const selectedIds = useAtomValue(selectedRowIdsArrayAtom);
  const setSelectedRowIds = useSetAtom(selectedRowIdsAtom);

  const selectedIdsInTable = useMemo(() => {
    const recordIds = new Set((visibleRecordIds || []).map(String));
    return selectedIds.filter((id) => recordIds.has(String(id)));
  }, [visibleRecordIds, selectedIds]);

  const count = selectedIdsInTable.length;

  const handleDeselectAll = () => {
    setSelectedRowIds(new Set<string>());
  };

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
            mass: 0.8,
          }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-1 p-2 bg-white/90 dark:bg-gray-900/85 rounded-xl shadow-lg shadow-black/10 dark:shadow-black/25 border border-gray-200/80 dark:border-gray-700/70 backdrop-blur-xl">
            <button
              onClick={handleDeselectAll}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 border border-gray-200 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/70 cursor-pointer bg-gray-100/60 transition-colors"
              title="Tout deselectionner"
            >
              <IconX />
            </button>

            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

            <div className="flex items-center gap-1.5 px-2">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 tabular-nums">
                {count}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                selectionne{count > 1 ? "s" : ""}
              </span>
            </div>

            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

            <div className="flex items-center gap-1">
              {bulkActions?.map((action, idx) => (
                <FloatingActionButton
                  key={idx}
                  icon={action.icon}
                  label={action.label}
                  variant={action.variant || "default"}
                  isLoading={action.isLoading}
                  onClick={() => action.onClick(selectedIdsInTable)}
                />
              ))}

              {onExport && (
                <FloatingActionButton
                  icon={<IconDownload />}
                  label="Exporter"
                  onClick={() => onExport(selectedIdsInTable)}
                />
              )}

              {onDelete && (
                <FloatingActionButton
                  icon={<IconTrash />}
                  label="Supprimer"
                  variant="danger"
                  onClick={() => onDelete(selectedIdsInTable)}
                />
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const FloatingActionButton = ({
  icon,
  label,
  variant = "default",
  isLoading = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  variant?: "default" | "danger" | "success" | "warning";
  isLoading?: boolean;
  onClick?: () => void;
}) => {
  const baseClasses =
    "flex items-center justify-center gap-1.5 px-2.5 h-8 w-fit rounded-lg text-[11px] font-medium cursor-pointer transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 whitespace-nowrap";

  const variantClasses = {
    default:
      "bg-gray-100/80 dark:bg-gray-800/70 border border-gray-200/80 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-gray-700/80",
    danger:
      "bg-red-50 dark:bg-red-500/10 border border-red-200/80 dark:border-red-500/25 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/20",
    success:
      "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/25 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20",
    warning:
      "bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/25 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20",
  };

  const fallbackIcon = (() => {
    const normalized = label.toLowerCase();
    if (normalized.includes("activer")) return <IconCheck />;
    if (normalized.includes("desact")) return <IconBan />;
    if (normalized.includes("premium") || normalized.includes("gerer")) {
      return <IconSparkles />;
    }
    if (variant === "danger") return <IconTrash />;
    return null;
  })();

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {isLoading ? (
        <svg
          className="w-3.5 h-3.5 animate-spin shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" opacity="0.25" />
          <path d="M12 2a10 10 0 0 1 0 20" strokeLinecap="round" />
        </svg>
      ) : (
        <span className="inline-flex items-center justify-center shrink-0">
          {icon ?? fallbackIcon}
        </span>
      )}
      <span>{label}</span>
    </button>
  );
};
