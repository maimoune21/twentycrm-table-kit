import { useState, useCallback, useEffect, useMemo } from "react";
import { useTypeContrat } from "./useTypeContrat";

const DEBOUNCE_DELAY = 300;

/**
 * Hook autocomplete pour les types de contrat
 * Filtre la liste complète des types de contrat en fonction de la requête
 */
export default function useTypeContratAutocomplete() {
  const { items: allTypeContrats, loading: initialLoading } = useTypeContrat();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(initialLoading);
  const [suggestions, setSuggestions] = useState<Array<any>>([]);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Filter typeContrats based on query
  useEffect(() => {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (!query.trim()) {
      setSuggestions(allTypeContrats);
      setLoading(false);
      return;
    }

    // Set loading state and debounce
    setLoading(true);
    const timer = setTimeout(() => {
      const filtered = allTypeContrats.filter((tc: any) =>
        (tc.name || "").toLowerCase().includes(query.toLowerCase()),
      );
      setSuggestions(filtered);
      setLoading(false);
    }, DEBOUNCE_DELAY);

    setDebounceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [query, allTypeContrats, debounceTimer]);

  return {
    query,
    setQuery,
    loading,
    suggestions,
    results: suggestions,
  };
}
