/**
 * CandidatsPage V2 — Admin users list using twenty-table.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAtom } from "jotai";
import { toast } from "sonner";

import {
  RecordTable,
  RecordTableContext,
  useRecordTableSetup,
} from "@/components/twenty-table";
import { SidePanelForDesktop } from "./local/side-panel/components/SidePanelForDesktop";
import { LocalRecordTableViewBar } from "../components/toolbar";
import {
  useNavigateSidePanel,
  useOpenCreateInSidePanel,
  useOpenRecordInSidePanel,
  useSidePanelMenu,
} from "./local/side-panel/hooks";
import { LocalCommandMenu } from "./panels/command-menu/CommandMenuPanelPage";
import { LocalCreateCandidatPanel } from "./panels/add-user/CreateUserPanelPage";

// Sentinel recordIds — route local panels through the same SidePanelForDesktop slot
// as the Ecole / Candidat detail panels, so all panels are mutually exclusive.
const LOCAL_CMD_MENU_RECORD_ID = "__local_cmd_menu__";
const LOCAL_CREATE_RECORD_ID = "__local_create_candidat__";
import { SidePanelPage } from "./local/side-panel/states";

import {
  useToolbarStateSync,
  useInitializeHiddenColumns,
} from "../hooks/useToolbarStateSync";
import { useKeyboardPagination } from "../hooks/useKeyboardPagination";

// ── Dialogs ──
import { SupprimerDialog } from "../../shared/supprimer-dialog";
import { AffecterPremiumDialog } from "../../shared/affecter-premium-dialog";
import { CandidatSidePanelPage } from "./panels/user-details/UserSidePanelPage";
import { EcoleSidePanelPage } from "./panels/ecole/EcoleSidePanelPage";

// ── Local hooks ──
import {
  useCandidatsRecords,
  useCreateCandidat,
  useCandidatCellChange,
  useCandidatBulkActions,
  useTypeContratOptions,
  useTypeStageOptions,
} from "./hooks";

// ── Shared components ──
import { RecordTablePagination } from "../components/RecordTablePagination";

import { CANDIDATS_COLUMNS as BASE_COLUMNS } from "./cells/constants";
import { CvEnCoursBadge } from "./cells/CvEnCoursBadge";
import { EtatCandidatCell } from "./cells/EtatCandidatCell";
import { LoginSourceCell } from "./cells/LoginSourceCell";
import { ScoreGaugeCell } from "./cells/ScoreGaugeCell";
import { searchUsersByName, STATIC_NIVEAUX_ETUDES } from "../../../data/users";
import {
  PageSpotlightSearch,
  type PageSearchConfig,
} from "@/components/spotlight-search/PageSpotlightSearch";
import {
  activeFiltersAtom,
  type ActiveFilter,
} from "@/components/twenty-table/toolbar/states/toolbarState";
import { LocalCvsTab } from "./pages/CVs";
import { LocalImagesTab } from "./pages/Images";
import { UsersHeaderTabs } from "./header/header-tabs/header-tabs";
import { LocalQuickFilters } from "./header/header-filters/header-filters";
import { LocalSelectionActionBar } from "../../shared/actions-bar";
import { PhoneCell } from "./local/cells/PhoneCell";

const SOFT_AVATAR_COLORS = [
  "bg-red-100 ring-red-200/60 dark:bg-red-900/25 dark:ring-red-800/40",
  "bg-orange-100 ring-orange-200/60 dark:bg-orange-900/25 dark:ring-orange-800/40",
  "bg-amber-100 ring-amber-200/60 dark:bg-amber-900/25 dark:ring-amber-800/40",
  "bg-lime-100 ring-lime-200/60 dark:bg-lime-900/25 dark:ring-lime-800/40",
  "bg-green-100 ring-green-200/60 dark:bg-green-900/25 dark:ring-green-800/40",
  "bg-gray-100 ring-gray-200/60 dark:bg-gray-900/25 dark:ring-gray-800/40",
  "bg-teal-100 ring-teal-200/60 dark:bg-teal-900/25 dark:ring-teal-800/40",
  "bg-cyan-100 ring-cyan-200/60 dark:bg-cyan-900/25 dark:ring-cyan-800/40",
  "bg-sky-100 ring-sky-200/60 dark:bg-sky-900/25 dark:ring-sky-800/40",
  "bg-blue-100 ring-blue-200/60 dark:bg-blue-900/25 dark:ring-blue-800/40",
  "bg-indigo-100 ring-indigo-200/60 dark:bg-indigo-900/25 dark:ring-indigo-800/40",
  "bg-violet-100 ring-violet-200/60 dark:bg-violet-900/25 dark:ring-violet-800/40",
  "bg-fuchsia-100 ring-fuchsia-200/60 dark:bg-fuchsia-900/25 dark:ring-fuchsia-800/40",
  "bg-pink-100 ring-pink-200/60 dark:bg-pink-900/25 dark:ring-pink-800/40",
  "bg-rose-100 ring-rose-200/60 dark:bg-rose-900/25 dark:ring-rose-800/40",
] as const;

function getSoftAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return SOFT_AVATAR_COLORS[hash % SOFT_AVATAR_COLORS.length];
}

function LocalGsmEditableCell({
  recordId,
  value,
}: {
  recordId: string;
  value: string;
}) {
  const [isEditMode, setIsEditMode] = useState(false);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setIsEditMode(true);
      }}
      className="w-full h-full"
    >
      <PhoneCell
        recordId={recordId}
        fieldName="gsm"
        value={String(value || "")}
        isEditMode={isEditMode}
        onClose={() => setIsEditMode(false)}
      />
    </div>
  );
}

// ── CandidatAvatarDisplay — photo thumbnail + name with hover preview ──
function CandidatAvatarDisplay({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl: string | null;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewPos, setPreviewPos] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!chipRef.current) return;
    const rect = chipRef.current.getBoundingClientRect();
    setPreviewPos({ top: rect.top - 8, left: rect.left });
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!photoUrl) return;
    updatePosition();
    timeoutRef.current = setTimeout(() => setShowPreview(true), 350);
  }, [photoUrl, updatePosition]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowPreview(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!name && !photoUrl) {
    return (
      <div className="flex items-center h-5 max-w-full overflow-hidden whitespace-nowrap text-[11.5px] text-gray-300 dark:text-gray-500">
        —
      </div>
    );
  }

  const initial = name?.charAt(0)?.toUpperCase() || "?";
  const fallbackColor = getSoftAvatarColor(name || "default");

  return (
    <div className="flex items-center h-7 max-w-full group/cand">
      <span
        ref={chipRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="
          inline-flex items-center gap-1.5 max-w-full
          px-1.5 py-1 rounded-lg
          bg-white dark:bg-gray-800/80
          ring-1 ring-inset ring-gray-200/70 dark:ring-gray-700/50
          shadow-sm shadow-gray-200/50 dark:shadow-black/10
          transition-all duration-200
          group-hover/cand:shadow-md group-hover/cand:ring-gray-300/40 dark:group-hover/cand:ring-gray-600/30
        "
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className="w-4 h-4 rounded-full object-cover shrink-0 ring-1 ring-gray-200/80 dark:ring-gray-600/50"
          />
        ) : (
          <div
            className={`
              w-4 h-4 rounded-full shrink-0 flex items-center justify-center
              text-[9px] font-bold text-gray-700 dark:text-gray-300
              ring-1 ring-inset pt-0.5
              ${fallbackColor}
            `}
          >
            {initial}
          </div>
        )}
        <span className="text-[10px] font-medium text-gray-700 dark:text-gray-200 truncate">
          {name}
        </span>
      </span>

      {/* Portal-based hover photo preview */}
      {photoUrl &&
        showPreview &&
        createPortal(
          <div
            className="fixed z-9999 pointer-events-none transition-all duration-200 ease-out opacity-100 scale-100"
            style={{
              top: previewPos.top,
              left: previewPos.left,
              transform: "translateY(-100%)",
            }}
          >
            <div className="rounded-xl w-32 overflow-hidden shadow-2xl ring-1 ring-black/10 dark:ring-white/15 bg-white dark:bg-gray-900">
              <div className="w-32 h-32 overflow-hidden">
                <img
                  src={photoUrl}
                  alt={name}
                  className="w-full h-full object-cover object-center"
                />
              </div>
              <div className="px-2.5 py-1.5 text-center border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate max-w-32">
                  {name}
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

type UsersPageProps = {
  leftHeaderSlot?: ReactNode;
  rightHeaderSlot?: ReactNode;
};

export function UsersPage({
  leftHeaderSlot,
  rightHeaderSlot,
}: UsersPageProps = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const tablePanelRef = useRef<HTMLDivElement>(null);
  const [activeFilters, setActiveFilters] = useAtom(activeFiltersAtom);

  // ── Sub-tab derived from URL ──
  const activeSubTab = useMemo(() => {
    const p = location.pathname;
    if (p.includes("liste-cvs")) return "cvs";
    if (p.includes("images")) return "images";
    return "liste";
  }, [location.pathname]);

  const showSubTabs = !location.pathname.includes("/admin/utilisateurs/liste");

  // ── Premium quick filter dropdown ──
  const [premiumDropdownOpen, setPremiumDropdownOpen] = useState(false);
  const premiumDropdownRef = useRef<HTMLDivElement>(null);

  const activePremiumValue = useMemo(() => {
    const premiumFilter = activeFilters.find((f) => f.fieldName === "premium");
    const v = String(premiumFilter?.value ?? "").toLowerCase();
    if (v === "true" || v === "oui" || v === "1") return "true";
    if (v === "false" || v === "non" || v === "0") return "false";
    return null;
  }, [activeFilters]);

  const applyPremiumQuickFilter = useCallback(
    (value: "true" | "false" | null) => {
      const base = activeFilters.filter((f) => f.fieldName !== "premium");

      if (!value) {
        setActiveFilters(base);
        return;
      }

      const premiumFilter: ActiveFilter = {
        id: "quick-premium",
        fieldName: "premium",
        operator: "equals",
        value,
        label: "Premium",
        type: "SELECT",
      };

      setActiveFilters([...base, premiumFilter]);
    },
    [activeFilters, setActiveFilters],
  );

  useEffect(() => {
    if (!premiumDropdownOpen) return;
    const handle = (e: MouseEvent) => {
      if (
        premiumDropdownRef.current &&
        !premiumDropdownRef.current.contains(e.target as Node)
      ) {
        setPremiumDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [premiumDropdownOpen]);

  // ── Photo quick filter dropdown ──
  const [photoDropdownOpen, setPhotoDropdownOpen] = useState(false);
  const photoDropdownRef = useRef<HTMLDivElement>(null);
  const [photoScoreInput, setPhotoScoreInput] = useState("");
  const [photoScoreMode, setPhotoScoreMode] = useState<
    "equals" | "min" | "max"
  >("equals");

  const activePhotoQuickState = useMemo(() => {
    const photoStateFilter = activeFilters.find(
      (f) => f.fieldName === "photoScore",
    );
    const legacyEtatPhotoFilter = activeFilters.find(
      (f) => f.fieldName === "etatPhoto",
    );
    const photoScoreEqualsFilter = activeFilters.find(
      (f) => f.fieldName === "photoScoreEquals",
    );
    const photoScoreMinFilter = activeFilters.find(
      (f) => f.fieldName === "photoScoreMin",
    );
    const photoScoreMaxFilter = activeFilters.find(
      (f) => f.fieldName === "photoScoreMax",
    );

    const rawPhoto = String(
      photoStateFilter?.value ?? legacyEtatPhotoFilter?.value ?? "",
    ).trim();
    const hasPhoto = rawPhoto === "avec_photo";
    const withoutPhoto = rawPhoto === "sans_photo";
    const etatPhoto =
      rawPhoto === "Nouveau" ||
      rawPhoto === "Valid" ||
      rawPhoto === "Non_Valid" ||
      rawPhoto === "En_attente"
        ? rawPhoto
        : null;

    const scoreEqualsRaw = String(photoScoreEqualsFilter?.value ?? "").trim();
    const scoreMinRaw = String(photoScoreMinFilter?.value ?? "").trim();
    const scoreMaxRaw = String(photoScoreMaxFilter?.value ?? "").trim();

    let scoreState:
      | "en_cours"
      | "error_correction"
      | "non_photo_profile"
      | null = null;
    if (
      scoreEqualsRaw.toLowerCase() === "null" &&
      (etatPhoto === "Nouveau" || etatPhoto === "En_attente")
    ) {
      scoreState = "en_cours";
    } else if (scoreEqualsRaw === "0" && etatPhoto === "Valid") {
      scoreState = "error_correction";
    } else if (scoreEqualsRaw === "0" && etatPhoto === "Non_Valid") {
      scoreState = "non_photo_profile";
    }

    return {
      hasPhoto,
      withoutPhoto,
      etatPhoto,
      scoreEquals: scoreEqualsRaw || null,
      scoreMin: scoreMinRaw || null,
      scoreMax: scoreMaxRaw || null,
      scoreState,
      active:
        hasPhoto ||
        withoutPhoto ||
        Boolean(etatPhoto) ||
        Boolean(scoreEqualsRaw) ||
        Boolean(scoreMinRaw) ||
        Boolean(scoreMaxRaw),
    };
  }, [activeFilters]);

  useEffect(() => {
    if (activePhotoQuickState.scoreEquals) {
      setPhotoScoreMode("equals");
      setPhotoScoreInput(activePhotoQuickState.scoreEquals);
      return;
    }
    if (activePhotoQuickState.scoreMin) {
      setPhotoScoreMode("min");
      setPhotoScoreInput(activePhotoQuickState.scoreMin);
      return;
    }
    if (activePhotoQuickState.scoreMax) {
      setPhotoScoreMode("max");
      setPhotoScoreInput(activePhotoQuickState.scoreMax);
      return;
    }
    setPhotoScoreInput("");
  }, [
    activePhotoQuickState.scoreEquals,
    activePhotoQuickState.scoreMin,
    activePhotoQuickState.scoreMax,
  ]);

  const photoQuickLabel = useMemo(() => {
    if (activePhotoQuickState.scoreEquals)
      return `Photo score: ${activePhotoQuickState.scoreEquals}`;
    if (activePhotoQuickState.scoreMin)
      return `Photo min: ${activePhotoQuickState.scoreMin}`;
    if (activePhotoQuickState.scoreMax)
      return `Photo max: ${activePhotoQuickState.scoreMax}`;
    if (activePhotoQuickState.etatPhoto) {
      const mapLabel: Record<string, string> = {
        Nouveau: "Nouveau",
        Valid: "Validée",
        Non_Valid: "Non validée",
        En_attente: "En attente",
      };
      return `Photo: ${mapLabel[activePhotoQuickState.etatPhoto] ?? activePhotoQuickState.etatPhoto}`;
    }
    if (activePhotoQuickState.hasPhoto) return "Photo: Avec";
    if (activePhotoQuickState.withoutPhoto) return "Photo: Sans";
    return "Photo";
  }, [activePhotoQuickState]);

  const applyPhotoQuickFilter = useCallback(
    (next: {
      type:
        | "with"
        | "without"
        | "toggle-etat"
        | "score"
        | "score-state"
        | "clear";
      value?: string;
      mode?: "equals" | "min" | "max";
    }) => {
      const withoutPhotoState = activeFilters.filter(
        (f) => f.fieldName !== "photoScore",
      );
      const withoutPhotoScoreFilters = activeFilters.filter(
        (f) =>
          f.fieldName !== "photoScoreEquals" &&
          f.fieldName !== "photoScoreMin" &&
          f.fieldName !== "photoScoreMax",
      );
      const withoutPhotoFamily = activeFilters.filter(
        (f) =>
          f.fieldName !== "photoScore" &&
          f.fieldName !== "etatPhoto" &&
          f.fieldName !== "photoScoreEquals" &&
          f.fieldName !== "photoScoreMin" &&
          f.fieldName !== "photoScoreMax",
      );

      if (next.type === "clear") {
        setPhotoScoreInput("");
        setPhotoScoreMode("equals");
        setActiveFilters(withoutPhotoFamily);
        return;
      }

      if (next.type === "with") {
        const photoFilter: ActiveFilter = {
          id: "quick-photo",
          fieldName: "photoScore",
          operator: "equals",
          value: "avec_photo",
          label: "Photo",
          type: "PHOTO_SCORE",
        };
        setActiveFilters([...withoutPhotoState, photoFilter]);
        return;
      }

      if (next.type === "without") {
        const photoFilter: ActiveFilter = {
          id: "quick-photo",
          fieldName: "photoScore",
          operator: "equals",
          value: "sans_photo",
          label: "Photo",
          type: "PHOTO_SCORE",
        };
        setActiveFilters([...withoutPhotoState, photoFilter]);
        return;
      }

      if (next.type === "toggle-etat" && next.value) {
        const current = activePhotoQuickState.etatPhoto;
        if (current === next.value) {
          setActiveFilters(
            activeFilters.filter(
              (f) =>
                f.fieldName !== "photoScore" && f.fieldName !== "etatPhoto",
            ),
          );
          return;
        }
        const etatFilter: ActiveFilter = {
          id: `quick-etat-photo-${next.value}`,
          fieldName: "photoScore",
          operator: "equals",
          value: next.value,
          label: "État Photo",
          type: "SELECT",
        };
        setActiveFilters([
          ...activeFilters.filter(
            (f) => f.fieldName !== "photoScore" && f.fieldName !== "etatPhoto",
          ),
          etatFilter,
        ]);
        return;
      }

      if (next.type === "score" && next.value) {
        const score = Number(next.value);
        if (!Number.isFinite(score) || score < 0 || score > 100) {
          toast.error("Le score Photo doit être entre 0 et 100");
          return;
        }
        const mode = next.mode ?? "equals";
        const scoreFieldName =
          mode === "min"
            ? "photoScoreMin"
            : mode === "max"
              ? "photoScoreMax"
              : "photoScoreEquals";
        const scoreLabel =
          mode === "min"
            ? "Score Photo minimum"
            : mode === "max"
              ? "Score Photo maximum"
              : "Score Photo";

        const photoScoreFilter: ActiveFilter = {
          id: `quick-photo-score-${mode}`,
          fieldName: scoreFieldName,
          operator: "equals",
          value: String(score),
          label: scoreLabel,
          type: "NUMBER",
        };
        setActiveFilters([...withoutPhotoScoreFilters, photoScoreFilter]);
        return;
      }

      if (next.type === "score-state" && next.value) {
        const scoreStateMap: Record<
          string,
          { etatPhoto: string; photoScore: string; label: string }
        > = {
          en_cours: {
            etatPhoto: "Nouveau",
            photoScore: "null",
            label: "Score Photo",
          },
          error_correction: {
            etatPhoto: "Valid",
            photoScore: "0",
            label: "Score Photo",
          },
          non_photo_profile: {
            etatPhoto: "Non_Valid",
            photoScore: "0",
            label: "Score Photo",
          },
        };

        const mapped = scoreStateMap[next.value];
        if (!mapped) return;

        const currentState = activePhotoQuickState.scoreState;
        if (currentState === next.value) {
          setActiveFilters(
            activeFilters.filter(
              (f) =>
                f.fieldName !== "photoScore" &&
                f.fieldName !== "photoScoreEquals" &&
                f.fieldName !== "photoScoreMin" &&
                f.fieldName !== "photoScoreMax",
            ),
          );
          return;
        }

        const etatFilter: ActiveFilter = {
          id: `quick-etat-photo-${mapped.etatPhoto}`,
          fieldName: "photoScore",
          operator: "equals",
          value: mapped.etatPhoto,
          label: "État Photo",
          type: "SELECT",
        };

        const scoreFilter: ActiveFilter = {
          id: "quick-photo-score",
          fieldName: "photoScoreEquals",
          operator: "equals",
          value: mapped.photoScore,
          label: mapped.label,
          type: "NUMBER",
        };

        const base = activeFilters.filter(
          (f) =>
            f.fieldName !== "photoScore" &&
            f.fieldName !== "photoScoreEquals" &&
            f.fieldName !== "photoScoreMin" &&
            f.fieldName !== "photoScoreMax",
        );
        setActiveFilters([...base, etatFilter, scoreFilter]);
      }
    },
    [
      activeFilters,
      setActiveFilters,
      activePhotoQuickState.etatPhoto,
      activePhotoQuickState.scoreState,
    ],
  );

  useEffect(() => {
    if (!photoDropdownOpen) return;
    const handle = (e: PointerEvent) => {
      const target = e.target as Node;

      if (document.querySelector('[data-slot="select-content"]')) {
        return;
      }

      if (
        target instanceof Element &&
        target.closest('[data-slot="select-content"]')
      ) {
        return;
      }

      if (photoDropdownRef.current?.contains(target)) {
        return;
      }

      setPhotoDropdownOpen(false);
    };
    document.addEventListener("pointerdown", handle, true);
    return () => document.removeEventListener("pointerdown", handle, true);
  }, [photoDropdownOpen]);
  // ── CV quick filter dropdown ──
  const [cvDropdownOpen, setCvDropdownOpen] = useState(false);
  const cvDropdownRef = useRef<HTMLDivElement>(null);
  const [cvScoreInput, setCvScoreInput] = useState("");
  const [cvScoreMode, setCvScoreMode] = useState<"equals" | "min" | "max">(
    "equals",
  );

  const activeCvQuickState = useMemo(() => {
    const cvFilter = activeFilters.find((f) => f.fieldName === "cv");
    const etatCvFilters = activeFilters.filter((f) => f.fieldName === "etatCV");
    const cvScoreEqualsFilter =
      activeFilters.find((f) => f.fieldName === "cvScoreEquals") ??
      activeFilters.find((f) => f.fieldName === "cvScore");
    const cvScoreMinFilter = activeFilters.find(
      (f) => f.fieldName === "cvScoreMin",
    );
    const cvScoreMaxFilter = activeFilters.find(
      (f) => f.fieldName === "cvScoreMax",
    );

    const rawCv = String(cvFilter?.value ?? "")
      .toLowerCase()
      .trim();
    const hasCv =
      rawCv === "avec_cv" ||
      rawCv === "true" ||
      rawCv === "1" ||
      cvFilter?.operator === "isNotEmpty";

    const withoutCv =
      rawCv === "sans_cv" ||
      rawCv === "false" ||
      rawCv === "0" ||
      cvFilter?.operator === "isEmpty";

    const etatCvs = Array.from(
      new Set(
        etatCvFilters.map((f) => String(f?.value ?? "").trim()).filter(Boolean),
      ),
    );
    const scoreEqualsRaw = String(cvScoreEqualsFilter?.value ?? "").trim();
    const scoreMinRaw = String(cvScoreMinFilter?.value ?? "").trim();
    const scoreMaxRaw = String(cvScoreMaxFilter?.value ?? "").trim();

    let scoreState: "en_cours" | "error_correction" | "non_cv" | null = null;
    if (etatCvs.length === 1) {
      const etat = etatCvs[0];
      if (scoreEqualsRaw.toLowerCase() === "null" && etat === "Nouveau") {
        scoreState = "en_cours";
      } else if (
        scoreEqualsRaw === "0" &&
        (etat === "Valide" || etat === "Valid")
      ) {
        scoreState = "error_correction";
      } else if (scoreEqualsRaw === "0" && etat === "Non_Valide") {
        scoreState = "non_cv";
      }
    }

    const effectiveScore = scoreEqualsRaw || scoreMinRaw || scoreMaxRaw || null;
    const scoreMode: "equals" | "min" | "max" | null = scoreEqualsRaw
      ? "equals"
      : scoreMinRaw
        ? "min"
        : scoreMaxRaw
          ? "max"
          : null;

    return {
      hasCv,
      withoutCv,
      etatCvs,
      score: effectiveScore,
      scoreEquals: scoreEqualsRaw,
      scoreMin: scoreMinRaw,
      scoreMax: scoreMaxRaw,
      scoreMode,
      scoreState,
      active:
        hasCv ||
        withoutCv ||
        etatCvs.length > 0 ||
        Boolean(scoreEqualsRaw) ||
        Boolean(scoreMinRaw) ||
        Boolean(scoreMaxRaw),
    };
  }, [activeFilters]);

  useEffect(() => {
    if (activeCvQuickState.scoreEquals) {
      setCvScoreMode("equals");
      setCvScoreInput(activeCvQuickState.scoreEquals);
      return;
    }
    if (activeCvQuickState.scoreMin) {
      setCvScoreMode("min");
      setCvScoreInput(activeCvQuickState.scoreMin);
      return;
    }
    if (activeCvQuickState.scoreMax) {
      setCvScoreMode("max");
      setCvScoreInput(activeCvQuickState.scoreMax);
      return;
    }

    setCvScoreInput("");
    setCvScoreMode("equals");
  }, [
    activeCvQuickState.scoreEquals,
    activeCvQuickState.scoreMin,
    activeCvQuickState.scoreMax,
  ]);

  const cvQuickLabel = useMemo(() => {
    if (activeCvQuickState.score) {
      if (activeCvQuickState.scoreMode === "min") {
        return `CV score ≥ ${activeCvQuickState.score}`;
      }
      if (activeCvQuickState.scoreMode === "max") {
        return `CV score ≤ ${activeCvQuickState.score}`;
      }
      return `CV score: ${activeCvQuickState.score}`;
    }
    if (activeCvQuickState.etatCvs.length > 0) {
      const mapLabel: Record<string, string> = {
        Nouveau: "Nouveau",
        Valid: "Valide",
        Non_Valide: "Non Valide",
        Supprime: "Supprimée",
        Supprimée: "Supprimée",
      };
      if (activeCvQuickState.etatCvs.length === 1) {
        const one = activeCvQuickState.etatCvs[0];
        return `CV: ${mapLabel[one] ?? one}`;
      }
      return `CV: États (${activeCvQuickState.etatCvs.length})`;
    }
    if (activeCvQuickState.hasCv) return "CV: Avec";
    if (activeCvQuickState.withoutCv) return "CV: Sans";
    return "CV";
  }, [activeCvQuickState]);

  const applyCvQuickFilter = useCallback(
    (next: {
      type:
        | "with"
        | "without"
        | "toggle-etat"
        | "score"
        | "score-state"
        | "clear";
      value?: string;
      mode?: "equals" | "min" | "max";
    }) => {
      const withoutCv = activeFilters.filter((f) => f.fieldName !== "cv");
      const withoutEtatCv = activeFilters.filter(
        (f) => f.fieldName !== "etatCV",
      );
      const withoutCvScore = activeFilters.filter(
        (f) =>
          f.fieldName !== "cvScore" &&
          f.fieldName !== "cvScoreEquals" &&
          f.fieldName !== "cvScoreMin" &&
          f.fieldName !== "cvScoreMax",
      );
      const withoutCvFamily = activeFilters.filter(
        (f) =>
          f.fieldName !== "cv" &&
          f.fieldName !== "etatCV" &&
          f.fieldName !== "cvScore" &&
          f.fieldName !== "cvScoreEquals" &&
          f.fieldName !== "cvScoreMin" &&
          f.fieldName !== "cvScoreMax",
      );

      if (next.type === "clear") {
        setActiveFilters(withoutCvFamily);
        return;
      }

      if (next.type === "with") {
        const cvFilter: ActiveFilter = {
          id: "quick-cv",
          fieldName: "cv",
          operator: "equals",
          value: "avec_cv",
          label: "CV",
          type: "CV_SCORE",
        };
        setActiveFilters([...withoutCv, cvFilter]);
        return;
      }

      if (next.type === "without") {
        const cvFilter: ActiveFilter = {
          id: "quick-cv",
          fieldName: "cv",
          operator: "equals",
          value: "sans_cv",
          label: "CV",
          type: "CV_SCORE",
        };
        setActiveFilters([...withoutCv, cvFilter]);
        return;
      }

      if (next.type === "toggle-etat" && next.value) {
        const currentEtatValues = activeFilters
          .filter((f) => f.fieldName === "etatCV")
          .map((f) => String(f.value ?? "").trim())
          .filter(Boolean);

        const shouldRemove = currentEtatValues.includes(next.value);
        const nextEtatValues = shouldRemove
          ? currentEtatValues.filter((v) => v !== next.value)
          : [...currentEtatValues, next.value];

        const nextEtatFilters: ActiveFilter[] = nextEtatValues.map((v) => ({
          id: `quick-etat-cv-${v}`,
          fieldName: "etatCV",
          operator: "equals",
          value: v,
          label: "État CV",
          type: "SELECT",
        }));

        setActiveFilters([...withoutEtatCv, ...nextEtatFilters]);
        return;
      }

      if (next.type === "score" && next.value) {
        const score = Number(next.value);
        if (!Number.isFinite(score) || score < 0 || score > 100) {
          toast.error("Le score CV doit être entre 0 et 100");
          return;
        }

        const mode = next.mode ?? "equals";
        const fieldName =
          mode === "min"
            ? "cvScoreMin"
            : mode === "max"
              ? "cvScoreMax"
              : "cvScoreEquals";

        const cvScoreFilter: ActiveFilter = {
          id: "quick-cv-score",
          fieldName,
          operator: "equals",
          value: String(score),
          label: "Score CV",
          type: "NUMBER",
        };
        setActiveFilters([...withoutCvScore, cvScoreFilter]);
        return;
      }

      if (next.type === "score-state" && next.value) {
        const scoreStateMap: Record<
          string,
          { etatCV: string; cvScore: string; label: string }
        > = {
          en_cours: { etatCV: "Nouveau", cvScore: "null", label: "Score CV" },
          error_correction: {
            etatCV: "Valide",
            cvScore: "0",
            label: "Score CV",
          },
          non_cv: {
            etatCV: "Non_Valide",
            cvScore: "0",
            label: "Score CV",
          },
        };

        const mapped = scoreStateMap[next.value];
        if (!mapped) return;

        const currentState = activeCvQuickState.scoreState;
        if (currentState === next.value) {
          setActiveFilters(
            activeFilters.filter(
              (f) =>
                f.fieldName !== "etatCV" &&
                f.fieldName !== "cvScore" &&
                f.fieldName !== "cvScoreEquals" &&
                f.fieldName !== "cvScoreMin" &&
                f.fieldName !== "cvScoreMax",
            ),
          );
          return;
        }

        const etatFilter: ActiveFilter = {
          id: `quick-etat-cv-${mapped.etatCV}`,
          fieldName: "etatCV",
          operator: "equals",
          value: mapped.etatCV,
          label: "État CV",
          type: "SELECT",
        };

        const scoreFilter: ActiveFilter = {
          id: "quick-cv-score",
          fieldName: "cvScoreEquals",
          operator: "equals",
          value: mapped.cvScore,
          label: mapped.label,
          type: "NUMBER",
        };

        const base = activeFilters.filter(
          (f) =>
            f.fieldName !== "etatCV" &&
            f.fieldName !== "cvScore" &&
            f.fieldName !== "cvScoreEquals" &&
            f.fieldName !== "cvScoreMin" &&
            f.fieldName !== "cvScoreMax",
        );
        setActiveFilters([...base, etatFilter, scoreFilter]);
      }
    },
    [activeFilters, setActiveFilters, activeCvQuickState.scoreState],
  );

  useEffect(() => {
    if (!cvDropdownOpen) return;
    const handle = (e: PointerEvent) => {
      const target = e.target as Node;

      if (document.querySelector('[data-slot="select-content"]')) {
        return;
      }

      if (
        target instanceof Element &&
        target.closest('[data-slot="select-content"]')
      ) {
        return;
      }

      if (cvDropdownRef.current?.contains(target)) {
        return;
      }

      setCvDropdownOpen(false);
    };
    document.addEventListener("pointerdown", handle, true);
    return () => document.removeEventListener("pointerdown", handle, true);
  }, [cvDropdownOpen]);

  const clearCvScoreQuickFilters = useCallback(() => {
    setActiveFilters((prev) =>
      prev.filter(
        (f) =>
          f.fieldName !== "cvScore" &&
          f.fieldName !== "cvScoreEquals" &&
          f.fieldName !== "cvScoreMin" &&
          f.fieldName !== "cvScoreMax",
      ),
    );
  }, [setActiveFilters]);

  const clearPhotoScoreQuickFilters = useCallback(() => {
    setActiveFilters((prev) =>
      prev.filter(
        (f) =>
          f.fieldName !== "photoScoreEquals" &&
          f.fieldName !== "photoScoreMin" &&
          f.fieldName !== "photoScoreMax",
      ),
    );
  }, [setActiveFilters]);

  const handleSubTabChange = useCallback(
    (tab: "liste" | "cvs" | "images") => {
      if (tab === "cvs") {
        navigate("/admin/gestion-candidats/liste-cvs");
        return;
      }
      if (tab === "images") {
        navigate("/admin/gestion-candidats/images");
        return;
      }
      navigate("/admin/gestion-candidats/liste");
    },
    [navigate],
  );

  const {
    records,
    loading,
    pageIndex,
    setPageIndex,
    pageSize,
    setPageSize,
    total,
    refetch,
    mutations,
  } = useCandidatsRecords({ initialPageSize: 50 });

  const scrollTableToTop = useCallback(() => {
    const panel = tablePanelRef.current;
    if (!panel) return;

    panel.scrollIntoView({ block: "start", behavior: "smooth" });

    const nodes = panel.querySelectorAll<HTMLElement>("*");
    nodes.forEach((node) => {
      const style = window.getComputedStyle(node);
      const isScrollable =
        (style.overflowY === "auto" || style.overflowY === "scroll") &&
        node.scrollHeight > node.clientHeight;

      if (isScrollable) {
        node.scrollTop = 0;
      }
    });
  }, []);

  const handlePageChange = useCallback(
    (nextPage: number) => {
      setPageIndex(nextPage);
    },
    [setPageIndex],
  );

  useEffect(() => {
    if (activeSubTab !== "liste") return;
    const raf = window.requestAnimationFrame(scrollTableToTop);
    return () => window.cancelAnimationFrame(raf);
  }, [pageIndex, activeSubTab, scrollTableToTop]);

  useToolbarStateSync();
  useInitializeHiddenColumns(BASE_COLUMNS);

  const maxPage = Math.ceil((total || 0) / pageSize);
  useKeyboardPagination(pageIndex, maxPage, setPageIndex);
  const { openCreateInSidePanel } = useOpenCreateInSidePanel();

  // ── Page search ──
  const [pageSearchOpen, setPageSearchOpen] = useState(false);
  const candidatSearchConfig: PageSearchConfig = useMemo(
    () => ({
      entityType: "candidat",
      label: "Candidats",
      placeholder: "Rechercher un candidat par nom…",
      searchFn: (q: string) => Promise.resolve(searchUsersByName(q)),
      mapResult: (c: any) => {
        const prenom = c.user?.prenom || c.prenom || "";
        const nom = c.user?.nom || c.nom || "";
        const fullName =
          [prenom, nom].filter(Boolean).join(" ") ||
          c.fullName ||
          c.user?.username ||
          c.username ||
          `#${c.id}`;
        const email = c.user?.email || c.email || "";
        return {
          id: String(c.id),
          title: fullName,
          subtitle: email,
          imageUrl: c.photo_profil_url || undefined,
        };
      },
      filterFieldName: "nomComplet",
      filterLabel: "Nom complet",
      color: "gray",
    }),
    [],
  );

  // ── Side-panel helpers are defined further down, after
  // `useOpenRecordInSidePanel()` is invoked. See `openLocalCmdMenu` /
  // `openLocalCreatePanel` below.

  // ── Listen for photo score regeneration events to trigger refetch ──
  useEffect(() => {
    const handlePhotoScoreRegenerate = () => {
      // Refetch candidats to update the table with new photo state
      refetch();
    };
    const handleCvScoreRegenerate = () => {
      // Refetch candidats to update the table with new CV state
      refetch();
    };
    window.addEventListener(
      "photo-score-regenerate",
      handlePhotoScoreRegenerate,
    );
    window.addEventListener("cv-score-regenerate", handleCvScoreRegenerate);
    return () => {
      window.removeEventListener(
        "photo-score-regenerate",
        handlePhotoScoreRegenerate,
      );
      window.removeEventListener(
        "cv-score-regenerate",
        handleCvScoreRegenerate,
      );
    };
  }, [refetch]);

  // ── Inline cell editing ──
  const handleCellChange = useCandidatCellChange(records, refetch);

  // ── Record creation ──
  const handleCreateRecord = useCreateCandidat({
    createMutation: mutations.createCandidatByAdmin,
    refetch,
  });

  // ── Bulk actions ──
  const {
    bulkActions,
    isBulkPremiumOpen,
    setIsBulkPremiumOpen,
    bulkPremiumData,
    isBulkLoading,
    confirmBulkPremium,
    closeBulkPremium,
    isBulkDeleteOpen,
    setIsBulkDeleteOpen,
    handleBulkDelete,
    selectedCount,
  } = useCandidatBulkActions(records, refetch);

  // ── Columns with dynamic options ──
  const typeContratOptions = useTypeContratOptions();
  const typeStageOptions = useTypeStageOptions();
  const niveauxEtudes = STATIC_NIVEAUX_ETUDES;
  const { navigateSidePanel } = useNavigateSidePanel();
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();

  // ── Side-panel helpers ──
  // Route the local Ctrl+K menu and the empty "new record" panel through the
  // same SidePanelForDesktop slot used by the Ecole / Candidat detail panels,
  // so opening one closes the others — same behavior as the detail panels.
  const { closeSidePanelMenu } = useSidePanelMenu();
  const openLocalCmdMenu = useCallback(() => {
    openRecordInSidePanel({
      recordId: LOCAL_CMD_MENU_RECORD_ID,
      objectNameSingular: "Command Menu",
    });
  }, [openRecordInSidePanel]);
  const openLocalCreatePanel = useCallback(() => {
    openRecordInSidePanel({
      recordId: LOCAL_CREATE_RECORD_ID,
      objectNameSingular: "Nouveau candidat",
    });
  }, [openRecordInSidePanel]);

  // ── Keyboard shortcuts (Ctrl+K, Ctrl+N) ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        openLocalCmdMenu();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        const t = e.target as HTMLElement;
        if (
          t.tagName !== "INPUT" &&
          t.tagName !== "TEXTAREA" &&
          !t.isContentEditable
        ) {
          e.preventDefault();
          openLocalCreatePanel();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [openLocalCmdMenu, openLocalCreatePanel]);

  const niveauEtudesOptions = useMemo(
    () =>
      (niveauxEtudes || []).map((n) => ({
        value: String(n.id),
        label: n.label,
        color: "gray",
      })),
    [niveauxEtudes],
  );

  const handleCvCellClick = useCallback(
    (recordId: string) => {
      navigateSidePanel({
        page: SidePanelPage.CvScore,
        pageTitle: "Score CV",
        recordId,
        resetNavigationStack: true,
      });
    },
    [navigateSidePanel],
  );

  const handlePremiumCellClick = useCallback(
    (recordId: string, record: any) => {
      const raw = (record?._raw ?? record) as any;
      const isPremium = Boolean(raw?.premium ?? record?.premium);
      if (!isPremium) return;

      navigateSidePanel({
        page: SidePanelPage.PremiumPacks,
        pageTitle: "Packs Premium",
        recordId,
        resetNavigationStack: true,
      });
    },
    [navigateSidePanel],
  );

  const openEcoleInSidePanel = useCallback(
    (record: any) => {
      const ecoleName = String(record?.nomEcole ?? "École").trim() || "École";
      const raw = (record?._raw ?? record) as any;
      const rawEcoleId = record?._ecoleId ?? raw?.ecole_id ?? raw?.ecole?.id;
      const normalizedEcoleId = Number(rawEcoleId);

      const sidePanelRecordId =
        Number.isFinite(normalizedEcoleId) && normalizedEcoleId > 0
          ? `eco-${normalizedEcoleId}`
          : `eco-row-${String(record?.id ?? ecoleName).replace(/\s+/g, "-")}`;

      openRecordInSidePanel({
        recordId: sidePanelRecordId,
        objectNameSingular: ecoleName,
      });
    },
    [openRecordInSidePanel],
  );

  const columns = useMemo(() => {
    return BASE_COLUMNS.map((col) => {
      if (col.id === "nomComplet") {
        return {
          ...col,
          isNavigable: true,
          onCellClick: (recordId: string) => {
            openRecordInSidePanel({
              recordId,
              objectNameSingular: "Candidat",
            });
          },
          onEditButtonClick: (recordId: string) => {
            openRecordInSidePanel({
              recordId,
              objectNameSingular: "Candidat",
            });
          },
          renderCell: (record: any) => (
            <CandidatAvatarDisplay
              name={record?.nomComplet ?? ""}
              photoUrl={record?.photo || null}
            />
          ),
        };
      }
      if (col.id === "email") {
        return {
          ...col,
          renderCell: (record: any) => {
            const email = record?.email ?? "";
            return (
              <div className="flex items-center gap-1 h-6 min-w-0 px-1.5 rounded-md shadow-xs bg-[#00000005] backdrop-blur-sm border border-gray-200 dark:border-gray-600 max-w-full overflow-hidden">
                <span className="truncate text-[11.5px] text-gray-700 dark:text-gray-300">
                  {email}
                </span>
              </div>
            );
          },
        };
      }
      if (col.id === "gsm") {
        return {
          ...col,
          isEditable: false,
          renderCell: (record: any) => {
            return (
              <LocalGsmEditableCell
                recordId={String(record?.id ?? "")}
                value={String(record?.gsm ?? "")}
              />
            );
          },
        };
      }
      if (col.id === "nomEcole") {
        return {
          ...col,
          isNavigable: true,
          onEditButtonClick: (_recordId: string, record: any) => {
            openEcoleInSidePanel(record);
          },
          onCellClick: (_recordId: string, record: any) => {
            openEcoleInSidePanel(record);
          },
          renderCell: (record: any) => {
            const ecoleName = String(record?.nomEcole ?? "").trim();
            const raw = (record?._raw ?? record) as any;
            const ecoleLogoUrl =
              raw?.ecole?.logo_url ??
              raw?.user?.ecole?.logo_url ??
              raw?.ecole_logo_url ??
              null;

            if (!ecoleName) {
              return (
                <span className="text-gray-300 dark:text-gray-600 text-[11px] flex justify-center w-full">
                  —
                </span>
              );
            }

            return (
              <div className="flex items-center h-7 max-w-full group/ecole">
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    openEcoleInSidePanel(record);
                  }}
                  className="
                    inline-flex items-center gap-1.5 max-w-full
                    px-1.5 py-1 rounded-md cursor-pointer
                    bg-white dark:bg-gray-800/80
                    ring-1 ring-inset ring-gray-200/70 dark:ring-gray-700/50
                    shadow-sm shadow-gray-200/50 dark:shadow-black/10
                    transition-all duration-200
                    hover:shadow-md hover:ring-gray-300/40 dark:hover:ring-gray-600/30
                  "
                >
                  {ecoleLogoUrl ? (
                    <img
                      src={ecoleLogoUrl}
                      alt={ecoleName}
                      className="w-4 h-4 rounded-sm object-cover shrink-0 ring-1 ring-gray-200/80 dark:ring-gray-600/50"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-sm shrink-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700/60 ring-1 ring-inset ring-gray-300/70 dark:ring-gray-600/60 text-[8px] font-semibold text-gray-600 dark:text-gray-300">
                      {ecoleName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-[10px] font-medium text-gray-700 dark:text-gray-200 truncate">
                    {ecoleName}
                  </span>
                  <ArrowUpRight className="w-3 h-3 text-gray-400 dark:text-gray-500 opacity-0 group-hover/ecole:opacity-100 transition-opacity shrink-0" />
                </span>
              </div>
            );
          },
        };
      }
      if (col.id === "cv") {
        const parseCvScore = (record: any): number | null => {
          const fromRecord = record?.cvScore;
          if (typeof fromRecord === "number" && Number.isFinite(fromRecord)) {
            return fromRecord;
          }

          const raw = (record?._raw ?? record) as any;
          const fromRaw = raw?.cv?.score;
          if (typeof fromRaw === "number" && Number.isFinite(fromRaw)) {
            return fromRaw;
          }

          const cvText = String(record?.cv ?? "").trim();
          const match = cvText.match(/\d+/);
          return match ? Number(match[0]) : null;
        };

        return {
          ...col,
          isNavigable: true,
          onCellClick: (recordId: string) => handleCvCellClick(recordId),
          onEditButtonClick: handleCvCellClick,
          renderCell: (record: any) => {
            const cvId = record?.cvId ?? record?._raw?.cv_id ?? null;
            const cvScore = parseCvScore(record);

            if (cvId && cvScore === 0) {
              return <CvEnCoursBadge cvId={cvId} />;
            }

            return (
              <ScoreGaugeCell
                cv={record?.cv}
                cv_id={cvId}
                score={cvScore}
              />
            );
          },
        };
      }
      if (col.id === "premium") {
        return {
          ...col,
          isNavigable: true,
          isEditable: false,
          onEditButtonClick: handlePremiumCellClick,
        };
      }
      if (col.id === "typeContrat") {
        return { ...col, isEditable: true, options: typeContratOptions };
      }
      if (col.id === "typeStage") {
        return { ...col, isEditable: true, options: typeStageOptions };
      }
      if (col.id === "niveauEtudes") {
        return {
          ...col,
          isEditable: true,
          options: niveauEtudesOptions,
          renderCell: (record: any) => {
            const rawValue = String(record?.niveauEtudes ?? "").trim();
            if (!rawValue) {
              return (
                <span className="text-gray-300 dark:text-gray-600 text-[11px] flex justify-center w-full">
                  —
                </span>
              );
            }

            return (
              <div className="flex items-center pl-2 overflow-hidden">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[#00000005]! border border-gray-200 text-gray-500! dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-700 truncate max-w-full">
                  {rawValue}
                </span>
              </div>
            );
          },
        };
      }
      if (col.id === "etat") {
        return {
          ...col,
          renderCell: (record: any) => <EtatCandidatCell record={record} />,
        };
      }
      if (col.id === "loginSource") {
        return {
          ...col,
          isEditable: false,
          renderCell: (record: any) => <LoginSourceCell record={record} />,
        };
      }
      if (col.id === "inscritLe") {
        return {
          ...col,
          isEditable: false,
        };
      }
      return col;
    });
  }, [
    typeContratOptions,
    typeStageOptions,
    niveauEtudesOptions,
    openRecordInSidePanel,
    handleCvCellClick,
    handlePremiumCellClick,
    openEcoleInSidePanel,
  ]);

  // ── Custom side panel for candidats ──
  // Routes by sentinel recordId so all panels (Command Menu, Create, Ecole,
  // Candidat detail) share the same slot and are mutually exclusive.
  const renderCandidatSidePanel = useCallback(
    (recordId: string) => {
      if (recordId === LOCAL_CMD_MENU_RECORD_ID) {
        return (
          <LocalCommandMenu
            onClose={closeSidePanelMenu}
            records={records as any}
            onNavigateToRecord={(id) =>
              openRecordInSidePanel({
                recordId: id,
                objectNameSingular: "Candidat",
              })
            }
            onCreateNew={openLocalCreatePanel}
          />
        );
      }
      if (recordId === LOCAL_CREATE_RECORD_ID) {
        return <LocalCreateCandidatPanel onClose={closeSidePanelMenu} />;
      }
      if (recordId.startsWith("eco-")) {
        const ecoleId = recordId.slice(4);
        return (
          <RecordTableContext.Provider
            value={{
              recordTableId: "ecole-in-candidats",
              columns: [],
              visibleColumns: [],
              records: [{ id: ecoleId } as any],
            }}
          >
            <EcoleSidePanelPage recordId={ecoleId} />
          </RecordTableContext.Provider>
        );
      }
      return <CandidatSidePanelPage recordId={recordId} />;
    },
    [records, closeSidePanelMenu, openRecordInSidePanel, openLocalCreatePanel],
  );

  // ── Name change handler (updates users table) ──
  const handleNameChange = useCallback(
    async (recordId: string, prenom: string, nom: string) => {
      const record = records.find((r) => r.id === recordId) as any;
      const userId = record?._userId ?? record?._raw?.user_id;
      if (!userId) return;
      try {
        await mutations.updateCandidatUser.mutateAsync({
          userId: Number(userId),
          data: { prenom, nom },
        });
        toast.success("Nom mis \u00e0 jour");
        handleCellChange(recordId, "nomComplet", `${prenom} ${nom}`.trim());
      } catch {
        toast.error("Erreur lors de la mise \u00e0 jour du nom");
      }
    },
    [records, mutations.updateCandidatUser, handleCellChange],
  );

  const contextValue = useRecordTableSetup(
    columns,
    records,
    "candidats-table",
    handleCellChange,
    undefined,
    undefined,
    undefined,
    handleCreateRecord,
    renderCandidatSidePanel,
    handleNameChange,
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden w-full">
      {/* ── PageHeader with integrated sub-tabs ── */}
      <div className="flex items-center min-h-10 px-4 gap-3">
        <UsersHeaderTabs
          activeSubTab={activeSubTab}
          total={total}
          leftHeaderSlot={leftHeaderSlot}
          showSubTabs={showSubTabs}
          onSubTabChange={handleSubTabChange}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: action buttons (only on Liste tab) */}
        {activeSubTab === "liste" && (
          <div className="flex items-center gap-1 shrink-0">
            <LocalQuickFilters
              premiumDropdownRef={premiumDropdownRef}
              premiumDropdownOpen={premiumDropdownOpen}
              setPremiumDropdownOpen={setPremiumDropdownOpen}
              activePremiumValue={activePremiumValue}
              applyPremiumQuickFilter={applyPremiumQuickFilter}
              cvDropdownRef={cvDropdownRef}
              cvDropdownOpen={cvDropdownOpen}
              setCvDropdownOpen={setCvDropdownOpen}
              activeCvQuickState={activeCvQuickState}
              cvQuickLabel={cvQuickLabel}
              applyCvQuickFilter={applyCvQuickFilter}
              cvScoreMode={cvScoreMode}
              setCvScoreMode={setCvScoreMode}
              cvScoreInput={cvScoreInput}
              setCvScoreInput={setCvScoreInput}
              onClearCvScoreFilters={clearCvScoreQuickFilters}
              photoDropdownRef={photoDropdownRef}
              photoDropdownOpen={photoDropdownOpen}
              setPhotoDropdownOpen={setPhotoDropdownOpen}
              activePhotoQuickState={activePhotoQuickState}
              photoQuickLabel={photoQuickLabel}
              applyPhotoQuickFilter={applyPhotoQuickFilter}
              photoScoreMode={photoScoreMode}
              setPhotoScoreMode={setPhotoScoreMode}
              photoScoreInput={photoScoreInput}
              setPhotoScoreInput={setPhotoScoreInput}
              onClearPhotoScoreFilters={clearPhotoScoreQuickFilters}
            />

            <button
              onClick={() => setPageSearchOpen(true)}
              className="flex items-center justify-center w-8 h-8 cursor-pointer text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-500 rounded-lg transition-colors"
              title="Rechercher par nom"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />
            <button
              onClick={openLocalCreatePanel}
              className="flex items-center gap-1.5 px-2 py-1 cursor-pointer text-[11.5px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title="Créer un nouvel enregistrement (Ctrl+N)"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>New record</span>
            </button>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />
            <button
              onClick={openLocalCmdMenu}
              className="flex items-center gap-1.5 px-2 py-1 text-xs cursor-pointer font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            >
              <span className="text-xs">Ctrl + K</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <path d="M15 3v18" />
              </svg>
            </button>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />
            {rightHeaderSlot}
          </div>
        )}
      </div>

      {/* ── Tab Content ── */}
      {activeSubTab === "liste" && (
        <>
          {/* ── PageBody with context (resizes with SidePanel) ── */}
          <RecordTableContext.Provider value={contextValue}>
            <div className="flex flex-row flex-1 min-h-0 gap-0 pb-2 mx-2">
              {/* ── StyledLeftContainer: PagePanel + space for SidePanel ── */}
              <div className="flex flex-col flex-1 min-w-0 min-h-0">
                {/* ── PagePanel (bordered container) ── */}
                <div
                  ref={tablePanelRef}
                  className="flex flex-col flex-1 min-h-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  {/* ── ViewBar (Filter / Sort / Options dropdowns — local, editable) ── */}
                  <LocalRecordTableViewBar
                    columns={columns}
                    recordCount={total}
                    pageSize={pageSize}
                    onPageSizeChange={setPageSize}
                    pageSizeOptions={[25, 50, 75, 100]}
                  />

                  {/* ── RecordTable ── */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <RecordTable
                      tableId="candidats-table"
                      columns={columns}
                      records={records}
                      isLoading={loading}
                      onCellChange={handleCellChange}
                      onCreateRecord={handleCreateRecord}
                    />
                  </div>
                </div>
              </div>

              {/* ── SidePanel (resizable) ──
                  Hosts: Candidat detail, Ecole detail, LocalCommandMenu,
                  LocalCreateCandidatPanel — all routed via
                  `renderCandidatSidePanel` and therefore mutually exclusive. */}
              <SidePanelForDesktop />
            </div>

            {/* ── Floating Selection Action Bar ── */}
            <LocalSelectionActionBar
              bulkActions={bulkActions}
              visibleRecordIds={records.map((r) => String(r.id))}
            />
          </RecordTableContext.Provider>

          {/* ── Pagination ── */}
          <RecordTablePagination
            pageIndex={pageIndex}
            maxPage={maxPage}
            total={total}
            loading={loading}
            onPageChange={handlePageChange}
          />

          {/* Bulk Delete Confirmation */}
          <SupprimerDialog
            open={isBulkDeleteOpen}
            onOpenChange={setIsBulkDeleteOpen}
            onConfirm={handleBulkDelete}
            title="Supprimer les candidats"
            description={`Êtes-vous sûr de vouloir supprimer ${selectedCount} candidat(s) ? Cette action est irréversible.`}
          />

          {/* Bulk Premium Dialog */}
          {bulkPremiumData && (
            <AffecterPremiumDialog
              open={isBulkPremiumOpen}
              onOpenChange={setIsBulkPremiumOpen}
              title={
                bulkPremiumData.premiumTrue.length > 0 &&
                bulkPremiumData.premiumFalse.length === 0
                  ? "Désactiver le premium ?"
                  : "Gérer le statut premium"
              }
              affectCount={bulkPremiumData.premiumFalse.length}
              deactivateCount={bulkPremiumData.premiumTrue.length}
              hasImmediateOption={bulkPremiumData.premiumFalse.length > 0}
              hasScheduleOption={bulkPremiumData.premiumFalse.length > 0}
              candidateIds={bulkPremiumData.premiumFalse}
              onConfirmImmediate={confirmBulkPremium}
              onScheduleSuccess={closeBulkPremium}
              isLoading={isBulkLoading}
            />
          )}
        </>
      )}

      {/* ── CVs Tab ── */}
      {activeSubTab === "cvs" && (
        <div className="flex-1 min-h-0 overflow-auto px-1">
          <LocalCvsTab />
        </div>
      )}

      {/* ── Images Tab ── */}
      {activeSubTab === "images" && (
        <div className="flex-1 min-h-0 overflow-auto px-1">
          <LocalImagesTab />
        </div>
      )}

      {/* ── Page-level search modal ── */}
      <PageSpotlightSearch
        open={pageSearchOpen}
        onOpenChange={setPageSearchOpen}
        config={candidatSearchConfig}
      />
    </div>
  );
}
