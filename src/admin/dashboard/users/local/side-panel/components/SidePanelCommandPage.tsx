import { useCallback, useMemo, useState, useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Plus, Building2, Search } from "lucide-react";
import { sidePanelSearchAtom, sidePanelSelectedItemIdAtom } from "../states";
import { useOpenRecordInSidePanel, useOpenCreateInSidePanel } from "../hooks";
import { useRecordTableContextOrThrow } from "@/components/twenty-table/contexts";
import type { RecordData, ColumnDefinition } from "@/components/twenty-table/types";

/**
 * SidePanelCommandPage — Twenty CRM exact reproduction
 *
 * From Twenty source (SidePanelRootPage):
 * - Groups: Actions, Navigate, Records (search results)
 * - Selectable list with keyboard navigation (↑↓ Enter)
 * - Empty state with search icon
 * - Scrollable content with padding
 */
export const SidePanelCommandPage = () => {
  const search = useAtomValue(sidePanelSearchAtom);
  const setSelectedItemId = useSetAtom(sidePanelSelectedItemIdAtom);
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();
  const { openCreateInSidePanel } = useOpenCreateInSidePanel();

  const [selectedIndex, setSelectedIndex] = useState(0);

  // Get records from table context
  let records: RecordData[] = [];
  let columns: ColumnDefinition[] = [];
  try {
    const ctx = useRecordTableContextOrThrow();
    records = ctx.records;
    columns = ctx.columns;
  } catch {
    // Not inside a RecordTableContext
  }

  const labelColumn = columns.find((c) => c.isLabelIdentifier);

  const createPageTitle = useMemo(() => {
    const fieldNames = columns.map((col) => col.fieldName?.toLowerCase() || "");
    const hasCandidatSpecific = fieldNames.some((f) =>
      ["photoscore", "cv", "metiers", "nomecole", "ecole", "niveauetudes"].includes(f),
    );
    const hasRecruteurSpecific = fieldNames.some((f) =>
      ["fonction", "authmethod", "creditcv", "creditoffre", "offres"].includes(f),
    );

    // Candidats and recruteurs share nomComplet/email/gsm/loginSource/emailBounce
    // so we disambiguate with specific fields first.
    if (hasCandidatSpecific) {
      return "Nouveau candidat";
    }

    if (hasRecruteurSpecific && !hasCandidatSpecific) {
      return "Nouveau recruteur";
    }

    if (
      fieldNames.includes("nomcomplet") ||
      fieldNames.includes("email") ||
      fieldNames.includes("gsm")
    ) {
      return "Nouveau candidat";
    }

    if (
      fieldNames.includes("nomentreprise") ||
      fieldNames.includes("siren") ||
      fieldNames.includes("utilisateurs") ||
      fieldNames.includes("recruteurs") ||
      fieldNames.includes("nom")
    ) {
      return "Nouvelle entreprise";
    }

    if (fieldNames.includes("typecontrat")) {
      return "Nouvelle offre d'emploi";
    }

    return "Nouveau record";
  }, [columns]);

  // Filter records by search
  const filteredRecords = useMemo(() => {
    if (!search.trim()) {
      return records.slice(0, 8);
    }
    const query = search.toLowerCase();
    return records
      .filter((r) => {
        const name = String(
          r[labelColumn?.fieldName ?? "name"] ?? r.id ?? "",
        ).toLowerCase();
        return name.includes(query);
      })
      .slice(0, 10);
  }, [search, records, labelColumn]);

  // Build all selectable items
  const allItems = useMemo(() => {
    const items: {
      id: string;
      type: "action" | "record";
      data?: RecordData;
    }[] = [];
    // Actions are always shown when no search
    if (!search.trim()) {
      items.push({ id: "action-create", type: "action" });
    }
    filteredRecords.forEach((r) => {
      items.push({ id: r.id, type: "record", data: r });
    });
    return items;
  }, [filteredRecords, search]);

  const handleSelectRecord = useCallback(
    (record: RecordData) => {
      const name = String(record[labelColumn?.fieldName ?? "name"] ?? "Record");
      openRecordInSidePanel({
        recordId: record.id,
        objectNameSingular: name,
      });
    },
    [openRecordInSidePanel, labelColumn],
  );

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
    if (allItems.length > 0) {
      setSelectedItemId(allItems[0].id);
    }
  }, [allItems, setSelectedItemId]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.min(allItems.length - 1, prev + 1);
          setSelectedItemId(allItems[next]?.id ?? null);
          return next;
        });
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.max(0, prev - 1);
          setSelectedItemId(allItems[next]?.id ?? null);
          return next;
        });
      }
      if (e.key === "Enter") {
        const item = allItems[selectedIndex];
        if (item?.type === "action" && item.id === "action-create") {
          openCreateInSidePanel({ pageTitle: createPageTitle });
        } else if (item?.type === "record" && item.data) {
          handleSelectRecord(item.data);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [
    allItems,
    selectedIndex,
    setSelectedItemId,
    openCreateInSidePanel,
    createPageTitle,
    handleSelectRecord,
  ]);

  const getRecordLabel = (record: RecordData): string => {
    return String(record[labelColumn?.fieldName ?? "name"] ?? record.id);
  };

  return (
    <div className="flex flex-col p-2">
      {/* Actions group (when no search) */}
      {!search.trim() && (
        <SidePanelGroup heading="Actions">
          <SidePanelMenuItem
            icon={<Plus className="w-4 h-4" />}
            text="Create new record"
            hotkey="C"
            isSelected={selectedIndex === 0}
            onClick={() => openCreateInSidePanel({ pageTitle: createPageTitle })}
            onMouseEnter={() => setSelectedIndex(0)}
          />
        </SidePanelGroup>
      )}

      {/* Records group */}
      {filteredRecords.length > 0 && (
        <SidePanelGroup
          heading={search.trim() ? `Records matching '${search}'` : "Records"}
        >
          {filteredRecords.map((record, index) => {
            const itemIndex = search.trim() ? index : index + 1; // +1 for action item
            return (
              <SidePanelMenuItem
                key={record.id}
                icon={<Building2 className="w-4 h-4" />}
                text={getRecordLabel(record)}
                isSelected={selectedIndex === itemIndex}
                onClick={() => handleSelectRecord(record)}
                onMouseEnter={() => setSelectedIndex(itemIndex)}
              />
            );
          })}
        </SidePanelGroup>
      )}

      {/* Empty state */}
      {search.trim() && filteredRecords.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
          <Search className="w-8 h-8 mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-sm">No results found</p>
        </div>
      )}

      {/* Records count hint */}
      {!search.trim() && records.length > 8 && (
        <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
          Type to search {records.length} records...
        </div>
      )}
    </div>
  );
};

// ── SidePanelGroup — Twenty style ──
const SidePanelGroup = ({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col">
    {/* Group heading (Twenty: Label component) */}
    <div className="px-2 pt-2 pb-1 select-none">
      <span className="text-[0.6875rem] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        {heading}
      </span>
    </div>
    {/* Group items */}
    <div className="flex flex-col gap-0.5">{children}</div>
  </div>
);

// ── SidePanelMenuItem — Twenty's CommandMenuItemComponent ──
const SidePanelMenuItem = ({
  icon,
  text,
  description,
  hotkey,
  isSelected = false,
  onClick,
  onMouseEnter,
}: {
  icon: React.ReactNode;
  text: string;
  description?: string;
  hotkey?: string;
  isSelected?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
}) => (
  <button
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-sm text-[0.8125rem] text-left border-none cursor-pointer transition-colors
      ${
        isSelected
          ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          : "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
      }`}
  >
    <span className="flex items-center justify-center w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0">
      {icon}
    </span>
    <span className="flex-1 min-w-0">
      <span className="truncate block">{text}</span>
      {description && (
        <span className="text-[0.6875rem] text-gray-400 truncate block">
          {description}
        </span>
      )}
    </span>
    {hotkey && (
      <kbd className="text-[0.6875rem] text-gray-400 font-mono px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 shrink-0">
        {hotkey}
      </kbd>
    )}
  </button>
);
