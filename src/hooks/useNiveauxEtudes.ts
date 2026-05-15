import { useState, useEffect, useMemo } from "react";
import { STATIC_NIVEAUX_ETUDES } from "@/data/users";

type NiveauEtudes = {
  id: string | number;
  code?: string;
  label: string;
};

export const useNiveauxEtudesOptions = (): { label: string; value: string; color?: string }[] => {
  const { niveauxEtudes } = useNiveauxEtudes();
  return useMemo(
    () => niveauxEtudes.map((n) => ({ label: n.label, value: String(n.id) })),
    [niveauxEtudes],
  );
};

export const useNiveauxEtudes = () => {
  const [niveauxEtudes, setNiveauxEtudes] = useState<NiveauEtudes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const fallbackData = Array.isArray(STATIC_NIVEAUX_ETUDES)
      ? (STATIC_NIVEAUX_ETUDES as NiveauEtudes[])
      : [];
    setNiveauxEtudes(fallbackData);
    setIsLoading(false);
  }, []);

  return { niveauxEtudes, isLoading, error };
};
