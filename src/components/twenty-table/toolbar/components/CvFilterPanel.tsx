import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { activeFiltersAtom, type ActiveFilter } from "../states/toolbarState";
import type { ColumnDefinition } from "../../types";
import { ChevronLeft, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

interface CvFilterPanelProps {
  column: ColumnDefinition;
  onBack: () => void;
}

const CV_STATE_OPTIONS = [
  { label: "Nouveau", value: "Nouveau", color: "bg-gray-500" },
  { label: "Valide", value: "Valid", color: "bg-green-500" },
  { label: "Non Valide", value: "Non_Valide", color: "bg-orange-500" },
  { label: "Supprimée", value: "Supprimée", color: "bg-red-500" },
];

const SCORE_STATE_OPTIONS = [
  { label: "En cours", value: "en_cours" },
  { label: "Erreur correction", value: "error_correction" },
  { label: "Non CV", value: "non_cv" },
];

export const CvFilterPanel = ({ column, onBack }: CvFilterPanelProps) => {
  const [filters, setFilters] = useAtom(activeFiltersAtom);
  const [selectedCvPresence, setSelectedCvPresence] = useState<
    "with" | "without" | null
  >(null);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedScoreState, setSelectedScoreState] = useState<string | null>(
    null,
  );
  const [scoreValue, setScoreValue] = useState("");
  const [scoreMode, setScoreMode] = useState<"equals" | "min" | "max">(
    "equals",
  );

  useEffect(() => {
    const cvFilter = filters.find((f) => f.fieldName === "cv");
    const rawCv = String(cvFilter?.value ?? "").toLowerCase().trim();
    if (rawCv === "avec_cv" || rawCv === "true" || rawCv === "1") {
      setSelectedCvPresence("with");
    } else if (rawCv === "sans_cv" || rawCv === "false" || rawCv === "0") {
      setSelectedCvPresence("without");
    } else {
      setSelectedCvPresence(null);
    }

    const current = filters
      .filter((f) => f.fieldName === "etatCV")
      .map((f) => String(f.value ?? "").trim())
      .filter(Boolean);
    setSelectedStates(Array.from(new Set(current)));

    const cvScoreFilter =
      filters.find((f) => f.fieldName === "cvScoreEquals") ||
      filters.find((f) => f.fieldName === "cvScore");
    const cvScoreMinFilter = filters.find((f) => f.fieldName === "cvScoreMin");
    const cvScoreMaxFilter = filters.find((f) => f.fieldName === "cvScoreMax");
    const scoreRaw = String(cvScoreFilter?.value ?? "").trim();
    const scoreMinRaw = String(cvScoreMinFilter?.value ?? "").trim();
    const scoreMaxRaw = String(cvScoreMaxFilter?.value ?? "").trim();

    if (/^\d+$/.test(scoreRaw)) {
      setScoreMode("equals");
      setScoreValue(scoreRaw);
    } else if (/^\d+$/.test(scoreMinRaw)) {
      setScoreMode("min");
      setScoreValue(scoreMinRaw);
    } else if (/^\d+$/.test(scoreMaxRaw)) {
      setScoreMode("max");
      setScoreValue(scoreMaxRaw);
    } else {
      setScoreMode("equals");
      setScoreValue("");
    }

    if (current.length === 1) {
      const etat = current[0];
      if (scoreRaw.toLowerCase() === "null" && etat === "Nouveau") {
        setSelectedScoreState("en_cours");
      } else if (scoreRaw === "0" && etat === "Valid") {
        setSelectedScoreState("error_correction");
      } else if (scoreRaw === "0" && etat === "Non_Valide") {
        setSelectedScoreState("non_cv");
      } else {
        setSelectedScoreState(null);
      }
    } else {
      setSelectedScoreState(null);
    }
  }, [filters, column.fieldName]);

  const handleToggleState = (value: string) => {
    setSelectedScoreState(null);
    setSelectedStates((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const handleToggleScoreState = (value: string) => {
    if (selectedScoreState === value) {
      setSelectedScoreState(null);
      return;
    }

    const map: Record<string, { etatCV: string; cvScore: string }> = {
      en_cours: { etatCV: "Nouveau", cvScore: "null" },
      error_correction: { etatCV: "Valid", cvScore: "0" },
      non_cv: { etatCV: "Non_Valide", cvScore: "0" },
    };
    const mapped = map[value];
    if (!mapped) return;

    setSelectedScoreState(value);
    setSelectedStates([mapped.etatCV]);
    setScoreMode("equals");
    setScoreValue("");
  };

  const handleApplyFilters = () => {
    const nextFilters: ActiveFilter[] = [];

    if (selectedCvPresence === "with") {
      nextFilters.push({
        id: `filter-cv-with-${Date.now()}`,
        fieldName: "cv",
        label: "CV",
        type: column.type,
        value: "avec_cv",
        operator: "equals",
      });
    }
    if (selectedCvPresence === "without") {
      nextFilters.push({
        id: `filter-cv-without-${Date.now()}`,
        fieldName: "cv",
        label: "CV",
        type: column.type,
        value: "sans_cv",
        operator: "equals",
      });
    }

    nextFilters.push(
      ...selectedStates.map((value) => ({
        id: `filter-etat-cv-${value}-${Date.now()}`,
        fieldName: "etatCV",
        label: "État CV",
        type: "SELECT" as const,
        value,
        operator: "equals" as const,
      })),
    );

    if (selectedScoreState) {
      const map: Record<string, { etatCV: string; cvScore: string }> = {
        en_cours: { etatCV: "Nouveau", cvScore: "null" },
        error_correction: { etatCV: "Valid", cvScore: "0" },
        non_cv: { etatCV: "Non_Valide", cvScore: "0" },
      };
      const mapped = map[selectedScoreState];
      if (mapped) {
        nextFilters.push({
          id: `filter-score-state-etat-${Date.now()}`,
          fieldName: "etatCV",
          label: "État CV",
          type: "SELECT",
          value: mapped.etatCV,
          operator: "equals",
        });
        nextFilters.push({
          id: `filter-score-state-cv-score-${Date.now()}`,
          fieldName: "cvScoreEquals",
          label: "Score CV",
          type: "NUMBER",
          value: mapped.cvScore,
          operator: "equals",
        });
      }
    }

    const scoreNum = Number(scoreValue);
    if (
      scoreValue !== "" &&
      Number.isFinite(scoreNum) &&
      scoreNum >= 0 &&
      scoreNum <= 100
    ) {
      const fieldName =
        scoreMode === "min"
          ? "cvScoreMin"
          : scoreMode === "max"
            ? "cvScoreMax"
            : "cvScoreEquals";
      const scoreLabel =
        scoreMode === "min"
          ? "Score CV minimum"
          : scoreMode === "max"
            ? "Score CV maximum"
            : "Score CV";

      nextFilters.push({
        id: `filter-cv-score-${fieldName}-${Date.now()}`,
        fieldName,
        label: scoreLabel,
        type: "NUMBER",
        value: String(Math.round(scoreNum)),
        operator: "equals",
      });
    }

    setFilters((prev) => [
      ...prev.filter(
        (f) =>
          f.fieldName !== "cv" &&
          f.fieldName !== "etatCV" &&
          f.fieldName !== "cvScore" &&
          f.fieldName !== "cvScoreEquals" &&
          f.fieldName !== "cvScoreMin" &&
          f.fieldName !== "cvScoreMax",
      ),
      ...nextFilters,
    ]);
    onBack();
  };

  return (
    <div className="w-full flex flex-col h-full bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl">
      {/* Header */}
      <div className="px-1 py-1.5 border-b border-white/30 dark:border-white/20 flex items-center gap-1">
        <button
          onClick={onBack}
          className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors shrink-0"
        >
          <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400" />
        </button>
        <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100">
          {column.label}
        </h3>
      </div>

      <div className="px-1.5 py-1">
        <div className="text-[10px] px-1 text-gray-500 dark:text-gray-400 mb-1.5">
          Présence CV
        </div>
        {[
          { label: "Avec CV", value: "with" as const },
          { label: "Sans CV", value: "without" as const },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() =>
              setSelectedCvPresence((prev) => (prev === opt.value ? null : opt.value))
            }
            className={`flex items-center h-7 px-2 py-0 text-[11px] text-left border-none cursor-pointer transition-colors rounded-sm gap-1.5 w-full ${
              selectedCvPresence === opt.value
                ? "bg-gray-100/70 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200"
                : "bg-transparent text-gray-700 dark:text-gray-100 hover:bg-white/10 dark:hover:bg-white/8"
            }`}
          >
            <span
              className={`flex items-center justify-center w-3 h-3 rounded border shrink-0 transition-colors ${
                selectedCvPresence === opt.value
                  ? "border-gray-500 bg-gray-500 text-white"
                  : "border-gray-400 dark:border-gray-500 bg-transparent"
              }`}
            >
              {selectedCvPresence === opt.value && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="flex-1">{opt.label}</span>
          </button>
        ))}
      </div>

      <div className="h-px bg-gray-200/70 dark:bg-white/10 mx-2" />

      {/* État CV options */}
      <div className="px-1.5 py-1">
        <div className="text-[10px] px-1 text-gray-500 dark:text-gray-400 mb-1.5">
          état cv
        </div>
        {CV_STATE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleToggleState(opt.value)}
            className={`flex items-center h-7 px-2 py-0 text-[11px] text-left border-none cursor-pointer transition-colors rounded-sm gap-1.5 w-full ${
              selectedStates.includes(opt.value)
                ? "bg-gray-100/70 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200"
                : "bg-transparent text-gray-700 dark:text-gray-100 hover:bg-white/10 dark:hover:bg-white/8"
            }`}
          >
            <span
              className={`flex items-center justify-center w-3 h-3 rounded border shrink-0 transition-colors ${
                selectedStates.includes(opt.value)
                  ? "border-gray-500 bg-gray-500 text-white"
                  : "border-gray-400 dark:border-gray-500 bg-transparent"
              }`}
            >
              {selectedStates.includes(opt.value) && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path
                    d="M1.5 4l2 2 3-3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span className="flex-1">{opt.label}</span>
          </button>
        ))}
      </div>

      <div className="h-px bg-gray-200/70 dark:bg-white/10 mx-2" />

      <div className="px-1.5 py-1">
        <div className="text-[10px] px-1 text-gray-500 dark:text-gray-400 mb-1.5">
          Score
        </div>
        {SCORE_STATE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleToggleScoreState(opt.value)}
            className={`flex items-center h-7 px-2 py-0 text-[11px] text-left border-none cursor-pointer transition-colors rounded-sm gap-1.5 w-full ${
              selectedScoreState === opt.value
                ? "bg-gray-100/70 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200"
                : "bg-transparent text-gray-700 dark:text-gray-100 hover:bg-white/10 dark:hover:bg-white/8"
            }`}
          >
            <span
              className={`flex items-center justify-center w-3 h-3 rounded border shrink-0 transition-colors ${
                selectedScoreState === opt.value
                  ? "border-gray-500 bg-gray-500 text-white"
                  : "border-gray-400 dark:border-gray-500 bg-transparent"
              }`}
            >
              {selectedScoreState === opt.value && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="flex-1">{opt.label}</span>
          </button>
        ))}
      </div>

      <div className="h-px bg-gray-200/70 dark:bg-white/10 mx-2" />

      <div className="px-1.5 py-1">
        <div className="text-[10px] text-gray-500 dark:text-gray-400 px-1 pb-1">Score CV</div>
        <div className="flex items-center gap-1.5">
          <Select
            value={scoreMode}
            indicatorVisibility={false}
            onValueChange={(value) =>
              setScoreMode(value as "equals" | "min" | "max")
            }
          >
            <SelectTrigger className="h-7! py-0! rounded-md! w-18! px-1.5 text-[10px]! [&>svg]:h-3 [&>svg]:w-3">
              <span className="leading-none truncate">
                {scoreMode === "equals"
                  ? "Equal (=)"
                  : scoreMode === "min"
                    ? "Min (<)"
                    : "Max (>)"}
              </span>
            </SelectTrigger>
            <SelectContent className="text-[10px]">
              <SelectItem value="equals" className="text-[10px] py-1.5 ps-2! pe-2!">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${
                      scoreMode === "equals"
                        ? "border-gray-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {scoreMode === "equals" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-gray-300" />
                    )}
                  </span>
                  Equals (=)
                </span>
              </SelectItem>
              <SelectItem value="min" className="text-[10px] py-1.5 ps-2! pe-2!">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${
                      scoreMode === "min"
                        ? "border-gray-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {scoreMode === "min" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-gray-300" />
                    )}
                  </span>
                  Minimum (&lt;)
                </span>
              </SelectItem>
              <SelectItem value="max" className="text-[10px] py-1.5 ps-2! pe-2!">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${
                      scoreMode === "max"
                        ? "border-gray-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {scoreMode === "max" && (
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
              type="number"
              min={0}
              max={100}
              step={1}
              value={scoreValue}
              onChange={(e) => setScoreValue(e.target.value)}
              placeholder="Ex: 50"
              className="w-full bg-transparent border border-gray-200 dark:border-white/10 rounded px-2 pr-7 py-1.5 text-[11px] text-gray-900 dark:text-gray-100 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:focus:border-white/20 transition-colors"
            />
            {!!scoreValue && (
              <button
                onClick={() => {
                  setScoreValue("");
                  setFilters((prev) =>
                    prev.filter(
                      (f) =>
                        f.fieldName !== "cvScore" &&
                        f.fieldName !== "cvScoreEquals" &&
                        f.fieldName !== "cvScoreMin" &&
                        f.fieldName !== "cvScoreMax",
                    ),
                  );
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded hover:bg-muted/60 transition-colors"
                title="Effacer"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Apply filter button */}
      <div className="px-2 py-1.5 border-t border-white/30 dark:border-white/20">
        <button
          onClick={handleApplyFilters}
          className="w-full px-3 py-1.5 bg-gray-200/80 border border-gray-300/60 text-gray-600 text-[11px] font-medium rounded cursor-pointer hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Appliquer filtre
        </button>
      </div>
    </div>
  );
};
