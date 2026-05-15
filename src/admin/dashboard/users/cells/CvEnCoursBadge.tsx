/**
 * CvEnCoursBadge — "En cours" badge for the CV column.
 *
 * When hovered it lazily fetches the CV record and shows:
 *  • Déposé le   (created_at)
 *  • Mis à jour  (updated_at)
 *  • Temps écoulé depuis le dépôt
 *
 * Only renders when cvScore === 0 and cv !== "No CV" (i.e. CV is being processed).
 */

import { useState, useCallback, useEffect } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import {
  Hourglass,
  CalendarClock,
  RefreshCw,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  clearCvLocalProcessingStartAt,
  fetchCvById,
  getCvLocalProcessingStartAt,
  regenerateCvScore,
  invalidateCvCache,
  notifyCvUpdated,
  setCvLocalProcessingStartAt,
  subscribeCvUpdates,
} from "@/hooks/cvFallback";
import { toast } from "sonner";

// ── helpers ────────────────────────────────────────────────────────────────

function formatDate(raw: string | undefined | null): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString("fr-MA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function elapsed(raw: string | undefined | null): {
  label: string;
  isLong: boolean;
} {
  if (!raw) return { label: "—", isLong: false };
  const ms = Date.now() - new Date(raw).getTime();
  if (isNaN(ms)) return { label: "—", isLong: false };

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let label: string;
  if (days >= 1) label = `${days} j ${hours % 24} h`;
  else if (hours >= 1) label = `${hours} h ${minutes % 60} min`;
  else if (minutes >= 1) label = `${minutes} min`;
  else label = `${seconds} s`;

  // Flag as long if processing > 30 minutes (potential issue)
  const isLong = minutes >= 30;
  return { label, isLong };
}

// ── component ──────────────────────────────────────────────────────────────

interface CvEnCoursBadgeProps {
  cvId: number | string | null | undefined;
}

export function CvEnCoursBadge({ cvId }: CvEnCoursBadgeProps) {
  const [cvData, setCvData] = useState<{
    createdAt?: string;
    updatedAt?: string;
    created_at?: string;
    updated_at?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [localProcessingStartAt, setLocalProcessingStartAt] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!cvId) {
      setLocalProcessingStartAt(null);
      return;
    }
    const stored = getCvLocalProcessingStartAt(Number(cvId));
    setLocalProcessingStartAt(stored);
  }, [cvId]);

  useEffect(() => {
    if (!cvId) return;
    let cancelled = false;

    const unsubscribe = subscribeCvUpdates(
      Number(cvId),
      async ({ data, source, updatedAt }) => {
      if (cancelled) return;

      if (source === "sheet" && !data) {
        const startAt = new Date(updatedAt).toISOString();
        setLocalProcessingStartAt(startAt);
        setCvLocalProcessingStartAt(Number(cvId), startAt);
      }

      if (data) {
        setCvData(data as any);
        setError(false);
        return;
      }

      try {
        const refreshed = await fetchCvById(Number(cvId));
        if (!cancelled) {
          setCvData(refreshed as any);
          setError(false);
        }
      } catch {
        // Keep last known state if sync refresh fails
      }
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [cvId]);

  const handleOpenChange = useCallback(
    async (open: boolean) => {
      if (!open || !cvId || cvData) return;
      setLoading(true);
      setError(false);
      try {
        const data = await fetchCvById(Number(cvId));
        setCvData(data as any);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [cvId, cvData],
  );

  const createdAt = cvData?.created_at ?? cvData?.createdAt;
  const updatedAt = cvData?.updated_at ?? cvData?.updatedAt;
  const elapsedBase = localProcessingStartAt ?? updatedAt ?? createdAt;
  const { label: elapsedLabel, isLong } = elapsed(elapsedBase);

  useEffect(() => {
    if (!cvId || !localProcessingStartAt || !updatedAt) return;
    const localTs = new Date(localProcessingStartAt).getTime();
    const updatedTs = new Date(updatedAt).getTime();
    if (!isNaN(localTs) && !isNaN(updatedTs) && updatedTs >= localTs) {
      setLocalProcessingStartAt(null);
      clearCvLocalProcessingStartAt(Number(cvId));
    }
  }, [cvId, localProcessingStartAt, updatedAt]);

  const handleRegenerate = useCallback(async () => {
    if (!cvId || regenerating) return;
    setRegenerating(true);
    try {
      await regenerateCvScore({ cv_id: Number(cvId) });
      invalidateCvCache(Number(cvId));
      const startAt = new Date().toISOString();
      setLocalProcessingStartAt(startAt);
      setCvLocalProcessingStartAt(Number(cvId), startAt);
      notifyCvUpdated({
        cvId: Number(cvId),
        source: "popup",
      });
      const refreshed = await fetchCvById(Number(cvId));
      setCvData(refreshed as any);
      notifyCvUpdated({
        cvId: Number(cvId),
        data: refreshed as any,
        source: "popup",
      });
      setError(false);
      toast.success("Regénération du score CV lancée");
    } catch {
      toast.error("Erreur lors de la regénération du score CV");
    } finally {
      setRegenerating(false);
    }
  }, [cvId, regenerating]);

  return (
    <HoverCard openDelay={200} closeDelay={100} onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>
        <div className="flex justify-center w-full cursor-default">
          <Badge
            variant="outline"
            className="text-[9px]! h-5! flex items-center gap-1 border-amber-400 text-amber-600 dark:text-amber-400 bg-gray-50/50 dark:bg-amber-950/20 animate-pulse"
          >
            <Hourglass className="size-2! stroke-2" />
            En cours
          </Badge>
        </div>
      </HoverCardTrigger>

      <HoverCardContent
        className="w-60 p-3 text-xs space-y-2.5"
        side="top"
        align="center"
      >
        {/* Header */}
        <div
          className={`flex items-center gap-2 px-1 pb-1 text-xs mb-1 ${
            isLong
              ? "dark:bg-gray-950/30 text-gray-600 dark:text-gray-400 border-b border-gray-200"
              : "dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-b border-gray-200"
          }`}
        >
          <Clock className="size-3 shrink-0" />
          <span className="font-medium text-[11px]">
            En traitement depuis&nbsp;
            <span className="font-bold text-amber-500">{elapsedLabel}</span>
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <RefreshCw className="size-3 animate-spin" />
            <span>Chargement…</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-1.5 text-gray-500">
            <AlertTriangle className="size-3" />
            <span>Impossible de charger les dates</span>
          </div>
        ) : (
          <>
            {/* Deposited at */}
            <div className="flex items-center gap-2 px-1 py-1 mb-1">
              <CalendarClock className="size-3 mt-1 text-gray-400 shrink-0" />
              <div>
                <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wide text-[9px] font-medium">
                  Déposé le
                </p>
                <p className="text-gray-700 dark:text-gray-200 font-medium text-[11px]">
                  {formatDate(createdAt)}
                </p>
              </div>
            </div>

            {/* Updated at */}
            <div className="flex items-center gap-2 px-1">
              <RefreshCw className="size-3 mt-0.5 text-gray-400 shrink-0" />
              <div>
                <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wide text-[9px] font-medium">
                  Dernière mise à jour
                </p>
                <p className="text-gray-700 dark:text-gray-200 font-medium text-[11px]">
                  {formatDate(updatedAt)}
                </p>
              </div>
            </div>
            <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={handleRegenerate}
                disabled={regenerating || !cvId}
                className="w-full text-[11px] px-2 py-1.5 bg-muted/50 rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60 cursor-pointer"
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  <RefreshCw
                    className={`size-3 ${regenerating ? "animate-spin" : ""}`}
                  />
                  <span>
                    {regenerating ? "Regénération…" : "Regénérer score CV"}
                  </span>
                </span>
              </button>
            </div>
          </>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
