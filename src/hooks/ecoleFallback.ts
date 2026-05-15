export type IEcole = {
  id: number | string;
  titre?: string;
  abreviation?: string;
  logo_url?: string;
  type_etablissement?: string;
  type_ecole?: string;
};

export async function fetchEcoles(_params?: {
  page?: number;
  limit?: number;
}): Promise<{ data: IEcole[] }> {
  return { data: [] };
}

export async function searchEcolesByName(
  _term: string,
  _params?: { limit?: number; page?: number },
): Promise<{ data: IEcole[] }> {
  return { data: [] };
}
