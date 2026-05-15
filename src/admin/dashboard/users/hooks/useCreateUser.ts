import { useCallback } from "react";
import { toast } from "sonner";
import axios from "axios";
import { apiLogin, apiSignUp } from "@/api/auth";
import { createCv } from "@/hooks/cvFallback";
import { apiUpdateCandidat } from "@/api/candidates";
import { uploadPdf } from "@/utils/upload";

type CreateCandidatDeps = {
  createMutation: {
    mutateAsync: (payload: Record<string, unknown>) => Promise<unknown>;
  };
  refetch: () => void;
};

function toIntArray(val: unknown): number[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(Number).filter((n) => n > 0);
  return String(val)
    .split(",")
    .map(Number)
    .filter((n) => n > 0);
}

function toFirstPositiveInt(...vals: unknown[]): number | undefined {
  for (const val of vals) {
    const arr = toIntArray(val);
    if (arr.length > 0) return arr[0];
  }
  return undefined;
}

function extractAccessToken(authResponse: unknown): string | null {
  const res = authResponse as any;
  return (
    res?.access_token ||
    res?.token ||
    res?.data?.access_token ||
    res?.data?.token ||
    null
  );
}

export function useCreateCandidat({
  createMutation,
  refetch,
}: CreateCandidatDeps) {
  return useCallback(
    async (data: Record<string, unknown>): Promise<boolean> => {
      try {
        const nom = String(data.nom || "").trim();
        const prenom = String(data.prenom || "").trim();
        const email = String(data.email || "").trim();

        if (!nom || !prenom) {
          toast.error("Le nom et le prénom sont requis");
          return false;
        }
        if (!email) {
          toast.error("L'email est requis");
          return false;
        }

        const cityId = toFirstPositiveInt(data.city_id, data.ville_id);
        const ecoleId = toFirstPositiveInt(
          data.ecole_id,
          data.nomEcole_id,
          data.ecole,
        );
        const gsm = String(
          data.num_tel ||
            data.gsm ||
            data.telephone ||
            data.phone ||
            data.numTel ||
            "",
        ).trim();
        const etat = String(data.etat || "").trim();
        const premium =
          typeof data.premium === "boolean"
            ? data.premium
            : String(data.premium || "").toLowerCase() === "true";

        const cvFile = data.cv instanceof File ? data.cv : null;
        const photoFileCandidates = [
          data.photoScore,
          data.photoscore,
          data.photo,
          data.photoFile,
          data.photo_profil,
        ];
        const photoFile =
          (photoFileCandidates.find((candidate) => candidate instanceof File) as
            | File
            | undefined) || null;

        const metierIds = toIntArray(data.metier_ids || data.metiers);
        const typeContratIds = toIntArray(
          data.type_contrat_ids || data.typeContrat || data.typeContrat_id,
        );
        const typeStageIds = toIntArray(
          data.type_stage_ids || data.typeStage || data.typeStage_id,
        );
        const niveauFormationId = toFirstPositiveInt(
          data.niveau_formation_id,
          data.niveauEtudes_id,
          data.niveauEtudes,
        );

        const tempPassword = `Stg_${Date.now().toString(36)}!`;
        const userPayload = {
          nom,
          prenom,
          email,
          username: String(data.username || email || "").trim(),
          password: tempPassword,
          role_id: 3,
          login_source: String(data.login_source || "admin"),
          auth_method: String(data.auth_method || "form"),
          ...(gsm ? { num_tel: gsm, telephone: gsm } : {}),
          ...(cityId ? { city_id: cityId } : {}),
        };

        const userRes = await apiSignUp(userPayload);
        const userId = Number(
          userRes?.data?.id ?? userRes?.id ?? userRes?.user?.id,
        );
        if (!userId || isNaN(userId)) {
          toast.error("Erreur: impossible de créer l'utilisateur");
          return false;
        }

        // Step 1: Create the candidat record (no photo/cv yet)
        const payload: Record<string, unknown> = {
          user_id: userId,
          ...(cityId ? { city_id: cityId } : {}),
          ...(ecoleId ? { ecole_id: ecoleId } : {}),
          ...(gsm ? { num_tel: gsm, telephone: gsm } : {}),
          ...(etat ? { etat } : {}),
          premium,
          ...(niveauFormationId ? { niveau_formation_id: niveauFormationId } : {}),
          ...(data.niveauEtudes
            ? { niveau_formation: String(data.niveauEtudes) }
            : {}),
        };

        if (metierIds.length > 0) payload.metier_ids = metierIds;
        if (typeContratIds.length > 0)
          payload.type_contrat_ids = typeContratIds;
        if (typeStageIds.length > 0) payload.type_stage_ids = typeStageIds;

        const createRes = (await createMutation.mutateAsync(payload)) as any;
        const candidatId = Number(createRes?.id ?? createRes?.data?.id);

        let createdUserToken: string | null = null;
        try {
          const loginRes = await apiLogin({
            email,
            password: tempPassword,
            login_source: String(data.login_source || "admin"),
            auth_method: String(data.auth_method || "form"),
          });
          createdUserToken = extractAccessToken(loginRes);
        } catch (loginErr) {
          console.warn(
            "Unable to authenticate newly created candidat for file uploads:",
            loginErr,
          );
        }

        // Step 2: Upload photo_profil (requires candidat to exist)
        if (
          photoFile &&
          createdUserToken &&
          Number.isFinite(candidatId) &&
          candidatId > 0
        ) {
          try {
            const formData = new FormData();
            formData.append("file", photoFile);

            const photoRes = await axios.post(
              "https://api.stagiaires.ma/api/v1/upload/photo_profil",
              formData,
              {
                withCredentials: true,
                headers: {
                  Authorization: `Bearer ${createdUserToken}`,
                },
              },
            );

            const photoProfilId = Number(
              photoRes?.data?.photo_profil_id ?? photoRes?.data?.data?.photo_profil_id,
            );
            if (Number.isFinite(photoProfilId) && photoProfilId > 0) {
              await apiUpdateCandidat(candidatId, { photo_profil_id: photoProfilId } as any);
            }
          } catch (uploadErr) {
            console.warn("Photo upload failed (non-blocking):", uploadErr);
          }
        }

        // Step 3: Upload CV (requires candidat to exist)
        if (
          cvFile &&
          createdUserToken &&
          Number.isFinite(candidatId) &&
          candidatId > 0
        ) {
          try {
            const uploadRes = await uploadPdf(cvFile, createdUserToken);

            let cvId = Number(uploadRes?.cvId || uploadRes?.data?.cvId);
            if ((!Number.isFinite(cvId) || cvId <= 0) && uploadRes?.mediaId) {
              const cv = await createCv({
                pdf_id: Number(uploadRes.mediaId),
                user_id: userId,
                statut: "valid",
              });
              cvId = Number(cv?.id);
            }

            if (Number.isFinite(cvId) && cvId > 0) {
              await apiUpdateCandidat(candidatId, { cv_id: cvId } as any);
            }
          } catch (uploadErr) {
            console.warn("CV upload failed (non-blocking):", uploadErr);
          }
        }
        toast.success("Candidat créé avec succès");
        refetch();
        return true;
      } catch (error: unknown) {
        console.error("Error creating candidat:", error);
        let message = "Erreur lors de la création du candidat";
        if (error && typeof error === "object") {
          const axiosError = error as {
            response?: { data?: { error?: string; message?: string } };
            message?: string;
          };
          message =
            axiosError.response?.data?.error ||
            axiosError.response?.data?.message ||
            axiosError.message ||
            message;
        }
        toast.error(message);
        return false;
      }
    },
    [createMutation, refetch],
  );
}
