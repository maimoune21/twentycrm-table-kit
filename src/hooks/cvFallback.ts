type CvRecord = {
  id?: number;
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

type CvUpdatePayload = {
  cvId: number;
  data?: CvRecord | null;
  source?: "sheet" | "popup";
  updatedAt?: string;
};

type CvSubscriber = (payload: {
  cvId: number;
  data?: CvRecord | null;
  source: "sheet" | "popup";
  updatedAt: string;
}) => void | Promise<void>;

const LOCAL_STORAGE_KEY = "cv-processing-start";
const cvSubscribers = new Map<number, Set<CvSubscriber>>();

function readStore(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(data: Record<string, string>) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // noop
  }
}

export function setCvLocalProcessingStartAt(cvId: number, isoDate: string) {
  const store = readStore();
  store[String(cvId)] = isoDate;
  writeStore(store);
}

export function getCvLocalProcessingStartAt(cvId: number): string | null {
  const store = readStore();
  return store[String(cvId)] ?? null;
}

export function clearCvLocalProcessingStartAt(cvId: number) {
  const store = readStore();
  delete store[String(cvId)];
  writeStore(store);
}

export async function fetchCvById(_cvId: number): Promise<CvRecord | null> {
  return null;
}

export async function regenerateCvScore(_payload: {
  cv_id: number;
}): Promise<void> {}

export function invalidateCvCache(_cvId: number): void {}

export function subscribeCvUpdates(cvId: number, cb: CvSubscriber): () => void {
  if (!cvSubscribers.has(cvId)) cvSubscribers.set(cvId, new Set());
  cvSubscribers.get(cvId)?.add(cb);
  return () => {
    const set = cvSubscribers.get(cvId);
    set?.delete(cb);
    if (set && set.size === 0) cvSubscribers.delete(cvId);
  };
}

export function notifyCvUpdated(payload: CvUpdatePayload): void {
  const set = cvSubscribers.get(payload.cvId);
  if (!set) return;
  const event = {
    cvId: payload.cvId,
    data: payload.data ?? null,
    source: payload.source ?? "popup",
    updatedAt: payload.updatedAt ?? new Date().toISOString(),
  } as const;
  set.forEach((cb) => {
    void cb(event);
  });
}

export async function getViewCvUrl(_viewToken: string): Promise<string> {
  return "";
}

export async function getViewPhotoUrl(_viewToken: string): Promise<string> {
  return "";
}

export async function createCv(payload: {
  pdf_id: number;
  user_id: number;
  statut?: string;
}): Promise<{ id: number } & typeof payload> {
  return { id: Date.now(), ...payload };
}
