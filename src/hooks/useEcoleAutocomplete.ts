import { useCallback, useEffect, useState } from "react";
import { searchEcolesByName, type IEcole } from "@/hooks/ecoleFallback";

type UseEcoleAutocompleteOptions = {
  limit?: number;
  minLength?: number;
  defaultOnEmpty?: boolean;
  defaultLimit?: number;
  defaultPage?: number;
};

export function useEcoleAutocomplete(options?: UseEcoleAutocompleteOptions) {
  const limit = options?.limit ?? 20;
  const minLength = options?.minLength ?? 1;
  const defaultOnEmpty = options?.defaultOnEmpty ?? false;

  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<IEcole[]>([]);
  const [query, setQuery] = useState("");

  const searchEcoles = useCallback(
    async (term: string) => {
      const trimmed = term.trim();
      setQuery(term);

      if (!trimmed && !defaultOnEmpty) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      if (trimmed.length > 0 && trimmed.length < minLength) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await searchEcolesByName(trimmed, { limit, page: 1 });
        setSuggestions(Array.isArray(res?.data) ? res.data : []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [defaultOnEmpty, limit, minLength],
  );

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setQuery("");
    setLoading(false);
  }, []);

  useEffect(() => {
    if (defaultOnEmpty) {
      searchEcoles("");
    }
  }, [defaultOnEmpty, searchEcoles]);

  return { suggestions, loading, query, searchEcoles, clearSuggestions };
}
