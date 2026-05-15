// src/hooks/useTypeContrat.ts
import { useEffect, useState, useCallback, useRef } from "react";

type TypeContrat = {
  id: number;
  nom?: string;
  label?: string;
  [key: string]: unknown;
};

type TypeContratPayload = {
  nom?: string;
  label?: string;
  [key: string]: unknown;
};

const typeContratService = {
  getAll: async (): Promise<TypeContrat[]> => [],
  getById: async (id: number): Promise<TypeContrat> => ({ id }),
  create: async (payload: TypeContratPayload): Promise<TypeContrat> => ({
    id: Date.now(),
    ...payload,
  }),
  update: async (
    id: number,
    payload: TypeContratPayload,
  ): Promise<TypeContrat> => ({
    id,
    ...payload,
  }),
  delete: async (_id: number): Promise<void> => {},
};

// ============================================
// 🔵 GLOBAL CACHE FOR DEDUPLICATION
// ============================================
const typeContratCache = new Map<
  string,
  { data: TypeContrat[]; timestamp: number; promise?: Promise<any> }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function isCacheValid(): boolean {
  const cached = typeContratCache.get("all");
  if (!cached) return false;
  return Date.now() - cached.timestamp < CACHE_TTL;
}

export function useTypeContrat() {
  const [items, setItems] = useState<TypeContrat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TypeContrat | null>(null);

  const hasInitialized = useRef(false);

  // ─────────────────────────────────────────────
  // 1. Load all - WITH CACHE
  // ─────────────────────────────────────────────
  const load = useCallback(async () => {
    // If already loading this request, return existing promise
    const cachedEntry = typeContratCache.get("all");
    if (cachedEntry?.promise) {
      return cachedEntry.promise;
    }

    // If cache is valid, use it
    if (isCacheValid()) {
      setItems(cachedEntry?.data || []);
      setLoading(false);
      return cachedEntry?.data;
    }

    try {
      setLoading(true);
      setError(null);

      const fetchPromise = (async () => {
        const data = await typeContratService.getAll();
        setItems(data);

        // Store in cache
        typeContratCache.set("all", {
          data,
          timestamp: Date.now(),
        });

        return data;
      })();

      // Store promise to deduplicate concurrent requests
      typeContratCache.set("all", {
        data: [],
        timestamp: Date.now(),
        promise: fetchPromise,
      });

      await fetchPromise;
    } catch (err: any) {
      setError(err?.response?.data?.error || "Erreur lors du chargement.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      load();
    }
  }, [load]);

  // ─────────────────────────────────────────────
  // 2. Get by id (exposé)
  // ─────────────────────────────────────────────
  const getById = useCallback(async (id: number): Promise<TypeContrat> => {
    try {
      setLoading(true);
      setError(null);
      const data = await typeContratService.getById(id);
      // Optionnel : mettre à jour la liste locale si absent
      setItems((prev) => {
        const exists = prev.some((p) => p.id === data.id);
        return exists
          ? prev.map((p) => (p.id === data.id ? data : p))
          : [...prev, data];
      });
      return data;
    } catch (err: any) {
      setError(
        err?.response?.data?.error || "Erreur lors de la récupération par id.",
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ─────────────────────────────────────────────
  // 3. Create
  // ─────────────────────────────────────────────
  const create = async (payload: TypeContratPayload) => {
    try {
      setLoading(true);
      setError(null);
      const created = await typeContratService.create(payload);
      setItems((prev) => [...prev, created]);
      return created;
    } catch (err: any) {
      setError(err?.response?.data?.error || "Erreur lors de la création.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // 4. Update
  // ─────────────────────────────────────────────
  const update = async (id: number, payload: TypeContratPayload) => {
    try {
      setLoading(true);
      setError(null);
      const updated = await typeContratService.update(id, payload);
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      // if the updated item is selected, update it
      setSelected((cur) => (cur && cur.id === id ? updated : cur));
      return updated;
    } catch (err: any) {
      setError(err?.response?.data?.error || "Erreur lors de la mise à jour.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // 5. Delete
  // ─────────────────────────────────────────────
  const remove = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      await typeContratService.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setSelected((cur) => (cur && cur.id === id ? null : cur));
    } catch (err: any) {
      setError(err?.response?.data?.error || "Erreur lors de la suppression.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // 6. Select (peut récupérer via API si item non présent)
  //    - si id === null => désélection
  //    - si item présent => select synchro
  //    - sinon => fetch via getById
  // ─────────────────────────────────────────────
  const select = useCallback(
    async (id: number | null) => {
      if (id === null) {
        setSelected(null);
        return null;
      }

      const found = items.find((x) => x.id === id);
      if (found) {
        setSelected(found);
        return found;
      }

      // si pas trouvé localement, récupère via API
      try {
        const data = await getById(id);
        setSelected(data);
        return data;
      } catch (err) {
        // getById gère setError et rejette l'erreur
        return null;
      }
    },
    [items, getById],
  );

  return {
    items,
    loading,
    error,

    selected,
    select, // (id: number | null) => Promise<TypeContrat | null>

    // CRUD
    reload: load,
    getById, // (id: number) => Promise<TypeContrat>
    create,
    update,
    remove,
  };
}
