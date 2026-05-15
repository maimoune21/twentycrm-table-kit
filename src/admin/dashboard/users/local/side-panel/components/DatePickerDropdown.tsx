import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

// ═══════════════════════════════════════════════════════
// Twenty-style DatePicker — standalone Tailwind calendar
// ═══════════════════════════════════════════════════════

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Monday = 0
}

function formatDateDisplay(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

type DatePickerProps = {
  value: string | null;
  onChange: (isoDate: string | null) => void;
  onClose: () => void;
};

export const DatePickerDropdown = ({ value, onChange, onClose }: DatePickerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = value ? new Date(value) : null;
  const today = useMemo(() => new Date(), []);

  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());
  const [monthDropOpen, setMonthDropOpen] = useState(false);
  const [yearDropOpen, setYearDropOpen] = useState(false);

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.stopPropagation(); onClose(); }
  }, [onClose]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  // Previous month's trailing days
  const prevMonthDays = getDaysInMonth(viewYear, viewMonth - 1);
  const leadingDays = Array.from({ length: firstDay }, (_, i) => ({
    day: prevMonthDays - firstDay + 1 + i,
    currentMonth: false,
  }));

  // Current month days
  const currentDays = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    currentMonth: true,
  }));

  // Trailing next month days
  const totalCells = leadingDays.length + currentDays.length;
  const trailingCount = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  const trailingDays = Array.from({ length: trailingCount }, (_, i) => ({
    day: i + 1,
    currentMonth: false,
  }));

  const allDays = [...leadingDays, ...currentDays, ...trailingDays];

  const isToday = (day: number, isCurrentMonth: boolean) =>
    isCurrentMonth &&
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear();

  const isSelected = (day: number, isCurrentMonth: boolean) =>
    isCurrentMonth &&
    selected !== null &&
    day === selected.getDate() &&
    viewMonth === selected.getMonth() &&
    viewYear === selected.getFullYear();

  const handleDayClick = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    const d = new Date(viewYear, viewMonth, day, 12, 0, 0);
    onChange(d.toISOString());
    onClose();
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const handleClear = () => {
    onChange(null);
    onClose();
  };

  // Year options
  const currentYear = today.getFullYear();
  const yearOptions = Array.from({ length: 200 }, (_, i) => currentYear + 50 - i);

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className="absolute top-full left-0 z-50 mt-1 w-70 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden"
    >
      {/* Date display */}
      <div className="px-3 pt-2.5 pb-1.5 text-[0.8125rem] text-gray-300 dark:text-gray-300">
        {selected ? formatDateDisplay(selected) : "—"}
      </div>

      {/* Month/Year selectors + navigation */}
      <div className="flex items-center gap-1 px-2 pb-2">
        {/* Month dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setMonthDropOpen(!monthDropOpen); setYearDropOpen(false); }}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-300 border-none cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-w-20"
          >
            {MONTHS[viewMonth]}
            <ChevronDown className="w-3 h-3 ml-auto" />
          </button>
          {monthDropOpen && (
            <div className="absolute top-full left-0 z-50 mt-0.5 w-36 max-h-52 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-0.5">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setViewMonth(i); setMonthDropOpen(false); }}
                  className={`block w-full text-left px-2 py-1 text-xs border-none cursor-pointer transition-colors ${
                    i === viewMonth
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-100 dark:text-gray-100"
                      : "bg-transparent text-gray-400 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Year dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setYearDropOpen(!yearDropOpen); setMonthDropOpen(false); }}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-300 border-none cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-w-14"
          >
            {viewYear}
            <ChevronDown className="w-3 h-3 ml-auto" />
          </button>
          {yearDropOpen && (
            <div className="absolute top-full left-0 z-50 mt-0.5 w-24 max-h-52 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-0.5">
              {yearOptions.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => { setViewYear(y); setYearDropOpen(false); }}
                  className={`block w-full text-left px-2 py-1 text-xs border-none cursor-pointer transition-colors ${
                    y === viewYear
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-100 dark:text-gray-100"
                      : "bg-transparent text-gray-400 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Navigation arrows */}
        <button
          type="button"
          onClick={handlePrevMonth}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 bg-transparent border-none cursor-pointer text-gray-400 dark:text-gray-500 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleNextMonth}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 bg-transparent border-none cursor-pointer text-gray-400 dark:text-gray-500 transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 px-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[0.6875rem] text-gray-500 dark:text-gray-500 h-8 leading-8 font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 px-1 pb-1">
        {allDays.map((cell, idx) => {
          const sel = isSelected(cell.day, cell.currentMonth);
          const tod = isToday(cell.day, cell.currentMonth);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDayClick(cell.day, cell.currentMonth)}
              className={`h-8.5 w-8.5 mx-auto text-xs rounded-md border-none cursor-pointer transition-colors ${
                sel
                  ? "bg-blue-600 text-white font-semibold"
                  : tod
                    ? "bg-blue-600/20 text-blue-400 font-semibold"
                    : cell.currentMonth
                      ? "bg-transparent text-gray-200 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                      : "bg-transparent text-gray-600 dark:text-gray-600"
              }`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      {/* Clear button */}
      <div className="border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 bg-transparent border-none cursor-pointer transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>
    </div>
  );
};
