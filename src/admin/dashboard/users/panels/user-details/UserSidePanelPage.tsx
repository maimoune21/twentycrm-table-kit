import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Briefcase,
  Star,
  FileText,
  Calendar,
  ChevronDown,
  Edit2,
  Check,
  X as XIcon,
  Search,
  Crown,
  Clock,
  Shield,
  User,
  ExternalLink,
  Download,
  Trash2,
  Globe,
  CalendarDays,
  Building2,
  Send,
  X,
  Hourglass,
  FileUser,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  parsePhoneNumber,
  getCountries,
  getCountryCallingCode,
} from "libphonenumber-js";
import "flag-icons/css/flag-icons.min.css";
import { getNames, registerLocale } from "i18n-iso-countries";
import frCountries from "i18n-iso-countries/langs/fr.json";
import { useRecordTableContextOrThrow } from "@/components/twenty-table/contexts";
import {
  useNavigateSidePanel,
  useOpenRecordInSidePanel,
  useSidePanelMenu,
} from "@/components/twenty-table/side-panel/hooks";

import { Tag } from "@/components/twenty-table/side-panel/components/SelectFieldInput";
import { useCandidatMutations } from "@/hooks/useAdminCandidatsV2";
import { apiGetCandidatById, apiDeleteCandidat } from "@/api/candidates";
import { getViewCvUrl, getViewPhotoUrl } from "@/hooks/cvFallback";
import { ScoreGauge } from "@/components/ui/score-gauge";
import {
  fetchCandidaturesByCandidatId,
  type Candidature,
} from "@/api/candidatures";
import {
  fetchCandidaturesSpontaneesByCandidatId,
  type CandidatureSpontanee,
} from "@/api/candidatures-spontanees";
import { useEcoleAutocomplete } from "@/hooks/useEcoleAutocomplete";
import useCitiesAutocomplete from "@/hooks/useCitiesAutocomplete";
import { upsertCandidatMetiers } from "@/api/candidat-metier";
import { apiUpdateCandidatsTypeContrat } from "@/api/candidats_type_contrat";
import { apiSetCandidatTypes } from "@/api/candidats_type_stage";
import {
  useFloating,
  offset,
  flip,
  shift,
  FloatingPortal,
} from "@floating-ui/react";
import type { RecordData } from "@/components/twenty-table";
import { ETAT_OPTIONS } from "../../../users/cells/constants";
import {
  useNiveauxEtudesOptions,
  useTypeContratOptions,
  useTypeStageOptions,
  useMetierSearch,
} from "../../../users/hooks";
import { Badge } from "@/components/ui/badge";
import { CountryFlag } from "@/components/ui/country-flag";

// Nationalities list from i18n-iso-countries
registerLocale(frCountries);
const NATIONALITY_OPTIONS: { label: string; value: string; code?: string }[] =
  Object.entries(getNames("fr"))
    .map(([code, name]) => ({
      label: name as string,
      value: name as string,
      code: code.toLowerCase(),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════

type CandidatDetail = {
  id: number;
  user_id: number;
  user: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    num_tel: string | null;
    ville?: { id: number; ville_name?: string; nom?: string } | null;
    city?: {
      id: number;
      name_fr?: string;
      name_en?: string;
      country?: { id: number; name?: string; flag_url?: string };
    } | null;
    registered_at?: string;
    last_login?: string | null;
  };
  ecole?: { id: number; titre?: string; abreviation?: string } | null;
  niveau_formation: string | null;
  etat: string | null;
  premium: boolean;
  nb_premium_affected: number;
  premium_affected_at?: string | null;
  cv_id: number | null;
  cv?: { id: number; view_token?: string } | null;
  cv_view_token?: string | null;
  photo_profil_view_token?: string | null;
  photo_profil_url?: string | null;
  metiers: { id: number; titre?: string; nom?: string }[];
  typeContrats: { id: number; name?: string; titre?: string }[];
  typeStages: { id: number; name?: string; titre?: string }[];
  created_at?: string;
  derniere_vue_profil?: string | null;
  nationalite?: string | null;
  date_naissance?: string | null;
  disponibilite?: string | null;
  date_demarrage?: string | null;
  date_diplome?: string | null;
};

type TabId = "summary" | "candidatures" | "activity" | "cv" | "photo";

// ═══════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const formatRelativeTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "Jamais";
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 30) return formatDate(dateStr);
    if (days > 0) return `il y a ${days}j`;
    if (hours > 0) return `il y a ${hours}h`;
    if (mins > 0) return `il y a ${mins}min`;
    return "À l'instant";
  } catch {
    return "—";
  }
};

// ═══════════════════════════════════════════════════════
// EditableField — Twenty-style inline row editor
// ═══════════════════════════════════════════════════════

function EditableTextField({
  icon,
  label,
  value,
  onSave,
  type = "text",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onSave: (newValue: string) => Promise<void>;
  type?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleEdit = () => {
    setEditValue(value);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch {
      // keep editing on failure
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-3 h-8 px-3 bg-gray-50/80 dark:bg-gray-500/10">
        <div className="shrink-0 text-gray-500 dark:text-gray-500">{icon}</div>
        <div className="shrink-0 w-26 text-[12px] text-gray-500 dark:text-gray-400 truncate">
          {label}
        </div>
        <input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setIsEditing(false);
          }}
          disabled={saving}
          className="flex-1 bg-transparent text-[12px] text-gray-900 dark:text-gray-100 border-none outline-none min-w-0"
        />
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleSave}
            className="p-0.5 text-gray-500 hover:bg-gray-500 dark:hover:bg-gray-500/30 rounded transition-colors"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setIsEditing(false)}
            className="p-0.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          >
            <XIcon className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 h-8 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group transition-colors"
      onClick={handleEdit}
    >
      <div className="shrink-0 text-gray-400 dark:text-gray-500">{icon}</div>
      <div className="shrink-0 w-26 text-[12px] text-gray-500 dark:text-gray-400 truncate">
        {label}
      </div>
      <div className="flex-1 text-[11px] text-gray-900 dark:text-gray-100 truncate min-w-0">
        {value || (
          <span className="text-gray-400 dark:text-gray-500">Non défini</span>
        )}
      </div>
      <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SelectRow — Twenty-style select field
// ═══════════════════════════════════════════════════════

function SelectRow({
  icon,
  label,
  value,
  options,
  tagClassName,
  onSave,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  options: { label: string; value: string; color?: string; code?: string }[];
  tagClassName?: string;
  onSave: (newValue: string) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedOption = options.find((o) => o.value === value);

  const { refs, floatingStyles } = useFloating({
    strategy: "fixed",
    placement: "bottom-start",
    middleware: [offset(4), flip(), shift()],
  });

  useEffect(() => {
    if (isOpen) {
      searchRef.current?.focus();
      setSearch("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const floating = refs.floating.current;
      const reference = refs.domReference.current;
      if (
        floating &&
        !floating.contains(e.target as Node) &&
        reference &&
        !reference.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, refs]);

  const filteredOptions = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = q
      ? options.filter((o) => o.label.toLowerCase().includes(q))
      : options;
    return [...filtered].sort((a, b) => {
      if (a.value === value && b.value !== value) return -1;
      if (b.value === value && a.value !== value) return 1;
      return 0;
    });
  }, [options, search, value]);

  return (
    <div
      ref={refs.setReference}
      className="flex items-center gap-3 h-8 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group transition-colors"
      onClick={() => setIsOpen(true)}
    >
      <div className="shrink-0 text-gray-400 dark:text-gray-500">{icon}</div>
      <div className="shrink-0 w-26 text-[12px] text-gray-500 dark:text-gray-400 truncate">
        {label}
      </div>
      <div className="flex-1 text-[11px] truncate min-w-0">
        {selectedOption ? (
          <span className="inline-flex items-center gap-1.5">
            {selectedOption.code && (
              <CountryFlag
                countryCode={selectedOption.code}
                width={14}
                height={9}
                radius={3}
                className="shadow-xs mb-0.5 pr-1"
              />
            )}
            <Tag
              label={selectedOption.label}
              color={selectedOption.color}
              className={tagClassName}
            />
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">Non défini</span>
        )}
      </div>
      <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />

      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setIsOpen(false);
              }
            }}
            className="z-9999 w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden"
          >
            <div className="flex items-center gap-2 px-2 py-1.5 border-b border-gray-100 dark:border-gray-800">
              <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                autoComplete="off"
                className="flex-1 bg-transparent border-none outline-none text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 min-w-0"
              />
            </div>
            <div className="max-h-48 overflow-y-auto py-0.5">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 text-center">
                  No options
                </div>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      if (opt.value !== value) onSave(opt.value);
                    }}
                    className={`flex items-center gap-2 w-full px-2 py-1.5 text-left border-none cursor-pointer transition-colors rounded-sm ${
                      opt.value === value
                        ? "bg-gray-100 dark:bg-gray-800"
                        : "bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                  >
                    <div className="shrink-0 size-3.5 flex items-center justify-center">
                      {opt.value === value && (
                        <Check className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                      )}
                    </div>
                    {opt.code && (
                      <CountryFlag
                        countryCode={opt.code}
                        width={14}
                        height={9}
                        radius={3}
                        className="shadow-xs"
                      />
                    )}
                    <Tag label={opt.label} color={opt.color} />
                  </button>
                ))
              )}
            </div>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// RelationRow — Autocomplete row for ville / ecole (matches table RelationSelectCell)
// ═══════════════════════════════════════════════════════

function RelationRow({
  icon,
  label,
  displayValue,
  fieldName,
  relationId,
  flagUrl,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  displayValue: string;
  fieldName: "ecole" | "ville";
  relationId?: number;
  flagUrl?: string;
  onSelect: (id: number, label: string) => Promise<void>;
}) {
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentFlagUrl, setCurrentFlagUrl] = useState(flagUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  const isEcole = fieldName === "ecole";

  const citiesAutocomplete = useCitiesAutocomplete({
    limit: 20,
    defaultOnEmpty: true,
    defaultLimit: 20,
    defaultPage: 1,
  });
  const ecoleAutocomplete = useEcoleAutocomplete({
    limit: 20,
    minLength: 1,
    defaultOnEmpty: true,
    defaultLimit: 20,
    defaultPage: 1,
  });

  const { refs, floatingStyles } = useFloating({
    strategy: "fixed",
    placement: "bottom-start",
    middleware: [offset(4), flip(), shift()],
  });

  // Normalised option lists
  const cityResults = useMemo(
    () =>
      (citiesAutocomplete.suggestions || [])
        .map((r: any) => ({
          id: Number(r.city_id || r.id || 0),
          label: r.name_fr || r.name_en || r.nom || r.label || "",
          flag_url: r.country?.flag_url as string | undefined,
          country_name: r.country?.name as string | undefined,
        }))
        .filter((r) => Number.isFinite(r.id) && r.id > 0),
    [citiesAutocomplete.suggestions],
  );

  const ecoleResults = useMemo(
    () =>
      (ecoleAutocomplete.suggestions || [])
        .map((r: any) => ({
          id: Number(r.id || 0),
          label: r.titre || r.abreviation || r.nom || "",
          logo_url: r.logo_url as string | undefined,
          type_etablissement: (r.type_etablissement ||
            r.type_ecole ||
            "") as string,
        }))
        .filter((r) => r.id > 0),
    [ecoleAutocomplete.suggestions],
  );

  // Trigger default load when dropdown opens
  useEffect(() => {
    if (!isOpen) return;
    if (isEcole) ecoleAutocomplete.searchEcoles(searchTerm);
    else citiesAutocomplete.setQuery(searchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  useEffect(() => {
    setCurrentFlagUrl(flagUrl);
  }, [flagUrl]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const floating = refs.floating.current;
      const reference = refs.reference.current;
      if (
        floating &&
        !floating.contains(e.target as Node) &&
        reference &&
        !(reference as HTMLElement).contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, refs]);

  const handleSearch = useCallback(
    (term: string) => {
      setSearchTerm(term);
      if (isEcole) ecoleAutocomplete.searchEcoles(term);
      else citiesAutocomplete.setQuery(term);
    },
    [isEcole, ecoleAutocomplete, citiesAutocomplete],
  );

  const handleClear = useCallback(
    async (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setIsOpen(false);
      setSearchTerm("");
      if (!isEcole) setCurrentFlagUrl(undefined);
      await onSelect(0, "");
    },
    [isEcole, onSelect],
  );

  const isLoading = isEcole
    ? ecoleAutocomplete.loading
    : citiesAutocomplete.loading;
  const isEmpty = isEcole
    ? ecoleResults.length === 0
    : cityResults.length === 0;

  return (
    <div
      ref={refs.setReference}
      className="flex items-center gap-3 h-8 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group transition-colors"
      onClick={() => {
        if (!isEcole) setIsOpen(true);
      }}
    >
      <div className="shrink-0 text-gray-400 dark:text-gray-500">{icon}</div>
      <div className="shrink-0 w-26 text-[12px] text-gray-500 dark:text-gray-400 truncate">
        {label}
      </div>
      <div className="flex-1 text-[11px] text-gray-900 dark:text-gray-100 truncate min-w-0 flex items-center gap-1.5">
        {!isEcole && currentFlagUrl && (
          <CountryFlag
            src={currentFlagUrl}
            alt="flag"
            width={12}
            height={9}
            radius={3}
            className="shadow-xs rounded-[2px]!"
          />
        )}
        {isEcole && displayValue ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const id = Number(relationId ?? 0);
              if (!id) return;
              openRecordInSidePanel({
                recordId: `eco-${id}`,
                objectNameSingular: displayValue,
              });
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 border border-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-[11px] text-gray-800 dark:text-gray-100 font-medium transition-colors cursor-pointer border-none max-w-full truncate"
            title="Voir l'école"
          >
            <ExternalLink className="w-2.5 h-2.5 shrink-0 text-gray-400" />
            <span className="truncate">{displayValue}</span>
          </button>
        ) : (
          displayValue || (
            <span className="text-gray-400 dark:text-gray-500">Non défini</span>
          )
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-all bg-transparent border-none cursor-pointer"
        title={`Modifier ${label.toLowerCase()}`}
      >
        <Edit2 className="w-3 h-3 text-gray-400" />
      </button>

      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setIsOpen(false);
                setSearchTerm("");
              }
            }}
            className="z-9999 w-72 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-xl overflow-hidden"
          >
            {/* ── Search header ── */}
            <div className="p-1.5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-1.5 w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg px-2.5 py-1">
                <Search className="size-3.5 text-gray-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={
                    isEcole ? "Chercher école..." : "Chercher ville..."
                  }
                  className="flex-1 text-[11px] bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchTerm("");
                      handleSearch("");
                    }}
                    className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <X className="size-3 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* ── Options list ── */}
            <div className="overflow-y-auto max-h-56">
              {isLoading ? (
                <div className="px-3 py-6 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                  <div className="size-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Chargement...
                </div>
              ) : isEmpty ? (
                <div className="px-3 py-6 text-center text-xs text-gray-400">
                  {searchTerm
                    ? `Aucun résultat pour "${searchTerm}"`
                    : "Aucune option disponible"}
                </div>
              ) : isEcole ? (
                /* ── École options ── */
                <div className="p-1.5 space-y-0.5">
                  {ecoleResults.map((ecole) => {
                    const isSelected =
                      String(ecole.label).trim() ===
                      String(displayValue).trim();
                    return (
                      <button
                        key={ecole.id}
                        type="button"
                        onClick={async () => {
                          setIsOpen(false);
                          setSearchTerm("");
                          await onSelect(ecole.id, ecole.label);
                        }}
                        className={`w-full text-left p-2 text-[12px] flex items-center gap-2 cursor-pointer transition-all duration-150 rounded-lg ${
                          isSelected
                            ? "bg-gray-50/80 dark:bg-gray-950/40 ring-1 ring-inset ring-gray-200/50 dark:ring-gray-700/40"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
                        }`}
                      >
                        {/* Checkbox */}
                        <div
                          className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-gray-500 border-gray-500 shadow-sm"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {isSelected && (
                            <Check
                              className="size-2.5 text-white"
                              strokeWidth={3}
                            />
                          )}
                        </div>
                        {/* Logo */}
                        {ecole.logo_url ? (
                          <img
                            src={ecole.logo_url}
                            alt=""
                            className="w-7 h-7 rounded-sm object-cover shrink-0 border border-gray-200/80 dark:border-gray-700/60 bg-white"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-sm shrink-0 border border-gray-200/80 dark:border-gray-700/60 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <Building2 className="size-3.5 text-gray-400" />
                          </div>
                        )}
                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-gray-100 truncate text-[12px]">
                            {ecole.label}
                          </div>
                          {ecole.type_etablissement && (
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                              {ecole.type_etablissement}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* ── Ville options ── */
                <div className="p-1.5 space-y-0.5">
                  {cityResults.map((city) => {
                    const isSelected =
                      String(city.label).trim() === String(displayValue).trim();
                    return (
                      <button
                        key={city.id}
                        type="button"
                        onClick={async () => {
                          setIsOpen(false);
                          setSearchTerm("");
                          setCurrentFlagUrl(city.flag_url);
                          await onSelect(city.id, city.label);
                        }}
                        className={`w-full text-left p-2 text-[12px] flex items-center gap-2 cursor-pointer transition-all duration-150 rounded-lg ${
                          isSelected
                            ? "bg-gray-50/80 dark:bg-gray-950/40 ring-1 ring-inset ring-gray-200/50 dark:ring-gray-700/40"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
                        }`}
                      >
                        {/* Checkbox */}
                        <div
                          className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-gray-500 border-gray-500 shadow-sm"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {isSelected && (
                            <Check
                              className="size-2.5 text-white"
                              strokeWidth={3}
                            />
                          )}
                        </div>
                        {/* Flag */}
                        {city.flag_url ? (
                          <img
                            src={city.flag_url}
                            alt={city.country_name || ""}
                            className="w-4.5 h-3 rounded object-cover shrink-0 ring-1 ring-gray-200/80 dark:ring-gray-600/50 shadow-sm"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <div className="w-4.5 h-3 rounded bg-gray-200 dark:bg-gray-700 shrink-0" />
                        )}
                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-gray-100 truncate text-[12px]">
                            {city.label}
                          </div>
                          {city.country_name && (
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                              {city.country_name}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Clear footer ── */}
            {!!displayValue && (
              <div className="border-t border-gray-100 dark:border-gray-800 p-1.5">
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex w-full items-center justify-center gap-1.5 cursor-pointer rounded-sm border border-input hover:bg-muted bg-gray-100/70 dark:bg-gray-800/50 px-2 py-1.5 text-[11px] font-medium hover:text-gray-600 dark:text-gray-400 shadow-xs transition-colors text-gray-500 dark:hover:text-gray-300"
                >
                  <Trash2 className="size-3 mb-0.5" />
                  Retirer {isEcole ? "l'école" : "la ville"}
                </button>
              </div>
            )}
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PhoneRow — Phone with country flag picker (matches table PhoneCell)
// ═══════════════════════════════════════════════════════

function PhoneRow({
  value,
  onSave,
}: {
  value: string;
  onSave: (newValue: string) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { refs, floatingStyles } = useFloating({
    strategy: "fixed",
    placement: "bottom-start",
    middleware: [offset(4), flip(), shift()],
  });

  const initialParsed = useMemo(() => {
    if (!value) return { countryCode: "MA", callingCode: "212", national: "" };
    try {
      const parsed = parsePhoneNumber(value);
      if (parsed) {
        return {
          countryCode: String(parsed.country || "MA"),
          callingCode: String(parsed.countryCallingCode || "212"),
          national: String(parsed.nationalNumber || ""),
        };
      }
    } catch {
      /* fallback */
    }
    const cleaned = value.replace(/\s/g, "");
    if (cleaned.startsWith("+")) {
      return {
        countryCode: "MA",
        callingCode: "212",
        national: cleaned.slice(1),
      };
    }
    return { countryCode: "MA", callingCode: "212", national: cleaned };
  }, [value]);

  const [countryCode, setCountryCode] = useState(initialParsed.countryCode);
  const [callingCode, setCallingCode] = useState(initialParsed.callingCode);
  const [nationalNumber, setNationalNumber] = useState(initialParsed.national);

  const countries = useMemo(() => {
    const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    return getCountries()
      .map((cc) => ({
        countryCode: cc,
        countryName: regionNames.of(cc) || cc,
        callingCode: String(getCountryCallingCode(cc)),
      }))
      .sort((a, b) => a.countryName.localeCompare(b.countryName));
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCountryCode(initialParsed.countryCode);
      setCallingCode(initialParsed.callingCode);
      setNationalNumber(initialParsed.national);
      setCountryPickerOpen(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialParsed]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest?.("[data-phone-country-picker]")) return;
      const floating = refs.floating.current;
      const reference = refs.reference.current;
      if (
        floating &&
        !floating.contains(target) &&
        reference &&
        !(reference as HTMLElement).contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, refs]);

  const fullNumber = nationalNumber
    ? `+${callingCode}${nationalNumber.replace(/\s/g, "")}`
    : "";

  const handleConfirm = useCallback(async () => {
    setIsOpen(false);
    if (fullNumber !== value) {
      await onSave(fullNumber);
    }
  }, [fullNumber, value, onSave]);

  const handleCountrySelect = useCallback(
    (cc: string) => {
      setCountryCode(cc);
      const country = countries.find((c) => c.countryCode === cc);
      if (country) setCallingCode(country.callingCode);
      setCountryPickerOpen(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [countries],
  );

  const formattedPreview = useMemo(() => {
    if (!nationalNumber) return null;
    try {
      const parsed = parsePhoneNumber(
        `+${callingCode}${nationalNumber.replace(/\s/g, "")}`,
      );
      if (parsed) return parsed.formatInternational();
    } catch {
      /* ignore */
    }
    return `+${callingCode} ${nationalNumber}`;
  }, [callingCode, nationalNumber]);

  const displayContent = useMemo(() => {
    if (!value) return null;
    try {
      const parsed = parsePhoneNumber(value);
      if (parsed) return parsed.formatInternational();
    } catch {
      /* ignore */
    }
    return value;
  }, [value]);

  const displayCountry = useMemo(() => {
    if (!value) return null;
    try {
      const parsed = parsePhoneNumber(value);
      if (parsed?.country) return String(parsed.country).toLowerCase();
    } catch {
      /* ignore */
    }
    return "ma";
  }, [value]);

  // Country picker sub-component
  const CountryPicker = countryPickerOpen ? (
    <PhoneCountryPicker
      countries={countries}
      selectedCode={countryCode}
      onSelect={handleCountrySelect}
      onClose={() => setCountryPickerOpen(false)}
    />
  ) : null;

  return (
    <>
      <div
        ref={refs.setReference}
        className="flex items-center gap-3 h-8 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <div className="shrink-0 text-gray-400 dark:text-gray-500">
          <Phone className="size-3.5" />
        </div>
        <div className="shrink-0 w-26 text-[12px] text-gray-500 dark:text-gray-400 truncate">
          Téléphone
        </div>
        <div className="flex-1 text-[11px] text-gray-900 dark:text-gray-100 truncate min-w-0 flex items-center gap-1.5">
          {displayCountry && (
            <CountryFlag
              countryCode={displayCountry}
              width={14}
              height={9}
              radius={3}
              className="shadow-xs mb-0.5"
            />
          )}
          {displayContent || (
            <span className="text-gray-400 dark:text-gray-500">Non défini</span>
          )}
        </div>
        <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>

      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            onClick={(e) => e.stopPropagation()}
            className="z-9999 min-w-[280px] max-w-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-visible"
          >
            <div className="p-2">
              <div
                className={`flex items-center rounded border h-8 ${
                  nationalNumber
                    ? "border-gray-500 bg-white dark:bg-gray-950 shadow-[0_0_0_1px_rgba(59,130,246,0.1)]"
                    : "border-gray-200 dark:border-gray-700 bg-transparent"
                } transition-all duration-200`}
              >
                <button
                  type="button"
                  onClick={() => setCountryPickerOpen(!countryPickerOpen)}
                  className={`flex items-center gap-0.5 pl-2 pr-1 h-full border-r border-gray-200 dark:border-gray-700 ${
                    countryPickerOpen
                      ? "bg-gray-100 dark:bg-gray-800"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  } transition-colors shrink-0 bg-transparent cursor-pointer border-y-0 border-l-0`}
                >
                  <span
                    className={`fi fi-${countryCode.toLowerCase()} w-4 h-3 rounded-sm shadow-sm`}
                  />
                  <svg
                    className={`w-3 h-3 text-gray-400 transition-transform ${countryPickerOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                <span className="pl-2 text-[13px] text-gray-500 dark:text-gray-400 font-medium shrink-0 select-none">
                  +{callingCode}
                </span>
                <input
                  ref={inputRef}
                  type="tel"
                  value={nationalNumber}
                  onChange={(e) => setNationalNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleConfirm();
                    }
                    if (e.key === "Escape") setIsOpen(false);
                    e.stopPropagation();
                  }}
                  placeholder="6 12 34 56 78"
                  className="flex-1 h-full bg-transparent border-none outline-none text-[13px] px-1.5 placeholder-gray-400 text-gray-900 dark:text-gray-100 font-medium min-w-0"
                />

                <div className="flex items-center gap-0.5 pr-1.5 shrink-0">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleConfirm}
                    className="p-1 text-gray-400 hover:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500/20 rounded transition-colors bg-transparent border-none cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded transition-colors bg-transparent border-none cursor-pointer"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {CountryPicker}

            {formattedPreview && (
              <div className="px-3 py-1.5 border-t border-gray-100 dark:border-gray-700 text-[0.75rem] text-gray-400 flex items-center gap-2">
                <span
                  className={`fi fi-${countryCode.toLowerCase()} w-4 h-3 rounded-sm shadow-sm`}
                />
                <span>{formattedPreview}</span>
              </div>
            )}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

// Phone country picker sub-component
function PhoneCountryPicker({
  countries,
  selectedCode,
  onSelect,
  onClose,
}: {
  countries: {
    countryCode: string;
    countryName: string;
    callingCode: string;
  }[];
  selectedCode: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 30);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.countryName.toLowerCase().includes(q) ||
        c.callingCode.includes(q) ||
        c.countryCode.toLowerCase().includes(q),
    );
  }, [countries, search]);

  return (
    <div
      data-phone-country-picker="true"
      className="border-t border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Chercher pays..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              onClose();
            }
            e.stopPropagation();
          }}
          className="flex-1 bg-transparent border-none outline-none text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 min-w-0"
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-3 text-center text-xs text-gray-400">
            Aucun pays trouvé
          </div>
        ) : (
          filtered.map((c) => (
            <button
              key={c.countryCode}
              type="button"
              onClick={() => onSelect(c.countryCode)}
              className={`w-full text-left px-2.5 py-1.5 text-[12px] flex items-center gap-2 transition-colors bg-transparent border-none cursor-pointer ${
                c.countryCode === selectedCode
                  ? "bg-gray-100 dark:bg-gray-800"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <span
                className={`fi fi-${c.countryCode.toLowerCase()} w-4 h-3 rounded-sm shadow-xs shrink-0`}
              />
              <span className="truncate text-gray-900 dark:text-gray-100">
                {c.countryName}
              </span>
              <span className="ml-auto text-xs text-gray-400 shrink-0">
                +{c.callingCode}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MultiSelectRow — Editable multi-select (same as table cell)
// ═══════════════════════════════════════════════════════

function MultiSelectRow({
  icon,
  label,
  items,
  options = [],
  onSearchFn,
  onSave,
}: {
  icon: React.ReactNode;
  label: string;
  items: { value: string; label: string }[];
  options?: { value: string; label: string }[];
  onSearchFn?: (query: string) => Promise<{ value: string; label: string }[]>;
  onSave: (ids: string[]) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState(options);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const floatingRef = useRef<HTMLDivElement | null>(null);

  const [selectedMap, setSelectedMap] = useState<Map<string, string>>(() => {
    const initial = new Map<string, string>();
    items.forEach((v) => {
      if (v.value) initial.set(v.value, v.label);
    });
    return initial;
  });

  // Sync selectedMap when items prop changes
  useEffect(() => {
    const next = new Map<string, string>();
    items.forEach((v) => {
      if (v.value) next.set(v.value, v.label);
    });
    setSelectedMap(next);
  }, [items]);

  const { refs, floatingStyles } = useFloating({
    strategy: "fixed",
    placement: "bottom-start",
    middleware: [offset(4), flip(), shift()],
  });

  // Async search
  useEffect(() => {
    if (!onSearchFn || !searchTerm.trim()) {
      setSearchResults(options);
      return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      onSearchFn(searchTerm).then((results) => {
        setSearchResults(results);
        setSearching(false);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, onSearchFn, options]);

  // Merge all options with selected items
  const displayOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();
    selectedMap.forEach((lbl, val) => map.set(val, { value: val, label: lbl }));
    options.forEach((opt) => map.set(opt.value, opt));
    searchResults.forEach((opt) => map.set(opt.value, opt));
    return Array.from(map.values()).sort((a, b) => {
      const aSel = selectedMap.has(a.value) ? 0 : 1;
      const bSel = selectedMap.has(b.value) ? 0 : 1;
      if (aSel !== bSel) return aSel - bSel;
      return a.label.localeCompare(b.label);
    });
  }, [options, searchResults, selectedMap]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;

      if (floatingRef.current && floatingRef.current.contains(target)) {
        return;
      }

      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleToggle = useCallback((id: string, lbl: string) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, lbl);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    const ids = Array.from(selectedMap.keys());
    await onSave(ids);
    setIsOpen(false);
    setSearchTerm("");
  }, [selectedMap, onSave]);

  const handleClear = useCallback(() => {
    setSelectedMap(new Map());
    setSearchTerm("");
  }, []);

  // ── Closed state ──
  if (!isOpen) {
    return (
      <div
        className="flex items-start gap-3 px-3 py-1.5 min-h-8 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <div className="shrink-0 text-gray-400 dark:text-gray-500 mt-0.5">
          {icon}
        </div>
        <div className="shrink-0 w-26 text-[12px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
          {label}
        </div>
        <div className="flex-1 flex flex-wrap gap-1 min-w-0">
          {items.length > 0 ? (
            items.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center h-5 px-1.5 rounded-sm text-[11px] font-medium bg-muted/50 border border-gray-200 dark:bg-gray-500/30 text-gray-500 dark:text-gray-500 truncate max-w-40"
              >
                {item.label}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              Non défini
            </span>
          )}
        </div>
        <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
      </div>
    );
  }

  // ── Open state ──
  return (
    <div ref={dropdownRef} className="relative px-3 py-1">
      <div
        ref={refs.setReference}
        className="flex items-center flex-wrap gap-1 w-full bg-white dark:bg-gray-800 border border-gray-500 rounded-md px-2 py-1.5 min-h-8"
        onClick={() => setIsOpen(true)}
      >
        {Array.from(selectedMap.entries()).map(([id, lbl]) => (
          <span
            key={id}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/20 border border-gray-100 dark:bg-gray-500/40 text-gray-600 dark:text-gray-500 text-[10px] font-medium"
          >
            {lbl}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggle(id, lbl);
              }}
              className="hover:text-gray-500 dark:hover:text-gray-500 transition-colors bg-transparent border-none cursor-pointer p-0"
            >
              <XIcon className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {selectedMap.size === 0 && (
          <span className="text-[12px] text-gray-400">Sélectionner</span>
        )}
      </div>

      <FloatingPortal>
        <div
          ref={(node) => {
            refs.setFloating(node);
            floatingRef.current = node;
          }}
          style={floatingStyles}
          onMouseDown={(e) => e.stopPropagation()}
          className="z-9999 min-w-60 max-w-xs bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-xl overflow-hidden"
        >
          <div className="p-1.5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1.5 w-full bg-white dark:bg-gray-800 border border-gray-100 rounded-lg px-2.5 py-1">
              <Search className="size-3.5 text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Chercher métier..."
                className="flex-1 text-[11px] bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsOpen(false);
                    setSearchTerm("");
                  }
                  if (e.key === "Enter" && !searchTerm) handleSave();
                  e.stopPropagation();
                }}
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm("");
                  }}
                  className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="size-3 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          <div className="p-1.5 space-y-0.5 overflow-y-auto max-h-56">
            {searching ? (
              <div className="px-3 py-6 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                <div className="size-3.5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                Recherche...
              </div>
            ) : displayOptions.length > 0 ? (
              displayOptions.map((option) => {
                const isChecked = selectedMap.has(option.value);
                if (
                  searchTerm &&
                  !isChecked &&
                  !option.label.toLowerCase().includes(searchTerm.toLowerCase())
                )
                  return null;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleToggle(option.value, option.label)}
                    className={`w-full text-left px-3 py-2 text-[12px] rounded-md flex items-center gap-2.5 transition-all border-none cursor-pointer ${
                      isChecked
                        ? "bg-gray-50/80 dark:bg-gray-500/30 text-gray-500 dark:text-gray-500 font-medium"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 bg-transparent"
                    }`}
                  >
                    <div
                      className={`shrink-0 size-3.5 rounded border flex items-center justify-center transition-all ${
                        isChecked
                          ? "bg-gray-500 border-gray-500 shadow-sm"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {isChecked && (
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      )}
                    </div>
                    <span className="truncate flex-1">{option.label}</span>
                  </button>
                );
              })
            ) : searchTerm ? (
              <div className="px-3 py-8 text-center text-xs text-gray-400">
                Aucun résultat pour "{searchTerm}"
              </div>
            ) : (
              <div className="px-3 py-8 text-center text-xs text-gray-400">
                Aucune option disponible
              </div>
            )}
          </div>

          {selectedMap.size > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-800 p-1.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex w-full items-center justify-center gap-1.5 cursor-pointer rounded-sm border border-input hover:bg-muted bg-gray-100/70 px-2 py-1.5 text-[11px] font-medium hover:text-gray-600 dark:text-gray-400 shadow-xs transition-colors text-gray-500 dark:hover:text-gray-300"
                >
                  <Trash2 className="size-3 mb-0.5" />
                  Retirer
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex w-full items-center justify-center gap-1.5 cursor-pointer rounded-sm border border-gray-500 bg-gray-500 px-2 py-1.5 text-[11px] font-medium text-white shadow-xs transition-colors hover:bg-gray-600 hover:border-gray-600"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>
      </FloatingPortal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CollapsibleSection — Twenty style with animation
// ═══════════════════════════════════════════════════════

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
    <div className="border-b border-gray-100">
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

// ═══════════════════════════════════════════════════════
// Tab config
// ═══════════════════════════════════════════════════════

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "summary", label: "Résumé", icon: <User className="w-3.5 h-3.5" /> },
  {
    id: "photo",
    label: "Photo",
    icon: <ImageIcon className="w-3.5 h-3.5" />,
  },
  {
    id: "cv",
    label: "CV",
    icon: <FileUser className="w-3.5 h-3.5" />,
  },
  {
    id: "candidatures",
    label: "Candidatures",
    icon: <Send className="w-3 h-3" />,
  },
  {
    id: "activity",
    label: "Activité",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
];

// ═══════════════════════════════════════════════════════
// CandidatSidePanelPage — Main component
// ═══════════════════════════════════════════════════════

export function CandidatSidePanelPage({ recordId }: { recordId: string }) {
  const { records, onCellChange } = useRecordTableContextOrThrow();
  const { closeSidePanelMenu } = useSidePanelMenu();
  useNavigateSidePanel();
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const mutations = useCandidatMutations();

  // Candidatures state
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [candidaturesSpontanees, setCandidaturesSpontanees] = useState<
    CandidatureSpontanee[]
  >([]);
  const [candidaturesLoading, setCandidaturesLoading] = useState(false);
  const [candidaturesLoaded, setCandidaturesLoaded] = useState(false);

  const niveauxEtudesOptions = useNiveauxEtudesOptions();

  // CV data state
  const [cvPdfUrl, setCvPdfUrl] = useState<string | null>(null);
  const [loadingCvPdf, setLoadingCvPdf] = useState(false);
  const [photoBlobUrl, setPhotoBlobUrl] = useState<string | null>(null);
  const [loadingPhotoBlob, setLoadingPhotoBlob] = useState(false);

  // Overflow tabs dropdown
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!overflowOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        overflowRef.current &&
        !overflowRef.current.contains(e.target as Node)
      ) {
        setOverflowOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [overflowOpen]);

  // Multi-select hooks (same as table)
  const typeContratOptions = useTypeContratOptions();
  const typeStageOptions = useTypeStageOptions();
  const metierSearch = useMetierSearch();
  const [metierOptions, setMetierOptions] = useState<
    { value: string; label: string }[]
  >([]);

  useEffect(() => {
    let active = true;
    metierSearch("")
      .then((results) => {
        if (active) setMetierOptions(results || []);
      })
      .catch(() => {
        if (active) setMetierOptions([]);
      });

    return () => {
      active = false;
    };
  }, [metierSearch]);

  // Get enriched record from table context
  const record = records.find((r: RecordData) => r.id === recordId) as any;

  // Fetch full detail from API for deep data (useQuery deduplicates concurrent requests)
  const { data: detail = null } = useQuery<CandidatDetail | null>({
    queryKey: ["candidat-detail", recordId],
    queryFn: async () =>
      (await apiGetCandidatById(Number(recordId))) as unknown as CandidatDetail,
    enabled: !!recordId,
    staleTime: 30_000,
  });

  // Fetch CV blob URL via view_token when detail loads
  useEffect(() => {
    const viewToken = detail?.cv_view_token ?? detail?.cv?.view_token ?? null;
    if (!viewToken) {
      setCvPdfUrl(null);
      return;
    }
    let cancelled = false;
    setLoadingCvPdf(true);
    getViewCvUrl(viewToken)
      .then((blobUrl) => {
        if (!cancelled) setCvPdfUrl(blobUrl);
      })
      .catch(() => {
        if (!cancelled) setCvPdfUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingCvPdf(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detail?.cv_view_token, detail?.cv?.view_token]);

  // Fetch photo blob URL via photo_profil_view_token when detail loads
  useEffect(() => {
    const photoViewToken = detail?.photo_profil_view_token ?? null;
    if (!photoViewToken) {
      setPhotoBlobUrl(null);
      return;
    }
    let cancelled = false;
    setLoadingPhotoBlob(true);
    getViewPhotoUrl(photoViewToken)
      .then((blobUrl) => {
        if (!cancelled) setPhotoBlobUrl(blobUrl);
      })
      .catch(() => {
        if (!cancelled) setPhotoBlobUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingPhotoBlob(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detail?.photo_profil_view_token]);

  // Fetch candidatures when tab becomes active (lazy load)
  useEffect(() => {
    if (
      activeTab !== "candidatures" ||
      candidaturesLoaded ||
      candidaturesLoading
    )
      return;
    setCandidaturesLoading(true);
    const candidatId = Number(recordId);
    Promise.all([
      fetchCandidaturesByCandidatId(candidatId, 1, 50).catch(() => ({
        data: [],
      })),
      fetchCandidaturesSpontaneesByCandidatId(candidatId, 1, 50).catch(() => ({
        data: [],
      })),
    ])
      .then(([cRes, csRes]) => {
        setCandidatures((cRes as any)?.data ?? []);
        setCandidaturesSpontanees((csRes as any)?.data ?? []);
        setCandidaturesLoaded(true);
      })
      .finally(() => setCandidaturesLoading(false));
  }, [activeTab, recordId, candidaturesLoaded, candidaturesLoading]);

  // Merge record from context (for enriched fields) and detail (for raw nested data)
  const candidat = useMemo(() => {
    const raw: any = record?.raw ?? record?._raw ?? {};
    const user: any = detail?.user ?? raw?.user ?? {};
    return {
      id: Number(recordId),
      userId: Number(user?.id ?? raw?.user_id ?? 0),
      photo: String(
        record?.photo ??
          detail?.photo_profil_url ??
          raw?.photo_profil_url ??
          "",
      ),
      nomComplet: String(
        record?.nomComplet ??
          (`${user?.prenom ?? ""} ${user?.nom ?? ""}`.trim() || "N/A"),
      ),
      prenom: String(user?.prenom ?? ""),
      nom: String(user?.nom ?? ""),
      email: String(record?.email ?? user?.email ?? ""),
      gsm: String(record?.gsm ?? user?.num_tel ?? ""),
      ville: String(
        record?.ville ??
          user?.city?.name_fr ??
          user?.city?.name_en ??
          user?.ville?.ville_name ??
          user?.ville?.nom ??
          "",
      ),
      villeFlagUrl: (user?.city?.country?.flag_url ?? "") as string,
      nomEcole: String(
        record?.nomEcole ??
          detail?.ecole?.abreviation ??
          detail?.ecole?.titre ??
          "",
      ),
      ecoleId: Number(
        record?._ecoleId ?? detail?.ecole?.id ?? raw?.ecole_id ?? 0,
      ),
      niveauEtudes: String(
        record?.niveauEtudes ?? detail?.niveau_formation ?? "",
      ),
      etat: String(record?.etat ?? detail?.etat ?? ""),
      premium: Boolean(record?.premium ?? detail?.premium ?? false),
      premiumCount: Number(
        record?.nb_premium_affected ?? detail?.nb_premium_affected ?? 0,
      ),
      premiumAffectedAt: (detail?.premium_affected_at ??
        record?.premium_affected_at ??
        null) as string | null,
      hasCv: Boolean(record?.hasCv ?? !!detail?.cv_id),
      cvScore: (record?.cvScore ?? null) as number | null,
      cvId: (detail?.cv_id ?? raw?.cv_id ?? null) as number | null,
      nationalite: String(raw?.nationalite ?? detail?.nationalite ?? ""),
      dateNaissance: (raw?.date_naissance ?? detail?.date_naissance ?? null) as
        | string
        | null,
      disponibilite: String(raw?.disponibilite ?? detail?.disponibilite ?? ""),
      dateDemarrage: (raw?.date_demarrage ?? detail?.date_demarrage ?? null) as
        | string
        | null,
      dateDiplome: (raw?.date_diplome ?? detail?.date_diplome ?? null) as
        | string
        | null,
      metiers: ((record?.metiers ?? detail?.metiers ?? []) as any[])
        .map((m: any) =>
          typeof m === "string" ? m : (m?.titre ?? m?.nom ?? ""),
        )
        .filter(Boolean) as string[],
      typeContrats: (
        (record?.typeContrats ?? detail?.typeContrats ?? []) as any[]
      )
        .map((t: any) =>
          typeof t === "string" ? t : (t?.name ?? t?.titre ?? ""),
        )
        .filter(Boolean) as string[],
      typeStages: ((record?.typeStages ?? detail?.typeStages ?? []) as any[])
        .map((t: any) =>
          typeof t === "string" ? t : (t?.name ?? t?.titre ?? ""),
        )
        .filter(Boolean) as string[],
      inscritLe: (raw?.created_at ??
        user?.registered_at ??
        detail?.created_at ??
        user?.last_login ??
        null) as string | null,
      dateConnexion: (raw?.derniere_vue_profil ??
        detail?.derniere_vue_profil ??
        user?.last_login ??
        null) as string | null,
    };
  }, [record, detail, recordId]);

  // Structured items for multi-select rows (need {value, label} format)
  const candidatMetiersItems = useMemo(() => {
    const raw = record?.metiers ?? detail?.metiers ?? [];
    return (raw as any[])
      .map((m: any) => ({
        value: String(m?.id ?? m?.value ?? m),
        label:
          typeof m === "string" ? m : (m?.titre ?? m?.nom ?? m?.label ?? ""),
      }))
      .filter((i: any) => i.value && i.label);
  }, [record?.metiers, detail?.metiers]);

  const candidatTypeContratsItems = useMemo(() => {
    const raw = record?.typeContrats ?? detail?.typeContrats ?? [];
    return (raw as any[])
      .map((t: any) => ({
        value: String(t?.id ?? t?.value ?? t),
        label:
          typeof t === "string" ? t : (t?.name ?? t?.titre ?? t?.label ?? ""),
      }))
      .filter((i: any) => i.value && i.label);
  }, [record?.typeContrats, detail?.typeContrats]);

  const candidatTypeStagesItems = useMemo(() => {
    const raw = record?.typeStages ?? detail?.typeStages ?? [];
    return (raw as any[])
      .map((t: any) => ({
        value: String(t?.id ?? t?.value ?? t),
        label:
          typeof t === "string" ? t : (t?.name ?? t?.titre ?? t?.label ?? ""),
      }))
      .filter((i: any) => i.value && i.label);
  }, [record?.typeStages, detail?.typeStages]);

  // ── Save handlers ──

  const saveUserField = useCallback(
    async (field: string, value: unknown) => {
      try {
        await mutations.updateCandidatUser.mutateAsync({
          userId: candidat.userId,
          data: { [field]: value },
        });
        toast.success("Mis à jour");
        onCellChange?.(
          recordId,
          field === "num_tel" ? "gsm" : field === "email" ? "email" : field,
          value,
        );
      } catch {
        toast.error("Erreur lors de la mise à jour");
        throw new Error("update failed");
      }
    },
    [mutations, candidat.userId, recordId, onCellChange],
  );

  const saveEntityField = useCallback(
    async (field: string, value: unknown) => {
      try {
        await mutations.updateCandidat.mutateAsync({
          id: candidat.id,
          data: { [field]: value },
        });
        toast.success("Mis à jour");
        // Propagate visual change to the table
        const fieldMap: Record<string, string> = {
          niveau_formation: "niveauEtudes",
          etat: "etat",
          premium: "premium",
        };
        onCellChange?.(recordId, fieldMap[field] ?? field, value);
      } catch {
        toast.error("Erreur lors de la mise à jour");
        throw new Error("update failed");
      }
    },
    [mutations, candidat.id, recordId, onCellChange],
  );

  // ── Delete handler ──
  const handleDeleteCandidat = useCallback(async () => {
    setDeleting(true);
    try {
      await apiDeleteCandidat(candidat.id);
      toast.success("Candidat supprimé");
      closeSidePanelMenu();
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [candidat.id, closeSidePanelMenu]);

  // ── Export handler ──
  const handleExport = useCallback(() => {
    const data = JSON.stringify(candidat, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidat-${candidat.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Exporté");
  }, [candidat]);

  if (!record) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        Candidat introuvable
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Hero header ── */}
      <div className="shrink-0">
        <div className="px-4 pt-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          {/* Avatar + Name */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border border-gray-300/70 dark:bg-gray-700 dark:border-gray-600 flex items-center justify-center shrink-0">
              {loadingPhotoBlob ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border border-gray-300 border-t-gray-500" />
              ) : photoBlobUrl || candidat.photo ? (
                <img
                  src={photoBlobUrl || candidat.photo}
                  alt={candidat.nomComplet}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {(
                    candidat.prenom?.charAt(0) ||
                    candidat.nom?.charAt(0) ||
                    "C"
                  ).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                {`${candidat.prenom || ""} ${candidat.nom || ""}`.trim() ||
                  candidat.nomComplet}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      {(() => {
        const PRIMARY_COUNT = 4;
        const primaryTabs = TABS.slice(0, PRIMARY_COUNT);
        const overflowTabs = TABS.slice(PRIMARY_COUNT);
        const overflowActive = overflowTabs.some((t) => t.id === activeTab);
        return (
          <div className="shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/30">
            <div className="flex items-center h-10 px-1 min-w-0">
              {primaryTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-1.5 px-2 h-10 text-xs font-medium truncate min-w-0 flex-1 justify-center transition-colors border-none cursor-pointer bg-transparent ${
                      isActive
                        ? "text-gray-600 dark:text-gray-400 [&_svg]:text-gray-500! dark:[&_svg]:text-gray-400!"
                        : "text-gray-400 dark:text-gray-500 [&_svg]:text-gray-400! hover:text-gray-600 dark:hover:text-gray-300 hover:[&_svg]:text-gray-500! dark:hover:[&_svg]:text-gray-400!"
                    }`}
                  >
                    <span className="shrink-0">{tab.icon}</span>
                    <span className="truncate">{tab.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="sidePanelActiveTab"
                        className="absolute bottom-0 left-2 right-2 h-0.5 bg-gray-500 dark:bg-gray-500 rounded-full"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 35,
                        }}
                      />
                    )}
                  </button>
                );
              })}

              {/* Overflow "more" button */}
              {overflowTabs.length > 0 && (
                <div ref={overflowRef} className="relative ml-1 shrink-0">
                  <button
                    onClick={() => setOverflowOpen((v) => !v)}
                    className={`relative flex items-center gap-1 px-2 h-10 text-xs font-medium whitespace-nowrap transition-colors border-none cursor-pointer bg-transparent ${
                      overflowActive
                        ? "text-gray-600 dark:text-gray-400"
                        : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    }`}
                  >
                    +{overflowTabs.length} more
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${overflowOpen ? "rotate-180" : ""}`}
                    />
                    {overflowActive && (
                      <motion.div
                        layoutId="sidePanelActiveTab"
                        className="absolute bottom-0 left-2 right-2 h-0.5 bg-gray-500 dark:bg-gray-500 rounded-full"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 35,
                        }}
                      />
                    )}
                  </button>

                  {overflowOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 min-w-30 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                      {overflowTabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id);
                            setOverflowOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs border-none cursor-pointer bg-transparent transition-colors ${
                            activeTab === tab.id
                              ? "text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60"
                              : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          }`}
                        >
                          {tab.icon}
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-muted/10">
        <AnimatePresence mode="wait">
          {activeTab === "summary" && (
            <motion.div
              key="summary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Contact fields */}
              <CollapsibleSection title="Contact" defaultOpen>
                <div className="">
                  <EditableTextField
                    icon={<Mail className="size-3.5" />}
                    label="Email"
                    value={candidat.email}
                    onSave={(v) => saveUserField("email", v)}
                    type="email"
                  />
                  <PhoneRow
                    value={candidat.gsm}
                    onSave={(v) => saveUserField("num_tel", v)}
                  />
                </div>
              </CollapsibleSection>

              {/* Informations personnelles */}
              <CollapsibleSection title="Informations" defaultOpen>
                <div className="">
                  <RelationRow
                    icon={<MapPin className="size-3.5" />}
                    label="Ville"
                    displayValue={candidat.ville}
                    fieldName="ville"
                    flagUrl={candidat.villeFlagUrl}
                    onSelect={async (id, _label) => {
                      await saveUserField("city_id", id);
                    }}
                  />
                  <SelectRow
                    icon={<Globe className="size-3.5" />}
                    label="Nationalité"
                    value={candidat.nationalite}
                    options={NATIONALITY_OPTIONS}
                    tagClassName="bg-transparent border-none! px-0! dark:border-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-medium rounded-lg px-2"
                    onSave={(v) => saveEntityField("nationalite", v)}
                  />
                  <EditableTextField
                    icon={<CalendarDays className="size-3.5" />}
                    label="Naissance"
                    value={
                      candidat.dateNaissance
                        ? formatDate(candidat.dateNaissance)
                        : ""
                    }
                    onSave={(v) => saveEntityField("date_naissance", v)}
                  />
                  <EditableTextField
                    icon={<Clock className="size-3.5" />}
                    label="Disponibilité"
                    value={candidat.disponibilite}
                    onSave={(v) => saveEntityField("disponibilite", v)}
                  />
                </div>
              </CollapsibleSection>

              {/* Formation */}
              <CollapsibleSection title="Formation" defaultOpen>
                <div className="">
                  <RelationRow
                    icon={<GraduationCap className="size-3.5" />}
                    label="École"
                    displayValue={candidat.nomEcole}
                    fieldName="ecole"
                    relationId={candidat.ecoleId}
                    onSelect={async (id) => {
                      await saveEntityField("ecole_id", id);
                    }}
                  />
                  <SelectRow
                    icon={<GraduationCap className="size-3.5" />}
                    label="Niveau"
                    value={candidat.niveauEtudes}
                    options={niveauxEtudesOptions}
                    onSave={(v) => saveEntityField("niveau_formation", v)}
                  />
                </div>
              </CollapsibleSection>

              {/* Status */}
              <CollapsibleSection
                title="Compétences & Recherche"
                count={
                  candidatMetiersItems.length +
                  candidatTypeContratsItems.length +
                  candidatTypeStagesItems.length
                }
                defaultOpen
              >
                <div className="">
                  <MultiSelectRow
                    icon={<Briefcase className="size-3.5" />}
                    label="Métiers"
                    items={candidatMetiersItems}
                    options={metierOptions}
                    onSearchFn={metierSearch}
                    onSave={async (ids) => {
                      await upsertCandidatMetiers(candidat.id, ids.map(Number));
                      toast.success("Métiers mis à jour");
                      onCellChange?.(recordId, "metiers", ids);
                    }}
                  />
                  <MultiSelectRow
                    icon={<FileText className="size-3.5" />}
                    label="Contrats"
                    items={candidatTypeContratsItems}
                    options={typeContratOptions}
                    onSave={async (ids) => {
                      await apiUpdateCandidatsTypeContrat({
                        candidat_id: candidat.id,
                        type_contrat_ids: ids.map(Number),
                      });
                      toast.success("Types de contrat mis à jour");
                      onCellChange?.(recordId, "typeContrat", ids);
                    }}
                  />
                  <MultiSelectRow
                    icon={<Star className="size-3.5" />}
                    label="Stages"
                    items={candidatTypeStagesItems}
                    options={typeStageOptions}
                    onSave={async (ids) => {
                      await apiSetCandidatTypes(candidat.id, ids.map(Number));
                      toast.success("Types de stage mis à jour");
                      onCellChange?.(recordId, "typeStage", ids);
                    }}
                  />
                </div>
              </CollapsibleSection>

              {/* Status */}
              <CollapsibleSection title="Statut" defaultOpen>
                <div className="">
                  <SelectRow
                    icon={<Shield className="size-3.5" />}
                    label="État"
                    value={candidat.etat}
                    options={ETAT_OPTIONS}
                    tagClassName="bg-green-300/30! border border-green-300 text-gray-500 text-[9px]! font-medium rounded-lg! px-2!"
                    onSave={(v) => saveEntityField("etat", v)}
                  />

                  {/* Premium toggle row */}
                  <div
                    className="flex items-center gap-3 h-8 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group transition-colors"
                    onClick={async () => {
                      const newVal = !candidat.premium;
                      await saveEntityField("premium", newVal);
                    }}
                  >
                    <div className="shrink-0 text-gray-400 dark:text-gray-500">
                      <Crown className="size-3.5" />
                    </div>
                    <div className="shrink-0 w-26 text-[12px] text-gray-500 dark:text-gray-400 truncate">
                      Premium
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div
                        className={`w-7 h-4 rounded-full transition-colors relative ${
                          candidat.premium
                            ? "bg-gray-500"
                            : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${
                            candidat.premium
                              ? "translate-x-3.5"
                              : "translate-x-0.5"
                          }`}
                        />
                      </div>
                      <span
                        className={`text-[12px] ${candidat.premium ? "text-gray-600 dark:text-gray-400 font-medium" : "text-gray-400"}`}
                      >
                        {candidat.premium ? "Activé" : "Inactif"}
                      </span>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            </motion.div>
          )}

          {activeTab === "candidatures" && (
            <motion.div
              key="candidatures"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {candidaturesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <CollapsibleSection
                    title="Candidatures"
                    count={candidatures.length}
                    defaultOpen
                  >
                    {candidatures.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-gray-400">
                        Aucune candidature
                      </div>
                    ) : (
                      <div className="">
                        {candidatures.map((c: any) => {
                          const annonce = c.annonce;
                          const entreprise = annonce?.entreprise;
                          const ville = annonce?.ville;
                          const typeContrat = annonce?.typeContrat;
                          const typeStage = annonce?.typeStage;
                          return (
                            <div
                              key={c.id}
                              className="px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                            >
                              {/* Row 1: Enterprise logo + Annonce title + status */}
                              <div className="flex items-start gap-2.5">
                                {entreprise?.logo ? (
                                  <img
                                    src={`${import.meta.env.VITE_API_BASE_URL ?? ""}/media/logos/${entreprise.logo}`}
                                    alt=""
                                    className="w-8 h-8 rounded-md object-contain bg-white ring-1 ring-gray-200 dark:ring-gray-700 shrink-0 mt-0.5"
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-md bg-gray-50 dark:bg-gray-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                    <Briefcase className="size-3.5 text-gray-500" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="text-[12px] font-medium text-gray-900 dark:text-gray-100 leading-tight line-clamp-2">
                                    {annonce?.titre ??
                                      `Annonce #${c.annonce_id}`}
                                  </div>
                                  {entreprise?.nom && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                      {entreprise.nom}
                                    </div>
                                  )}
                                </div>
                                {c.statut && (
                                  <span
                                    className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap mt-0.5 ${
                                      c.statut === "acceptée" ||
                                      c.statut === "accepted"
                                        ? "bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300"
                                        : c.statut === "refusée" ||
                                            c.statut === "rejected"
                                          ? "bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300"
                                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                    }`}
                                  >
                                    {c.statut}
                                  </span>
                                )}
                              </div>
                              {/* Row 2: Meta chips */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                {ville?.nom && (
                                  <span className="inline-flex items-center gap-1 text-[9px] text-gray-500 dark:text-gray-400">
                                    <MapPin className="w-3 h-3" />
                                    {ville.nom}
                                  </span>
                                )}
                                {typeContrat?.name && (
                                  <span className="px-1.5 py-px rounded bg-gray-50 dark:bg-gray-500/20 text-[9px] font-medium text-gray-500 dark:text-gray-500">
                                    {typeContrat.name}
                                  </span>
                                )}
                                {typeStage?.name && (
                                  <span className="px-1.5 py-px rounded bg-gray-40 dark:bg-gray-400/20 text-[9px] font-medium text-gray-400 dark:text-gray-400">
                                    {typeStage.name}
                                  </span>
                                )}
                                {c.source && (
                                  <span className="text-[9px] text-gray-400">
                                    · {c.source}
                                  </span>
                                )}
                                <span className="text-[9px] text-gray-400 ml-auto">
                                  {c.date_candidature
                                    ? formatDate(c.date_candidature)
                                    : "—"}
                                </span>
                              </div>
                              {/* Annonce expiration warning */}
                              {annonce?.statut === "Expirée" && (
                                <div className="mt-1 text-[0.5625rem] text-amber-600 dark:text-amber-400">
                                  Annonce expirée
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CollapsibleSection>

                  <CollapsibleSection
                    title="Candidatures spontanées"
                    count={candidaturesSpontanees.length}
                    defaultOpen
                  >
                    {candidaturesSpontanees.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-gray-400">
                        Aucune candidature spontanée
                      </div>
                    ) : (
                      <div className="">
                        {candidaturesSpontanees.map((cs: any) => {
                          const entreprise = cs.entreprise;
                          const ville = entreprise?.ville;
                          return (
                            <div
                              key={cs.id}
                              className="px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                {entreprise?.logo ? (
                                  <img
                                    src={`${import.meta.env.VITE_API_BASE_URL ?? ""}/media/logos/${entreprise.logo}`}
                                    alt=""
                                    className="w-8 h-8 rounded-md object-contain bg-white ring-1 ring-gray-200 dark:ring-gray-700 shrink-0"
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-md bg-gray-40 dark:bg-gray-400/20 flex items-center justify-center shrink-0">
                                    <Building2 className="size-3.5 text-gray-400" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="text-[12px] font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {entreprise?.nom ??
                                      `Entreprise #${cs.entreprise_id}`}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {ville?.nom && (
                                      <span className="inline-flex items-center gap-1 text-[9px] text-gray-500 dark:text-gray-400">
                                        <MapPin className="w-3 h-3" />
                                        {ville.nom}
                                      </span>
                                    )}
                                    {entreprise?.taille_de_entreprise && (
                                      <span className="text-[9px] text-gray-400">
                                        · {entreprise.taille_de_entreprise}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                                      cs.candidature_expire
                                        ? "bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300"
                                        : "bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300"
                                    }`}
                                  >
                                    {cs.candidature_expire
                                      ? "Expirée"
                                      : "Active"}
                                  </span>
                                  <span className="text-[9px] text-gray-400">
                                    {cs.date_candidature
                                      ? formatDate(cs.date_candidature)
                                      : "—"}
                                  </span>
                                </div>
                              </div>
                              {cs.date_expiration && (
                                <div className="mt-1 text-[0.5625rem] text-gray-400">
                                  Expire le {formatDate(cs.date_expiration)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CollapsibleSection>
                </>
              )}
            </motion.div>
          )}

          {activeTab === "activity" && (
            <motion.div
              key="activity"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <CollapsibleSection title="Historique" defaultOpen>
                <div className="px-4 py-1">
                  <div className="relative">
                    {/* Vertical timeline line */}
                    <div className="absolute left-[7px] top-3 bottom-3 w-px bg-gray-200 dark:bg-gray-700" />

                    <div className="space-y-4">
                      {/* Inscription */}
                      <div className="relative flex items-start gap-3 pl-6">
                        <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-gray-500 ring-2 ring-white dark:ring-gray-900 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium text-gray-900 dark:text-gray-100">
                            Inscription
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {formatDate(candidat.inscritLe)}
                          </div>
                        </div>
                      </div>

                      {/* Dernière connexion */}
                      <div className="relative flex items-start gap-3 pl-6">
                        <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-gray-500 ring-2 ring-white dark:ring-gray-900 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium text-gray-900 dark:text-gray-100">
                            Dernière connexion
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(candidat.dateConnexion)}
                          </div>
                        </div>
                      </div>

                      {/* Premium activation */}
                      {candidat.premiumAffectedAt && (
                        <div className="relative flex items-start gap-3 pl-6">
                          <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-gray-900 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-medium text-gray-900 dark:text-gray-100">
                              Premium activé
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                              <Crown className="w-3 h-3" />
                              {formatDate(candidat.premiumAffectedAt)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Dates grid */}
              <div className="px-4 pt-1 pb-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white dark:bg-gray-800/80 px-3 py-2.5 ring-1 ring-gray-200/80 dark:ring-gray-700/60">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <div className="text-[9px] text-gray-500 uppercase tracking-wide font-medium">
                        Inscrit le
                      </div>
                    </div>
                    <div className="text-[12px] font-semibold text-gray-900 dark:text-gray-100">
                      {formatDate(candidat.inscritLe)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-gray-800/80 px-3 py-2.5 ring-1 ring-gray-200/80 dark:ring-gray-700/60">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <div className="text-[9px] text-gray-500 uppercase tracking-wide font-medium">
                        Dernière connexion
                      </div>
                    </div>
                    <div className="text-[12px] font-semibold text-gray-900 dark:text-gray-100">
                      {formatRelativeTime(candidat.dateConnexion)}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "cv" && (
            <motion.div
              key="cv"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="p-2"
            >
              {!candidat.hasCv ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-gray-400" />
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
              ) : loadingCvPdf ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16">
                  <div className="h-5 w-5 animate-spin rounded-full border border-gray-300 border-t-gray-700" />
                  <p className="text-[11px] text-gray-400">
                    Chargement du CV...
                  </p>
                </div>
              ) : cvPdfUrl ? (
                <div className="rounded-lg overflow-hidden ring-1 ring-gray-200/80 dark:ring-gray-700/60 flex flex-col bg-white dark:bg-gray-900/30">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700/60">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[11px] text-gray-500 font-medium">
                        CV — {candidat.nomComplet}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        window.open(cvPdfUrl, "_blank", "noopener,noreferrer")
                      }
                      className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-primary transition-colors cursor-pointer border-none bg-transparent"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ouvrir
                    </button>
                  </div>
                  <iframe
                    src={`${cvPdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=fitH`}
                    className="w-full border-0"
                    style={{ height: "520px" }}
                    title="CV Preview"
                    loading="eager"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-16">
                  <FileText className="w-5 h-5 text-gray-300" />
                  <p className="text-[11px] text-gray-400">
                    Aperçu indisponible
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "photo" && (
            <motion.div
              key="photo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="p-2"
            >
              {!photoBlobUrl && !candidat.photo ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16">
                  <ImageIcon className="w-5 h-5 text-gray-300" />
                  <span className="text-xs text-gray-400">
                    Aucune photo disponible
                  </span>
                </div>
              ) : (
                <div className="rounded-lg overflow-hidden ring-1 ring-gray-200/80 dark:ring-gray-700/60 flex flex-col bg-white dark:bg-gray-900/30">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                    Aperçu de la photo
                  </div>
                  <div className="bg-white dark:bg-gray-950/40 flex items-center justify-center min-h-[380px] max-h-[560px]">
                    <img
                      src={photoBlobUrl || candidat.photo}
                      alt={candidat.nomComplet || "Photo candidat"}
                      className="max-w-full max-h-[560px] object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom bar ── */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-700 shrink-0 bg-white dark:bg-gray-900/50">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <kbd className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-[9px] font-mono text-gray-500 dark:text-gray-400">
              Esc
            </kbd>
            <span>Fermer</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 border-none cursor-pointer bg-transparent transition-colors"
            title="Exporter (JSON)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDeleteCandidat}
                disabled={deleting}
                className="flex items-center gap-1 px-2.5 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-[0.6875rem] font-semibold border-none cursor-pointer transition-colors disabled:opacity-50"
              >
                {deleting ? "..." : "Confirmer"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 text-[0.6875rem] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border-none cursor-pointer bg-transparent"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900/20 text-gray-400 hover:text-gray-600 dark:hover:text-gray-400 border-none cursor-pointer bg-transparent transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Open */}
          <button
            onClick={closeSidePanelMenu}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-500 hover:bg-gray-500 text-white rounded-lg text-xs font-semibold border-none cursor-pointer transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ouvrir
          </button>
        </div>
      </div>
    </div>
  );
}
