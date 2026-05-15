import { useMemo } from "react";
import { STATIC_NIVEAUX_ETUDES } from "../../../../data/users";

type NiveauOption = {
  id?: string | number;
  code?: string;
  label?: string;
  titre?: string;
  name?: string;
  value?: string | number;
};

function normalizeNiveauxSource(raw: unknown): NiveauOption[] {
  if (Array.isArray(raw)) return raw as NiveauOption[];
  if (raw && typeof raw === "object") {
    const maybeItems = (raw as any).items ?? (raw as any).data ?? (raw as any).results;
    if (Array.isArray(maybeItems)) return maybeItems as NiveauOption[];
  }
  return [];
}

export function useNiveauxEtudesOptions() {
  return useMemo(() => {
    const niveaux = normalizeNiveauxSource(STATIC_NIVEAUX_ETUDES);
    return niveaux
      .map((n, index) => {
        const rawValue = n.code ?? n.value ?? n.id ?? index + 1;
        const rawLabel = n.label ?? n.titre ?? n.name ?? String(rawValue);
        const value = String(rawValue || "").trim();
        const label = String(rawLabel || "").trim();
        if (!value || !label) return null;
        return { value, label };
      })
      .filter((o): o is { value: string; label: string } => Boolean(o));
  }, []);
}
