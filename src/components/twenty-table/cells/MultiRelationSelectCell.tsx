import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRecordTableContextOrThrow } from "@/components/twenty-table/contexts";
import { useFloating, offset, flip, shift } from "@floating-ui/react";
import { Search, X, Check } from "lucide-react";

// Props: recordId, fieldName, value (array of objects {id, titre/name}), options, onClose, onSearch (async), labelField
export function MultiRelationSelectCell({
  recordId,
  fieldName,
  value,
  onClose,
  options = [],
  onSearch,
  onSave,
  placeholder = "Rechercher...",
}: {
  recordId: string;
  fieldName: string;
  value: any[];
  onClose: () => void;
  options?: Array<{ value: string; label: string }>;
  onSearch?: (query: string) => Promise<Array<{ value: string; label: string }>>;
  onSave?: (ids: string[]) => Promise<void>;
  labelField?: string;
  placeholder?: string;
  title?: string;
}) {
  const { onCellChange } = useRecordTableContextOrThrow();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Track selected items as a Map of { id: label } to preserve labels during search
  const [selectedMap, setSelectedMap] = useState<Map<string, string>>(() => {
    const initial = new Map<string, string>();
    value.forEach((v) => {
      const id = String(v.id ?? v.value ?? v);
      const label = v.titre || v.name || v.label || String(v);
      if (id && id !== "undefined") initial.set(id, label);
    });
    return initial;
  });

  const [searchResults, setSearchResults] = useState(options);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    middleware: [offset(4), flip(), shift()],
  });

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle async search
  useEffect(() => {
    if (!onSearch || !searchTerm.trim()) {
      setSearchResults(options);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      setSearching(true);
      onSearch(searchTerm).then((results) => {
        setSearchResults(results);
        setSearching(false);
      });
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, onSearch, options]);

  // Merge options, search results AND currently selected items
  // This ensures selected items are ALWAYS in the displayOptions
  const displayOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();
    
    // 1. Add currently selected items first (guaranteed visibility)
    selectedMap.forEach((label, value) => {
      map.set(value, { value, label });
    });

    // 2. Add static options
    options.forEach((opt) => map.set(opt.value, opt));

    // 3. Add search results (only if they match search or if no search)
    searchResults.forEach((opt) => map.set(opt.value, opt));

    return Array.from(map.values());
  }, [options, searchResults, selectedMap]);

  // Sort: Selected items first, then by label
  const sortedOptions = useMemo(() => {
    return [...displayOptions].sort((a, b) => {
      const aSel = selectedMap.has(a.value) ? 0 : 1;
      const bSel = selectedMap.has(b.value) ? 0 : 1;
      if (aSel !== bSel) return aSel - bSel;
      return a.label.localeCompare(b.label);
    });
  }, [displayOptions, selectedMap]);

  const handleToggle = useCallback((id: string, label: string) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, label);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    const ids = Array.from(selectedMap.keys());
    if (onSave) {
      await onSave(ids);
    } else if (onCellChange) {
      onCellChange(recordId, fieldName, ids);
    }
    onClose();
  }, [onSave, onCellChange, recordId, fieldName, selectedMap, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Enter" && !searchTerm) {
        e.preventDefault();
        handleSave();
      }
      e.stopPropagation();
    },
    [onClose, handleSave, searchTerm],
  );

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const floating = refs.floating.current;
      const reference = refs.reference.current;
      if (
        floating &&
        !floating.contains(e.target as Node) &&
        reference &&
        !(reference as HTMLElement).contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, refs]);

  return (
    <div className="w-full h-full flex flex-col relative">
      <div
        ref={refs.setReference}
        className="flex items-center flex-wrap gap-1 w-full min-h-full bg-white dark:bg-gray-800 border border-primary rounded px-1.5 py-1 focus-within:ring-1 focus-within:ring-primary overflow-y-auto max-h-[120px] cursor-pointer"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Badges for selected items inside the input area */}
        {Array.from(selectedMap.entries()).map(([id, label]) => (
          <span 
            key={id} 
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 text-[10px] font-medium animate-in fade-in zoom-in duration-200"
          >
            {label}
            <button 
              onClick={(e) => { e.stopPropagation(); handleToggle(id, label); }}
              className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <X className="size-2.5" />
            </button>
          </span>
        ))}
        
        <div className="flex items-center gap-1 flex-1 min-w-[60px] text-[12px] text-gray-400 dark:text-gray-500">
          <Search className="size-3 text-gray-400 shrink-0" />
          {selectedMap.size > 0 ? "" : placeholder}
        </div>
      </div>

      <div
        ref={refs.setFloating}
        style={floatingStyles}
        className="absolute z-9999 min-w-[220px] max-w-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200"
      >
        <div className="p-1.5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
            <Search className="size-3.5 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              className="flex-1 text-[11px] bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                onPointerDown={(e) => e.stopPropagation()}
                className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="size-3 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        <div className="p-1.5 space-y-0.5">
          {searching ? (
            <div className="px-3 py-6 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
              <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Recherche...
            </div>
          ) : sortedOptions.length > 0 ? (
            <>
              {/* If searching, show header if there are selected items that don't match */}
              {searchTerm && sortedOptions.some(opt => selectedMap.has(opt.value)) && (
                <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Sélectionnés
                </div>
              )}

              {sortedOptions.map((option) => {
                const isChecked = selectedMap.has(option.value);
                // If searching, only show unselected items that match the search
                // OR show all selected items
                if (searchTerm && !isChecked && !option.label.toLowerCase().includes(searchTerm.toLowerCase())) {
                  return null;
                }

                return (
                  <button
                    key={option.value}
                    onClick={() => handleToggle(option.value, option.label)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`w-full text-left px-3 py-2 text-[12px] rounded-md flex items-center gap-2.5 cursor-pointer bg-transparent hover:bg-gray-50 transition-all ${
                      isChecked
                        ? "text-gray-700 dark:text-gray-300 font-medium"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div
                      className={`shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                        isChecked
                          ? "bg-gray-200 border-gray-200 shadow-sm"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {isChecked && <Check className="size-2.5 text-gray-400" strokeWidth={3} />}
                    </div>
                    <span className="truncate flex-1">{option.label}</span>
                  </button>
                );
              })}
            </>
          ) : searchTerm ? (
            <div className="px-3 py-8 text-center text-xs text-gray-400">Aucun résultat pour "{searchTerm}"</div>
          ) : (
            <div className="px-3 py-8 text-center text-xs text-gray-400">Aucune option disponible</div>
          )}
        </div>

        <div className="flex items-center gap-0! px-2.5 py-1.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 sticky bottom-0">
          <button
            onClick={() => setSelectedMap(new Map())}
            onPointerDown={(e) => e.stopPropagation()}
            className="px-2 text-[11px] font-medium text-gray-500 border border-gray-200 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 py-1.5 rounded-md transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Effacer tout
          </button>
          <div className="flex-1" />
          <button
            onClick={handleSave}
            onPointerDown={(e) => e.stopPropagation()}
            className="px-4 text-[11px] font-semibold py-1.5 rounded-md transition-all bg-gray-500 text-white hover:bg-gray-600 shadow-md active:scale-95"
          >
            Enregistrer ({selectedMap.size})
          </button>
        </div>
      </div>
    </div>
  );
}
