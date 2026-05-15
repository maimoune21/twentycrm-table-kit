import { useMemo, useState, useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import {
  FileText,
} from "lucide-react";
import { getViewCvUrl } from "@/hooks/cvFallback";
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
import { sidePanelRecordIdAtom } from "../../local/side-panel/states";
import { useRecordTableContextOrThrow } from "@/components/twenty-table/contexts/RecordTableContext";
import type { RecordData } from "@/components/twenty-table/types";
import {
  fetchCvCategories,
  type CategoryItem,
} from "@/api/cv-analytics/cv-questions-categories";
import {
  fetchCvQuestions,
  type CvQuestionsData,
  type Question,
} from "@/api/cv-analytics/cv-questions";

interface Issue {
  title: string;
  level: string;
  conseile?: string;
}

const LEVEL_COLORS = {
  A: { dot: "bg-green-500", border: "border-l-green-500/50" },
  B: { dot: "bg-yellow-500", border: "border-l-yellow-500/50" },
  C: { dot: "bg-red-500", border: "border-l-red-500/50" },
};

function getToFixCountByCategoryId(
  questionsData: CvQuestionsData | null,
): Record<number, number> {
  const counts: Record<number, number> = {};
  if (!questionsData) return counts;
  (
    Object.keys(questionsData.resultats) as Array<
      keyof CvQuestionsData["resultats"]
    >
  ).forEach((levelKey) => {
    const questions = questionsData.resultats[levelKey] || [];
    questions.forEach((q) => {
      if (q?.response !== 0) return;
      if (typeof q.category_id !== "number") return;
      counts[q.category_id] = (counts[q.category_id] ?? 0) + 1;
    });
  });
  return counts;
}

function formatCvDate(raw: string | undefined | null): string {
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

function elapsedSince(raw: string | undefined | null): string {
  if (!raw) return "—";
  const ms = Date.now() - new Date(raw).getTime();
  if (isNaN(ms)) return "—";

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days >= 1) return `${days} j ${hours % 24} h`;
  if (hours >= 1) return `${hours} h ${minutes % 60} min`;
  if (minutes >= 1) return `${minutes}min ${seconds % 60}s`;
  return `${seconds} s`;
}

export const SidePanelCvScorePage = () => {
  const activeRecordId = useAtomValue(sidePanelRecordIdAtom);
  const [activeTab, setActiveTab] = useState<"cv" | "stats">("cv");

  // Stats state
  const [statsCategoryTab, setStatsCategoryTab] = useState<string>("");
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [cvData, setCvData] = useState<CvQuestionsData | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [toFixCountByCategoryId, setToFixCountByCategoryId] = useState<
    Record<number, number>
  >({});
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [cvMeta, setCvMeta] = useState<{
    created_at?: string;
    createdAt?: string;
    updated_at?: string;
    updatedAt?: string;
  } | null>(null);
  const [loadingCvMeta, setLoadingCvMeta] = useState(false);
  const [regeneratingScore, setRegeneratingScore] = useState(false);
  const [forcedPending, setForcedPending] = useState(false);
  const [localProcessingStartAt, setLocalProcessingStartAt] = useState<
    string | null
  >(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const tabsListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lastResolvedUserIdRef = useRef<number | null>(null);

  const ctx = useRecordTableContextOrThrow();

  const recordInfo = useMemo(() => {
    if (!activeRecordId) {
      return {
        label: "Candidat",
        cvScore: null as number | null,
        hasCv: false,
        userId: null as number | null,
      };
    }

    const record = ctx.records.find((r: RecordData) => r.id === activeRecordId);
    const raw: any = (record?._raw ?? record) as any;

    const label =
      String(
        raw?.nomComplet ??
          raw?.nom_complet ??
          (record as any)?.nomComplet ??
          "",
      ) ||
      String(raw?.nom ?? (record as any)?.nom ?? "") ||
      "Candidat";

    const cvScore = (raw?.cvScore ??
      raw?.cv_score ??
      (record as any)?.cvScore ??
      null) as number | null;

    const cvId = ((record as any)?.cvId ?? raw?.cv_id ?? null) as number | null;

    const hasCv = Boolean(
      raw?.hasCv ??
        raw?.has_cv ??
        (record as any)?.hasCv ??
        cvId ??
        raw?.cv ??
        (cvScore !== null && cvScore !== undefined),
    );

    const userId = ((record as any)?._userId ?? raw?.user_id ?? null) as
      | number
      | null;

    const cvViewToken = (raw?.cv_view_token ?? null) as string | null;

    return { label, cvScore, hasCv, userId, cvId, cvViewToken };
  }, [activeRecordId, ctx.records]);

  // Reset all state when candidate changes (ignore transient null during refetch)
  useEffect(() => {
    if (recordInfo.userId == null) return;
    if (lastResolvedUserIdRef.current === recordInfo.userId) return;
    lastResolvedUserIdRef.current = recordInfo.userId;

    setCategories([]);
    setCvData(null);
    setIssues([]);
    setExpandedLevels(new Set());
    setToFixCountByCategoryId({});
    setStatsCategoryTab("");
    setCvMeta(null);
    setForcedPending(false);
    setLocalProcessingStartAt(null);
    setPdfUrl(null);
  }, [recordInfo.userId]);

  useEffect(() => {
    if (!recordInfo.cvId) {
      setLocalProcessingStartAt(null);
      return;
    }
    const stored = getCvLocalProcessingStartAt(Number(recordInfo.cvId));
    setLocalProcessingStartAt(stored);
  }, [recordInfo.cvId]);

  // Load CV metadata (created/updated dates) for pending CV status details
  useEffect(() => {
    const pending =
      recordInfo.hasCv &&
      (recordInfo.cvScore === null || recordInfo.cvScore === 0);
    if (!pending || !recordInfo.cvId) return;
    let cancelled = false;
    const loadCvMeta = async () => {
      setLoadingCvMeta(true);
      try {
        const data = await fetchCvById(Number(recordInfo.cvId));
        if (!cancelled) setCvMeta((data as any) ?? null);
      } catch {
        if (!cancelled) setCvMeta(null);
      } finally {
        if (!cancelled) setLoadingCvMeta(false);
      }
    };
    loadCvMeta();
    return () => {
      cancelled = true;
    };
  }, [recordInfo.hasCv, recordInfo.cvScore, recordInfo.cvId]);

  useEffect(() => {
    if (!recordInfo.cvId) return;
    let cancelled = false;

    const unsubscribe = subscribeCvUpdates(
      Number(recordInfo.cvId),
      async ({ data, source, updatedAt }) => {
        if (cancelled) return;

        if (source === "popup" && !data) {
          const startAt = new Date(updatedAt).toISOString();
          setForcedPending(true);
          setLocalProcessingStartAt(startAt);
          setCvLocalProcessingStartAt(Number(recordInfo.cvId), startAt);
        }

        if (data) {
          setCvMeta((data as any) ?? null);
          return;
        }

        try {
          const refreshed = await fetchCvById(Number(recordInfo.cvId));
          if (!cancelled) {
            setCvMeta((refreshed as any) ?? null);
          }
        } catch {
          // Keep previous metadata if sync refresh fails
        }
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [recordInfo.cvId]);

  // Load CV PDF URL via secure view_token
  const pdfBlobRef = useRef<string | null>(null);

  useEffect(() => {
    if (!recordInfo.hasCv || !recordInfo.cvViewToken) return;
    let cancelled = false;
    const load = async () => {
      setLoadingPdf(true);
      try {
        const blobUrl = await getViewCvUrl(recordInfo.cvViewToken!);
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        if (pdfBlobRef.current) URL.revokeObjectURL(pdfBlobRef.current);
        pdfBlobRef.current = blobUrl;
        setPdfUrl(blobUrl);
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setLoadingPdf(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [recordInfo.cvViewToken, recordInfo.hasCv]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfBlobRef.current) URL.revokeObjectURL(pdfBlobRef.current);
    };
  }, []);

  // Load categories when we have a valid user with a CV
  useEffect(() => {
    if (!recordInfo.hasCv || !recordInfo.userId) return;

    setLoadingCategories(true);
    const loadCategories = async () => {
      try {
        const [categoriesData, allQuestionsData] = await Promise.all([
          fetchCvCategories(),
          fetchCvQuestions(recordInfo.userId!),
        ]);

        const counts = getToFixCountByCategoryId(allQuestionsData);
        setToFixCountByCategoryId(counts);

        const decorated = categoriesData.map((cat, idx) => ({ cat, idx }));
        decorated.sort((a, b) => {
          const aCount = counts[a.cat.id] ?? 0;
          const bCount = counts[b.cat.id] ?? 0;
          if (aCount !== bCount) return bCount - aCount;
          return a.idx - b.idx;
        });

        const sortedCategories = decorated.map((d) => d.cat);
        setCategories(sortedCategories);
        setStatsCategoryTab(
          sortedCategories[0] ? String(sortedCategories[0].id) : "",
        );
      } catch (error) {
        console.error("Failed to load CV categories:", error);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, [recordInfo.userId, recordInfo.hasCv]);

  // Scroll active category tab into view
  useEffect(() => {
    const activeIdx = categories.findIndex(
      (c) => String(c.id) === String(statsCategoryTab),
    );
    if (activeIdx >= 0 && tabRefs.current[activeIdx]) {
      tabRefs.current[activeIdx]?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [statsCategoryTab, categories.length]);

  // Load questions when category tab changes
  useEffect(() => {
    if (
      !recordInfo.userId ||
      !recordInfo.hasCv ||
      !categories.length ||
      !statsCategoryTab
    )
      return;

    const loadQuestions = async () => {
      try {
        const categoryId = Number(statsCategoryTab);
        const questionsData = await fetchCvQuestions(
          recordInfo.userId!,
          categoryId,
        );
        setCvData(questionsData);

        if (questionsData) {
          const transformedIssues: Issue[] = [];
          (["level-a", "level-b", "level-c"] as const).forEach((levelKey) => {
            const levelLetter = levelKey.split("-")[1].toUpperCase();
            questionsData.resultats[levelKey]?.forEach((q: Question) => {
              transformedIssues.push({
                title: q.question,
                level: levelLetter,
                conseile: q.conseile,
              });
            });
          });
          setIssues(transformedIssues);
        }
      } catch (error) {
        console.error("Failed to load CV questions:", error);
      }
    };

    loadQuestions();
  }, [recordInfo.userId, statsCategoryTab, categories, recordInfo.hasCv]);

  const toggleLevel = (level: string) => {
    const newSet = new Set(expandedLevels);
    newSet.has(level) ? newSet.delete(level) : newSet.add(level);
    setExpandedLevels(newSet);
  };

  const isCvAnalysisPending =
    forcedPending ||
    (recordInfo.hasCv &&
      (recordInfo.cvScore === null || recordInfo.cvScore === 0));
  const createdAt = cvMeta?.created_at ?? cvMeta?.createdAt;
  const updatedAt = cvMeta?.updated_at ?? cvMeta?.updatedAt;
  const elapsedLabel = elapsedSince(
    localProcessingStartAt ?? updatedAt ?? createdAt,
  );

  useEffect(() => {
    if (!recordInfo.cvId || !localProcessingStartAt || !updatedAt) return;
    const localTs = new Date(localProcessingStartAt).getTime();
    const updatedTs = new Date(updatedAt).getTime();
    if (!isNaN(localTs) && !isNaN(updatedTs) && updatedTs >= localTs) {
      setLocalProcessingStartAt(null);
      clearCvLocalProcessingStartAt(Number(recordInfo.cvId));
    }
  }, [recordInfo.cvId, localProcessingStartAt, updatedAt]);

  const handleRegenerateScore = async () => {
    if (!recordInfo.cvId || regeneratingScore) return;
    setRegeneratingScore(true);
    try {
      await regenerateCvScore({ cv_id: Number(recordInfo.cvId) });
      invalidateCvCache(Number(recordInfo.cvId));
      setForcedPending(true);
      const startAt = new Date().toISOString();
      setLocalProcessingStartAt(startAt);
      setCvLocalProcessingStartAt(Number(recordInfo.cvId), startAt);

      // Dispatch event to update table record to show "En cours" badge immediately
      window.dispatchEvent(
        new CustomEvent("cv-score-regenerate", {
          detail: {
            cvId: Number(recordInfo.cvId),
            userId: recordInfo.userId,
            recordId: activeRecordId,
          },
        }),
      );

      notifyCvUpdated({
        cvId: Number(recordInfo.cvId),
        source: "sheet",
      });
      setLoadingCvMeta(true);
      const refreshed = await fetchCvById(Number(recordInfo.cvId));
      setCvMeta((refreshed as any) ?? null);
      notifyCvUpdated({
        cvId: Number(recordInfo.cvId),
        data: refreshed as any,
        source: "sheet",
      });
      toast.success("Regénération du score CV lancée");
    } catch {
      toast.error("Erreur lors de la regénération du score CV");
    } finally {
      setLoadingCvMeta(false);
      setRegeneratingScore(false);
    }
  };

  const shouldShowNoCvState =
    !recordInfo.hasCv &&
    !recordInfo.cvId &&
    !forcedPending &&
    !localProcessingStartAt &&
    !regeneratingScore;

  if (shouldShowNoCvState) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <FileText className="size-5 text-gray-400 dark:text-gray-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Aucun CV
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Ce candidat n'a pas encore de CV.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      Test
    </div>
  );
};
