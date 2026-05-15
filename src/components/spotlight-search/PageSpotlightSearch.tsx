/**
 * PageSpotlightSearch — Page-specific search modal with glassmorphism.
 *
 * Reusable across entreprises, candidats, recruteurs pages.
 * Filters the current table by name in real-time via jotai atoms.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSetAtom } from "jotai";
import {
  activeFiltersAtom,
  type ActiveFilter,
} from "@/components/twenty-table/toolbar/states/toolbarState";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Search,
  CornerDownLeft,
  ArrowUpDown,
} from "lucide-react";
// import { SpotlightTour } from "./SpotlightTour";

// ── Config per entity type ──

export type PageSearchEntityType = "entreprise" | "candidat" | "recruteur";

export type PageSearchConfig = {
  entityType: PageSearchEntityType;
  /** Label shown in the search header */
  label: string;
  /** Placeholder for the input */
  placeholder: string;
  /** API search function:  (query, limit) => Promise<any[]> */
  searchFn: (query: string, limit: number) => Promise<any[]>;
  /** Map an API result to a display item */
  mapResult: (item: any) => { id: string; title: string; subtitle?: string; imageUrl?: string };
  /** Jotai filter config */
  filterFieldName: string;
  filterLabel: string;
  /** Accent color (tailwind color name without prefix, e.g. "blue", "emerald", "violet") */
  color: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: PageSearchConfig;
};

// ── Color mapping ──

const colorMap: Record<string, { bg: string; text: string; ring: string; icon: string; glow: string }> = {
  blue: {
    bg: "from-blue-500 to-indigo-600",
    text: "text-blue-500",
    ring: "ring-blue-500/20",
    icon: "bg-blue-500/10",
    glow: "via-blue-500/30",
  },
  emerald: {
    bg: "from-emerald-400 to-teal-500",
    text: "text-emerald-500",
    ring: "ring-emerald-500/20",
    icon: "bg-emerald-500/10",
    glow: "via-emerald-500/30",
  },
  violet: {
    bg: "from-violet-400 to-purple-600",
    text: "text-violet-500",
    ring: "ring-violet-500/20",
    icon: "bg-violet-500/10",
    glow: "via-violet-500/30",
  },
};

export function PageSpotlightSearch({ open, onOpenChange, config }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; title: string; subtitle?: string; imageUrl?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  // const [tourOpen, setTourOpen] = useState(false);
  const setFilters = useSetAtom(activeFiltersAtom);
  const navigate = useNavigate();
  const location = useLocation();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const colors = colorMap[config.color] ?? colorMap.blue;
  const isRound = config.entityType !== "entreprise";

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setLoading(false);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const raw = await config.searchFn(trimmed, 8);
        setResults(raw.map(config.mapResult));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, config]);

  const handleSelect = useCallback(
    (item: { id: string; title: string }) => {
      const filter: ActiveFilter[] = [
        {
          id: `page-search-${Date.now()}`,
          label: config.filterLabel,
          type: "TEXT",
          fieldName: config.filterFieldName,
          operator: "contains",
          value: item.title,
        },
      ];
      // Update URL with page=1 + encoded filters to trigger proper data refetch
      const param = btoa(encodeURIComponent(JSON.stringify(filter)));
      navigate(`${location.pathname}?page=1&filters=${param}`);
      // Also set atom directly for immediate reactivity
      setFilters(filter);
      onOpenChange(false);
    },
    [config.filterFieldName, config.filterLabel, setFilters, onOpenChange, navigate, location.pathname],
  );

  // Apply raw query text as filter (when user presses Enter without selecting)
  const applyRawQuery = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    const filter: ActiveFilter[] = [
      {
        id: `page-search-${Date.now()}`,
        label: config.filterLabel,
        type: "TEXT",
        fieldName: config.filterFieldName,
        operator: "contains",
        value: trimmed,
      },
    ];
    const param = btoa(encodeURIComponent(JSON.stringify(filter)));
    navigate(`${location.pathname}?page=1&filters=${param}`);
    setFilters(filter);
    onOpenChange(false);
  }, [query, config.filterFieldName, config.filterLabel, setFilters, onOpenChange, navigate, location.pathname]);

  const handleClear = useCallback(() => {
    navigate(`${location.pathname}?page=1`);
    setFilters([]);
    onOpenChange(false);
  }, [setFilters, onOpenChange, navigate, location.pathname]);

  const trimmed = query.trim();

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>      <DialogContent
        className="spotlight-overlay overflow-hidden p-0 border-0 rounded-[20px] max-w-[520px] top-[18%] translate-y-0"
        style={{ background: "transparent", boxShadow: "none" }}
      >
        <DialogTitle className="hidden">Recherche {config.label}</DialogTitle>

        <div
          className="spotlight-glass spotlight-glow-border rounded-[20px] overflow-hidden"
          style={{ animation: "spotlight-float-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          <Command
            className="rounded-[20px] bg-transparent"
            shouldFilter={false}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results.length === 0 && !loading) {
                e.preventDefault();
                applyRawQuery();
              }
            }}
          >

            {/* Header badge */}
            <div className="flex items-center gap-2 px-5 pt-3 pb-0">
              <div className={`w-5 h-5 rounded-md ${colors.icon} flex items-center justify-center`}>
                <Search className={`w-3 h-3 ${colors.text}`} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400/70 dark:text-gray-500/70">
                Rechercher — {config.label}
              </span>
              {results.length > 0 && (
                <span className={`text-[10px] font-bold ${colors.text} opacity-60 tabular-nums`}>
                  {results.length}
                </span>
              )}
            </div>

            {/* Search input */}
            <div className="relative flex items-center gap-3 px-5">
              <div className="absolute inset-x-5 bottom-0 h-px bg-linear-to-r from-transparent via-gray-200/60 dark:via-gray-700/40 to-transparent" />

              <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                {loading ? (
                  <div className="relative w-5 h-5">
                    <div className={`absolute inset-0 rounded-full border-2 ${colors.text} opacity-20`} />
                    <div className={`absolute inset-0 rounded-full border-2 border-transparent border-t-current ${colors.text} animate-spin`} />
                  </div>
                ) : (
                  <Search className="w-[18px] h-[18px] text-gray-400/80 dark:text-gray-500" />
                )}
              </div>

              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder={config.placeholder}
                className="spotlight-input-shimmer h-12 text-[15px] font-medium border-none! ring-0! shadow-none! outline-none! bg-transparent! placeholder:font-normal"
              />
            </div>

            {/* Results */}
            <CommandList className="spotlight-scrollbar max-h-[min(340px,50vh)] overflow-y-auto overscroll-contain scroll-smooth px-2.5 py-2">

              {/* Skeleton loading */}
              {loading && results.length === 0 && (
                <div className="space-y-1.5 p-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
                      style={{ animation: `spotlight-item-in 0.3s ${i * 60}ms cubic-bezier(0.16, 1, 0.3, 1) both` }}
                    >
                      <div className="w-9 h-9 rounded-xl bg-linear-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-800/50 animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-28 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
                        <div className="h-2.5 w-40 bg-gray-50 dark:bg-gray-800/40 rounded-full animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty — apply raw text */}
              {!loading && trimmed.length >= 2 && results.length === 0 && (
                <CommandGroup>
                  <CommandItem
                    value="apply-raw-query"
                    onSelect={applyRawQuery}
                    className="spotlight-glass-card group flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer mb-1"
                    style={{ animation: "spotlight-item-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both" }}
                  >
                    <div className={`w-9 h-9 rounded-xl ${colors.icon} flex items-center justify-center shrink-0`}>
                      <Search className={`w-4 h-4 ${colors.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-gray-700 dark:text-gray-200">
                        Filtrer par <span className={`font-semibold ${colors.text}`}>&quot;{trimmed}&quot;</span>
                      </div>
                      <div className="text-[11px] text-gray-400 dark:text-gray-500">
                        Appliquer comme filtre de recherche
                      </div>
                    </div>
                    <div className={`shrink-0 w-6 h-6 rounded-lg ${colors.icon} flex items-center justify-center opacity-0 group-hover:opacity-100 group-data-[selected=true]:opacity-100 transition-all duration-150`}>
                      <CornerDownLeft className={`w-3 h-3 ${colors.text}`} />
                    </div>
                  </CommandItem>
                </CommandGroup>
              )}

              {/* Results list */}
              {results.length > 0 && (
                <CommandGroup>
                  {/* First option: apply raw text */}
                  <CommandItem
                    value="apply-raw-query"
                    onSelect={applyRawQuery}
                    className="spotlight-glass-card group flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer mb-1"
                    style={{ animation: "spotlight-item-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both" }}
                  >
                    <div className={`w-9 h-9 rounded-xl ${colors.icon} flex items-center justify-center shrink-0`}>
                      <Search className={`w-4 h-4 ${colors.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-gray-700 dark:text-gray-200">
                        Filtrer par <span className={`font-semibold ${colors.text}`}>&quot;{trimmed}&quot;</span>
                      </div>
                    </div>
                    <div className={`shrink-0 w-6 h-6 rounded-lg ${colors.icon} flex items-center justify-center opacity-0 group-hover:opacity-100 group-data-[selected=true]:opacity-100 transition-all duration-150`}>
                      <CornerDownLeft className={`w-3 h-3 ${colors.text}`} />
                    </div>
                  </CommandItem>
                  {/* Separator */}
                  <div className="mx-3 my-1.5 h-px bg-gray-200/40 dark:bg-gray-700/30" />
                  {results.map((item, i) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => handleSelect(item)}
                      className="spotlight-glass-card group flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer mb-1"
                      style={{ animation: `spotlight-item-in 0.25s ${i * 35}ms cubic-bezier(0.16, 1, 0.3, 1) both` }}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className={`w-9 h-9 ${isRound ? "rounded-full" : "rounded-xl"} object-cover ${isRound ? "ring-2 ring-white/80 dark:ring-gray-800/80 shadow-md" : "bg-white dark:bg-gray-800 ring-1 ring-black/5 dark:ring-white/5 p-0.5"} shrink-0`}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling && ((e.target as HTMLImageElement).nextElementSibling as HTMLElement).style.removeProperty("display"); }}
                        />
                      ) : null}
                      <div className={`w-9 h-9 ${isRound ? "rounded-full" : "rounded-xl"} bg-linear-to-br ${colors.bg} flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-lg shadow-black/10`} style={item.imageUrl ? { display: "none" } : undefined}>
                        {item.title.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 truncate">
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                      <div className={`shrink-0 w-6 h-6 rounded-lg ${colors.icon} flex items-center justify-center opacity-0 group-hover:opacity-100 group-data-[selected=true]:opacity-100 transition-all duration-150 scale-90 group-hover:scale-100 group-data-[selected=true]:scale-100`}>
                        <CornerDownLeft className={`w-3 h-3 ${colors.text}`} />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Clear filter action */}
              {trimmed.length < 2 && (
                <CommandGroup>
                  <CommandItem
                    value="clear-filter"
                    onSelect={handleClear}
                    className="spotlight-glass-card group flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer mb-1"
                    style={{ animation: "spotlight-item-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both" }}
                  >
                    <div className="w-9 h-9 rounded-xl bg-linear-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-400">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-gray-600 dark:text-gray-300">
                        Effacer le filtre
                      </div>
                      <div className="text-[11px] text-gray-400 dark:text-gray-500">
                        Réinitialiser la recherche par nom
                      </div>
                    </div>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>

            {/* Footer */}
            <div className="relative flex items-center justify-between px-5 py-2">
              <div className="absolute inset-x-5 top-0 h-px bg-linear-to-r from-transparent via-gray-200/50 dark:via-gray-700/30 to-transparent" />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400/70 dark:text-gray-500/60">
                  <kbd className="spotlight-kbd inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-md text-[9px] font-mono">
                    <ArrowUpDown className="w-2.5 h-2.5" />
                  </kbd>
                  <span className="font-medium">naviguer</span>
                </div>
                <div className="w-px h-3 bg-gray-200/40 dark:bg-gray-700/30" />
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400/70 dark:text-gray-500/60">
                  <kbd className="spotlight-kbd inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-md text-[9px] font-mono">
                    <CornerDownLeft className="w-2.5 h-2.5" />
                  </kbd>
                  <span className="font-medium">filtrer</span>
                </div>
                <div className="w-px h-3 bg-gray-200/40 dark:bg-gray-700/30" />
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400/70 dark:text-gray-500/60">
                  <kbd className="spotlight-kbd inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-md text-[9px] font-mono">esc</kbd>
                  <span className="font-medium">fermer</span>
                </div>
              </div>
              {/* <button
                onClick={() => { onOpenChange(false); setTourOpen(true); }}
                className={`w-5 h-5 rounded-md flex items-center justify-center text-gray-400/60 hover:${colors.text} hover:${colors.icon} transition-colors`}
                title="Guide Spotlight"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button> */}
            </div>
          </Command>
        </div>
      </DialogContent>
    </Dialog>

    {/* <SpotlightTour open={tourOpen} onOpenChange={setTourOpen} /> */}
    </>
  );
}
