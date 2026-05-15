import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Loader2,
  CalendarCheck,
  CalendarX,
  Hash,
  ChevronDown,
  Package,
  DollarSign,
  CalendarRange,
  RefreshCcw,
  BadgeInfo,
} from "lucide-react";
import { apiGetCandidatById } from "@/api/candidates";
import { apiGetRecruteurById } from "@/api/recruteurs";
import { useRecordTableContextOrThrow } from "@/components/twenty-table/contexts";
import { sidePanelRecordIdAtom } from "../../local/side-panel/states";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type PremiumPack = {
  abonnement_id: number;
  code_abonnement?: string | null;
  statut?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  prochaine_facturation?: string | null;
  renouvellement_auto?: boolean | null;
  plan?: {
    periode_facturation?: string | null;
    intervalle_facturation?: number | null;
    max_utilisateurs?: number | null;
  } | null;
  produit?: {
    nom?: string | null;
    slug?: string | null;
    prix?: string | null;
    type?: string | null;
  } | null;
};

type PremiumDetails = {
  enabled?: boolean;
  affected_at?: string | null;
  expires_at?: string | null;
  nb_affected?: number | null;
  credit?: number | null;
  packs?: PremiumPack[];
};

type PremiumPayload = {
  premium_details?: PremiumDetails | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusClass = (status?: string | null) => {
  const s = String(status || "").toLowerCase();
  if (s === "active")
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (s === "pending")
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
};

// ── Info row (icon + label + value, matches CandidatSidePanelPage rows) ──

function InfoRow({
  icon,
  label,
  value,
  className,
  leadingClassName,
  labelClassName,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  className?: string;
  leadingClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
}) {
  return (
    <div className={`flex items-center gap-3 h-7 px-5 ${className ?? ""}`}>
      <div
        className={`flex items-center shrink-0 ${leadingClassName ?? "gap-3"}`}
      >
        <div className="shrink-0 text-gray-400 dark:text-gray-500">{icon}</div>
        <div
          className={`shrink-0 w-28 text-[11px] text-gray-500 dark:text-gray-400 truncate ${labelClassName ?? ""}`}
        >
          {label}
        </div>
      </div>
      <div
        className={`flex-1 text-[11px] text-gray-900 dark:text-gray-100 truncate min-w-0 ${valueClassName ?? ""}`}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}

// ── CollapsibleSection (exact match of CandidatSidePanelPage) ──

function CollapsibleSection({
  title,
  defaultOpen = true,
  count,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100 dark:border-gray-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center w-full px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-semibold text-[0.6875rem] uppercase tracking-wider bg-transparent border-none cursor-pointer transition-colors"
      >
        <ChevronDown
          className={`w-3 h-3 mr-1.5 text-gray-400 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`}
        />
        <span className="flex-1 text-left">{title}</span>
        {count !== undefined && count > 0 && (
          <span className="ml-auto px-1.5 rounded-full text-[9px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 min-w-5 text-center leading-4">
            {count}
          </span>
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const SidePanelPremiumPacksPage = () => {
  const activeRecordId = useAtomValue(sidePanelRecordIdAtom);
  const { recordTableId } = useRecordTableContextOrThrow();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<PremiumDetails | null>(null);

  const isRecruteurTable = recordTableId === "recruteurs-table";

  const loadDetails = async () => {
    if (!activeRecordId) return;
    setLoading(true);
    setError(null);
    try {
      if (isRecruteurTable) {
        const recruteur = (await apiGetRecruteurById(
          Number(activeRecordId),
        )) as PremiumPayload;
        setDetails(recruteur?.premium_details ?? null);
      } else {
        const candidat = (await apiGetCandidatById(
          Number(activeRecordId),
        )) as PremiumPayload;
        setDetails(candidat?.premium_details ?? null);
      }
    } catch {
      setDetails(null);
      setError("Impossible de charger les packs premium.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [activeRecordId, isRecruteurTable]);

  const packs = details?.packs ?? [];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 text-center">
        <div className="space-y-2">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={loadDetails}
            className="text-[11px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="flex-1 overflow-y-auto min-h-0 bg-muted/40 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent"
    >
      Premium infos
    </motion.div>
  );
};
