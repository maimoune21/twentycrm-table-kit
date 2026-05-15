import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

type RecordTablePaginationProps = {
  pageIndex: number;
  maxPage: number;
  total: number;
  loading: boolean;
  onPageChange: (page: number) => void;
};

const KEYBOARD_SHORTCUTS = [
  { key: "↑↓←→", label: "Navigate" },
  { key: "Enter", label: "Edit cell" },
  { key: "Esc", label: "Cancel" },
  { key: "Tab", label: "Next cell" },
  { key: "Ctrl+K", label: "Command" },
  { key: "Ctrl+A", label: "Select all" },
  { key: "Ctrl+→", label: "Next" },
  { key: "Ctrl+←", label: "Prev" },
] as const;

const NAV_BTN =
  "p-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors";

function buildPageNumbers(pageIndex: number, maxPage: number) {
  const pages: (number | "...")[] = [];
  const showPages = 5;

  if (maxPage <= showPages) {
    for (let i = 0; i < maxPage; i++) pages.push(i);
  } else {
    pages.push(0);
    if (pageIndex > 2) pages.push("...");
    const start = Math.max(1, pageIndex - 1);
    const end = Math.min(maxPage - 2, pageIndex + 1);
    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) pages.push(i);
    }
    if (pageIndex < maxPage - 3) pages.push("...");
    if (!pages.includes(maxPage - 1)) pages.push(maxPage - 1);
  }

  return pages;
}

export function RecordTablePagination({
  pageIndex,
  maxPage,
  total,
  loading,
  onPageChange,
}: RecordTablePaginationProps) {
  const pages = buildPageNumbers(pageIndex, maxPage);

  return (
    <div className="shrink-0 flex items-center justify-between gap-4 px-4 pb-2">
      {/* Pagination controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {pageIndex + 1}/{maxPage || 1}
          <span className="hidden sm:inline ml-1">({total})</span>
        </span>

        <button
          onClick={() => onPageChange(0)}
          disabled={pageIndex === 0 || loading}
          className={NAV_BTN}
          title="Première page"
        >
          <ChevronsLeft className="size-4" />
        </button>
        <button
          onClick={() => onPageChange(Math.max(0, pageIndex - 1))}
          disabled={pageIndex === 0 || loading}
          className={NAV_BTN}
          title="Page précédente"
        >
          <ChevronLeft className="size-4" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) =>
            p === "..." ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-1 text-gray-400 dark:text-gray-500 text-xs"
              >
                ···
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                disabled={loading}
                className={`min-w-6 h-6 px-1.5 text-xs rounded border transition-colors cursor-pointer ${
                  pageIndex === p
                    ? "bg-gray-50 text-gray-500 border-gray-200 font-medium"
                    : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {p + 1}
              </button>
            ),
          )}
        </div>

        <button
          onClick={() => onPageChange(Math.min(maxPage - 1, pageIndex + 1))}
          disabled={pageIndex >= maxPage - 1 || loading}
          className={NAV_BTN}
          title="Page suivante"
        >
          <ChevronRight className="size-4" />
        </button>
        <button
          onClick={() => onPageChange(maxPage - 1)}
          disabled={pageIndex >= maxPage - 1 || loading}
          className={NAV_BTN}
          title="Dernière page"
        >
          <ChevronsRight className="size-4" />
        </button>
      </div>

      {/* Keyboard shortcuts help */}
      <div className="hidden lg:flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 overflow-hidden">
        {KEYBOARD_SHORTCUTS.map(({ key, label }) => (
          <span key={key} className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 font-mono text-[10px]">
              {key}
            </kbd>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
