import { useAtom } from "jotai";
import {
  activeFiltersAtom,
  activeSortsAtom,
  type ActiveFilter,
  type ActiveSort,
} from "../states/toolbarState";

const IconX = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const IconArrowUp = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

const IconArrowDown = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </svg>
);

/** Chip for an active filter */
const FilterChip = ({
  filter,
  onRemove,
}: {
  filter: ActiveFilter;
  onRemove: () => void;
}) => (
  <div className="flex items-center gap-1 h-5.5 px-2 rounded bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-700 dark:text-gray-300 shrink-0">
    <span className="font-medium">{filter.label}</span>
    <span className="text-gray-400">{filter.operator}</span>
    <span className="text-gray-900 dark:text-gray-100 max-w-[100px] truncate">
      {typeof filter.value === "object" ? JSON.stringify(filter.value) : String(filter.value ?? "")}
    </span>
    <button
      onClick={onRemove}
      className="flex items-center justify-center w-4 h-4 ml-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer text-gray-400 hover:text-gray-600 border-none bg-transparent transition-colors"
    >
      <IconX />
    </button>
  </div>
);

/** Chip for an active sort */
const SortChip = ({
  sort,
  onRemove,
}: {
  sort: ActiveSort;
  onRemove: () => void;
}) => (
  <div className="flex items-center gap-1 h-6 px-2 rounded bg-gray-100 dark:bg-gray-800 text-[0.75rem] text-gray-700 dark:text-gray-300 shrink-0">
    {sort.direction === "asc" ? <IconArrowUp /> : <IconArrowDown />}
    <span className="font-medium">{sort.label}</span>
    <button
      onClick={onRemove}
      className="flex items-center justify-center w-4 h-4 ml-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer text-gray-400 hover:text-gray-600 border-none bg-transparent transition-colors"
    >
      <IconX />
    </button>
  </div>
);

/** Separator between sort chips and filter chips */
const ChipSeparator = () => (
  <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 shrink-0 mx-1" />
);

/**
 * Bottom bar showing active filter & sort chips.
 * Matches Twenty's ViewBarDetails (32px min-height, border-top).
 * Only renders when there are active filters or sorts.
 */
export const ViewBarDetails = () => {
  const [filters, setFilters] = useAtom(activeFiltersAtom);
  const [sorts, setSorts] = useAtom(activeSortsAtom);

  if (filters.length === 0 && sorts.length === 0) return null;

  const removeFilter = (id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  };

  const removeSort = (id: string) => {
    setSorts((prev) => prev.filter((s) => s.id !== id));
  };

  const handleResetAll = () => {
    setFilters([]);
    setSorts([]);
  };

  return (
    <div className="flex items-center justify-between min-h-8 py-1 border-t border-gray-200 dark:border-gray-700">
      {/* Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto min-w-0">
        {/* Sort chips */}
        {sorts.map((sort) => (
          <SortChip
            key={sort.id}
            sort={sort}
            onRemove={() => removeSort(sort.id)}
          />
        ))}
        {/* Separator */}
        {sorts.length > 0 && filters.length > 0 && <ChipSeparator />}
        {/* Filter chips */}
        {filters.map((filter) => (
          <FilterChip
            key={filter.id}
            filter={filter}
            onRemove={() => removeFilter(filter.id)}
          />
        ))}
      </div>

      {/* Reset button */}
      <button
        onClick={handleResetAll}
        className="shrink-0 px-2 py-0.5 text-[0.75rem] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-transparent border-none cursor-pointer transition-colors"
      >
        Reset
      </button>
    </div>
  );
};
