import { type ReactNode, useState, useRef, useEffect } from "react";
import { useAtomValue } from "jotai";
import { currentViewNameAtom } from "../states/toolbarState";

type ViewBarProps = {
  /** Record count to display */
  recordCount?: number;
  /** Current page size (limit) */
  pageSize?: number;
  /** Callback when page size changes */
  onPageSizeChange?: (size: number) => void;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Right-side components (Filter, Sort, Options buttons) */
  rightComponent?: ReactNode;
  /** Bottom section (active filter/sort chips) */
  bottomComponent?: ReactNode;
};

const IconList = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);

const IconChevronDown = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/**
 * ViewBar matching Twenty's TopBar (39px height).
 * Left: View name + count. Right: Filter/Sort/Options. Bottom: Active chips.
 */
export const ViewBar = ({
  recordCount,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [20, 25, 50, 75, 100],
  rightComponent,
  bottomComponent,
}: ViewBarProps) => {
  const viewName = useAtomValue(currentViewNameAtom);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  return (
    <div className="flex flex-col border-b border-gray-200 dark:border-gray-700 ml-3">
      {/* Main bar */}
      <div className="flex items-center justify-between h-9 pr-2 text-gray-500 dark:text-gray-400">
        {/* Left: View selector with page size dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() =>
                pageSize !== undefined &&
                onPageSizeChange &&
                setIsDropdownOpen(!isDropdownOpen)
              }
              className="flex items-center gap-1.5 px-2 py-1 rounded-sm text-[0.8125rem] font-medium bg-transparent border-none cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <IconList />
              <span className="text-gray-500 dark:text-gray-500 text-xs">{viewName}</span>
              {pageSize !== undefined && (
                <span className="text-gray-400 dark:text-gray-500 text-xs">
                  · {pageSize}
                </span>
              )}
              <IconChevronDown />
            </button>

            {/* Page size dropdown */}
            {isDropdownOpen && pageSize !== undefined && onPageSizeChange && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 pt-0! min-w-24">
                <div className="px-3 py-1 text-[11px] text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                  Records per page
                </div>
                {pageSizeOptions.map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      onPageSizeChange(size);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-[12px] cursor-pointer transition-colors ${
                      size === pageSize
                        ? "bg-gray-100/80 text-gray-500 font-medium"
                        : "text-gray-500 dark:text-gray-300 hover:bg-gray-100/40 dark:hover:bg-gray-800"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-0.5">{rightComponent}</div>
      </div>

      {/* Bottom: Active chips bar */}
      {bottomComponent}
    </div>
  );
};
