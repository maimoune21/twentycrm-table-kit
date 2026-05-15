import { useCallback, useEffect, useRef, useState } from "react";

export interface IEntreprise {
  id?: string | number;
  value?: string | number;
  nom?: string;
  label?: string;
  name?: string;
  description?: string;
  statut?: string;
  pays?: string;
  taille_de_entreprise?: string;
  chiffre_affaires?: string | number;
  type_entreprise?: string;
  annee_creation?: string | number;
  offres_count?: string | number;
  website?: string;
  linkedin?: string;
  facebook?: string;
  politique_teletravail?: string;
  partenaire?: boolean;
  logo_url?: string;
  logoMedia?: { url?: string };
  ville?: { ville_name?: string };
  secteurs?: Array<{ id: string | number; nom: string }>;
}

export interface UseEntreprisesAutocompleteOptions {
  limit?: number;
  debounceMs?: number;
}

/**
 * Autocomplete hook for entreprises.
 * - Debounces input (default 300ms)
 * - Caches query results in-memory for the session
 */
export function useEntreprisesAutocomplete(
  initialQuery = "",
  options?: UseEntreprisesAutocompleteOptions
) {
  const { limit = 10, debounceMs = 300 } = options || {};

  const [query, setQuery] = useState<string>(initialQuery);
  const [results, setResults] = useState<IEntreprise[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [selected, setSelected] = useState<IEntreprise | null>(null);

  const mountedRef = useRef(true);
  const debounceRef = useRef<number | undefined>(undefined);
  const cacheRef = useRef<Map<string, IEntreprise[]>>(new Map());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const doFetch = useCallback(
    async (q: string) => {
      const key = `${q}::${limit}`;
      try {
        setError(null);

        const cached = cacheRef.current.get(key);
        if (cached) {
          setResults(cached);
          setLoading(false);
          return;
        }

        const safe: IEntreprise[] = [];
        cacheRef.current.set(key, safe);
        if (!mountedRef.current) return;
        setResults(safe);
      } catch (err: any) {
        if (!mountedRef.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setResults([]);
      } finally {
        if (!mountedRef.current) return;
        setLoading(false);
      }
    },
    [limit]
  );

  useEffect(() => {
    if (!query) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(
      () => doFetch(query),
      debounceMs
    ) as unknown as number;

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, debounceMs, doFetch]);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    setSelected(null);
    setLoading(false);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    selected,
    setSelected,
    clear,
  } as const;
}

export default useEntreprisesAutocomplete;
