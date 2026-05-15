import { atom } from "jotai";

// ── Side Panel Pages ──
export enum SidePanelPage {
  Root = "root",
  ViewRecord = "record",
  CreateRecord = "create",
  CvScore = "cv-score",
  PhotoScore = "photo-score",
  PremiumPacks = "premium-packs",
}

// ── Navigation Stack Item ──
export type SidePanelNavigationStackItem = {
  page: SidePanelPage;
  pageTitle: string;
  pageIcon?: string; // lucide icon name
  pageId: string;
  recordId?: string;
  objectNameSingular?: string;
};

// ── Page Info ──
export type SidePanelPageInfo = {
  title?: string;
  iconName?: string;
  instanceId: string;
};

export type SidePanelCreateAction = {
  onSave: () => void | Promise<void>;
  isSaving: boolean;
};

// ── Core atoms ──
export const isSidePanelOpenedAtom = atom<boolean>(false);
export const isSidePanelClosingAtom = atom<boolean>(false);
export const sidePanelPageAtom = atom<SidePanelPage>(SidePanelPage.Root);
export const sidePanelSearchAtom = atom<string>("");
export const sidePanelRecordIdAtom = atom<string | null>(null);

export const sidePanelWidthAtom = atom<number>(400);

export const sidePanelPageInfoAtom = atom<SidePanelPageInfo>({
  title: undefined,
  iconName: undefined,
  instanceId: "",
});

export const sidePanelCreateActionAtom = atom<SidePanelCreateAction | null>(
  null,
);

export const sidePanelNavigationStackAtom = atom<
  SidePanelNavigationStackItem[]
>([]);

// ── Selectable list state ──
export const sidePanelSelectedItemIdAtom = atom<string | null>(null);
export const hasUserSelectedSidePanelListItemAtom = atom<boolean>(false);
