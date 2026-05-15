/**
 * SidePanelCreatePage — Create new record form in side panel
 *
 * Mirrors RecordTableNewRow functionality but in a side panel form layout.
 * Uses the same column definitions and onCreateRecord callback from context.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useSetAtom } from "jotai";
import {
  parsePhoneNumber,
  getCountries,
  getCountryCallingCode,
} from "libphonenumber-js";
import "flag-icons/css/flag-icons.min.css";
import {
  AlertCircle,
  Briefcase,
  Users,
  Building2,
  Camera,
  FileText,
  Search,
  X,
  Trash,
  Mail,
  Check,
  Link,
  DollarSign,
  Save,
  Edit2,
  School,
} from "lucide-react";
import { useRecordTableContextOrThrow } from "@/components/twenty-table/contexts";
import { useSidePanelHistory } from "../hooks";
import { sidePanelCreateActionAtom, sidePanelSearchAtom } from "../states";
import type { ColumnDefinition, SelectOption } from "@/components/twenty-table/types";

// Import autocomplete hooks for relations
import useEntreprisesAutocomplete from "@/hooks/useEntreprisesAutocomplete";
import useCitiesAutocomplete from "@/hooks/useCitiesAutocomplete";
import useTypeContratAutocomplete from "@/hooks/useTypeContratAutocomplete";
import useTypeStageAutocomplete from "@/hooks/useTypeStageAutocomplete";
import { useEcoleAutocomplete } from "@/hooks/useEcoleAutocomplete";
import { getAllMetiers, searchMetiersByTitre } from "@/api/metiers";
import { apiGetRecruteurs, apiGetRecruteursByName } from "@/api/recruteurs";
import {
  getAnneeLabels,
  type AnneeLabelCertification,
} from "@/api/certifications";
import {
  useTypeContratOptions,
  useTypeStageOptions,
} from "@/admin/dashboard/users/hooks/useMultiSelectOptions";
import { useNiveauxEtudesOptions } from "@/hooks/useNiveauxEtudes";
import { useSecteurOptions } from "@/admin/dashboard/users/hooks/useSecteurOptions";
import { useUnitTypes } from "@/hooks/useUnitTypes";
import { useStatutsEtablissement } from "@/hooks/useStatutsEtablissement";
import { QuillEditor } from "@/admin/dashboard/components/QuillEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ═══════════════════════════════════════════════════════════════════════════
// Helper — Form context detection
// ═══════════════════════════════════════════════════════════════════════════

interface FormContext {
  type: "offres" | "candidats" | "recruteurs" | "entreprises" | "ecoles" | "campus" | "generic";
  title: string;
  subtitle: string;
  icon: typeof Briefcase;
  bgColor: string;
  iconColor: string;
}

function getFormContext(visibleColumns: ColumnDefinition[]): FormContext {
  const fieldNames = visibleColumns.map((col) => col.fieldName?.toLowerCase());

  // Detect candidats form
  if (
    fieldNames.includes("nomcomplet") ||
    fieldNames.includes("email") ||
    fieldNames.includes("gsm")
  ) {
    return {
      type: "candidats",
      title: "Nouveau candidat",
      subtitle: "Remplissez les informations du candidat",
      icon: Users,
      bgColor: "bg-gray-100 dark:bg-gray-900/30",
      iconColor: "text-gray-600 dark:text-gray-400",
    };
  }

  // Default generic form
  return {
    type: "generic",
    title: "Nouveau record",
    subtitle: "Remplissez les champs ci-dessous",
    icon: Briefcase,
    bgColor: "bg-gray-100 dark:bg-gray-800/30",
    iconColor: "text-gray-600 dark:text-gray-400",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export const SidePanelCreatePage = () => {
  const {
    columns: allColumns,
    visibleColumns,
    onCreateRecord,
  } = useRecordTableContextOrThrow();
  const { goBackFromSidePanel } = useSidePanelHistory();
  const setSearch = useSetAtom(sidePanelSearchAtom);
  const setCreateAction = useSetAtom(sidePanelCreateActionAtom);
  const typeContratOptions = useTypeContratOptions();
  const niveauEtudesOptions = useNiveauxEtudesOptions();
  const typeStageOptions = useTypeStageOptions();
  const { data: unitTypes = [] } = useUnitTypes();
  const { data: statutsEtablissement = [] } = useStatutsEtablissement();
  const { options: secteurOptions, search: searchSecteurs } =
    useSecteurOptions();

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entreprisePhotoFile, setEntreprisePhotoFile] = useState<File | null>(
    null,
  );
  const [entreprisePhotoPreview, setEntreprisePhotoPreview] =
    useState<string>("");
  const [ecolePhotoFile, setEcolePhotoFile] = useState<File | null>(null);
  const [ecolePhotoPreview, setEcolePhotoPreview] = useState<string>("");

  const firstInputRef = useRef<HTMLInputElement>(null);
  const entreprisePhotoInputRef = useRef<HTMLInputElement>(null);
  const entreprisePhotoInputId = "entreprise-create-photo-input";
  const ecolePhotoInputRef = useRef<HTMLInputElement>(null);
  const ecolePhotoInputId = "ecole-create-photo-input";

  // Get form context (title, icon, etc.)
  const formContext = useMemo(
    () => getFormContext(visibleColumns),
    [visibleColumns],
  );

  // Focus first input on mount
  useEffect(() => {
    setTimeout(() => firstInputRef.current?.focus(), 100);
  }, []);

  // Hide search bar in this view
  useEffect(() => {
    setSearch("");
  }, [setSearch]);

  // Expand nomComplet into prénom/nom virtual fields
  const formFields = useMemo(() => {
    const fields: Array<{
      column: ColumnDefinition;
      virtualField?: "prenom" | "nom";
      virtualLabel?: string;
      orderIndex?: number;
    }> = [];
    const excludedFieldNames = new Set(
      formContext.type === "entreprises"
        ? [
            "id",
            "annonceclient",
            "candidatures",
            "nbvue",
            "datepublication",
            "nombreoffres",
            "offres",
            "politiqueteletravail",
            "inscritle",
            "pays",
            "acompleter",
          ]
        : formContext.type === "recruteurs"
          ? [
              "id",
              "loginsource",
              "authmethod",
              "emailbounce",
              "offres",
              "credit",
              "creditcv",
              "creditoffre",
              "dateconnexion",
              "inscritle",
              "createdat",
              "createdby",
            ]
          : formContext.type === "ecoles"
            ? ["id", "candidatecount", "createdat"]
            : [
                "id",
                "annonceclient",
                "candidatures",
                "nbvue",
                "datepublication",
                "dateconnexion",
                "inscritle",
                "loginsource",
                "authmethod",
                "etatphoto",
                "etatcv",
              ],
    );

    // Use formContext to detect form type
    const isOffreForm = formContext.type === "offres";

    if (isOffreForm) {
      // For offres, use a specific field order
      const fieldOrder = [
        "titre",
        "entreprise",
        "ville",
        "statut",
        "typeContrat",
        "typeStage",
        "description",
        "niveauEtudes",
        "typeLieu",
      ];

      // Map visible columns first with order
      const visibleFieldsMap = new Map<string, number>();
      visibleColumns.forEach((col, idx) => {
        if (excludedFieldNames.has(col.fieldName?.toLowerCase() || "")) {
          return;
        }
        const orderIdx = fieldOrder.indexOf(col.fieldName!);
        visibleFieldsMap.set(
          col.fieldName!,
          orderIdx >= 0 ? orderIdx : 999 + idx,
        );
        fields.push({
          column: col,
          orderIndex: visibleFieldsMap.get(col.fieldName)!,
        });
      });

      // Add hidden columns for offres
      const hiddenFieldNames = [
        "description",
        "niveauEtudes",
        "typeLieu",
        "typeStage",
      ];

      hiddenFieldNames.forEach((fieldName, hiddenIdx) => {
        // Skip if already in visible columns
        if (visibleColumns.some((col) => col.fieldName === fieldName)) {
          return;
        }

        // Add hidden column definition
        let hiddenColumn: ColumnDefinition | null = null;
        const orderIndex = fieldOrder.indexOf(fieldName);
        const hiddenPosition = visibleColumns.length + hiddenIdx;
        const hiddenSize = 180;

        if (fieldName === "description") {
          hiddenColumn = {
            id: "description",
            label: "Description",
            fieldName: "description",
            type: "TEXT",
            size: hiddenSize,
            position: hiddenPosition,
            isVisible: false,
          };
        } else if (fieldName === "niveauEtudes") {
          hiddenColumn = {
            id: "niveauEtudes",
            label: "Niveau d'études",
            fieldName: "niveauEtudes",
            type: "SELECT",
            size: hiddenSize,
            position: hiddenPosition,
            isVisible: false,
            options: niveauEtudesOptions,
          };
        } else if (fieldName === "typeLieu") {
          hiddenColumn = {
            id: "typeLieu",
            label: "Lieu de travail",
            fieldName: "typeLieu",
            type: "SELECT",
            size: hiddenSize,
            position: hiddenPosition,
            isVisible: false,
            options: [
              { label: "Sur site", value: "Sur site" },
              { label: "Hybride", value: "Hybride" },
              { label: "À distance", value: "À distance" },
            ],
          };
        } else if (fieldName === "typeStage") {
          hiddenColumn = {
            id: "typeStage",
            label: "Type de stage",
            fieldName: "typeStage",
            type: "RELATION",
            size: hiddenSize,
            position: hiddenPosition,
            isVisible: false,
          };
        }

        if (hiddenColumn) {
          fields.push({ column: hiddenColumn, orderIndex });
        }
      });

      // Sort by orderIndex
      fields.sort((a, b) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999));
    } else {
      // Use ALL columns (not just visible) so fields hidden in the listing
      // still appear in the create form.
      // For entreprises, enforce a specific field order so description is right after nom.
      const isCandidatForm = formContext.type === "candidats";
      const isRecruteurForm = formContext.type === "recruteurs";
      const recruteursFieldOrder = isRecruteurForm
        ? [
            "nomComplet",
            "email",
            "gsm",
            "entreprise",
            "fonction",
            "ville",
            "ecole",
            "etat",
            "premium",
          ]
        : null;
      const candidatsFieldOrder = isCandidatForm
        ? [
            "photoScore",
            "nomComplet",
            "email",
            "gsm",
            "ville",
            "etat",
            "typeContrat",
            "typeContrats",
            "niveauEtudes",
            "nomEcole",
            "ecole",
            "metiers",
            "premium",
            "cv",
          ]
        : null;
      const entreprisesFieldOrder =
        formContext.type === "entreprises"
          ? [
              "nom",
              "ville",
              "recruteurs",
              "description",
              "etat",
              "typeEntreprise",
              "tailleEntreprise",
              "secteursActivite",
              "labelsRH",
              "anneeCreation",
              "annonceclient",
              "partenaire",
              "website",
              "facebook",
              "twitter",
              "linkedin",
              "instagram",
              "chiffreAffaires",
            ]
          : null;
      const ecolesFieldOrder =
        formContext.type === "ecoles"
          ? ["titre", "abreviation", "typeEcole", "typeEtablissement", "partenaire", "ville", "website"]
          : null;
      const campusFieldOrder =
        formContext.type === "campus"
          ? ["name", "campusType", "ecole", "city", "address"]
          : null;

      allColumns.forEach((col) => {
        const fieldNameLower = col.fieldName?.toLowerCase() || "";
        if (excludedFieldNames.has(fieldNameLower)) {
          return;
        }

        const normalizedColumn: typeof col = (() => {
          if (formContext.type !== "ecoles") return col;
          if (
            (col.fieldName === "typeEtablissement" || (col as any).apiFieldName === "type_etablissement") &&
            unitTypes.length > 0
          ) {
            return {
              ...col,
              options: unitTypes
                .filter((unitType) => (unitType as any).category === "ESTABLISHMENT")
                .map((unitType) => ({
                  label: unitType.label,
                  value: String(unitType.id),
                  color: "blue" as const,
                })),
            };
          }
          if (
            (col.fieldName === "typeEcole" || (col as any).apiFieldName === "statut_id") &&
            statutsEtablissement.length > 0
          ) {
            return {
              ...col,
              options: statutsEtablissement.map((s) => ({
                label: (s as any).label,
                value: String((s as any).id),
                color: "blue" as const,
              })),
            };
          }
          return col;
        })();

        if (col.fieldName === "nomComplet" && col.isLabelIdentifier) {
          // Split into nom + prénom
          const nomCompletOrderIndex = candidatsFieldOrder
            ? candidatsFieldOrder.indexOf("nomComplet")
            : 0;
          const nomOrderIndex = nomCompletOrderIndex >= 0 ? nomCompletOrderIndex : 0;
          const prenomOrderIndex = nomCompletOrderIndex >= 0 ? nomCompletOrderIndex + 1 : 1;
          fields.push({
            column: normalizedColumn,
            virtualField: "nom",
            virtualLabel: "Nom",
            orderIndex: nomOrderIndex,
          });
          fields.push({
            column: normalizedColumn,
            virtualField: "prenom",
            virtualLabel: "Prénom",
            orderIndex: prenomOrderIndex,
          });
        } else {
          const candidatOrderIndex = candidatsFieldOrder
            ? candidatsFieldOrder.indexOf(col.fieldName!)
            : -1;
          const recruteurOrderIndex = recruteursFieldOrder
            ? recruteursFieldOrder.indexOf(col.fieldName!)
            : -1;
          const ecoleOrderIndex = ecolesFieldOrder
            ? ecolesFieldOrder.indexOf(col.fieldName!)
            : -1;
          const campusOrderIndex = campusFieldOrder
            ? campusFieldOrder.indexOf(col.fieldName!)
            : -1;
          const orderIndex = candidatOrderIndex >= 0
            ? candidatOrderIndex
            : recruteurOrderIndex >= 0
              ? recruteurOrderIndex
              : ecoleOrderIndex >= 0
                ? ecoleOrderIndex
                : campusOrderIndex >= 0
                  ? campusOrderIndex
                  : entreprisesFieldOrder
                    ? entreprisesFieldOrder.indexOf(col.fieldName!)
                    : -1;
          fields.push({
            column: normalizedColumn,
            orderIndex: orderIndex >= 0 ? orderIndex : 999,
          });
        }
      });

      // Recruteurs: ensure école is available in create form even if not present in table columns
      if (
        isRecruteurForm &&
        !allColumns.some((col) => {
          const field = col.fieldName?.toLowerCase();
          return field === "ecole" || field === "nomecole";
        })
      ) {
        const ecoleOrderIndex = recruteursFieldOrder
          ? recruteursFieldOrder.indexOf("ecole")
          : -1;

        fields.push({
          column: {
            id: "ecole",
            label: "École",
            fieldName: "ecole",
            type: "RELATION",
            size: 180,
            position: allColumns.length + 1,
            isVisible: false,
          },
          orderIndex: ecoleOrderIndex >= 0 ? ecoleOrderIndex : 999,
        });
      }

      if (entreprisesFieldOrder || ecolesFieldOrder || campusFieldOrder || isCandidatForm || isRecruteurForm) {
        fields.sort((a, b) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999));
      }
    }

    return fields;
  }, [visibleColumns, allColumns, formContext, niveauEtudesOptions, unitTypes]);

  const handleFieldChange = useCallback((fieldName: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    setError(null);
  }, []);

  const handleEntreprisePhotoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;

      if (!file) {
        setEntreprisePhotoFile(null);
        setEntreprisePhotoPreview("");
        return;
      }

      if (!file.type.startsWith("image/")) {
        setError("Veuillez sélectionner un fichier image valide");
        setEntreprisePhotoFile(null);
        setEntreprisePhotoPreview("");
        if (entreprisePhotoInputRef.current) {
          entreprisePhotoInputRef.current.value = "";
        }
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("L'image ne doit pas dépasser 5 Mo");
        setEntreprisePhotoFile(null);
        setEntreprisePhotoPreview("");
        if (entreprisePhotoInputRef.current) {
          entreprisePhotoInputRef.current.value = "";
        }
        return;
      }

      setError(null);
      setEntreprisePhotoFile(file);
      setEntreprisePhotoPreview((prev) => {
        if (prev.startsWith("blob:")) {
          URL.revokeObjectURL(prev);
        }
        return URL.createObjectURL(file);
      });
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (entreprisePhotoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(entreprisePhotoPreview);
      }
    };
  }, [entreprisePhotoPreview]);

  const handleEcolePhotoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      if (!file) {
        setEcolePhotoFile(null);
        setEcolePhotoPreview("");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Veuillez sélectionner un fichier image valide");
        setEcolePhotoFile(null);
        setEcolePhotoPreview("");
        if (ecolePhotoInputRef.current) ecolePhotoInputRef.current.value = "";
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("L'image ne doit pas dépasser 5 Mo");
        setEcolePhotoFile(null);
        setEcolePhotoPreview("");
        if (ecolePhotoInputRef.current) ecolePhotoInputRef.current.value = "";
        return;
      }
      setError(null);
      setEcolePhotoFile(file);
      setEcolePhotoPreview((prev) => {
        if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (ecolePhotoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(ecolePhotoPreview);
      }
    };
  }, [ecolePhotoPreview]);

  const isStageTypeContratSelected = useMemo(() => {
    const normalizeValues = (raw: unknown): string[] => {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw.map((v) => String(v).trim()).filter(Boolean);
      return String(raw)
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    };

    const selectedValues = new Set<string>([
      ...normalizeValues(formData.typeContrat),
      ...normalizeValues(formData.typeContrat_id),
    ]);

    return Array.from(selectedValues).some((value) => {
      const matchedOption = typeContratOptions.find(
        (option) => option.value === value || option.label === value,
      );
      const label = (matchedOption?.label || value).toLowerCase();
      return label.includes("stage");
    });
  }, [formData.typeContrat, formData.typeContrat_id, typeContratOptions]);

  const handleSave = useCallback(async () => {
    if (!onCreateRecord) {
      setError("La création n'est pas disponible");
      return;
    }

    if (isStageTypeContratSelected) {
      const currentTypeStageId = String(formData.typeStage_id || "").trim();
      const currentTypeStageLabel = String(formData.typeStage || "").trim();

      if (!currentTypeStageId && !currentTypeStageLabel) {
        setError(
          "Le type de stage est requis lorsque le type de contrat est Stage",
        );
        return;
      }
    }

    const emailValue = String(formData.email || "").trim();
    const isUserCreateCase = formContext.type === "candidats" || !!emailValue;

    setIsSaving(true);
    setError(null);

    try {
      const payloadWithDefaults = isUserCreateCase
        ? {
            ...formData,
            username: String(formData.username || emailValue || "").trim(),
            prenom: String(formData.prenom || ""),
            role_id:
              Number(formData.role_id) > 0 ? Number(formData.role_id) : 3,
            login_source: String(formData.login_source || "admin"),
            auth_method: String(formData.auth_method || "form"),
          }
        : formData;

      const payloadForCreate =
        formContext.type === "entreprises" && entreprisePhotoFile
          ? { ...payloadWithDefaults, entreprisePhotoFile }
          : formContext.type === "ecoles" && ecolePhotoFile
            ? { ...payloadWithDefaults, ecolePhotoFile }
            : payloadWithDefaults;

      const success = await onCreateRecord(payloadForCreate);
      if (success) {
        setFormData({});
        setEntreprisePhotoFile(null);
        setEntreprisePhotoPreview((prev) => {
          if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
          return "";
        });
        if (entreprisePhotoInputRef.current) entreprisePhotoInputRef.current.value = "";
        setEcolePhotoFile(null);
        setEcolePhotoPreview((prev) => {
          if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
          return "";
        });
        if (ecolePhotoInputRef.current) ecolePhotoInputRef.current.value = "";
        goBackFromSidePanel();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de la création";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }, [
    formData,
    onCreateRecord,
    goBackFromSidePanel,
    isStageTypeContratSelected,
    formContext.type,
    entreprisePhotoFile,
    ecolePhotoFile,
  ]);

  const handleCancel = useCallback(() => {
    setFormData({});
    setEntreprisePhotoFile(null);
    setEntreprisePhotoPreview((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return "";
    });
    if (entreprisePhotoInputRef.current) entreprisePhotoInputRef.current.value = "";
    setEcolePhotoFile(null);
    setEcolePhotoPreview((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return "";
    });
    if (ecolePhotoInputRef.current) ecolePhotoInputRef.current.value = "";
    goBackFromSidePanel();
  }, [goBackFromSidePanel]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        handleSave();
      }
    },
    [handleCancel, handleSave],
  );

  useEffect(() => {
    setCreateAction({
      onSave: handleSave,
      isSaving,
    });

    return () => setCreateAction(null);
  }, [handleSave, isSaving, setCreateAction]);

  const renderFormField = (
    field: (typeof formFields)[number],
    index: number,
    options?: { key?: string; isRequired?: boolean; labelOverride?: string },
  ) => (
    <FormField
      key={options?.key || field.virtualField || field.column.fieldName}
      column={field.column}
      virtualField={field.virtualField}
      virtualLabel={options?.labelOverride || field.virtualLabel}
      formType={formContext.type}
      isRequired={
        options?.isRequired ||
        (field.column.fieldName === "typeStage" && isStageTypeContratSelected)
      }
      value={formData[field.virtualField || field.column.fieldName]}
      onChange={(val) => {
        const targetFieldName = field.virtualField || field.column.fieldName;

        handleFieldChange(targetFieldName, val);

        if (targetFieldName === "gsm") {
          handleFieldChange("num_tel", String(val || "").trim());
        }

        if (targetFieldName === "typeContrat") {
          const selectedValues = Array.isArray(val)
            ? val.map((item) => String(item))
            : [String(val || "")].filter(Boolean);

          const hasStageSelected = selectedValues.some((selectedValue) => {
            const matchedOption = typeContratOptions.find(
              (option) =>
                option.value === selectedValue || option.label === selectedValue,
            );
            return (matchedOption?.label || selectedValue)
              .toLowerCase()
              .includes("stage");
          });

          if (!hasStageSelected) {
            handleFieldChange("typeStage", "");
            handleFieldChange("typeStage_id", "");
          }
        }
      }}
      onRelationSelect={(id, label) => {
        const fieldName = field.column.fieldName;
        // Map field names to their ID field names appropriately
        let idFieldName = "id";
        if (fieldName === "ville") {
          idFieldName = "city_id";
        } else if (fieldName === "city") {
          idFieldName = "city_id";
        } else if (fieldName === "nomEcole" || fieldName === "ecole") {
          idFieldName = "ecole_id";
        } else if (fieldName.toLowerCase().includes("contrat")) {
          idFieldName = "typeContrat_id";
        } else if (fieldName === "typeStage") {
          idFieldName = "typeStage_id";
        } else {
          idFieldName = `${fieldName}_id`;
        }
        handleFieldChange(fieldName, label);
        handleFieldChange(idFieldName, id);

        if (fieldName === "typeContrat" && !label.toLowerCase().includes("stage")) {
          handleFieldChange("typeStage", "");
          handleFieldChange("typeStage_id", "");
        }
      }}
      inputRef={index === 0 ? firstInputRef : undefined}
      typeContratOptions={typeContratOptions}
      niveauEtudesOptions={niveauEtudesOptions}
      typeStageOptions={typeStageOptions}
      secteurOptions={secteurOptions}
      onSecteurSearch={searchSecteurs}
    />
  );

  return (
    <div
      className="flex flex-col h-full bg-white dark:bg-gray-950"
      onKeyDown={handleKeyDown}
    >
      {/* Error message */}
      {error && (
        <div
          className="flex items-center gap-2 px-5 py-2 bg-red-50 dark:bg-red-900/20 
                        border-b border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-[11px] font-medium">{error}</span>
        </div>
      )}

      {/* Form fields */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="flex flex-col gap-3 max-w-2xl">
          {formContext.type === "entreprises" && (
            <label
              htmlFor={entreprisePhotoInputId}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40 p-3 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors block"
            >
              <div className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-2">
                Photo entreprise
              </div>

              <div className="flex items-center gap-3">
                <input
                  id={entreprisePhotoInputId}
                  ref={entreprisePhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleEntreprisePhotoChange}
                />

                <div
                  className="relative group w-8 h-8 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden cursor-pointer"
                >
                  {entreprisePhotoPreview ? (
                    <img
                      src={entreprisePhotoPreview}
                      alt="Prévisualisation"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                      <Building2 className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/40 w-8 h-8 opacity-0 shrink-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-left text-[10px] font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer">
                    {entreprisePhotoFile
                      ? "Modifier la photo"
                      : "Ajouter une photo"}
                  </span>
                  <span className="text-[9px] text-gray-500 dark:text-gray-400">
                    PNG, JPG, WEBP • max 5 Mo
                  </span>
                  {entreprisePhotoFile && (
                    <span className="text-[9px] text-gray-600 dark:text-gray-300 truncate">
                      {entreprisePhotoFile.name}
                    </span>
                  )}
                </div>
              </div>
            </label>
          )}

          {formContext.type === "ecoles" && (
            <label
              htmlFor={ecolePhotoInputId}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40 p-3 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors block"
            >
              <div className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-2">
                Logo école
              </div>

              <div className="flex items-center gap-3">
                <input
                  id={ecolePhotoInputId}
                  ref={ecolePhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleEcolePhotoChange}
                />

                <div className="relative group w-8 h-8 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden cursor-pointer">
                  {ecolePhotoPreview ? (
                    <img
                      src={ecolePhotoPreview}
                      alt="Prévisualisation"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                      <School className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/40 w-8 h-8 opacity-0 shrink-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-left text-[10px] font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer">
                    {ecolePhotoFile ? "Modifier le logo" : "Ajouter un logo"}
                  </span>
                  <span className="text-[9px] text-gray-500 dark:text-gray-400">
                    PNG, JPG, WEBP • max 5 Mo
                  </span>
                  {ecolePhotoFile && (
                    <span className="text-[9px] text-gray-600 dark:text-gray-300 truncate">
                      {ecolePhotoFile.name}
                    </span>
                  )}
                </div>
              </div>
            </label>
          )}

          {(() => {
            const rows: React.ReactNode[] = [];

            for (let index = 0; index < formFields.length; index += 1) {
              const field = formFields[index];

              if (field.column.fieldName === "typeContrat") {
                const typeStageField = formFields.find(
                  (f) => f.column.fieldName === "typeStage",
                );

                if (typeStageField) {
                  rows.push(
                    <div
                      key="type-contrat-stage-row"
                      className="grid grid-cols-1 gap-3"
                    >
                      {renderFormField(field, index, {
                        key: "type-contrat-inline",
                        labelOverride: "Type(s) de contrat",
                      })}
                      {isStageTypeContratSelected
                        ? renderFormField(typeStageField, index, {
                            key: "type-stage-inline",
                            isRequired: true,
                            labelOverride: "Type(s) de stage",
                          })
                        : null}
                    </div>,
                  );
                  continue;
                }
              }

              // Hide standalone typeStage when not stage contract or when rendered inline
              if (field.column.fieldName === "typeStage") {
                if (!isStageTypeContratSelected) {
                  continue;
                }

                const hasTypeContrat = formFields.some(
                  (f) => f.column.fieldName === "typeContrat",
                );
                if (hasTypeContrat) {
                  continue;
                }
              }

              rows.push(renderFormField(field, index));
            }

            return rows;
          })()}
        </div>
      </div>

      {/* Bottom actions footer */}
      <div className="flex items-center justify-end gap-2.5 px-5 py-1.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <button
          type="button"
          onClick={handleCancel}
          className="px-3 py-1.5 text-[11px] font-medium rounded-md cursor-pointer
                     text-gray-600 dark:text-gray-300
                     bg-white dark:bg-gray-800
                     border border-gray-300 dark:border-gray-600
                     hover:bg-gray-100 dark:hover:bg-gray-700
                     transition-colors duration-150"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md cursor-pointer
                     text-white bg-gray-600 hover:bg-gray-700
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors duration-150"
                     style={{ background: "linear-gradient(138deg,#1d3053 0%,#2a4a6b 50%,#1d3053 100%)" }}
        >
          <Save className="size-3" />
          {isSaving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// FormField — Individual field renderer
// ═══════════════════════════════════════════════════════════════════════════

type FormFieldProps = {
  column: ColumnDefinition;
  virtualField?: "prenom" | "nom";
  virtualLabel?: string;
  formType?: "offres" | "candidats" | "recruteurs" | "entreprises" | "ecoles" | "campus" | "generic";
  isRequired?: boolean;
  value: unknown;
  onChange: (value: unknown) => void;
  onRelationSelect?: (id: string, label: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  typeContratOptions?: Array<{ label: string; value: string }>;
  niveauEtudesOptions?: Array<{ label: string; value: string; color?: string }>;
  typeStageOptions?: Array<{ label: string; value: string }>;
  secteurOptions?: SelectOption[];
  onSecteurSearch?: (
    query: string,
  ) => Promise<Array<{ value: string; label: string }>>;
};

const FormField = ({
  column,
  virtualField,
  virtualLabel,
  formType,
  isRequired,
  value,
  onChange,
  onRelationSelect,
  inputRef,
  typeContratOptions,
  niveauEtudesOptions,
  typeStageOptions,
  secteurOptions,
  onSecteurSearch,
}: FormFieldProps) => {
  const label = virtualLabel || column.label;
  const fieldName = virtualField || column.fieldName;
  const isPartenaireField =
    formType === "entreprises" &&
    column.fieldName?.toLowerCase() === "partenaire";
  const isPremiumField =
    (formType === "candidats" || formType === "recruteurs") &&
    column.fieldName?.toLowerCase() === "premium";
  const isPhotoScoreField =
    formType === "candidats" &&
    column.fieldName?.toLowerCase() === "photoscore";
  const isCvField =
    formType === "candidats" &&
    column.fieldName?.toLowerCase() === "cv";

  return (
    <div className="flex flex-col gap-0.5">
      {!isPartenaireField &&
        !isPremiumField &&
        !isPhotoScoreField &&
        !isCvField && (
        <label
          htmlFor={fieldName}
          className="text-[11.5px] font-medium text-gray-600 dark:text-gray-400"
        >
          {label}
          {isRequired && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <FieldInput
        column={column}
        virtualField={virtualField}
        formType={formType}
        value={value}
        onChange={onChange}
        onRelationSelect={onRelationSelect}
        inputRef={inputRef}
        typeContratOptions={typeContratOptions}
        niveauEtudesOptions={niveauEtudesOptions}
        typeStageOptions={typeStageOptions}
        secteurOptions={secteurOptions}
        onSecteurSearch={onSecteurSearch}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// FieldInput — Renders appropriate input based on column type
// ═══════════════════════════════════════════════════════════════════════════

type FieldInputProps = {
  column: ColumnDefinition;
  virtualField?: "prenom" | "nom";
  formType?: "offres" | "candidats" | "recruteurs" | "entreprises" | "ecoles" | "campus" | "generic";
  value: unknown;
  onChange: (value: unknown) => void;
  onRelationSelect?: (id: string, label: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  typeContratOptions?: Array<{ label: string; value: string }>;
  niveauEtudesOptions?: Array<{ label: string; value: string; color?: string }>;
  typeStageOptions?: Array<{ label: string; value: string }>;
  secteurOptions?: SelectOption[];
  onSecteurSearch?: (
    query: string,
  ) => Promise<Array<{ value: string; label: string }>>;
};

const FieldInput = ({
  column,
  virtualField,
  formType,
  value,
  onChange,
  onRelationSelect,
  inputRef,
  typeContratOptions,
  niveauEtudesOptions,
  typeStageOptions,
  secteurOptions,
  onSecteurSearch,
}: FieldInputProps) => {
  // For virtual fields (prénom/nom), render simple text input
  if (virtualField) {
    return (
      <TextInput
        value={String(value || "")}
        onChange={onChange}
        placeholder={virtualField === "prenom" ? "Prénom" : "Nom"}
        inputRef={inputRef}
      />
    );
  }

  // Special handling for nom field in entreprises form — plain text with icon
  if (formType === "entreprises" && column.fieldName?.toLowerCase() === "nom") {
    return (
      <div className="relative flex items-center">
        <svg
          className="absolute left-2.5 size-3 text-gray-400 dark:text-gray-500 shrink-0 pointer-events-none"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3 3h10M8 3v10M5 13h6" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={String(value || "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={column.label}
          className={inputBaseClasses + " pl-8"}
        />
      </div>
    );
  }

  // Special handling for premium field in candidats & recruteurs form — use toggle
  if (
    (formType === "candidats" || formType === "recruteurs") &&
    column.fieldName?.toLowerCase() === "premium"
  ) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-medium text-gray-600 dark:text-gray-400">
          Premium
        </span>
        <button
          type="button"
          onClick={() => onChange(!(value as boolean))}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-gray-300 dark:border-gray-600 transition-colors duration-200 focus:outline-none ${
            value
              ? "bg-gray-500 dark:bg-gray-800"
              : "bg-gray-300 dark:bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-800 shadow transition-transform duration-200 ${
              value ? "translate-x-4.5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    );
  }

  // Special handling for photoScore field in candidats form — compact photo picker UI
  if (
    formType === "candidats" &&
    column.fieldName?.toLowerCase() === "photoscore"
  ) {
    return <CandidatePhotoInput value={value} onChange={onChange} />;
  }

  // Special handling for cv field in candidats form — compact file upload UI
  if (formType === "candidats" && column.fieldName?.toLowerCase() === "cv") {
    return <CandidateCvInput value={value} onChange={onChange} />;
  }

  // Special handling for partenaire field in entreprises form — use toggle
  if (
    formType === "entreprises" &&
    column.fieldName?.toLowerCase() === "partenaire"
  ) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-medium text-gray-600 dark:text-gray-400">
          Partenaire
        </span>
        <button
          type="button"
          onClick={() => onChange(!(value as boolean))}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-gray-300 dark:border-gray-600 transition-colors duration-200 focus:outline-none ${
            value
              ? "bg-gray-500 dark:bg-gray-800"
              : "bg-gray-300 dark:bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-800 shadow transition-transform duration-200 ${
              value ? "translate-x-4.5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    );
  }

  // Special handling for recruteurs field in entreprises form
  if (
    formType === "entreprises" &&
    column.fieldName?.toLowerCase() === "recruteurs"
  ) {
    return (
      <RecruteursSelect
        value={value as string[] | number[] | string | number | undefined}
        onChange={onChange}
      />
    );
  }

  // Special handling for labelsRH field in entreprises form
  if (
    formType === "entreprises" &&
    column.fieldName?.toLowerCase() === "labelsrh"
  ) {
    return (
      <LabelsRHMultiSelect
        value={value as number[] | undefined}
        onChange={onChange}
      />
    );
  }

  // Special handling for description fields — use QuillEditor
  if (column.fieldName?.toLowerCase() === "description") {
    return (
      <QuillEditor
        value={String(value || "")}
        onChange={(newValue) => onChange(newValue)}
        placeholder="Entrez la description…"
      />
    );
  }

  // Special handling for typeContrat field — use select dropdown
  if (column.fieldName?.toLowerCase().includes("contrat")) {
    if (formType === "candidats") {
      const selectedValues = Array.isArray(value)
        ? (value as Array<string | number>).map((v) => String(v))
        : value
          ? [String(value)]
          : [];

      return (
        <TypeContratMultiSelect
          value={selectedValues}
          options={typeContratOptions || []}
          onChange={(vals) => onChange(vals)}
        />
      );
    }

    const selectOptions = (typeContratOptions || []).map((opt) => ({
      value: opt.value,
      label: opt.label,
    }));
    const currentValue = String(value || "");
    const matchedOption = (typeContratOptions || []).find(
      (opt) => opt.value === currentValue || opt.label === currentValue,
    );
    const normalizedSelectValue = matchedOption?.value ?? currentValue;

    return (
      <CustomSelectInput
        options={selectOptions}
        value={normalizedSelectValue}
        onChange={(val) => {
          onChange(val);
          // Also trigger onRelationSelect to set the ID field
          const opt = typeContratOptions?.find((o) => o.value === val);
          if (opt && onRelationSelect) {
            onRelationSelect(val, opt.label);
          }
        }}
      />
    );
  }

  // Special handling for statut field — use shadcn custom select
  if (column.fieldName?.toLowerCase() === "statut") {
    return (
      <CustomSelectInput
        options={column.options || []}
        value={String(value || "")}
        onChange={(val) => onChange(val)}
      />
    );
  }

  // Special handling for niveauEtudes — always use dynamic options from /niveaux-etudes
  if (column.fieldName?.toLowerCase() === "niveauetudes") {
    return (
      <CustomSelectInput
        options={niveauEtudesOptions || column.options || []}
        value={String(value || "")}
        onChange={(val) => onChange(val)}
      />
    );
  }

  // Special handling for typeLieu
  if (column.fieldName?.toLowerCase() === "typelieu") {
    return (
      <CustomSelectInput
        options={column.options || []}
        value={String(value || "")}
        onChange={(val) => onChange(val)}
      />
    );
  }

  if (column.fieldName?.toLowerCase() === "typestage") {
    const currentValue = String(value || "");
    const matchedOption = (typeStageOptions || []).find(
      (option) =>
        option.value === currentValue || option.label === currentValue,
    );
    const normalizedSelectValue = matchedOption?.value ?? currentValue;

    return (
      <CustomSelectInput
        options={typeStageOptions || []}
        value={normalizedSelectValue}
        onChange={(val) => {
          onChange(val);
          const option = typeStageOptions?.find((item) => item.value === val);
          if (option && onRelationSelect) {
            onRelationSelect(val, option.label);
          }
        }}
      />
    );
  }

  if (column.fieldName?.toLowerCase() === "ville" || column.fieldName?.toLowerCase() === "city") {
    return (
      <VilleSelectInput
        value={String(value || "")}
        onSelect={(id: string, label: string) => {
          onChange(id ? { id: Number(id), label } : null);
          if (onRelationSelect) {
            onRelationSelect(id, label);
          }
        }}
      />
    );
  }

  if (
    column.fieldName?.toLowerCase() === "nomecole" ||
    column.fieldName?.toLowerCase() === "ecole"
  ) {
    return (
      <EcoleSelectInput
        value={String(value || "")}
        onSelect={(id: string, label: string) => {
          onChange(id ? { id: Number(id), label } : null);
          if (onRelationSelect) {
            onRelationSelect(id, label);
          }
        }}
      />
    );
  }

  if (column.fieldName?.toLowerCase() === "entreprise") {
    return (
      <EntrepriseSelectInput
        value={String(value || "")}
        onSelect={(id: string, label: string) => {
          onChange(id ? { id: Number(id), label } : null);
          if (onRelationSelect) {
            onRelationSelect(id, label);
          }
        }}
      />
    );
  }

  if (column.fieldName?.toLowerCase() === "metiers") {
    return (
      <MetiersSelectInput
        value={Array.isArray(value) ? (value as Array<string | number>) : []}
        onChange={onChange}
      />
    );
  }

  if (column.fieldName?.toLowerCase() === "secteursactivite") {
    return (
      <SecteursActiviteSelect
        value={Array.isArray(value) ? (value as Array<string | number>) : []}
        options={secteurOptions || []}
        onSearch={onSecteurSearch}
        onChange={onChange}
      />
    );
  }

  if (column.fieldName?.toLowerCase() === "chiffreaffaires") {
    return (
      <div className="relative flex items-center">
        <DollarSign className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={String(value || "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={column.label}
          className={inputBaseClasses + " pl-8"}
        />
      </div>
    );
  }

  // ENTERPRISE_LOGO with isLabelIdentifier = text input (typing the name, e.g. école titre)
  if (column.type === "ENTERPRISE_LOGO" && column.isLabelIdentifier) {
    return (
      <TextInput
        value={String(value || "")}
        onChange={onChange}
        placeholder={column.label}
        inputRef={inputRef}
      />
    );
  }

  switch (column.type) {
    case "RELATION":
    case "ENTERPRISE_LOGO":
      return (
        <RelationInput
          fieldName={column.fieldName}
          value={String(value || "")}
          onSelect={onRelationSelect}
        />
      );

    case "SELECT":
      return (
        <CustomSelectInput
          options={column.options || []}
          value={String(value || "")}
          onChange={(val) => onChange(val)}
        />
      );

    case "BOOLEAN":
      return (
        <BooleanInput
          value={value as boolean | undefined}
          onChange={(val) => onChange(val)}
        />
      );

    case "DATE":
      return (
        <DateInput
          value={String(value || "")}
          onChange={onChange}
          inputRef={inputRef}
        />
      );

    case "EMAIL":
      return (
        <TextInput
          value={String(value || "")}
          onChange={onChange}
          placeholder="email@example.com"
          type="email"
          inputRef={inputRef}
        />
      );

    case "PHONE":
      return (
        <PhoneInput
          value={String(value || "")}
          onChange={onChange}
          inputRef={inputRef}
          formType={formType}
        />
      );

    case "NUMBER":
    case "CURRENCY":
      return (
        <TextInput
          value={String(value || "")}
          onChange={onChange}
          placeholder="0"
          type="number"
          inputRef={inputRef}
        />
      );

    case "URL":
      return (
        <UrlInput
          value={String(value || "")}
          onChange={onChange}
          placeholder={column.label}
          inputRef={inputRef}
        />
      );

    case "TEXT":
    default:
      return (
        <TextInput
          value={String(value || "")}
          onChange={onChange}
          placeholder={column.label}
          inputRef={inputRef}
        />
      );
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Input Components
// ═══════════════════════════════════════════════════════════════════════════

const inputBaseClasses = `
  w-full px-3 py-1.5 text-[11.5px] font-normal
  bg-white dark:bg-gray-800
  border border-gray-300 dark:border-gray-600
  rounded-md
  text-gray-900 dark:text-gray-100
  placeholder:text-gray-400 dark:placeholder:text-gray-500
  focus:outline-none focus:ring-0 focus:border-gray-500
  dark:focus:ring-gray-500 dark:focus:border-gray-500
  transition-all duration-150
  disabled:bg-gray-50 dark:disabled:bg-gray-800/50 disabled:text-gray-400 disabled:cursor-not-allowed
`;

// Text Input
const TextInput = ({
  value,
  onChange,
  placeholder,
  type = "text",
  inputRef,
}: {
  value: string;
  onChange: (value: unknown) => void;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "number";
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) => (
  <input
    ref={inputRef}
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={inputBaseClasses}
  />
);

const parseCreatePhoneValue = (value: string) => {
  if (!value) {
    return { countryCode: "MA", callingCode: "212", national: "" };
  }

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
};

const PhoneInput = ({
  value,
  onChange,
  inputRef,
  formType,
}: {
  value: string;
  onChange: (value: unknown) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  formType?: "offres" | "candidats" | "recruteurs" | "entreprises" | "ecoles" | "campus" | "generic";
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialParsed = useMemo(() => parseCreatePhoneValue(value), [value]);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(!value);
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
    // Keep typing stable: while editing, do not re-parse value coming from parent
    // on every keystroke (it causes cursor jumps / unstable UX).
    if (isEditing) return;

    setCountryCode(initialParsed.countryCode);
    setCallingCode(initialParsed.callingCode);
    setNationalNumber(initialParsed.national);
    setIsEditing(!value);
  }, [initialParsed, isEditing, value]);

  useEffect(() => {
    if (!countryPickerOpen) return;

    const handler = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setCountryPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [countryPickerOpen]);

  const fullNumber = nationalNumber
    ? `+${callingCode}${nationalNumber.replace(/\s/g, "")}`
    : "";
  const hasChanges =
    fullNumber !== value ||
    countryCode !== initialParsed.countryCode ||
    nationalNumber !== initialParsed.national;

  const handleConfirm = useCallback(() => {
    onChange(fullNumber);
    setCountryPickerOpen(false);
    setIsEditing(false);
  }, [fullNumber, onChange]);

  const handleReset = useCallback(() => {
    setCountryCode(initialParsed.countryCode);
    setCallingCode(initialParsed.callingCode);
    setNationalNumber(initialParsed.national);
    setCountryPickerOpen(false);
    setIsEditing(false);
  }, [initialParsed]);

  const handleCountrySelect = useCallback(
    (cc: string) => {
      setCountryCode(cc);
      const country = countries.find((item) => item.countryCode === cc);
      if (country) {
        setCallingCode(country.callingCode);
        const liveNumber = nationalNumber
          ? `+${country.callingCode}${nationalNumber.replace(/\s/g, "")}`
          : "";
        onChange(liveNumber);
      }
      setCountryPickerOpen(false);
      setTimeout(() => inputRef?.current?.focus(), 30);
    },
    [countries, inputRef, nationalNumber, onChange],
  );

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      <div
        className="flex items-center rounded-md border h-8 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 transition-all duration-200"
      >
        <button
          type="button"
          disabled={!isEditing}
          onClick={() => setCountryPickerOpen((prev) => !prev)}
          className={`flex items-center gap-0.5 pl-2 pr-1 h-full border-r border-gray-200 dark:border-gray-700 ${
            countryPickerOpen
              ? "bg-gray-100 dark:bg-gray-800"
              : "hover:bg-gray-50 dark:hover:bg-gray-800"
          } transition-colors shrink-0 bg-transparent border-y-0 border-l-0 rounded-l-md disabled:opacity-60 disabled:cursor-default`}
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

        <span
          className={`w-8 ml-1 h-full flex items-center justify-center text-[12px] leading-none text-gray-600 dark:text-gray-400 font-medium shrink-0 select-none ${
            formType === "recruteurs" ? "" : "mt-0.5"
          }`}
        >
          +{callingCode}
        </span>
        <input
          ref={inputRef}
          type="tel"
          value={nationalNumber}
          readOnly={!isEditing}
          onFocus={() => {
            if (!isEditing) setIsEditing(true);
          }}
          onClick={() => {
            if (!isEditing) setIsEditing(true);
          }}
          onChange={(e) => {
            if (!isEditing) return;
            const nextNational = e.target.value;
            setNationalNumber(nextNational);
            const liveNumber = nextNational
              ? `+${callingCode}${nextNational.replace(/\s/g, "")}`
              : "";
            onChange(liveNumber);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleConfirm();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              handleReset();
            }
          }}
          placeholder="6 12 34 56 78"
          className="flex-1 h-full bg-transparent border-none outline-none text-[12px] leading-none px-1.5 pl-0.5! placeholder-gray-400 text-gray-600 dark:text-gray-100 font-medium min-w-0"
        />

        <div className="flex items-center gap-0.5 pr-1.5 shrink-0">
          {isEditing ? (
            <>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleConfirm}
                className="p-1 text-gray-400 hover:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500/20 rounded transition-colors bg-transparent border-none cursor-pointer"
                disabled={!hasChanges}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleReset}
                className="p-1 text-gray-400 hover:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded transition-colors bg-transparent border-none cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setIsEditing(true);
                setTimeout(() => inputRef?.current?.focus(), 30);
              }}
              className="p-1 text-gray-400 hover:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded transition-colors bg-transparent border-none cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {countryPickerOpen && (
        <PhoneCountryPicker
          countries={countries}
          selectedCode={countryCode}
          onSelect={handleCountrySelect}
          onClose={() => setCountryPickerOpen(false)}
        />
      )}

    </div>
  );
};

const TypeContratMultiSelect = ({
  value,
  options,
  onChange,
}: {
  value: string[];
  options: Array<{ label: string; value: string }>;
  onChange: (value: string[]) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedMap, setSelectedMap] = useState<Map<string, string>>(() => {
    const next = new Map<string, string>();
    value.forEach((id) => {
      const found = options.find((opt) => String(opt.value) === String(id));
      if (id) next.set(String(id), found?.label ?? String(id));
    });
    return next;
  });

  useEffect(() => {
    setSelectedMap((prev) => {
      const next = new Map<string, string>();
      value.forEach((id) => {
        const found = options.find((opt) => String(opt.value) === String(id));
        if (id) next.set(String(id), found?.label ?? prev.get(String(id)) ?? String(id));
      });
      return next;
    });
  }, [value, options]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentLabel = useMemo(() => {
    const labels = Array.from(selectedMap.values());
    if (labels.length === 0) return "";
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return labels.join(", ");
    return `${labels.length} sélectionnés`;
  }, [selectedMap]);

  const visibleOptions = useMemo(
    () =>
      options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [options, searchTerm],
  );

  const toggle = useCallback(
    (id: string, label: string) => {
      setSelectedMap((prev) => {
        const next = new Map(prev);
        if (next.has(id)) next.delete(id);
        else next.set(id, label);
        onChange(Array.from(next.keys()));
        return next;
      });
    },
    [onChange],
  );

  const clear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedMap(new Map());
      setSearchTerm("");
      setIsOpen(false);
      onChange([]);
    },
    [onChange],
  );

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center gap-1.5 w-full min-h-[34px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 cursor-pointer"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Search className="size-3.5 text-gray-400 shrink-0" />
        <span className="flex-1 text-[11.5px] text-gray-900 dark:text-gray-100 truncate">
          {currentLabel || "Sélectionner"}
        </span>
        {currentLabel && (
          <button
            type="button"
            onClick={clear}
            className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="size-3 text-gray-400" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-xl max-h-72 overflow-hidden">
          <div className="p-1.5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1.5 w-full bg-white dark:bg-gray-800 border border-gray-100 rounded-lg px-2.5 py-1">
              <Search className="size-3.5 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Chercher type de contrat..."
                className="flex-1 text-[11px] bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-48 p-1.5 space-y-0.5">
            {visibleOptions.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400 text-center">
                Aucun résultat
              </div>
            ) : (
              visibleOptions.map((option) => {
                const id = String(option.value);
                const isChecked = selectedMap.has(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggle(id, option.label)}
                    className={`w-full text-left px-3 py-2 text-[12px] rounded-md flex items-center gap-2.5 transition-all ${
                      isChecked
                        ? "bg-gray-50/80 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 font-medium"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div
                      className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        isChecked
                          ? "bg-gray-500 border-gray-500 shadow-sm"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {isChecked && (
                        <Check className="size-3 text-white" strokeWidth={3} />
                      )}
                    </div>
                    <span className="truncate flex-1">{option.label}</span>
                  </button>
                );
              })
            )}
          </div>

          {selectedMap.size > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-800 p-1.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={clear}
                  className="inline-flex w-full items-center justify-center gap-1.5 cursor-pointer rounded-sm border border-input hover:bg-muted bg-gray-100/70 px-2 py-1.5 text-[11px] font-medium hover:text-gray-600 dark:text-gray-400 shadow-xs transition-colors text-gray-500 dark:hover:text-gray-300"
                >
                  <Trash className="size-3 mb-0.5" />
                  Retirer
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex w-full items-center justify-center gap-1.5 cursor-pointer rounded-sm border border-gray-500 bg-gray-500 px-2 py-1.5 text-[11px] font-medium text-white shadow-xs transition-colors hover:bg-gray-600 hover:border-gray-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

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
    const query = search.toLowerCase().trim();
    if (!query) return countries;

    return countries.filter(
      (country) =>
        country.countryName.toLowerCase().includes(query) ||
        country.callingCode.includes(query) ||
        country.countryCode.toLowerCase().includes(query),
    );
  }, [countries, search]);

  return (
    <div className="absolute z-50 left-0 right-0 top-full mt-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
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
          filtered.map((country) => (
            <button
              key={country.countryCode}
              type="button"
              onClick={() => onSelect(country.countryCode)}
              className={`w-full text-left px-2.5 py-1.5 text-[12px] flex items-center gap-2 transition-colors bg-transparent border-none cursor-pointer ${
                country.countryCode === selectedCode
                  ? "bg-gray-100 dark:bg-gray-800"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <span
                className={`fi fi-${country.countryCode.toLowerCase()} w-4 h-3 rounded-sm shadow-sm`}
              />
              <span className="truncate text-gray-900 dark:text-gray-100">
                {country.countryName}
              </span>
              <span className="ml-auto text-xs text-gray-400 shrink-0">
                +{country.callingCode}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

// URL Input (with Link icon)
const UrlInput = ({
  value,
  onChange,
  placeholder,
  inputRef,
}: {
  value: string;
  onChange: (value: unknown) => void;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) => (
  <div className="relative flex items-center">
    <Link className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none shrink-0" />
    <input
      ref={inputRef}
      type="url"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputBaseClasses + " pl-8"}
    />
  </div>
);

// Date Input
const DateInput = ({
  value,
  onChange,
  inputRef,
}: {
  value: string;
  onChange: (value: unknown) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) => (
  <input
    ref={inputRef}
    type="date"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={inputBaseClasses}
  />
);

// Select Input
const CustomSelectInput = ({
  options,
  value,
  onChange,
  placeholder = "Sélectionner",
  disabled = false,
}: {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) => {
  const EMPTY_OPTION = "__EMPTY__";
  const normalizedOptions = useMemo(
    () =>
      (options || [])
        .map((opt) => ({
          label: String(opt.label ?? ""),
          value: String(opt.value ?? ""),
        }))
        .filter((opt) => opt.value.trim() !== ""),
    [options],
  );

  const selectedValue =
    value && normalizedOptions.some((opt) => opt.value === value)
      ? value
      : EMPTY_OPTION;

  return (
    <Select
      value={selectedValue}
      onValueChange={(val) => onChange(val === EMPTY_OPTION ? "" : val)}
      indicatorVisibility={false}
      disabled={disabled}
    >
      <SelectTrigger
        size="sm"
        className="w-full h-8 cursor-pointer text-[11.5px]! rounded-md! py-0!"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          value={EMPTY_OPTION}
          disabled
          className="text-[11.5px]! ps-8! text-gray-500 dark:text-gray-400
                     before:content-[''] before:absolute before:start-2 before:top-1/2 before:-translate-y-1/2
                     before:h-3.5 before:w-3.5 before:rounded-full before:border before:border-gray-400 dark:before:border-gray-500
                     after:content-[''] after:absolute after:start-3 after:top-1/2 after:-translate-y-1/2
                     after:h-1.5 after:w-1.5 after:rounded-full after:bg-gray-500 dark:after:bg-gray-300"
        >
          Sélectionner
        </SelectItem>
        {normalizedOptions.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className="text-[11.5px]! ps-8!
                       before:content-[''] before:absolute before:start-2 before:top-1/2 before:-translate-y-1/2
                       before:h-3.5 before:w-3.5 before:rounded-full before:border before:border-gray-400 dark:before:border-gray-500
                       data-[state=checked]:after:content-[''] data-[state=checked]:after:absolute data-[state=checked]:after:start-3 data-[state=checked]:after:top-1/2 data-[state=checked]:after:-translate-y-1/2
                       data-[state=checked]:after:h-1.5 data-[state=checked]:after:w-1.5 data-[state=checked]:after:rounded-full
                       data-[state=checked]:after:bg-gray-500 dark:data-[state=checked]:after:bg-gray-300"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// Boolean Input (Checkbox)
const BooleanInput = ({
  value,
  onChange,
}: {
  value: boolean | undefined;
  onChange: (value: boolean) => void;
}) => (
  <label className="flex items-center gap-2.5 cursor-pointer">
    <input
      type="checkbox"
      checked={value || false}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 
                 text-gray-600 focus:ring-gray-500/30 dark:bg-gray-800
                 cursor-pointer"
    />
    <span className="text-[11px] text-gray-700 dark:text-gray-300">
      {value ? "Oui" : "Non"}
    </span>
  </label>
);

const CandidatePhotoInput = ({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
}) => {
  const [photoFile, setPhotoFile] = useState<File | null>(
    value instanceof File ? value : null,
  );
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoInputId = "candidat-create-photo-input";

  const processPhotoFile = useCallback((file: File | null) => {
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview((prev) => {
        if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return "";
      });
      onChange(null);
      return;
    }

    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      if (photoInputRef.current) photoInputRef.current.value = "";
      onChange(null);
      return;
    }

    setPhotoFile(file);
    onChange(file);
    setPhotoPreview((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, [onChange]);

  useEffect(() => {
    if (value instanceof File && value !== photoFile) {
      setPhotoFile(value);
      setPhotoPreview((prev) => {
        if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return URL.createObjectURL(value);
      });
    }
    if (!value && photoFile) {
      setPhotoFile(null);
      setPhotoPreview((prev) => {
        if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return "";
      });
    }
  }, [value, photoFile]);

  const handlePhotoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processPhotoFile(e.target.files?.[0] || null);
    },
    [processPhotoFile],
  );

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  return (
    <label
      htmlFor={photoInputId}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        processPhotoFile(e.dataTransfer.files?.[0] || null);
      }}
      className={`rounded-xl border bg-gray-50/70 dark:bg-gray-900/40 p-3 cursor-pointer transition-colors block ${
        isDragOver
          ? "border-gray-400 dark:border-gray-500"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      }`}
    >
      <div className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-2">
        Photo candidat
      </div>

      <div className="flex items-center gap-3">
        <input
          id={photoInputId}
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />

        <div className="relative group w-8 h-8 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden cursor-pointer">
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="Prévisualisation"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
              <Users className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
          )}

          <div className="absolute inset-0 bg-black/40 w-8 h-8 opacity-0 shrink-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-left text-[10px] font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer">
            {photoFile
              ? "Modifier la photo"
              : "Ajouter une photo"}
          </span>
          <span className="text-[9px] text-gray-500 dark:text-gray-400">
            PNG, JPG, WEBP • max 5 Mo
          </span>
          {photoFile && (
            <span className="text-[9px] text-gray-600 dark:text-gray-300 truncate">
              {photoFile.name}
            </span>
          )}
        </div>
      </div>

    </label>
  );
};

const CandidateCvInput = ({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
}) => {
  const [cvFile, setCvFile] = useState<File | null>(
    value instanceof File ? value : null,
  );
  const [cvPreviewUrl, setCvPreviewUrl] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const cvInputRef = useRef<HTMLInputElement>(null);
  const cvInputId = "candidat-create-cv-input";

  const processCvFile = useCallback(
    (file: File | null) => {
      if (!file) {
        setCvFile(null);
        setCvPreviewUrl((prev) => {
          if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
          return "";
        });
        onChange(null);
        return;
      }

      const allowedMimeTypes = new Set([
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ]);
      const allowedExtensions = [".pdf", ".doc", ".docx"];
      const lowerName = file.name.toLowerCase();
      const hasAllowedExtension = allowedExtensions.some((ext) =>
        lowerName.endsWith(ext),
      );

      if ((!allowedMimeTypes.has(file.type) && !hasAllowedExtension) || file.size > 10 * 1024 * 1024) {
        if (cvInputRef.current) cvInputRef.current.value = "";
        return;
      }

      setCvFile(file);
      onChange(file);

      if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) {
        setCvPreviewUrl((prev) => {
          if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
          return URL.createObjectURL(file);
        });
      } else {
        setCvPreviewUrl((prev) => {
          if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
          return "";
        });
      }
    },
    [onChange],
  );

  const handleCvChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processCvFile(e.target.files?.[0] || null);
    },
    [processCvFile],
  );

  useEffect(() => {
    return () => {
      if (cvPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(cvPreviewUrl);
      }
    };
  }, [cvPreviewUrl]);

  return (
    <label
      htmlFor={cvInputId}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        processCvFile(e.dataTransfer.files?.[0] || null);
      }}
      className={`rounded-xl border bg-gray-50/70 dark:bg-gray-900/40 p-3 cursor-pointer transition-colors block ${
        isDragOver
          ? "border-gray-400 dark:border-gray-500"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      }`}
    >
      <div className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-2">
        CV candidat
      </div>

      <div className="flex items-center gap-3">
        <input
          id={cvInputId}
          ref={cvInputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={handleCvChange}
        />

        <div className="relative group w-8 h-8 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden cursor-pointer">
          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
            <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </div>

          <div className="absolute inset-0 bg-black/40 w-8 h-8 opacity-0 shrink-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-left text-[10px] font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer">
            {cvFile ? "Modifier le CV" : "Déposer un CV"}
          </span>
          <span className="text-[9px] text-gray-500 dark:text-gray-400">
            PDF, DOC, DOCX • max 10 Mo
          </span>
          {cvFile && (
            <span className="text-[9px] text-gray-600 dark:text-gray-300 truncate">
              {cvFile.name}
            </span>
          )}
        </div>
      </div>

      {cvFile && (
        <div className="mt-2">
          {cvPreviewUrl ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
              <div className="px-2.5 py-1.5 border-b border-gray-100 dark:border-gray-800 text-[10px] text-gray-500 dark:text-gray-400 truncate">
                Prévisualisation: {cvFile.name}
              </div>
              <iframe
                src={cvPreviewUrl}
                title="Aperçu du CV"
                className="w-full h-52 bg-white"
              />
            </div>
          ) : (
            <div className="px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/50 flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-gray-700 dark:text-gray-200 truncate font-medium">
                  {cvFile.name}
                </div>
                <div className="text-[9px] text-gray-500 dark:text-gray-400">
                  Aperçu inline indisponible pour ce format
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </label>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// RecruteursSelect — Dropdown with default options + search + clear
// ═══════════════════════════════════════════════════════════════════════════

type RecruteurOption = {
  id: number;
  label: string;
  email: string;
  entrepriseName?: string;
  entrepriseLogoUrl?: string;
};

const RecruteursSelect = ({
  value,
  onChange,
}: {
  value?: string[] | number[] | string | number;
  onChange: (value: unknown) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [options, setOptions] = useState<RecruteurOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<RecruteurOption[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const normalizedValues = useMemo(
    () =>
      Array.isArray(value)
        ? value.map((item) => String(item)).filter(Boolean)
        : value
          ? [String(value)]
          : [],
    [value],
  );

  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      try {
        const trimmedSearchTerm = searchTerm.trim();
        const normalizeRecruteurOption = (r: any): RecruteurOption => {
          const id = Number(r.id || r.recruteur_id || 0);
          const prenom = r.prenom || r.user?.prenom || "";
          const nom = r.nom || r.user?.nom || "";
          const label =
            r.fullName ||
            [prenom, nom].filter(Boolean).join(" ").trim() ||
            r.username ||
            r.user?.username ||
            `Recruteur #${id || "-"}`;
          const email = r.email || r.user?.email || "";
          const entrepriseName =
            r.entreprise_name ||
            r.entreprise_nom ||
            r.entreprise?.nom ||
            r.user?.recruteur?.entreprise_nom ||
            "";
          const entrepriseLogoUrl =
            r.entreprise?.logo_url || r.entreprise_logo_url || r.logo_url || "";

          return {
            id,
            label,
            email,
            entrepriseName,
            entrepriseLogoUrl,
          };
        };

        const items: RecruteurOption[] = trimmedSearchTerm
          ? (await apiGetRecruteursByName(trimmedSearchTerm, 20)).map(
              normalizeRecruteurOption,
            )
          : (
              await apiGetRecruteurs({
                limit: 20,
                offset: 0,
              })
            ).data.map(normalizeRecruteurOption);
        setOptions(
          items.filter((item) => Number.isFinite(item.id) && item.id > 0),
        );
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, searchTerm]);

  useEffect(() => {
    setSelectedOptions((prev) => {
      const prevById = new Map(prev.map((item) => [String(item.id), item]));
      return normalizedValues
        .map(
          (selectedId) =>
            options.find((item) => String(item.id) === selectedId) ||
            prevById.get(selectedId),
        )
        .filter(Boolean) as RecruteurOption[];
    });
  }, [normalizedValues, options]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentLabel = useMemo(() => {
    if (selectedOptions.length === 0) return "";
    if (selectedOptions.length === 1) return selectedOptions[0].label;
    if (selectedOptions.length === 2) {
      return selectedOptions.map((item) => item.label).join(", ");
    }
    return `${selectedOptions.length} sélectionnés`;
  }, [selectedOptions]);

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedOptions([]);
      setSearchTerm("");
      setIsOpen(false);
      onChange([]);
    },
    [onChange],
  );

  const handleToggle = useCallback(
    (option: RecruteurOption) => {
      setSelectedOptions((prev) => {
        const exists = prev.some((item) => item.id === option.id);
        const next = exists
          ? prev.filter((item) => item.id !== option.id)
          : [...prev, option];
        onChange(next.map((item) => String(item.id)));
        return next;
      });
    },
    [onChange],
  );

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center gap-1.5 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 cursor-pointer"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Search className="size-3.5 text-gray-400 shrink-0" />
        <span className="flex-1 text-[11.5px] text-gray-900 dark:text-gray-100 truncate">
          {currentLabel || "Sélectionner des recruteurs"}
        </span>
        {selectedOptions.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="size-3 text-gray-400" />
          </button>
        )}
      </div>

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selectedOptions.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
              title={[
                item.label,
                item.email || undefined,
                item.entrepriseName || undefined,
              ]
                .filter(Boolean)
                .join(" • ")}
            >
              <span className="max-w-[220px] truncate">
                {item.label}
                {item.entrepriseName ? ` • ${item.entrepriseName}` : ""}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle(item);
                }}
                className="hover:text-gray-900 dark:hover:text-white"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-xl max-h-72 overflow-hidden">
          <div className="p-1.5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1.5 w-full bg-white dark:bg-gray-800 border border-gray-100 rounded-lg px-2.5 py-1">
              <Search className="size-3.5 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Chercher un recruteur…"
                className="flex-1 text-[11px] bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

          <div className="overflow-y-auto max-h-48">
            {loading ? (
              <div className="px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400 text-center">
                Chargement…
              </div>
            ) : options.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400 text-center">
                Aucun recruteur trouvé
              </div>
            ) : (
              options.map((option) => {
                const isSelected = selectedOptions.some(
                  (item) => item.id === option.id,
                );
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleToggle(option)}
                    className={`w-full text-left p-2 text-[12px] flex items-center gap-1.5 cursor-pointer transition-all duration-150 rounded-lg ${
                      isSelected
                        ? "bg-gray-50/80 dark:bg-gray-950/40 ring-1 ring-inset ring-gray-200/50 dark:ring-gray-700/40"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    }`}
                  >
                    {option.entrepriseLogoUrl ? (
                      <img
                        src={option.entrepriseLogoUrl}
                        alt=""
                        className="w-7 h-7 rounded-sm object-cover shrink-0 border border-gray-200/80 dark:border-gray-700/60 bg-white"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-sm shrink-0 border border-gray-200/80 dark:border-gray-700/60 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          stroke-linecap="round"
                          strokeLinejoin="round"
                          className="size-3.5 text-gray-400"
                        >
                          <path d="M3 21l18 0"></path>
                          <path d="M5 21v-14l8 -4v18"></path>
                          <path d="M19 21v-10l-6 -4"></path>
                          <path d="M9 9l0 .01"></path>
                          <path d="M9 12l0 .01"></path>
                          <path d="M9 15l0 .01"></path>
                          <path d="M9 18l0 .01"></path>
                        </svg>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {option.label}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Mail className="size-2.5 shrink-0" />
                        <span className="truncate">
                          {option.email || "Email non renseigné"}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          stroke-linecap="round"
                          strokeLinejoin="round"
                          className="size-2.5 mb-0.5 text-gray-400"
                        >
                          <path d="M3 21l18 0"></path>
                          <path d="M5 21v-14l8 -4v18"></path>
                          <path d="M19 21v-10l-6 -4"></path>
                          <path d="M9 9l0 .01"></path>
                          <path d="M9 12l0 .01"></path>
                          <path d="M9 15l0 .01"></path>
                          <path d="M9 18l0 .01"></path>
                        </svg>
                        <span className="truncate">
                          {option.entrepriseName || "Non Défini"}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="size-3.5 text-gray-900 dark:text-gray-100" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {selectedOptions.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-800 p-1.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    handleClear(e);
                    setIsOpen(false);
                  }}
                  className="inline-flex w-full items-center justify-center gap-1.5 cursor-pointer rounded-sm border border-input hover:bg-muted bg-gray-100/70 px-2 py-1.5 text-[11px] font-medium hover:text-gray-600 dark:text-gray-400 shadow-xs transition-colors text-gray-500 dark:hover:text-gray-300"
                >
                  <Trash className="size-3 mb-0.5" />
                  Retirer
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex w-full items-center justify-center gap-1.5 cursor-pointer rounded-sm border border-gray-500 bg-gray-500 px-2 py-1.5 text-[11px] font-medium text-white shadow-xs transition-colors hover:bg-gray-600 hover:border-gray-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// LabelsRHMultiSelect — Multi-select from /api/v1/label-certifications
// LabelsRHMultiSelect — Grouped multi-select from /api/v1/annee-label-certifications
// ═══════════════════════════════════════════════════════════════════════════

type LabelsRHGroupedItem = {
  labelNom: string;
  annees: number[];
  imageUrl?: string;
  labelId?: number;
};

const extractCertificationYear = (titre?: string | null) => {
  const yearMatch = titre?.match(/\b(20\d{2})\b/);
  return yearMatch ? Number.parseInt(yearMatch[1], 10) : null;
};

const LabelsRHMultiSelect = ({
  value,
  onChange,
}: {
  value?: number[];
  onChange: (value: unknown) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [allOptions, setAllOptions] = useState<AnneeLabelCertification[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAnneeIds, setSelectedAnneeIds] = useState<Set<number>>(
    new Set(),
  );
  const [openUp, setOpenUp] = useState(false);
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState(320);
  const containerRef = useRef<HTMLDivElement>(null);
  const normalizedValues = useMemo(
    () => (value || []).map((item) => Number(item)).filter((item) => item > 0),
    [value],
  );

  useEffect(() => {
    setLoading(true);
    getAnneeLabels(1, 500)
      .then((res) => {
        setAllOptions(res.data || []);
      })
      .catch(() => setAllOptions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setSelectedAnneeIds(new Set(normalizedValues));
  }, [normalizedValues]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const updatePosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenUp = spaceBelow < 320 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        180,
        Math.min(320, shouldOpenUp ? spaceAbove - 16 : spaceBelow - 16),
      );

      setOpenUp(shouldOpenUp);
      setDropdownMaxHeight(maxHeight);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  const groupedOptions = useMemo(
    () =>
      allOptions.reduce<Record<string, AnneeLabelCertification[]>>(
        (acc, option) => {
          const groupName = option.label?.nom ?? "Autre";
          if (!acc[groupName]) acc[groupName] = [];
          acc[groupName].push(option);
          return acc;
        },
        {},
      ),
    [allOptions],
  );

  const filteredGrouped = useMemo(() => {
    if (!searchTerm.trim()) return groupedOptions;

    const lowerSearch = searchTerm.toLowerCase();
    return Object.fromEntries(
      Object.entries(groupedOptions)
        .map(([groupName, items]) => [
          groupName,
          items.filter(
            (item) =>
              item.titre?.toLowerCase().includes(lowerSearch) ||
              groupName.toLowerCase().includes(lowerSearch),
          ),
        ])
        .filter(([, items]) => (items as AnneeLabelCertification[]).length > 0),
    );
  }, [groupedOptions, searchTerm]);

  const selectedSummary = useMemo(() => {
    const grouped: Record<string, LabelsRHGroupedItem> = {};

    Array.from(selectedAnneeIds).forEach((selectedId) => {
      const option = allOptions.find((item) => item.id === selectedId);
      if (!option) return;

      const labelNom = option.label?.nom ?? "Autre";
      if (!grouped[labelNom]) {
        grouped[labelNom] = {
          labelNom,
          annees: [],
          imageUrl: option.logo_url,
          labelId: option.label?.id,
        };
      }

      const year = extractCertificationYear(option.titre);
      if (year) grouped[labelNom].annees.push(year);
    });

    return Object.values(grouped)
      .map((item) => ({
        ...item,
        annees: [...new Set(item.annees)].sort((a: number, b: number) => b - a),
      }))
      .sort((a, b) => a.labelNom.localeCompare(b.labelNom));
  }, [allOptions, selectedAnneeIds]);

  const currentLabel = useMemo(() => {
    if (selectedSummary.length === 0) return "";
    if (selectedSummary.length === 1) {
      return selectedSummary[0].annees.length > 0
        ? `${selectedSummary[0].labelNom}: ${selectedSummary[0].annees.join(", ")}`
        : selectedSummary[0].labelNom;
    }
    return `${selectedAnneeIds.size} sélectionnés`;
  }, [selectedSummary, selectedAnneeIds]);

  const toggleOption = useCallback(
    (optionId: number) => {
      setSelectedAnneeIds((prev) => {
        const next = new Set(prev);
        if (next.has(optionId)) next.delete(optionId);
        else next.add(optionId);
        onChange(Array.from(next));
        return next;
      });
    },
    [onChange],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedAnneeIds(new Set());
      setSearchTerm("");
      setIsOpen(false);
      onChange([]);
    },
    [onChange],
  );

  const isChecked = (id: number) => selectedAnneeIds.has(id);

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center gap-1.5 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 cursor-pointer"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Search className="size-3.5 text-gray-400 shrink-0" />
        <span className="flex-1 text-[11.5px] text-gray-900 dark:text-gray-100 truncate">
          {currentLabel || "Sélectionner"}
        </span>
        {currentLabel && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="size-3 text-gray-400" />
          </button>
        )}
      </div>

      {selectedSummary.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selectedSummary.map((item) => (
            <span
              key={item.labelNom}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt=""
                  className="w-3.5 h-3.5 object-contain rounded-sm shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <span className="max-w-[180px] truncate">
                {item.annees.length > 0
                  ? `${item.labelNom}: ${item.annees.join(", ")}`
                  : item.labelNom}
              </span>
            </span>
          ))}
        </div>
      )}

      {isOpen && (
        <div
          className={`absolute z-50 w-full bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-xl overflow-hidden ${
            openUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
          style={{ maxHeight: dropdownMaxHeight }}
        >
          <div className="p-1.5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1.5 w-full bg-white dark:bg-gray-800 border border-gray-100 rounded-lg px-2.5 py-1">
              <Search className="size-3.5 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Chercher label..."
                className="flex-1 text-[11px] bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

          <div
            className="overflow-y-auto"
            style={{ maxHeight: `calc(${dropdownMaxHeight || 320}px - 104px)` }}
          >
            {loading ? (
              <div className="px-3 py-6 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Recherche...
              </div>
            ) : Object.keys(filteredGrouped).length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400 text-center">
                Aucun résultat
              </div>
            ) : (
              (Object.entries(filteredGrouped) as Array<
                [string, AnneeLabelCertification[]]
              >).map(([groupName, items]) => (
                <div key={groupName}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                    {groupName}
                  </div>
                  {items.map((opt) => {
                    const checked = isChecked(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleOption(opt.id)}
                        className={`w-full text-left p-2 text-[12px] flex items-center gap-1.5 cursor-pointer transition-all duration-150 rounded-lg ${
                          checked
                            ? "bg-gray-50/80 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 font-medium"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {opt.logo_url ? (
                          <img
                            src={opt.logo_url}
                            alt=""
                            className="w-5 h-5 object-contain rounded-sm shrink-0 border border-gray-200/80 dark:border-gray-600/50 bg-white"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div
                            className={`w-5 h-5 rounded-sm shrink-0 flex items-center justify-center text-[9px] font-semibold ${
                              checked
                                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                            }`}
                          >
                            {groupName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-gray-900 dark:text-gray-100 font-medium">
                            {opt.titre}
                          </div>
                        </div>
                        {checked && (
                          <Check className="size-3.5 text-gray-900 dark:text-gray-100 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {currentLabel && (
            <div className="border-t border-gray-100 dark:border-gray-800 p-1.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    handleClear(e);
                    setIsOpen(false);
                  }}
                  className="inline-flex w-full items-center justify-center gap-1.5 cursor-pointer rounded-sm border border-input hover:bg-muted bg-gray-100/70 px-2 py-1.5 text-[11px] font-medium hover:text-gray-600 dark:text-gray-400 shadow-xs transition-colors text-gray-500 dark:hover:text-gray-300"
                >
                  <Trash className="size-3 mb-0.5" />
                  Retirer
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex w-full items-center justify-center gap-1.5 cursor-pointer rounded-sm border border-gray-500 bg-gray-500 px-2 py-1.5 text-[11px] font-medium text-white shadow-xs transition-colors hover:bg-gray-600 hover:border-gray-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SecteursActiviteSelect — listing-style multi-select with top search
// ═══════════════════════════════════════════════════════════════════════════

const SecteursActiviteSelect = ({
  value,
  options,
  onSearch,
  onChange,
}: {
  value: Array<string | number>;
  options: SelectOption[];
  onSearch?: (
    query: string,
  ) => Promise<Array<{ value: string; label: string }>>;
  onChange: (value: unknown) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SelectOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState(320);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedMap, setSelectedMap] = useState<Map<string, string>>(() => {
    const initial = new Map<string, string>();
    value.forEach((item) => {
      const id = String(item);
      const found = options.find((opt) => String(opt.value) === id);
      if (id) initial.set(id, found?.label ?? id);
    });
    return initial;
  });

  useEffect(() => {
    setSelectedMap((prev) => {
      const next = new Map<string, string>();
      value.forEach((item) => {
        const id = String(item);
        if (!id) return;
        const found = options.find((opt) => String(opt.value) === id);
        next.set(id, found?.label ?? prev.get(id) ?? id);
      });

      if (next.size !== prev.size) return next;

      for (const [id, label] of next.entries()) {
        if (prev.get(id) !== label) {
          return next;
        }
      }

      return prev;
    });
  }, [value, options]);

  useEffect(() => {
    if (!onSearch || !searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSearching(true);
      onSearch(searchTerm)
        .then((results) => setSearchResults(results))
        .finally(() => setSearching(false));
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm, onSearch]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const updatePosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenUp = spaceBelow < 320 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        180,
        Math.min(320, shouldOpenUp ? spaceAbove - 16 : spaceBelow - 16),
      );

      setOpenUp(shouldOpenUp);
      setDropdownMaxHeight(maxHeight);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  const displayOptions = useMemo(() => {
    const map = new Map<string, SelectOption>();
    selectedMap.forEach((label, id) => map.set(id, { value: id, label }));
    options.forEach((opt) =>
      map.set(String(opt.value), {
        value: String(opt.value),
        label: opt.label,
      }),
    );
    searchResults.forEach((opt) =>
      map.set(String(opt.value), {
        value: String(opt.value),
        label: opt.label,
      }),
    );
    return Array.from(map.values());
  }, [options, searchResults, selectedMap]);

  const sortedOptions = useMemo(() => {
    return [...displayOptions].sort((a, b) => {
      const aSel = selectedMap.has(String(a.value)) ? 0 : 1;
      const bSel = selectedMap.has(String(b.value)) ? 0 : 1;
      if (aSel !== bSel) return aSel - bSel;
      return a.label.localeCompare(b.label);
    });
  }, [displayOptions, selectedMap]);

  const currentLabel = useMemo(() => {
    const labels = Array.from(selectedMap.values());
    if (labels.length === 0) return "";
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return labels.join(", ");
    return `${labels.length} sélectionnés`;
  }, [selectedMap]);

  const handleToggle = useCallback(
    (id: string, label: string) => {
      setSelectedMap((prev) => {
        const next = new Map(prev);
        if (next.has(id)) next.delete(id);
        else next.set(id, label);
        onChange(Array.from(next.keys()));
        return next;
      });
    },
    [onChange],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedMap(new Map());
      setSearchTerm("");
      setIsOpen(false);
      onChange([]);
    },
    [onChange],
  );

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center gap-1.5 w-full min-h-[34px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 cursor-pointer"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Search className="size-3.5 text-gray-400 shrink-0" />
        <span className="flex-1 text-[11.5px] text-gray-900 dark:text-gray-100 truncate">
          {currentLabel || "Sélectionner"}
        </span>
        {currentLabel && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="size-3 text-gray-400" />
          </button>
        )}
      </div>

      {selectedMap.size > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {Array.from(selectedMap.entries()).map(([id, label]) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
            >
              <span className="max-w-[150px] truncate">{label}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle(id, label);
                }}
                className="hover:text-gray-900 dark:hover:text-white"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {isOpen && (
        <div
          className={`absolute z-50 w-full bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-xl overflow-hidden ${
            openUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
          style={{ maxHeight: dropdownMaxHeight }}
        >
          <div className="p-1.5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1.5 w-full bg-white dark:bg-gray-800 border border-gray-100 rounded-lg px-2.5 py-1">
              <Search className="size-3.5 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Chercher secteur..."
                className="flex-1 text-[11px] bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

          <div
            className="overflow-y-auto p-1.5 space-y-0.5"
            style={{ maxHeight: `calc(${dropdownMaxHeight || 320}px - 104px)` }}
          >
            {searching ? (
              <div className="px-3 py-6 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Recherche...
              </div>
            ) : sortedOptions.length > 0 ? (
              sortedOptions.map((option) => {
                const isChecked = selectedMap.has(String(option.value));
                if (
                  searchTerm &&
                  !isChecked &&
                  !option.label.toLowerCase().includes(searchTerm.toLowerCase())
                ) {
                  return null;
                }

                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    onClick={() =>
                      handleToggle(String(option.value), option.label)
                    }
                    className={`w-full text-left px-3 py-2 text-[12px] rounded-md flex items-center gap-2.5 transition-all ${
                      isChecked
                        ? "bg-gray-50/80 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 font-medium"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div
                      className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        isChecked
                          ? "bg-gray-500 border-gray-500 shadow-sm"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {isChecked && (
                        <Check className="size-3 text-white" strokeWidth={3} />
                      )}
                    </div>
                    <span className="truncate flex-1">{option.label}</span>
                  </button>
                );
              })
            ) : searchTerm ? (
              <div className="px-3 py-8 text-center text-xs text-gray-400">
                Aucun résultat pour &quot;{searchTerm}&quot;
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
                  onClick={(e) => {
                    handleClear(e);
                    setIsOpen(false);
                  }}
                  className="inline-flex w-full items-center justify-center gap-1.5 cursor-pointer rounded-sm border border-input hover:bg-muted bg-gray-100/70 px-2 py-1.5 text-[11px] font-medium hover:text-gray-600 dark:text-gray-400 shadow-xs transition-colors text-gray-500 dark:hover:text-gray-300"
                >
                  <Trash className="size-3 mb-0.5" />
                  Retirer
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex w-full items-center justify-center gap-1.5 cursor-pointer rounded-sm border border-gray-500 bg-gray-500 px-2 py-1.5 text-[11px] font-medium text-white shadow-xs transition-colors hover:bg-gray-600 hover:border-gray-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// VilleSelectInput — default cities + search + clear, like listing editor
// ═══════════════════════════════════════════════════════════════════════════

const VilleSelectInput = ({
  value,
  onSelect,
}: {
  value: string;
  onSelect?: (id: string, label: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const citiesHook = useCitiesAutocomplete({
    limit: 20,
    defaultOnEmpty: true,
    defaultLimit: 20,
    defaultPage: 1,
  });

  const normalizedResults = useMemo(
    () =>
      (citiesHook.suggestions || [])
        .map((result: any) => ({
          id: String(result.city_id || result.id || result.value || ""),
          label: String(
            result.name_fr ||
              result.name_en ||
              result.nom ||
              result.label ||
              "",
          ),
          flag_url: result.country?.flag_url,
          country_name: result.country?.name,
        }))
        .filter((c) => c.id), // Filter out cities with empty IDs
    [citiesHook.suggestions],
  );

  // Initialize selectedCity from value prop (when it's an object with id, or from normalized results)
  useEffect(() => {
    if (value) {
      if (typeof value === "string") {
        // Try to find in normalized results
        const found = normalizedResults.find((c) => c.id === value);
        if (found) {
          setSelectedCity(found);
        }
      }
    }
  }, [value, normalizedResults]);

  useEffect(() => {
    if (isOpen) {
      citiesHook.setQuery(searchTerm);
    }
  }, [isOpen, searchTerm, citiesHook]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedCity(null);
      setSearchTerm("");
      citiesHook.setQuery("");
      onSelect?.("", "");
    },
    [citiesHook, onSelect],
  );

  const handleSelect = useCallback(
    (city: { id: string; label: string }) => {
      if (!city.id) return; // Ignore cities with no ID
      setSelectedCity(city);
      setSearchTerm("");
      setIsOpen(false);
      onSelect?.(city.id, city.label);
    },
    [onSelect],
  );

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center gap-1.5 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 cursor-pointer"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Search className="size-3.5 text-gray-400 shrink-0" />
        <span className="flex-1 text-[11.5px] text-gray-900 dark:text-gray-100 truncate">
          {value || "Sélectionner"}
        </span>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="size-3 text-gray-400" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-xl max-h-72 overflow-hidden">
          <div className="p-1.5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1.5 w-full bg-white dark:bg-gray-800 border border-gray-100 rounded-lg px-2.5 py-1">
              <Search className="size-3.5 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Chercher ville..."
                className="flex-1 text-[11px] bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

          <div className="overflow-y-auto max-h-48">
            {citiesHook.loading ? (
              <div className="px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400 text-center">
                Chargement...
              </div>
            ) : normalizedResults.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400 text-center">
                Aucun résultat
              </div>
            ) : (
              normalizedResults.map((city) => {
                const isSelected = selectedCity?.id === city.id;
                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleSelect(city)}
                    className={`w-full text-left p-2 text-[12px] flex items-center gap-1.5 cursor-pointer transition-all duration-150 rounded-lg ${
                      isSelected
                        ? "bg-gray-50/80 dark:bg-gray-950/40 ring-1 ring-inset ring-gray-200/50 dark:ring-gray-700/40"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    }`}
                  >
                    {city.flag_url ? (
                      <img
                        src={city.flag_url}
                        alt={city.country_name || ""}
                        className="w-3.5 h-2.5 rounded object-cover shrink-0 ring-1 ring-gray-200/80 dark:ring-gray-600/50 shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-3.5 h-2.5 rounded bg-gray-200 dark:bg-gray-700 shrink-0" />
                    )}
                    <span className="truncate text-gray-900 dark:text-gray-100">
                      {city.label}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {selectedCity && (
            <div className="border-t border-gray-100 dark:border-gray-800 p-1.5">
              <button
                type="button"
                onClick={(e) => {
                  handleClear(e);
                  setIsOpen(false);
                }}
                className="inline-flex w-full items-center justify-center gap-1.5 cursor-pointer rounded-sm border border-input hover:bg-muted bg-gray-100/70 px-2 py-1.5 text-[11px] font-medium hover:text-gray-600 dark:text-gray-400 shadow-xs transition-colors text-gray-500 dark:hover:text-gray-300"
              >
                <Trash className="size-3 mb-0.5" />
                Retirer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const EcoleSelectInput = ({
  value,
  onSelect,
}: {
  value: string;
  onSelect?: (id: string, label: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEcole, setSelectedEcole] = useState<{
    id: string;
    label: string;
    logo_url?: string;
    type_etablissement?: string;
  } | null>(null);
  const [openUp, setOpenUp] = useState(false);
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState(320);
  const containerRef = useRef<HTMLDivElement>(null);
  const { suggestions, loading, searchEcoles, clearSuggestions } = useEcoleAutocomplete({
    limit: 20,
    minLength: 1,
    defaultOnEmpty: true,
    defaultLimit: 20,
    defaultPage: 1,
  });

  const normalizedResults = useMemo(
    () =>
      (suggestions || [])
        .map((result: any) => ({
          id: String(result.id || ""),
          label: String(result.titre || result.abreviation || result.nom || ""),
          logo_url: result.logo_url || "",
          type_etablissement: result.type_etablissement || result.type_ecole || "",
        }))
        .filter((ecole) => ecole.id),
    [suggestions],
  );

  useEffect(() => {
    if (value) {
      const found = normalizedResults.find((ecole) => ecole.id === value);
      if (found) {
        setSelectedEcole(found);
      }
    }
  }, [value, normalizedResults]);

  useEffect(() => {
    if (isOpen) {
      searchEcoles(searchTerm);
    }
  }, [isOpen, searchTerm, searchEcoles]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const updatePosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenUp = spaceBelow < 320 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        180,
        Math.min(320, shouldOpenUp ? spaceAbove - 16 : spaceBelow - 16),
      );

      setOpenUp(shouldOpenUp);
      setDropdownMaxHeight(maxHeight);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedEcole(null);
      setSearchTerm("");
      clearSuggestions();
      onSelect?.("", "");
    },
    [clearSuggestions, onSelect],
  );

  const handleSelect = useCallback(
    (ecole: {
      id: string;
      label: string;
      logo_url?: string;
      type_etablissement?: string;
    }) => {
      if (!ecole.id) return;
      setSelectedEcole(ecole);
      setSearchTerm("");
      setIsOpen(false);
      onSelect?.(ecole.id, ecole.label);
    },
    [onSelect],
  );

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center gap-1.5 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 cursor-pointer"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Search className="size-3.5 text-gray-400 shrink-0" />
        <span className="flex-1 text-[11.5px] text-gray-900 dark:text-gray-100 truncate">
          {value || selectedEcole?.label || "Sélectionner"}
        </span>
        {(value || selectedEcole?.label) && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="size-3 text-gray-400" />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          className={`absolute z-50 w-full bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-xl overflow-hidden ${
            openUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
          style={{ maxHeight: dropdownMaxHeight }}
        >
          <div className="p-1.5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1.5 w-full bg-white dark:bg-gray-800 border border-gray-100 rounded-lg px-2.5 py-1">
              <Search className="size-3.5 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Chercher école..."
                className="flex-1 text-[11px] bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm("");
                    clearSuggestions();
                  }}
                  className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="size-3 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          <div
            className="overflow-y-auto"
            style={{ maxHeight: `calc(${dropdownMaxHeight || 320}px - 104px)` }}
          >
            {loading ? (
              <div className="px-3 py-6 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Recherche...
              </div>
            ) : normalizedResults.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400 text-center">
                Aucune école trouvée
              </div>
            ) : (
              normalizedResults.map((ecole) => {
                const isSelected = selectedEcole?.id === ecole.id || value === ecole.id;
                return (
                  <button
                    key={ecole.id}
                    type="button"
                    onClick={() => handleSelect(ecole)}
                    className={`w-full text-left p-2 text-[12px] flex items-center gap-2 cursor-pointer transition-all duration-150 rounded-lg ${
                      isSelected
                        ? "bg-gray-50/80 dark:bg-gray-950/40 ring-1 ring-inset ring-gray-200/50 dark:ring-gray-700/40"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    }`}
                  >
                    {ecole.logo_url ? (
                      <img
                        src={ecole.logo_url}
                        alt=""
                        className="w-7 h-7 rounded-sm object-cover shrink-0 border border-gray-200/80 dark:border-gray-700/60 bg-white"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-sm shrink-0 border border-gray-200/80 dark:border-gray-700/60 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Building2 className="size-3.5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
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
              })
            )}
          </div>

          {(value || selectedEcole) && (
            <div className="border-t border-gray-100 dark:border-gray-800 p-1.5">
              <button
                type="button"
                onClick={(e) => {
                  handleClear(e);
                  setIsOpen(false);
                }}
                className="inline-flex w-full items-center justify-center gap-1.5 cursor-pointer rounded-sm border border-input hover:bg-muted bg-gray-100/70 px-2 py-1.5 text-[11px] font-medium hover:text-gray-600 dark:text-gray-400 shadow-xs transition-colors text-gray-500 dark:hover:text-gray-300"
              >
                <Trash className="size-3 mb-0.5" />
                Retirer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const EntrepriseSelectInput = ({
  value,
  onSelect,
}: {
  value: string;
  onSelect?: (id: string, label: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntreprise, setSelectedEntreprise] = useState<{
    id: string;
    label: string;
    logo_url?: string;
  } | null>(null);
  const [defaultOptions, setDefaultOptions] = useState<
    Array<{ id: string; label: string; logo_url?: string }>
  >([]);
  const [defaultLoading, setDefaultLoading] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState(320);
  const containerRef = useRef<HTMLDivElement>(null);

  const entrepriseAutocomplete = useEntreprisesAutocomplete("", {
    limit: 20,
    debounceMs: 250,
  });

  useEffect(() => {
    if (!isOpen) return;

    if (searchTerm.trim().length > 0) {
      entrepriseAutocomplete.setQuery(searchTerm.trim());
    } else {
      entrepriseAutocomplete.setQuery("");
    }
  }, [isOpen, searchTerm, entrepriseAutocomplete]);

  useEffect(() => {
    if (!isOpen || searchTerm.trim().length > 0 || defaultOptions.length > 0) {
      return;
    }

    let isCancelled = false;

    (async () => {
      setDefaultLoading(true);
      try {
        if (!isCancelled) setDefaultOptions([]);
      } catch {
        if (!isCancelled) {
          setDefaultOptions([]);
        }
      } finally {
        if (!isCancelled) {
          setDefaultLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, searchTerm, defaultOptions.length]);

  const normalizedSearchResults = useMemo(
    () =>
      (entrepriseAutocomplete.results || [])
        .map((result: any) => ({
          id: String(result.id || result.value || ""),
          label: String(result.nom || result.label || result.name || ""),
          logo_url: String(result.logo_url || result.logoMedia?.url || ""),
        }))
        .filter((item) => item.id && item.label),
    [entrepriseAutocomplete.results],
  );

  const displayedOptions =
    searchTerm.trim().length > 0 ? normalizedSearchResults : defaultOptions;
  const isLoading =
    searchTerm.trim().length > 0
      ? entrepriseAutocomplete.loading
      : defaultLoading;

  useEffect(() => {
    if (value) {
      const allOptions = [...defaultOptions, ...normalizedSearchResults];
      const found = allOptions.find((entreprise) => entreprise.id === value);
      if (found) {
        setSelectedEntreprise(found);
      }
    }
  }, [value, defaultOptions, normalizedSearchResults]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const updatePosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenUp = spaceBelow < 320 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        180,
        Math.min(320, shouldOpenUp ? spaceAbove - 16 : spaceBelow - 16),
      );

      setOpenUp(shouldOpenUp);
      setDropdownMaxHeight(maxHeight);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedEntreprise(null);
      setSearchTerm("");
      setIsOpen(false);
      entrepriseAutocomplete.clear();
      onSelect?.("", "");
    },
    [entrepriseAutocomplete, onSelect],
  );

  const handleSelect = useCallback(
    (entreprise: { id: string; label: string; logo_url?: string }) => {
      if (!entreprise.id) return;
      setSelectedEntreprise(entreprise);
      setSearchTerm("");
      setIsOpen(false);
      onSelect?.(entreprise.id, entreprise.label);
    },
    [onSelect],
  );

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center gap-1.5 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 cursor-pointer"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Search className="size-3.5 text-gray-400 shrink-0" />
        <span className="flex-1 text-[11.5px] text-gray-900 dark:text-gray-100 truncate">
          {value || selectedEntreprise?.label || "Sélectionner"}
        </span>
        {(value || selectedEntreprise?.label) && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="size-3 text-gray-400" />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          className={`absolute z-50 w-full bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-xl overflow-hidden ${
            openUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
          style={{ maxHeight: dropdownMaxHeight }}
        >
          <div className="p-1.5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1.5 w-full bg-white dark:bg-gray-800 border border-gray-100 rounded-lg px-2.5 py-1">
              <Search className="size-3.5 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Chercher entreprise..."
                className="flex-1 text-[11px] bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm("");
                    entrepriseAutocomplete.clear();
                  }}
                  className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="size-3 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          <div
            className="overflow-y-auto"
            style={{ maxHeight: `calc(${dropdownMaxHeight || 320}px - 104px)` }}
          >
            {isLoading ? (
              <div className="px-3 py-6 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Recherche...
              </div>
            ) : displayedOptions.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400 text-center">
                Aucune entreprise trouvée
              </div>
            ) : (
              displayedOptions.map((entreprise) => {
                const isSelected =
                  selectedEntreprise?.id === entreprise.id || value === entreprise.id;
                return (
                  <button
                    key={entreprise.id}
                    type="button"
                    onClick={() => handleSelect(entreprise)}
                    className={`w-full text-left p-2 text-[12px] flex items-center gap-1.5 cursor-pointer transition-all duration-150 rounded-lg ${
                      isSelected
                        ? "bg-gray-50/80 dark:bg-gray-950/40 ring-1 ring-inset ring-gray-200/50 dark:ring-gray-700/40"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    }`}
                  >
                    {entreprise.logo_url ? (
                      <img
                        src={entreprise.logo_url}
                        alt=""
                        className="w-5 h-5 rounded-sm object-contain shrink-0 border border-gray-200/80 dark:border-gray-700/60 bg-white"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-sm shrink-0 border border-gray-200/80 dark:border-gray-700/60 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Building2 className="size-3 text-gray-400" />
                      </div>
                    )}
                    <span className="truncate text-gray-900 dark:text-gray-100 flex-1">
                      {entreprise.label}
                    </span>
                    {isSelected && (
                      <Check className="size-3.5 text-gray-900 dark:text-gray-100" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {(value || selectedEntreprise) && (
            <div className="border-t border-gray-100 dark:border-gray-800 p-1.5">
              <button
                type="button"
                onClick={(e) => {
                  handleClear(e);
                  setIsOpen(false);
                }}
                className="inline-flex w-full items-center justify-center gap-1.5 cursor-pointer rounded-sm border border-input hover:bg-muted bg-gray-100/70 px-2 py-1.5 text-[11px] font-medium hover:text-gray-600 dark:text-gray-400 shadow-xs transition-colors text-gray-500 dark:hover:text-gray-300"
              >
                <Trash className="size-3 mb-0.5" />
                Retirer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MetiersSelectInput = ({
  value,
  onChange,
}: {
  value: Array<string | number>;
  onChange: (value: unknown) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [options, setOptions] = useState<Array<{ id: string; label: string }>>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState(320);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedMap, setSelectedMap] = useState<Map<string, string>>(
    () => new Map(),
  );

  useEffect(() => {
    const next = new Map<string, string>();
    value.forEach((item) => {
      const id = String(item);
      const found = options.find((opt) => opt.id === id);
      if (id) next.set(id, found?.label ?? id);
    });
    setSelectedMap(next);
  }, [value, options]);

  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      try {
        const q = searchTerm.trim();
        const response = q
          ? await searchMetiersByTitre(q, { limit: 20, page: 1 })
          : await getAllMetiers({ limit: 20, page: 1 });

        const items = (response.data || [])
          .map((m: any) => ({
            id: String(m.id || ""),
            label: String(m.titre || ""),
          }))
          .filter((m: { id: string; label: string }) => m.id && m.label);

        setOptions(items);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, searchTerm]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const updatePosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenUp = spaceBelow < 320 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        180,
        Math.min(320, shouldOpenUp ? spaceAbove - 16 : spaceBelow - 16),
      );

      setOpenUp(shouldOpenUp);
      setDropdownMaxHeight(maxHeight);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  const displayOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    selectedMap.forEach((label, id) => map.set(id, { id, label }));
    options.forEach((opt) => map.set(opt.id, opt));
    return Array.from(map.values()).sort((a, b) => {
      const aSel = selectedMap.has(a.id) ? 0 : 1;
      const bSel = selectedMap.has(b.id) ? 0 : 1;
      if (aSel !== bSel) return aSel - bSel;
      return a.label.localeCompare(b.label);
    });
  }, [options, selectedMap]);

  const currentLabel = useMemo(() => {
    const labels = Array.from(selectedMap.values());
    if (labels.length === 0) return "";
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return labels.join(", ");
    return `${labels.length} sélectionnés`;
  }, [selectedMap]);

  const handleToggle = useCallback(
    (id: string, label: string) => {
      setSelectedMap((prev) => {
        const next = new Map(prev);
        if (next.has(id)) next.delete(id);
        else next.set(id, label);
        onChange(Array.from(next.keys()));
        return next;
      });
    },
    [onChange],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedMap(new Map());
      setSearchTerm("");
      setIsOpen(false);
      onChange([]);
    },
    [onChange],
  );

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center gap-1.5 w-full min-h-[34px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 cursor-pointer"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Search className="size-3.5 text-gray-400 shrink-0" />
        <span className="flex-1 text-[11.5px] text-gray-900 dark:text-gray-100 truncate">
          {currentLabel || "Sélectionner"}
        </span>
        {currentLabel && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="size-3 text-gray-400" />
          </button>
        )}
      </div>

      {selectedMap.size > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {Array.from(selectedMap.entries()).map(([id, label]) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
            >
              <span className="max-w-[150px] truncate">{label}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle(id, label);
                }}
                className="hover:text-gray-900 dark:hover:text-white"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {isOpen && (
        <div
          className={`absolute z-50 w-full bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-xl overflow-hidden ${
            openUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
          style={{ maxHeight: dropdownMaxHeight }}
        >
          <div className="p-1.5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1.5 w-full bg-white dark:bg-gray-800 border border-gray-100 rounded-lg px-2.5 py-1">
              <Search className="size-3.5 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Chercher métier..."
                className="flex-1 text-[11px] bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

          <div
            className="overflow-y-auto p-1.5 space-y-0.5"
            style={{ maxHeight: `calc(${dropdownMaxHeight || 320}px - 104px)` }}
          >
            {loading ? (
              <div className="px-3 py-6 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Recherche...
              </div>
            ) : displayOptions.length > 0 ? (
              displayOptions.map((option) => {
                const isChecked = selectedMap.has(option.id);
                if (
                  searchTerm &&
                  !isChecked &&
                  !option.label.toLowerCase().includes(searchTerm.toLowerCase())
                ) {
                  return null;
                }

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleToggle(option.id, option.label)}
                    className={`w-full text-left px-3 py-2 text-[12px] rounded-md flex items-center gap-2.5 transition-all ${
                      isChecked
                        ? "bg-gray-50/80 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 font-medium"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div
                      className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        isChecked
                          ? "bg-gray-500 border-gray-500 shadow-sm"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {isChecked && (
                        <Check className="size-3 text-white" strokeWidth={3} />
                      )}
                    </div>
                    <span className="truncate flex-1">{option.label}</span>
                  </button>
                );
              })
            ) : searchTerm ? (
              <div className="px-3 py-8 text-center text-xs text-gray-400">
                Aucun résultat pour &quot;{searchTerm}&quot;
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
                  onClick={(e) => {
                    handleClear(e);
                    setIsOpen(false);
                  }}
                  className="inline-flex w-full items-center justify-center gap-1.5 cursor-pointer rounded-sm border border-input hover:bg-muted bg-gray-100/70 px-2 py-1.5 text-[11px] font-medium hover:text-gray-600 dark:text-gray-400 shadow-xs transition-colors text-gray-500 dark:hover:text-gray-300"
                >
                  <Trash className="size-3 mb-0.5" />
                  Retirer
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex w-full items-center justify-center gap-1.5 cursor-pointer rounded-sm border border-gray-500 bg-gray-500 px-2 py-1.5 text-[11px] font-medium text-white shadow-xs transition-colors hover:bg-gray-600 hover:border-gray-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Relation Input (with autocomplete)
const RelationInput = ({
  fieldName,
  value,
  onSelect,
}: {
  fieldName: string;
  value: string;
  onSelect?: (id: string, label: string) => void;
}) => {
  const [search, setSearch] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine field type and use appropriate hook
  const isEntreprise =
    fieldName.toLowerCase().includes("entreprise") ||
    fieldName.toLowerCase().includes("logo");
  const isTypeContrat =
    fieldName.toLowerCase().includes("contrat") &&
    !fieldName.toLowerCase().includes("stage");
  const isTypeStage = fieldName.toLowerCase().includes("stage");
  const isEcole =
    fieldName.toLowerCase() === "ecole" ||
    fieldName.toLowerCase() === "nomecole" ||
    fieldName.toLowerCase().includes("nomecole");
  const isVille = !isEntreprise && !isTypeContrat && !isTypeStage && !isEcole;

  // Call all hooks unconditionally (React rules)
  const entrepriseHook = useEntreprisesAutocomplete();
  const citiesHook = useCitiesAutocomplete();
  const typeContratHook = useTypeContratAutocomplete();
  const typeStageHook = useTypeStageAutocomplete();
  const ecoleHook = useEcoleAutocomplete({ limit: 20, minLength: 1, defaultOnEmpty: true, defaultLimit: 20 });

  // Select the appropriate hook based on field
  const { loading, setQuery, results } = useMemo(() => {
    if (isEntreprise) {
      return {
        loading: entrepriseHook.loading,
        setQuery: entrepriseHook.setQuery,
        results: entrepriseHook.results || [],
      };
    } else if (isTypeContrat) {
      return {
        loading: typeContratHook.loading,
        setQuery: typeContratHook.setQuery,
        results: typeContratHook.suggestions || [],
      };
    } else if (isTypeStage) {
      return {
        loading: typeStageHook.loading,
        setQuery: typeStageHook.setQuery,
        results: typeStageHook.suggestions || [],
      };
    } else if (isEcole) {
      return {
        loading: ecoleHook.loading,
        setQuery: (q: string) => ecoleHook.searchEcoles(q),
        results: (ecoleHook.suggestions || []).map((s: any) => ({
          id: String(s.id || ""),
          label: String(s.titre || s.abreviation || s.nom || ""),
          logo_url: s.logo_url || "",
        })),
      };
    } else {
      return {
        loading: citiesHook.loading,
        setQuery: citiesHook.setQuery,
        results: citiesHook.suggestions || [],
      };
    }
  }, [
    isEntreprise,
    isTypeContrat,
    isTypeStage,
    isEcole,
    entrepriseHook,
    typeContratHook,
    typeStageHook,
    ecoleHook,
    citiesHook,
  ]);

  // Normalize results wrapped in useMemo
  const normalizedResults = useMemo(() => {
    return results.map(
      (r: {
        id?: unknown;
        value?: unknown;
        label?: unknown;
        nom?: unknown;
        name?: unknown;
        logo_url?: string | null;
        name_fr?: string | null;
        name_en?: string | null;
        country?: { flag_url?: string } | null;
      }) => ({
        id: String(r.id || r.value || ""),
        label: String(
          r.name_fr || r.name_en || r.label || r.nom || r.name || "",
        ),
        logo_url: isEntreprise ? String(r.logo_url || "") : undefined,
        flag_url: isVille ? (r as any).country?.flag_url : undefined,
      }),
    );
  }, [results, isEntreprise, isVille]);

  // Update search query when input changes
  useEffect(() => {
    if (search.length >= 1) {
      setQuery(search);
    }
  }, [search, setQuery]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (id: string, label: string) => {
    setSearch(label);
    setIsOpen(false);
    onSelect?.(id, label);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Rechercher..."
        className={inputBaseClasses}
      />

      {isOpen && (search.length >= 1 || normalizedResults.length > 0) && (
        <div
          className="absolute z-50 w-full mt-1.5 bg-white dark:bg-gray-800 
                        border border-gray-300 dark:border-gray-600 rounded-md shadow-md
                        max-h-56 overflow-y-auto"
        >
          {loading ? (
            <div className="px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400 text-center">
              Chargement...
            </div>
          ) : normalizedResults.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400 text-center">
              Aucun résultat
            </div>
          ) : (
            normalizedResults.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id, item.label)}
                className="w-full px-3 py-1.5 text-left text-[11px] flex items-center gap-2
                           hover:bg-gray-50 dark:hover:bg-gray-700
                           text-gray-900 dark:text-gray-100
                           border-b border-gray-100 dark:border-gray-700/50 last:border-b-0
                           transition-colors"
              >
                {item.logo_url && (
                  <img
                    src={item.logo_url}
                    alt=""
                    className="w-7 h-7 bg-muted/40 border border-gray-100 rounded-sm object-cover shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                {item.flag_url && (
                  <img
                    src={item.flag_url}
                    alt=""
                    className="w-4 h-3 rounded-sm object-cover shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                {item.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
