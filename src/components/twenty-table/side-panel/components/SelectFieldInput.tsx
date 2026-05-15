import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Search, Check } from "lucide-react";

// ═══════════════════════════════════════════════════════
// Twenty-style Tag Color System
// Maps color names → Tailwind-compatible bg/text classes
// Based on Twenty's TAG_LIGHT (Radix shade 3 bg, shade 11 text)
// ═══════════════════════════════════════════════════════

type TagColorConfig = { bg: string; text: string };

const TAG_COLORS: Record<string, TagColorConfig> = {
  green:     { bg: "bg-green-100 dark:bg-green-900/30",       text: "text-green-700 dark:text-green-400" },
  turquoise: { bg: "bg-teal-100 dark:bg-teal-900/30",         text: "text-teal-700 dark:text-teal-400" },
  sky:       { bg: "bg-sky-100 dark:bg-sky-900/30",           text: "text-sky-700 dark:text-sky-400" },
  blue:      { bg: "bg-blue-100 dark:bg-blue-900/30",         text: "text-blue-700 dark:text-blue-400" },
  purple:    { bg: "bg-purple-100 dark:bg-purple-900/30",     text: "text-purple-700 dark:text-purple-400" },
  pink:      { bg: "bg-pink-100 dark:bg-pink-900/30",         text: "text-pink-700 dark:text-pink-400" },
  red:       { bg: "bg-red-100 dark:bg-red-900/30",           text: "text-red-700 dark:text-red-400" },
  orange:    { bg: "bg-orange-100 dark:bg-orange-900/30",     text: "text-orange-700 dark:text-orange-400" },
  yellow:    { bg: "bg-yellow-100 dark:bg-yellow-900/30",     text: "text-yellow-700 dark:text-yellow-400" },
  gray:      { bg: "bg-gray-100 dark:bg-gray-800",            text: "text-gray-600 dark:text-gray-400" },
  lime:      { bg: "bg-lime-100 dark:bg-lime-900/30",         text: "text-lime-700 dark:text-lime-400" },
  cyan:      { bg: "bg-cyan-100 dark:bg-cyan-900/30",         text: "text-cyan-700 dark:text-cyan-400" },
  violet:    { bg: "bg-violet-100 dark:bg-violet-900/30",     text: "text-violet-700 dark:text-violet-400" },
  amber:     { bg: "bg-amber-100 dark:bg-amber-900/30",       text: "text-amber-700 dark:text-amber-400" },
  rose:      { bg: "bg-rose-100 dark:bg-rose-900/30",         text: "text-rose-700 dark:text-rose-400" },
  indigo:    { bg: "bg-indigo-100 dark:bg-indigo-900/30",     text: "text-indigo-700 dark:text-indigo-400" },
  emerald:   { bg: "bg-emerald-100 dark:bg-emerald-900/30",   text: "text-emerald-700 dark:text-emerald-400" },
  fuchsia:   { bg: "bg-fuchsia-100 dark:bg-fuchsia-900/30",   text: "text-fuchsia-700 dark:text-fuchsia-400" },
  teal:      { bg: "bg-teal-100 dark:bg-teal-900/30",         text: "text-teal-700 dark:text-teal-400" },
};

const DEFAULT_TAG_COLOR: TagColorConfig = TAG_COLORS.gray;

function getTagColor(color?: string): TagColorConfig {
  if (!color) return DEFAULT_TAG_COLOR;
  return TAG_COLORS[color.toLowerCase()] ?? DEFAULT_TAG_COLOR;
}

// ═══════════════════════════════════════════════════════
// Tag — Twenty-style colored pill
// ═══════════════════════════════════════════════════════

export type TagProps = {
  label: string;
  color?: string;
  className?: string;
  variant?: "pill" | "textDot" | "pillDot";
};

export const Tag = ({
  label,
  color,
  className = "",
  variant = "pill",
}: TagProps) => {
  const c = getTagColor(color);

  if (variant === "textDot") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 max-w-full text-xs font-medium truncate ${c.text} ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
        <span className="truncate text-[9px]">{label}</span>
      </span>
    );
  }

  if (variant === "pillDot") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 max-w-full h-5 px-1.5 rounded-sm text-xs font-medium truncate ${c.bg} ${c.text} ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
        <span className="truncate text-[9px]">{label}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center max-w-full h-5 px-1.5 rounded-sm text-[11px] font-medium truncate bg-gray-50! border border-gray-100 ${c.text} ${className}`}
    >
      {label}
    </span>
  );
};

// ═══════════════════════════════════════════════════════
// MenuItemSelectTag — Tag row with checkmark
// ═══════════════════════════════════════════════════════

const MenuItemSelectTag = ({
  label,
  color,
  selected,
  onClick,
}: {
  label: string;
  color?: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-2 w-full px-2 py-1.5 text-left border-none cursor-pointer transition-colors rounded-sm ${
      selected
        ? "bg-gray-100 dark:bg-gray-800"
        : "bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50"
    }`}
  >
    <div className="shrink-0 w-4 h-4 flex items-center justify-center">
      {selected && (
        <Check className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
      )}
    </div>
    <Tag label={label} color={color} />
  </button>
);

// ═══════════════════════════════════════════════════════
// SelectFieldInput — Twenty-style dropdown with search
// ═══════════════════════════════════════════════════════

type SelectOption = {
  label: string;
  value: string;
  color?: string;
};

type SelectFieldInputProps = {
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  onClose: () => void;
};

export const SelectFieldInput = ({
  options,
  value,
  onChange,
  onClose,
}: SelectFieldInputProps) => {
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Click outside → close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Keyboard nav
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    },
    [onClose],
  );

  // Filtered + selected-first ordering (like Twenty)
  const filteredOptions = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = q
      ? options.filter((o) => o.label.toLowerCase().includes(q))
      : options;

    // selected option first
    return [...filtered].sort((a, b) => {
      if (a.value === value && b.value !== value) return -1;
      if (b.value === value && a.value !== value) return 1;
      return 0;
    });
  }, [options, search, value]);

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className="absolute top-full left-0 z-50 mt-1 w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden"
    >
      {/* Search */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-gray-100 dark:border-gray-800">
        <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher..."
          autoComplete="off"
          className="flex-1 bg-transparent border-none outline-none text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 min-w-0"
        />
      </div>

      {/* Options list */}
      <div className="max-h-48 overflow-y-auto py-0.5">
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 text-center">
            {search ? "Aucun résultat trouvé" : "Aucune option disponible"}
          </div>
        ) : (
          filteredOptions.map((opt) => (
            <MenuItemSelectTag
              key={opt.value}
              label={opt.label}
              color={opt.color}
              selected={opt.value === value}
              onClick={() => {
                onChange(opt.value);
                onClose();
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};
