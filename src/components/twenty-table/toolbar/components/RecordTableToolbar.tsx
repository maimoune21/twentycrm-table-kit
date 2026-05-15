import { useEffect, type ReactNode } from "react";
import {
  RecordIndexPageHeader,
  PageHeaderButton,
  IconPlus,
} from "./RecordIndexPageHeader";
import { ViewBar } from "./ViewBar";
import { ViewBarDetails } from "./ViewBarDetails";
import { FilterDropdown } from "./FilterDropdown";
import { SortDropdown } from "./SortDropdown";
import { OptionsDropdown } from "./OptionsDropdown";
import { useRecordSidePanel } from "../../hooks/useRecordSidePanel";
import type { ColumnDefinition, BulkAction } from "../../types";

// ── Side Panel Toggle Icon ──
const IconSidePanelToggle = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <path d="M15 3v18" />
  </svg>
);

// ── Shared props ──

type RecordTablePageHeaderProps = {
  title: string;
  icon?: ReactNode;
  recordCount?: number;
  tabsSlot?: ReactNode;
  rightSlot?: ReactNode;
  onNewRecord?: () => void;
  onDeleteRecords?: (ids: string[]) => void;
  onExportRecords?: (ids: string[]) => void;
  bulkActions?: BulkAction[];
  /** Extra buttons rendered before the "New record" button */
  extraButtons?: ReactNode;
};

type RecordTableViewBarProps = {
  recordCount?: number;
  columns: ColumnDefinition[];
  /** Current page size (limit) */
  pageSize?: number;
  /** Callback when page size changes */
  onPageSizeChange?: (size: number) => void;
  /** Available page size options */
  pageSizeOptions?: number[];
};

type RecordTableToolbarProps = RecordTablePageHeaderProps &
  RecordTableViewBarProps;

// ── Ctrl+K hook ──

function useCtrlK() {
  const { toggleCommandMenu } = useRecordSidePanel();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        toggleCommandMenu();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggleCommandMenu]);

  return toggleCommandMenu;
}

// ── Ctrl+N hook for new record ──

function useCtrlN(onNewRecord?: () => void) {
  useEffect(() => {
    if (!onNewRecord) return;

    const handler = (e: KeyboardEvent) => {
      // Ctrl+N or Cmd+N (but not in input fields)
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        const target = e.target as HTMLElement;
        const isInputField =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;
        if (!isInputField) {
          e.preventDefault();
          onNewRecord();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onNewRecord]);
}

/**
 * Page header — renders OUTSIDE the bordered PagePanel in Twenty's layout.
 * Shows page title + action buttons.
 * Selection bar is now a separate floating component.
 */
export const RecordTablePageHeader = ({
  title,
  icon,
  recordCount,
  tabsSlot,
  rightSlot,
  onNewRecord,
  extraButtons,
}: RecordTablePageHeaderProps) => {
  const { isOpen: isSidePanelOpen } = useRecordSidePanel();
  const toggleCommandMenu = useCtrlK();
  useCtrlN(onNewRecord);

  return (
    <RecordIndexPageHeader
      icon={icon}
      title={title}
      recordCount={recordCount}
      tabsSlot={tabsSlot}
    >
      {extraButtons}
      {onNewRecord && (
        <>
          <PageHeaderButton
            onClick={onNewRecord}
            title="Créer un nouvel enregistrement (Ctrl+N)"
          >
            <IconPlus />
            <span>New record</span>
          </PageHeaderButton>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />
        </>
      )}
      <PageHeaderButton onClick={toggleCommandMenu}>
        <span className="text-2sm!">Ctrl + K</span>
        <IconSidePanelToggle isOpen={isSidePanelOpen} />
      </PageHeaderButton>
      {rightSlot && <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />}
      {rightSlot}
    </RecordIndexPageHeader>
  );
};

/**
 * View bar — renders INSIDE the bordered PagePanel alongside the table.
 * Contains view selector, filter/sort/options, and active chip details.
 */
export const RecordTableViewBar = ({
  recordCount,
  columns,
  pageSize,
  onPageSizeChange,
  pageSizeOptions,
}: RecordTableViewBarProps) => {
  return (
    <div className="flex flex-col shrink-0">
      <ViewBar
        recordCount={recordCount}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={pageSizeOptions}
        rightComponent={
          <>
            <FilterDropdown columns={columns} />
            <SortDropdown columns={columns} />
            <OptionsDropdown columns={columns} />
          </>
        }
        bottomComponent={<ViewBarDetails />}
      />
    </div>
  );
};

/**
 * Combined toolbar (backward-compatible) — renders both PageHeader + ViewBar.
 * For Twenty's exact layout, use RecordTablePageHeader + RecordTableViewBar separately.
 */
export const RecordTableToolbar = ({
  title,
  icon,
  recordCount,
  columns,
  onNewRecord,
  onDeleteRecords,
  onExportRecords,
  bulkActions,
}: RecordTableToolbarProps & { bulkActions?: BulkAction[] }) => {
  return (
    <div className="flex flex-col shrink-0">
      <RecordTablePageHeader
        title={title}
        icon={icon}
        recordCount={recordCount}
        onNewRecord={onNewRecord}
        onDeleteRecords={onDeleteRecords}
        onExportRecords={onExportRecords}
        bulkActions={bulkActions}
      />
      <RecordTableViewBar recordCount={recordCount} columns={columns} />
    </div>
  );
};
