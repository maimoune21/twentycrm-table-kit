/**
 * RecordTableNewRowCell — Cellule d'édition pour la nouvelle row
 *
 * Utilise les mêmes composants que RecordTableCellEditMode mais avec NewRowContext
 * Gère le cas spécial de "nomComplet" avec deux champs (nom + prénom)
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFloating, offset, flip, shift } from "@floating-ui/react";
import {
  Search,
  X,
  AlertCircle,
  ChevronDown,
  Check,
  Loader2,
} from "lucide-react";
import {
  parsePhoneNumber,
  getCountries,
  getCountryCallingCode,
} from "libphonenumber-js";
import "flag-icons/css/flag-icons.min.css";
import { useNewRowContext } from "../../contexts/NewRowContext";
import type { ColumnDefinition, SelectOption } from "../../types";
import { useRowHeight } from "../../hooks/useRowHeight";

// Hooks d'autocomplete
import useEntreprisesAutocomplete from "@/hooks/useEntreprisesAutocomplete";
import useCitiesAutocomplete from "@/hooks/useCitiesAutocomplete";
import { useEcoleAutocomplete } from "@/hooks/useEcoleAutocomplete";

type RecordTableNewRowCellProps = {
  columnDefinition: ColumnDefinition;
  virtualField?: "prenom" | "nom";
  virtualLabel?: string;
  inputRef?: (el: HTMLInputElement | null) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
};

export const RecordTableNewRowCell = ({
  columnDefinition,
  virtualField,
  virtualLabel,
  inputRef,
  onKeyDown,
}: RecordTableNewRowCellProps) => {
  const {
    pendingData,
    onFieldChange,
    validationErrors,
    touchedFields,
    markFieldTouched,
    requiredFields,
  } = useNewRowContext();

  // Check if this field is required
  const fieldName = virtualField || columnDefinition.fieldName;
  const isRequired = requiredFields.includes(fieldName);
  const isTouched = touchedFields.has(fieldName);
  const error = validationErrors[fieldName];
  const showError = isTouched && error;

  // Handle virtual fields for prénom/nom (split from nomComplet)
  if (virtualField) {
    return (
      <TextNewRowCell
        value={String(pendingData[virtualField] || "")}
        onChange={(val) => onFieldChange(virtualField, val)}
        placeholder={`${virtualLabel || virtualField}${isRequired ? " *" : ""}`}
        inputRef={inputRef}
        onKeyDown={onKeyDown}
        isRequired={isRequired}
        hasError={!!showError}
        errorMessage={error}
        onBlur={() => markFieldTouched(virtualField)}
      />
    );
  }

  const value = pendingData[columnDefinition.fieldName];

  // Render based on field type
  switch (columnDefinition.type) {
    case "ENTERPRISE_LOGO":
      // If this is the label identifier (e.g. entreprise "nom" column),
      // render a plain text input for creation — not a relation autocomplete.
      if (columnDefinition.isLabelIdentifier) {
        return (
          <TextNewRowCell
            value={String(value || "")}
            onChange={(val) => onFieldChange(columnDefinition.fieldName, val)}
            placeholder={`${columnDefinition.label || columnDefinition.fieldName}${isRequired ? " *" : ""}`}
            inputRef={inputRef}
            onKeyDown={onKeyDown}
            isRequired={isRequired}
            hasError={!!showError}
            errorMessage={error}
            onBlur={() => markFieldTouched(columnDefinition.fieldName)}
          />
        );
      }
      // Otherwise fall through to RELATION (entreprise picker)
    // falls through
    case "RELATION":
      return (
        <RelationNewRowCell
          fieldName={columnDefinition.fieldName}
          value={String(value || "")}
          onSelect={(id, label) => {
            onFieldChange(columnDefinition.fieldName, label);
            onFieldChange(`${columnDefinition.fieldName}_id`, id);
          }}
          inputRef={inputRef}
          onKeyDown={onKeyDown}
          isRequired={isRequired}
          hasError={!!showError}
          onBlur={() => markFieldTouched(columnDefinition.fieldName)}
        />
      );

    case "SELECT":
      return (
        <SelectNewRowCell
          options={columnDefinition.options || []}
          value={String(value || "")}
          onChange={(val) => onFieldChange(columnDefinition.fieldName, val)}
          inputRef={inputRef}
          onKeyDown={onKeyDown}
          isRequired={isRequired}
          hasError={!!showError}
        />
      );

    case "MULTI_SELECT":
      return (
        <MultiSelectNewRowCell
          options={columnDefinition.options || []}
          value={Array.isArray(value) ? value : []}
          onChange={(val) => onFieldChange(columnDefinition.fieldName, val)}
          onSearch={(columnDefinition as any).onSearch}
          label={columnDefinition.label}
          inputRef={inputRef}
          onKeyDown={onKeyDown}
          isRequired={isRequired}
          hasError={!!showError}
        />
      );

    case "BOOLEAN":
      return (
        <BooleanNewRowCell
          value={value as boolean | undefined}
          onChange={(val) => onFieldChange(columnDefinition.fieldName, val)}
          inputRef={inputRef}
          onKeyDown={onKeyDown}
        />
      );

    case "DATE":
      return (
        <DateNewRowCell
          value={String(value || "")}
          onChange={(val) => onFieldChange(columnDefinition.fieldName, val)}
          inputRef={inputRef}
          onKeyDown={onKeyDown}
          isRequired={isRequired}
          hasError={!!showError}
          onBlur={() => markFieldTouched(columnDefinition.fieldName)}
        />
      );

    case "EMAIL":
      return (
        <TextNewRowCell
          value={String(value || "")}
          onChange={(val) => onFieldChange(columnDefinition.fieldName, val)}
          placeholder={`email@example.com${isRequired ? " *" : ""}`}
          type="email"
          inputRef={inputRef}
          onKeyDown={onKeyDown}
          isRequired={isRequired}
          hasError={!!showError}
          errorMessage={error}
          onBlur={() => markFieldTouched(columnDefinition.fieldName)}
        />
      );

    case "PHONE":
      return (
        <PhoneNewRowCell
          value={String(value || "")}
          onChange={(val) => onFieldChange(columnDefinition.fieldName, val)}
          inputRef={inputRef}
          onKeyDown={onKeyDown}
          isRequired={isRequired}
          hasError={!!showError}
          onBlur={() => markFieldTouched(columnDefinition.fieldName)}
        />
      );

    case "NUMBER":
    case "CURRENCY":
      return (
        <TextNewRowCell
          value={String(value || "")}
          onChange={(val) => onFieldChange(columnDefinition.fieldName, val)}
          placeholder={isRequired ? "0 *" : "0"}
          type="number"
          inputRef={inputRef}
          onKeyDown={onKeyDown}
          isRequired={isRequired}
          hasError={!!showError}
          errorMessage={error}
          onBlur={() => markFieldTouched(columnDefinition.fieldName)}
        />
      );

    case "TEXT":
    case "URL":
    default:
      return (
        <TextNewRowCell
          value={String(value || "")}
          onChange={(val) => onFieldChange(columnDefinition.fieldName, val)}
          placeholder={`${columnDefinition.label}${isRequired ? " *" : ""}`}
          inputRef={inputRef}
          onKeyDown={onKeyDown}
          isRequired={isRequired}
          hasError={!!showError}
          errorMessage={error}
          onBlur={() => markFieldTouched(columnDefinition.fieldName)}
        />
      );
  }
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TextNewRowCell â€” Simple text input
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
type TextNewRowCellProps = {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  inputRef?:
    | ((el: HTMLInputElement | null) => void)
    | React.RefObject<HTMLInputElement | null>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isRequired?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  onBlur?: () => void;
};

const TextNewRowCell = ({
  value,
  onChange,
  placeholder,
  type = "text",
  inputRef,
  onKeyDown,
  isRequired = false,
  hasError = false,
  errorMessage,
  onBlur,
}: TextNewRowCellProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const localRef = useRef<HTMLInputElement>(null);
  const rowHeight = useRowHeight();

  // Handle both callback refs and RefObject refs
  const setRef = useCallback(
    (el: HTMLInputElement | null) => {
      (localRef as React.MutableRefObject<HTMLInputElement | null>).current =
        el;
      if (typeof inputRef === "function") {
        inputRef(el);
      } else if (inputRef && "current" in inputRef) {
        (inputRef as React.MutableRefObject<HTMLInputElement | null>).current =
          el;
      }
    },
    [inputRef],
  );

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  return (
    <div
      className={`
        relative flex items-center border-r border-b
        ${
          hasError
            ? "border-red-400 dark:border-red-500 bg-red-50/50 dark:bg-red-900/10"
            : "border-gray-200/80 dark:border-gray-700/80"
        }
        ${
          isFocused
            ? hasError
              ? "ring-2 ring-red-500 ring-inset bg-white dark:bg-gray-800 z-20"
              : "ring-2 ring-gray-500 ring-inset bg-white dark:bg-gray-800 z-20"
            : ""
        }
      `}
      style={{ height: rowHeight }}
    >
      <input
        ref={setRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={`
          w-full h-full px-2 text-sm bg-transparent focus:outline-none
          ${
            hasError
              ? "text-red-700 dark:text-red-400 placeholder-red-400/70"
              : "text-gray-900 dark:text-white placeholder-gray-400"
          }
        `}
        placeholder={placeholder}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        aria-invalid={hasError}
        aria-required={isRequired}
        aria-describedby={
          hasError && errorMessage ? `error-${placeholder}` : undefined
        }
      />
      {hasError && errorMessage && (
        <div
          className="absolute -bottom-5 left-0 flex items-center gap-1 text-xs text-red-500"
          id={`error-${placeholder}`}
        >
          <AlertCircle className="w-3 h-3" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DateNewRowCell â€” Date picker
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
type DateNewRowCellProps = {
  value: string;
  onChange: (val: string) => void;
  inputRef?:
    | ((el: HTMLInputElement | null) => void)
    | React.RefObject<HTMLInputElement | null>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isRequired?: boolean;
  hasError?: boolean;
  onBlur?: () => void;
};

const DateNewRowCell = ({
  value,
  onChange,
  inputRef,
  onKeyDown,
  isRequired = false,
  hasError = false,
  onBlur,
}: DateNewRowCellProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const localRef = useRef<HTMLInputElement>(null);
  const rowHeight = useRowHeight();

  // Handle both callback refs and RefObject refs
  const setRef = useCallback(
    (el: HTMLInputElement | null) => {
      (localRef as React.MutableRefObject<HTMLInputElement | null>).current =
        el;
      if (typeof inputRef === "function") {
        inputRef(el);
      } else if (inputRef && "current" in inputRef) {
        (inputRef as React.MutableRefObject<HTMLInputElement | null>).current =
          el;
      }
    },
    [inputRef],
  );

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  return (
    <div
      className={`
        relative flex items-center border-r border-b
        ${
          hasError
            ? "border-red-400 dark:border-red-500 bg-red-50/50 dark:bg-red-900/10"
            : "border-gray-200/80 dark:border-gray-700/80"
        }
        ${
          isFocused
            ? hasError
              ? "ring-2 ring-red-500 ring-inset bg-white dark:bg-gray-800 z-20"
              : "ring-2 ring-gray-500 ring-inset bg-white dark:bg-gray-800 z-20"
            : ""
        }
      `}
      style={{ height: rowHeight }}
    >
      <input
        ref={setRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={`
          w-full h-full px-2 text-sm bg-transparent focus:outline-none
          ${hasError ? "text-red-700 dark:text-red-400" : "text-gray-900 dark:text-white"}
        `}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        aria-invalid={hasError}
        aria-required={isRequired}
      />
    </div>
  );
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SelectNewRowCell â€” Dropdown select
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
type SelectNewRowCellProps = {
  options: SelectOption[];
  value: string;
  onChange: (val: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: (el: HTMLInputElement | null) => void;
  isRequired?: boolean;
  hasError?: boolean;
};

// ═══════════════════════════════════════════════════════════════════════════
// PhoneNewRowCell — Phone input with country picker
// ═══════════════════════════════════════════════════════════════════════════
type PhoneNewRowCellProps = {
  value: string;
  onChange: (val: string) => void;
  inputRef?: (el: HTMLInputElement | null) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isRequired?: boolean;
  hasError?: boolean;
  onBlur?: () => void;
};

const PhoneNewRowCell = ({
  value,
  onChange,
  inputRef,
  onKeyDown,
  isRequired = false,
  hasError = false,
  onBlur,
}: PhoneNewRowCellProps) => {
  const rowHeight = useRowHeight();
  const internalRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const setRef = useCallback(
    (el: HTMLInputElement | null) => {
      (internalRef as React.MutableRefObject<HTMLInputElement | null>).current =
        el;
      inputRef?.(el);
    },
    [inputRef],
  );

  const { refs, floatingStyles } = useFloating({
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
    const regionNames = new Intl.DisplayNames(["fr"], { type: "region" });
    return getCountries()
      .map((cc) => ({
        countryCode: cc,
        countryName: regionNames.of(cc) || cc,
        callingCode: String(getCountryCallingCode(cc)),
      }))
      .sort((a, b) => a.countryName.localeCompare(b.countryName));
  }, []);

  const filteredCountries = useMemo(() => {
    if (!searchQuery) return countries;
    const query = searchQuery.toLowerCase();
    return countries.filter(
      (c) =>
        c.countryName.toLowerCase().includes(query) ||
        c.callingCode.includes(query) ||
        c.countryCode.toLowerCase().includes(query),
    );
  }, [countries, searchQuery]);

  useEffect(() => {
    const fullNumber = nationalNumber
      ? `+${callingCode}${nationalNumber.replace(/\s/g, "")}`
      : "";
    if (fullNumber !== value) {
      onChange(fullNumber);
    }
  }, [callingCode, nationalNumber, onChange, value]);

  useEffect(() => {
    if (countryPickerOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [countryPickerOpen]);

  useEffect(() => {
    if (!countryPickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const floating = refs.floating.current;
      const reference = refs.reference.current;
      if (
        floating &&
        !floating.contains(e.target as Node) &&
        reference &&
        !(reference as HTMLElement).contains(e.target as Node)
      ) {
        setCountryPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [countryPickerOpen, refs]);

  const handleCountrySelect = useCallback(
    (cc: string) => {
      setCountryCode(cc);
      const country = countries.find((c) => c.countryCode === cc);
      if (country) setCallingCode(country.callingCode);
      setCountryPickerOpen(false);
      setTimeout(() => internalRef.current?.focus(), 50);
    },
    [countries],
  );

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  const handleKeyDownInternal = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape" && countryPickerOpen) {
        e.preventDefault();
        setCountryPickerOpen(false);
        return;
      }
      onKeyDown?.(e);
    },
    [countryPickerOpen, onKeyDown],
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

  return (
    <div
      ref={refs.setReference}
      className={`
        relative flex items-center border-r border-b transition-all duration-150
        ${hasError ? "border-red-400 dark:border-red-500 bg-red-50/50 dark:bg-red-900/10" : "border-gray-200/80 dark:border-gray-700/80 hover:bg-gray-50 dark:hover:bg-gray-800/50"}
        ${isFocused ? (hasError ? "ring-2 ring-red-500 ring-inset bg-white dark:bg-gray-800 z-20" : "ring-2 ring-gray-500 ring-inset bg-white dark:bg-gray-800 z-20") : ""}
      `}
      style={{ height: rowHeight }}
    >
      <div className="flex items-center w-full h-full">
        <button
          type="button"
          onClick={() => setCountryPickerOpen(!countryPickerOpen)}
          className={`flex items-center gap-0.5 pl-2 pr-1 h-full border-r border-gray-200 dark:border-gray-700 shrink-0 ${countryPickerOpen ? "bg-gray-100 dark:bg-gray-700" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"} transition-colors`}
        >
          <span
            className={`fi fi-${countryCode.toLowerCase()} w-4 h-3 rounded-sm shadow-sm`}
          />
          <ChevronDown
            className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${countryPickerOpen ? "rotate-180" : ""}`}
          />
        </button>
        <span className="pl-2 text-sm text-gray-500 dark:text-gray-400 font-medium shrink-0 select-none">
          +{callingCode}
        </span>
        <input
          ref={setRef}
          type="tel"
          value={nationalNumber}
          onChange={(e) => setNationalNumber(e.target.value)}
          onKeyDown={handleKeyDownInternal}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder="6 12 34 56 78"
          className={`flex-1 h-full px-1.5 text-sm bg-transparent focus:outline-none ${hasError ? "text-red-700 dark:text-red-400" : "text-gray-900 dark:text-white"} placeholder-gray-400`}
          aria-invalid={hasError}
          aria-required={isRequired}
        />
        {formattedPreview && nationalNumber && (
          <span className="pr-2 text-xs text-gray-400 shrink-0 hidden sm:block">
            {formattedPreview}
          </span>
        )}
      </div>

      <AnimatePresence>
        {countryPickerOpen && (
          <motion.div
            ref={refs.setFloating}
            style={floatingStyles}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="z-50 w-70 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-900 rounded-md">
                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Chercher un pays..."
                  className="flex-1 text-sm bg-transparent focus:outline-none text-gray-900 dark:text-white placeholder-gray-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-50 overflow-y-auto">
              {filteredCountries.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-400">
                  Aucun pays trouvé
                </div>
              ) : (
                filteredCountries.map((country, index) => (
                  <motion.button
                    key={country.countryCode}
                    type="button"
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.01, 0.1) }}
                    onClick={() => handleCountrySelect(country.countryCode)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${country.countryCode === countryCode ? "bg-gray-50 dark:bg-gray-900/30" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                  >
                    <span
                      className={`fi fi-${country.countryCode.toLowerCase()} w-5 h-3.5 rounded-sm shadow-sm shrink-0`}
                    />
                    <span className="flex-1 text-sm text-gray-900 dark:text-white truncate">
                      {country.countryName}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      +{country.callingCode}
                    </span>
                    {country.countryCode === countryCode && (
                      <Check className="w-4 h-4 text-gray-500 shrink-0" />
                    )}
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SelectNewRowCell = ({
  options,
  value,
  onChange,
  onKeyDown,
  inputRef,
  isRequired = false,
  hasError = false,
}: SelectNewRowCellProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const internalRef = useRef<HTMLInputElement>(null);

  // Sync external ref callback with internal ref
  const setRef = useCallback(
    (el: HTMLInputElement | null) => {
      (internalRef as React.MutableRefObject<HTMLInputElement | null>).current =
        el;
      inputRef?.(el);
    },
    [inputRef],
  );
  const rowHeight = useRowHeight();
  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    middleware: [offset(4), flip(), shift()],
  });

  const selectedOption = options.find((o) => o.value === value);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const floating = refs.floating.current;
      const reference = refs.reference.current;
      if (
        floating &&
        !floating.contains(e.target as Node) &&
        reference &&
        !(reference as HTMLElement).contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, refs]);

  // Handle keyboard on the hidden input for Tab navigation
  const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0) {
        onChange(options[highlightedIndex].value);
        setIsOpen(false);
      } else {
        setIsOpen(!isOpen);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) => Math.min(prev + 1, options.length - 1));
      }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      return;
    }
    onKeyDown?.(e);
  };

  return (
    <div
      ref={refs.setReference}
      className={`
        relative flex items-center border-r border-b cursor-pointer transition-all duration-150
        ${
          hasError
            ? "border-red-400 dark:border-red-500 bg-red-50/50 dark:bg-red-900/10"
            : "border-gray-200/80 dark:border-gray-700/80 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        }
        ${
          isFocused
            ? hasError
              ? "ring-2 ring-red-500 ring-inset bg-white dark:bg-gray-800 z-20"
              : "ring-2 ring-gray-500 ring-inset bg-white dark:bg-gray-800 z-20"
            : ""
        }
      `}
      style={{ height: rowHeight }}
      onClick={() => {
        setIsOpen(!isOpen);
        internalRef.current?.focus();
      }}
    >
      {/* Hidden input for keyboard navigation */}
      <input
        ref={setRef}
        type="text"
        className="absolute opacity-0 w-0 h-0"
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          // Delay close to allow click on dropdown items
          setTimeout(() => setIsOpen(false), 150);
        }}
        onKeyDown={handleKeyDownInternal}
        aria-invalid={hasError}
        aria-required={isRequired}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        readOnly
      />
      <div className="flex items-center justify-between w-full h-full px-2">
        <div className="flex-1">
          {selectedOption ? (
            <span
              className="px-2 py-0.5 rounded text-xs font-medium inline-flex items-center gap-1"
              style={{
                backgroundColor: getStatusColor(selectedOption.color).bg,
                color: getStatusColor(selectedOption.color).text,
              }}
            >
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-sm text-gray-400">Sélectionner...</span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={refs.setFloating}
            style={floatingStyles}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="z-50 min-w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 overflow-hidden"
            role="listbox"
          >
            {options.map((option, index) => (
              <motion.div
                key={option.value}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`
                  flex items-center justify-between px-3 py-2 cursor-pointer transition-colors
                  ${highlightedIndex === index ? "bg-gray-100 dark:bg-gray-700" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"}
                  ${option.value === value ? "bg-gray-50 dark:bg-gray-900/20" : ""}
                `}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(option.value);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                role="option"
                aria-selected={option.value === value}
              >
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: getStatusColor(option.color).bg,
                    color: getStatusColor(option.color).text,
                  }}
                >
                  {option.label}
                </span>
                {option.value === value && (
                  <Check className="w-4 h-4 text-gray-500" />
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// BooleanNewRowCell â€” Oui/Non toggle
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
type BooleanNewRowCellProps = {
  value: boolean | undefined;
  onChange: (val: boolean) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: (el: HTMLInputElement | null) => void;
};

const BooleanNewRowCell = ({
  value,
  onChange,
  onKeyDown,
  inputRef,
}: BooleanNewRowCellProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const internalRef = useRef<HTMLInputElement>(null);

  // Sync external ref callback with internal ref
  const setRef = useCallback(
    (el: HTMLInputElement | null) => {
      (internalRef as React.MutableRefObject<HTMLInputElement | null>).current =
        el;
      inputRef?.(el);
    },
    [inputRef],
  );
  const rowHeight = useRowHeight();

  // Handle keyboard on the hidden input for Tab navigation
  const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      // Toggle value
      onChange(value === undefined ? true : !value);
      return;
    }
    onKeyDown?.(e);
  };

  const handleToggle = () => {
    onChange(value === undefined ? true : !value);
    internalRef.current?.focus();
  };

  return (
    <div
      className={`
        relative flex items-center justify-center border-r border-b border-gray-200/80 dark:border-gray-700/80
        transition-all duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/50
        ${isFocused ? "ring-2 ring-gray-500 ring-inset bg-white dark:bg-gray-800 z-20" : ""}
      `}
      style={{ height: rowHeight }}
      onClick={handleToggle}
    >
      {/* Hidden input for keyboard navigation */}
      <input
        ref={setRef}
        type="text"
        className="absolute opacity-0 w-0 h-0"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDownInternal}
        role="switch"
        aria-checked={value ?? false}
        readOnly
      />

      {/* Toggle Switch */}
      <motion.button
        type="button"
        tabIndex={-1}
        className={`
          relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full 
          border-2 border-transparent transition-colors duration-200 ease-in-out
          focus:outline-none
          ${
            value === true
              ? "bg-gray-500"
              : value === false
                ? "bg-gray-300 dark:bg-gray-600"
                : "bg-gray-200 dark:bg-gray-700"
          }
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 700, damping: 30 }}
          className={`
            pointer-events-none inline-block h-4 w-4 transform rounded-full 
            bg-white shadow-sm ring-0
          `}
          style={{
            x: value === true ? 16 : 0,
          }}
        />
      </motion.button>

      {/* Label */}
      <span
        className={`
        ml-2 text-xs font-medium
        ${
          value === true
            ? "text-gray-600 dark:text-gray-400"
            : value === false
              ? "text-gray-500 dark:text-gray-400"
              : "text-gray-400 dark:text-gray-500"
        }
      `}
      >
        {value === undefined ? "—" : value ? "Oui" : "Non"}
      </span>
    </div>
  );
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RelationNewRowCell â€” Autocomplete for Entreprise/Ville
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
type RelationNewRowCellProps = {
  fieldName: string;
  value: string;
  onSelect: (id: string | number, label: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: (el: HTMLInputElement | null) => void;
  isRequired?: boolean;
  hasError?: boolean;
  onBlur?: () => void;
};

const RelationNewRowCell = ({
  fieldName,
  value,
  onSelect,
  onKeyDown,
  inputRef,
  isRequired = false,
  hasError = false,
  onBlur,
}: RelationNewRowCellProps) => {
  const [searchTerm, setSearchTerm] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const internalRef = useRef<HTMLInputElement>(null);

  // Sync external ref callback with internal ref
  const setRef = useCallback(
    (el: HTMLInputElement | null) => {
      (internalRef as React.MutableRefObject<HTMLInputElement | null>).current =
        el;
      inputRef?.(el);
    },
    [inputRef],
  );
  const rowHeight = useRowHeight();
  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    middleware: [offset(32), flip(), shift()],
  });

  const isEntreprise = fieldName === "entreprise";
  const isEcole = fieldName === "ecole" || fieldName === "nomEcole";
  const isVille = !isEntreprise && !isEcole;

  // Call all hooks unconditionally (React rules)
  const entrepriseHook = useEntreprisesAutocomplete();
  const citiesHook = useCitiesAutocomplete();
  const ecoleHook = useEcoleAutocomplete();

  // Select the right hook based on field
  const results = useMemo(
    () => (isEntreprise ? entrepriseHook.results : isEcole ? ecoleHook.suggestions : citiesHook.suggestions) || [],
    [isEntreprise, isEcole, entrepriseHook.results, ecoleHook.suggestions, citiesHook.suggestions],
  );
  const setQuery = isEntreprise ? entrepriseHook.setQuery : isEcole ? ecoleHook.searchEcoles : citiesHook.setQuery;
  const isLoading = isEntreprise
    ? ((entrepriseHook as { isLoading?: boolean }).isLoading ?? false)
    : isEcole ? ecoleHook.loading
    : citiesHook.loading;

  const normalizedResults = useMemo((): {
    id: string | number;
    label: string;
    logo_url?: string | null;
    flag_url?: string | null;
  }[] => {
    return results.map(
      (result: {
        id?: unknown;
        value?: unknown;
        label?: unknown;
        nom?: unknown;
        name?: unknown;
        titre?: string | null;
        abreviation?: string | null;
        name_fr?: string | null;
        name_en?: string | null;
        logo_url?: string | null;
        country?: { flag_url?: string; name?: string } | null;
      }) => ({
        id: (result.id || result.value || "") as string | number,
        label: String(isEcole ? (result.abreviation || result.titre || result.name || "") : (result.name_fr || result.name_en || result.label || result.nom || result.name || "")),
        logo_url: result.logo_url,
        flag_url: isVille ? result.country?.flag_url : undefined,
      }),
    );
  }, [results, isVille, isEcole]);

  const handleSearch = useCallback(
    (term: string) => {
      setSearchTerm(term);
      setQuery(term);
      setIsOpen(true);
      setHighlightedIndex(-1);
    },
    [setQuery],
  );

  const handleSelect = useCallback(
    (result: { id: string | number; label: string }) => {
      setSearchTerm(result.label);
      onSelect(result.id, result.label);
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [onSelect],
  );

  const handleClear = useCallback(() => {
    setSearchTerm("");
    onSelect("", "");
    setQuery("");
    setHighlightedIndex(-1);
  }, [onSelect, setQuery]);

  // Keyboard navigation
  const handleKeyDownInternal = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen && normalizedResults.length > 0) {
          setIsOpen(true);
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex((prev) =>
            Math.min(prev + 1, normalizedResults.length - 1),
          );
        }
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter" && highlightedIndex >= 0 && isOpen) {
        e.preventDefault();
        handleSelect(normalizedResults[highlightedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        return;
      }
      onKeyDown?.(e);
    },
    [isOpen, highlightedIndex, normalizedResults, handleSelect, onKeyDown],
  );

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const floating = refs.floating.current;
      const reference = refs.reference.current;
      if (
        floating &&
        !floating.contains(e.target as Node) &&
        reference &&
        !(reference as HTMLElement).contains(e.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, refs]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Delay close to allow click on dropdown items
    setTimeout(() => {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }, 150);
    onBlur?.();
  }, [onBlur]);

  return (
    <div
      ref={refs.setReference}
      className="w-full h-full flex flex-col relative"
      style={{ height: rowHeight }}
    >
      {/* Input de recherche — style identique à RelationSelectCell */}
      <div
        className={`
          flex items-center gap-1 w-full h-full bg-white dark:bg-gray-800 border rounded px-2 py-1 relative z-10000
          ${
            hasError
              ? "border-red-400 dark:border-red-500"
              : isFocused
                ? "border-primary ring-1 ring-primary"
                : "border-gray-200 dark:border-gray-700"
          }
        `}
      >
        <Search className="size-3 text-gray-400 shrink-0" />
        <input
          ref={setRef}
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDownInternal}
          onFocus={() => {
            setIsFocused(true);
            setIsOpen(true);
          }}
          onBlur={handleBlur}
          placeholder={`Chercher ${isEntreprise ? "entreprise" : "ville"}...`}
          className={`
            flex-1 text-[0.8125rem] bg-transparent border-none outline-none
            ${hasError ? "text-red-700 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}
            placeholder:text-gray-400
          `}
          aria-invalid={hasError}
          aria-required={isRequired}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
        />
        {isLoading && (
          <Loader2 className="size-3 text-gray-500 animate-spin shrink-0" />
        )}
        {searchTerm && !isLoading && (
          <button
            onClick={handleClear}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X className="size-3 text-gray-400" />
          </button>
        )}
      </div>

      {/* Dropdown avec résultats — style identique à RelationSelectCell */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={refs.setFloating}
            style={floatingStyles}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute z-9999 min-w-50 max-w-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto mt-1"
            role="listbox"
          >
            {/* Afficher ce que l'utilisateur tape */}
            {searchTerm && (
              <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <span className="text-xs text-gray-500">Recherche:</span>
                <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                  {searchTerm}
                </span>
              </div>
            )}

            {/* Option "No {fieldName}" pour nettoyer */}
            <button
              onClick={() => {
                handleClear();
                setIsOpen(false);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-full text-left px-3 py-2 text-[0.8125rem] hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors border-b border-gray-200 dark:border-gray-700"
            >
              <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center text-xs font-semibold text-red-600 dark:text-red-300 shrink-0">
                ✕
              </div>
              <span className="truncate">
                No {isEntreprise ? "company" : "city"}
              </span>
            </button>

            {/* Résultats */}
            {normalizedResults.length > 0 ? (
              normalizedResults.map((result, index) => (
                <button
                  key={String(result.id)}
                  onClick={() => handleSelect(result)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`
                    w-full text-left px-3 py-2 text-[0.8125rem] flex items-center gap-2 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0
                    ${highlightedIndex === index ? "bg-gray-50 dark:bg-gray-900/30" : "hover:bg-gray-50 dark:hover:bg-gray-700"}
                  `}
                  role="option"
                  aria-selected={searchTerm === result.label}
                >
                  {/* Logo, Flag ou Avatar */}
                  {isEntreprise && result.logo_url ? (
                    <img
                      src={result.logo_url}
                      alt={result.label}
                      className="w-6 h-6 rounded-full object-cover shrink-0 bg-gray-200 dark:bg-gray-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : isVille && result.flag_url ? (
                    <img
                      src={result.flag_url}
                      alt=""
                      className="w-5 h-3.5 rounded-sm object-cover shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300 shrink-0">
                      {result.label?.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                  <span className="truncate">{result.label}</span>
                  {searchTerm === result.label && (
                    <Check className="w-4 h-4 text-green-500 shrink-0 ml-auto" />
                  )}
                </button>
              ))
            ) : searchTerm ? (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                Aucun résultat trouvé
              </div>
            ) : (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                Tape pour chercher...
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// MultiSelectNewRowCell â€” Multi-select dropdown (same design as edit mode)
type MultiSelectNewRowCellProps = {
  options: SelectOption[];
  value: (string | number)[];
  onChange: (vals: (string | number)[]) => void;
  onSearch?: (query: string) => Promise<Array<{ value: string; label: string }>>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: (el: HTMLInputElement | null) => void;
  isRequired?: boolean;
  hasError?: boolean;
  label?: string;
};

const MultiSelectNewRowCell = ({
  options,
  value,
  onChange,
  onSearch,
  onKeyDown,
  inputRef,
  isRequired = false,
  hasError = false,
  label,
}: MultiSelectNewRowCellProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SelectOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const internalRef = useRef<HTMLInputElement>(null);

  // Track selected items as a Map of { id: label } to preserve labels during search
  const [selectedMap, setSelectedMap] = useState<Map<string, string>>(() => {
    const initial = new Map<string, string>();
    if (Array.isArray(value)) {
      value.forEach((v) => {
        const id = String(v);
        const opt = options.find((o) => String(o.value) === id);
        if (id && id !== "undefined") initial.set(id, opt?.label ?? id);
      });
    }
    return initial;
  });

  // Sync selectedMap -> onChange whenever selectedMap changes
  useEffect(() => {
    const ids = Array.from(selectedMap.keys());
    // Only call onChange if the values actually differ
    const currentSet = new Set(value.map(String));
    const newSet = new Set(ids);
    if (currentSet.size !== newSet.size || ![...currentSet].every((v) => newSet.has(v))) {
      onChange(ids);
    }
  }, [selectedMap]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external value changes into selectedMap (e.g. initial load)
  useEffect(() => {
    if (!Array.isArray(value) || value.length === 0) return;
    setSelectedMap((prev) => {
      const next = new Map(prev);
      let changed = false;
      value.forEach((v) => {
        const id = String(v);
        if (!next.has(id)) {
          const opt = options.find((o) => String(o.value) === id);
          next.set(id, opt?.label ?? id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [value, options]);

  // Sync external ref callback with internal ref
  const setRef = useCallback(
    (el: HTMLInputElement | null) => {
      (internalRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      inputRef?.(el);
    },
    [inputRef],
  );

  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    middleware: [offset(4), flip(), shift()],
  });

  // Handle async search
  useEffect(() => {
    if (!onSearch || !searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      setSearching(true);
      onSearch(searchTerm).then((results) => {
        setSearchResults(results.map((r) => ({ value: r.value, label: r.label })));
        setSearching(false);
      });
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, onSearch]);

  // Merge options, search results AND currently selected items
  const displayOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();

    // 1. Add currently selected items first (guaranteed visibility)
    selectedMap.forEach((lbl, val) => {
      map.set(val, { value: val, label: lbl });
    });

    // 2. Add static options
    options.forEach((opt) => map.set(String(opt.value), { value: String(opt.value), label: opt.label }));

    // 3. Add search results
    searchResults.forEach((opt) => map.set(String(opt.value), { value: String(opt.value), label: opt.label }));

    return Array.from(map.values());
  }, [options, searchResults, selectedMap]);

  // Sort: Selected items first, then by label
  const sortedOptions = useMemo(() => {
    return [...displayOptions].sort((a, b) => {
      const aSel = selectedMap.has(a.value) ? 0 : 1;
      const bSel = selectedMap.has(b.value) ? 0 : 1;
      if (aSel !== bSel) return aSel - bSel;
      return a.label.localeCompare(b.label);
    });
  }, [displayOptions, selectedMap]);

  const handleToggle = useCallback((id: string, lbl: string) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, lbl);
      return next;
    });
  }, []);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const floating = refs.floating.current;
      const reference = refs.reference.current;
      if (
        floating &&
        !floating.contains(e.target as Node) &&
        reference &&
        !(reference as HTMLElement).contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, refs]);

  // Reset search when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  const handleKeyDownInternal = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        return;
      }
      if (e.key === "Backspace" && searchTerm === "" && selectedMap.size > 0) {
        e.preventDefault();
        // Remove last selected
        const keys = Array.from(selectedMap.keys());
        const lastKey = keys[keys.length - 1];
        setSelectedMap((prev) => {
          const next = new Map(prev);
          next.delete(lastKey);
          return next;
        });
        return;
      }
      e.stopPropagation();
      onKeyDown?.(e);
    },
    [searchTerm, selectedMap, onKeyDown],
  );

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Hidden input for external ref */}
      <input
        ref={setRef}
        type="text"
        className="absolute opacity-0 w-0 h-0"
        onFocus={() => setIsOpen(true)}
        aria-invalid={hasError}
        aria-required={isRequired}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        readOnly
        tabIndex={-1}
      />

      <div
        ref={refs.setReference}
        className={`flex items-center flex-wrap gap-1 w-full min-h-full px-1.5 py-1 cursor-text overflow-y-auto max-h-30 bg-white dark:bg-gray-800 border ${
          hasError
            ? "border-red-400 dark:border-red-500"
            : isOpen
              ? "border-primary ring-1 ring-primary"
              : "border-gray-200/80 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600"
        } rounded transition-all`}
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => internalRef.current?.parentElement?.querySelector<HTMLInputElement>('input[type="text"]:not([tabindex="-1"])')?.focus(), 10);
        }}
      >
        {/* Badges for selected items inside the input area */}
        {Array.from(selectedMap.entries()).map(([id, lbl]) => (
          <span
            key={id}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 text-[10px] font-medium animate-in fade-in zoom-in duration-200"
          >
            {lbl}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggle(id, lbl);
              }}
              className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <X className="size-2.5" />
            </button>
          </span>
        ))}

        <div className="flex items-center gap-1 flex-1 min-w-15">
          <Search className="size-3 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder={selectedMap.size > 0 ? "" : (label ? `Rechercher ${label}...` : "Rechercher...")}
            className="flex-1 text-[11px] bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 min-w-0"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDownInternal}
            onFocus={() => setIsOpen(true)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className="absolute z-9999 min-w-55 max-w-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200"
          role="listbox"
          aria-multiselectable="true"
        >
          <div className="p-1.5 space-y-0.5">
            {searching ? (
              <div className="px-3 py-6 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Recherche...
              </div>
            ) : sortedOptions.length > 0 ? (
              <>
                {/* If searching, show header if there are selected items */}
                {searchTerm && sortedOptions.some((opt) => selectedMap.has(opt.value)) && (
                  <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Sélectionnés
                  </div>
                )}

                {sortedOptions.map((option) => {
                  const isChecked = selectedMap.has(option.value);
                  // If searching, only show unselected items that match the search
                  // OR show all selected items
                  if (searchTerm && !isChecked && !option.label.toLowerCase().includes(searchTerm.toLowerCase())) {
                    return null;
                  }

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(option.value, option.label);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className={`w-full text-left px-3 py-2 text-[0.8125rem] rounded-md flex items-center gap-2.5 transition-all ${
                        isChecked
                          ? "bg-gray-50/80 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 font-medium"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
                      }`}
                      role="option"
                      aria-selected={isChecked}
                    >
                      <div
                        className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          isChecked
                            ? "bg-gray-500 border-gray-500 shadow-sm"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {isChecked && <Check className="size-3 text-white" strokeWidth={3} />}
                      </div>
                      <span className="truncate flex-1">{option.label}</span>
                    </button>
                  );
                })}
              </>
            ) : searchTerm ? (
              <div className="px-3 py-8 text-center text-xs text-gray-400">Aucun résultat pour &quot;{searchTerm}&quot;</div>
            ) : (
              <div className="px-3 py-8 text-center text-xs text-gray-400">Aucune option disponible</div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 px-2.5 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 sticky bottom-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMap(new Map());
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="px-3 text-[11px] font-medium text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 py-1.5 rounded-md transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Effacer tout
            </button>
            <div className="flex-1" />
            {selectedMap.size > 0 && (
              <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                {selectedMap.size} sélectionné{selectedMap.size > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helpers
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function getStatusColor(color?: string) {
  switch (color) {
    case "green":
      return { bg: "rgba(34, 197, 94, 0.1)", text: "rgb(22, 163, 74)" };
    case "gray":
      return { bg: "rgba(59, 130, 246, 0.1)", text: "rgb(37, 99, 235)" };
    case "orange":
      return { bg: "rgba(249, 115, 22, 0.1)", text: "rgb(234, 88, 12)" };
    case "red":
      return { bg: "rgba(239, 68, 68, 0.1)", text: "rgb(220, 38, 38)" };
    case "purple":
      return { bg: "rgba(147, 51, 234, 0.1)", text: "rgb(124, 58, 237)" };
    default:
      return { bg: "rgba(107, 114, 128, 0.1)", text: "rgb(75, 85, 99)" };
  }
}
