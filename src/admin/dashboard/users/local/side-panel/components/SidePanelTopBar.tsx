import { useRef, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, X, Crown, Save } from "lucide-react";
import {
  sidePanelCreateActionAtom,
  sidePanelSearchAtom,
  sidePanelPageAtom,
  sidePanelNavigationStackAtom,
  sidePanelPageInfoAtom,
  sidePanelRecordIdAtom,
  SidePanelPage,
} from "../states";
import { useSidePanelMenu, useSidePanelHistory } from "../hooks";
import { SIDE_PANEL_TOP_BAR_HEIGHT, SIDE_PANEL_FOCUS_ID } from "../constants";
import { useRecordTableContextOrThrow } from "@/components/twenty-table/contexts";
import type { ColumnDefinition, RecordData } from "@/components/twenty-table/types";

/**
 * SidePanelTopBar — Twenty CRM exact reproduction
 *
 * From Twenty source:
 * - Height: 40px
 * - Background: secondary (gray-50)
 * - Border-bottom
 * - Contains: BackButton | CloseButton | PageInfo chip | SearchInput | RightCornerIcon
 * - BackButton only when navigationStack.length > 1
 * - CloseButton only when on first page (stack === 1)
 * - SearchInput shown on Root and SearchRecords pages
 * - PageInfo chip shown on other pages
 */

const getEtatBadgeClasses = (etat: string): string => {
  const normalized = etat.trim().toLowerCase();

  switch (normalized) {
    case "actif":
    case "active":
    case "validée":
    case "validee":
      return "text-zinc-900 dark:text-zinc-100";
    case "nouveau":
      return "text-zinc-700 dark:text-zinc-300";
    case "non validée":
    case "non validee":
      return "text-zinc-600 dark:text-zinc-400";
    case "supprimée":
    case "supprimee":
      return "text-zinc-500 dark:text-zinc-500";
    default:
      return "text-zinc-600 dark:text-zinc-400";
  }
};

const getEtatDotClasses = (etat: string): string => {
  const normalized = etat.trim().toLowerCase();

  switch (normalized) {
    case "actif":
    case "active":
    case "validée":
    case "validee":
      return "bg-zinc-900 dark:bg-zinc-200";
    case "nouveau":
      return "bg-zinc-600 dark:bg-zinc-400";
    case "non validée":
    case "non validee":
      return "bg-zinc-500 dark:bg-zinc-500";
    case "supprimée":
    case "supprimee":
      return "bg-zinc-400 dark:bg-zinc-600";
    default:
      return "bg-zinc-400 dark:bg-zinc-500";
  }
};

interface SidePanelTopBarProps {
  candidat?: {
    etat?: string;
    premium?: boolean;
  } | null;
}

export const SidePanelTopBar = ({ candidat }: SidePanelTopBarProps) => {
  const [sidePanelSearch, setSidePanelSearch] = useAtom(sidePanelSearchAtom);
  const sidePanelPage = useAtomValue(sidePanelPageAtom);
  const createAction = useAtomValue(sidePanelCreateActionAtom);
  const sidePanelNavigationStack = useAtomValue(sidePanelNavigationStackAtom);
  const sidePanelPageInfo = useAtomValue(sidePanelPageInfoAtom);
  const activeRecordId = useAtomValue(sidePanelRecordIdAtom);
  const inputRef = useRef<HTMLInputElement>(null);

  const { closeSidePanelMenu } = useSidePanelMenu();
  const { goBackFromSidePanel } = useSidePanelHistory();



  // Record data for the top bar (record page only)
  let recordLabel = "";
  let recordPrenom = "";
  let recordNom = "";
  let onCellChange:
    | ((recordId: string, fieldName: string, value: unknown) => void)
    | undefined;
  let onNameChange:
    | ((recordId: string, prenom: string, nom: string) => Promise<void>)
    | undefined;
  let isEntrepriseRecord = false;
  let isOffreRecord = false;
  const isRecordPage = sidePanelPage === SidePanelPage.ViewRecord;

  try {
    const ctx = useRecordTableContextOrThrow();
    onCellChange = ctx.onCellChange;
    onNameChange = ctx.onNameChange;
    isEntrepriseRecord = ctx.recordTableId === "entreprises-table";
    isOffreRecord = ctx.recordTableId === "offres-table";
    if (activeRecordId) {
      const record = ctx.records.find(
        (r: RecordData) => r.id === activeRecordId,
      );
      const labelCol = ctx.columns.find(
        (c: ColumnDefinition) => c.isLabelIdentifier,
      );
      recordLabel = record
        ? String(record[labelCol?.fieldName ?? "name"] ?? record.id)
        : "";

      // Extract prénom and nom from raw data or split nomComplet
      const raw: any = record?._raw ?? record;
      if (raw) {
        recordPrenom = String(raw.prenom ?? raw.user?.prenom ?? "").trim();
        recordNom = String(raw.nom ?? raw.user?.nom ?? "").trim();

        // Fallback: try to split nomComplet if no separate fields
        if (!recordPrenom && !recordNom && recordLabel) {
          const parts = recordLabel.split(" ");
          if (parts.length >= 2) {
            recordPrenom = parts[0];
            recordNom = parts.slice(1).join(" ");
          } else if (parts.length === 1) {
            recordNom = parts[0];
          }
        }
      }
    }
  } catch {
    // Context not available — fallback
  }



  const canGoBack = sidePanelNavigationStack.length > 1;
  const shouldShowCloseButton = !canGoBack;
  const shouldShowBackButton = canGoBack;
  const isRootPage = sidePanelPage === SidePanelPage.Root;
  const isCvScorePage = sidePanelPage === SidePanelPage.CvScore;
  const isCreatePage = sidePanelPage === SidePanelPage.CreateRecord;

  // Auto-focus search input on root page
  useEffect(() => {
    if (isRootPage) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isRootPage]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (canGoBack) {
          goBackFromSidePanel();
        } else {
          closeSidePanelMenu();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [canGoBack, goBackFromSidePanel, closeSidePanelMenu]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSidePanelSearch(event.target.value);
  };

  return (
    <div
      className="flex items-center gap-1 px-2 shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black overflow-hidden"
      style={{ height: SIDE_PANEL_TOP_BAR_HEIGHT }}
    >
      {/* Content container */}
      <div className="flex items-center flex-1 gap-1 min-w-0 overflow-hidden">
        {/* Back button (shown when navigation stack > 1) */}
        <AnimatePresence>
          {shouldShowBackButton && (
            <motion.div
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.1 }}
            >
              <button
                onClick={goBackFromSidePanel}
                className="flex items-center justify-center w-7 h-7 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-pointer border-none bg-transparent transition-colors shrink-0"
                title="Go back"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Close button (shown when on first page) */}
          {shouldShowCloseButton && (
            <motion.div
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.1 }}
            >
              <button
                onClick={closeSidePanelMenu}
                className="flex items-center justify-center w-7 h-7 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-pointer border-none bg-transparent transition-colors shrink-0"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Non-record pages: show selected record label when available, fallback to page title */}
        {!isRootPage &&
          !isRecordPage &&
          ((!isOffreRecord && (recordLabel || sidePanelPageInfo.title)) ||
            (isCreatePage && !!createAction)) && (
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 truncate">
                {isCreatePage
                  ? sidePanelPageInfo.title || recordLabel
                  : !isOffreRecord
                    ? isCvScorePage
                      ? recordLabel || sidePanelPageInfo.title
                      : recordLabel || sidePanelPageInfo.title
                    : ""}
              </div>
              {isCreatePage && createAction && (
                <button
                  onClick={createAction.onSave}
                  disabled={createAction.isSaving}
                  className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-white cursor-pointer
                             bg-black hover:bg-zinc-800 disabled:bg-zinc-500 disabled:cursor-not-allowed
                             rounded-sm transition-colors shrink-0"
                >
                  <Save className="size-3" />
                  {createAction.isSaving ? "..." : "Enregistrer"}
                </button>
              )}
            </div>
          )}

        {/* Record info: avatar + editable name (prénom + nom) + created ago (shown on record page) */}

        {/* Search input (shown on Root page) */}
        {isRootPage && (
          <input
            ref={inputRef}
            data-testid={SIDE_PANEL_FOCUS_ID}
            value={sidePanelSearch}
            placeholder="Type anything..."
            onChange={handleSearchChange}
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 placeholder:font-medium min-w-0 h-6 px-1"
          />
        )}
      </div>

      {/* Status badges */}
      {activeRecordId && candidat && (candidat.etat || candidat.premium) && (
        <div className="flex items-center gap-1 shrink-0">
          {candidat.etat && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px]! font-semibold ${getEtatBadgeClasses(candidat.etat)}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${getEtatDotClasses(candidat.etat)}`}
              />
              {candidat.etat}
            </span>
          )}
          {candidat.premium && (
            <span className="flex justify-center items-center gap-1 h-5 w-5 rounded-full text-[0.6875rem] font-semibold bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 ring-1 ring-zinc-300 dark:ring-zinc-700 shadow-xs">
              <Crown className="size-2.5" />
              {/* Premium */}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
