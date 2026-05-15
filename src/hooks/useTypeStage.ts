// src/hooks/use-type-stage.ts
import { useState, useCallback } from "react";

type TypeStage = {
  id: number;
  name?: string;
  titre?: string;
  [key: string]: unknown;
};

type CreateTypeStagePayload = {
  name?: string;
  titre?: string;
  [key: string]: unknown;
};

type UpdateTypeStagePayload = CreateTypeStagePayload;

export const useTypeStage = () => {
  const [typeStages, setTypeStages] = useState<TypeStage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===================
  // Fetch all typeStages
  // ===================
  const fetchTypeStages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data: TypeStage[] = [];
      setTypeStages(data);
    } catch (err: any) {
      setError(err?.message || "Erreur lors du chargement des types de stage");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ===================
  // Get one typeStage
  // ===================
  const getTypeStage = useCallback(
    async (id: number): Promise<TypeStage | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const data: TypeStage = { id };
        return data;
      } catch (err: any) {
        setError(err?.message || "Type de stage introuvable");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ===================
  // Create typeStage
  // ===================
  const createTypeStage = useCallback(
    async (payload: CreateTypeStagePayload) => {
      setIsLoading(true);
      setError(null);
      try {
        const data: TypeStage = { id: Date.now(), ...payload };
        setTypeStages((prev) => [...prev, data]);
        return data;
      } catch (err: any) {
        setError(err?.message || "Impossible de créer le type de stage");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ===================
  // Update typeStage
  // ===================
  const updateTypeStage = useCallback(
    async (id: number, payload: UpdateTypeStagePayload) => {
      setIsLoading(true);
      setError(null);
      try {
        const data: TypeStage = { id, ...payload };
        setTypeStages((prev) => prev.map((t) => (t.id === id ? data : t)));
        return data;
      } catch (err: any) {
        setError(
          err?.message || "Impossible de mettre à jour le type de stage"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ===================
  // Delete typeStage
  // ===================
  const deleteTypeStage = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      setTypeStages((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      setError(err?.message || "Impossible de supprimer le type de stage");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    typeStages,
    isLoading,
    error,
    fetchTypeStages,
    getTypeStage,
    createTypeStage,
    updateTypeStage,
    deleteTypeStage,
  };
};
