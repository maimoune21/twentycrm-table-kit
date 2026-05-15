import { useCallback } from "react";
import { useStore } from "jotai";
import {
  isSidePanelOpenedAtom,
  isSidePanelClosingAtom,
  sidePanelPageAtom,
  sidePanelSearchAtom,
  sidePanelRecordIdAtom,
  sidePanelNavigationStackAtom,
  sidePanelPageInfoAtom,
  sidePanelCreateActionAtom,
  hasUserSelectedSidePanelListItemAtom,
  sidePanelSelectedItemIdAtom,
  SidePanelPage,
  type SidePanelNavigationStackItem,
} from "../states";
const generateId = () => crypto.randomUUID();

// ─────────────────────────────────────────────
// useSidePanelMenu — Open / Close / Toggle
// ─────────────────────────────────────────────

export const useSidePanelMenu = () => {
  const store = useStore();

  const closeSidePanelMenu = useCallback(() => {
    const isOpen = store.get(isSidePanelOpenedAtom);
    if (isOpen) {
      store.set(isSidePanelOpenedAtom, false);
      store.set(isSidePanelClosingAtom, true);
    }
  }, [store]);

  const openSidePanelMenu = useCallback(() => {
    const isClosing = store.get(isSidePanelClosingAtom);
    if (isClosing) {
      // Cleanup from previous close before opening
      store.set(isSidePanelClosingAtom, false);
    }

    store.set(isSidePanelOpenedAtom, true);
    store.set(hasUserSelectedSidePanelListItemAtom, false);

    // Navigate to root by default
    const pageId = generateId();
    store.set(sidePanelPageAtom, SidePanelPage.Root);
    store.set(sidePanelPageInfoAtom, {
      title: "Command Menu",
      iconName: undefined,
      instanceId: pageId,
    });
    store.set(sidePanelNavigationStackAtom, [
      {
        page: SidePanelPage.Root,
        pageTitle: "Command Menu",
        pageId,
      },
    ]);
  }, [store]);

  const toggleSidePanelMenu = useCallback(() => {
    const isOpen = store.get(isSidePanelOpenedAtom);
    store.set(sidePanelSearchAtom, "");

    if (isOpen) {
      closeSidePanelMenu();
    } else {
      openSidePanelMenu();
    }
  }, [closeSidePanelMenu, openSidePanelMenu, store]);

  return {
    openSidePanelMenu,
    closeSidePanelMenu,
    toggleSidePanelMenu,
  };
};

// ─────────────────────────────────────────────
// useNavigateSidePanel — Navigate to pages
// ─────────────────────────────────────────────

export const useNavigateSidePanel = () => {
  const store = useStore();

  const navigateSidePanel = useCallback(
    ({
      page,
      pageTitle,
      pageIcon,
      pageId,
      recordId,
      objectNameSingular,
      resetNavigationStack = false,
    }: Partial<SidePanelNavigationStackItem> & {
      page: SidePanelPage;
      pageTitle: string;
      resetNavigationStack?: boolean;
    }) => {
      const computedPageId = pageId || generateId();

      // Open if not already open
      const isOpen = store.get(isSidePanelOpenedAtom);
      const isClosing = store.get(isSidePanelClosingAtom);

      if (isClosing) {
        store.set(isSidePanelClosingAtom, false);
      }

      if (!isOpen) {
        store.set(isSidePanelOpenedAtom, true);
        store.set(hasUserSelectedSidePanelListItemAtom, false);
      }

      store.set(sidePanelPageAtom, page);
      store.set(sidePanelPageInfoAtom, {
        title: pageTitle,
        iconName: pageIcon,
        instanceId: computedPageId,
      });

      if (recordId) {
        store.set(sidePanelRecordIdAtom, recordId);
      }

      const newItem: SidePanelNavigationStackItem = {
        page,
        pageTitle,
        pageIcon,
        pageId: computedPageId,
        recordId,
        objectNameSingular,
      };

      if (resetNavigationStack) {
        store.set(sidePanelNavigationStackAtom, [newItem]);
      } else {
        const currentStack = isClosing
          ? []
          : store.get(sidePanelNavigationStackAtom);
        store.set(sidePanelNavigationStackAtom, [...currentStack, newItem]);
      }
    },
    [store],
  );

  return { navigateSidePanel };
};

// ─────────────────────────────────────────────
// useSidePanelHistory — Back navigation
// ─────────────────────────────────────────────

export const useSidePanelHistory = () => {
  const store = useStore();
  const { closeSidePanelMenu } = useSidePanelMenu();

  const goBackFromSidePanel = useCallback(() => {
    const currentStack = store.get(sidePanelNavigationStackAtom);
    const newStack = currentStack.slice(0, -1);
    const lastItem = newStack[newStack.length - 1];

    if (!lastItem) {
      closeSidePanelMenu();
      return;
    }

    store.set(sidePanelPageAtom, lastItem.page);
    store.set(sidePanelPageInfoAtom, {
      title: lastItem.pageTitle,
      iconName: lastItem.pageIcon,
      instanceId: lastItem.pageId,
    });
    store.set(sidePanelNavigationStackAtom, newStack);
    store.set(hasUserSelectedSidePanelListItemAtom, false);

    if (lastItem.recordId) {
      store.set(sidePanelRecordIdAtom, lastItem.recordId);
    } else {
      store.set(sidePanelRecordIdAtom, null);
    }
  }, [closeSidePanelMenu, store]);

  return { goBackFromSidePanel };
};

// ─────────────────────────────────────────────
// useSidePanelCloseCleanup — Cleanup on close
// ─────────────────────────────────────────────

export const useSidePanelCloseCleanup = () => {
  const store = useStore();

  const sidePanelCloseCleanup = useCallback(() => {
    store.set(sidePanelPageAtom, SidePanelPage.Root);
    store.set(sidePanelPageInfoAtom, {
      title: undefined,
      iconName: undefined,
      instanceId: "",
    });
    store.set(isSidePanelOpenedAtom, false);
    store.set(sidePanelSearchAtom, "");
    store.set(sidePanelNavigationStackAtom, []);
    store.set(sidePanelRecordIdAtom, null);
    store.set(sidePanelCreateActionAtom, null);
    store.set(hasUserSelectedSidePanelListItemAtom, false);
    store.set(sidePanelSelectedItemIdAtom, null);
    store.set(isSidePanelClosingAtom, false);
  }, [store]);

  return { sidePanelCloseCleanup };
};

// ─────────────────────────────────────────────
// useOpenRecordInSidePanel — Open record detail
// ─────────────────────────────────────────────

export const useOpenRecordInSidePanel = () => {
  const { navigateSidePanel } = useNavigateSidePanel();
  const store = useStore();

  const openRecordInSidePanel = useCallback(
    ({
      recordId,
      objectNameSingular = "Record",
      resetNavigationStack = false,
    }: {
      recordId: string;
      objectNameSingular?: string;
      resetNavigationStack?: boolean;
    }) => {
      // Don't re-open if same record is already shown
      const currentStack = store.get(sidePanelNavigationStackAtom);
      const currentItem = currentStack[currentStack.length - 1];
      if (currentItem?.recordId === recordId) {
        return;
      }

      store.set(sidePanelRecordIdAtom, recordId);

      navigateSidePanel({
        page: SidePanelPage.ViewRecord,
        pageTitle: objectNameSingular,
        recordId,
        objectNameSingular,
        resetNavigationStack,
      });
    },
    [navigateSidePanel, store],
  );

  return { openRecordInSidePanel };
};

// ─────────────────────────────────────────────
// useOpenCreateInSidePanel — Open create record form
// ─────────────────────────────────────────────

export const useOpenCreateInSidePanel = () => {
  const { navigateSidePanel } = useNavigateSidePanel();

  const openCreateInSidePanel = useCallback(
    ({ pageTitle }: { pageTitle?: string } = {}) => {
    navigateSidePanel({
      page: SidePanelPage.CreateRecord,
        pageTitle: pageTitle || "Nouvelle offre d'emploi",
      resetNavigationStack: false,
    });
    },
    [navigateSidePanel],
  );

  return { openCreateInSidePanel };
};
