import { useCallback, useEffect, useState } from "react";
import { getAllSecteurs, getPublicSecteursByTitre } from "@/api/secteurs";

type SelectOpt = { value: string; label: string };

export function useSecteurOptions() {
  const [options, setOptions] = useState<SelectOpt[]>([]);

  useEffect(() => {
    let mounted = true;
    getAllSecteurs(1, 200)
      .then((res) => {
        if (!mounted) return;
        const mapped = (res?.data || []).map((s: any) => ({
          value: String(s.id),
          label: s.titre || "",
        }));
        setOptions(mapped);
      })
      .catch(() => {
        if (mounted) setOptions([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const search = useCallback(async (query: string): Promise<SelectOpt[]> => {
    const q = String(query || "").trim();
    if (!q) return options;
    const data = await getPublicSecteursByTitre(q, undefined, 50);
    return (data || []).map((s: any) => ({
      value: String(s.id),
      label: s.titre || "",
    }));
  }, [options]);

  return { options, search };
}
