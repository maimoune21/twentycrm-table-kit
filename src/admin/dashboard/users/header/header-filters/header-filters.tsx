import type { Dispatch, RefObject, SetStateAction } from "react";
import { BadgeCheck, FileText, ImageIcon, X } from "lucide-react";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";

type ScoreMode = "equals" | "min" | "max";

type QuickFilterAction = {
	type:
		| "with"
		| "without"
		| "toggle-etat"
		| "score"
		| "score-state"
		| "clear";
	value?: string;
	mode?: ScoreMode;
};

type ActiveCvQuickState = {
	hasCv: boolean;
	withoutCv: boolean;
	etatCvs: string[];
	scoreState: "en_cours" | "error_correction" | "non_cv" | null;
	active: boolean;
};

type ActivePhotoQuickState = {
	hasPhoto: boolean;
	withoutPhoto: boolean;
	etatPhoto: string | null;
	scoreState: "en_cours" | "error_correction" | "non_photo_profile" | null;
	active: boolean;
};

type LocalQuickFiltersProps = {
	premiumDropdownRef: RefObject<HTMLDivElement | null>;
	premiumDropdownOpen: boolean;
	setPremiumDropdownOpen: Dispatch<SetStateAction<boolean>>;
	activePremiumValue: "true" | "false" | null;
	applyPremiumQuickFilter: (value: "true" | "false" | null) => void;
	cvDropdownRef: RefObject<HTMLDivElement | null>;
	cvDropdownOpen: boolean;
	setCvDropdownOpen: Dispatch<SetStateAction<boolean>>;
	activeCvQuickState: ActiveCvQuickState;
	cvQuickLabel: string;
	applyCvQuickFilter: (next: QuickFilterAction) => void;
	cvScoreMode: ScoreMode;
	setCvScoreMode: Dispatch<SetStateAction<ScoreMode>>;
	cvScoreInput: string;
	setCvScoreInput: Dispatch<SetStateAction<string>>;
	onClearCvScoreFilters: () => void;
	photoDropdownRef: RefObject<HTMLDivElement | null>;
	photoDropdownOpen: boolean;
	setPhotoDropdownOpen: Dispatch<SetStateAction<boolean>>;
	activePhotoQuickState: ActivePhotoQuickState;
	photoQuickLabel: string;
	applyPhotoQuickFilter: (next: QuickFilterAction) => void;
	photoScoreMode: ScoreMode;
	setPhotoScoreMode: Dispatch<SetStateAction<ScoreMode>>;
	photoScoreInput: string;
	setPhotoScoreInput: Dispatch<SetStateAction<string>>;
	onClearPhotoScoreFilters: () => void;
};

export function LocalQuickFilters({
	premiumDropdownRef,
	premiumDropdownOpen,
	setPremiumDropdownOpen,
	activePremiumValue,
	applyPremiumQuickFilter,
	cvDropdownRef,
	cvDropdownOpen,
	setCvDropdownOpen,
	activeCvQuickState,
	cvQuickLabel,
	applyCvQuickFilter,
	cvScoreMode,
	setCvScoreMode,
	cvScoreInput,
	setCvScoreInput,
	onClearCvScoreFilters,
	photoDropdownRef,
	photoDropdownOpen,
	setPhotoDropdownOpen,
	activePhotoQuickState,
	photoQuickLabel,
	applyPhotoQuickFilter,
	photoScoreMode,
	setPhotoScoreMode,
	photoScoreInput,
	setPhotoScoreInput,
	onClearPhotoScoreFilters,
}: LocalQuickFiltersProps) {
	return (
		<div className="flex gap-1">
			{/* Premium quick filter */}
			<div className="relative shrink-0" ref={premiumDropdownRef}>
				<button
					onClick={() => setPremiumDropdownOpen((v) => !v)}
					className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-md border transition-colors cursor-pointer ${
						activePremiumValue
							? "border-transparent text-gray-500 bg-gray-200"
							: "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 bg-white dark:bg-gray-900"
					}`}
				>
					{activePremiumValue === "true" ? (
						<BadgeCheck className="w-3 h-3 text-amber-500 shrink-0" />
					) : activePremiumValue === "false" ? (
						<BadgeCheck className="w-3 h-3 text-gray-400 shrink-0" />
					) : (
						<BadgeCheck className="w-3 h-3 opacity-50 shrink-0" />
					)}
					{activePremiumValue === "true"
						? "Premium: Oui"
						: activePremiumValue === "false"
							? "Premium: Non"
							: "Premium"}
					{activePremiumValue ? (
						<span
							onClick={(e) => {
								e.stopPropagation();
								applyPremiumQuickFilter(null);
							}}
							className="ml-1 opacity-70 hover:opacity-100 cursor-pointer"
						>
							×
						</span>
					) : (
						<svg
							width="10"
							height="10"
							viewBox="0 0 10 10"
							fill="currentColor"
							className="opacity-50"
						>
							<path
								d="M1 3l4 4 4-4"
								stroke="currentColor"
								strokeWidth="1.5"
								fill="none"
								strokeLinecap="round"
							/>
						</svg>
					)}
				</button>

				{premiumDropdownOpen && (
					<div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 min-w-40">
						<div className="px-2.5 py-1 flex items-center justify-between">
							<span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
								Premium
							</span>
							{activePremiumValue && (
								<button
									onClick={() => {
										applyPremiumQuickFilter(null);
										setPremiumDropdownOpen(false);
									}}
									className="text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
								>
									Effacer
								</button>
							)}
						</div>
						<div className="h-px bg-border mb-1" />

						{[
							{ label: "Oui", value: "true" as const },
							{ label: "Non", value: "false" as const },
						].map((opt) => {
							const checked = activePremiumValue === opt.value;
							return (
								<button
									key={opt.value}
									onClick={() => {
										applyPremiumQuickFilter(opt.value);
										setPremiumDropdownOpen(false);
									}}
									className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors cursor-pointer ${
										checked
											? "font-medium text-foreground bg-muted/30"
											: "text-muted-foreground hover:bg-muted/50"
									}`}
								>
									<span
										className={`flex items-center justify-center w-3.5 h-3.5 rounded border shrink-0 transition-colors ${
											checked
												? "border-transparent bg-gray-200"
												: "border-gray-300 dark:border-gray-600"
										}`}
									>
										{checked && (
											<svg width="8" height="8" viewBox="0 0 8 8" fill="none">
												<path
													d="M1.5 4l2 2 3-3"
													stroke="gray"
													strokeWidth="1.5"
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
											</svg>
										)}
									</span>
									{opt.label}
								</button>
							);
						})}
					</div>
				)}
			</div>

			{/* CV quick filter */}
			<div className="relative shrink-0" ref={cvDropdownRef}>
				<button
					onClick={() => setCvDropdownOpen((v) => !v)}
					className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-md border transition-colors cursor-pointer ${
						activeCvQuickState.active
							? "border-transparent text-gray-500 bg-gray-200"
							: "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 bg-white dark:bg-gray-900"
					}`}
				>
					<FileText className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />
					{cvQuickLabel}
					{activeCvQuickState.active ? (
						<span
							onClick={(e) => {
								e.stopPropagation();
								applyCvQuickFilter({ type: "clear" });
							}}
							className="ml-1 opacity-70 hover:opacity-100 cursor-pointer"
						>
							×
						</span>
					) : (
						<svg
							width="10"
							height="10"
							viewBox="0 0 10 10"
							fill="currentColor"
							className="opacity-50"
						>
							<path
								d="M1 3l4 4 4-4"
								stroke="currentColor"
								strokeWidth="1.5"
								fill="none"
								strokeLinecap="round"
							/>
						</svg>
					)}
				</button>

				{cvDropdownOpen && (
					<div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 min-w-70">
						<div className="px-2.5 py-1 flex items-center justify-between">
							<span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
								CV
							</span>
							{activeCvQuickState.active && (
								<button
									onClick={() => {
										applyCvQuickFilter({ type: "clear" });
										setCvDropdownOpen(false);
									}}
									className="text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
								>
									Effacer
								</button>
							)}
						</div>
						<div className="h-px bg-border mb-1" />

						{[
							{ label: "Avec CV", mode: "with" as const },
							{ label: "Sans CV", mode: "without" as const },
						].map((opt) => {
							const checked =
								(opt.mode === "with" && activeCvQuickState.hasCv) ||
								(opt.mode === "without" && activeCvQuickState.withoutCv);

							return (
								<button
									key={`${opt.mode}-${opt.label}`}
									onClick={() => {
										if (opt.mode === "with") applyCvQuickFilter({ type: "with" });
										else if (opt.mode === "without")
											applyCvQuickFilter({ type: "without" });

										setCvDropdownOpen(false);
									}}
									className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] transition-colors cursor-pointer ${
										checked
											? "font-medium text-foreground bg-muted/30"
											: "text-muted-foreground hover:bg-muted/50"
									}`}
								>
									<span
										className={`flex items-center justify-center w-3.5 h-3.5 rounded border shrink-0 transition-colors ${
											checked
												? "border-transparent bg-gray-200"
												: "border-gray-300 dark:border-gray-600"
										}`}
									>
										{checked && (
											<svg width="8" height="8" viewBox="0 0 8 8" fill="none">
												<path
													d="M1.5 4l2 2 3-3"
													stroke="gray"
													strokeWidth="1.5"
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
											</svg>
										)}
									</span>
									{opt.label}
								</button>
							);
						})}

						<div className="h-px bg-border my-1" />

						<div className="pt-1">
							<div className="text-[10px] px-2.5 text-muted-foreground mb-1.5">
								état cv
							</div>
							<div className="space-y-1">
								{[
									{ label: "Nouveau", value: "Nouveau" as const },
									{ label: "Valide", value: "Valid" as const },
									{ label: "Non Valide", value: "Non_Valide" as const },
									{ label: "Supprimée", value: "Supprimée" as const },
								].map((opt) => {
									const checked = activeCvQuickState.etatCvs.includes(opt.value);

									return (
										<button
											key={`cv-statut-${opt.value}`}
											onClick={() => {
												applyCvQuickFilter({
													type: "toggle-etat",
													value: opt.value,
												});
											}}
											className={`w-full flex items-center gap-2 px-3 py-1 text-[11px] transition-colors cursor-pointer rounded-md ${
												checked
													? "font-medium text-foreground bg-muted/30"
													: "text-muted-foreground hover:bg-muted/50"
											}`}
										>
											<span
												className={`flex items-center justify-center w-3.5 h-3.5 rounded border shrink-0 transition-colors ${
													checked
														? "border-transparent bg-gray-200"
														: "border-gray-300 dark:border-gray-600"
												}`}
											>
												{checked && (
													<svg width="8" height="8" viewBox="0 0 8 8" fill="none">
														<path
															d="M1.5 4l2 2 3-3"
															stroke="gray"
															strokeWidth="1.5"
															strokeLinecap="round"
															strokeLinejoin="round"
														/>
													</svg>
												)}
											</span>
											{opt.label}
										</button>
									);
								})}
							</div>
						</div>

						<div className="h-px bg-border my-1" />

						<div className="pt-1">
							<div className="text-[10px] px-2.5 text-muted-foreground mb-1.5">
								Score
							</div>
							<div className="space-y-1">
								{[
									{ label: "En cours", value: "en_cours" as const },
									{
										label: "Erreur correction",
										value: "error_correction" as const,
									},
									{ label: "Non CV", value: "non_cv" as const },
								].map((opt) => {
									const checked = activeCvQuickState.scoreState === opt.value;
									return (
										<button
											key={`score-status-${opt.value}`}
											onClick={() => {
												applyCvQuickFilter({
													type: "score-state",
													value: opt.value,
												});
												setCvDropdownOpen(false);
											}}
											className={`w-full flex items-center gap-2 px-3 py-1 text-[11px] transition-colors cursor-pointer rounded-md ${
												checked
													? "font-medium text-foreground bg-muted/30"
													: "text-muted-foreground hover:bg-muted/50"
											}`}
										>
											<span
												className={`flex items-center justify-center w-3.5 h-3.5 rounded border shrink-0 transition-colors ${
													checked
														? "border-transparent bg-gray-200"
														: "border-gray-300 dark:border-gray-600"
												}`}
											>
												{checked && (
													<svg width="8" height="8" viewBox="0 0 8 8" fill="none">
														<path
															d="M1.5 4l2 2 3-3"
															stroke="gray"
															strokeWidth="1.5"
															strokeLinecap="round"
															strokeLinejoin="round"
														/>
													</svg>
												)}
											</span>
											{opt.label}
										</button>
									);
								})}
							</div>
						</div>

						<div className="h-px bg-border my-1" />

						<div className="px-2.5 pt-1 pb-2">
							<div className="text-[10px] text-muted-foreground mb-1.5">
								Score CV
							</div>
							<div className="flex items-center gap-1.5">
								<Select
									value={cvScoreMode}
									indicatorVisibility={false}
									onValueChange={(value) =>
										setCvScoreMode(value as "equals" | "min" | "max")
									}
								>
									<SelectTrigger className="h-7! py-0! rounded-md! w-17! px-1.5 text-[9px]! [&>svg]:h-3 [&>svg]:w-3">
										<span className="leading-none truncate">
											{cvScoreMode === "equals"
												? "Equal (=)"
												: cvScoreMode === "min"
													? "Min (<)"
													: "Max (>)"}
										</span>
									</SelectTrigger>
									<SelectContent className="text-[10px]">
										<SelectItem
											value="equals"
											className="text-[10px] py-1.5 ps-2! pe-2!"
										>
											<span className="flex items-center gap-1.5">
												<span
													className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${
														cvScoreMode === "equals"
															? "border-gray-500"
															: "border-gray-300 dark:border-gray-600"
													}`}
												>
													{cvScoreMode === "equals" && (
														<span className="w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-gray-300" />
													)}
												</span>
												Equals (=)
											</span>
										</SelectItem>
										<SelectItem
											value="min"
											className="text-[10px] py-1.5 ps-2! pe-2!"
										>
											<span className="flex items-center gap-1.5">
												<span
													className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${
														cvScoreMode === "min"
															? "border-gray-500"
															: "border-gray-300 dark:border-gray-600"
													}`}
												>
													{cvScoreMode === "min" && (
														<span className="w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-gray-300" />
													)}
												</span>
												Minimum (&lt;)
											</span>
										</SelectItem>
										<SelectItem
											value="max"
											className="text-[10px] py-1.5 ps-2! pe-2!"
										>
											<span className="flex items-center gap-1.5">
												<span
													className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${
														cvScoreMode === "max"
															? "border-gray-500"
															: "border-gray-300 dark:border-gray-600"
													}`}
												>
													{cvScoreMode === "max" && (
														<span className="w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-gray-300" />
													)}
												</span>
												Maximum (&gt;)
											</span>
										</SelectItem>
									</SelectContent>
								</Select>
								<div className="relative flex-1">
									<input
										type="text"
										value={cvScoreInput}
										onChange={(e) => setCvScoreInput(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												applyCvQuickFilter({
													type: "score",
													value: cvScoreInput,
													mode: cvScoreMode,
												});
												setCvDropdownOpen(false);
											}
										}}
										placeholder="Ex: 50"
										className="h-7 w-full rounded-md border border-border bg-background px-2 pr-7 text-xs outline-none focus:ring-1 focus:ring-gray-300"
									/>
									{!!cvScoreInput && (
										<button
											onClick={() => {
												setCvScoreInput("");
												onClearCvScoreFilters();
											}}
											className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded hover:bg-muted/60 transition-colors"
											title="Effacer"
										>
											<X className="w-3 h-3 text-muted-foreground" />
										</button>
									)}
								</div>
								<button
									onClick={() => {
										applyCvQuickFilter({
											type: "score",
											value: cvScoreInput,
											mode: cvScoreMode,
										});
										setCvDropdownOpen(false);
									}}
									className="h-7 px-2 rounded-md text-[11px] cursor-pointer border border-border hover:bg-muted/50 transition-colors"
								>
									OK
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
