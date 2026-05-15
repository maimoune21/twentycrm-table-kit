import { useCallback, useMemo } from "react";
import {
  STATIC_METIERS,
  STATIC_TYPE_CONTRATS,
  STATIC_TYPE_STAGES,
} from "../../../../data/users";

export function useTypeContratOptions() {
  return useMemo(
    () => STATIC_TYPE_CONTRATS.map((tc) => ({ value: String(tc.id), label: tc.name })),
    [],
  );
}

export function useTypeStageOptions() {
  return useMemo(
    () => STATIC_TYPE_STAGES.map((ts) => ({ value: String(ts.id), label: ts.name })),
    [],
  );
}

export function useMetierSearch() {
  return useCallback(async (query: string) => {
    const normalizedQuery = String(query || "").trim().toLowerCase();
    const mapMetiers = (items: Array<{ id: number; titre: string | null }>) =>
      items
        .map((m) => ({
          value: String(m.id),
          label: String(m.titre || "").trim(),
        }))
        .filter((m) => m.value && m.label);

    if (!normalizedQuery) return mapMetiers(STATIC_METIERS);
    return mapMetiers(
      STATIC_METIERS.filter((m) =>
        String(m.titre || "").toLowerCase().includes(normalizedQuery),
      ),
    );
  }, []);
}
