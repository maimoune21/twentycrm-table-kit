import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useRecordTableContextOrThrow } from "@/components/twenty-table/contexts";
import { useFloating, offset, flip, shift } from "@floating-ui/react";
import {
  parsePhoneNumber,
  getCountries,
  getCountryCallingCode,
} from "libphonenumber-js";
import { Check, X, Search } from "lucide-react";
import "flag-icons/css/flag-icons.min.css";

type PhoneCellProps = {
  recordId: string;
  fieldName: string;
  value: string;
  isEditMode: boolean;
  onClose: () => void;
};

export const PhoneCell = ({
  recordId,
  fieldName,
  value,
  isEditMode,
  onClose,
}: PhoneCellProps) => {
  const { onCellChange } = useRecordTableContextOrThrow();

  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    middleware: [offset(4), flip(), shift()],
  });

  // Parse existing value
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
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Reset state when entering edit mode
  useEffect(() => {
    if (isEditMode) {
      setCountryCode(initialParsed.countryCode);
      setCallingCode(initialParsed.callingCode);
      setNationalNumber(initialParsed.national);
      setCountryPickerOpen(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isEditMode, initialParsed]);

  // Click outside
  useEffect(() => {
    if (!isEditMode) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest?.("[data-phone-country-picker]")) return;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        refs.reference.current &&
        !(refs.reference.current as HTMLElement).contains(target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditMode, onClose, refs]);

  const fullNumber = nationalNumber
    ? `+${callingCode}${nationalNumber.replace(/\s/g, "")}`
    : "";

  const handleConfirm = useCallback(() => {
    if (fullNumber !== value && onCellChange) {
      onCellChange(recordId, fieldName, fullNumber);
    }
    onClose();
  }, [fullNumber, value, onCellChange, recordId, fieldName, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

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

  // Formatted preview
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

  // Display value with flag
  const displayContent = useMemo(() => {
    if (!value) return "—";
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

  return (
    <div ref={refs.setReference} className="flex items-center w-full h-full">
      {/* Display */}
      {String(value || "").trim() === "" ? (
        <div
          className={`w-full h-5 flex items-center justify-center ${isEditMode ? "opacity-50" : ""}`}
        >
          <span className="text-gray-300 dark:text-gray-500">—</span>
        </div>
      ) : (
        <div
          className={`flex items-center gap-1 h-6 min-w-0 px-1.5 rounded-md shadow-xs bg-[#00000005] backdrop-blur-sm border border-gray-200 dark:border-gray-600 max-w-full overflow-hidden ${isEditMode ? "opacity-50" : ""}`}
        >
          {displayCountry && (
            <span
              className={`fi fi-${displayCountry} inline-block shrink-0 rounded-[2px] overflow-hidden shadow-sm`}
              style={{
                width: "11px",
                height: "8px",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          )}
          <span className="truncate text-[10px] text-gray-700 dark:text-gray-300 font-medium">
            {displayContent}
          </span>
        </div>
      )}

      {/* Dropdown Editor */}
      {isEditMode && (
        <div
          ref={(node) => {
            dropdownRef.current = node;
            refs.setFloating(node);
          }}
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
              {/* Country flag button */}
              <button
                type="button"
                onClick={() => setCountryPickerOpen(!countryPickerOpen)}
                className={`flex items-center gap-0.5 pl-2 pr-1 h-full border-r border-gray-200 dark:border-gray-700 cursor-pointer ${
                  countryPickerOpen
                    ? "bg-gray-100 dark:bg-gray-800"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                } transition-colors shrink-0`}
              >
                <span
                  className={`fi fi-${countryCode.toLowerCase()} rounded-[3px] shadow-sm`}
                  style={{
                    width: "14px",
                    height: "10px",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
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
              <span className="pl-2 text-[12px] text-gray-500 dark:text-gray-400 font-medium shrink-0 select-none">
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
                className="flex-1 h-full bg-transparent border-none outline-none text-[12px] mb-0.5 px-1 placeholder-gray-400 text-gray-900 dark:text-gray-100 font-medium min-w-0"
              />

              {/* Check / Cancel buttons */}
              <div className="flex items-center gap-0.5 pr-1.5 shrink-0">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleConfirm}
                  className="p-1 text-gray-400 hover:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded transition-colors"
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
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Country picker dropdown */}
          {countryPickerOpen && (
            <PhoneCellCountryPicker
              countries={countries}
              selectedCode={countryCode}
              onSelect={handleCountrySelect}
              onClose={() => setCountryPickerOpen(false)}
            />
          )}

          {/* Formatted preview */}
          {formattedPreview && (
            <div className="px-3 py-1 border-t border-gray-100 dark:border-gray-700 text-[11px] text-gray-400 flex items-center gap-2">
              <span
                className={`fi fi-${countryCode.toLowerCase()} rounded-[2.5px] shadow-sm`}
                style={{
                  width: "13px",
                  height: "9px",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <span>{formattedPreview}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// PhoneCellCountryPicker — Inline country list for PhoneCell
// ═══════════════════════════════════════════════════════

const PhoneCellCountryPicker = ({
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
      <div className="flex items-center gap-2 px-2 py-1.5 border border-gray-100 rounded-lg dark:border-gray-800 bg-white m-1.5 dark:bg-gray-900/50">
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
      <div className="max-h-48 overflow-y-auto m-1.5 border border-gray-200 rounded-lg">
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
              className={`w-full text-left px-2.5 py-1.5 text-[11px] cursor-pointer flex items-center gap-2 transition-colors ${
                c.countryCode === selectedCode
                  ? "bg-gray-100 dark:bg-gray-800"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <span
                className={`fi fi-${c.countryCode.toLowerCase()} rounded-[2px]! shadow-sm shrink-0`}
                style={{
                  width: "14px",
                  height: "10px",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
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
