import { useState, useCallback, useEffect, useMemo } from "react";
import { useTypeStage } from "./useTypeStage";

const DEBOUNCE_DELAY = 300;

/**
 * Hook autocomplete pour les types de stage
 * Filtre la liste complète des types de stage en fonction de la requête
 */
export default function useTypeStageAutocomplete() {
  const { typeStages: allTypeStages, isLoading: initialLoading } = useTypeStage();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(initialLoading);
  const [suggestions, setSuggestions] = useState<Array<any>>([]);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Filter typeStages based on query
  useEffect(() => {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (!query.trim()) {
      setSuggestions(allTypeStages);
      setLoading(false);
      return;
    }

    // Set loading state and debounce
    setLoading(true);
    const timer = setTimeout(() => {
      const filtered = allTypeStages.filter((ts: any) =>
        (ts.name || "").toLowerCase().includes(query.toLowerCase()),
      );
      setSuggestions(filtered);
      setLoading(false);
    }, DEBOUNCE_DELAY);

    setDebounceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [query, allTypeStages, debounceTimer]);

  return {
    query,
    setQuery,
    loading,
    suggestions,
    results: suggestions,
  };
}
