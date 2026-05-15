/**
 * PhotoEnCoursBadge — "En cours" badge for the Photo column.
 *
 * When hovered it lazily fetches the photo analytics and shows:
 *  • Photo preview (if available)
 *  • Score status
 *  • Temps écoulé depuis le dépôt
 *  • Regenerate button
 *
 * Only renders when photoScore === 0 or etat is "En attente"/"Nouveau" (processing).
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
  clearPhotoLocalProcessingStartAt,
  fetchPhotoAnalyticsByUserId,
  getPhotoLocalProcessingStartAt,
  getViewPhotoUrl,
  invalidatePhotoCache,
  notifyPhotoUpdated,
  regeneratePhotoProfilScore,
  setPhotoLocalProcessingStartAt,
  subscribePhotoUpdates,
  type PhotoProfil,
} from "@/api/photo";
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

interface PhotoEnCoursBadgeProps {
  userId: number | string | null | undefined;
  viewToken?: string | null;
  initialCreatedAt?: string | null;
  initialUpdatedAt?: string | null;
}

export function PhotoEnCoursBadge({
  userId,
  viewToken,
  initialCreatedAt,
  initialUpdatedAt,
}: PhotoEnCoursBadgeProps) {
  const [photoData, setPhotoData] = useState<PhotoProfil | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [localProcessingStartAt, setLocalProcessingStartAt] = useState<
    string | null
  >(null);
  const [photoBlobUrl, setPhotoBlobUrl] = useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);

  const numericUserId = userId ? Number(userId) : null;

  // Load photo blob URL via view_token
  useEffect(() => {
    if (!viewToken) {
      setPhotoBlobUrl(null);
      return;
    }
    let cancelled = false;
    const loadPhoto = async () => {
      setLoadingPhoto(true);
      try {
        const blobUrl = await getViewPhotoUrl(viewToken);
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        setPhotoBlobUrl(blobUrl);
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setLoadingPhoto(false);
      }
    };
    loadPhoto();
    return () => {
      cancelled = true;
    };
  }, [viewToken]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (photoBlobUrl) {
        URL.revokeObjectURL(photoBlobUrl);
      }
    };
  }, [photoBlobUrl]);

  useEffect(() => {
    if (!numericUserId) {
      setLocalProcessingStartAt(null);
      return;
    }
    const stored = getPhotoLocalProcessingStartAt(numericUserId);
    setLocalProcessingStartAt(stored);
  }, [numericUserId]);

  useEffect(() => {
    if (!numericUserId) return;
    let cancelled = false;

    const unsubscribe = subscribePhotoUpdates(
      numericUserId,
      async ({ data, source, updatedAt }) => {
        if (cancelled) return;

        if (source === "sheet" && !data) {
          const startAt = new Date(updatedAt).toISOString();
          setLocalProcessingStartAt(startAt);
          setPhotoLocalProcessingStartAt(numericUserId, startAt);
        }

        if (data) {
          setPhotoData(data);
          setError(false);
          return;
        }

        try {
          const refreshed = await fetchPhotoAnalyticsByUserId(numericUserId);
          if (!cancelled) {
            setPhotoData(refreshed);
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
  }, [numericUserId]);

  const handleOpenChange = useCallback(
    async (open: boolean) => {
      if (!open || !numericUserId || photoData) return;
      setLoading(true);
      setError(false);
      try {
        const data = await fetchPhotoAnalyticsByUserId(numericUserId);
        setPhotoData(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [numericUserId, photoData],
  );

  const createdAt = photoData?.created_at ?? initialCreatedAt ?? null;
  const updatedAt = photoData?.updated_at ?? initialUpdatedAt ?? null;
  const elapsedBase = localProcessingStartAt ?? updatedAt ?? createdAt;
  const { label: elapsedLabel, isLong } = elapsed(elapsedBase);

  useEffect(() => {
    if (!numericUserId || !localProcessingStartAt || !updatedAt) return;
    const localTs = new Date(localProcessingStartAt).getTime();
    const updatedTs = new Date(updatedAt).getTime();
    if (!isNaN(localTs) && !isNaN(updatedTs) && updatedTs >= localTs) {
      setLocalProcessingStartAt(null);
      clearPhotoLocalProcessingStartAt(numericUserId);
    }
  }, [numericUserId, localProcessingStartAt, updatedAt]);

  const handleRegenerate = useCallback(async () => {
    if (!numericUserId || regenerating) return;
    setRegenerating(true);
    try {
      await regeneratePhotoProfilScore({ user_id: numericUserId });
      invalidatePhotoCache(numericUserId);
      const startAt = new Date().toISOString();
      setLocalProcessingStartAt(startAt);
      setPhotoLocalProcessingStartAt(numericUserId, startAt);
      
      // Dispatch event to update table record to show "En cours" badge
      window.dispatchEvent(
        new CustomEvent("photo-score-regenerate", {
          detail: {
            userId: numericUserId,
          },
        }),
      );
      
      notifyPhotoUpdated({
        userId: numericUserId,
        source: "popup",
      });
      const refreshed = await fetchPhotoAnalyticsByUserId(numericUserId);
      setPhotoData(refreshed);
      notifyPhotoUpdated({
        userId: numericUserId,
        data: refreshed ?? undefined,
        source: "popup",
      });
      setError(false);
      toast.success("Regénération du score photo lancée");
    } catch {
      toast.error("Erreur lors de la regénération du score photo");
    } finally {
      setRegenerating(false);
    }
  }, [numericUserId, regenerating]);

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
        className="w-64 p-3 text-xs space-y-2.5"
        side="top"
        align="center"
      >
        {/* Photo preview */}
        {loadingPhoto ? (
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 flex items-center justify-center">
              <RefreshCw className="size-4 animate-spin text-gray-400" />
            </div>
          </div>
        ) : photoBlobUrl ? (
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700">
              <img
                src={photoBlobUrl}
                alt="Photo profil"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          </div>
        ) : viewToken ? (
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 flex items-center justify-center">
              <AlertTriangle className="size-4 text-gray-400" />
            </div>
          </div>
        ) : null}

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
            <span>Impossible de charger les données</span>
          </div>
        ) : (
          <>
            {/* Created at */}
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
                disabled={regenerating || !numericUserId}
                className="w-full text-[11px] px-2 py-1.5 bg-muted/50 rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60 cursor-pointer"
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  <RefreshCw
                    className={`size-3 ${regenerating ? "animate-spin" : ""}`}
                  />
                  <span>
                    {regenerating ? "Regénération…" : "Regénérer score photo"}
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
