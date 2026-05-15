import { useCallback } from "react";
import { toast } from "sonner";
import { apiUpdateCandidat } from "@/api/candidates";
import { apiUpdateUser } from "@/api/auth";
import { CANDIDATS_COLUMNS as BASE_COLUMNS } from "../cells/constants";
import type { RecordData } from "@/components/twenty-table";

export function useCandidatCellChange(
  records: RecordData[],
  refetch: () => void,
) {
  return useCallback(
    async (recordId: string, fieldName: string, value: unknown) => {
      try {
        const record = records.find((r) => r.id === recordId);
        const userId = record?._userId as number | undefined;
        const entityId = Number(recordId);

        const colDef = BASE_COLUMNS.find((c) => c.fieldName === fieldName);
        const editTarget = colDef?.editTarget;
        const apiField = colDef?.apiFieldName || fieldName;

        // RELATION fields (ville, école) pass { id, label } — extract just the id
        const isRelation = colDef?.type === "RELATION";
        const apiValue =
          isRelation && value && typeof value === "object"
            ? (value as any).id
            : value;

        if (editTarget === "user" && userId) {
          await apiUpdateUser(userId, { [apiField]: apiValue });
        } else {
          await apiUpdateCandidat(entityId, { [apiField]: apiValue } as any);
        }

        toast.success("Mis à jour avec succès");
        refetch();
      } catch (error) {
        console.error(error);
        toast.error("Erreur lors de la mise à jour");
        throw error;
      }
    },
    [records, refetch],
  );
}
