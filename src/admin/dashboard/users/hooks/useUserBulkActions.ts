import { useState, useCallback } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { toast } from "sonner";
import {
  apiDeleteCandidat,
  apiUpdateCandidat,
  apiGetCandidatById,
} from "@/api/candidates";
import { bulkAffectPremiumCandidats } from "@/api/Bulk";
import {
  selectedRowIdsAtom,
  selectedRowIdsArrayAtom,
} from "@/components/twenty-table";
import type { BulkAction, RecordData } from "@/components/twenty-table";

type BulkPremiumData = {
  premiumTrue: number[];
  premiumFalse: number[];
};

export function useCandidatBulkActions(
  records: RecordData[],
  refetch: () => void,
) {
  const setSelectedRowIds = useSetAtom(selectedRowIdsAtom);
  const jotaiSelectedIds = useAtomValue(selectedRowIdsArrayAtom);

  const [isBulkPremiumOpen, setIsBulkPremiumOpen] = useState(false);
  const [bulkPremiumData, setBulkPremiumData] =
    useState<BulkPremiumData | null>(null);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkActivating, setIsBulkActivating] = useState(false);
  const [isBulkDeactivating, setIsBulkDeactivating] = useState(false);

  const handleBulkDelete = useCallback(async () => {
    if (jotaiSelectedIds.length === 0) return;
    try {
      await Promise.all(
        jotaiSelectedIds.map((id) => apiDeleteCandidat(Number(id))),
      );
      toast.success(`${jotaiSelectedIds.length} candidat(s) supprimé(s)`);
      setSelectedRowIds(new Set());
      refetch();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la suppression groupée");
    } finally {
      setIsBulkDeleteOpen(false);
    }
  }, [jotaiSelectedIds, refetch, setSelectedRowIds]);

  const handleBulkPremium = useCallback(async () => {
    if (jotaiSelectedIds.length === 0) return;

    setIsBulkLoading(true);
    try {
      const premiumTrue: number[] = [];
      const premiumFalse: number[] = [];

      for (const id of jotaiSelectedIds) {
        const record = records.find((r) => r.id === id);
        if (record) {
          if (record.premium) premiumTrue.push(Number(id));
          else premiumFalse.push(Number(id));
        } else {
          const candidat = await apiGetCandidatById(Number(id));
          if ((candidat as any).premium) premiumTrue.push(Number(id));
          else premiumFalse.push(Number(id));
        }
      }

      setBulkPremiumData({ premiumTrue, premiumFalse });
      setIsBulkPremiumOpen(true);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la préparation de l'action groupée");
    } finally {
      setIsBulkLoading(false);
    }
  }, [jotaiSelectedIds, records]);

  const confirmBulkPremium = useCallback(async () => {
    if (!bulkPremiumData) return;
    setIsBulkLoading(true);
    try {
      if (bulkPremiumData.premiumFalse.length > 0) {
        await bulkAffectPremiumCandidats(bulkPremiumData.premiumFalse);
      }
      if (bulkPremiumData.premiumTrue.length > 0) {
        await Promise.all(
          bulkPremiumData.premiumTrue.map((id) =>
            apiUpdateCandidat(id, { premium: false } as any),
          ),
        );
      }

      toast.success("Mise à jour groupée terminée");
      setIsBulkPremiumOpen(false);
      setBulkPremiumData(null);
      setSelectedRowIds(new Set());
      refetch();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la mise à jour groupée");
    } finally {
      setIsBulkLoading(false);
    }
  }, [bulkPremiumData, refetch, setSelectedRowIds]);

  const closeBulkPremium = useCallback(() => {
    setIsBulkPremiumOpen(false);
    setBulkPremiumData(null);
    setSelectedRowIds(new Set());
    refetch();
  }, [refetch, setSelectedRowIds]);

  const handleBulkSetEtat = useCallback(
    async (etat: "Validée" | "Non Validée") => {
      if (jotaiSelectedIds.length === 0) return;

      const isActivate = etat === "Validée";
      if (isActivate) setIsBulkActivating(true);
      else setIsBulkDeactivating(true);

      try {
        await Promise.all(
          jotaiSelectedIds.map((id) =>
            apiUpdateCandidat(Number(id), { etat } as any),
          ),
        );

        toast.success(
          isActivate
            ? `${jotaiSelectedIds.length} candidat(s) activé(s)`
            : `${jotaiSelectedIds.length} candidat(s) désactivé(s)`,
        );

        setSelectedRowIds(new Set());
        refetch();
      } catch (error) {
        console.error(error);
        toast.error(
          isActivate
            ? "Erreur lors de l'activation groupée"
            : "Erreur lors de la désactivation groupée",
        );
      } finally {
        if (isActivate) setIsBulkActivating(false);
        else setIsBulkDeactivating(false);
      }
    },
    [jotaiSelectedIds, refetch, setSelectedRowIds],
  );

  const bulkActions: BulkAction[] = [
    {
      label: "Activer",
      icon: null,
      variant: "success",
      onClick: () => void handleBulkSetEtat("Validée"),
      isLoading: isBulkActivating,
    },
    {
      label: "Désactiver",
      icon: null,
      variant: "warning",
      onClick: () => void handleBulkSetEtat("Non Validée"),
      isLoading: isBulkDeactivating,
    },
    {
      label: "Gérer Premium",
      icon: null,
      variant: "default",
      onClick: handleBulkPremium,
      isLoading: isBulkLoading,
    },
    {
      label: "Supprimer",
      icon: null,
      variant: "danger",
      onClick: () => setIsBulkDeleteOpen(true),
    },
  ];

  return {
    bulkActions,
    // Bulk premium dialog state
    isBulkPremiumOpen,
    setIsBulkPremiumOpen,
    bulkPremiumData,
    isBulkLoading,
    confirmBulkPremium,
    closeBulkPremium,
    // Bulk delete confirmation state
    isBulkDeleteOpen,
    setIsBulkDeleteOpen,
    handleBulkDelete,
    selectedCount: jotaiSelectedIds.length,
  };
}
