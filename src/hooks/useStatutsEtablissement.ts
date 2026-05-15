import { useQuery } from "@tanstack/react-query";

export const useStatutsEtablissement = () => {
  return useQuery({
    queryKey: ["ecole-statuts-etablissement"],
    queryFn: async () => {
      return [];
    },
    staleTime: 1000 * 60 * 30, 
  });
};
