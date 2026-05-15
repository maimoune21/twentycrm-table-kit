import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

// Normalize date for DATE cells to avoid DD/MM parsing ambiguity
const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";

  const raw = String(dateString).trim();
  if (!raw) return "—";

  // Already ISO-like (e.g. 2026-04-01T08:04:49.386Z) => keep as-is
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw;

  // French-style date (DD/MM/YYYY [HH:mm[:ss]])
  const frMatch = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (frMatch) {
    const [, dd, mm, yyyy, hh = "00", min = "00", ss = "00"] = frMatch;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T${hh.padStart(2, "0")}:${min}:${ss}`;
  }

  // Fallback: parse then normalize to local ISO-like string (no timezone suffix)
  try {
    const date = new Date(raw);
    if (isNaN(date.getTime())) return "—";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  } catch {
    return "—";
  }
};

export interface ICandidatDataAdmin {
  id: string;
  photo: string;
  nomComplet: string;
  email: string;
  cv: string;
  cvId?: number | null;
  ville: string;
  gsm: string;
  nomEcole: string;
  niveauEtudes: string;
  typeContrat: string;
  typeContrats?: string[];
  premium: boolean;
  premium_affected_at?: string | null;
  nb_premium_affected: number;
  etat: string;
  dateConnexion: string;
  inscritLe: string;
  raw?: any;
  metiers?: string[];
  typeStage?: string;
  typeStages?: string[];
  hasCv?: boolean;
  cvScore?: number | null;
  cvRaw?: any;
  hasPhoto?: boolean;
  photoRaw?: any;
  photoScore?: number | null;
  photoEtat?: string | null;
  photoViewToken?: string | null;
  loginSource?: string;
  authMethod?: string;
}

export type SortParam = {
  fieldName: string;
  direction: "asc" | "desc";
};

type Params = {
  page?: number;
  limit?: number;
  searchQuery?: string;
  idFilter?: string;
  filters?: Record<string, any>;
  sorts?: SortParam[];
};

export const useAdminCandidatsV2 = (params: Params = {}) => {
  const {
    page = 1,
    limit = 10,
    searchQuery = "",
    idFilter = "",
    filters = {},
    sorts = [],
  } = params;

  const queryClient = useQueryClient();

  const enrichCandidat = useCallback(
    (candidatData: any): ICandidatDataAdmin => {
      const userData = candidatData.user;
      const ecoleData = candidatData.ecole;

      const nomComplet = userData
        ? `${userData.prenom || ""} ${userData.nom || ""}`.trim()
        : `Candidat ${candidatData.id}`;

      const email = userData?.email || "";
      const cityData = candidatData.city || userData?.city;
      const ville =
        cityData?.name_fr ||
        cityData?.name_en ||
        userData?.ville?.ville_name ||
        userData?.ville?.nom ||
        "";
      const gsm = userData?.num_tel || userData?.telephone || "";
      const nomEcole = ecoleData?.abreviation || ecoleData?.titre || "";
      const photoUrl = candidatData.photo_profil_url || "";
      const hasPhoto = !!photoUrl || !!candidatData.photo_profil?.image_id;

      // Extract photo score data from photo_profil object
      const photoProfil = candidatData.photo_profil;
      let photoScore: number | null = null;
      let photoEtat: string | null = null;
      let photoViewToken: string | null = null;

      if (photoProfil) {
        if (photoProfil.score !== undefined && photoProfil.score !== null) {
          photoScore = Math.round(Number(photoProfil.score) || 0);
        }
        photoEtat = photoProfil.etat || null;
        photoViewToken = photoProfil.view_token || null;
      }

      let cvLabel = "No CV";
      let hasCv = false;
      let cvScore: number | null = null;
      let cvRaw: any = null;

      const cvData = candidatData.cv ?? null;
      if (cvData) {
        hasCv = true;
        cvRaw = cvData;
        const rawScore = cvData.score;
        const hasConcreteScore =
          rawScore !== undefined &&
          rawScore !== null &&
          String(rawScore).trim() !== "" &&
          String(rawScore).trim().toLowerCase() !== "null";

        if (hasConcreteScore) {
          const parsedScore = Number(rawScore);
          if (Number.isFinite(parsedScore)) {
            const scoreNum = Math.round(parsedScore);
            cvScore = scoreNum;
            cvLabel = `SCORE ${scoreNum}%`;
          } else {
            cvScore = null;
            cvLabel = "CV";
          }
        } else {
          cvScore = null;
          cvLabel = "CV";
        }
      } else if (candidatData.cv_id) {
        hasCv = true;
        cvLabel = "CV";
        cvScore = null;
      }

      const dateConnexion = formatDateTime(
        candidatData.derniere_vue_profil || userData?.last_login,
      );

      let inscritLe = "—";
      if (candidatData.created_at) {
        inscritLe = formatDateTime(candidatData.created_at);
      } else if (userData?.registered_at) {
        inscritLe = formatDateTime(userData.registered_at);
      } else if (userData?.last_login) {
        inscritLe = formatDateTime(userData.last_login);
      }

      const metiersList = (candidatData.metiers || [])
        .map((m: any) => ({
          id: m.id ?? m.metier_id ?? m.metier?.id,
          titre: m.titre || m.nom || m.metier?.titre || "",
        }))
        .filter((m: any) => m.titre);

      const typeContractsList = (candidatData.typeContrats || [])
        .map((t: any) => ({
          id: t.id,
          name: t.name || t.titre || "",
        }))
        .filter((t: any) => t.name);

      const typeContratLabel =
        typeContractsList.map((t: any) => t.name).join(", ") || "";

      const typeStagesList = (candidatData.typeStages || [])
        .map((t: any) => ({
          id: t.id,
          name: t.name || t.titre || "",
        }))
        .filter((t: any) => t.name);

      return {
        id: String(candidatData.id || candidatData.user_id || ""),
        photo: photoUrl,
        nomComplet,
        email,
        cv: cvLabel,
        cvId: candidatData.cv_id || null,
        hasCv,
        cvScore,
        cvRaw,
        hasPhoto,
        photoRaw: photoProfil || null,
        photoScore,
        photoEtat,
        photoViewToken,
        ville,
        gsm,
        nomEcole,
        niveauEtudes:
          candidatData.niveau_formation || candidatData.niveauEtudes || "",
        typeContrat: typeContratLabel,
        typeStage: typeStagesList[0]?.name || "",
        premium: !!candidatData.premium,
        premium_affected_at: candidatData.premium_affected_at || null,
        nb_premium_affected: Number(candidatData.nb_premium_affected || 0),
        etat: candidatData.etat || candidatData.status || "NOUVEAU",
        dateConnexion,
        inscritLe,
        raw: candidatData,
        metiers: metiersList,
        typeContrats: typeContractsList,
        typeStages: typeStagesList,
        loginSource: userData?.login_source || candidatData.login_source || "",
        authMethod: userData?.auth_method || candidatData.auth_method || "",
      };
    },
    [],
  );

  const queryKey = [
    "admin-candidats",
    { page, limit, searchQuery, idFilter, filters, sorts },
  ];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const toOptionalBoolean = (value: unknown): boolean | undefined => {
        if (value === undefined || value === null || value === "") {
          return undefined;
        }
        if (typeof value === "boolean") return value;
        if (typeof value === "number") return value === 1;

        const normalized = String(value).trim().toLowerCase();
        if (["true", "1", "oui", "yes"].includes(normalized)) return true;
        if (["false", "0", "non", "no"].includes(normalized)) return false;
        return undefined;
      };

      const q: any = {
        limit: Number(limit),
        offset: Math.max(0, (page - 1) * limit),
      };

      const normalizeFilterParams = (
        source: Record<string, any> | undefined,
      ): Record<string, any> | undefined => {
        if (!source) return source;

        const out: Record<string, any> = { ...source };

        // Keep endpoint parameter naming consistent
        if (out.bounce === undefined && out.emailBounce !== undefined) {
          out.bounce = toOptionalBoolean(out.emailBounce);
        }
        delete out.emailBounce;

        // Normalize comma-separated multi values into repeated query params
        const multiValueKeys = [
          "type_contrat",
          "type_stage",
          "metier_ids",
          "niveaux-etudes",
          "city_id",
          "ecole_id",
          "etat-cv",
          "etat-photo-profil",
        ];

        for (const key of multiValueKeys) {
          const raw = out[key];
          if (Array.isArray(raw)) continue;
          if (typeof raw === "string" && raw.includes(",")) {
            const list = raw
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean);
            if (list.length > 0) out[key] = list;
          }
        }

        return out;
      };

      const normalizedFilters = normalizeFilterParams(filters);

      const validateMutuallyExclusiveEmptyFilters = (
        source: Record<string, any> | undefined,
      ) => {
        if (!source) return;
        const pairs: Array<[string, string, string]> = [
          ["type_stage_is_empty", "type_stage_is_not_empty", "type_stage"],
          [
            "type_contrat_is_empty",
            "type_contrat_is_not_empty",
            "type_contrat",
          ],
          [
            "niveau_etudes_is_empty",
            "niveau_etudes_is_not_empty",
            "niveau_etudes",
          ],
        ];

        for (const [emptyKey, notEmptyKey, label] of pairs) {
          const emptyValue = toOptionalBoolean(source[emptyKey]);
          const notEmptyValue = toOptionalBoolean(source[notEmptyKey]);
          if (emptyValue === true && notEmptyValue === true) {
            const err: any = new Error(
              `400 Bad Request: '${emptyKey}' and '${notEmptyKey}' cannot both be true for ${label}.`,
            );
            err.status = 400;
            throw err;
          }
        }
      };

      if (idFilter) q.ID = idFilter;
      if (searchQuery) q.q = searchQuery;

      if (normalizedFilters) {
        validateMutuallyExclusiveEmptyFilters(normalizedFilters);
        if (normalizedFilters.etat && normalizedFilters.etat !== "tous") {
          q.photo_profil_etat = normalizedFilters.etat;
        }
        if (
          normalizedFilters.premium !== undefined &&
          normalizedFilters.premium !== "tous"
        ) {
          q.premium =
            normalizedFilters.premium === "oui" ||
            normalizedFilters.premium === "true" ||
            normalizedFilters.premium === true;
        }
        // Add other filters as needed
        Object.assign(q, normalizedFilters);
      }

      // Add sorts to query (if any)
      if (sorts && sorts.length > 0) {
        const primarySort = sorts[0];
        q.sortBy = primarySort.fieldName;
        q.sortOrder = primarySort.direction;
      }

      let items: any[] = [];
      let totalCount = 0;

      const enriched = items.map(enrichCandidat);
      return { data: enriched, total: totalCount };
    },
  });

  return {
    candidats: query.data?.data || [],
    total: query.data?.total || 0,
    loading: query.isLoading,
    error: query.error ? (query.error as any).message : null,
    refetch: query.refetch,
    ...query,
  };
};

export const useCandidatMutations = () => {
  const queryClient = useQueryClient();
};
