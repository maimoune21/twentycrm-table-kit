/**
 * LocalRecordTableViewBar — mirrors upstream RecordTableViewBar but uses
 * our local FilterDropdown / SortDropdown / OptionsDropdown so they are
 * fully editable in this workspace.
 */
import { ViewBar } from "./ViewBar";
import { ViewBarDetails } from "@/components/twenty-table/toolbar/components/ViewBarDetails";
import type { ColumnDefinition } from "@/components/twenty-table";
import { FilterDropdown } from "./FilterDropdown";
import { SortDropdown } from "./SortDropdown";
import { OptionsDropdown } from "./OptionsDropdown";

type LocalRecordTableViewBarProps = {
  recordCount?: number;
  columns: ColumnDefinition[];
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
};

export const LocalRecordTableViewBar = ({
  recordCount,
  columns,
  pageSize,
  onPageSizeChange,
  pageSizeOptions,
}: LocalRecordTableViewBarProps) => {
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
