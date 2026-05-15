/**
 * RelationSelectCell — Édition de cellule avec autocomplete pour relations (Entreprise, Ville)
 * Inspiré du pattern Twenty avec SingleRecordPicker
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRecordTableContextOrThrow } from "@/components/twenty-table/contexts";
import { useFloating, offset, flip, shift } from "@floating-ui/react";
import { Search, X, Trash } from "lucide-react";

// Hooks d'autocomplete (depuis ton projet)
import useEntreprisesAutocomplete from "@/hooks/useEntreprisesAutocomplete";
import useCitiesAutocomplete from "@/hooks/useCitiesAutocomplete";
import { useEcoleAutocomplete } from "@/hooks/useEcoleAutocomplete";


type RelationSelectCellProps = {
  recordId: string;
  fieldName: string; // "entreprise" | "ville" | "nomEcole"
  value: string; // Nom de l'entité affichée
  currentValueId?: string | number; // ID actuel pour ne pas re-fetch
  isEditMode: boolean;
  onClose: () => void;
};

export const RelationSelectCell = ({
  recordId,
  fieldName,
  value,
  currentValueId,
  isEditMode,
  onClose,
}: RelationSelectCellProps) => {
  const { onCellChange } = useRecordTableContextOrThrow();
  // Sélectionner le bon type de relation
  const isEntreprise = fieldName === "entreprise";
  const isEcole = fieldName === "nomEcole" || fieldName === "ecole";
  const isVille = fieldName === "ville";

  // Pour ville/école: l'input est dans le dropdown (pas dans la cellule)
  const [searchTerm, setSearchTerm] = useState(
    isVille || isEcole ? "" : value || "",
  );
  const [selectedId, setSelectedId] = useState<string | number | null>(
    currentValueId || null,
  );
  const hasInitializedSearchRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    middleware: [offset(4), flip(), shift()],
  });

  const entreprisesHook = useEntreprisesAutocomplete();
  const citiesHook = useCitiesAutocomplete({
    limit: 20,
    defaultOnEmpty: isVille,
    defaultLimit: 20,
    defaultPage: 1,
  });
  const ecoleHook = useEcoleAutocomplete({
    limit: 20,
    minLength: 1,
    defaultOnEmpty: isEcole,
    defaultLimit: 20,
    defaultPage: 1,
  });

  const getAutocompleteData = () => {
    if (isEntreprise) return { results: entreprisesHook.results, setQuery: entreprisesHook.setQuery, setSelected: (entreprisesHook as any).setSelected };
    if (isEcole) return { results: ecoleHook.suggestions, setQuery: ecoleHook.searchEcoles, setSelected: undefined };
    return { results: citiesHook.suggestions, setQuery: citiesHook.setQuery, setSelected: undefined };
  };

  const { results: autocompleteResults, setQuery: setAutocompleteQuery, setSelected } = getAutocompleteData();

  // Normaliser les résultats
  const normalizedResults = useMemo(() => {
    if (!autocompleteResults) return [];
    return autocompleteResults.map((result: any) => ({
      id: result.id || result.value,
      label: result.abreviation || result.label || result.nom || result.name_fr || result.name_en || result.name || result.titre || "",
      nom: result.nom || result.name_fr || result.name_en || result.name || result.titre,
      logo_url: isEntreprise || isEcole ? result.logo_url : undefined,
      flag_url: isVille ? result.country?.flag_url : undefined,
      country_name: isVille ? result.country?.name : undefined,
    }));
  }, [autocompleteResults, isEntreprise, isEcole, isVille]);

  // Lancer la recherche initiale avec la valeur existante + focus
  useEffect(() => {
    if (!isEditMode) {
      hasInitializedSearchRef.current = false;
      return;
    }

    if (inputRef.current) {
      inputRef.current.focus();
    }

    // Évite de relancer la query initiale en boucle sur re-render
    if (hasInitializedSearchRef.current) return;

    // Ville/École: charger les 20 résultats par défaut (pagination)
    if (isVille || isEcole) {
      setAutocompleteQuery("");
    } else if (value) {
      // Déclencher la recherche autocomplete si une valeur existe déjà
      setAutocompleteQuery(value);
    }
    hasInitializedSearchRef.current = true;
  }, [isEditMode, isVille, isEcole, value, setAutocompleteQuery]);

  const handleSearch = useCallback(
    (term: string) => {
      setSearchTerm(term);
      setAutocompleteQuery(term);
    },
    [setAutocompleteQuery],
  );

  const handleSelect = useCallback(
    (result: any, e?: React.MouseEvent) => {
      e?.stopPropagation();
      const resultId = result.id || result.value;
      const resultLabel = result.label || result.nom || result.name;

      setSelectedId(resultId);
      setSearchTerm(resultLabel);
      if (setSelected) {
        setSelected(result);
      }

      // Fire the change, then close with a microtask to avoid re-render issues
      if (onCellChange) {
        onCellChange(recordId, fieldName, {
          id: resultId,
          label: resultLabel,
          flag_url: result.flag_url,
          country: result.flag_url ? { flag_url: result.flag_url, name: result.country_name } : undefined,
        });
      }

      // Use setTimeout to ensure close happens after React processes the change
      setTimeout(() => {
        onClose();
      }, 0);
    },
    [recordId, fieldName, onCellChange, setSelected, onClose],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSearchTerm("");
      setSelectedId(null);
      setAutocompleteQuery("");

      // Close first, then fire the change
      onClose();

      if (onCellChange) {
        onCellChange(recordId, fieldName, { id: null, label: "" });
      }
    },
    [recordId, fieldName, onCellChange, setAutocompleteQuery, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSearchTerm(isVille || isEcole ? "" : value);
        onClose();
      }
      e.stopPropagation();
    },
    [value, onClose, isVille, isEcole],
  );

  // Fermer le dropdown si on clique dehors
  useEffect(() => {
    if (!isEditMode) return;

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
  }, [isEditMode, onClose, refs]);

  if (!isEditMode) {
    return (
      <div className="truncate pl-2 text-[0.8125rem] h-5 flex items-center text-gray-900 dark:text-gray-100 overflow-hidden text-ellipsis whitespace-nowrap">
        {value || "—"}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Trigger */}
      {isVille || isEcole ? (
        <div
          ref={refs.setReference}
          className="flex items-center gap-1.5 w-full h-full bg-white dark:bg-gray-800 border border-gray-100 rounded-lg px-2.5 py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Search className="size-3.5 text-gray-400 shrink-0" />
          <span className="flex-1 text-[11px] text-gray-900 dark:text-gray-100 truncate">
            {value || (isEcole ? "Choisir une école..." : "Choisir une ville...")}
          </span>
          {value && (
            <button
              onClick={handleClear}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="size-3 text-gray-400" />
            </button>
          )}
        </div>
      ) : (
        <div
          ref={refs.setReference}
          className="flex items-center gap-1.5 w-full h-full bg-white dark:bg-gray-800 border border-gray-100 rounded-lg px-2.5 py-1 focus-within:ring-2 focus-within:ring-gray-100/30 transition-shadow"
        >
          <Search className="size-3.5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder={`Chercher ${fieldName}...`}
            className="flex-1 text-[11px] bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
          {searchTerm && (
            <button
              onClick={handleClear}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="size-3 text-gray-400" />
            </button>
          )}
        </div>
      )}

      {/* Dropdown avec résultats — positioned via floating-ui */}
      {isEditMode && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className="absolute z-9999 min-w-60 max-w-xs bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-2xl shadow-black/12 dark:shadow-black/40 max-h-72 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-sm"
        >
          {(isVille || isEcole) && (
            <div className="p-1.5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-1.5 w-full bg-white dark:bg-gray-800 border border-gray-100 rounded-lg px-2.5 py-1 focus-within:ring-2 focus-within:ring-gray-100/30 transition-shadow">
                <Search className="size-3.5 text-gray-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={isEcole ? "Chercher école..." : "Chercher ville..."}
                  className="flex-1 text-[11px] bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                />
                {searchTerm && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSearch("");
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <X className="size-3 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="overflow-y-auto max-h-48">
            {/* Résultats */}
            {normalizedResults && normalizedResults.length > 0 ? (
              normalizedResults.map((result: any, idx: number) => {
                const isSelected = String(selectedId) === String(result.id);
                return (
                  <button
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); handleSelect(result); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`
                      w-full text-left p-2 text-[12px] flex items-center gap-1.5 cursor-pointer
                      transition-all duration-150 rounded-lg
                      ${isSelected
                        ? "bg-gray-50/80 dark:bg-gray-950/40 ring-1 ring-inset ring-gray-200/50 dark:ring-gray-700/40"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
                      }
                    `}
                  >
                    {/* Logo, Flag ou Avatar */}
                    {(isEntreprise || isEcole) && result.logo_url ? (
                      <img
                        src={result.logo_url}
                        alt={result.label}
                        className="w-5 h-5 rounded-sm object-cover shrink-0 ring-1 ring-gray-200/80 dark:ring-gray-600/50 shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : result.flag_url ? (
                      <img
                        src={result.flag_url}
                        alt={result.country_name || ""}
                        className="w-3.5 h-2.5 rounded object-cover shrink-0 ring-1 ring-gray-200/80 dark:ring-gray-600/50 shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className={`
                        w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0
                        ring-1 ring-inset
                        ${isSelected
                          ? "bg-gray-100 dark:bg-gray-900/50 text-gray-600 dark:text-gray-300 ring-gray-200/60 dark:ring-gray-700/40"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 ring-gray-200/60 dark:ring-gray-700/40"
                        }
                        transition-colors
                      `}>
                        {result.label?.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                    <span className={`truncate text-[11px] flex-1 ${isSelected ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}>
                      {result.label}
                    </span>
                    {isSelected && (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-900/40 shrink-0 animate-in zoom-in-75 duration-200">
                        <svg className="w-3 h-3 text-gray-600 dark:text-gray-400" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })
            ) : searchTerm ? (
              <>
                {/* Message aucun résultat */}
                <div className="px-3 py-4 text-center">
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    Aucun résultat pour "<span className="font-medium text-gray-500 dark:text-gray-400">{searchTerm.trim()}</span>"
                  </div>
                </div>


              </>
            ) : (
              <div className="flex p-2 gap-1.5 items-center">
                <Search className="size-3 text-gray-300 dark:text-gray-600" />
                <span className="text-[11px] text-gray-400 dark:text-gray-500">Tape pour chercher...</span>
              </div>
            )}
          </div>

          {/* Sticky "Retirer" button at the bottom */}
          <div className="border-t border-gray-100 dark:border-gray-800 p-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(null);
                setSearchTerm("");
                setAutocompleteQuery("");
                onClose();
                if (onCellChange) {
                  onCellChange(recordId, fieldName, { id: null, label: "" });
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="inline-flex w-full items-center justify-center gap-1.5 cursor-pointer rounded-sm border border-input hover:bg-muted bg-gray-100/70 px-2 py-1.5 text-[11px] font-medium hover:text-gray-600 dark:text-gray-400 shadow-xs transition-colors text-gray-500 dark:hover:text-gray-300 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              <Trash className="size-3 mb-0.5" />
              Retirer
              {/* Retirer {fieldName === "entreprise" ? "l'entreprise" : isEcole ? "l'école" : "la ville"} */}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
