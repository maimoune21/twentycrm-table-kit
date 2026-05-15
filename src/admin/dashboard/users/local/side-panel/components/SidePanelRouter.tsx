import { useAtomValue } from "jotai";
import { motion } from "framer-motion";
import React from "react";
import {
  sidePanelPageAtom,
  sidePanelPageInfoAtom,
  sidePanelRecordIdAtom,
  SidePanelPage,
} from "../states";
import { SidePanelCommandPage } from "./SidePanelCommandPage";
import { SidePanelRecordPage } from "./SidePanelRecordPage";
import { SidePanelCreatePage } from "./SidePanelCreatePage";
import { SidePanelCvScorePage } from "../../../panels/user-cv/CVPanelPage";
import { SidePanelPremiumPacksPage } from "../../../panels/user-premium/UserPremiumPanelPage";
import { SidePanelTopBar } from "./SidePanelTopBar";
import { useRecordTableContextOrThrow } from "@/components/twenty-table/contexts/RecordTableContext";

export const SidePanelRouter = () => {
  const sidePanelPage = useAtomValue(sidePanelPageAtom);
  const sidePanelPageInfo = useAtomValue(sidePanelPageInfoAtom);
  const activeRecordId = useAtomValue(sidePanelRecordIdAtom);
  const { customRecordPage, records } = useRecordTableContextOrThrow();

  // Extract candidat data from active record
  const candidatData = React.useMemo(() => {
    if (!activeRecordId || !records) return null;
    const record = records.find((r: any) => r.id === activeRecordId);
    if (!record) return null;
    const raw = (record?._raw ?? record) as any;
    return {
      etat: raw?.etat || null,
      premium: raw?.premium || false,
    };
  }, [activeRecordId, records]);

  // Determine which page component to render
  const pageComponent = React.useMemo(() => {
    switch (sidePanelPage) {
      case SidePanelPage.ViewRecord:
        if (!activeRecordId) return null;
        return customRecordPage
          ? customRecordPage(activeRecordId)
          : <SidePanelRecordPage recordId={activeRecordId} />;
      case SidePanelPage.CvScore:
        return <SidePanelCvScorePage />;
      case SidePanelPage.PremiumPacks:
        return <SidePanelPremiumPacksPage />;
      case SidePanelPage.CreateRecord:
        return <SidePanelCreatePage />;
      case SidePanelPage.Root:
      default:
        return <SidePanelCommandPage />;
    }
  }, [sidePanelPage, activeRecordId, customRecordPage]);

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      {/* Toolbar anchored at the top */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.12, delay: 0.05 }}
        className="shrink-0"
      >
        <SidePanelTopBar candidat={candidatData} />
      </motion.div>

      {/* Page content — child manages its own scroll */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <motion.div
          key={sidePanelPageInfo.instanceId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex-1 min-h-0 flex flex-col"
        >
          {pageComponent}
        </motion.div>
      </div>
    </div>
  );
};
