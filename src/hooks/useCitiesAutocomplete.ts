import { useEffect, useMemo, useState } from "react";

type ICitySearch = {
  id: number;
  name_fr: string | null;
  name_en: string | null;
  admin_name?: string | null;
  country_id?: number | null;
  country?: {
    id?: number;
    name?: string;
    iso_code?: string;
    flag_url?: string;
  } | null;
};

const LOCAL_CITIES: ICitySearch[] = [
  { id: 1, name_fr: "Casablanca", name_en: "Casablanca" },
  { id: 2, name_fr: "Rabat", name_en: "Rabat" },
  { id: 3, name_fr: "Marrakech", name_en: "Marrakesh" },
  { id: 4, name_fr: "Fes", name_en: "Fes" },
  { id: 5, name_fr: "Tanger", name_en: "Tangier" },
  { id: 6, name_fr: "Agadir", name_en: "Agadir" },
  { id: 7, name_fr: "Meknes", name_en: "Meknes" },
  { id: 8, name_fr: "Oujda", name_en: "Oujda" },
  { id: 9, name_fr: "Kenitra", name_en: "Kenitra" },
  { id: 10, name_fr: "Tetouan", name_en: "Tetouan" },
  { id: 11, name_fr: "Safi", name_en: "Safi" },
  { id: 12, name_fr: "Nador", name_en: "Nador" },
  { id: 13, name_fr: "El Jadida", name_en: "El Jadida" },
  { id: 14, name_fr: "Beni Mellal", name_en: "Beni Mellal" },
  { id: 15, name_fr: "Dakhla", name_en: "Dakhla" },
  { id: 16, name_fr: "Laayoune", name_en: "Laayoune" },
  { id: 17, name_fr: "Errachidia", name_en: "Errachidia" },
  { id: 18, name_fr: "Khemisset", name_en: "Khemisset" },
  { id: 19, name_fr: "Settat", name_en: "Settat" },
  { id: 20, name_fr: "Khouribga", name_en: "Khouribga" },
];

function debounce<T extends (...args: any[]) => void>(fn: T, wait = 300) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/**
 * Autocomplete hook backed by GET /cities/search?q=…
 *
 * Unlike useVillesAutocomplete, there is NO `create` — cities are reference data.
 *
 * @param options.countryId  restrict suggestions to a single country
 * @param options.limit      max results (default 10)
 * @param options.defaultOnEmpty load first page when query is empty
 * @param options.defaultLimit number of default cities to load
 * @param options.defaultPage page index for default cities
 */
export default function useCitiesAutocomplete(options?: {
  countryId?: number;
  limit?: number;
  defaultOnEmpty?: boolean;
  defaultLimit?: number;
  defaultPage?: number;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ICitySearch[]>([]);
  const [error, setError] = useState<unknown>(null);

  const countryId = options?.countryId;
  const limit = options?.limit ?? 10;
  const defaultOnEmpty = options?.defaultOnEmpty ?? false;
  const defaultLimit = options?.defaultLimit ?? 20;
  const defaultPage = options?.defaultPage ?? 1;

  const fetchSuggestions = useMemo(
    () =>
      debounce((q: string) => {
        if (!q || q.trim().length < 1) {
          if (!defaultOnEmpty) {
            setSuggestions([]);
            return;
          }

          setLoading(true);
          setError(null);
          try {
            const defaults = LOCAL_CITIES.filter(
              (city) => !countryId || city.country_id === countryId,
            ).slice(0, Math.max(1, defaultLimit));
            setSuggestions(defaults);
          } catch (err) {
            setError(err);
            setSuggestions([]);
          } finally {
            setLoading(false);
          }
          return;
        }
        setLoading(true);
        setError(null);
        try {
          const queryNorm = q.trim().toLowerCase();
          const results = LOCAL_CITIES.filter((city) => {
            if (countryId && city.country_id !== countryId) return false;
            const fr = String(city.name_fr || "").toLowerCase();
            const en = String(city.name_en || "").toLowerCase();
            return fr.includes(queryNorm) || en.includes(queryNorm);
          }).slice(0, Math.max(1, limit));
          setSuggestions(results);
        } catch (err) {
          setError(err);
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, 300),
    [countryId, limit, defaultOnEmpty, defaultLimit, defaultPage],
  );

  useEffect(() => {
    fetchSuggestions(query);
  }, [query, fetchSuggestions]);

  return {
    query,
    setQuery,
    loading,
    results: suggestions,
    suggestions,
    error,
  } as const;
}
