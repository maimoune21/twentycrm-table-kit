/**
 * LocalCreateCandidatPanel — Local empty creation side-panel content.
 *
 * Rendered INSIDE the upstream SidePanelForDesktop slot (via `renderCandidatSidePanel`)
 * so it is mutually exclusive with the other side panels (Ecole, Candidat detail, Command menu).
 *
 * Content-only variant (no animated wrapper). The slide-in / width / border /
 * rounded-lg / bg are provided by SidePanelForDesktop.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

export type LocalCandidatDraft = {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  ville: string;
  ecole: string;
  niveauEtudes: string;
};

const EMPTY_DRAFT: LocalCandidatDraft = {
  prenom: "",
  nom: "",
  email: "",
  telephone: "",
  ville: "",
  ecole: "",
  niveauEtudes: "",
};

type LocalCreateCandidatPanelProps = {
  onClose: () => void;
  onSubmit?: (draft: LocalCandidatDraft) => void;
};

export function LocalCreateCandidatPanel({
  onClose,
  onSubmit,
}: LocalCreateCandidatPanelProps) {
  const [draft, setDraft] = useState<LocalCandidatDraft>(EMPTY_DRAFT);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => firstInputRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const nomComplet = useMemo(
    () => `${draft.prenom} ${draft.nom}`.trim(),
    [draft.prenom, draft.nom],
  );

  const canSubmit = Boolean(
    draft.prenom.trim() || draft.nom.trim() || draft.email.trim(),
  );

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error("Renseignez au moins un nom ou un email");
      return;
    }
    onSubmit?.(draft);
    toast.success(
      `Candidat créé localement${nomComplet ? ` — ${nomComplet}` : ""}`,
    );
    onClose();
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="flex items-center gap-2 px-3 h-[52px] border-b border-gray-200 dark:border-gray-700 shrink-0">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-300">
          <User className="w-3.5 h-3.5" />
        </span>
        <div className="flex flex-col min-w-0">
          <span className="text-[0.8125rem] font-semibold text-gray-800 dark:text-gray-100 truncate">
            {nomComplet || "Nouveau candidat"}
          </span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            Brouillon — non sauvegardé
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="ml-auto flex items-center justify-center w-7 h-7 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </header>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 pt-1">
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  icon,
  type = "text",
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  type?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10.5px] font-medium text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <span className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 focus-within:ring-1 focus-within:ring-gray-400 dark:focus-within:ring-gray-500">
        {icon && (
          <span className="text-gray-400 dark:text-gray-500 shrink-0">
            {icon}
          </span>
        )}
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-[0.8125rem] text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
        />
      </span>
    </label>
  );
}
