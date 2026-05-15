import type { ReactNode } from "react";
import { FileText, ImageIcon, List } from "lucide-react";

import { IconPeople } from "@/components/twenty-table";

type UserSubTab = "liste" | "cvs" | "images";

type UsersHeaderTabsProps = {
	activeSubTab: UserSubTab;
	total?: number;
	leftHeaderSlot?: ReactNode;
	showSubTabs: boolean;
	onSubTabChange: (tab: UserSubTab) => void;
};

export function UsersHeaderTabs({
	activeSubTab,
	total,
	leftHeaderSlot,
	showSubTabs,
	onSubTabChange,
}: UsersHeaderTabsProps) {
	return (
		<div className="flex items-center gap-1">
			{/* icon + title + count */}
			<div className="flex items-center gap-1 shrink-0">
				<div className="flex items-center justify-center w-5 h-5 text-gray-500 dark:text-gray-400">
					<IconPeople />
				</div>
				<h1 className="text-[0.8125rem] font-semibold text-gray-500 dark:text-gray-100">
					Candidats
				</h1>
				{activeSubTab === "liste" && total !== undefined && (
					<span className="text-[12px] text-gray-400 dark:text-gray-500">
						( {total} )
					</span>
				)}
			</div>

			{leftHeaderSlot}

			{showSubTabs && (
				<div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 h-7 shrink-0">
					<button
						onClick={() => onSubTabChange("liste")}
						className={
							activeSubTab === "liste"
								? "flex items-center justify-center h-5 px-2 py-1 text-[10px] cursor-pointer font-medium rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-xs transition-colors"
								: "flex items-center justify-center h-5 px-2 py-1 text-[10px] cursor-pointer font-medium rounded-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
						}
					>
						<span className="inline-flex items-center gap-1.5">
							<List className="size-2.5" />
							Liste
						</span>
					</button>
					<button
						onClick={() => onSubTabChange("cvs")}
						className={
							activeSubTab === "cvs"
								? "flex items-center justify-center h-5 px-2.5 py-1 text-[10px] cursor-pointer font-medium rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-xs transition-colors"
								: "flex items-center justify-center h-5 px-2.5 py-1 text-[10px] cursor-pointer font-medium rounded-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
						}
					>
						<span className="inline-flex items-center gap-1.5">
							<FileText className="size-2.5" />
							CVs
						</span>
					</button>
					<button
						onClick={() => onSubTabChange("images")}
						className={
							activeSubTab === "images"
								? "flex items-center justify-center h-5 px-2 py-1 text-[10px] cursor-pointer font-medium rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-xs transition-colors"
								: "flex items-center justify-center h-5 px-2 py-1 text-[10px] cursor-pointer font-medium rounded-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
						}
					>
						<span className="inline-flex items-center gap-1.5">
							<ImageIcon className="size-2.5" />
							Images
						</span>
					</button>
				</div>
			)}
		</div>
	);
}
