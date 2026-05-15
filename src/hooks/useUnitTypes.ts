// src/hooks/useUnitTypes.ts
import { useQuery } from "@tanstack/react-query";

export const useUnitTypes = () => {
  return useQuery({
    queryKey: ["ecole-unit-types"],
    queryFn: async () => {
      return [];
    },
    staleTime: 1000 * 60 * 10, // 10 min cache
  });
};
