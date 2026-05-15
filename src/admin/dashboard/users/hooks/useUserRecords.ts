import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAtomValue } from "jotai";
import { useApplySorts } from "../../hooks/useApplyFiltersAndSorts";
import {
  activeFiltersAtom,
  activeSortsAtom,
  type ActiveFilter,
} from "@/components/twenty-table/toolbar/states/toolbarState";
import type { RecordData } from "@/components/twenty-table";
import { DUMMY_USERS_RAW, STATIC_NIVEAUX_ETUDES } from "../../../../data/users";

function convertToolbarFiltersToApiParams(
  filters: ActiveFilter[],
  niveauxEtudes: Array<{ id: number; code: string; label: string }> = [],
) {
  let searchQuery = "";
  let idFilter = "";
  const apiFilters: Record<string, any> = {};

  for (const filter of filters) {
    const value = String(filter.value || "").trim();

    switch (filter.fieldName) {
      // ─── TEXT: nomComplet ─────────────────────────────────
      case "nomComplet":
        if (filter.operator === "contains" && value) {
          searchQuery = value;
        } else if (filter.operator === "doesNotContain" && value) {
          apiFilters.name_not_contains = value;
        } else if (filter.operator === "isEmpty") {
          apiFilters.name_is_empty = true;
        } else if (filter.operator === "isNotEmpty") {
          apiFilters.name_is_not_empty = true;
        }
        break;

      // ─── EMAIL: email ─────────────────────────────────────
      case "email":
        if (filter.operator === "contains" && value) {
          apiFilters.email_contains = value;
        } else if (filter.operator === "doesNotContain" && value) {
          apiFilters.email_not_contains = value;
        } else if (filter.operator === "isEmpty") {
          apiFilters.email_is_empty = true;
        } else if (filter.operator === "isNotEmpty") {
          apiFilters.email_is_not_empty = true;
        }
        break;

      // ─── CV_SCORE: cv ─────────────────────────────────────
      case "cv":
        if (value) {
          const normalizeEtatCv = (raw: string): string | null => {
            const v = raw.trim().toLowerCase();
            if (v === "nouveau") return "Nouveau";
            if (v === "valid" || v === "valide" || v === "validée" || v === "validee") {
              return "Valid";
            }
            if (
              v === "non valide" ||
              v === "non_valid" ||
              v === "non_valide" ||
              v === "non validée" ||
              v === "non validee"
            ) {
              return "Non_Valide";
            }
            if (v === "supprime" || v === "supprimée" || v === "supprimee") {
              return "Supprimée";
            }
            return null;
          };

          const normalizedEtat = normalizeEtatCv(value);
          if (normalizedEtat) {
            const current = apiFilters["etat-cv"];
            if (Array.isArray(current)) {
              if (!current.includes(normalizedEtat)) {
                apiFilters["etat-cv"] = [...current, normalizedEtat];
              }
            } else if (typeof current === "string" && current.length > 0) {
              if (current !== normalizedEtat) {
                apiFilters["etat-cv"] = [current, normalizedEtat];
              }
            } else {
              apiFilters["etat-cv"] = normalizedEtat;
            }
            break;
          }
        }

        if (
          filter.operator === "isEmpty" ||
          value === "sans_cv" ||
          value === "false" ||
          value === "0"
        ) {
          apiFilters.cv = false;
        } else if (
          filter.operator === "isNotEmpty" ||
          value === "avec_cv" ||
          value === "true" ||
          value === "1"
        ) {
          apiFilters.cv = true;
        }
        break;

      // ─── RELATION: ville ──────────────────────────────────
      case "ville":
        if (filter.operator === "equals" && value) {
          apiFilters.city_id = value;
        } else if (filter.operator === "contains" && value) {
          apiFilters.city_contains = value;
        } else if (filter.operator === "isEmpty") {
          apiFilters.city_is_empty = true;
        } else if (filter.operator === "isNotEmpty") {
          apiFilters.city_is_not_empty = true;
        }
        break;

      // ─── RELATION: école ──────────────────────────────────
      case "nomEcole":
        if (filter.operator === "equals" && value) {
          apiFilters.ecole_id = value;
        } else if (filter.operator === "contains" && value) {
          apiFilters.ecole_contains = value;
        } else if (filter.operator === "isEmpty") {
          apiFilters.ecole_is_empty = true;
        } else if (filter.operator === "isNotEmpty") {
          apiFilters.ecole_is_not_empty = true;
        }
        break;

      // ─── NUMBER: ID ───────────────────────────────────────
      case "id":
        if (value) idFilter = value;
        break;

      // ─── SELECT fields ────────────────────────────────────
      case "etat":
        if (value) apiFilters.etat = value;
        break;

      case "niveauEtudes":
        if (filter.operator === "isEmpty") {
          apiFilters.niveau_etudes_is_empty = true;
        } else if (filter.operator === "isNotEmpty") {
          apiFilters.niveau_etudes_is_not_empty = true;
        } else if (value) {
          const normalizedValue = value.toLowerCase();
          const matched = niveauxEtudes.find((n) => {
            const idMatch = String(n.id) === value;
            const codeMatch = String(n.code || "").toLowerCase() === normalizedValue;
            const labelMatch =
              String(n.label || "").toLowerCase() === normalizedValue;
            return idMatch || codeMatch || labelMatch;
          });
          const levelId = matched ? String(matched.id) : value;
          const current = apiFilters["niveaux-etudes"];
          if (typeof current === "string" && current.length > 0) {
            const values = current
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean);
            if (!values.includes(levelId)) {
              apiFilters["niveaux-etudes"] = [...values, levelId].join(",");
            }
          } else {
            apiFilters["niveaux-etudes"] = levelId;
          }
        }
        break;

      // ─── MULTI_SELECT fields ──────────────────────────────
      case "typeContrat":
        if (filter.operator === "isEmpty") {
          apiFilters.type_contrat_is_empty = true;
        } else if (filter.operator === "isNotEmpty") {
          apiFilters.type_contrat_is_not_empty = true;
        } else if (value) {
          const current = apiFilters.type_contrat;
          if (typeof current === "string" && current.length > 0) {
            const values = current
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean);
            if (!values.includes(value)) {
              apiFilters.type_contrat = [...values, value].join(",");
            }
          } else {
            apiFilters.type_contrat = value;
          }
        }
        break;

      case "typeStage":
        if (filter.operator === "isEmpty") {
          apiFilters.type_stage_is_empty = true;
        } else if (filter.operator === "isNotEmpty") {
          apiFilters.type_stage_is_not_empty = true;
        } else if (value) {
          apiFilters.type_stage = value;
        }
        break;

      case "metiers":
        if (filter.operator === "equals" && value) {
          apiFilters.metier_ids = value; // comma-separated IDs
        } else if (filter.operator === "contains" && value) {
          apiFilters.metier_contains = value; // comma-separated titles
        } else if (filter.operator === "isEmpty") {
          apiFilters.metier_is_empty = true;
        } else if (filter.operator === "isNotEmpty") {
          apiFilters.metier_is_not_empty = true;
        }
        break;

      // ─── PREMIUM_BADGE ────────────────────────────────────
      case "premium": {
        const norm = value.toLowerCase();
        if (norm === "true" || norm === "oui" || norm === "1")
          apiFilters.premium = "oui";
        else if (norm === "false" || norm === "non" || norm === "0")
          apiFilters.premium = "non";
        break;
      }

      // ─── EMAIL BOUNCE ─────────────────────────────────────
      case "emailBounce": {
        const norm = value.toLowerCase();
        if (norm === "true" || norm === "oui" || norm === "1")
          apiFilters.bounce = true;
        else if (norm === "false" || norm === "non" || norm === "0")
          apiFilters.bounce = false;
        break;
      }

      // ─── PHOTO_SCORE: photoScore ───────────────────────────
      case "photoScore": {
        if (!value) break;
        if (value === "sans_photo") {
          apiFilters.photo_profil_is_empty = true;
        } else if (value === "avec_photo") {
          apiFilters.photo_profil_is_not_empty = true;
        } else {
          // Map to etat-photo-profil param values
          const mapPhotoEtat: Record<string, string> = {
            Nouveau: "Nouveau",
            Valid: "Valid",
            Non_Valid: "Non_Valid",
            En_attente: "En_attente",
            En_attent: "En_attente",
          };
          const mapped = mapPhotoEtat[value];
          if (mapped) {
            apiFilters["etat-photo-profil"] = mapped;
            apiFilters.photo_profil_is_not_empty = true;
          }
        }
        break;
      }

      // ─── NUMBER: Score Photo equals ───────────────────────
      case "photoScoreEquals": {
        if (value.toLowerCase() === "null") {
          apiFilters.photo_profil_score = "null";
          break;
        }
        const score = Number(value);
        if (value && !isNaN(score) && score >= 0 && score <= 100) {
          apiFilters.photo_profil_score = String(score);
        }
        break;
      }

      // ─── NUMBER: Score Photo min ──────────────────────────
      case "photoScoreMin": {
        const score = Number(value);
        if (value && !isNaN(score) && score >= 0 && score <= 100) {
          apiFilters.photo_profil_score_min = String(score);
        }
        break;
      }

      // ─── NUMBER: Score Photo max ──────────────────────────
      case "photoScoreMax": {
        const score = Number(value);
        if (value && !isNaN(score) && score >= 0 && score <= 100) {
          apiFilters.photo_profil_score_max = String(score);
        }
        break;
      }

      // ─── SELECT: etatPhoto (legacy) ───────────────────────
      case "etatPhoto": {
        if (!value) break;
        const mapPhotoEtat: Record<string, string> = {
          nouveau: "Nouveau",
          validee: "Valid",
          "non-validee": "Non_Valid",
          supprimee: "Supprimée",
          en_attente: "En_attente",
        };
        const mapped = mapPhotoEtat[value];
        if (mapped) {
          apiFilters["etat-photo-profil"] = mapped;
          apiFilters.photo_profil_is_not_empty = true;
        }
        break;
      }

      // ─── SELECT: etatCV ───────────────────────────────────
      case "etatCV":
        if (value && value !== "tous") {
          const normalizeEtatCv = (raw: string): string => {
            const v = raw.trim().toLowerCase();
            if (v === "nouveau") return "Nouveau";
            if (
              v === "valid" ||
              v === "valide" ||
              v === "validée" ||
              v === "validee"
            ) {
              return "Valid";
            }
            if (
              v === "non valide" ||
              v === "non_valid" ||
              v === "non_valide" ||
              v === "non validée" ||
              v === "non validee"
            ) {
              return "Non_Valide";
            }
            if (v === "supprime" || v === "supprimée" || v === "supprimee") {
              return "Supprimée";
            }
            return raw;
          };

          const normalized = normalizeEtatCv(value);
          const current = apiFilters["etat-cv"];
          if (Array.isArray(current)) {
            if (!current.includes(normalized)) {
              apiFilters["etat-cv"] = [...current, normalized];
            }
          } else if (typeof current === "string" && current.length > 0) {
            if (current !== normalized) {
              apiFilters["etat-cv"] = [current, normalized];
            }
          } else {
            apiFilters["etat-cv"] = normalized;
          }
        }
        break;

      // ─── NUMBER: Score CV equals ──────────────────────────
      case "cvScore":
      case "cvScoreEquals": {
        if (value.toLowerCase() === "null") {
          apiFilters["cv-score"] = "null";
          break;
        }
        const score = Number(value);
        if (value && !isNaN(score) && score >= 0 && score <= 100) {
          apiFilters["cv-score"] = String(score);
        }
        break;
      }

      // ─── NUMBER: Score CV minimum ───────────────────────
      case "cvScoreMin": {
        const score = Number(value);
        if (value && !isNaN(score) && score >= 0 && score <= 100) {
          apiFilters["cv-score-min"] = String(score);
        }
        break;
      }

      // ─── NUMBER: Score CV maximum ───────────────────────
      case "cvScoreMax": {
        if (value.toLowerCase() === "null") {
          apiFilters["cv-score-max"] = "null";
          break;
        }
        const score = Number(value);
        if (value && !isNaN(score) && score >= 0 && score <= 100) {
          apiFilters["cv-score-max"] = String(score);
        }
        break;
      }

      default:
        break;
    }
  }

  return { searchQuery, idFilter, apiFilters };
}

type UseCandidatsRecordsParams = {
  searchQuery?: string;
  idFilter?: string;
  filters?: Record<string, unknown>;
  initialPageSize?: number;
};

export function useCandidatsRecords(params: UseCandidatsRecordsParams = {}) {
  const {
    searchQuery: externalSearchQuery = "",
    idFilter: externalIdFilter = "",
    filters: externalFilters = {},
    initialPageSize = 50,
  } = params;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const toolbarFilters = useAtomValue(activeFiltersAtom);
  const toolbarSorts = useAtomValue(activeSortsAtom);
  const niveauxEtudes = STATIC_NIVEAUX_ETUDES;

  const {
    searchQuery: toolbarSearchQuery,
    idFilter: toolbarIdFilter,
    apiFilters: toolbarApiFilters,
  } = useMemo(
    () => convertToolbarFiltersToApiParams(toolbarFilters, niveauxEtudes),
    [toolbarFilters, niveauxEtudes],
  );

  const finalSearchQuery = toolbarSearchQuery || externalSearchQuery;
  const finalIdFilter = toolbarIdFilter || externalIdFilter;
  const finalFilters = useMemo(
    () => ({ ...externalFilters, ...toolbarApiFilters }),
    [externalFilters, toolbarApiFilters],
  );

  const [pageIndex, setPageIndex] = useState(() => {
    const p = new URLSearchParams(window.location.search).get("page");
    if (p) {
      const n = parseInt(p, 10);
      if (Number.isFinite(n) && n >= 1) return n - 1;
    }
    return 0;
  });
  const [pageSize, setPageSize] = useState(initialPageSize);
  const prevFiltersKeyRef = useRef<string>("");

  useEffect(() => {
    const filtersKey = JSON.stringify({
      finalSearchQuery,
      finalIdFilter,
      finalFilters,
    });
    if (prevFiltersKeyRef.current && prevFiltersKeyRef.current !== filtersKey) {
      setPageIndex(0);
      // Read real browser URL (reflects replaceState from toolbar sync)
      const real = new URLSearchParams(window.location.search);
      const params = new URLSearchParams();
      params.set("page", "1");
      real.forEach((v, k) => {
        if (k !== "page") params.set(k, v);
      });
      navigate(`?${params.toString()}`, { replace: true });
    }
    prevFiltersKeyRef.current = filtersKey;
  }, [finalSearchQuery, finalIdFilter, finalFilters, navigate]);

  useEffect(() => {
    const currentPage = pageIndex + 1;
    if (searchParams.get("page") !== String(currentPage)) {
      // Read real browser URL (reflects replaceState from toolbar sync)
      const real = new URLSearchParams(window.location.search);
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      real.forEach((v, k) => {
        if (k !== "page") params.set(k, v);
      });
      navigate(`?${params.toString()}`, { replace: true });
    }
  }, [pageIndex, navigate, searchParams]);

  const allRecords: RecordData[] = useMemo(() => {
    return DUMMY_USERS_RAW.map((c: any) => {
      const user = c.user || {};
      const nomComplet = `${user.prenom || ""} ${user.nom || ""}`.trim() || `#${c.id}`;
      // Support both string ("Tanger") and object ({ nom: "Tanger" }) shapes.
      const pickName = (v: any): string =>
        typeof v === "string" ? v : v?.nom || v?.name_fr || v?.name || "";
      const villeName =
        pickName(c.ville) ||
        pickName(c.city) ||
        pickName(user.ville) ||
        pickName(user.city) ||
        "";
      const ecoleName = c.ecole?.abreviation || c.ecole_name || c.ecole?.titre || "";

      return {
        id: String(c.id),
        nomComplet,
        email: user.email || "",
        gsm: user.num_tel || "",
        cv: c.cv ? String(c.cv?.score ?? "Nouveau") : "",
        cvId: c.cv_id || null,
        cvScore: c.cv?.score ?? null,
        ville: villeName,
        nomEcole: ecoleName,
        niveauEtudes: c.niveau_formation || "",
        // Support array-of-strings (["CDD", "Alternance"]) and array-of-objects ([{ name }, { titre }]).
        typeContrat: (c.typeContrats || [])
          .map((t: any) => (typeof t === "string" ? t : t?.name || t?.titre))
          .filter(Boolean),
        typeStage: (c.typeStages || [])
          .map((t: any) => (typeof t === "string" ? t : t?.name || t?.titre))
          .filter(Boolean),
        metiers: (c.metiers || [])
          .map((m: any) => (typeof m === "string" ? m : m?.titre || m?.nom))
          .filter(Boolean),
        etat: c.etat || "",
        premium: Boolean(c.premium),
        premium_affected_at: c.premium_affected_at || null,
        premiumUpgradeCount: Number(c.nb_premium_affected || 0),
        dateConnexion: user.last_login || null,
        inscritLe: user.registered_at || c.created_at || null,
        photo: c.photo_profil_url || null,
        photoScore: c.photo_profil?.score ?? null,
        photoEtat: c.photo_profil?.etat ?? null,
        photoViewToken: c.photo_profil?.view_token ?? null,
        hasPhoto: Boolean(c.photo_profil_url || c.photo_profil),
        _raw: c,
        _userId: c.user_id ? Number(c.user_id) : undefined,
        _entityId: Number(c.id) || undefined,
        _ecoleId: Number(c.ecole?.id ?? 0) || undefined,
        loginSource: c.login_source || user.login_source || "",
        authMethod: c.auth_method || user.auth_method || "",
      } as RecordData;
    });
  }, []);

  const filteredRecords = useMemo(() => {
    const q = String(finalSearchQuery || "").trim().toLowerCase();
    const idQuery = String(finalIdFilter || "").trim();
    return allRecords.filter((r: any) => {
      if (idQuery && String(r.id) !== idQuery) return false;
      if (q) {
        const hay = `${r.nomComplet || ""} ${r.email || ""} ${r.nomEcole || ""}`.toLowerCase();
        if (!hay.includes(q) && !String(r.id).includes(q)) return false;
      }

      if (finalFilters?.etat && String(r.etat || "") !== String(finalFilters.etat)) {
        return false;
      }
      if (finalFilters?.premium) {
        const expected = String(finalFilters.premium).toLowerCase() === "oui";
        if (Boolean(r.premium) !== expected) return false;
      }
      if (typeof finalFilters?.bounce === "boolean") {
        if (Boolean(r._raw?.email_bounce || r._raw?.user?.bounce) !== Boolean(finalFilters.bounce)) {
          return false;
        }
      }
      return true;
    });
  }, [allRecords, finalSearchQuery, finalIdFilter, finalFilters]);

  const sortedAll = useApplySorts(filteredRecords);
  const total = sortedAll.length;
  const records: RecordData[] = useMemo(() => {
    const start = pageIndex * pageSize;
    return sortedAll.slice(start, start + pageSize);
  }, [sortedAll, pageIndex, pageSize]);

  const loading = false;
  const refetch = useCallback(() => {}, []);

  const mutations = useMemo(
    () => ({
      createCandidatByAdmin: {
        mutateAsync: async (payload: Record<string, unknown>) => ({
          id: Date.now(),
          ...payload,
        }),
      },
      updateCandidatUser: {
        mutateAsync: async (_payload: Record<string, unknown>) => ({ success: true }),
      },
    }),
    [],
  );

  return {
    records,
    total,
    loading,
    refetch,
    pageIndex,
    setPageIndex,
    pageSize,
    setPageSize: (newSize: number) => {
      setPageSize(newSize);
      setPageIndex(0);
      const real = new URLSearchParams(window.location.search);
      const params = new URLSearchParams();
      params.set("page", "1");
      real.forEach((v, k) => {
        if (k !== "page") params.set(k, v);
      });
      navigate(`?${params.toString()}`, { replace: true });
    },
    mutations,
    getRawCandidat: useCallback(
      (id: string) => DUMMY_USERS_RAW.find((c: any) => String(c.id) === id),
      [],
    ),
  };
}
