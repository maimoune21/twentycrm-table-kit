import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Edit2,
  Plus,
  ExternalLink,
  MapPin,
  Bookmark,
  DollarSign,
  User,
  Users,
  Shield,
  Tag as TagIcon,
  Linkedin,
  List,
  TrendingUp,
  Calendar,
  X as XIcon,
  Mail,
  Phone,
  Link as LinkIcon,
  FileText,
  ToggleRight,
  ListPlus,
  Check,
  CheckSquare,
  Paperclip,
  Home,
  StickyNote,
  Globe,
  Briefcase,
  Search,
  Building2,
} from "lucide-react";
import { useRecordTableContextOrThrow } from "@/components/twenty-table/contexts";
import { useSidePanelMenu } from "../hooks";
import { Tag, SelectFieldInput } from "./SelectFieldInput";
import { DatePickerDropdown } from "./DatePickerDropdown";
import {
  parsePhoneNumber,
  getCountries,
  getCountryCallingCode,
} from "libphonenumber-js";
import "flag-icons/css/flag-icons.min.css";
import useEntreprisesAutocomplete from "@/hooks/useEntreprisesAutocomplete";
import type { IEntreprise } from "@/hooks/useEntreprisesAutocomplete";
import useCitiesAutocomplete from "@/hooks/useCitiesAutocomplete";
import { useEcoleAutocomplete } from "@/hooks/useEcoleAutocomplete";
import type { ColumnDefinition, RecordData } from "@/components/twenty-table/types";

// ═══════════════════════════════════════════════════════
// Icons by field type — Smart matching by label then type
// ═══════════════════════════════════════════════════════

const getFieldIcon = (type: string, label?: string) => {
  const cls = "w-4 h-4";

  if (label) {
    const l = label.toLowerCase();
    if (l.includes("email") || l.includes("mail"))
      return <Mail className={cls} />;
    if (l.includes("phone") || l.includes("tel"))
      return <Phone className={cls} />;
    if (l.includes("address") || l.includes("city") || l.includes("location"))
      return <MapPin className={cls} />;
    if (
      l.includes("url") ||
      l.includes("website") ||
      l.includes("domain") ||
      l.includes("link")
    )
      return <LinkIcon className={cls} />;
    if (l.includes("linkedin")) return <Linkedin className={cls} />;
    if (l.includes("balise") || l.includes("tag"))
      return <TagIcon className={cls} />;
    if (l.includes("chiffre") || l.includes("revenue") || l.includes("amount"))
      return <DollarSign className={cls} />;
    if (l.includes("created") || l.includes("owner") || l.includes("user"))
      return <User className={cls} />;
    if (l.includes("effectif") || l.includes("employee") || l.includes("team"))
      return <Users className={cls} />;
    if (l.includes("icp") || l.includes("role") || l.includes("permission"))
      return <Shield className={cls} />;
    if (l.includes("label") || l.includes("bookmark"))
      return <Bookmark className={cls} />;
    if (l.includes("list") || l.includes("category"))
      return <List className={cls} />;
    if (l.includes("sector") || l.includes("secteur") || l.includes("industry"))
      return <TrendingUp className={cls} />;
    if (l.includes("date") || l.includes("update") || l.includes("created"))
      return <Calendar className={cls} />;
  }

  const typeIconMap: Record<string, React.ReactNode> = {
    TEXT: <FileText className={cls} />,
    LONG_TEXT: <FileText className={cls} />,
    EMAIL: <Mail className={cls} />,
    PHONE: <Phone className={cls} />,
    DATE: <Calendar className={cls} />,
    URL: <LinkIcon className={cls} />,
    CURRENCY: <DollarSign className={cls} />,
    NUMBER: <DollarSign className={cls} />,
    BOOLEAN: <ToggleRight className={cls} />,
    SELECT: <ListPlus className={cls} />,
    RELATION: <LinkIcon className={cls} />,
    ENTERPRISE_LOGO: <Building2 className={cls} />,
  };

  return typeIconMap[type] || <FileText className={cls} />;
};

// ═══════════════════════════════════════════════════════
// Format field value for display
// ═══════════════════════════════════════════════════════

const formatFieldValue = (value: unknown, type: string): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "BOOLEAN") return ""; // Handled separately in JSX
  if (type === "DATE") {
    try {
      // Relative time like Twenty: "less than a minute ago", "about 2 hours ago"
      const diff = Date.now() - new Date(String(value)).getTime();
      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(mins / 60);
      const days = Math.floor(hours / 24);
      if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
      if (hours > 0) return `about ${hours} hour${hours > 1 ? "s" : ""} ago`;
      if (mins > 0) return `${mins} minute${mins > 1 ? "s" : ""} ago`;
      return "less than a minute ago";
    } catch {
      return String(value);
    }
  }
  return String(value);
};

// ═══════════════════════════════════════════════════════
// RelationFieldDropdown — Autocomplete dropdown for RELATION / ENTERPRISE_LOGO
// Uses the same hooks as the table cells (useEntreprisesAutocomplete / useCitiesAutocomplete)
// ═══════════════════════════════════════════════════════

const RelationFieldDropdown = ({
  fieldName,
  value,
  onSelect,
  onClear,
  onClose,
}: {
  fieldName: string;
  value: string;
  onSelect: (id: string | number, label: string) => void;
  onClear: () => void;
  onClose: () => void;
}) => {
  const normalizedField = String(fieldName || "").toLowerCase();
  const isEntreprise = normalizedField === "entreprise";
  const isEcole = normalizedField === "ecole" || normalizedField === "nomecole";
  const isVille = !isEntreprise && !isEcole;

  // Call both hooks unconditionally (React rules)
  const entrepriseHook = useEntreprisesAutocomplete();
  const citiesHook = useCitiesAutocomplete();
  const ecoleHook = useEcoleAutocomplete();

  const [searchTerm, setSearchTerm] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const normalizedResults = useMemo(() => {
    const results = isEntreprise
      ? (entrepriseHook.results || [])
      : isEcole
        ? (ecoleHook.suggestions || [])
        : (citiesHook.suggestions || []);

    return results.map((r: any) => ({
      id: r.id || r.value,
      label:
        r.abreviation ||
        r.titre ||
        r.name_fr ||
        r.name_en ||
        r.label ||
        r.nom ||
        r.name ||
        "",
      flag_url: isVille ? r.country?.flag_url : undefined,
    }));
  }, [
    isEntreprise,
    isEcole,
    isVille,
    entrepriseHook.results,
    ecoleHook.suggestions,
    citiesHook.suggestions,
  ]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleSearch = useCallback(
    (term: string) => {
      setSearchTerm(term);
      if (isEntreprise) {
        entrepriseHook.setQuery(term);
      } else if (isEcole) {
        ecoleHook.searchEcoles(term);
      } else {
        citiesHook.setQuery(term);
      }
    },
    [isEntreprise, isEcole, entrepriseHook, ecoleHook, citiesHook],
  );

  return (
    <div
      ref={dropdownRef}
      onClick={(e) => e.stopPropagation()}
      className="absolute left-0 top-full z-50 mt-1 min-w-60 max-w-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
    >
      {/* Search input */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder={`Chercher ${isEntreprise ? "entreprise" : isEcole ? "école" : "ville"}...`}
          className="flex-1 text-[11px] bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            e.stopPropagation();
          }}
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm("");
              if (isEntreprise) {
                entrepriseHook.setQuery("");
              } else if (isEcole) {
                ecoleHook.searchEcoles("");
              } else {
                citiesHook.setQuery("");
              }
            }}
            className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <XIcon className="w-3 h-3 text-gray-400" />
          </button>
        )}
      </div>

      {/* Results list */}
      <div className="max-h-48 overflow-y-auto">
        {/* Clear option */}
        <button
          onClick={() => {
            onClear();
            onClose();
          }}
          className="w-full text-left px-3 py-2 text-[0.8125rem] hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors border-b border-gray-100 dark:border-gray-700"
        >
          <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center text-[0.625rem] font-semibold text-red-600 dark:text-red-300 shrink-0">
            ✕
          </div>
          <span className="text-gray-500">
            Retirer {isEntreprise ? "l'entreprise" : isEcole ? "l'école" : "la ville"}
          </span>
        </button>

        {normalizedResults.length > 0 ? (
          normalizedResults.map((result: any) => (
            <button
              key={result.id}
              onClick={() => {
                onSelect(result.id, result.label);
                onClose();
              }}
              className="w-full text-left px-3 py-2 text-[0.8125rem] hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              {isVille && result.flag_url ? (
                <img
                  src={result.flag_url}
                  alt=""
                  className="w-5 h-3.5 rounded-sm object-cover shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-5 h-5 rounded-sm bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[0.625rem] font-semibold text-gray-600 dark:text-gray-300 shrink-0">
                  {result.label?.charAt(0)?.toUpperCase() || "?"}
                </div>
              )}
              <span className="truncate text-gray-900 dark:text-gray-100">
                {result.label}
              </span>
            </button>
          ))
        ) : searchTerm ? (
          <div className="px-3 py-4 text-center text-xs text-gray-400">
            Aucun résultat trouvé
          </div>
        ) : (
          <div className="px-3 py-4 text-center text-xs text-gray-400">
            Tapez pour chercher...
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// PhoneFieldDropdown — Inline phone editor for side panel
// Manual country picker + input (no ReactPhoneNumberInput quirks)
// ═══════════════════════════════════════════════════════

const PhoneFieldDropdown = ({
  value,
  onSave,
  onClose,
}: {
  value: string;
  onSave: (newValue: string) => void;
  onClose: () => void;
}) => {
  // Parse existing value to extract country + number
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
    // If can't parse, try to extract calling code
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
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Click outside — ignore country picker portal
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest?.('[data-phone-dropdown="true"]') ||
        target.closest?.("[data-phone-country-picker]")
      )
        return;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const fullNumber = nationalNumber
    ? `+${callingCode}${nationalNumber.replace(/\s/g, "")}`
    : "";

  const handleConfirm = useCallback(() => {
    onSave(fullNumber);
    onClose();
  }, [fullNumber, onSave, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleCountrySelect = useCallback(
    (cc: string) => {
      setCountryCode(cc);
      const country = countries.find((c: any) => c.countryCode === cc);
      if (country) setCallingCode(country.callingCode);
      setCountryPickerOpen(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [countries],
  );

  // Format for preview
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

  return (
    <div
      ref={dropdownRef}
      onClick={(e) => e.stopPropagation()}
      className="absolute left-0 top-full z-50 mt-1 min-w-70 max-w-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-visible"
    >
      <div className="p-2">
        <div
          className={`flex items-center rounded border h-8 ${
            nationalNumber
              ? "border-blue-500 bg-white dark:bg-gray-950 shadow-[0_0_0_1px_rgba(59,130,246,0.1)]"
              : "border-gray-200 dark:border-gray-700 bg-transparent"
          } transition-all duration-200`}
        >
          {/* Country flag button */}
          <button
            type="button"
            onClick={() => setCountryPickerOpen(!countryPickerOpen)}
            className={`flex items-center gap-0.5 pl-2 pr-1 h-full border-r border-gray-200 dark:border-gray-700 ${
              countryPickerOpen
                ? "bg-gray-100 dark:bg-gray-800"
                : "hover:bg-gray-50 dark:hover:bg-gray-800"
            } transition-colors shrink-0`}
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

          {/* Calling code + input */}
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
              if (e.key === "Escape") {
                handleCancel();
              }
              e.stopPropagation();
            }}
            placeholder="6 12 34 56 78"
            className="flex-1 h-full bg-transparent border-none outline-none text-[13px] px-1.5 placeholder-gray-400 text-gray-900 dark:text-gray-100 font-medium min-w-0"
          />

          {/* Check / Cancel buttons */}
          <div className="flex items-center gap-0.5 pr-1.5 shrink-0">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleConfirm}
              className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
              title="Confirmer"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCancel}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              title="Annuler"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Country picker dropdown */}
      {countryPickerOpen && (
        <CountryPickerInline
          countries={countries}
          selectedCode={countryCode}
          onSelect={handleCountrySelect}
          onClose={() => setCountryPickerOpen(false)}
        />
      )}

      {/* Formatted preview */}
      {formattedPreview && (
        <div className="px-3 py-1.5 border-t border-gray-100 dark:border-gray-700 text-[0.75rem] text-gray-400 flex items-center gap-2">
          <span
            className={`fi fi-${countryCode.toLowerCase()} w-4 h-3 rounded-sm shadow-sm`}
          />
          <span>{formattedPreview}</span>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// CountryPickerInline — dropdown list of countries for PhoneFieldDropdown
// ═══════════════════════════════════════════════════════

const CountryPickerInline = ({
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
}) => {
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      ref={containerRef}
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
              className={`w-full text-left px-2.5 py-1.5 text-[0.8125rem] flex items-center gap-2 transition-colors ${
                c.countryCode === selectedCode
                  ? "bg-gray-100 dark:bg-gray-800"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <span
                className={`fi fi-${c.countryCode.toLowerCase()} w-4 h-3 rounded-sm shadow-sm shrink-0`}
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
};

// ═══════════════════════════════════════════════════════
// FieldRow — Twenty style: Icon | Label (fixed) | Value
// Supports: TEXT, EMAIL, PHONE, NUMBER, URL, DATE, SELECT,
//           BOOLEAN, CURRENCY, RELATION, ENTERPRISE_LOGO
// ═══════════════════════════════════════════════════════

const FieldRow = ({
  column,
  value,
  onCellChange,
  recordId,
  record,
}: {
  column: ColumnDefinition;
  value: unknown;
  onCellChange?: (recordId: string, fieldName: string, value: unknown) => void;
  recordId: string;
  record?: RecordData;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [relationOpen, setRelationOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  const handleEdit = () => {
    if (column.type === "SELECT") {
      setSelectOpen(true);
      return;
    }
    if (column.type === "DATE") {
      setDateOpen(true);
      return;
    }
    if (column.type === "RELATION" || column.type === "ENTERPRISE_LOGO") {
      setRelationOpen(true);
      return;
    }
    if (column.type === "PHONE") {
      setPhoneOpen(true);
      return;
    }
    setIsEditing(true);
    setEditValue(String(value ?? ""));
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSave = () => {
    setIsEditing(false);
    if (editValue !== String(value ?? "")) {
      onCellChange?.(recordId, column.fieldName, editValue);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(String(value ?? ""));
  };

  // Find the selected option for SELECT fields
  const selectedOption =
    column.type === "SELECT" && column.options
      ? column.options.find((o) => o.value === String(value ?? ""))
      : undefined;

  // For ENTERPRISE_LOGO: extract name and logo from record
  const entrepriseName =
    column.type === "ENTERPRISE_LOGO"
      ? String((record as any)?._entrepriseName ?? value ?? "")
      : "";
  const logoUrl =
    column.type === "ENTERPRISE_LOGO"
      ? ((record as any)?._enterpriseLogoUrl ?? null)
      : null;

  if (isEditing) {
    return (
      <div className="flex items-center gap-3 h-8 px-3 bg-blue-50 dark:bg-blue-500/10">
        <div className="shrink-0 text-blue-500 dark:text-blue-400">
          {getFieldIcon(column.type, column.label)}
        </div>
        <div className="shrink-0 w-28 text-[0.8125rem] text-gray-500 dark:text-gray-400 truncate">
          {column.label}
        </div>
        <input
          ref={inputRef}
          type={column.type === "NUMBER" ? "number" : "text"}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          className="flex-1 bg-transparent text-[0.8125rem] text-gray-900 dark:text-gray-100 border-none outline-none min-w-0"
        />
      </div>
    );
  }

  // ── Display value renderer ──
  const renderDisplayValue = () => {
    switch (column.type) {
      case "BOOLEAN":
        return (
          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            {value ? (
              <>
                <CheckSquare className="w-3.5 h-3.5" />
                True
              </>
            ) : (
              <>
                <XIcon className="w-3.5 h-3.5" />
                False
              </>
            )}
          </span>
        );
      case "DATE":
        return (
          <span className="text-green-600 dark:text-green-400">
            {formatFieldValue(value, column.type)}
          </span>
        );
      case "SELECT":
        return selectedOption ? (
          <Tag label={selectedOption.label} color={selectedOption.color} />
        ) : (
          <span className="text-gray-400 dark:text-gray-500">—</span>
        );
      case "ENTERPRISE_LOGO":
        return (
          <span className="flex items-center gap-2">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={entrepriseName}
                className="w-5 h-5 rounded-sm object-cover shrink-0 border border-gray-200 dark:border-gray-700"
              />
            ) : entrepriseName ? (
              <div className="w-5 h-5 rounded-sm bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[0.625rem] font-semibold text-gray-600 dark:text-gray-300 shrink-0">
                {entrepriseName.charAt(0).toUpperCase()}
              </div>
            ) : null}
            <span className="truncate">{entrepriseName || "—"}</span>
          </span>
        );
      case "RELATION":
        return (
          <span className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-sm bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[0.625rem] font-semibold text-gray-600 dark:text-gray-300 shrink-0">
              {String(value ?? "")
                .charAt(0)
                .toUpperCase() || "?"}
            </div>
            <span className="truncate">
              {formatFieldValue(value, column.type)}
            </span>
          </span>
        );
      default: {
        // For PHONE: show flag + formatted number
        if (column.type === "PHONE" && value) {
          try {
            const parsed = parsePhoneNumber(String(value));
            if (parsed) {
              return (
                <span className="flex items-center gap-2">
                  <span
                    className={`fi fi-${(parsed.country || "ma").toLowerCase()} w-4 h-3 rounded-sm shadow-sm shrink-0`}
                  />
                  <span className="truncate">
                    {parsed.formatInternational()}
                  </span>
                </span>
              );
            }
          } catch {
            /* fallback below */
          }
        }
        return <>{formatFieldValue(value, column.type)}</>;
      }
    }
  };

  return (
    <div
      className="relative flex items-center gap-3 h-8 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group transition-colors"
      onClick={handleEdit}
    >
      <div className="shrink-0 text-gray-400 dark:text-gray-500">
        {getFieldIcon(column.type, column.label)}
      </div>
      <div className="shrink-0 w-28 text-[0.8125rem] text-gray-500 dark:text-gray-400 truncate">
        {column.label}
      </div>
      <div className="flex-1 text-[0.8125rem] text-gray-900 dark:text-gray-100 truncate min-w-0">
        {renderDisplayValue()}
      </div>
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Edit2 className="w-3 h-3 text-gray-400" />
      </div>

      {/* Twenty-style SELECT dropdown */}
      {selectOpen && column.options && (
        <div onClick={(e) => e.stopPropagation()}>
          <SelectFieldInput
            options={column.options}
            value={String(value ?? "")}
            onChange={(newValue) => {
              onCellChange?.(recordId, column.fieldName, newValue);
            }}
            onClose={() => setSelectOpen(false)}
          />
        </div>
      )}

      {/* Twenty-style DATE picker */}
      {dateOpen && (
        <div onClick={(e) => e.stopPropagation()}>
          <DatePickerDropdown
            value={value ? String(value) : null}
            onChange={(isoDate) => {
              onCellChange?.(recordId, column.fieldName, isoDate);
            }}
            onClose={() => setDateOpen(false)}
          />
        </div>
      )}

      {/* RELATION / ENTERPRISE_LOGO autocomplete dropdown */}
      {relationOpen && (
        <RelationFieldDropdown
          fieldName={
            column.type === "ENTERPRISE_LOGO" ? "entreprise" : column.fieldName
          }
          value={
            column.type === "ENTERPRISE_LOGO"
              ? entrepriseName
              : String(value ?? "")
          }
          onSelect={(id) => {
            onCellChange?.(recordId, column.fieldName, id);
          }}
          onClear={() => {
            onCellChange?.(recordId, column.fieldName, null);
          }}
          onClose={() => setRelationOpen(false)}
        />
      )}

      {/* PHONE editor with country picker */}
      {phoneOpen && (
        <PhoneFieldDropdown
          value={String(value ?? "")}
          onSave={(newValue) => {
            if (newValue !== String(value ?? "")) {
              onCellChange?.(recordId, column.fieldName, newValue);
            }
          }}
          onClose={() => setPhoneOpen(false)}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// CompanyCard — Display enterprise info in side panel
// ═══════════════════════════════════════════════════════

const stripHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
};

const CompanyCard = ({ entreprise }: { entreprise: IEntreprise }) => {
  const letter = (entreprise.nom || "E").charAt(0).toUpperCase();
  const plainDescription = entreprise.description
    ? stripHtml(entreprise.description)
    : null;

  const villeName = entreprise.ville?.ville_name ?? null;

  // Build fields — only show non-null ones + always show key fields
  const fields: {
    label: string;
    value: string | null | undefined;
    icon: React.ReactNode;
    isLink?: boolean;
    isTag?: boolean;
  }[] = [
    entreprise.statut
      ? {
          label: "Statut",
          value: entreprise.statut,
          icon: <TagIcon className="w-3.5 h-3.5" />,
          isTag: true,
        }
      : null,
    villeName
      ? {
          label: "Ville",
          value: villeName,
          icon: <MapPin className="w-3.5 h-3.5" />,
        }
      : entreprise.pays
        ? {
            label: "Pays",
            value: entreprise.pays,
            icon: <MapPin className="w-3.5 h-3.5" />,
          }
        : null,
    entreprise.taille_de_entreprise
      ? {
          label: "Taille",
          value: entreprise.taille_de_entreprise,
          icon: <Users className="w-3.5 h-3.5" />,
        }
      : null,
    entreprise.chiffre_affaires
      ? {
          label: "Chiffre d'affaires",
          value: String(entreprise.chiffre_affaires),
          icon: <DollarSign className="w-3.5 h-3.5" />,
        }
      : null,
    entreprise.type_entreprise
      ? {
          label: "Type",
          value: entreprise.type_entreprise,
          icon: <Briefcase className="w-3.5 h-3.5" />,
        }
      : null,
    entreprise.annee_creation
      ? {
          label: "Création",
          value: String(entreprise.annee_creation),
          icon: <Calendar className="w-3.5 h-3.5" />,
        }
      : null,
    entreprise.offres_count != null
      ? {
          label: "Offres",
          value: String(entreprise.offres_count),
          icon: <FileText className="w-3.5 h-3.5" />,
        }
      : null,
    entreprise.website
      ? {
          label: "Website",
          value: entreprise.website,
          icon: <Globe className="w-3.5 h-3.5" />,
          isLink: true,
        }
      : null,
    entreprise.linkedin
      ? {
          label: "Linkedin",
          value: entreprise.linkedin,
          icon: <Linkedin className="w-3.5 h-3.5" />,
          isLink: true,
        }
      : null,
    entreprise.facebook
      ? {
          label: "Facebook",
          value: entreprise.facebook,
          icon: <Globe className="w-3.5 h-3.5" />,
          isLink: true,
        }
      : null,
    entreprise.politique_teletravail
      ? {
          label: "Télétravail",
          value: entreprise.politique_teletravail,
          icon: <Building2 className="w-3.5 h-3.5" />,
        }
      : null,
  ].filter(Boolean) as {
    label: string;
    value: string;
    icon: React.ReactNode;
    isLink?: boolean;
    isTag?: boolean;
  }[];
  return (
    <div className="py-1">
      {/* Company header — logo/avatar + name + badges */}
      <div className="flex items-center gap-3 px-3 py-2">
        {entreprise.logo_url ? (
          <img
            src={entreprise.logo_url}
            alt={entreprise.nom || "Logo"}
            className="w-9 h-9 rounded-md object-contain bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0 p-0.5"
          />
        ) : (
          <div className="w-9 h-9 rounded-md bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">{letter}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[0.8125rem] font-semibold text-gray-100 truncate">
              {entreprise.nom || "Entreprise"}
            </span>
            {entreprise.partenaire && (
              <span className="px-1.5 py-0.5 rounded text-[0.5625rem] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                Partenaire
              </span>
            )}
          </div>
          {villeName && (
            <div className="flex items-center gap-1 mt-0.5 text-[0.6875rem] text-gray-500">
              <MapPin className="w-3 h-3" />
              {villeName}
              {entreprise.pays && <span>· {entreprise.pays}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {plainDescription && (
        <div className="mx-3 mb-2 px-2.5 py-2 rounded-md bg-gray-800/40 border border-gray-700/50">
          <p className="text-[0.6875rem] text-gray-400 leading-relaxed line-clamp-3 m-0">
            {plainDescription}
          </p>
        </div>
      )}

      {/* Secteurs badges */}
      {entreprise.secteurs && entreprise.secteurs.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 mb-2">
          {entreprise.secteurs.map((s) => (
            <span
              key={s.id}
              className="px-1.5 py-0.5 rounded text-[0.625rem] bg-blue-500/15 text-blue-400 border border-blue-500/20"
            >
              {s.nom}
            </span>
          ))}
        </div>
      )}

      {/* Company fields — only non-null */}
      {fields.length > 0 && (
        <div className="border-t border-gray-700/40 mt-1 pt-1">
          {fields.map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-2.5 h-7 px-3 hover:bg-gray-800/40 transition-colors"
            >
              <div className="shrink-0 text-gray-500">{f.icon}</div>
              <div className="shrink-0 w-26 text-[0.75rem] text-gray-500 truncate">
                {f.label}
              </div>
              <div className="flex-1 text-[0.75rem] truncate min-w-0">
                {f.isLink && f.value ? (
                  <a
                    href={
                      f.value.startsWith("http")
                        ? f.value
                        : `https://${f.value}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    {f.value
                      .replace(/^https?:\/\/(www\.)?/, "")
                      .replace(/\/$/, "")}
                  </a>
                ) : f.isTag && f.value ? (
                  <Tag
                    label={f.value}
                    color={
                      f.value === "validé"
                        ? "green"
                        : f.value === "refusé"
                          ? "red"
                          : "orange"
                    }
                  />
                ) : (
                  <span className="text-gray-300">{f.value}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// CollapsibleSection — Twenty style
// ═══════════════════════════════════════════════════════

const CollapsibleSection = ({
  title,
  count,
  actionIcon = "edit",
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: string;
  actionIcon?: "edit" | "plus";
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center w-full px-3 py-2.5 text-gray-200 dark:text-gray-200 hover:text-white dark:hover:text-white font-semibold text-[0.8125rem] bg-transparent border-none cursor-pointer transition-colors group"
      >
        <span className="flex-1 text-left flex items-center gap-2">
          {title}
          {count && (
            <span className="text-gray-500 dark:text-gray-500 font-normal text-xs">
              {count}
            </span>
          )}
        </span>
        {actionIcon === "edit" ? (
          <Edit2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        ) : (
          <Plus className="w-3.5 h-3.5 text-gray-500 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 ml-1 text-gray-500 dark:text-gray-500 transition-transform ${isOpen ? "" : "-rotate-90"}`}
        />
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
};

// ═══════════════════════════════════════════════════════
// Tab definitions
// ═══════════════════════════════════════════════════════

type TabId = "home" | "tasks" | "notes" | "files";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "Home", icon: <Home className="w-3.5 h-3.5" /> },
  {
    id: "tasks",
    label: "Tasks",
    icon: <CheckSquare className="w-3.5 h-3.5" />,
  },
  { id: "notes", label: "Notes", icon: <StickyNote className="w-3.5 h-3.5" /> },
  { id: "files", label: "Files", icon: <Paperclip className="w-3.5 h-3.5" /> },
];

// ═══════════════════════════════════════════════════════
// SidePanelRecordPage — Main component
// ═══════════════════════════════════════════════════════

type SidePanelRecordPageProps = {
  recordId: string;
};

export const SidePanelRecordPage = ({ recordId }: SidePanelRecordPageProps) => {
  const { records, visibleColumns, onCellChange } =
    useRecordTableContextOrThrow();
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const { closeSidePanelMenu } = useSidePanelMenu();

  const record = records.find((r: RecordData) => r.id === recordId);
  const detailColumns = visibleColumns.filter(
    (c: ColumnDefinition) => !c.isLabelIdentifier,
  );

  // ── Fetch company data from record's entreprise_id ──
  const [companyData, setCompanyData] = useState<IEntreprise | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);

  const rawEntrepriseId =
    record?.entreprise_id ??
    record?._entreprise_id ??
    (record as any)?._raw?.entreprise_id ??
    null;

  useEffect(() => {
    setCompanyLoading(false);
    setCompanyData(null);
  }, [record, rawEntrepriseId]);

  if (!record) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        Record not found
      </div>
    );
  }

  // ── Handle "Open" button (Twenty's RecordShowSidePanelOpenRecordButton) ──
  const handleOpenRecord = useCallback(() => {
    // In Twenty: navigates to full page and closes side panel
    // Here: close side panel (actual navigation would depend on router)
    closeSidePanelMenu();
  }, [closeSidePanelMenu]);

  return (
    <div className="flex flex-col h-full">
      {/* ── Tabs — Twenty style: icon + label + "+2 More" ── */}
      <div className="flex items-center gap-0.5 px-3 h-10 border-b border-gray-200 dark:border-gray-700 shrink-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors border-none cursor-pointer ${
              activeTab === tab.id
                ? "text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 bg-transparent"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <button className="flex items-center px-2 py-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 whitespace-nowrap bg-transparent border-none cursor-pointer">
          +2 More
          <ChevronDown className="w-3 h-3 ml-0.5" />
        </button>
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Fields list */}
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {detailColumns.map((col: ColumnDefinition) => (
                  <FieldRow
                    key={col.id}
                    column={col}
                    value={record[col.fieldName]}
                    onCellChange={onCellChange}
                    recordId={recordId}
                    record={record}
                  />
                ))}
              </div>

              {/* Collapsible sections — Twenty style */}
              <div className="border-t border-gray-200 dark:border-gray-700 mt-1">
                <CollapsibleSection
                  title="Account Owner"
                  actionIcon="edit"
                  defaultOpen={false}
                >
                  <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">
                    No owner assigned
                  </div>
                </CollapsibleSection>

                <CollapsibleSection
                  title="Opportunities"
                  actionIcon="plus"
                  defaultOpen={false}
                >
                  <div className="px-3 py-3 text-center text-sm text-gray-400 dark:text-gray-500">
                    <button className="flex items-center justify-center gap-2 mx-auto text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-transparent border-none cursor-pointer">
                      <Plus className="w-4 h-4" />
                      Add opportunity
                    </button>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection
                  title="Company"
                  actionIcon="edit"
                  defaultOpen={!!companyData}
                >
                  {companyLoading ? (
                    <div className="px-3 py-3 text-sm text-gray-400 dark:text-gray-500 flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      Chargement...
                    </div>
                  ) : companyData ? (
                    <CompanyCard entreprise={companyData} />
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">
                      Aucune entreprise liée
                    </div>
                  )}
                </CollapsibleSection>
              </div>
            </motion.div>
          )}

          {activeTab === "tasks" && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 text-gray-400"
            >
              <CheckSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm">No tasks</p>
            </motion.div>
          )}

          {activeTab === "notes" && (
            <motion.div
              key="notes"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 text-gray-400"
            >
              <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm">No notes</p>
            </motion.div>
          )}

          {activeTab === "files" && (
            <motion.div
              key="files"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 text-gray-400"
            >
              <Paperclip className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm">No files</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom Action Bar — Twenty's RecordShowSidePanelOpenRecordButton ── */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-700 shrink-0 bg-gray-50 dark:bg-gray-900/50">
        <div className="text-xs text-gray-400 dark:text-gray-500">
          Options{" "}
          <kbd className="ml-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-[0.625rem] font-mono">
            Ctrl O
          </kbd>
        </div>
        <button
          onClick={handleOpenRecord}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium border-none cursor-pointer transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open
          <kbd className="ml-1 px-1 py-0.5 bg-blue-700 rounded text-blue-200 text-[0.625rem] font-mono">
            Ctrl ↵
          </kbd>
        </button>
      </div>
    </div>
  );
};
