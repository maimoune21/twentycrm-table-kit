import type { ColumnDefinition, RecordData } from "../../types";
import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Tag } from "../../cells/Tag";
import { ScoreGauge } from "@/components/ui/score-gauge";
import { Badge } from "@/components/ui/badge";
import { Clock, Crown, XCircle } from "lucide-react";
import { CvEnCoursBadge } from "@/admin/dashboard/users/cells/CvEnCoursBadge";
import { PhotoEnCoursBadge } from "@/admin/dashboard/users/cells/PhotoEnCoursBadge";
import { getCvLocalProcessingStartAt } from "@/hooks/cvFallback";

// ── Label Identifier Chip with hover photo preview (portal-based) ──
const LabelIdentifierChip = ({
  value,
  photo,
}: {
  value: string;
  photo?: string | null;
  monochromeAvatar?: boolean;
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewPos, setPreviewPos] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!chipRef.current) return;
    const rect = chipRef.current.getBoundingClientRect();
    setPreviewPos({
      top: rect.top - 8,
      left: rect.left,
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!photo) return;
    updatePosition();
    timeoutRef.current = setTimeout(() => setShowPreview(true), 350);
  }, [photo, updatePosition]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowPreview(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="flex items-center w-full h-full overflow-hidden pl-2">
      <div
        ref={chipRef}
        className="inline-flex items-center gap-1.5 py-0.5 px-1.5 rounded-md bg-white/5 dark:bg-white/5 backdrop-blur-sm border border-white/10 dark:border-white/10 cursor-pointer group/chip max-w-full overflow-hidden hover:bg-white/10 dark:hover:bg-white/8 transition-all duration-200"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span className="text-[11px] text-gray-900 dark:text-gray-50 truncate leading-tight font-medium">
          {value}
        </span>
      </div>

      {/* Portal-based hover preview — escapes all overflow:hidden ancestors */}
      {photo &&
        createPortal(
          <div
            className={`fixed z-9999 pointer-events-none transition-all duration-200 ease-out ${
              showPreview
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-2 scale-95 pointer-events-none"
            }`}
            style={{
              top: previewPos.top,
              left: previewPos.left,
              transform: `translateY(-100%) ${showPreview ? "scale(1)" : "scale(0.95)"}`,
            }}
          >
            <div className="rounded-xl overflow-hidden shadow-2xl ring-1 ring-black/10 dark:ring-white/15 bg-white dark:bg-gray-900">
              <img src={photo} alt={value} className="w-28 h-28 object-cover" />
              <div className="px-2.5 py-1.5 text-center">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate max-w-28">
                  {value}
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

type RecordTableCellDisplayModeProps = {
  columnDefinition: ColumnDefinition;
  value: unknown;
  record?: RecordData;
};

export const RecordTableCellDisplayMode = ({
  columnDefinition,
  value,
  record,
}: RecordTableCellDisplayModeProps) => {
  const isEmptyValue =
    value == null || (typeof value === "string" && value.trim() === "");

  // ── Custom render support ──
  if (columnDefinition.renderCell) {
    return (
      <div
        className={`flex items-center w-full h-full overflow-hidden whitespace-nowrap ${
          columnDefinition.fieldName === "emailBounce" ? "px-0" : "px-2"
        }`}
      >
        {columnDefinition.renderCell(record ?? ({} as RecordData))}
      </div>
    );
  }

  // ── Label identifier: Avatar chip (like Twenty's ChipFieldDisplay → RecordChip) ──
  // Skip for ENTERPRISE_LOGO — it has its own logo+name display in the switch block
  if (
    columnDefinition.isLabelIdentifier &&
    value &&
    columnDefinition.type !== "ENTERPRISE_LOGO"
  ) {
    return (
      <LabelIdentifierChip
        value={String(value)}
        photo={
          columnDefinition.fieldName === "titre"
            ? null
            : ((record as any)?._enterpriseLogoUrl ?? (record as any)?.photo)
        }
        monochromeAvatar={columnDefinition.fieldName === "titre"}
      />
    );
  }

  const displayValue = () => {
    switch (columnDefinition.type) {
      case "RELATION": {
        const isVille =
          columnDefinition.fieldName === "ville" ||
          columnDefinition.fieldName === "city";
        if (!isVille) {
          return isEmptyValue ? (
            <DashDisplay />
          ) : (
            <EllipsisText>{String(value)}</EllipsisText>
          );
        }
        // For ville: show country flag + city name
        const raw = (record as any)?._raw || (record as any)?.raw;
        const flagUrl =
          raw?.city?.country?.flag_url ||
          raw?.user?.city?.country?.flag_url ||
          (record as any)?.city_flag_url ||
          "";
        const cityName = String(value ?? "").trim();
        const isCityEmpty = !cityName || cityName === "-" || cityName === "—";
        if (isCityEmpty) {
          return (
            <span className="flex items-center justify-center h-5 max-w-full overflow-hidden whitespace-nowrap text-[11.5px] text-gray-300 dark:text-gray-500 w-full ">
              —
            </span>
          );
        }
        return (
          <div className="flex items-center gap-1 pl-2 overflow-hidden">
            {flagUrl && (
              <img
                src={flagUrl}
                alt="flag"
                className="h-2! w-3! shrink-0 rounded-[1.5px] opacity-75 bg-gray-50"
                loading="lazy"
              />
            )}
            <span className="truncate text-[11px] text-gray-700 dark:text-gray-300">
              {cityName}
            </span>
          </div>
        );
      }

      case "CV_SCORE": {
        const raw = (record as any)?._raw ?? record;
        const cvId = Number((record as any)?.cvId ?? raw?.cv_id ?? 0) || null;
        const hasLocalCvProcessing =
          cvId != null && Boolean(getCvLocalProcessingStartAt(cvId));
        const scoreRaw = (record as any)?.cvScore;
        const score =
          typeof scoreRaw === "number"
            ? scoreRaw
            : scoreRaw == null
              ? null
              : Number(scoreRaw);
        const cvLabel = (record as any)?.cv ?? "";
        const cvEtatRaw =
          raw?.cv?.etat ??
          raw?.cv?.statut ??
          raw?.statut_cv ??
          raw?.etat_cv ??
          raw?.["etat-cv"] ??
          (record as any)?.etatCV ??
          "";
        const cvEtat = String(cvEtatRaw || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();
        const isCvEtatValide = cvEtat === "valide" || cvEtat === "validee";
        const isCvEtatNonValide =
          cvEtat === "non valide" ||
          cvEtat === "non_valide" ||
          cvEtat === "non validee" ||
          cvEtat === "non_validee";

        // If regeneration was launched locally, force pending state immediately.
        if (hasLocalCvProcessing) {
          return (
            <div className="flex justify-center w-full">
              <CvEnCoursBadge cvId={cvId} />
            </div>
          );
        }

        // If no CV, display "No CV"
        if (cvLabel === "No CV") {
          return <DashDisplay centered />;
        }

        // New backend-integrated CV state logic:
        // - score null + etat Nouveau => En cours
        if (score == null && cvLabel !== "No CV") {
          return (
            <div className="flex justify-center w-full">
              <CvEnCoursBadge cvId={cvId ?? (record as any)?.cvId} />
            </div>
          );
        }

        // - score 0 + etat Validée/Valide => Erreur correction
        if (score === 0 && isCvEtatValide) {
          return (
            <div className="flex justify-center w-full">
              <Badge
                variant="outline"
                className="text-[9px]! h-5! flex items-center gap-1 border-orange-400 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/20"
              >
                <XCircle className="size-2.5!" />
                Erreur correction
              </Badge>
            </div>
          );
        }

        // - score 0 + etat Non validée => Non CV
        if (score === 0 && isCvEtatNonValide) {
          return (
            <div className="flex justify-center w-full">
              <Badge
                variant="outline"
                className="text-[9px]! h-5! flex items-center gap-1 border-red-400 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20"
              >
                <XCircle className="size-2.5!" />
                Non CV
              </Badge>
            </div>
          );
        }

        // Fallback for legacy rows: score 0 still shows processing badge
        if (score === 0) {
          return (
            <div className="flex justify-center w-full">
              <CvEnCoursBadge cvId={(record as any)?.cvId} />
            </div>
          );
        }

        return (
          <div className="flex justify-center w-full">
            <ScoreGauge score={score ?? 0} size="sm" />
          </div>
        );
      }

      case "PHOTO_SCORE": {
        const score = (record as any)?.photoScore ?? 0;
        const hasPhoto = (record as any)?.hasPhoto;
        const raw = (record as any)?._raw ?? record;
        const photoEtat =
          (record as any)?.photoEtat ??
          raw?.photo_profil?.etat ??
          raw?.photo_profil_etat ??
          null;

        // If no photo, display nothing
        if (!hasPhoto) {
          return <DashDisplay centered />;
        }

        // If photo_profil_etat is "Non validée", show Non validée badge
        if (photoEtat === "Non validée" || photoEtat === "Non_Validée") {
          return (
            <div className="flex justify-center w-full">
              <Badge
                variant="outline"
                className="text-[9px]! h-5! flex items-center gap-1 border-red-400 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20"
              >
                <XCircle className="size-2.5!" />
                Non validée
              </Badge>
            </div>
          );
        }

        // Score = 0 or pending states means photo is being evaluated — show hover popover with dates
        if (
          score === 0 ||
          photoEtat === "En attente" ||
          photoEtat === "Nouveau"
        ) {
          return (
            <div className="flex justify-center w-full">
              <PhotoEnCoursBadge
                userId={(record as any)?._userId}
                viewToken={(record as any)?.photoViewToken}
                initialCreatedAt={
                  (record as any)?.photoCreatedAt ??
                  raw?.photo_profil?.created_at ??
                  raw?.photo_profil_created_at ??
                  null
                }
                initialUpdatedAt={
                  (record as any)?.photoUpdatedAt ??
                  raw?.photo_profil?.updated_at ??
                  raw?.photo_profil_updated_at ??
                  null
                }
              />
            </div>
          );
        }

        return (
          <div className="flex justify-center w-full">
            <ScoreGauge score={score} size="sm" />
          </div>
        );
      }

      case "PREMIUM_BADGE": {
        const premium = !!value;
        const scheduledDate = (record as any)?.premium_affected_at;
        const premiumUpgradeCount = Number(
          (record as any)?.premiumUpgradeCount ?? 0,
        );

        if (premium) {
          return (
            <div className="flex justify-center w-full">
              <Badge
                variant="primary"
                className="text-[9px] h-4.5! px-1! min-w-5! p-0! text-primary! flex items-center gap-0.5 bg-muted/30! rounded-full!"
              >
                <Crown className="size-2.5!" />
                <span className="tabular-nums leading-none">
                  {premiumUpgradeCount}
                </span>
              </Badge>
            </div>
          );
        }

        if (scheduledDate) {
          const [year, month, day] = scheduledDate.split("-");
          const date = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
          );
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (date > today) {
            return (
              <div className="flex justify-center w-full">
                <Badge
                  variant="outline"
                  className="text-[9px] flex items-center gap-1 border-blue-400 text-blue-600 dark:text-blue-400"
                >
                  <Clock className="size-3" />
                  Wait
                </Badge>
              </div>
            );
          }
        }

        return (
          <div className="flex justify-center w-full">
            <span className="inline-flex items-center gap-1.5 rounded-full text-[9px] font-semibold leading-none transition-all duration-200">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-gray-500" />
              <span>Non</span>
            </span>
          </div>
        );
      }

      case "MULTI_SELECT": {
        const items = (value as any[]) || [];
        const displayList: string[] = items
          .map((item: any) => {
            if (typeof item === "string") return item;
            return item?.titre || item?.name || item?.label || "";
          })
          .filter(Boolean);

        const isContractLikeField =
          columnDefinition.fieldName === "typeContrat" ||
          columnDefinition.fieldName === "typeStage";

        if (isContractLikeField) {
          if (displayList.length === 0) {
            return <DashDisplay centered />;
          }
          const visible = displayList.slice(0, 2);
          const remaining = Math.max(0, displayList.length - visible.length);

          return (
            <div className="flex items-center gap-1 pl-2 overflow-hidden">
              {visible.map((label) => (
                <Tag key={label} text={label} color="gray" preventShrink />
              ))}
              {remaining > 0 && (
                <Tag text={`+${remaining}`} color="gray" preventShrink />
              )}
            </div>
          );
        }

        const isEcolesPreviewField =
          columnDefinition.fieldName === "formationsPreview" ||
          columnDefinition.fieldName === "calendarPreview" ||
          columnDefinition.fieldName === "campusSitesPreview";

        if (isEcolesPreviewField && displayList.length === 0) {
          return <div className="flex items-center pl-2 overflow-hidden" />;
        }

        return (
          <div className="flex items-center pl-2 overflow-hidden text-[12px] text-gray-700 dark:text-gray-300">
            {displayList.length > 0 ? (
              <span className="truncate" title={displayList.join(", ")}>
                {displayList.slice(0, 2).join(", ")}
                {displayList.length > 2 ? "…" : ""}
              </span>
            ) : (
              "—"
            )}
          </div>
        );
      }

      // ── Empty cell ──
      case "SELECT": {
        // ... (rest of SELECT logic)
        const option = columnDefinition.options?.find(
          (o) => o.value === String(value),
        );
        if (option) {
          return (
            <div className="flex items-center pl-2 overflow-hidden">
              <Tag
                text={option.label}
                color={
                  (option.color as
                    | "green"
                    | "red"
                    | "blue"
                    | "yellow"
                    | "purple"
                    | "orange"
                    | "gray") ?? "gray"
                }
                preventShrink
              />
            </div>
          );
        }
        return isEmptyValue ? (
          <DashDisplay />
        ) : (
          <EllipsisText>{String(value)}</EllipsisText>
        );
      }
      // ... (rest of switch cases)

      // ── Date: formatted in EllipsisDisplay (like Twenty's DateDisplay) ──
      case "DATE":
        if (isEmptyValue) return <DashDisplay />;
        try {
          const rawDateValue = String(value).trim();
          const isDateOnlyValue = /^\d{4}-\d{2}-\d{2}$/.test(rawDateValue);
          const parsedDate = isDateOnlyValue
            ? new Date(`${rawDateValue}T00:00:00`)
            : new Date(rawDateValue);

          return (
            <EllipsisText>
              {new Intl.DateTimeFormat("fr-FR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                ...(isDateOnlyValue
                  ? {}
                  : {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
              }).format(parsedDate)}
            </EllipsisText>
          );
        } catch {
          return isEmptyValue ? (
            <DashDisplay />
          ) : (
            <EllipsisText>{String(value)}</EllipsisText>
          );
        }

      // ── Number / Currency: in EllipsisDisplay (like Twenty's NumberDisplay) ──
      case "NUMBER":
      case "CURRENCY":
        return isEmptyValue ? (
          <DashDisplay />
        ) : (
          <EllipsisText tabularNums>{String(value)}</EllipsisText>
        );

      // ── Email: ContactLink style (underlined, gray underline → dark on hover) ──
      case "EMAIL":
        return <EmailDisplay value={isEmptyValue ? "" : String(value)} />;

      // ── URL: RoundedLink style (pill-shaped, bordered) ──
      case "URL":
        return <RoundedLinkDisplay value={isEmptyValue ? "" : String(value)} />;

      // ── Phone: ContactLink style with glassmorphic container ──
      case "PHONE":
        return <PhoneDisplay value={isEmptyValue ? "" : String(value)} />;

      // ── Enterprise Logo: Display logo + name ──
      case "ENTERPRISE_LOGO": {
        const entrepriseName = (record as any)?._entrepriseName ?? value ?? "";
        const logoUrl = (record as any)?._enterpriseLogoUrl ?? null;
        return (
          <EnterpriseLogoDisplay
            name={String(entrepriseName)}
            logoUrl={logoUrl}
          />
        );
      }

      // ── Default text: EllipsisDisplay (like Twenty's TextDisplay) ──
      default:
        return isEmptyValue ? (
          <DashDisplay />
        ) : (
          <EllipsisText>{String(value)}</EllipsisText>
        );
    }
  };

  return (
    <div className="flex items-center w-full h-full overflow-hidden whitespace-nowrap">
      {displayValue()}
    </div>
  );
};

/**
 * EllipsisDisplay — matches Twenty's EllipsisDisplay.tsx
 * Height 20px, overflow hidden, text-overflow ellipsis, whitespace nowrap
 */
const EllipsisText = ({
  children,
  tabularNums,
}: {
  children: React.ReactNode;
  tabularNums?: boolean;
}) => (
  <div
    className={`flex items-center h-5 max-w-full overflow-hidden text-ellipsis whitespace-nowrap pl-2 text-[11px] text-gray-900 dark:text-gray-100 ${tabularNums ? "tabular-nums" : ""}`}
  >
    {children}
  </div>
);

const DashDisplay = ({ centered = false }: { centered?: boolean }) => (
  <div
    className={`flex items-center justify-center h-5 max-w-full overflow-hidden whitespace-nowrap text-[11.5px] text-gray-300 dark:text-gray-500 w-full ${
      centered ? "justify-center w-full" : ""
    }`}
  >
    —
  </div>
);

/**
 * Email display — Twenty-style tag (simple chip, no actions)
 * Edit button is handled by RecordTableCellContainer on hover
 * Transparent background with glassmorphic border (no color)
 */
const EmailDisplay = ({ value }: { value: string }) => {
  if (!value) return <DashDisplay />;

  return (
    <div className="flex items-center overflow-hidden max-w-full px-1">
      <div className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#00000005] backdrop-blur-sm border border-gray-200 dark:border-gray-600 max-w-full overflow-hidden">
        <span className="text-[11.5px]! text-[#333] dark:text-gray-100 truncate font-medium">
          {value}
        </span>
      </div>
    </div>
  );
};

/**
 * Phone display — matches EmailDisplay with transparent glassmorphic style
 * Copy button is handled by RecordTableCellContainer on hover for PHONE cells
 */
const PhoneDisplay = ({ value }: { value: string }) => {
  if (!value) return <DashDisplay />;

  return (
    <div className="flex items-center overflow-hidden max-w-full px-1">
      <div className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#00000005] backdrop-blur-sm border border-gray-200 dark:border-gray-600 max-w-full overflow-hidden">
        <span className="text-[11.5px]! text-[#333] dark:text-gray-100 truncate font-medium">
          {value}
        </span>
      </div>
    </div>
  );
};

/**
 * RoundedLink display — matches Twenty's RoundedLink.tsx
 * Pill-shaped, bordered, light background, hover effect
 */
const RoundedLinkDisplay = ({ value }: { value: string }) => {
  if (!value) return <DashDisplay />;

  const href = value.startsWith("http") ? value : `https://${value}`;
  const display = value.replace(/^https?:\/\/(?:www\.)?/, "");

  return (
    <div className="flex items-center overflow-hidden max-w-full">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center px-2.5 py-1.5 rounded-full bg-white/5 dark:bg-white/5 backdrop-blur-sm border border-white/10 dark:border-white/10 text-[12px] text-gray-500 dark:text-gray-100 whitespace-nowrap overflow-hidden text-ellipsis font-medium no-underline select-none hover:bg-white/10 dark:hover:bg-white/8 hover:text-blue-600 dark:hover:text-blue-400 active:bg-white/15 dark:active:bg-white/10 transition-all duration-200 max-w-full"
        onClick={(e) => e.stopPropagation()}
        title={value}
      >
        {display}
      </a>
    </div>
  );
};

/**
 * EnterpriseLogoDisplay — Premium company badge with logo, name and subtle glow.
 */
const EnterpriseLogoDisplay = ({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}) => {
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
    if (!logoUrl) return;
    updatePosition();
    timeoutRef.current = setTimeout(() => setShowPreview(true), 350);
  }, [logoUrl, updatePosition]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowPreview(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!name && !logoUrl) {
    return <DashDisplay />;
  }

  const initial = name?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="flex items-center h-7 max-w-full pl-2 group/ent">
      <span
        ref={chipRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="
          inline-flex items-center gap-2 max-w-full
          px-1.5 py-1 rounded-lg
          bg-white dark:bg-gray-800/80
          ring-1 ring-inset ring-gray-200/70 dark:ring-gray-700/50
          shadow-sm shadow-gray-200/50 dark:shadow-black/10
          transition-all duration-200
          group-hover/ent:shadow-md group-hover/ent:ring-blue-300/40 dark:group-hover/ent:ring-blue-600/30
        "
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={name}
            className="w-4 h-4 rounded-sm! object-cover shrink-0 ring-1 ring-gray-200/80 dark:ring-gray-600/50"
          />
        ) : (
          <div
            className="
              w-4 h-4 rounded-md shrink-0 flex items-center justify-center
              bg-gray-100 dark:from-blue-900/50 dark:to-indigo-900/40
              text-[9px] pt-0.5 font-bold text-gray-700 dark:text-blue-300
              ring-1 ring-inset ring-gray-300/70 dark:ring-blue-700/40
            "
          >
            {initial}
          </div>
        )}
        <span className="text-[10px] font-medium text-gray-700 dark:text-gray-200 truncate">
          {name}
        </span>
      </span>

      {/* Portal-based hover logo preview */}
      {logoUrl &&
        createPortal(
          <div
            className={`fixed z-9999 pointer-events-none transition-all duration-200 ease-out ${
              showPreview
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-2 scale-95 pointer-events-none"
            }`}
            style={{
              top: previewPos.top,
              left: previewPos.left,
              transform: `translateY(-100%) ${showPreview ? "scale(1)" : "scale(0.95)"}`,
            }}
          >
            <div className="rounded-xl overflow-hidden shadow-2xl ring-1 ring-black/10 dark:ring-white/15 bg-white dark:bg-gray-900">
              <img
                src={logoUrl}
                alt={name}
                className="w-32 h-32 object-contain bg-white dark:bg-gray-800 p-2"
              />
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
};
